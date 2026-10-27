"use client";

import { useState, useEffect, useCallback } from "react";
import { JobStage, JobStatusType, JobKind } from "@/domain/value-objects/JobStatus";
import { useJobs, JobState } from "@/lib/jobs-context";

export interface UseRealtimeJobState {
  jobId: string | null;
  status: JobStatusType | "IDLE";
  stage: JobStage | "IDLE";
  progress: number;
  message?: string;
  error?: string | null;
  errorCode?: string | null;
  result?: Record<string, unknown> | null;
  mediaAssets?: any[];
  isConnected: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  cancel: () => Promise<boolean>;
  watchJob: (id: string, type?: JobKind) => void;
  reset: () => void;
}

const KNOWN_KINDS: Set<string> = new Set([
  "STEM_SEPARATION",
  "MEDIA_DOWNLOAD",
  "TRANSLATE_SPEAK",
  "CHORD_DETECTION",
  "MASHUP_RENDER",
  "MEDIA_CONVERSION",
]);

export function useRealtimeJob(initialJobIdOrType?: string | JobKind | null): UseRealtimeJobState {
  const {
    jobs,
    latestByType,
    cancelJob: globalCancelJob,
    markJobSeen,
    trackJob,
    isConnected: globalConnected,
  } = useJobs();

  const isType = typeof initialJobIdOrType === "string" && KNOWN_KINDS.has(initialJobIdOrType);
  const typeKind = isType ? (initialJobIdOrType as JobKind) : undefined;

  const [explicitJobId, setExplicitJobId] = useState<string | null>(
    isType ? null : initialJobIdOrType || null
  );

  // Determine effective job ID: explicit ID first, or latest for this feature type
  const effectiveJobId =
    explicitJobId || (typeKind && latestByType[typeKind] ? latestByType[typeKind]!.id : null);

  const currentJob: JobState | undefined = effectiveJobId ? jobs[effectiveJobId] : undefined;

  // Mark job seen when user views completed job on this page
  useEffect(() => {
    if (effectiveJobId && currentJob && (currentJob.status === "COMPLETED" || currentJob.status === "FAILED")) {
      if (!currentJob.seenByUser) {
        markJobSeen(effectiveJobId).catch(() => {});
      }
    }
  }, [effectiveJobId, currentJob, markJobSeen]);

  const watchJob = useCallback(
    (id: string, type?: JobKind) => {
      setExplicitJobId(id);
      if (type || typeKind) {
        trackJob(id, type || typeKind!);
      }
    },
    [trackJob, typeKind]
  );

  const reset = useCallback(() => {
    setExplicitJobId(null);
  }, []);

  const cancel = useCallback(async (): Promise<boolean> => {
    if (effectiveJobId) {
      return await globalCancelJob(effectiveJobId);
    }
    return false;
  }, [effectiveJobId, globalCancelJob]);

  const isCompleted = currentJob?.status === "COMPLETED";
  const isFailed = currentJob?.status === "FAILED";
  const isProcessing =
    currentJob?.status === "PROCESSING" || currentJob?.status === "PENDING";

  return {
    jobId: effectiveJobId,
    status: currentJob?.status || "IDLE",
    stage: currentJob?.stage || "IDLE",
    progress: currentJob ? currentJob.progress : 0,
    message: currentJob?.message ?? undefined,
    error: currentJob?.error ?? null,
    errorCode: currentJob?.errorCode ?? null,
    result: currentJob?.result ?? null,
    mediaAssets: currentJob?.mediaAssets,
    isConnected: globalConnected,
    isCompleted,
    isFailed,
    isProcessing,
    cancel,
    watchJob,
    reset,
  };
}

export default useRealtimeJob;
