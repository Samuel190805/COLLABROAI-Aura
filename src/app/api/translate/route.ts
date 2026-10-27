import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { rateLimiter } from "@/infrastructure/ratelimit/rate-limiter";
import { retentionManager } from "@/infrastructure/storage/retention-manager";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const clientIp = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";

    // Rate Limiting Check
    const rateCheck = rateLimiter.check(userId || clientIp, "translate_speak");
    if (!rateCheck.allowed) {
      throw AppError.rateLimited("Translation rate limit exceeded. Please wait before queuing more speech translation jobs.");
    }

    const contentType = req.headers.get("content-type") || "";
    const jobId = `job_ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const workDir = retentionManager.getJobWorkingDir(jobId);
    await fs.mkdir(workDir, { recursive: true });

    let inputType: "audio" | "text" = "text";
    let inputAudioPath: string | undefined = undefined;
    let sourceText: string | undefined = undefined;
    let translatedText: string | undefined = undefined;
    let sourceLanguage = "auto";
    let targetLanguage = "ta"; // Default target language to Tamil as requested in spec
    let voiceGender: "male" | "female" | "neutral" = "female";
    let speed = 1.0;
    let preserveVoice = true;
    let enableDiarization = true;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("audio") as File | null;
      sourceText = (formData.get("text") as string) || undefined;
      translatedText = (formData.get("translatedText") as string) || undefined;
      sourceLanguage = (formData.get("sourceLanguage") as string) || "auto";
      targetLanguage = (formData.get("targetLanguage") as string) || "ta";
      voiceGender = ((formData.get("voiceGender") as string) || "female") as any;
      speed = parseFloat((formData.get("speed") as string) || "1.0");
      preserveVoice = formData.get("preserveVoice") !== "false";
      enableDiarization = formData.get("enableDiarization") !== "false";

      if (file && file.size > 0) {
        inputType = "audio";
        const sanitized = (file.name || "input.wav").replace(/[^a-zA-Z0-9_.-]/g, "_");
        inputAudioPath = path.join(workDir, sanitized);
        const nodeStream = Readable.fromWeb(file.stream() as any);
        await pipeline(nodeStream, createWriteStream(inputAudioPath));
      } else {
        inputType = "text";
      }
    } else {
      const json = await req.json().catch(() => ({}));
      inputType = json.inputType || "text";
      sourceText = json.sourceText || json.text;
      translatedText = json.translatedText;
      sourceLanguage = json.sourceLanguage || "auto";
      targetLanguage = json.targetLanguage || "ta";
      voiceGender = json.voiceGender || "female";
      speed = json.speed ?? 1.0;
      preserveVoice = json.preserveVoice ?? true;
      enableDiarization = json.enableDiarization ?? true;
      inputAudioPath = json.inputAudioPath;
    }

    if (inputType === "text" && !sourceText && !translatedText) {
      throw AppError.invalidInput("Text content is required for text translation");
    }

    const job = new Job({
      id: jobId,
      userId,
      type: "TRANSLATE_SPEAK",
      status: "PENDING",
      stage: inputType === "audio" ? "TRANSCRIBING" : "TRANSLATING",
      progress: 0,
      message: "Queued for speech translation & synthesis",
      inputParams: {
        inputType,
        inputAudioPath,
        sourceText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        voiceGender,
        speed,
        preserveVoice,
        enableDiarization,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await container.jobRepository.create(job);

    await container.queue.enqueue(jobId, async () => {
      await container.translateAndSpeakUseCase.execute({
        jobId,
        userId,
        inputType,
        inputAudioPath,
        sourceText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        voiceGender,
        speed,
        preserveVoice,
        enableDiarization,
      });
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        status: "PENDING",
        stage: inputType === "audio" ? "TRANSCRIBING" : "TRANSLATING",
        message: "Translation job initialized",
      },
      { headers: rateLimiter.getRateLimitHeaders(rateCheck) }
    );
  });
}
