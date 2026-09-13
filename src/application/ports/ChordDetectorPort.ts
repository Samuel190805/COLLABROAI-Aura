import { ChordAnalysisResult } from "@/domain/value-objects/ChordData";

export interface ChordDetectorPort {
  detectChords(instrumentAudioPath: string, rawMixAudioPath?: string): Promise<ChordAnalysisResult>;
}
