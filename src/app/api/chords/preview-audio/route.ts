import { NextRequest, NextResponse } from "next/server";
import { generateChordPcmWav } from "@/domain/value-objects/ChordData";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const chord = (body.chord || "C").trim();
    if (!chord) {
      throw AppError.invalidInput("Chord name is required");
    }
    const wavBuffer = generateChordPcmWav(chord);

    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  });
}

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const { searchParams } = new URL(req.url);
    const chord = (searchParams.get("chord") || "C").trim();
    if (!chord) {
      throw AppError.invalidInput("Chord name is required");
    }
    const wavBuffer = generateChordPcmWav(chord);

    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  });
}
