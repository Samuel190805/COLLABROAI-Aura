import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return handleRoute(async () => {
    const resolvedParams = await Promise.resolve(context.params);
    const jobId = resolvedParams.id;

    if (!jobId) {
      throw AppError.invalidInput("Job ID is required");
    }

    const job = await container.jobRepository.findById(jobId);
    if (!job) {
      throw AppError.notFound(`Job with ID ${jobId} not found`);
    }

    if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") {
      return NextResponse.json({
        success: true,
        message: `Job ${jobId} is already in terminal state: ${job.status}`,
        status: job.status,
      });
    }

    const cancelled = await container.queue.cancel(jobId);

    return NextResponse.json({
      success: cancelled,
      jobId,
      status: "CANCELLED",
      message: "Job cancelled successfully",
    });
  });
}
