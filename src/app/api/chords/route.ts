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

    let inputType: "file" | "url" | "search" = "url";
    let inputAudioPath: string | undefined = undefined;
    let url: string | undefined = undefined;
    let query: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const urlParam = formData.get("url") as string | null;
      const queryParam = formData.get("query") as string | null;

      if (file && file.size > 0) {
        inputType = "file";
        const buffer = Buffer.from(await file.arrayBuffer());
        inputAudioPath = path.join(workDir, file.name.replace(/[^a-zA-Z0-9_.-]/g, "_") || "input.wav");
        await fs.writeFile(inputAudioPath, buffer);
      } else if (queryParam && queryParam.trim()) {
        inputType = "search";
        query = queryParam.trim();
      } else if (urlParam && urlParam.trim()) {
        inputType = "url";
        const validation = validateAndNormalizeSourceUrl(urlParam.trim());
        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error || "Invalid URL" }, { status: 400 });
        }
        url = validation.normalizedUrl;
      } else {
        return NextResponse.json({ error: "A valid file, URL, or search query is required" }, { status: 400 });
      }
    } else {
      const json = await req.json().catch(() => ({}));
      inputType = (json.inputType || (json.query ? "search" : json.filePath ? "file" : "url")) as any;
      query = json.query?.trim();
      inputAudioPath = json.filePath?.trim();
      url = json.url?.trim();

      if (inputType === "url") {
        if (!url) {
          return NextResponse.json({ error: "Media URL is required" }, { status: 400 });
        }
        const validation = validateAndNormalizeSourceUrl(url);
        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error || "Invalid URL" }, { status: 400 });
        }
        url = validation.normalizedUrl;
      } else if (inputType === "search") {
        if (!query) {
          return NextResponse.json({ error: "Search query is required" }, { status: 400 });
        }
      } else if (inputType === "file") {
        if (!inputAudioPath) {
          return NextResponse.json({ error: "File path is required" }, { status: 400 });
        }
      }
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
        query,
        filePath: inputAudioPath,
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
        query,
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
    console.error("[/api/chords] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
