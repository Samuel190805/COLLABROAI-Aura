import { JobKind, JobStage, JobStatusType, QueueLane, getLaneForJobType } from "../value-objects/JobStatus";
import { MediaAsset } from "./MediaAsset";

export interface JobProps {
  id: string;
  userId?: string | null;
  type: JobKind;
  status: JobStatusType;
  stage: JobStage;
  progress: number;
  message?: string | null;
  inputParams: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  errorCode?: string | null;
  errorDetails?: Record<string, unknown> | null;
  attempts?: number;
  lockedBy?: string | null;
  lockedAt?: Date | null;
  heartbeatAt?: Date | null;
  cancelRequested?: boolean;
  lane?: QueueLane;
  seenByUser?: boolean;
  createdAt: Date;
  startedAt?: Date | null;
  updatedAt: Date;
  completedAt?: Date | null;
  mediaAssets?: MediaAsset[];
}

export class Job {
  constructor(public props: JobProps) {
    if (!this.props.lane) {
      this.props.lane = getLaneForJobType(this.props.type);
    }
    if (this.props.attempts === undefined) {
      this.props.attempts = 0;
    }
    if (this.props.cancelRequested === undefined) {
      this.props.cancelRequested = false;
    }
    if (this.props.seenByUser === undefined) {
      this.props.seenByUser = false;
    }
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string | null | undefined {
    return this.props.userId;
  }

  get type(): JobKind {
    return this.props.type;
  }

  get status(): JobStatusType {
    return this.props.status;
  }

  get stage(): JobStage {
    return this.props.stage;
  }

  get progress(): number {
    return this.props.progress;
  }

  get message(): string | null | undefined {
    return this.props.message;
  }

  get inputParams(): Record<string, unknown> {
    return this.props.inputParams;
  }

  get result(): Record<string, unknown> | null | undefined {
    return this.props.result;
  }

  get error(): string | null | undefined {
    return this.props.error;
  }

  get errorCode(): string | null | undefined {
    return this.props.errorCode;
  }

  get errorDetails(): Record<string, unknown> | null | undefined {
    return this.props.errorDetails;
  }

  get attempts(): number {
    return this.props.attempts ?? 0;
  }

  get lockedBy(): string | null | undefined {
    return this.props.lockedBy;
  }

  get lockedAt(): Date | null | undefined {
    return this.props.lockedAt;
  }

  get heartbeatAt(): Date | null | undefined {
    return this.props.heartbeatAt;
  }

  get cancelRequested(): boolean {
    return !!this.props.cancelRequested;
  }

  get lane(): QueueLane {
    return this.props.lane || getLaneForJobType(this.props.type);
  }

  get seenByUser(): boolean {
    return !!this.props.seenByUser;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get startedAt(): Date | null | undefined {
    return this.props.startedAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get completedAt(): Date | null | undefined {
    return this.props.completedAt;
  }

  get mediaAssets(): MediaAsset[] {
    return this.props.mediaAssets || [];
  }

  updateProgress(stage: JobStage, progress: number, message?: string) {
    this.props.stage = stage;
    this.props.progress = Math.min(100, Math.max(0, progress));
    this.props.status = "PROCESSING";
    if (message !== undefined) {
      this.props.message = message;
    }
    this.props.updatedAt = new Date();
  }

  complete(message = "Job completed successfully", result?: Record<string, unknown>) {
    this.props.status = "COMPLETED";
    this.props.stage = "COMPLETED";
    this.props.progress = 100;
    this.props.message = message;
    if (result !== undefined) {
      this.props.result = result;
    }
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  fail(errorMessage: string, errorCode?: string, errorDetails?: Record<string, unknown>) {
    this.props.status = "FAILED";
    this.props.stage = "FAILED";
    this.props.error = errorMessage;
    this.props.errorCode = errorCode || "PROCESSING_FAILED";
    this.props.errorDetails = errorDetails || null;
    this.props.message = errorMessage;
    this.props.updatedAt = new Date();
  }

  cancel(message = "Job cancelled by user request") {
    this.props.status = "CANCELLED";
    this.props.cancelRequested = true;
    this.props.message = message;
    this.props.errorCode = "CANCELLED";
    this.props.updatedAt = new Date();
  }

  markSeen() {
    this.props.seenByUser = true;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      type: this.props.type,
      status: this.props.status,
      stage: this.props.stage,
      progress: this.props.progress,
      message: this.props.message,
      inputParams: this.props.inputParams,
      result: this.props.result,
      error: this.props.error,
      errorCode: this.props.errorCode,
      errorDetails: this.props.errorDetails,
      attempts: this.props.attempts,
      lockedBy: this.props.lockedBy,
      lockedAt: this.props.lockedAt,
      heartbeatAt: this.props.heartbeatAt,
      cancelRequested: this.props.cancelRequested,
      lane: this.props.lane,
      seenByUser: this.props.seenByUser,
      createdAt: this.props.createdAt,
      startedAt: this.props.startedAt,
      updatedAt: this.props.updatedAt,
      completedAt: this.props.completedAt,
      mediaAssets: this.props.mediaAssets?.map((a) => a.toJSON()) || [],
    };
  }
}
