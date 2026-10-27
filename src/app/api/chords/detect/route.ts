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

    const rateCheck = rateLimiter.check(userId || clientIp, "chord_detection");
    if (!rateCheck.allowed) {
      throw AppError.rateLimited("Chord detection rate limit exceeded. Please wait a moment.");
    }

    const contentType = req.headers.get("content-type") || "";
    const jobId = `job_ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    let inputType: "file" | "url" = "url";
    let inputAudioPath: string | undefined = undefined;
    let url: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        throw AppError.invalidInput("Audio file is required");
      }

      inputType = "file";
      const sanitized = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_") || "input.wav";
      inputAudioPath = path.join(workDir, sanitized);
      const nodeStream = Readable.fromWeb(file.stream() as any);
      await pipeline(nodeStream, createWriteStream(inputAudioPath));
    } else {
      const json = await req.json().catch(() => ({}));
      url = json.url;

      if (!url || typeof url !== "string" || !url.trim()) {
        throw AppError.invalidInput("Media URL is required");
      }

      const validation = validateAndNormalizeSourceUrl(url.trim());
      if (!validation.isValid) {
        throw AppError.invalidInput(validation.error || "Invalid URL");
      }
      url = validation.normalizedUrl;
    }

    const job = new Job({
      id: jobId,
      userId,
      type: "CHORD_DETECTION",
      status: "PENDING",
      stage: "ANALYSIS",
      progress: 0,
      message: "Queued for stem isolation & chord detection",
      inputParams: {
        inputType,
        url,
        inputAudioPath,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    await container.queue.enqueue(jobId, async () => {
      await container.detectChordsUseCase.execute({
        jobId,
        userId,
        inputType,
        inputAudioPath,
        url,
      });
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        status: "PENDING",
        stage: "ANALYSIS",
        message: "Chord detection initialized",
      },
      {
        headers: rateLimiter.getRateLimitHeaders(rateCheck),
      }
    );
  });
}
