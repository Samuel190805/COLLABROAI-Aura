import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const job = await container.getJobStatusUseCase.execute(resolvedParams.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({
      job,
      chordTimeline: (job as any).chordTimeline,
      sections: (job as any).sections || [],
      originalKey: (job as any).originalKey || (job as any).key,
      bpm: (job as any).bpm,
      key: (job as any).key,
      detectedVocabulary: (job as any).detectedVocabulary || [],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch job";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
