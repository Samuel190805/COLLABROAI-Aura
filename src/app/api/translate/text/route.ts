import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const { text, targetLanguage = "ta", sourceLanguage = "auto" } = await req.json().catch(() => ({}));

    if (!text || typeof text !== "string" || !text.trim()) {
      throw AppError.invalidInput("Text is required");
    }

    const result = await container.translationProvider.translate(
      text.trim(),
      targetLanguage,
      sourceLanguage
    );

    return NextResponse.json({
      success: true,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
    });
  });
}
