import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export interface StorageStats {
  totalBytes: number;
  formattedSize: string;
  filesCount: number;
}

export interface SweepResult {
  lastSweepTimestamp: string;
  filesDeletedLastSweep: number;
  bytesFreedLastSweep: number;
}

export class StorageRetentionManager {
  private baseDir: string;
  private tmpJobsDir: string;
  private tmpMediaDir: string;
  private storageDir: string;
  private storageSubDirs: string[];

  private lastSweepTimestamp: string = new Date().toISOString();
  private filesDeletedLastSweep: number = 0;
  private bytesFreedLastSweep: number = 0;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.cwd();
    this.tmpJobsDir = path.join(this.baseDir, "tmp", "jobs");
    this.tmpMediaDir = path.join(this.baseDir, "tmp", "media");
    this.storageDir = path.join(this.baseDir, "storage");
    this.storageSubDirs = [
      path.join(this.baseDir, "storage", "jobs"),
      path.join(this.baseDir, "storage", "downloads"),
      path.join(this.baseDir, "storage", "translated"),
      path.join(this.baseDir, "storage", "chords"),
      path.join(this.baseDir, "storage", "mashups"),
      path.join(this.baseDir, "storage", "conversions"),
    ];

    this.ensureBaseDirs();
    this.startPeriodicSweep();
  }

  private ensureBaseDirs(): void {
    try {
      if (!fsSync.existsSync(this.tmpJobsDir)) {
        fsSync.mkdirSync(this.tmpJobsDir, { recursive: true });
      }
      if (!fsSync.existsSync(this.tmpMediaDir)) {
        fsSync.mkdirSync(this.tmpMediaDir, { recursive: true });
      }
      for (const dir of this.storageSubDirs) {
        if (!fsSync.existsSync(dir)) {
          fsSync.mkdirSync(dir, { recursive: true });
        }
      }
    } catch {
      // Ignore during init
    }
  }

  private startPeriodicSweep(): void {
    // Run sweep every 1 hour (3600000 ms)
    if (!this.sweepTimer && typeof setInterval !== "undefined") {
      this.sweepTimer = setInterval(() => {
        this.sweepExpiredFiles(24).catch((err) =>
          console.warn("[StorageRetentionManager] Hourly sweep error:", err)
        );
      }, 3600000);
      if (this.sweepTimer.unref) {
        this.sweepTimer.unref();
      }
    }
  }

  public getJobWorkingDir(jobId: string): string {
    return path.join(this.tmpJobsDir, jobId);
  }

  public async ensureJobWorkingDir(jobId: string): Promise<string> {
    const dir = this.getJobWorkingDir(jobId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Intermediate files (raw streams, unmixed stems, temp files):
   * DELETED IMMEDIATELY after processing completes. (Section 4.8.1)
   */
  public async cleanJobIntermediates(jobId: string): Promise<void> {
    try {
      const dir = this.getJobWorkingDir(jobId);
      if (fsSync.existsSync(dir)) {
        await fs.rm(dir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[StorageRetentionManager] Failed to clean intermediates for job ${jobId}:`, err);
    }
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return "0 MB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  public async getStorageStats(): Promise<StorageStats> {
    let totalBytes = 0;
    let filesCount = 0;

    const targetDirs = [this.storageDir, this.tmpJobsDir, this.tmpMediaDir, ...this.storageSubDirs];
    const scanned = new Set<string>();

    for (const dir of targetDirs) {
      if (!fsSync.existsSync(dir) || scanned.has(dir)) continue;
      scanned.add(dir);

      const scanDirectory = async (currentDir: string) => {
        try {
          const entries = await fs.readdir(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
              await scanDirectory(fullPath);
            } else if (entry.isFile()) {
              try {
                const stat = await fs.stat(fullPath);
                totalBytes += stat.size;
                filesCount += 1;
              } catch {
                // Ignore transient file removal
              }
            }
          }
        } catch {
          // Ignore
        }
      };

      await scanDirectory(dir);
    }

    return {
      totalBytes,
      formattedSize: this.formatBytes(totalBytes),
      filesCount,
    };
  }

  /**
   * Sweeps files older than maxAgeHours across storage and tmp (Section 4.8.2)
   */
  public async sweepExpiredFiles(maxAgeHours: number = 24): Promise<{ deletedCount: number; freedBytes: number }> {
    let deletedCount = 0;
    let freedBytes = 0;
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

    const scanAndClean = async (currentDir: string) => {
      try {
        if (!fsSync.existsSync(currentDir)) return;
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            await scanAndClean(fullPath);
            const remaining = await fs.readdir(fullPath).catch(() => ["dummy"]);
            if (remaining.length === 0) {
              await fs.rm(fullPath, { recursive: true, force: true }).catch(() => {});
            }
          } else if (entry.isFile()) {
            try {
              const stat = await fs.stat(fullPath);
              if (stat.mtimeMs < cutoffTime) {
                await fs.unlink(fullPath);
                deletedCount++;
                freedBytes += stat.size;
                console.log(
                  `[StorageRetentionManager] Deleted expired file: ${fullPath} (${this.formatBytes(stat.size)} freed)`
                );
              }
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Ignore
      }
    };

    // Clean tmp dirs and storage subdirs
    await scanAndClean(this.tmpJobsDir);
    await scanAndClean(this.tmpMediaDir);
    for (const sDir of this.storageSubDirs) {
      await scanAndClean(sDir);
    }

    this.lastSweepTimestamp = new Date().toISOString();
    this.filesDeletedLastSweep = deletedCount;
    this.bytesFreedLastSweep = freedBytes;

    return { deletedCount, freedBytes };
  }

  public getSweepMetrics(): SweepResult {
    return {
      lastSweepTimestamp: this.lastSweepTimestamp,
      filesDeletedLastSweep: this.filesDeletedLastSweep,
      bytesFreedLastSweep: this.bytesFreedLastSweep,
    };
  }

  /**
   * Checks free disk space: if < 2GB, triggers immediate retention sweep (Section 4.8.4)
   */
  public async checkDiskSpaceAndEnforce(): Promise<{
    totalSpaceBytes: number;
    freeSpaceBytes: number;
    isLowSpace: boolean;
  }> {
    try {
      const stat = await fs.statfs(this.baseDir);
      const totalSpaceBytes = stat.bsize * stat.blocks;
      const freeSpaceBytes = stat.bsize * stat.bavail;
      const TWO_GB = 2 * 1024 * 1024 * 1024;

      if (freeSpaceBytes < TWO_GB) {
        console.warn("[StorageRetentionManager] Disk space below 2GB! Triggering emergency sweep...");
        await this.sweepExpiredFiles(24);

        const postStat = await fs.statfs(this.baseDir);
        const postFree = postStat.bsize * postStat.bavail;
        if (postFree < TWO_GB) {
          console.warn("[StorageRetentionManager] Disk space still below 2GB. Running 1-hour aggressive sweep...");
          await this.sweepExpiredFiles(1);
        }
      }

      return {
        totalSpaceBytes,
        freeSpaceBytes,
        isLowSpace: freeSpaceBytes < TWO_GB,
      };
    } catch {
      return {
        totalSpaceBytes: 0,
        freeSpaceBytes: 0,
        isLowSpace: false,
      };
    }
  }
}

export const retentionManager = new StorageRetentionManager();
export default retentionManager;
