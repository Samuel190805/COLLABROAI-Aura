import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import { StemSelection } from "@/domain/value-objects/MashupConfig";
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

    const rateCheck = rateLimiter.check(userId || clientIp, "mashup");
    if (!rateCheck.allowed) {
      throw AppError.rateLimited("Mashup rendering rate limit exceeded. Please wait before queuing more mashups.");
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
        const sanitizedA = (fileA.name || "trackA.mp3").replace(/[^a-zA-Z0-9_.-]/g, "_");
        const pathA = path.join(workDir, sanitizedA);
        const nodeStreamA = Readable.fromWeb(fileA.stream() as any);
        await pipeline(nodeStreamA, createWriteStream(pathA));
        trackA = { type: "file", filePath: pathA, name: fileA.name.replace(/\.[^/.]+$/, "") };
      } else if (urlA) {
        trackA = { type: "url", url: urlA, name: "Track A" };
      } else {
        throw AppError.invalidInput("Track A audio source is required");
      }

      if (fileB && fileB.size > 0) {
        const sanitizedB = (fileB.name || "trackB.mp3").replace(/[^a-zA-Z0-9_.-]/g, "_");
        const pathB = path.join(workDir, sanitizedB);
        const nodeStreamB = Readable.fromWeb(fileB.stream() as any);
        await pipeline(nodeStreamB, createWriteStream(pathB));
        trackB = { type: "file", filePath: pathB, name: fileB.name.replace(/\.[^/.]+$/, "") };
      } else if (urlB) {
        trackB = { type: "url", url: urlB, name: "Track B" };
      } else {
        throw AppError.invalidInput("Track B audio source is required");
      }
    } else {
      const json = await req.json().catch(() => ({}));
      trackA = json.trackA;
      trackB = json.trackB;
      if (json.selection) selection = json.selection;
      if (typeof json.autoKeyMatch === "boolean") autoKeyMatch = json.autoKeyMatch;
      if (typeof json.autoTempoMatch === "boolean") autoTempoMatch = json.autoTempoMatch;
      if (json.targetBpm) targetBpm = parseInt(String(json.targetBpm), 10);
      if (json.outputFormat) outputFormat = json.outputFormat;

      if (!trackA || (!trackA.filePath && !trackA.url)) {
        throw AppError.invalidInput("Track A is required");
      }
      if (!trackB || (!trackB.filePath && !trackB.url)) {
        throw AppError.invalidInput("Track B is required");
      }
    }

    const job = new Job({
      id: jobId,
      userId,
      type: "MASHUP_RENDER",
      status: "PENDING",
      stage: "ANALYSIS",
      progress: 0,
      message: "Queued for 2-track mashup creation",
      inputParams: {
        trackA,
        trackB,
        selection,
        autoKeyMatch,
        autoTempoMatch,
        targetBpm,
        outputFormat,
      },
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
      {
        success: true,
        jobId,
        status: "PENDING",
        stage: "ANALYSIS",
        message: "Mashup studio rendering job initialized",
      },
      { headers: rateLimiter.getRateLimitHeaders(rateCheck) }
    );
  });
}
