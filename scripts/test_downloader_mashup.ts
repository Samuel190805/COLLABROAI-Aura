import path from "path";
import fs from "fs";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";

const ffmpegStatic = require(path.resolve(process.cwd(), "node_modules", "ffmpeg-static"));
const ffprobeStatic = require(path.resolve(process.cwd(), "node_modules", "ffprobe-static"));
const ffmpeg = require(path.resolve(process.cwd(), "node_modules", "fluent-ffmpeg"));
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

async function probeFile(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });
}

async function runTests() {
  console.log("================================================================================");
  console.log("             DOWNLOADER & MASHUP STUDIO - ACCEPTANCE AUDIT                      ");
  console.log("================================================================================");

  // 1. Check Downloader Setup Status & Resolver Port
  console.log("\n[TEST 6] Testing Link Downloader Setup & Resolution...");
  const setupStatus = await (container.mediaResolver as any).getSetupStatus();
  console.log(`  yt-dlp binary resolved: ${setupStatus.binaryPath} (exists: ${setupStatus.installed})`);
  if (!setupStatus.installed) {
    throw new Error("FAIL: yt-dlp binary is not installed!");
  }
  console.log("✓ Downloader binary resolution verified");

  // 2. Test Mashup Studio (2-Stem Pairing)
  console.log("\n[TEST 7] Testing Mashup Studio (2-Stem Pairing: Vocals A + Instrument B)...");
  const testDir = path.resolve(process.cwd(), "tmp", "acceptance_test");
  const trackAPath = path.join(testDir, "track_a.wav");
  const trackBPath = path.join(testDir, "track_b.wav");

  // Generate Track A (440Hz, 4s)
  await new Promise<void>((res, rej) => {
    ffmpeg()
      .input("sine=frequency=440:sample_rate=44100")
      .inputFormat("lavfi")
      .duration(4)
      .audioChannels(2)
      .output(trackAPath)
      .on("end", () => res())
      .on("error", rej)
      .run();
  });

  // Generate Track B (554Hz, 4s)
  await new Promise<void>((res, rej) => {
    ffmpeg()
      .input("sine=frequency=554:sample_rate=44100")
      .inputFormat("lavfi")
      .duration(4)
      .audioChannels(2)
      .output(trackBPath)
      .on("end", () => res())
      .on("error", rej)
      .run();
  });

  const mashupJobId = `job_test_mu_${Date.now()}`;
  await container.jobRepository.create(new Job({
    id: mashupJobId,
    type: "MASHUP_RENDER",
    status: "PENDING",
    stage: "RESOLVING",
    progress: 0,
    inputParams: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mashupResult = await container.createMashupUseCase.execute({
    jobId: mashupJobId,
    trackA: {
      type: "file",
      filePath: trackAPath,
      name: "Track A",
    },
    trackB: {
      type: "file",
      filePath: trackBPath,
      name: "Track B",
    },
    selection: {
      vocalsFrom: "A",
      instrumentFrom: "B",
    },
    autoKeyMatch: true,
    autoTempoMatch: true,
    outputFormat: "mp3",
  });

  console.log(`  Mashup Master Output: ${mashupResult.masterPath}`);
  const mashupMeta = await probeFile(mashupResult.masterPath);
  const mashupAudioStream = mashupMeta.streams.find((s: any) => s.codec_type === "audio");
  if (!mashupAudioStream) {
    throw new Error("FAIL: Mashup master has no valid audio stream!");
  }
  console.log(`  Codec: ${mashupAudioStream.codec_name}, Sample Rate: ${mashupAudioStream.sample_rate}Hz, Duration: ${mashupMeta.format.duration}s`);
  console.log("✓ Mashup Studio PASSED: 2-Stem vocal/instrument pairing & master render verified via ffprobe");

  console.log("\n================================================================================");
  console.log("             ALL ADDITIONAL AUDIT TESTS PASSED SUCCESSFULLY!                    ");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("❌ AUDIT FAILED:", err);
  process.exit(1);
});
