import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { container } from "@/lib/container";
import { JobRealtimePayload } from "@/domain/events/JobEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || null;

  const { searchParams } = new URL(req.url);
  const singleJobId = searchParams.get("jobId");
  const scope = searchParams.get("scope") || "me";

  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let keepaliveTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventData: any, eventName = "message", id?: string) => {
        try {
          let chunk = "";
          if (id) chunk += `id: ${id}\n`;
          if (eventName !== "message") chunk += `event: ${eventName}\n`;
          chunk += `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream might be closed
        }
      };

      const sendComment = (comment: string) => {
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          // Stream might be closed
        }
      };

      // 1. Initial State Delivery from DB:
      // Clients returning after navigation or refresh immediately receive true current state
      try {
        if (singleJobId) {
          const job = await container.jobRepository.findById(singleJobId);
          if (job) {
            sendEvent({
              jobId: job.id,
              status: job.status,
              stage: job.stage,
              progress: job.progress,
              message: job.message,
              error: job.error,
              mediaAssets: job.mediaAssets.map((a) => a.toJSON()),
              updatedAt: job.updatedAt.toISOString(),
            });
          }
        } else {
          // Multiplexed mode: send all active and recently completed jobs
          const activeJobs = await container.jobRepository.findActiveByUserId(userId);
          const recentJobs = await container.jobRepository.findRecentByUserId(userId, 15);

          const seenIds = new Set<string>();
          const allRelevant = [...activeJobs, ...recentJobs];

          for (const j of allRelevant) {
            if (!seenIds.has(j.id)) {
              seenIds.add(j.id);
              sendEvent({
                jobId: j.id,
                status: j.status,
                stage: j.stage,
                progress: j.progress,
                message: j.message,
                error: j.error,
                mediaAssets: j.mediaAssets.map((a) => a.toJSON()),
                updatedAt: j.updatedAt.toISOString(),
              });
            }
          }
        }
      } catch (dbErr) {
        console.error("[Realtime SSE] Error fetching initial state from DB:", dbErr);
      }

      // 2. Subscribe to Realtime Bus
      const handlePayload = (payload: JobRealtimePayload) => {
        if (singleJobId && payload.jobId !== singleJobId) return;
        sendEvent(payload, "message", `${payload.jobId}_${Date.now()}`);
      };

      if (singleJobId) {
        unsubscribe = container.realtime.subscribe(singleJobId, handlePayload);
      } else {
        unsubscribe = (container.realtime as any).subscribeAll(handlePayload);
      }

      // 3. Keepalive heartbeat comment every 15s
      keepaliveTimer = setInterval(() => {
        sendComment("keepalive");
      }, 15000);
      if (keepaliveTimer.unref) {
        keepaliveTimer.unref();
      }

      // 4. Handle client disconnect / abort signal
      req.signal.addEventListener("abort", () => {
        if (keepaliveTimer) {
          clearInterval(keepaliveTimer);
          keepaliveTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
