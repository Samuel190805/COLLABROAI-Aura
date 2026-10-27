import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const { url } = await req.json().catch(() => ({}));
    if (!url || typeof url !== "string" || !url.trim()) {
      throw AppError.invalidInput("URL is required");
    }

    try {
      const metadata = await container.mediaResolver.resolveInfo(url.trim());
      return NextResponse.json({ success: true, metadata });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to resolve media metadata";
      const lower = errorMsg.toLowerCase();
      if (lower.includes("drm") || lower.includes("copyright")) {
        throw AppError.unsupportedFormat(errorMsg);
      }
      if (lower.includes("private") || lower.includes("removed") || lower.includes("not exist") || lower.includes("unavailable")) {
        throw AppError.notFound(errorMsg);
      }
      if (lower.includes("age-restricted") || lower.includes("sign-in") || lower.includes("region") || lower.includes("geographic")) {
        throw AppError.sourceUnavailable(errorMsg);
      }
      throw AppError.processingFailed(errorMsg);
    }
  });
}
