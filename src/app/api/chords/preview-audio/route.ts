import { NextRequest, NextResponse } from "next/server";
import { generateChordPcmWav } from "@/domain/value-objects/ChordData";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chord = (body.chord || "C").trim();
    const wavBuffer = generateChordPcmWav(chord);

    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate chord preview";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chord = (searchParams.get("chord") || "C").trim();
    const wavBuffer = generateChordPcmWav(chord);

    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate chord preview";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
