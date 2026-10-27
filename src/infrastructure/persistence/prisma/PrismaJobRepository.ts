import { prisma } from "@/lib/db";
import { IJobRepository } from "@/domain/repositories/IJobRepository";
import { Job } from "@/domain/entities/Job";
import { MediaAsset } from "@/domain/entities/MediaAsset";
import { JobKind, JobStage, JobStatusType, QueueLane, getLaneForJobType } from "@/domain/value-objects/JobStatus";

export class PrismaJobRepository implements IJobRepository {
  private mapToEntity(raw: any): Job {
    let inputParams = {};
    try {
      inputParams = JSON.parse(raw.inputParams || "{}");
    } catch {
      inputParams = {};
    }

    let result: Record<string, unknown> | null = null;
    if (raw.result) {
      try {
        result = JSON.parse(raw.result);
      } catch {
        result = null;
      }
    }

    let errorDetails: Record<string, unknown> | null = null;
    if (raw.errorDetails) {
      try {
        errorDetails = JSON.parse(raw.errorDetails);
      } catch {
        errorDetails = null;
      }
    }

    const assets = (raw.mediaAssets || []).map(
      (a: any) =>
        new MediaAsset({
          id: a.id,
          jobId: a.jobId,
          userId: a.userId,
          name: a.name,
          kind: a.kind as any,
          filePath: a.filePath,
          mimeType: a.mimeType,
          format: a.format,
          codec: a.codec,
          duration: a.duration,
          sizeBytes: a.sizeBytes,
          waveformData: a.waveformData ? JSON.parse(a.waveformData) : null,
          metadata: a.metadata ? JSON.parse(a.metadata) : null,
          createdAt: a.createdAt,
        })
    );

    return new Job({
      id: raw.id,
      userId: raw.userId,
      type: raw.type as JobKind,
      status: raw.status as JobStatusType,
      stage: raw.stage as JobStage,
      progress: raw.progress,
      message: raw.message,
      inputParams,
      result,
      error: raw.error,
      errorCode: raw.errorCode,
      errorDetails,
      attempts: raw.attempts ?? 0,
      lockedBy: raw.lockedBy,
      lockedAt: raw.lockedAt,
      heartbeatAt: raw.heartbeatAt,
      cancelRequested: raw.cancelRequested ?? false,
      lane: (raw.lane as QueueLane) || getLaneForJobType(raw.type as JobKind),
      seenByUser: raw.seenByUser ?? false,
      createdAt: raw.createdAt,
      startedAt: raw.startedAt,
      updatedAt: raw.updatedAt,
      completedAt: raw.completedAt,
      mediaAssets: assets,
    });
  }

  async findById(id: string): Promise<Job | null> {
    const raw = await prisma.job.findUnique({
      where: { id },
      include: { mediaAssets: true },
    });
    if (!raw) return null;
    return this.mapToEntity(raw);
  }

  async findByUserId(userId: string, limit = 20): Promise<Job[]> {
    const records = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { mediaAssets: true },
    });
    return records.map((r: any) => this.mapToEntity(r));
  }

  async findActiveByUserId(userId?: string | null): Promise<Job[]> {
    const where: any = {
      status: { in: ["PENDING", "PROCESSING"] },
    };
    if (userId) {
      where.userId = userId;
    }
    const records = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { mediaAssets: true },
    });
    return records.map((r: any) => this.mapToEntity(r));
  }

  async findRecentByUserId(userId?: string | null, limit = 20): Promise<Job[]> {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    const records = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { mediaAssets: true },
    });
    return records.map((r: any) => this.mapToEntity(r));
  }

  async findLatestByType(type: JobKind, userId?: string | null): Promise<Job | null> {
    const where: any = { type };
    if (userId) {
      where.userId = userId;
    }
    const record = await prisma.job.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      include: { mediaAssets: true },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async create(job: Job): Promise<Job> {
    const raw = await prisma.job.create({
      data: {
        id: job.id,
        userId: job.props.userId,
        type: job.type,
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        message: job.message,
        inputParams: JSON.stringify(job.inputParams || {}),
        result: job.result ? JSON.stringify(job.result) : null,
        error: job.error,
        errorCode: job.errorCode,
        errorDetails: job.errorDetails ? JSON.stringify(job.errorDetails) : null,
        attempts: job.attempts,
        lockedBy: job.lockedBy,
        lockedAt: job.lockedAt,
        heartbeatAt: job.heartbeatAt,
        cancelRequested: job.cancelRequested,
        lane: job.lane,
        seenByUser: job.seenByUser,
        createdAt: job.props.createdAt,
        startedAt: job.startedAt,
        updatedAt: job.props.updatedAt,
      },
      include: { mediaAssets: true },
    });
    return this.mapToEntity(raw);
  }

  async update(job: Job): Promise<Job> {
    const raw = await prisma.job.update({
      where: { id: job.id },
      data: {
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        message: job.message,
        result: job.result ? JSON.stringify(job.result) : undefined,
        error: job.error,
        errorCode: job.errorCode,
        errorDetails: job.errorDetails ? JSON.stringify(job.errorDetails) : undefined,
        attempts: job.attempts,
        lockedBy: job.lockedBy,
        lockedAt: job.lockedAt,
        heartbeatAt: job.heartbeatAt,
        cancelRequested: job.cancelRequested,
        seenByUser: job.seenByUser,
        completedAt: job.props.completedAt,
        updatedAt: new Date(),
      },
      include: { mediaAssets: true },
    });
    return this.mapToEntity(raw);
  }

  async updateProgress(
    id: string,
    stage: JobStage,
    progress: number,
    message?: string
  ): Promise<void> {
    try {
      await prisma.job.update({
        where: { id },
        data: {
          stage,
          progress: Math.min(100, Math.max(0, progress)),
          status: "PROCESSING",
          message: message ?? undefined,
          heartbeatAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      if (err?.code === "P2025") {
        console.warn(`[PrismaJobRepository] Job ${id} not found during updateProgress; skipping.`);
        return;
      }
      throw err;
    }
  }

  async updateStatus(
    id: string,
    status: JobStatusType,
    stage: JobStage,
    error?: string,
    message?: string,
    result?: Record<string, unknown>,
    errorCode?: string,
    errorDetails?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.job.update({
        where: { id },
        data: {
          status,
          stage,
          error: error ?? null,
          errorCode: errorCode ?? (status === "FAILED" ? "PROCESSING_FAILED" : null),
          errorDetails: errorDetails ? JSON.stringify(errorDetails) : undefined,
          message: message ?? undefined,
          result: result ? JSON.stringify(result) : undefined,
          completedAt: status === "COMPLETED" || status === "FAILED" || status === "CANCELLED" ? new Date() : undefined,
          progress: status === "COMPLETED" ? 100 : undefined,
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      if (err?.code === "P2025") {
        console.warn(`[PrismaJobRepository] Job ${id} not found during updateStatus; skipping.`);
        return;
      }
      throw err;
    }
  }

  async claimNextJob(lane: QueueLane, workerId: string): Promise<Job | null> {
    const now = new Date();
    return await prisma.$transaction(async (tx) => {
      const candidate = await tx.job.findFirst({
        where: {
          lane,
          status: "PENDING",
        },
        orderBy: { createdAt: "asc" },
      });

      if (!candidate) return null;

      const updated = await tx.job.update({
        where: { id: candidate.id },
        data: {
          status: "PROCESSING",
          lockedBy: workerId,
          lockedAt: now,
          heartbeatAt: now,
          startedAt: candidate.startedAt ?? now,
          attempts: { increment: 1 },
          updatedAt: now,
        },
        include: { mediaAssets: true },
      });

      return this.mapToEntity(updated);
    });
  }

  async updateHeartbeat(id: string): Promise<void> {
    try {
      await prisma.job.update({
        where: { id },
        data: {
          heartbeatAt: new Date(),
        },
      });
    } catch {
      // transient
    }
  }

  async requestCancel(id: string): Promise<boolean> {
    try {
      await prisma.job.update({
        where: { id },
        data: {
          cancelRequested: true,
          updatedAt: new Date(),
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async isCancelRequested(id: string): Promise<boolean> {
    const job = await prisma.job.findUnique({
      where: { id },
      select: { cancelRequested: true },
    });
    return !!job?.cancelRequested;
  }

  async markSeen(id: string): Promise<void> {
    try {
      await prisma.job.update({
        where: { id },
        data: {
          seenByUser: true,
          updatedAt: new Date(),
        },
      });
    } catch {
      // transient
    }
  }

  async saveResult(id: string, result: Record<string, unknown>): Promise<void> {
    try {
      await prisma.job.update({
        where: { id },
        data: {
          result: JSON.stringify(result),
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error(`[PrismaJobRepository] Failed to save result for ${id}:`, err);
    }
  }

  async recoverStaleJobs(staleSeconds = 60): Promise<{ recoveredCount: number; failedCount: number }> {
    const cutoff = new Date(Date.now() - staleSeconds * 1000);
    const staleJobs = await prisma.job.findMany({
      where: {
        status: "PROCESSING",
        OR: [
          { heartbeatAt: { lt: cutoff } },
          { heartbeatAt: null, lockedAt: { lt: cutoff } },
        ],
      },
    });

    let recoveredCount = 0;
    let failedCount = 0;

    for (const job of staleJobs) {
      if (job.attempts < 2) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: "PENDING",
            lockedBy: null,
            lockedAt: null,
            heartbeatAt: null,
            message: "Re-queued after server restart or timeout",
            updatedAt: new Date(),
          },
        });
        recoveredCount++;
      } else {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            stage: "FAILED",
            errorCode: "PROCESSING_FAILED",
            error: "Job timed out or worker process terminated unexpectedly",
            message: "Job failed: process died unexpectedly or timed out",
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        failedCount++;
      }
    }

    if (recoveredCount > 0 || failedCount > 0) {
      console.log(
        `[PrismaJobRepository] Startup recovery: re-queued ${recoveredCount} jobs, marked ${failedCount} jobs FAILED.`
      );
    }

    return { recoveredCount, failedCount };
  }

  async countActiveJobsForUser(userId?: string | null): Promise<number> {
    const where: any = {
      status: { in: ["PENDING", "PROCESSING"] },
    };
    if (userId) {
      where.userId = userId;
    }
    return await prisma.job.count({ where });
  }

  async getQueueMetrics(): Promise<{
    pendingJobs: number;
    activeJobs: number;
    completedJobs24h: number;
    failedJobs24h: number;
    queueDepthPerLane: Record<QueueLane, number>;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [pending, active, completed, failed, heavyMlDepth, ioDepth, mediaDepth, speechDepth] =
      await Promise.all([
        prisma.job.count({ where: { status: "PENDING" } }),
        prisma.job.count({ where: { status: "PROCESSING" } }),
        prisma.job.count({ where: { status: "COMPLETED", updatedAt: { gte: oneDayAgo } } }),
        prisma.job.count({ where: { status: "FAILED", updatedAt: { gte: oneDayAgo } } }),
        prisma.job.count({ where: { status: "PENDING", lane: "heavy-ml" } }),
        prisma.job.count({ where: { status: "PENDING", lane: "io" } }),
        prisma.job.count({ where: { status: "PENDING", lane: "media" } }),
        prisma.job.count({ where: { status: "PENDING", lane: "speech" } }),
      ]);

    return {
      pendingJobs: pending,
      activeJobs: active,
      completedJobs24h: completed,
      failedJobs24h: failed,
      queueDepthPerLane: {
        "heavy-ml": heavyMlDepth,
        io: ioDepth,
        media: mediaDepth,
        speech: speechDepth,
      },
    };
  }
}
