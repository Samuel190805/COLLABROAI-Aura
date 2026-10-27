import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import { validateAndNormalizeSourceUrl } from "@/domain/value-objects/SourceUrlValidator";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";
import { rateLimiter } from "@/infrastructure/ratelimit/rate-limiter";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const clientIp = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";

    // Rate limiting check
    const rateCheck = rateLimiter.check(userId || clientIp, "download");
    if (!rateCheck.allowed) {
      throw AppError.rateLimited("Download rate limit exceeded. Please wait before queuing more downloads.");
    }

    const body = await req.json().catch(() => ({}));
    const { url, targetFormat = "mp3", qualityOrResolution = "320k", mediaType = "audio" } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      throw AppError.invalidInput("A valid URL is required");
    }

    const validation = validateAndNormalizeSourceUrl(url.trim());
    if (validation.isDrmProtected) {
      throw AppError.unsupportedFormat("This source isn't supported — it may be DRM-protected.");
    }
    if (!validation.isValid) {
      throw AppError.invalidInput(validation.error || "Invalid URL");
    }

    const jobId = `job_dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const job = new Job({
      id: jobId,
      userId,
      type: "MEDIA_DOWNLOAD",
      status: "PENDING",
      stage: "RESOLVING",
      progress: 0,
      message: "Queued for media download & transcoding",
      inputParams: {
        url: validation.normalizedUrl,
        targetFormat,
        qualityOrResolution,
        mediaType,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    await container.queue.enqueue(jobId, async () => {
      await container.downloadMediaUseCase.execute({
        jobId,
        userId,
        url: validation.normalizedUrl,
        targetFormat: targetFormat as any,
        qualityOrResolution,
        mediaType: mediaType as any,
      });
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        status: "PENDING",
        stage: "RESOLVING",
        message: "Download job initialized",
      },
      { headers: rateLimiter.getRateLimitHeaders(rateCheck) }
    );
  });
}
