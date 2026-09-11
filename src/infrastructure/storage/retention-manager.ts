import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export interface StorageStats {
  totalBytes: number;
  formattedSize: string;
  filesCount: number;
}

export class StorageRetentionManager {
  private baseDir: string;
  private tmpJobsDir: string;
  private tmpMediaDir: string;
  private storageDir: string;
  private storageJobsDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.cwd();
    this.tmpJobsDir = path.join(this.baseDir, "tmp", "jobs");
    this.tmpMediaDir = path.join(this.baseDir, "tmp", "media");
    this.storageDir = path.join(this.baseDir, "storage");
    this.storageJobsDir = path.join(this.baseDir, "storage", "jobs");

    this.ensureBaseDirs();
  }

  private ensureBaseDirs(): void {
    try {
      if (!fsSync.existsSync(this.tmpJobsDir)) {
        fsSync.mkdirSync(this.tmpJobsDir, { recursive: true });
      }
      if (!fsSync.existsSync(this.tmpMediaDir)) {
        fsSync.mkdirSync(this.tmpMediaDir, { recursive: true });
      }
      if (!fsSync.existsSync(this.storageJobsDir)) {
        fsSync.mkdirSync(this.storageJobsDir, { recursive: true });
      }
    } catch {
      // Ignore directory creation issues during init
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

    const targetDirs = [this.storageDir, this.tmpJobsDir, this.tmpMediaDir];

    for (const dir of targetDirs) {
      if (!fsSync.existsSync(dir)) continue;

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
                // File might have been removed during scan
              }
            }
          }
        } catch {
          // Ignore read errors
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
            // If directory is now empty, remove it
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

    await scanAndClean(this.tmpJobsDir);
    await scanAndClean(this.tmpMediaDir);

    return { deletedCount, freedBytes };
  }
}

export const retentionManager = new StorageRetentionManager();
export default retentionManager;
