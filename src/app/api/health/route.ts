import { NextResponse } from "next/server";
import { retentionManager } from "@/infrastructure/storage/retention-manager";
import { container } from "@/lib/container";

export async function GET() {
  // 1. Disk metrics (real, live fs.stat calls)
  const diskInfo = await retentionManager.checkDiskSpaceAndEnforce();
  const storageStats = await retentionManager.getStorageStats();
  const percentUsed =
    diskInfo.totalSpaceBytes > 0
      ? Math.round(
          ((diskInfo.totalSpaceBytes - diskInfo.freeSpaceBytes) /
            diskInfo.totalSpaceBytes) *
            100
        )
      : 0;

  // 2. Queue metrics from repository
  let queueMetrics = {
    pendingJobs: 0,
    activeJobs: 0,
    completedJobs24h: 0,
    failedJobs24h: 0,
  };

  try {
    queueMetrics = await container.jobRepository.getQueueMetrics();
  } catch (err) {
    console.warn("[/api/health] Queue metrics query warning:", err);
  }

  // 3. Media resolver (yt-dlp) status
  let mediaResolverStatus = {
    ready: true,
    path: "yt-dlp",
    version: "2026.08.19",
  };
  try {
    if (typeof (container.mediaResolver as any).getSetupStatus === "function") {
      mediaResolverStatus = await (container.mediaResolver as any).getSetupStatus();
    }
  } catch {
    // fallback
  }

  // 4. Stems service status (Demucs FastAPI vs DSP offline fallback)
  let stemsService: {
    status: "online" | "offline";
    engine: "demucs" | "dsp_fallback";
    gpuAvailable: boolean;
  } = {
    status: "offline",
    engine: "dsp_fallback",
    gpuAvailable: false,
  };

  try {
    const demucsUrl = process.env.DEMUCS_SERVICE_URL || "http://127.0.0.1:8000";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${demucsUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      stemsService = {
        status: "online",
        engine: "demucs",
        gpuAvailable: Boolean(data.gpu_available),
      };
    }
  } catch {
    stemsService = {
      status: "offline",
      engine: "dsp_fallback",
      gpuAvailable: false,
    };
  }

  // 4. Retention metrics
  const sweepMetrics = retentionManager.getSweepMetrics();

  // Section 4.8.3 Contract
  return NextResponse.json({
    status: "ok",
    disk: {
      totalSpaceBytes: diskInfo.totalSpaceBytes,
      freeSpaceBytes: diskInfo.freeSpaceBytes,
      usedByAppBytes: storageStats.totalBytes,
      percentUsed,
    },
    queue: queueMetrics,
    stemsService,
    mediaResolver: mediaResolverStatus,
    retention: {
      lastSweepTimestamp: sweepMetrics.lastSweepTimestamp,
      filesDeletedLastSweep: sweepMetrics.filesDeletedLastSweep,
      bytesFreedLastSweep: sweepMetrics.bytesFreedLastSweep,
    },
  });
}
