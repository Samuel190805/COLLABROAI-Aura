"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { JobKind, JobStage, JobStatusType } from "@/domain/value-objects/JobStatus";
import { toast } from "@/lib/toast";

export interface JobState {
  id: string;
  type: JobKind;
  status: JobStatusType;
  stage: JobStage;
  progress: number;
  message?: string | null;
  error?: string | null;
  errorCode?: string | null;
  result?: Record<string, unknown> | null;
  mediaAssets?: any[];
  inputParams?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  seenByUser?: boolean;
}

export const FEATURE_ROUTES: Record<JobKind, string> = {
  STEM_SEPARATION: "/stems",
  MEDIA_DOWNLOAD: "/download",
  TRANSLATE_SPEAK: "/translate",
  CHORD_DETECTION: "/chords",
  MASHUP_RENDER: "/mashup",
  MEDIA_CONVERSION: "/convert",
};

export const FEATURE_NAMES: Record<JobKind, string> = {
  STEM_SEPARATION: "Stem Splitter",
  MEDIA_DOWNLOAD: "Link Downloader",
  TRANSLATE_SPEAK: "Translate & Speak",
  CHORD_DETECTION: "Chord Finder",
  MASHUP_RENDER: "Mashup Studio",
  MEDIA_CONVERSION: "Media Converter",
};

interface JobsContextType {
  jobs: Record<string, JobState>;
  activeJobs: JobState[];
  recentJobs: JobState[];
  latestByType: Record<JobKind, JobState | null>;
  isConnected: boolean;
  unseenJobIds: Set<string>;
  getJob: (jobId?: string | null) => JobState | null;
  getLatestJobForType: (type: JobKind) => JobState | null;
  unseenCountForType: (type: JobKind) => number;
  cancelJob: (jobId: string) => Promise<boolean>;
  markJobSeen: (jobId: string) => Promise<void>;
  trackJob: (jobId: string, type: JobKind) => void;
  refreshJobs: () => Promise<void>;
}

const JobsContext = createContext<JobsContextType | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [unseenJobIds, setUnseenJobIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const pathname = usePathname();
  const currentPathRef = useRef(pathname);
  currentPathRef.current = pathname;

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Rehydrate jobs from the server DB
  const refreshJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs?active=1&recent=1&limit=30");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.jobs)) {
        setJobs((prev) => {
          const next = { ...prev };
          const unseen = new Set<string>();

          for (const j of data.jobs) {
            next[j.id] = { ...next[j.id], ...j };
            if (
              (j.status === "COMPLETED" || j.status === "FAILED") &&
              !j.seenByUser
            ) {
              unseen.add(j.id);
            }
          }
          setUnseenJobIds(unseen);
          return next;
        });
      }
    } catch {
      // transient network error
    }
  }, []);

  // Handle incoming realtime job payload
  const handleJobPayload = useCallback((payload: any) => {
    if (!payload?.jobId) return;

    setJobs((prev) => {
      const existing = prev[payload.jobId] || {
        id: payload.jobId,
        type: payload.type || "MEDIA_CONVERSION",
        status: "PROCESSING",
        stage: "ANALYSIS",
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const wasActive = existing.status === "PROCESSING" || existing.status === "PENDING";
      const isNowTerminal =
        payload.status === "COMPLETED" ||
        payload.status === "FAILED" ||
        payload.status === "CANCELLED";

      const updated: JobState = {
        ...existing,
        ...payload,
        id: payload.jobId,
        mediaAssets: payload.mediaAssets || existing.mediaAssets,
        updatedAt: payload.updatedAt || new Date().toISOString(),
      };

      // Toast when job finishes in the background while user is on another route
      if (wasActive && isNowTerminal) {
        const featureRoute = FEATURE_ROUTES[updated.type] || "/";
        const isCurrentRoute = currentPathRef.current?.startsWith(featureRoute);

        if (!isCurrentRoute) {
          const featureName = FEATURE_NAMES[updated.type] || "Job";
          if (updated.status === "COMPLETED") {
            toast.success(
              `${featureName} complete!`,
              `Your job has finished and is ready to view.`
            );
            setUnseenJobIds((prevSet) => new Set(prevSet).add(updated.id));
          } else if (updated.status === "FAILED") {
            toast.error(
              `${featureName} failed`,
              updated.error || "An error occurred during processing."
            );
            setUnseenJobIds((prevSet) => new Set(prevSet).add(updated.id));
          }
        }
      }

      return {
        ...prev,
        [payload.jobId]: updated,
      };
    });
  }, []);

  // Connect SSE with polling fallback
  const connectRealtime = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const es = new EventSource("/api/realtime?scope=me");
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleJobPayload(payload);
        } catch {}
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Fallback polling every 3 seconds
        if (!pollTimerRef.current) {
          pollTimerRef.current = setInterval(() => {
            refreshJobs();
          }, 3000);
        }

        // Attempt SSE reconnect with exponential backoff
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectRealtime();
          }, 5000);
        }
      };
    } catch {
      setIsConnected(false);
    }
  }, [handleJobPayload, refreshJobs]);

  useEffect(() => {
    refreshJobs();
    connectRealtime();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectRealtime, refreshJobs]);

  // Operations
  const trackJob = useCallback((jobId: string, type: JobKind) => {
    setJobs((prev) => {
      const existing = prev[jobId] || {
        id: jobId,
        type,
        status: "PENDING",
        stage: "ANALYSIS",
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [jobId]: { ...existing, type },
      };
    });
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
      if (res.ok) {
        setJobs((prev) => {
          if (!prev[jobId]) return prev;
          return {
            ...prev,
            [jobId]: {
              ...prev[jobId],
              status: "CANCELLED",
              stage: "FAILED",
              message: "Job cancelled by user request",
            },
          };
        });
        toast.info("Job Cancelled", `Job ${jobId.substring(0, 8)} was cancelled.`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const markJobSeen = useCallback(async (jobId: string): Promise<void> => {
    setUnseenJobIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });

    setJobs((prev) => {
      if (!prev[jobId]) return prev;
      return {
        ...prev,
        [jobId]: { ...prev[jobId], seenByUser: true },
      };
    });

    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seenByUser: true }),
      });
    } catch {}
  }, []);

  const getJob = useCallback(
    (jobId?: string | null): JobState | null => {
      if (!jobId) return null;
      return jobs[jobId] || null;
    },
    [jobs]
  );

  const getLatestJobForType = useCallback(
    (type: JobKind): JobState | null => {
      const matches = Object.values(jobs)
        .filter((j) => j.type === type)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return matches[0] || null;
    },
    [jobs]
  );

  const unseenCountForType = useCallback(
    (type: JobKind): number => {
      let count = 0;
      for (const id of Array.from(unseenJobIds)) {
        if (jobs[id]?.type === type) count++;
      }
      return count;
    },
    [jobs, unseenJobIds]
  );

  const activeJobs = Object.values(jobs)
    .filter((j) => j.status === "PENDING" || j.status === "PROCESSING")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentJobs = Object.values(jobs)
    .filter((j) => j.status === "COMPLETED" || j.status === "FAILED" || j.status === "CANCELLED")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  const latestByType: Record<JobKind, JobState | null> = {
    STEM_SEPARATION: getLatestJobForType("STEM_SEPARATION"),
    MEDIA_DOWNLOAD: getLatestJobForType("MEDIA_DOWNLOAD"),
    TRANSLATE_SPEAK: getLatestJobForType("TRANSLATE_SPEAK"),
    CHORD_DETECTION: getLatestJobForType("CHORD_DETECTION"),
    MASHUP_RENDER: getLatestJobForType("MASHUP_RENDER"),
    MEDIA_CONVERSION: getLatestJobForType("MEDIA_CONVERSION"),
  };

  return (
    <JobsContext.Provider
      value={{
        jobs,
        activeJobs,
        recentJobs,
        latestByType,
        isConnected,
        unseenJobIds,
        getJob,
        getLatestJobForType,
        unseenCountForType,
        cancelJob,
        markJobSeen,
        trackJob,
        refreshJobs,
      }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs(): JobsContextType {
  const ctx = useContext(JobsContext);
  if (!ctx) {
    throw new Error("useJobs must be used within a JobsProvider");
  }
  return ctx;
}
