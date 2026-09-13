import path from "path";
import fs from "fs/promises";
import { IJobRepository } from "@/domain/repositories/IJobRepository";
import { IAssetRepository } from "@/domain/repositories/IAssetRepository";
import { MediaSourceResolverPort } from "../ports/MediaSourceResolverPort";
import { TranscoderPort } from "../ports/TranscoderPort";
import { RealtimePublisherPort } from "../ports/RealtimePublisherPort";
import { MediaFormat, FORMAT_SPECIFICATIONS } from "@/domain/value-objects/MediaFormats";
import { MediaAsset } from "@/domain/entities/MediaAsset";
import { retentionManager } from "@/infrastructure/storage/retention-manager";

export interface ConvertMediaInput {
  jobId: string;
  userId?: string | null;
  direction: "video-to-audio" | "audio-to-video";
  inputType: "file" | "url";
  inputPath?: string;
  sourceUrl?: string;
  outputFormat: MediaFormat;
  resolution?: "1080p" | "720p" | "480p";
  visualType?: "waveform" | "spectrum";
}

export class ConvertMediaUseCase {
  constructor(
    private jobRepo: IJobRepository,
    private assetRepo: IAssetRepository,
    private mediaResolver: MediaSourceResolverPort,
    private transcoder: TranscoderPort,
    private realtimePub: RealtimePublisherPort
  ) {}

  async execute(input: ConvertMediaInput): Promise<{ asset: MediaAsset; outputPath: string }> {
    const {
      jobId,
      userId,
      direction,
      inputType,
      inputPath,
      sourceUrl,
      outputFormat,
      resolution = "720p",
      visualType = "waveform",
    } = input;

    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      // 1. RESOLVING
      this.publishProgress(jobId, "RESOLVING", 15, "Resolving input source media...");
      await this.jobRepo.updateProgress(jobId, "RESOLVING", 15, "Resolving media...");

      let workingInputPath = inputPath;

      if (inputType === "url" && sourceUrl) {
        this.publishProgress(jobId, "RESOLVING", 25, "Downloading stream from URL...");
        const downloaded = await this.mediaResolver.download({
          url: sourceUrl,
          outputDirectory: workDir,
          targetFormat: direction === "video-to-audio" ? "mp4" : "mp3",
          onProgress: (_stage, pct, msg) => {
            this.publishProgress(jobId, "RESOLVING", 15 + Math.floor(pct * 0.2), msg);
          },
        });
        workingInputPath = downloaded.filePath;
      }

      if (!workingInputPath) {
        throw new Error("No valid input file or URL provided for media conversion");
      }

      // Check that the input file actually exists and is readable
      await fs.access(workingInputPath);

      // Managed storage output directory
      const finalDir = path.join(process.cwd(), "storage", "conversions");
      await fs.mkdir(finalDir, { recursive: true });

      const baseName = path.basename(workingInputPath, path.extname(workingInputPath)).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
      const outFileName = `${baseName}_converted_${jobId.substring(0, 8)}.${outputFormat}`;
      const finalOutputPath = path.join(finalDir, outFileName);

      // 2. TRANSCODING
      if (direction === "video-to-audio") {
        this.publishProgress(
          jobId,
          "TRANSCODING",
          50,
          `Extracting audio track and transcoding to ${outputFormat.toUpperCase()}...`
        );
        await this.jobRepo.updateProgress(jobId, "TRANSCODING", 50, "Extracting audio track...");

        await this.transcoder.extractAudioFromVideo(
          workingInputPath,
          finalOutputPath,
          outputFormat
        );
      } else {
        this.publishProgress(
          jobId,
          "TRANSCODING",
          50,
          `Rendering audio into ${outputFormat.toUpperCase()} video (${resolution}, ${visualType})...`
        );
        await this.jobRepo.updateProgress(jobId, "TRANSCODING", 50, "Rendering video container...");

        await this.transcoder.renderAudioToVideo({
          audioPath: workingInputPath,
          outputPath: finalOutputPath,
          targetFormat: outputFormat as "mp4" | "webm",
          resolution,
          visualType,
        });
      }

      // 3. EXPORT & VALIDATION
      this.publishProgress(jobId, "EXPORT", 90, "Validating container integrity with ffprobe...");
      await this.jobRepo.updateProgress(jobId, "EXPORT", 90, "Validating output...");

      const validation = await this.transcoder.validateOutput(finalOutputPath, outputFormat);
      if (!validation.isValid) {
        throw new Error(`Converted media failed integrity check: ${validation.error}`);
      }

      let waveform: number[] | null = null;
      if (direction === "video-to-audio") {
        try {
          waveform = await this.transcoder.extractWaveformData(finalOutputPath, 64);
        } catch {
          waveform = null;
        }
      }

      const formatSpec = FORMAT_SPECIFICATIONS[outputFormat] || {
        mimeType: direction === "audio-to-video" ? `video/${outputFormat}` : `audio/${outputFormat}`,
      };

      const asset = new MediaAsset({
        id: `asset_conv_${jobId}`,
        jobId,
        userId,
        name: `${baseName} (${direction === "video-to-audio" ? "Audio Extracted" : "Video Visualized"})`,
        kind: "CONVERTED_MEDIA",
        filePath: `/api/media/conversions/${outFileName}`,
        mimeType: formatSpec.mimeType,
        format: outputFormat,
        codec: validation.actualCodec || outputFormat,
        duration: validation.duration,
        sizeBytes: validation.sizeBytes,
        waveformData: waveform,
        metadata: {
          direction,
          outputFormat,
          resolution: direction === "audio-to-video" ? resolution : undefined,
          visualType: direction === "audio-to-video" ? visualType : undefined,
          sourceUrl: inputType === "url" ? sourceUrl : undefined,
        },
        createdAt: new Date(),
      });

      await this.assetRepo.create(asset);

      // Clean temporary working intermediates
      await retentionManager.cleanJobIntermediates(jobId);

      // Complete Job
      await this.jobRepo.updateStatus(
        jobId,
        "COMPLETED",
        "COMPLETED",
        undefined,
        "Media conversion completed successfully"
      );

      this.realtimePub.publish(jobId, {
        jobId,
        status: "COMPLETED",
        stage: "COMPLETED",
        progress: 100,
        message: "Conversion complete and verified ready for playback",
        mediaAssets: [asset.toJSON()],
        updatedAt: new Date().toISOString(),
      });

      return {
        asset,
        outputPath: finalOutputPath,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Media conversion failed";
      console.error(`[ConvertMediaUseCase] Error on job ${jobId}:`, err);
      await retentionManager.cleanJobIntermediates(jobId);

      await this.jobRepo.updateStatus(jobId, "FAILED", "FAILED", errorMsg, errorMsg);
      this.realtimePub.publish(jobId, {
        jobId,
        status: "FAILED",
        stage: "FAILED",
        progress: 0,
        error: errorMsg,
        message: errorMsg,
        updatedAt: new Date().toISOString(),
      });
      throw err;
    }
  }

  private publishProgress(
    jobId: string,
    stage: "RESOLVING" | "TRANSCODING" | "EXPORT",
    progress: number,
    message?: string
  ) {
    this.realtimePub.publish(jobId, {
      jobId,
      status: "PROCESSING",
      stage,
      progress,
      message,
      updatedAt: new Date().toISOString(),
    });
  }
}
