import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const metadata = await container.mediaResolver.resolveInfo(url.trim());
    return NextResponse.json({ success: true, metadata });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to resolve media metadata";
    const lower = errorMsg.toLowerCase();

    let status = 400;
    if (lower.includes("age-restricted") || lower.includes("sign-in") || lower.includes("sign in")) {
      status = 403;
    } else if (lower.includes("private") || lower.includes("removed") || lower.includes("not exist") || lower.includes("unavailable")) {
      status = 404;
    } else if (lower.includes("region") || lower.includes("geographic") || lower.includes("country")) {
      status = 451;
    } else if (lower.includes("drm") || lower.includes("copyright")) {
      status = 400;
    }

    return NextResponse.json({ error: errorMsg }, { status });
  }
}
