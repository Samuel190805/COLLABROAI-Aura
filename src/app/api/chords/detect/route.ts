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

    // Rate Limiting Check
    const rateCheck = rateLimiter.check(userId || clientIp, "chord_detection");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Chord detection rate limit exceeded. Please wait a moment.",
          resetTime: rateCheck.resetTime,
        },
        {
          status: 429,
          headers: rateLimiter.getRateLimitHeaders(rateCheck),
        }
      );
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
        return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
      }

      inputType = "file";
      const buffer = Buffer.from(await file.arrayBuffer());
      inputAudioPath = path.join(/*turbopackIgnore: true*/ workDir, file.name || "input.wav");
      await fs.writeFile(inputAudioPath, buffer);
    } else {
      const json = await req.json().catch(() => ({}));
      url = json.url;

      if (!url || typeof url !== "string" || !url.trim()) {
        return NextResponse.json({ error: "Media URL is required" }, { status: 400 });
      }

      const validation = validateAndNormalizeSourceUrl(url.trim());
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error || "Invalid URL" }, { status: 400 });
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    // Enqueue async execution
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to initialize chord detection";
    console.error("[/api/chords/detect] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
