import { prisma } from "@/lib/db";
import { IJobRepository } from "@/domain/repositories/IJobRepository";
import { Job } from "@/domain/entities/Job";
import { MediaAsset } from "@/domain/entities/MediaAsset";
import { JobKind, JobStage, JobStatusType } from "@/domain/value-objects/JobStatus";

export class PrismaJobRepository implements IJobRepository {
  async findById(id: string): Promise<Job | null> {
    const raw = await prisma.job.findUnique({
      where: { id },
      include: { mediaAssets: true },
    });
    if (!raw) return null;

    let inputParams = {};
    try {
      inputParams = JSON.parse(raw.inputParams || "{}");
    } catch {
      inputParams = {};
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
      error: raw.error,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      completedAt: raw.completedAt,
      mediaAssets: assets,
    });
  }

  async findByUserId(userId: string, limit = 20): Promise<Job[]> {
    const records = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { mediaAssets: true },
    });

    return records.map((raw: any) => {
      let inputParams = {};
      try {
        inputParams = JSON.parse(raw.inputParams || "{}");
      } catch {
        inputParams = {};
      }
      return new Job({
        id: raw.id,
        userId: raw.userId,
        type: raw.type as JobKind,
        status: raw.status as JobStatusType,
        stage: raw.stage as JobStage,
        progress: raw.progress,
        message: raw.message,
        inputParams,
        error: raw.error,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        completedAt: raw.completedAt,
      });
    });
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
        error: job.error,
        createdAt: job.props.createdAt,
        updatedAt: job.props.updatedAt,
      },
    });
    return job;
  }

  async update(job: Job): Promise<Job> {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: job.status,
        stage: job.stage,
        progress: job.progress,
        message: job.message,
        error: job.error,
        completedAt: job.props.completedAt,
        updatedAt: new Date(),
      },
    });
    return job;
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
          progress,
          status: "PROCESSING",
          message: message ?? undefined,
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
    message?: string
  ): Promise<void> {
    try {
      await prisma.job.update({
        where: { id },
        data: {
          status,
          stage,
          error: error ?? null,
          message: message ?? undefined,
          completedAt: status === "COMPLETED" ? new Date() : undefined,
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

  async getQueueMetrics(): Promise<{
    pendingJobs: number;
    activeJobs: number;
    completedJobs24h: number;
    failedJobs24h: number;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [pending, active, completed, failed] = await Promise.all([
      prisma.job.count({ where: { status: "PENDING" } }),
      prisma.job.count({ where: { status: "PROCESSING" } }),
      prisma.job.count({ where: { status: "COMPLETED", updatedAt: { gte: oneDayAgo } } }),
      prisma.job.count({ where: { status: "FAILED", updatedAt: { gte: oneDayAgo } } }),
    ]);
    return {
      pendingJobs: pending,
      activeJobs: active,
      completedJobs24h: completed,
      failedJobs24h: failed,
    };
  }
}
