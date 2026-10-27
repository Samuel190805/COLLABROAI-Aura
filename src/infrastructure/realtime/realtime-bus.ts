import { EventEmitter } from "events";
import { RealtimePublisherPort } from "@/application/ports/RealtimePublisherPort";
import { JobRealtimePayload } from "@/domain/events/JobEvents";

class RealtimeBus implements RealtimePublisherPort {
  private emitter: EventEmitter;
  private latestCache = new Map<string, JobRealtimePayload>();

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(500);
  }

  publish(jobId: string, payload: JobRealtimePayload): void {
    this.latestCache.set(jobId, payload);
    this.emitter.emit(`job:${jobId}`, payload);
    this.emitter.emit("job:update", payload);
  }

  subscribe(
    jobId: string,
    callback: (payload: JobRealtimePayload) => void
  ): () => void {
    const channel = `job:${jobId}`;

    // Send latest cached state immediately if present
    const cached = this.latestCache.get(jobId);
    if (cached) {
      setTimeout(() => callback(cached), 0);
    }

    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
      if (this.emitter.listenerCount(channel) === 0) {
        const last = this.latestCache.get(jobId);
        if (last && (last.status === "COMPLETED" || last.status === "FAILED" || last.status === "CANCELLED")) {
          setTimeout(() => this.latestCache.delete(jobId), 120000);
        }
      }
    };
  }

  subscribeAll(callback: (payload: JobRealtimePayload) => void): () => void {
    const channel = "job:update";
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }

  getLatest(jobId: string): JobRealtimePayload | undefined {
    return this.latestCache.get(jobId);
  }
}

const globalForBus = globalThis as unknown as { realtimeBus: RealtimeBus | undefined };

export const realtimeBus = globalForBus.realtimeBus ?? new RealtimeBus();
if (process.env.NODE_ENV !== "production") {
  globalForBus.realtimeBus = realtimeBus;
}

export default realtimeBus;
