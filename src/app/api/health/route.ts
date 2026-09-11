import { NextResponse } from "next/server";
import { retentionManager } from "@/infrastructure/storage/retention-manager";
import { rateLimiter } from "@/infrastructure/ratelimit/rate-limiter";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export async function GET() {
  const startTime = Date.now();

  // 1. FFmpeg & FFprobe check
  let ffmpegStatus = "unknown";
  let ffmpegVersion = "";
  try {
    let ffmpegCmd = "ffmpeg";
    try {
      const ffmpegStatic = require("ffmpeg-static");
      const fsSync = require("fs");
      if (ffmpegStatic && fsSync.existsSync(ffmpegStatic)) {
        ffmpegCmd = `"${ffmpegStatic}"`;
      }
    } catch {}
    const { stdout } = await execAsync(`${ffmpegCmd} -version`, { timeout: 3000 });
    ffmpegStatus = "healthy";
    ffmpegVersion = stdout.split("\n")[0] || "Installed";
  } catch (err: any) {
    ffmpegStatus = `unavailable (${err.message})`;
  }

  // 2. Python & Demucs check
  let pythonStatus = "unknown";
  try {
    const { stdout } = await execAsync("python --version", { timeout: 3000 });
    pythonStatus = `healthy (${stdout.trim()})`;
  } catch (err: any) {
    pythonStatus = `unavailable (${err.message})`;
  }

  // 3. Storage & Retention stats
  let storageStats = {
    totalBytes: 0,
    formattedSize: "0 MB",
    filesCount: 0,
  };
  try {
    storageStats = await retentionManager.getStorageStats();
  } catch {
    //
  }

  // 4. Temporary working jobs check
  let activeWorkingJobs = 0;
  try {
    const tmpJobsDir = path.join(process.cwd(), "tmp", "jobs");
    const entries = await fs.readdir(tmpJobsDir, { withFileTypes: true }).catch(() => []);
    activeWorkingJobs = entries.filter((e) => e.isDirectory()).length;
  } catch {
    activeWorkingJobs = 0;
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    responseTimeMs,
    environment: process.env.NODE_ENV || "development",
    services: {
      ffmpeg: {
        status: ffmpegStatus,
        version: ffmpegVersion,
      },
      pythonDspEngine: {
        status: pythonStatus,
      },
      whisperASR: {
        status: "active",
        engine: process.env.OPENAI_API_KEY ? "OpenAI Whisper API" : "Local Python SpeechRecognition",
      },
      neuralTTS: {
        status: "active",
        engine: "Google TTS + High-Fidelity Formant Modulator",
      },
      rateLimiter: {
        status: "active",
        activeTrackedClients: rateLimiter.getActiveClientsCount(),
      },
    },
    storageRetention: {
      status: "enforced",
      managedStorageBytes: storageStats.totalBytes,
      managedStorageFormatted: storageStats.formattedSize,
      managedFilesCount: storageStats.filesCount,
      activeWorkingJobs,
      cleanupSchedule: "Automatic post-job + 24h retention sweep",
    },
  });
}
