import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { Job } from "@/domain/entities/Job";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const clientIp = req.headers.get("x-forwarded-for") || (req as any).ip || "127.0.0.1";

    // Rate Limiting Check
    const { rateLimiter } = await import("@/infrastructure/ratelimit/rate-limiter");
    const { retentionManager } = await import("@/infrastructure/storage/retention-manager");
    const rateCheck = rateLimiter.check(userId || clientIp, "translate_speak");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Translation rate limit exceeded. Please wait before queuing more speech translation jobs.",
          resetTime: rateCheck.resetTime,
        },
        {
          status: 429,
          headers: rateLimiter.getRateLimitHeaders(rateCheck),
        }
      );
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
    let targetLanguage = "es";
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
      targetLanguage = (formData.get("targetLanguage") as string) || "es";
      voiceGender = ((formData.get("voiceGender") as string) || "female") as any;
      speed = parseFloat((formData.get("speed") as string) || "1.0");
      preserveVoice = formData.get("preserveVoice") !== "false";
      enableDiarization = formData.get("enableDiarization") !== "false";

      if (file && file.size > 0) {
        inputType = "audio";
        const buffer = Buffer.from(await file.arrayBuffer());
        inputAudioPath = path.join(/*turbopackIgnore: true*/ workDir, file.name || "input.wav");
        await fs.writeFile(inputAudioPath, buffer);
      } else {
        inputType = "text";
      }
    } else {
      const json = await req.json().catch(() => ({}));
      inputType = json.inputType || "text";
      sourceText = json.sourceText;
      translatedText = json.translatedText;
      sourceLanguage = json.sourceLanguage || "auto";
      targetLanguage = json.targetLanguage || "es";
      voiceGender = json.voiceGender || "female";
      speed = json.speed || 1.0;
      if (json.preserveVoice !== undefined) preserveVoice = Boolean(json.preserveVoice);
      if (json.enableDiarization !== undefined) enableDiarization = Boolean(json.enableDiarization);
    }

    if (
      (inputType === "text" && (!sourceText || !sourceText.trim()) && (!translatedText || !translatedText.trim())) ||
      (inputType === "audio" && !inputAudioPath)
    ) {
      return NextResponse.json({ error: "Source text, translated text, or audio file is required" }, { status: 400 });
    }

    const job = new Job({
      id: jobId,
      userId,
      type: "TRANSLATE_SPEAK",
      status: "PENDING",
      stage: "TRANSCRIBING",
      progress: 0,
      message: "Queued for speech translation & synthesis",
      inputParams: {
        inputType,
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

    // Enqueue async execution
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
        stage: "TRANSCRIBING",
        message: "Translate and speak job initialized",
      },
      {
        headers: rateLimiter.getRateLimitHeaders(rateCheck),
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to initialize translation job";
    console.error("[/api/translate] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
