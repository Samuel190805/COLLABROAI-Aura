import { exec } from "child_process";
import { promisify } from "util";
import { QueuePort, JobHandler, JobTaskHandler } from "@/application/ports/QueuePort";
import { Job } from "@/domain/entities/Job";
import { JobKind, QueueLane, getLaneForJobType } from "@/domain/value-objects/JobStatus";
import { PrismaJobRepository } from "@/infrastructure/persistence/prisma/PrismaJobRepository";
import { realtimeBus } from "@/infrastructure/realtime/realtime-bus";
import { retentionManager } from "@/infrastructure/storage/retention-manager";

const execAsync = promisify(exec);

export class SqliteJobQueue implements QueuePort {
  private workerId: string;
  private jobRepo: PrismaJobRepository;
  private handlers = new Map<JobKind, JobHandler>();
  private inlineTasks = new Map<string, JobTaskHandler>();
  private activeJobsByLane = new Map<QueueLane, Set<string>>();
  private childProcesses = new Map<string, Set<number>>();
  private cancelledJobIds = new Set<string>();

  private workerTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isProcessingTick = false;
  private isStarted = false;

  private laneConcurrency: Record<QueueLane, number> = {
    "heavy-ml": parseInt(process.env.LANE_HEAVY_ML_CONCURRENCY || "1", 10),
    io: parseInt(process.env.LANE_IO_CONCURRENCY || "3", 10),
    media: parseInt(process.env.LANE_MEDIA_CONCURRENCY || "2", 10),
    speech: parseInt(process.env.LANE_SPEECH_CONCURRENCY || "2", 10),
  };

  constructor(jobRepo?: PrismaJobRepository) {
    this.workerId = `worker_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;
    this.jobRepo = jobRepo || new PrismaJobRepository();

    this.activeJobsByLane.set("heavy-ml", new Set<string>());
    this.activeJobsByLane.set("io", new Set<string>());
    this.activeJobsByLane.set("media", new Set<string>());
    this.activeJobsByLane.set("speech", new Set<string>());
  }

  public registerHandler(type: JobKind, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  public registerChildProcess(jobId: string, pid: number): void {
    if (!this.childProcesses.has(jobId)) {
      this.childProcesses.set(jobId, new Set<number>());
    }
    this.childProcesses.get(jobId)!.add(pid);
  }

  public unregisterChildProcess(jobId: string, pid: number): void {
    const pids = this.childProcesses.get(jobId);
    if (pids) {
      pids.delete(pid);
      if (pids.size === 0) {
        this.childProcesses.delete(jobId);
      }
    }
  }

  public isJobCancelled(jobId: string): boolean {
    return this.cancelledJobIds.has(jobId);
  }

  public async enqueue(
    jobId: string,
    laneOrTask?: QueueLane | JobTaskHandler,
    inlineTask?: JobTaskHandler
  ): Promise<void> {
    const actualTask = typeof laneOrTask === "function" ? laneOrTask : inlineTask;
    if (actualTask) {
      this.inlineTasks.set(jobId, actualTask);
    }
    // Wake up worker loop immediately on enqueue
    setImmediate(() => {
      this.tick().catch((err) =>
        console.error("[SqliteJobQueue] Error during immediate tick:", err)
      );
    });
  }

  public async cancel(jobId: string): Promise<boolean> {
    console.log(`[SqliteJobQueue] Cancelling job ${jobId}...`);
    this.cancelledJobIds.add(jobId);
    await this.jobRepo.requestCancel(jobId);

    // 1. Kill any registered child process tree
    const pids = this.childProcesses.get(jobId);
    if (pids && pids.size > 0) {
      for (const pid of Array.from(pids)) {
        await this.killProcessTree(pid);
      }
      this.childProcesses.delete(jobId);
    }

    // 2. Remove inline task
    this.inlineTasks.delete(jobId);

    // 3. Mark CANCELLED in DB
    await this.jobRepo.updateStatus(
      jobId,
      "CANCELLED",
      "FAILED",
      "Job was cancelled by user request",
      "Job cancelled by user request",
      undefined,
      "CANCELLED"
    );

    // 4. Remove from active lanes
    for (const laneSet of this.activeJobsByLane.values()) {
      laneSet.delete(jobId);
    }

    // 5. Clean working dir intermediates
    await retentionManager.cleanJobIntermediates(jobId);

    // 6. Broadcast event
    realtimeBus.publish(jobId, {
      jobId,
      status: "CANCELLED",
      stage: "FAILED",
      progress: 0,
      message: "Job was cancelled by user request",
      error: "Job cancelled by user request",
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  private async killProcessTree(pid: number): Promise<void> {
    try {
      if (process.platform === "win32") {
        await execAsync(`taskkill /pid ${pid} /T /F`).catch(() => {});
      } else {
        process.kill(-pid, "SIGKILL");
      }
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Process might already be dead
      }
    }
  }

  public startWorker(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    // Run startup recovery for zombie jobs left in PROCESSING
    this.jobRepo.recoverStaleJobs(60).catch((err) => {
      console.error("[SqliteJobQueue] Startup recovery error:", err);
    });

    // Start worker loop polling every 800ms
    this.workerTimer = setInterval(() => {
      this.tick().catch((err) =>
        console.error("[SqliteJobQueue] Worker loop error:", err)
      );
    }, 800);
    if (this.workerTimer.unref) {
      this.workerTimer.unref();
    }

    // Heartbeat every 5 seconds for active jobs
    this.heartbeatTimer = setInterval(() => {
      this.updateHeartbeats().catch((err) =>
        console.error("[SqliteJobQueue] Heartbeat error:", err)
      );
    }, 5000);
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }

    console.log(`[SqliteJobQueue] Worker started (${this.workerId}). Lanes:`, this.laneConcurrency);
  }

  public stopWorker(): void {
    this.isStarted = false;
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async updateHeartbeats(): Promise<void> {
    const activeIds: string[] = [];
    for (const laneSet of this.activeJobsByLane.values()) {
      for (const id of laneSet) {
        activeIds.push(id);
      }
    }

    for (const id of activeIds) {
      await this.jobRepo.updateHeartbeat(id);
    }
  }

  private async tick(): Promise<void> {
    if (this.isProcessingTick) return;
    this.isProcessingTick = true;

    try {
      const lanes: QueueLane[] = ["heavy-ml", "io", "media", "speech"];

      for (const lane of lanes) {
        const activeSet = this.activeJobsByLane.get(lane)!;
        const maxLimit = this.laneConcurrency[lane];

        while (activeSet.size < maxLimit) {
          const claimedJob = await this.jobRepo.claimNextJob(lane, this.workerId);
          if (!claimedJob) {
            break; // No more pending jobs for this lane
          }

          // Mark job as active in this lane
          activeSet.add(claimedJob.id);

          // Dispatch job execution asynchronously
          this.executeJob(claimedJob, lane).catch((err) => {
            console.error(`[SqliteJobQueue] Unhandled job execution error for ${claimedJob.id}:`, err);
          });
        }
      }
    } finally {
      this.isProcessingTick = false;
    }
  }

  private async executeJob(job: Job, lane: QueueLane): Promise<void> {
    const jobId = job.id;
    const activeSet = this.activeJobsByLane.get(lane)!;

    console.log(`[SqliteJobQueue] [${lane.toUpperCase()}] Starting job ${jobId} (${job.type})...`);

    try {
      // Check if job was already cancelled before we even began
      if (this.isJobCancelled(jobId) || (await this.jobRepo.isCancelRequested(jobId))) {
        await this.cancel(jobId);
        return;
      }

      // Check for inline task first
      const inline = this.inlineTasks.get(jobId);
      if (inline) {
        this.inlineTasks.delete(jobId);
        await inline();
      } else {
        // Dispatch to registered handler
        const handler = this.handlers.get(job.type);
        if (!handler) {
          throw new Error(`No registered handler found for job type: ${job.type}`);
        }
        await handler(job);
      }

      // Final check: if job succeeded, make sure status is COMPLETED
      const finalJob = await this.jobRepo.findById(jobId);
      if (finalJob && finalJob.status === "PROCESSING") {
        await this.jobRepo.updateStatus(
          jobId,
          "COMPLETED",
          "COMPLETED",
          undefined,
          "Job completed successfully"
        );
        realtimeBus.publish(jobId, {
          jobId,
          status: "COMPLETED",
          stage: "COMPLETED",
          progress: 100,
          message: "Job completed successfully",
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      if (this.isJobCancelled(jobId)) {
        console.log(`[SqliteJobQueue] Job ${jobId} was cancelled during execution.`);
        return;
      }

      const errorMsg = err instanceof Error ? err.message : "Job execution failed";
      console.error(`[SqliteJobQueue] Job ${jobId} failed:`, err);

      await this.jobRepo.updateStatus(
        jobId,
        "FAILED",
        "FAILED",
        errorMsg,
        errorMsg,
        undefined,
        "PROCESSING_FAILED"
      );

      realtimeBus.publish(jobId, {
        jobId,
        status: "FAILED",
        stage: "FAILED",
        progress: 0,
        error: errorMsg,
        message: errorMsg,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      activeSet.delete(jobId);
      this.inlineTasks.delete(jobId);
      this.childProcesses.delete(jobId);
      this.cancelledJobIds.delete(jobId);

      // Clean temp intermediates
      await retentionManager.cleanJobIntermediates(jobId);

      // Trigger another tick to pick up queued jobs
      setImmediate(() => {
        this.tick().catch(() => {});
      });
    }
  }
}

// Global singleton instance guarded for Next.js HMR
const globalForQueue = globalThis as unknown as { jobQueue: SqliteJobQueue | undefined };

export const jobQueue = globalForQueue.jobQueue ?? new SqliteJobQueue();
if (process.env.NODE_ENV !== "production") {
  globalForQueue.jobQueue = jobQueue;
}

export default jobQueue;
