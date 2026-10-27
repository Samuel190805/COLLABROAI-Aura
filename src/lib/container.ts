import { PrismaJobRepository } from "@/infrastructure/persistence/prisma/PrismaJobRepository";
import { PrismaAssetRepository } from "@/infrastructure/persistence/prisma/PrismaAssetRepository";
import { PrismaUserRepository } from "@/infrastructure/persistence/prisma/PrismaUserRepository";
import { jobQueue } from "@/infrastructure/queue/job-queue";
import { realtimeBus } from "@/infrastructure/realtime/realtime-bus";
import { mediaTranscoder } from "@/infrastructure/media/transcoder";
import { separationClient } from "@/providers/separation/SeparationClient";
import { ytDlpMediaResolver } from "@/providers/media-resolver/YtDlpMediaResolver";
import { whisperASRProvider } from "@/providers/asr/WhisperASRProvider";
import { neuralTranslationProvider } from "@/providers/translation/NeuralTranslationProvider";
import { neuralTTSProvider } from "@/providers/tts/NeuralTTSProvider";
import { chordDetectorProvider } from "@/providers/chords/ChordDetectorProvider";

import { SeparateStemsUseCase } from "@/application/use-cases/SeparateStemsUseCase";
import { DownloadMediaUseCase } from "@/application/use-cases/DownloadMediaUseCase";
import { TranslateAndSpeakUseCase } from "@/application/use-cases/TranslateAndSpeakUseCase";
import { DetectChordsUseCase } from "@/application/use-cases/DetectChordsUseCase";
import { CreateMashupUseCase } from "@/application/use-cases/CreateMashupUseCase";
import { ConvertMediaUseCase } from "@/application/use-cases/ConvertMediaUseCase";
import { GetJobStatusUseCase } from "@/application/use-cases/GetJobStatusUseCase";

class Container {
  // Repositories
  public readonly jobRepository = new PrismaJobRepository();
  public readonly assetRepository = new PrismaAssetRepository();
  public readonly userRepository = new PrismaUserRepository();

  // Infrastructure Ports
  public readonly queue = jobQueue;
  public readonly realtime = realtimeBus;
  public readonly transcoder = mediaTranscoder;

  // Providers
  public readonly separationProvider = separationClient;
  public readonly mediaResolver = ytDlpMediaResolver;
  public readonly asrProvider = whisperASRProvider;
  public readonly translationProvider = neuralTranslationProvider;
  public readonly ttsProvider = neuralTTSProvider;
  public readonly chordDetector = chordDetectorProvider;

  // Use Cases
  public readonly separateStemsUseCase: SeparateStemsUseCase;
  public readonly downloadMediaUseCase: DownloadMediaUseCase;
  public readonly translateAndSpeakUseCase: TranslateAndSpeakUseCase;
  public readonly detectChordsUseCase: DetectChordsUseCase;
  public readonly createMashupUseCase: CreateMashupUseCase;
  public readonly convertMediaUseCase: ConvertMediaUseCase;
  public readonly getJobStatusUseCase: GetJobStatusUseCase;

  constructor() {
    this.separateStemsUseCase = new SeparateStemsUseCase(
      this.jobRepository,
      this.assetRepository,
      this.separationProvider,
      this.mediaResolver,
      this.transcoder,
      this.realtime
    );

    this.downloadMediaUseCase = new DownloadMediaUseCase(
      this.jobRepository,
      this.assetRepository,
      this.mediaResolver,
      this.transcoder,
      this.realtime
    );

    this.translateAndSpeakUseCase = new TranslateAndSpeakUseCase(
      this.jobRepository,
      this.assetRepository,
      this.asrProvider,
      this.translationProvider,
      this.ttsProvider,
      this.transcoder,
      this.realtime
    );

    this.detectChordsUseCase = new DetectChordsUseCase(
      this.jobRepository,
      this.assetRepository,
      this.mediaResolver,
      this.separationProvider,
      this.chordDetector,
      this.realtime
    );

    this.createMashupUseCase = new CreateMashupUseCase(
      this.jobRepository,
      this.assetRepository,
      this.mediaResolver,
      this.separationProvider,
      this.transcoder,
      this.realtime
    );

    this.convertMediaUseCase = new ConvertMediaUseCase(
      this.jobRepository,
      this.assetRepository,
      this.mediaResolver,
      this.transcoder,
      this.realtime
    );

    this.getJobStatusUseCase = new GetJobStatusUseCase(
      this.jobRepository,
      this.assetRepository
    );

    this.initWorkerHandlers();
    this.queue.startWorker();
  }

  private initWorkerHandlers(): void {
    // 1. STEM_SEPARATION
    this.queue.registerHandler("STEM_SEPARATION", async (job) => {
      const p = job.inputParams as any;
      await this.separateStemsUseCase.execute({
        jobId: job.id,
        userId: job.userId,
        sourceType: p.sourceType || (p.sourceUrl ? "url" : "file"),
        inputFilePath: p.inputFilePath,
        sourceUrl: p.sourceUrl,
        outputFormat: p.outputFormat || "mp3",
        bitrate: p.bitrate || "320k",
        denoise: p.denoise ?? true,
      });
    });

    // 2. MEDIA_DOWNLOAD
    this.queue.registerHandler("MEDIA_DOWNLOAD", async (job) => {
      const p = job.inputParams as any;
      await this.downloadMediaUseCase.execute({
        jobId: job.id,
        userId: job.userId,
        url: p.url,
        targetFormat: p.targetFormat || p.format || "mp3",
        qualityOrResolution: p.qualityOrResolution || p.quality,
        mediaType: p.mediaType || "audio",
      });
    });

    // 3. TRANSLATE_SPEAK
    this.queue.registerHandler("TRANSLATE_SPEAK", async (job) => {
      const p = job.inputParams as any;
      await this.translateAndSpeakUseCase.execute({
        jobId: job.id,
        userId: job.userId,
        inputType: p.inputType || (p.sourceText ? "text" : "audio"),
        inputAudioPath: p.inputAudioPath,
        sourceText: p.sourceText || p.text,
        translatedText: p.translatedText,
        sourceLanguage: p.sourceLanguage || "auto",
        targetLanguage: p.targetLanguage || "ta",
        voiceGender: p.voiceGender || "female",
        speed: p.speed ?? 1.0,
        preserveVoice: p.preserveVoice ?? true,
        enableDiarization: p.enableDiarization ?? true,
      });
    });

    // 4. CHORD_DETECTION
    this.queue.registerHandler("CHORD_DETECTION", async (job) => {
      const p = job.inputParams as any;
      await this.detectChordsUseCase.execute({
        jobId: job.id,
        userId: job.userId,
        inputType: p.inputType || (p.url ? "url" : p.query ? "search" : "file"),
        inputAudioPath: p.inputAudioPath || p.filePath,
        filePath: p.filePath || p.inputAudioPath,
        url: p.url,
        query: p.query,
      });
    });

    // 5. MASHUP_RENDER
    this.queue.registerHandler("MASHUP_RENDER", async (job) => {
      const p = job.inputParams as any;
      await this.createMashupUseCase.execute({
        jobId: job.id,
        userId: job.userId,
        trackA: p.trackA,
        trackB: p.trackB,
        selection: p.selection,
        autoKeyMatch: p.autoKeyMatch ?? true,
        autoTempoMatch: p.autoTempoMatch ?? true,
        targetBpm: p.targetBpm,
        outputFormat: p.outputFormat || "mp3",
      });
    });

    // 6. MEDIA_CONVERSION
    this.queue.registerHandler("MEDIA_CONVERSION", async (job) => {
      const p = job.inputParams as any;
      await this.convertMediaUseCase.execute({
        jobId: job.id,
        userId: job.userId,
        direction: p.direction || "video-to-audio",
        inputType: p.inputType || (p.sourceUrl ? "url" : "file"),
        inputPath: p.inputPath || p.filePath,
        sourceUrl: p.sourceUrl || p.url,
        outputFormat: p.outputFormat || "mp3",
        resolution: p.resolution || "720p",
        visualType: p.visualType || "waveform",
      });
    });
  }
}

const globalForContainer = globalThis as unknown as { container: Container | undefined };

export const container = globalForContainer.container ?? new Container();
if (process.env.NODE_ENV !== "production") {
  globalForContainer.container = container;
}

export default container;
