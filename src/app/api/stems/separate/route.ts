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

    const rateCheck = rateLimiter.check(userId || clientIp, "stem_separation");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before queuing more separation jobs." },
        { status: 429, headers: rateLimiter.getRateLimitHeaders(rateCheck) }
      );
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
        const buffer = Buffer.from(await file.arrayBuffer());
        inputFilePath = path.join(workDir, file.name || "input.wav");
        await fs.writeFile(inputFilePath, buffer);
      } else if (url && url.trim()) {
        sourceType = "url";
        const validation = validateAndNormalizeSourceUrl(url.trim());
        if (validation.isDrmProtected) {
          return NextResponse.json({ error: "This source isn't supported — it may be DRM-protected." }, { status: 400 });
        }
        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error || "Invalid URL" }, { status: 400 });
        }
        sourceUrl = validation.normalizedUrl;
      } else {
        return NextResponse.json({ error: "Please provide an audio file or media URL" }, { status: 400 });
      }
    } else {
      const json = await req.json().catch(() => ({}));
      if (json.url) {
        sourceType = "url";
        const validation = validateAndNormalizeSourceUrl(json.url.trim());
        if (validation.isDrmProtected) {
          return NextResponse.json({ error: "This source isn't supported — it may be DRM-protected." }, { status: 400 });
        }
        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error || "Invalid URL" }, { status: 400 });
        }
        sourceUrl = validation.normalizedUrl;
      } else if (json.inputFilePath) {
        sourceType = "file";
        inputFilePath = json.inputFilePath;
      } else {
        return NextResponse.json({ error: "Please provide either a media URL or input file" }, { status: 400 });
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to initialize 2-stem separation";
    console.error("[/api/stems/separate] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
