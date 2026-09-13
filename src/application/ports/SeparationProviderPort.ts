export interface SeparationOptions {
  denoise?: boolean;
  skipPostProcessing?: boolean;
}

export interface SeparationResult {
  vocalsPath: string;
  instrumentPath: string;
  stems: {
    STEM_VOCALS: string;
    STEM_INSTRUMENT: string;
  };
  confidenceScores: {
    vocals: number;
    instrument: number;
  };
  modelUsed: string;
  engine: "demucs" | "dsp-fallback";
  durationSeconds?: number;
}

export type SeparationProgressCallback = (
  stage: "ANALYSIS" | "MODEL_INFERENCE" | "STEM_RECONSTRUCTION" | "EXPORT",
  progressPercent: number,
  message?: string
) => void;

export interface SeparationProviderPort {
  separate(
    audioFilePath: string,
    outputDirectory: string,
    onProgress?: SeparationProgressCallback,
    options?: SeparationOptions
  ): Promise<SeparationResult>;
  isServiceAvailable(): Promise<boolean>;
}
