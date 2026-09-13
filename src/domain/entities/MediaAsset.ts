export type MediaAssetKind =
  | "ORIGINAL"
  | "STEM_VOCALS"
  | "STEM_INSTRUMENT"
  | "DOWNLOAD_AUDIO"
  | "DOWNLOAD_VIDEO"
  | "TRANSLATED_AUDIO"
  | "MASHUP"
  | "CONVERTED_MEDIA";

export interface MediaAssetProps {
  id: string;
  jobId?: string | null;
  userId?: string | null;
  name: string;
  kind: MediaAssetKind;
  filePath: string;
  mimeType: string;
  format: string;
  codec?: string | null;
  duration?: number | null;
  sizeBytes?: number | null;
  waveformData?: number[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export class MediaAsset {
  constructor(public readonly props: MediaAssetProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get kind(): MediaAssetKind {
    return this.props.kind;
  }

  get filePath(): string {
    return this.props.filePath;
  }

  get format(): string {
    return this.props.format;
  }

  get duration(): number | null | undefined {
    return this.props.duration;
  }

  get sizeBytes(): number | null | undefined {
    return this.props.sizeBytes;
  }

  get waveformData(): number[] | null | undefined {
    return this.props.waveformData;
  }

  get metadata(): Record<string, unknown> | null | undefined {
    return this.props.metadata;
  }

  toJSON() {
    return {
      id: this.props.id,
      jobId: this.props.jobId,
      userId: this.props.userId,
      name: this.props.name,
      kind: this.props.kind,
      filePath: this.props.filePath,
      mimeType: this.props.mimeType,
      format: this.props.format,
      codec: this.props.codec,
      duration: this.props.duration,
      sizeBytes: this.props.sizeBytes,
      waveformData: this.props.waveformData,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
    };
  }
}
