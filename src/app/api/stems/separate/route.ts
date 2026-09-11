import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import { validateAndNormalizeSourceUrl } from "@/domain/value-objects/SourceUrlValidator";
import { rateLimiter } from "@/infrastructure/ratelimit/rate-limiter";
import { retentionManager } from "@/infrastructure/storage/retention-manager";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const clientIp = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";

    // Rate Limiting check
    const rateCheck = rateLimiter.check(userId || clientIp, "stem_separation");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before queuing more stem separation jobs.",
          resetTime: rateCheck.resetTime,
        },
        {
          status: 429,
          headers: rateLimiter.getRateLimitHeaders(rateCheck),
        }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    const jobId = `job_stem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    let sourceType: "file" | "url" = "file";
    let inputFilePath: string | undefined = undefined;
    let sourceUrl: string | undefined = undefined;
    let outputFormat = "mp3";
    let bitrate = "320k";
    let mode: "4-stem" | "6-stem" = "4-stem";
    let ensemble = false;
    let denoise = true;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("file") || formData.get("audio")) as File | null;
      const url = formData.get("url") as string | null;
      outputFormat = (formData.get("outputFormat") as string) || "mp3";
      bitrate = (formData.get("bitrate") as string) || "320k";
      mode = ((formData.get("mode") as string) === "6-stem" ? "6-stem" : "4-stem");
      ensemble = formData.get("ensemble") === "true";
      denoise = formData.get("denoise") !== "false";

      if (file && file.size > 0) {
        sourceType = "file";
        const buffer = Buffer.from(await file.arrayBuffer());
        inputFilePath = path.join(/*turbopackIgnore: true*/ workDir, file.name || "input.wav");
        await fs.writeFile(inputFilePath, buffer);
      } else if (url && url.trim()) {
        sourceType = "url";
        const validation = validateAndNormalizeSourceUrl(url.trim());
        if (validation.isDrmProtected) {
          return NextResponse.json(
            { error: "This source isn't supported — it may be DRM-protected." },
            { status: 400 }
          );
        }
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error || "Invalid URL" },
            { status: 400 }
          );
        }
        sourceUrl = validation.normalizedUrl;
      } else {
        return NextResponse.json(
          { error: "Please provide either an audio file or a media URL" },
          { status: 400 }
        );
      }
    } else {
      const json = await req.json().catch(() => ({}));
      if (!json || (!json.url && !json.inputFilePath)) {
        return NextResponse.json(
          { error: "Please provide a valid media URL or upload an audio file." },
          { status: 400 }
        );
      }

      if (json.url) {
        sourceType = "url";
        const validation = validateAndNormalizeSourceUrl(json.url.trim());
        if (validation.isDrmProtected) {
          return NextResponse.json(
            { error: "This source isn't supported — it may be DRM-protected." },
            { status: 400 }
          );
        }
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error || "Invalid URL" },
            { status: 400 }
          );
        }
        sourceUrl = validation.normalizedUrl;
      }
      if (json.outputFormat) outputFormat = json.outputFormat;
      if (json.bitrate) bitrate = json.bitrate;
      if (json.mode === "6-stem") mode = "6-stem";
      if (json.ensemble !== undefined) ensemble = Boolean(json.ensemble);
      if (json.denoise !== undefined) denoise = Boolean(json.denoise);
    }

    // Create Job Entity
    const job = new Job({
      id: jobId,
      userId,
      type: "STEM_SEPARATION",
      status: "PENDING",
      stage: "ANALYSIS",
      progress: 0,
      message: "Queued for stem separation",
      inputParams: {
        sourceType,
        sourceUrl,
        inputFilePath,
        outputFormat,
        bitrate,
        mode,
        ensemble,
        denoise,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    // Enqueue async execution
    await container.queue.enqueue(jobId, async () => {
      await container.separateStemsUseCase.execute({
        jobId,
        userId,
        sourceType,
        inputFilePath,
        sourceUrl,
        outputFormat: outputFormat as any,
        bitrate,
        mode,
        ensemble,
        denoise,
      });
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        status: "PENDING",
        stage: "ANALYSIS",
        message: "Job initialized",
      },
      {
        headers: rateLimiter.getRateLimitHeaders(rateCheck),
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to initialize stem separation";
    console.error("[/api/stems/separate] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
