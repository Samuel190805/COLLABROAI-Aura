import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import { validateAndNormalizeSourceUrl } from "@/domain/value-objects/SourceUrlValidator";
import { rateLimiter } from "@/infrastructure/ratelimit/rate-limiter";
import { retentionManager } from "@/infrastructure/storage/retention-manager";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const clientIp = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";

    const rateCheck = rateLimiter.check(userId || clientIp, "stem_separation");
    if (!rateCheck.allowed) {
      throw AppError.rateLimited("Rate limit exceeded. Please wait before queuing more separation jobs.");
    }

    const contentType = req.headers.get("content-type") || "";
    const jobId = `job_stem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    let sourceType: "file" | "url" = "file";
    let inputFilePath: string | undefined = undefined;
    let sourceUrl: string | undefined = undefined;
    let outputFormat: "mp3" | "wav" | "flac" = "mp3";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("file") || formData.get("audio")) as File | null;
      const url = formData.get("url") as string | null;
      const fmt = (formData.get("outputFormat") as string) || "mp3";
      if (["mp3", "wav", "flac"].includes(fmt)) {
        outputFormat = fmt as "mp3" | "wav" | "flac";
      }

      if (file && file.size > 0) {
        sourceType = "file";
        const sanitized = (file.name || "input.wav").replace(/[^a-zA-Z0-9_.-]/g, "_");
        inputFilePath = path.join(workDir, sanitized);
        const nodeStream = Readable.fromWeb(file.stream() as any);
        await pipeline(nodeStream, createWriteStream(inputFilePath));
      } else if (url && url.trim()) {
        sourceType = "url";
        const validation = validateAndNormalizeSourceUrl(url.trim());
        if (validation.isDrmProtected) {
          throw AppError.unsupportedFormat("This source isn't supported — it may be DRM-protected.");
        }
        if (!validation.isValid) {
          throw AppError.invalidInput(validation.error || "Invalid URL");
        }
        sourceUrl = validation.normalizedUrl;
      } else {
        throw AppError.invalidInput("Please provide an audio file or media URL");
      }
    } else {
      const json = await req.json().catch(() => ({}));
      if (json.url) {
        sourceType = "url";
        const validation = validateAndNormalizeSourceUrl(json.url.trim());
        if (validation.isDrmProtected) {
          throw AppError.unsupportedFormat("This source isn't supported — it may be DRM-protected.");
        }
        if (!validation.isValid) {
          throw AppError.invalidInput(validation.error || "Invalid URL");
        }
        sourceUrl = validation.normalizedUrl;
      } else if (json.inputFilePath) {
        sourceType = "file";
        inputFilePath = json.inputFilePath;
      } else {
        throw AppError.invalidInput("Please provide either a media URL or input file");
      }

      if (json.outputFormat && ["mp3", "wav", "flac"].includes(json.outputFormat)) {
        outputFormat = json.outputFormat;
      }
    }

    const job = new Job({
      id: jobId,
      userId,
      type: "STEM_SEPARATION",
      status: "PENDING",
      stage: "ANALYSIS",
      progress: 0,
      message: "Queued for 2-stem separation (Vocals & Instrument)",
      inputParams: { sourceType, sourceUrl, inputFilePath, outputFormat },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    await container.queue.enqueue(jobId, async () => {
      await container.separateStemsUseCase.execute({
        jobId,
        userId,
        sourceType,
        inputFilePath,
        sourceUrl,
        outputFormat,
      });
    });

    return NextResponse.json(
      {
        jobId,
        status: "PENDING",
        stage: "ANALYSIS",
      },
      { headers: rateLimiter.getRateLimitHeaders(rateCheck) }
    );
  });
}
