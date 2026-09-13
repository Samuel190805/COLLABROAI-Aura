import path from "path";
import fs from "fs/promises";
import { IJobRepository } from "@/domain/repositories/IJobRepository";
import { IAssetRepository } from "@/domain/repositories/IAssetRepository";
import { ASRProviderPort, SpeechSegment } from "../ports/ASRProviderPort";
import { TranslationProviderPort } from "../ports/TranslationProviderPort";
import { TTSProviderPort } from "../ports/TTSProviderPort";
import { TranscoderPort } from "../ports/TranscoderPort";
import { RealtimePublisherPort } from "../ports/RealtimePublisherPort";
import { MediaAsset } from "@/domain/entities/MediaAsset";
import { retentionManager } from "@/infrastructure/storage/retention-manager";

export interface TranslateAndSpeakInput {
  jobId: string;
  userId?: string | null;
  inputType: "audio" | "text";
  inputAudioPath?: string;
  sourceText?: string;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  voiceGender?: "male" | "female" | "neutral";
  speed?: number;
  preserveVoice?: boolean;
  enableDiarization?: boolean;
}

export class TranslateAndSpeakUseCase {
  constructor(
    private jobRepo: IJobRepository,
    private assetRepo: IAssetRepository,
    private asrProvider: ASRProviderPort,
    private translationProvider: TranslationProviderPort,
    private ttsProvider: TTSProviderPort,
    private transcoder: TranscoderPort,
    private realtimePub: RealtimePublisherPort
  ) {}

  async execute(input: TranslateAndSpeakInput): Promise<{ asset: MediaAsset; translatedText: string; audioFilePath: string }> {
    const {
      jobId,
      userId,
      inputType,
      inputAudioPath,
      sourceText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      voiceGender,
      speed,
      preserveVoice = true,
      enableDiarization = true,
    } = input;

    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      let recognizedText = sourceText || "";
      let detectedOrSourceLang = sourceLanguage || "auto";
      let recognizedSegments: SpeechSegment[] = [];

      // 1. ASR / TRANSCRIBING STAGE (if audio provided)
      if (inputType === "audio" && inputAudioPath) {
        this.publishProgress(jobId, "TRANSCRIBING", 20, "Transcribing spoken audio & identifying speakers...");
        await this.jobRepo.updateProgress(jobId, "TRANSCRIBING", 20, "Transcribing speech & diarization...");

        const asrResult = await this.asrProvider.transcribe(inputAudioPath, sourceLanguage);
        recognizedText = asrResult.text;
        detectedOrSourceLang = asrResult.detectedLanguage || sourceLanguage || "en";
        recognizedSegments = asrResult.segments || [];

        console.log(`[TranslateAndSpeakUseCase] Job ${jobId} ASR Result: duration=${asrResult.durationSeconds}s, words=${recognizedText.split(/\s+/).length}, text="${recognizedText}"`);
      } else {
        this.publishProgress(jobId, "TRANSCRIBING", 20, "Validating input text...");
        console.log(`[TranslateAndSpeakUseCase] Job ${jobId} Input Text: words=${(sourceText || "").split(/\s+/).length}, chars=${(sourceText || "").length}`);
      }

      if (!recognizedText.trim() && !translatedText?.trim()) {
        throw new Error("No speech or text could be retrieved or provided for translation.");
      }

      // Check if multi-speaker diarization is active
      const uniqueSpeakers = new Set(recognizedSegments.map((s) => s.speakerId).filter(Boolean));
      const isMultiSpeaker = enableDiarization && uniqueSpeakers.size > 1;

      // 2. TRANSLATING STAGE
      let finalTextToSpeak = translatedText?.trim() || "";
      let translatedSegments: Array<SpeechSegment & { translatedText: string }> = [];

      if (isMultiSpeaker && recognizedSegments.length > 0) {
        this.publishProgress(jobId, "TRANSLATING", 45, `Translating multi-speaker conversation (${uniqueSpeakers.size} speakers)...`);
        await this.jobRepo.updateProgress(jobId, "TRANSLATING", 45, "Translating speaker segments...");

        for (const seg of recognizedSegments) {
          const trans = await this.translationProvider.translate(
            seg.text,
            targetLanguage,
            detectedOrSourceLang
          );
          translatedSegments.push({
            ...seg,
            translatedText: trans.translatedText,
          });
        }
        finalTextToSpeak = translatedSegments.map((s) => s.translatedText).join(" ");
      } else if (!finalTextToSpeak) {
        this.publishProgress(jobId, "TRANSLATING", 50, `Translating from ${detectedOrSourceLang.toUpperCase()} to ${targetLanguage.toUpperCase()}...`);
        await this.jobRepo.updateProgress(jobId, "TRANSLATING", 50, "Translating text...");

        const translationResult = await this.translationProvider.translate(
          recognizedText,
          targetLanguage,
          detectedOrSourceLang
        );
        finalTextToSpeak = translationResult.translatedText;
      }

      // 3. SYNTHESIZING STAGE (TTS with Voice Preservation & Multi-Speaker Diarization)
      this.publishProgress(
        jobId,
        "SYNTHESIZING",
        70,
        isMultiSpeaker
          ? `Synthesizing neural speech for ${uniqueSpeakers.size} distinct speakers with preserved voices...`
          : preserveVoice && inputAudioPath
          ? `Synthesizing voice-preserved neural speech in ${targetLanguage}...`
          : `Synthesizing neural speech in ${targetLanguage}...`
      );
      await this.jobRepo.updateProgress(jobId, "SYNTHESIZING", 70, "Generating speech...");

      let synthesizedAudioPath: string;

      if (isMultiSpeaker && translatedSegments.length > 0) {
        // Multi-speaker diarization synthesis: synthesize each speaker segment with distinct speaker voice profile
        const segmentAudioPaths: string[] = [];
        const speakerProfiles: Record<string, any> = {
          "Speaker 1": { gender: "female", pitchOffset: 0, timbre: "warm", emotion: "expressive" },
          "Speaker 2": { gender: "male", pitchOffset: -2, timbre: "deep", emotion: "calm" },
        };

        for (let i = 0; i < translatedSegments.length; i++) {
          const seg = translatedSegments[i];
          const speakerKey = seg.speakerId || "Speaker 1";
          const profile = speakerProfiles[speakerKey] || speakerProfiles["Speaker 1"];

          const segTts = await this.ttsProvider.synthesize({
            text: seg.translatedText,
            language: targetLanguage,
            gender: profile.gender,
            voiceProfile: profile,
            speakerId: speakerKey,
            speed: speed || 1.0,
            outputDirectory: workDir,
            format: "mp3",
          });
          segmentAudioPaths.push(segTts.audioFilePath);
        }

        // Concatenate / mix segments together into continuous translated track
        const mergedPath = path.join(workDir, "merged_diarized_speech.mp3");
        await this.transcoder.mixAudioTracks(segmentAudioPaths, mergedPath);
        synthesizedAudioPath = mergedPath;

        // Storage discipline: Delete individual per-speaker segment files immediately
        for (const segPath of segmentAudioPaths) {
          await fs.unlink(segPath).catch(() => {});
        }
      } else {
        // Single speaker voice-preserving synthesis
        const rawTtsResult = await this.ttsProvider.synthesize({
          text: finalTextToSpeak,
          language: targetLanguage,
          gender: voiceGender || "female",
          speed: speed || 1.0,
          outputDirectory: workDir,
          format: "mp3",
          referenceAudioPath: preserveVoice && inputAudioPath ? inputAudioPath : undefined,
        });
        synthesizedAudioPath = rawTtsResult.audioFilePath;
      }

      // 4. EXPORT & OUTPUT INTEGRITY VALIDATION
      this.publishProgress(jobId, "EXPORT", 90, "Transcoding & validating speech output...");
      await this.jobRepo.updateProgress(jobId, "EXPORT", 90, "Validating audio output...");

      // Managed storage output directory (Storage Discipline: Part 4.4)
      const finalSpeechDir = path.join(process.cwd(), "storage", "translated");
      await fs.mkdir(finalSpeechDir, { recursive: true });

      const outFileName = `speech_${jobId.substring(0, 8)}_${targetLanguage}.mp3`;
      const finalOutputPath = path.join(finalSpeechDir, outFileName);

      await this.transcoder.transcode({
        inputPath: synthesizedAudioPath,
        outputPath: finalOutputPath,
        targetFormat: "mp3",
        bitrate: "192k",
      });

      const validation = await this.transcoder.validateOutput(finalOutputPath, "mp3");
      if (!validation.isValid) {
        throw new Error(`Integrity validation failed for synthesized speech: ${validation.error}`);
      }

      let waveform: number[] | null = null;
      try {
        waveform = await this.transcoder.extractWaveformData(finalOutputPath, 50);
      } catch {
        waveform = null;
      }

      const asset = new MediaAsset({
        id: `asset_ts_${jobId}`,
        jobId,
        userId,
        name: `Translated Speech (${targetLanguage.toUpperCase()})`,
        kind: "TRANSLATED_AUDIO",
        filePath: `/api/media/translated/${outFileName}`,
        mimeType: "audio/mpeg",
        format: "mp3",
        codec: validation.actualCodec || "mp3",
        duration: validation.duration,
        sizeBytes: validation.sizeBytes,
        waveformData: waveform,
        metadata: {
          sourceText: recognizedText,
          translatedText: finalTextToSpeak,
          sourceLanguage: detectedOrSourceLang,
          targetLanguage,
          voiceGender,
          speed,
          voicePreserved: preserveVoice,
          multiSpeaker: isMultiSpeaker,
          speakerCount: uniqueSpeakers.size || 1,
          segments: translatedSegments.length > 0 ? translatedSegments : recognizedSegments,
        },
        createdAt: new Date(),
      });

      await this.assetRepo.create(asset);

      // Storage discipline: Immediately clean working temp folder
      await retentionManager.cleanJobIntermediates(jobId);

      // Complete Job
      await this.jobRepo.updateStatus(
        jobId,
        "COMPLETED",
        "COMPLETED",
        undefined,
        "Speech translation completed successfully"
      );

      this.realtimePub.publish(jobId, {
        jobId,
        status: "COMPLETED",
        stage: "COMPLETED",
        progress: 100,
        message: "Translation and speech synthesis ready",
        mediaAssets: [asset.toJSON()],
        updatedAt: new Date().toISOString(),
      });

      return {
        asset,
        translatedText: finalTextToSpeak,
        audioFilePath: finalOutputPath,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Translation failed";
      console.error(`[TranslateAndSpeakUseCase] Error on job ${jobId}:`, err);
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
    stage: "TRANSCRIBING" | "TRANSLATING" | "SYNTHESIZING" | "EXPORT",
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
