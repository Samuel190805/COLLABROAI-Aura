import { Job } from "../entities/Job";
import { JobStage, JobStatusType } from "../value-objects/JobStatus";

export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  findByUserId(userId: string, limit?: number): Promise<Job[]>;
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
    message?: string
  ): Promise<void>;
  getQueueMetrics(): Promise<{
    pendingJobs: number;
    activeJobs: number;
    completedJobs24h: number;
    failedJobs24h: number;
  }>;
}
