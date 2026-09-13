import path from "path";
import fs from "fs/promises";
import { IJobRepository } from "@/domain/repositories/IJobRepository";
import { IAssetRepository } from "@/domain/repositories/IAssetRepository";
import { MediaSourceResolverPort } from "../ports/MediaSourceResolverPort";
import { SeparationProviderPort } from "../ports/SeparationProviderPort";
import { ChordDetectorPort } from "../ports/ChordDetectorPort";
import { RealtimePublisherPort } from "../ports/RealtimePublisherPort";
import { MediaAsset } from "@/domain/entities/MediaAsset";
import { ChordAnalysisResult, ChordEvent } from "@/domain/value-objects/ChordData";
import { retentionManager } from "@/infrastructure/storage/retention-manager";

export interface DetectChordsInput {
  jobId: string;
  userId?: string | null;
  inputType: "file" | "url" | "search";
  inputAudioPath?: string;
  filePath?: string;
  url?: string;
  query?: string;
}

export class DetectChordsUseCase {
  constructor(
    private jobRepo: IJobRepository,
    private assetRepo: IAssetRepository,
    private mediaResolver: MediaSourceResolverPort,
    private separationProvider: SeparationProviderPort,
    private chordDetector: ChordDetectorPort,
    private realtimePub: RealtimePublisherPort
  ) {}

  async execute(input: DetectChordsInput): Promise<ChordAnalysisResult> {
    const { jobId, userId, inputType, inputAudioPath, filePath, url, query } = input;
    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      let targetAudioPath = inputAudioPath || filePath || "";
      let resolvedSourceUrl = url;
      let isVideo = false;

      // 1. RESOLVE & DOWNLOAD if URL or search provided
      if ((inputType === "url" && url) || (inputType === "search" && query)) {
        this.publishProgress(jobId, "RESOLVING", 15, "Resolving URL or search query for chord extraction...");
        await this.jobRepo.updateProgress(jobId, "RESOLVING", 15, "Resolving media source...");

        const searchUrl = inputType === "search" && query ? `ytsearch1:${query}` : (url as string);
        const metadata = await this.mediaResolver.resolveInfo(searchUrl);
        resolvedSourceUrl = metadata.sourceUrl || (url as string) || searchUrl;
        isVideo = true;

        const downloadResult = await this.mediaResolver.download({
          url: resolvedSourceUrl,
          outputDirectory: workDir,
          targetFormat: "mp3",
          qualityOrResolution: "256k",
          onProgress: (_stage, pct) => {
            this.publishProgress(jobId, "RESOLVING", 15 + Math.floor(pct * 0.2), "Downloading audio stream...");
          },
        });
        targetAudioPath = downloadResult.filePath;
      }

      if (!targetAudioPath) {
        throw new Error("No valid audio file or URL provided for chord detection");
      }

      // 2. ISOLATE INSTRUMENT STEM (Section 4.5: Chroma extraction runs on isolated Instrument stem)
      this.publishProgress(jobId, "ANALYSIS", 40, "Isolating Instrument stem to eliminate vocal pitch interference...");
      await this.jobRepo.updateProgress(jobId, "ANALYSIS", 40, "Isolating Instrument stem...");

      let instrumentStemPath: string = targetAudioPath;
      try {
        const stemsDir = path.join(workDir, "stems");
        const separation = await this.separationProvider.separate(
          targetAudioPath,
          stemsDir
        );
        if (separation.instrumentPath && (await fs.stat(separation.instrumentPath).catch(() => null))) {
          instrumentStemPath = separation.instrumentPath;
        } else if (separation.stems?.STEM_INSTRUMENT) {
          instrumentStemPath = separation.stems.STEM_INSTRUMENT;
        }
      } catch (sepErr) {
        console.warn("[DetectChordsUseCase] Stem isolation fallback to audio mix:", sepErr);
        instrumentStemPath = targetAudioPath;
      }

      // 3. RUN HARMONIC CHROMA DETECTION
      this.publishProgress(jobId, "MODEL_INFERENCE", 70, "Analyzing harmonic chroma spectrum on Instrument stem...");
      await this.jobRepo.updateProgress(jobId, "MODEL_INFERENCE", 70, "Extracting beat-synchronized chord events & key...");

      const result = await this.chordDetector.detectChords(instrumentStemPath, targetAudioPath);

      // 4. PERSIST RESULT TO STORAGE
      const chordsStorageDir = path.join(process.cwd(), "storage", "chords");
      await fs.mkdir(chordsStorageDir, { recursive: true });

      // Save a permanent playable audio copy for playback if uploaded locally
      const audioFileName = `chords_${jobId}.mp3`;
      const finalAudioStoragePath = path.join(chordsStorageDir, audioFileName);
      if (targetAudioPath && (await fs.stat(targetAudioPath).catch(() => null))) {
        await fs.copyFile(targetAudioPath, finalAudioStoragePath).catch(() => {});
      }

      const chordTimeline: ChordEvent[] = result.chords.map((c) => ({
        ...c,
        startSec: c.startSec ?? c.timestamp,
        endSec: c.endSec ?? Number((c.timestamp + (c.durationSeconds || 2)).toFixed(2)),
      }));

      const chordDataJsonPath = path.join(chordsStorageDir, `chords_${jobId}.json`);
      await fs.writeFile(
        chordDataJsonPath,
        JSON.stringify(
          {
            ...result,
            chordTimeline,
            bpm: result.bpm,
            key: result.detectedKey,
            sourceUrl: resolvedSourceUrl,
            mediaType: isVideo ? "video" : "audio",
          },
          null,
          2
        )
      );

      const asset = new MediaAsset({
        id: `asset_chords_${jobId}`,
        jobId,
        userId,
        name: `Chord Analysis - ${result.detectedKey} (${result.bpm} BPM)`,
        kind: "STEM_INSTRUMENT",
        filePath: isVideo && resolvedSourceUrl ? resolvedSourceUrl : `/api/media/chords/${audioFileName}`,
        mimeType: isVideo ? "video/mp4" : "audio/mpeg",
        format: "mp3",
        metadata: {
          detectedKey: result.detectedKey,
          originalKey: result.originalKey || result.detectedKey,
          camelotKey: result.camelotKey,
          recommendedCapo: result.recommendedCapo,
          bpm: result.bpm,
          key: result.detectedKey,
          sections: result.sections || [],
          detectedVocabulary: result.detectedVocabulary || [],
          chordCount: result.chords.length,
          chords: result.chords,
          chordTimeline,
          sourceUrl: resolvedSourceUrl,
          mediaType: isVideo ? "video" : "audio",
        },
        createdAt: new Date(),
      });

      await this.assetRepo.create(asset);

      // Clean intermediate temporary files
      await retentionManager.cleanJobIntermediates(jobId);

      // Complete Job
      await this.jobRepo.updateStatus(
        jobId,
        "COMPLETED",
        "COMPLETED",
        undefined,
        "Chord detection completed"
      );

      this.realtimePub.publish(jobId, {
        jobId,
        status: "COMPLETED",
        stage: "COMPLETED",
        progress: 100,
        message: "Chords detected successfully",
        mediaAssets: [asset.toJSON()],
        updatedAt: new Date().toISOString(),
      });

      return {
        ...result,
        chordTimeline,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Chord detection failed";
      console.error(`[DetectChordsUseCase] Error on job ${jobId}:`, err);
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
    stage: "RESOLVING" | "ANALYSIS" | "MODEL_INFERENCE" | "EXPORT",
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
