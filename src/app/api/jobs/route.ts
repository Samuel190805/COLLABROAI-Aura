import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { handleRoute } from "@/lib/handleRoute";
import { JobKind } from "@/domain/value-objects/JobStatus";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "1";
    const recentOnly = searchParams.get("recent") === "1";
    const typeFilter = searchParams.get("type") as JobKind | null;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let jobs = [];

    if (activeOnly && !recentOnly) {
      jobs = await container.jobRepository.findActiveByUserId(userId);
    } else if (recentOnly) {
      jobs = await container.jobRepository.findRecentByUserId(userId, limit);
    } else {
      jobs = await container.jobRepository.findRecentByUserId(userId, limit);
    }

    if (typeFilter) {
      jobs = jobs.filter((j) => j.type === typeFilter);
    }

    // Compute latest job by feature type for quick rehydration
    const allRecent = await container.jobRepository.findRecentByUserId(userId, 40);
    const featureTypes: JobKind[] = [
      "STEM_SEPARATION",
      "MEDIA_DOWNLOAD",
      "TRANSLATE_SPEAK",
      "CHORD_DETECTION",
      "MASHUP_RENDER",
      "MEDIA_CONVERSION",
    ];

    const latestByType: Record<string, any> = {};
    for (const t of featureTypes) {
      const latest = allRecent.find((j) => j.type === t);
      latestByType[t] = latest ? latest.toJSON() : null;
    }

    return NextResponse.json({
      jobs: jobs.map((j) => j.toJSON()),
      latestByType,
      totalCount: jobs.length,
    });
  });
}
