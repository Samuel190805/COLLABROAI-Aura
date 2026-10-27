import { NextRequest, NextResponse } from "next/server";
import { calculateCompatibility } from "@/domain/value-objects/MashupConfig";
import { handleRoute } from "@/lib/handleRoute";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const { keyA, camelotA, bpmA, keyB, camelotB, bpmB } = body;

    const compatibility = calculateCompatibility(
      keyA || "C Major",
      camelotA || "8B",
      bpmA || 120,
      keyB || "G Major",
      camelotB || "9B",
      bpmB || 124
    );

    return NextResponse.json({ success: true, compatibility });
  });
}
