import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import { StemSelection } from "@/domain/value-objects/MashupConfig";
import { rateLimiter } from "@/infrastructure/ratelimit/rate-limiter";
import { retentionManager } from "@/infrastructure/storage/retention-manager";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const clientIp = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";

    const rateCheck = rateLimiter.check(userId || clientIp, "mashup");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Mashup rendering rate limit exceeded. Please wait before queuing more mashups." },
        { status: 429, headers: rateLimiter.getRateLimitHeaders(rateCheck) }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    const jobId = `job_mash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    let trackA: any = {};
    let trackB: any = {};
    let selection: StemSelection = {
      vocalsSource: "A",
      instrumentSource: "B",
    };
    let autoKeyMatch = true;
    let autoTempoMatch = true;
    let targetBpm: number | undefined = undefined;
    let outputFormat: "mp3" | "wav" | "flac" = "mp3";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const fileA = formData.get("fileA") as File | null;
      const urlA = (formData.get("urlA") as string) || undefined;
      const fileB = formData.get("fileB") as File | null;
      const urlB = (formData.get("urlB") as string) || undefined;
      const selectionJson = formData.get("selection") as string | null;

      if (selectionJson) {
        try {
          const parsed = JSON.parse(selectionJson);
          selection = {
            vocalsSource: (parsed.vocalsSource || parsed.vocalsFrom || "A") as "A" | "B",
            instrumentSource: (parsed.instrumentSource || parsed.instrumentFrom || "B") as "A" | "B",
          };
        } catch {
          // fallback
        }
      }

      autoKeyMatch = formData.get("autoKeyMatch") !== "false";
      autoTempoMatch = formData.get("autoTempoMatch") !== "false";
      const tb = formData.get("targetBpm");
      if (tb) targetBpm = parseInt(String(tb), 10);
      outputFormat = ((formData.get("outputFormat") as string) || "mp3") as "mp3" | "wav" | "flac";

      if (fileA && fileA.size > 0) {
        const bufferA = Buffer.from(await fileA.arrayBuffer());
        const pathA = path.join(workDir, fileA.name || "trackA.mp3");
        await fs.writeFile(pathA, bufferA);
        trackA = { type: "file", filePath: pathA, name: fileA.name.replace(/\.[^/.]+$/, "") };
      } else if (urlA) {
        trackA = { type: "url", url: urlA.trim(), name: "Track A" };
      }

      if (fileB && fileB.size > 0) {
        const bufferB = Buffer.from(await fileB.arrayBuffer());
        const pathB = path.join(workDir, fileB.name || "trackB.mp3");
        await fs.writeFile(pathB, bufferB);
        trackB = { type: "file", filePath: pathB, name: fileB.name.replace(/\.[^/.]+$/, "") };
      } else if (urlB) {
        trackB = { type: "url", url: urlB.trim(), name: "Track B" };
      }
    } else {
      const json = await req.json().catch(() => ({}));
      trackA = json.trackA;
      trackB = json.trackB;
      if (json.selection) {
        selection = {
          vocalsSource: (json.selection.vocalsSource || json.selection.vocalsFrom || "A") as "A" | "B",
          instrumentSource: (json.selection.instrumentSource || json.selection.instrumentFrom || "B") as "A" | "B",
        };
      }
      autoKeyMatch = json.autoKeyMatch ?? true;
      autoTempoMatch = json.autoTempoMatch ?? true;
      targetBpm = json.targetBpm;
      if (json.outputFormat) outputFormat = json.outputFormat;
    }

    if (!trackA?.filePath && !trackA?.url) {
      return NextResponse.json({ error: "Track A source is required" }, { status: 400 });
    }
    if (!trackB?.filePath && !trackB?.url) {
      return NextResponse.json({ error: "Track B source is required" }, { status: 400 });
    }

    const job = new Job({
      id: jobId,
      userId,
      type: "MASHUP_RENDER",
      status: "PENDING",
      stage: "ANALYSIS",
      progress: 0,
      message: "Queued for 2-stem harmonic mashup rendering",
      inputParams: { trackA, trackB, selection, autoKeyMatch, autoTempoMatch, targetBpm, outputFormat },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    await container.queue.enqueue(jobId, async () => {
      await container.createMashupUseCase.execute({
        jobId,
        userId,
        trackA,
        trackB,
        selection,
        autoKeyMatch,
        autoTempoMatch,
        targetBpm,
        outputFormat,
      });
    });

    return NextResponse.json(
      { jobId, status: "PENDING", stage: "ANALYSIS" },
      { headers: rateLimiter.getRateLimitHeaders(rateCheck) }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to queue mashup job";
    console.error("[/api/mashup] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
