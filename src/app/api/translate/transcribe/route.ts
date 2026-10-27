import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const languageHint = (formData.get("language") as string) || undefined;

    if (!file || file.size < 256) {
      throw AppError.invalidInput(
        "A valid non-empty audio file or recording is required (minimum 256 bytes)."
      );
    }

    const tmpDir = path.join(process.cwd(), "tmp", "asr");
    await fs.mkdir(tmpDir, { recursive: true });

    const safeExt = path.extname(file.name) || ".wav";
    const tempAudioPath = path.join(
      tmpDir,
      `asr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${safeExt}`
    );

    const nodeStream = Readable.fromWeb(file.stream() as any);
    await pipeline(nodeStream, createWriteStream(tempAudioPath));

    try {
      const asrResult = await container.asrProvider.transcribe(tempAudioPath, languageHint);

      return NextResponse.json({
        success: true,
        text: asrResult.text,
        detectedLanguage: asrResult.detectedLanguage,
        confidence: asrResult.confidence,
        durationSeconds: asrResult.durationSeconds,
        segments: asrResult.segments,
      });
    } finally {
      await fs.unlink(tempAudioPath).catch(() => {});
    }
  });
}
