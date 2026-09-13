import { MediaFormat } from "@/domain/value-objects/MediaFormats";

export interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  targetFormat: MediaFormat;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  videoResolution?: string;
  normalizeLoudness?: boolean; // EBU R128 LUFS -14 normalization
  denoise?: boolean; // Spectral noise-reduction filter
  pitchShiftSemitones?: number; // +/- semitones
  tempoStretchRatio?: number; // 0.8 - 1.2x time stretch
  metadataTags?: Record<string, string>; // ID3 metadata tags (title, artist, album, etc.)
  customAudioFilters?: string[]; // Custom FFmpeg audio filter expressions
}

export interface AudioProbeResult {
  hasAudioStream: boolean;
  duration: number;
  codec?: string;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
}

export interface ValidationResult {
  isValid: boolean;
  actualContainer?: string;
  actualCodec?: string;
  duration?: number;
  bitrate?: number;
  sizeBytes?: number;
  error?: string;
}

export interface AudioAnalysisResult {
  key: string;
  camelot: string;
  bpm: number;
  confidence: number;
  durationSeconds: number;
}

export interface AudioToVideoOptions {
  audioPath: string;
  outputPath: string;
  targetFormat: "mp4" | "webm";
  resolution?: string;
  visualType?: "waveform" | "spectrum";
}

export interface TranscoderPort {
  transcode(options: TranscodeOptions): Promise<string>;
  renderAudioToVideo(options: AudioToVideoOptions): Promise<string>;
  validateOutput(
    filePath: string,
    expectedFormat: MediaFormat
  ): Promise<ValidationResult>;
  probeAudio(filePath: string): Promise<AudioProbeResult>;
  extractWaveformData(filePath: string, samples?: number): Promise<number[]>;
  extractAudioFromVideo(videoPath: string, outputAudioPath: string, targetFormat?: MediaFormat): Promise<string>;
  mixAudioTracks(
    inputPaths: string[],
    outputPath: string,
    volumes?: number[]
  ): Promise<string>;
  denoiseAudio(inputPath: string, outputPath: string): Promise<string>;
  analyzeAudioKeyAndBpm(filePath: string): Promise<AudioAnalysisResult>;
  detectKeyAndBpm(filePath: string): Promise<AudioAnalysisResult>;
  pitchShift(inputPath: string, outputPath: string, semitones: number): Promise<string>;
  timeStretch(inputPath: string, outputPath: string, ratio: number): Promise<string>;
  acousticFingerprint(
    filePath: string,
    fallbackTitle?: string
  ): Promise<{ title: string; artist: string; album?: string; confidence: number }>;
}
