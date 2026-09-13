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
  public readonly separateStemsUseCase = new SeparateStemsUseCase(
    this.jobRepository,
    this.assetRepository,
    this.separationProvider,
    this.mediaResolver,
    this.transcoder,
    this.realtime
  );

  public readonly downloadMediaUseCase = new DownloadMediaUseCase(
    this.jobRepository,
    this.assetRepository,
    this.mediaResolver,
    this.transcoder,
    this.realtime
  );

  public readonly translateAndSpeakUseCase = new TranslateAndSpeakUseCase(
    this.jobRepository,
    this.assetRepository,
    this.asrProvider,
    this.translationProvider,
    this.ttsProvider,
    this.transcoder,
    this.realtime
  );

  public readonly detectChordsUseCase = new DetectChordsUseCase(
    this.jobRepository,
    this.assetRepository,
    this.mediaResolver,
    this.separationProvider,
    this.chordDetector,
    this.realtime
  );

  public readonly createMashupUseCase = new CreateMashupUseCase(
    this.jobRepository,
    this.assetRepository,
    this.mediaResolver,
    this.separationProvider,
    this.transcoder,
    this.realtime
  );

  public readonly convertMediaUseCase = new ConvertMediaUseCase(
    this.jobRepository,
    this.assetRepository,
    this.mediaResolver,
    this.transcoder,
    this.realtime
  );

  public readonly getJobStatusUseCase = new GetJobStatusUseCase(
    this.jobRepository,
    this.assetRepository
  );
}

declare global {
  var diContainer: Container | undefined;
}

export const container = global.diContainer || new Container();
if (process.env.NODE_ENV !== "production") {
  global.diContainer = container;
}

export default container;
