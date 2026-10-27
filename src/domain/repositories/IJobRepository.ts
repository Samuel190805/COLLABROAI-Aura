import { Job } from "../entities/Job";
import { JobKind, JobStage, JobStatusType, QueueLane } from "../value-objects/JobStatus";

export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  findByUserId(userId: string, limit?: number): Promise<Job[]>;
  findActiveByUserId(userId?: string | null): Promise<Job[]>;
  findRecentByUserId(userId?: string | null, limit?: number): Promise<Job[]>;
  findLatestByType(type: JobKind, userId?: string | null): Promise<Job | null>;
  create(job: Job): Promise<Job>;
  update(job: Job): Promise<Job>;
  updateProgress(
    id: string,
    stage: JobStage,
    progress: number,
    message?: string
  ): Promise<void>;
  updateStatus(
    id: string,
    status: JobStatusType,
    stage: JobStage,
    error?: string,
    message?: string,
    result?: Record<string, unknown>,
    errorCode?: string,
    errorDetails?: Record<string, unknown>
  ): Promise<void>;
  claimNextJob(lane: QueueLane, workerId: string): Promise<Job | null>;
  updateHeartbeat(id: string): Promise<void>;
  requestCancel(id: string): Promise<boolean>;
  isCancelRequested(id: string): Promise<boolean>;
  markSeen(id: string): Promise<void>;
  saveResult(id: string, result: Record<string, unknown>): Promise<void>;
  recoverStaleJobs(staleSeconds?: number): Promise<{ recoveredCount: number; failedCount: number }>;
  countActiveJobsForUser(userId?: string | null): Promise<number>;
  getQueueMetrics(): Promise<{
    pendingJobs: number;
    activeJobs: number;
    completedJobs24h: number;
    failedJobs24h: number;
    queueDepthPerLane: Record<QueueLane, number>;
  }>;
}
