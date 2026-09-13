import path from "path";
import fs from "fs/promises";
import { IJobRepository } from "@/domain/repositories/IJobRepository";
import { IAssetRepository } from "@/domain/repositories/IAssetRepository";
import { MediaSourceResolverPort } from "../ports/MediaSourceResolverPort";
import { SeparationProviderPort } from "../ports/SeparationProviderPort";
import { TranscoderPort } from "../ports/TranscoderPort";
import { RealtimePublisherPort } from "../ports/RealtimePublisherPort";
import { MediaAsset } from "@/domain/entities/MediaAsset";
import { StemSelection, calculateCompatibility } from "@/domain/value-objects/MashupConfig";
import { retentionManager } from "@/infrastructure/storage/retention-manager";

export interface CreateMashupInput {
  jobId: string;
  userId?: string | null;
  trackA: {
    type: "file" | "url";
    filePath?: string;
    url?: string;
    name?: string;
  };
  trackB: {
    type: "file" | "url";
    filePath?: string;
    url?: string;
    name?: string;
  };
  selection: StemSelection;
  autoKeyMatch?: boolean;
  autoTempoMatch?: boolean;
  targetBpm?: number;
  outputFormat?: "mp3" | "wav" | "flac";
}

export class CreateMashupUseCase {
  constructor(
    private jobRepo: IJobRepository,
    private assetRepo: IAssetRepository,
    private mediaResolver: MediaSourceResolverPort,
    private separationProvider: SeparationProviderPort,
    private transcoder: TranscoderPort,
    private realtimePub: RealtimePublisherPort
  ) {}

  async execute(input: CreateMashupInput): Promise<{ asset: MediaAsset; masterPath: string }> {
    const {
      jobId,
      userId,
      trackA,
      trackB,
      selection,
      autoKeyMatch = true,
      autoTempoMatch = true,
      targetBpm,
      outputFormat = "mp3",
    } = input;

    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      // 1. RESOLVE SOURCES
      this.publishProgress(jobId, "RESOLVING", 10, "Resolving Track A & Track B sources...");
      await this.jobRepo.updateProgress(jobId, "RESOLVING", 10, "Resolving audio tracks...");

      let audioAPath = trackA.filePath || "";
      if (trackA.type === "url" && trackA.url) {
        const dlA = await this.mediaResolver.download({
          url: trackA.url,
          outputDirectory: path.join(workDir, "srcA"),
          targetFormat: "mp3",
        });
        audioAPath = dlA.filePath;
      }

      let audioBPath = trackB.filePath || "";
      if (trackB.type === "url" && trackB.url) {
        const dlB = await this.mediaResolver.download({
          url: trackB.url,
          outputDirectory: path.join(workDir, "srcB"),
          targetFormat: "mp3",
        });
        audioBPath = dlB.filePath;
      }

      if (!audioAPath || !audioBPath) {
        throw new Error("Both Track A and Track B audio sources must be provided");
      }

      // 2. RUN 2-STEM SEPARATION ON BOTH TRACKS
      this.publishProgress(jobId, "ANALYSIS", 30, "Isolating Vocals and Instrument stems for both tracks...");
      await this.jobRepo.updateProgress(jobId, "ANALYSIS", 30, "Separating 2 stems for tracks...");

      const [sepA, sepB] = await Promise.all([
        this.separationProvider.separate(audioAPath, path.join(workDir, "stemsA")),
        this.separationProvider.separate(audioBPath, path.join(workDir, "stemsB")),
      ]);

      // 3. ANALYZE KEY & TEMPO AGAINST INSTRUMENT STEMS (Section 4.4)
      this.publishProgress(jobId, "MODEL_INFERENCE", 55, "Analyzing harmonic Camelot keys & BPM from Instrument stems...");
      await this.jobRepo.updateProgress(jobId, "MODEL_INFERENCE", 55, "Analyzing harmonic compatibility...");

      // Analyze against isolated Instrument stems for clean pitch and tempo detection
      const [keyAInfo, keyBInfo] = await Promise.all([
        this.transcoder.detectKeyAndBpm(sepA.instrumentPath),
        this.transcoder.detectKeyAndBpm(sepB.instrumentPath),
      ]);

      const compatibility = calculateCompatibility(
        keyAInfo.key,
        keyAInfo.camelot,
        keyAInfo.bpm,
        keyBInfo.key,
        keyBInfo.camelot,
        keyBInfo.bpm
      );

      // 4. PICK CHOSEN VOCALS AND INSTRUMENT STEMS
      const vocalsPick = selection.vocalsSource ?? selection.vocalsFrom ?? "A";
      const instrumentPick = selection.instrumentSource ?? selection.instrumentFrom ?? "B";

      const vocalsSourcePath = vocalsPick === "A" ? sepA.vocalsPath : sepB.vocalsPath;
      const instrumentSourcePath = instrumentPick === "A" ? sepA.instrumentPath : sepB.instrumentPath;

      const vocalKeyInfo = vocalsPick === "A" ? keyAInfo : keyBInfo;
      const instKeyInfo = instrumentPick === "A" ? keyAInfo : keyBInfo;

      const effectiveTargetBpm = targetBpm || instKeyInfo.bpm || compatibility.suggestedBpm;

      this.publishProgress(jobId, "STEM_RECONSTRUCTION", 75, "Harmonically aligning Vocals with chosen Instrument...");
      await this.jobRepo.updateProgress(jobId, "STEM_RECONSTRUCTION", 75, "Applying pitch & tempo alignment...");

      let processedVocalPath = vocalsSourcePath;

      // Auto Key-Match: pitch shift chosen vocal stem (max +/- 4 semitones) to match chosen instrument stem's key
      if (autoKeyMatch && compatibility.pitchShiftSemis !== 0) {
        const shiftAmount = vocalsPick === "A" ? compatibility.pitchShiftSemis : -compatibility.pitchShiftSemis;
        const clampedShift = Math.max(-4, Math.min(4, shiftAmount));
        const shiftedPath = path.join(workDir, `vocals_pitch_shifted.mp3`);
        await this.transcoder.pitchShift(processedVocalPath, shiftedPath, clampedShift);
        processedVocalPath = shiftedPath;
      }

      // Auto Tempo-Match: time stretch vocal stem to chosen instrument's BPM
      if (autoTempoMatch && vocalKeyInfo.bpm > 0 && effectiveTargetBpm > 0) {
        const tempoRatio = effectiveTargetBpm / vocalKeyInfo.bpm;
        if (Math.abs(tempoRatio - 1.0) > 0.02) {
          const stretchedPath = path.join(workDir, `vocals_stretched.mp3`);
          await this.transcoder.timeStretch(processedVocalPath, stretchedPath, tempoRatio);
          processedVocalPath = stretchedPath;
        }
      }

      // 5. MASTER MIXDOWN & EBU R128 LOUDNESS NORMALIZATION
      this.publishProgress(jobId, "EXPORT", 90, "Muxing final mashup with -14 LUFS mastering...");
      await this.jobRepo.updateProgress(jobId, "EXPORT", 90, "Rendering master mashup...");

      const mashupStorageDir = path.join(process.cwd(), "storage", "mashups");
      await fs.mkdir(mashupStorageDir, { recursive: true });

      const nameA = trackA.name || "Track A";
      const nameB = trackB.name || "Track B";
      const sanitizedName = `${nameA}_x_${nameB}`.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
      const outFileName = `mashup_${sanitizedName}_${jobId.substring(0, 8)}.${outputFormat}`;
      const finalOutputPath = path.join(mashupStorageDir, outFileName);

      // Mix the two stems together with balanced volumes
      const rawMixPath = path.join(workDir, `raw_mashup_mix.${outputFormat}`);
      await this.transcoder.mixAudioTracks([processedVocalPath, instrumentSourcePath], rawMixPath, [1.0, 0.95]);

      // EBU R128 -14 LUFS normalization
      await this.transcoder.transcode({
        inputPath: rawMixPath,
        outputPath: finalOutputPath,
        targetFormat: outputFormat,
        normalizeLoudness: true,
        metadataTags: {
          title: `${nameA} (Vocals) × ${nameB} (Instrument)`,
          artist: "SplitStream Mashup Studio",
          comment: `Harmonic Score: ${compatibility.scorePercent}% • Target BPM: ${effectiveTargetBpm}`,
        },
      });

      const validation = await this.transcoder.validateOutput(finalOutputPath, outputFormat);
      if (!validation.isValid) {
        throw new Error(`Mashup export validation failed: ${validation.error}`);
      }

      let waveform: number[] | null = null;
      try {
        waveform = await this.transcoder.extractWaveformData(finalOutputPath, 64);
      } catch {
        waveform = null;
      }

      const asset = new MediaAsset({
        id: `asset_mash_${jobId}`,
        jobId,
        userId,
        name: `${nameA} × ${nameB} (Mashup)`,
        kind: "MASHUP",
        filePath: `/api/media/mashups/${outFileName}`,
        mimeType: outputFormat === "wav" ? "audio/wav" : outputFormat === "flac" ? "audio/flac" : "audio/mpeg",
        format: outputFormat,
        codec: validation.actualCodec || outputFormat,
        duration: validation.duration,
        sizeBytes: validation.sizeBytes,
        waveformData: waveform,
        metadata: {
          vocalsSource: selection.vocalsSource,
          instrumentSource: selection.instrumentSource,
          trackAName: nameA,
          trackBName: nameB,
          compatibilityScore: compatibility.scorePercent,
          keyMatch: compatibility.keyMatch,
          camelotA: compatibility.camelotA,
          camelotB: compatibility.camelotB,
          bpmA: compatibility.bpmA,
          bpmB: compatibility.bpmB,
          targetBpm: effectiveTargetBpm,
          pitchShiftApplied: compatibility.pitchShiftSemis,
        },
        createdAt: new Date(),
      });

      await this.assetRepo.create(asset);

      // Clean intermediate files
      await retentionManager.cleanJobIntermediates(jobId);

      // Complete Job
      await this.jobRepo.updateStatus(jobId, "COMPLETED", "COMPLETED", undefined, "Mashup rendered successfully");
      this.realtimePub.publish(jobId, {
        jobId,
        status: "COMPLETED",
        stage: "COMPLETED",
        progress: 100,
        message: "Mashup rendered and mastered ready for playback",
        mediaAssets: [asset.toJSON()],
        updatedAt: new Date().toISOString(),
      });

      return {
        asset,
        masterPath: finalOutputPath,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Mashup creation failed";
      console.error(`[CreateMashupUseCase] Error on job ${jobId}:`, err);
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
    stage: "RESOLVING" | "ANALYSIS" | "MODEL_INFERENCE" | "STEM_RECONSTRUCTION" | "EXPORT",
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
