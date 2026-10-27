import { Job } from "@/domain/entities/Job";
import { JobKind, QueueLane } from "@/domain/value-objects/JobStatus";

export type JobTaskHandler = () => Promise<void>;
export type JobHandler = (job: Job) => Promise<void>;

export interface QueuePort {
  enqueue(
    jobId: string,
    laneOrTask?: QueueLane | JobTaskHandler,
    inlineTask?: JobTaskHandler
  ): Promise<void>;
  cancel(jobId: string): Promise<boolean>;
  registerHandler(type: JobKind, handler: JobHandler): void;
  startWorker(): void;
  stopWorker(): void;
  isJobCancelled(jobId: string): boolean;
  registerChildProcess(jobId: string, pid: number): void;
  unregisterChildProcess(jobId: string, pid: number): void;
}
