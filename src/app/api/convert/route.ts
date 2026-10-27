import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { retentionManager } from "@/infrastructure/storage/retention-manager";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const contentType = req.headers.get("content-type") || "";

    let direction: "video-to-audio" | "audio-to-video" = "video-to-audio";
    let outputFormat = "mp3";
    let resolution = "720p";
    let visualType: "waveform" | "spectrum" = "waveform";
    let inputType: "file" | "url" = "file";
    let inputPath: string | undefined;
    let sourceUrl: string | undefined;

    const jobId = `job_conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobWorkDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(jobWorkDir, { recursive: true });

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      direction = ((formData.get("direction") as string) || "video-to-audio") as any;
      outputFormat = (formData.get("outputFormat") as string) || (direction === "video-to-audio" ? "mp3" : "mp4");
      resolution = (formData.get("resolution") as string) || "720p";
      visualType = ((formData.get("visualType") as string) || "waveform") as any;
      const urlParam = formData.get("url") as string | null;

      if (file && file.size > 0) {
        inputType = "file";
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const uploadPath = path.join(jobWorkDir, `input_${sanitizedName}`);
        const nodeStream = Readable.fromWeb(file.stream() as any);
        await pipeline(nodeStream, createWriteStream(uploadPath));
        inputPath = uploadPath;
      } else if (urlParam && urlParam.trim()) {
        inputType = "url";
        sourceUrl = urlParam.trim();
      } else {
        throw AppError.invalidInput("Either a file or a valid URL is required");
      }
    } else {
      const body = await req.json().catch(() => ({}));
      direction = (body.direction || "video-to-audio") as any;
      outputFormat = body.outputFormat || (direction === "video-to-audio" ? "mp3" : "mp4");
      resolution = body.resolution || "720p";
      visualType = body.visualType || "waveform";

      if (body.url && typeof body.url === "string" && body.url.trim()) {
        inputType = "url";
        sourceUrl = body.url.trim();
      } else if (body.filePath && typeof body.filePath === "string" && body.filePath.trim()) {
        inputType = "file";
        inputPath = body.filePath.trim();
      } else {
        throw AppError.invalidInput("Either a URL or filePath must be provided");
      }
    }

    const job = new Job({
      id: jobId,
      userId,
      type: "MEDIA_CONVERSION",
      status: "PENDING",
      stage: "RESOLVING",
      progress: 0,
      message: "Queued for media conversion",
      inputParams: {
        direction,
        inputType,
        inputPath,
        outputFormat,
        resolution,
        visualType,
        sourceUrl,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    await container.queue.enqueue(jobId, async () => {
      await container.convertMediaUseCase.execute({
        jobId,
        userId,
        direction,
        inputType,
        inputPath,
        sourceUrl,
        outputFormat: outputFormat as any,
        resolution: resolution as any,
        visualType,
      });
    });

    return NextResponse.json({
      success: true,
      jobId,
      status: "PENDING",
      stage: "RESOLVING",
      message: "Media conversion job initialized",
    });
  });
}
