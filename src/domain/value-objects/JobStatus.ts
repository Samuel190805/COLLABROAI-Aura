export type JobStatusType =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type JobKind =
  | "STEM_SEPARATION"
  | "MEDIA_DOWNLOAD"
  | "TRANSLATE_SPEAK"
  | "CHORD_DETECTION"
  | "MASHUP_RENDER"
  | "MEDIA_CONVERSION";

export type QueueLane = "heavy-ml" | "io" | "media" | "speech";

export function getLaneForJobType(type: JobKind): QueueLane {
  switch (type) {
    case "STEM_SEPARATION":
    case "CHORD_DETECTION":
    case "MASHUP_RENDER":
      return "heavy-ml";
    case "MEDIA_DOWNLOAD":
      return "io";
    case "TRANSLATE_SPEAK":
      return "speech";
    case "MEDIA_CONVERSION":
    default:
      return "media";
  }
}

export type StemSeparationStage =
  | "ANALYSIS"
  | "MODEL_INFERENCE"
  | "REFINEMENT"
  | "STEM_RECONSTRUCTION"
  | "EXPORT";

export type MediaDownloadStage =
  | "RESOLVING"
  | "DOWNLOADING"
  | "TRANSCODING"
  | "EXPORT";

export type TranslateSpeakStage =
  | "TRANSCRIBING"
  | "TRANSLATING"
  | "SYNTHESIZING"
  | "EXPORT";

export type MediaConversionStage =
  | "RESOLVING"
  | "TRANSCODING"
  | "EXPORT";

export type JobStage =
  | StemSeparationStage
  | MediaDownloadStage
  | TranslateSpeakStage
  | MediaConversionStage
  | "COMPLETED"
  | "FAILED";
