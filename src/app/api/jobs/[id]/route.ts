import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return handleRoute(async () => {
    const resolvedParams = await Promise.resolve(context.params);
    const jobId = resolvedParams.id;

    if (!jobId) {
      throw AppError.invalidInput("Job ID is required");
    }

    const job = await container.getJobStatusUseCase.execute(jobId);
    if (!job) {
      throw AppError.notFound(`Job with ID ${jobId} not found`);
    }

    const jobData = job as any;
    const resultObj = jobData.result || {};

    return NextResponse.json({
      job,
      result: resultObj,
      chordTimeline: resultObj.chordTimeline || jobData.chordTimeline,
      sections: resultObj.sections || jobData.sections || [],
      originalKey: resultObj.originalKey || jobData.originalKey || jobData.key,
      bpm: resultObj.bpm || jobData.bpm,
      key: resultObj.key || jobData.key,
      detectedVocabulary: resultObj.detectedVocabulary || jobData.detectedVocabulary || [],
    });
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return handleRoute(async () => {
    const resolvedParams = await Promise.resolve(context.params);
    const jobId = resolvedParams.id;

    if (!jobId) {
      throw AppError.invalidInput("Job ID is required");
    }

    const body = await req.json().catch(() => ({}));
    if (body.seen === true || body.seenByUser === true) {
      await container.jobRepository.markSeen(jobId);
    }

    return NextResponse.json({ success: true, jobId });
  });
}
