"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scissors,
  Download,
  Languages,
  Sparkles,
  Layers,
  ArrowLeftRight,
} from "lucide-react";
import { useJobs, FEATURE_ROUTES, FEATURE_NAMES, JobState } from "@/lib/jobs-context";
import { JobKind } from "@/domain/value-objects/JobStatus";

const FEATURE_ICONS: Record<JobKind, React.ElementType> = {
  STEM_SEPARATION: Scissors,
  MEDIA_DOWNLOAD: Download,
  TRANSLATE_SPEAK: Languages,
  CHORD_DETECTION: Sparkles,
  MASHUP_RENDER: Layers,
  MEDIA_CONVERSION: ArrowLeftRight,
};

export const ActivityTray: React.FC = () => {
  const { activeJobs, recentJobs, cancelJob, markJobSeen } = useJobs();
  const [isExpanded, setIsExpanded] = useState(false);

  const displayJobs = [...activeJobs, ...recentJobs.slice(0, 4)];

  if (displayJobs.length === 0) {
    return null;
  }

  const runningCount = activeJobs.length;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full font-sans">
      <div className="bg-mono-bgAlt border-hairline rounded-sm shadow-xl overflow-hidden backdrop-blur-md">
        {/* Header Bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer bg-mono-bg hover:bg-mono-bgAlt transition-colors border-b-hairline select-none"
        >
          <div className="flex items-center gap-2">
            {runningCount > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : (
              <Activity className="w-3.5 h-3.5 text-mono-inkMuted stroke-[1.5]" />
            )}
            <span className="text-xs font-semibold tracking-tight text-mono-ink">
              Activity {runningCount > 0 ? `(${runningCount} running)` : `(${displayJobs.length})`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-mono-inkMuted">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        {/* Expanded List */}
        {isExpanded && (
          <div className="max-h-80 overflow-y-auto divide-y divide-mono-hairline p-1">
            {displayJobs.map((job) => {
              const Icon = FEATURE_ICONS[job.type] || Activity;
              const route = FEATURE_ROUTES[job.type] || "/";
              const isRunning = job.status === "PROCESSING" || job.status === "PENDING";
              const isSuccess = job.status === "COMPLETED";
              const isFailed = job.status === "FAILED";
              const isCancelled = job.status === "CANCELLED";

              return (
                <div key={job.id} className="p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="w-3.5 h-3.5 shrink-0 text-mono-inkMuted" />
                      <span className="font-medium text-mono-ink truncate">
                        {FEATURE_NAMES[job.type] || job.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isRunning && (
                        <button
                          type="button"
                          onClick={() => cancelJob(job.id)}
                          className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider border-hairline hover:bg-rose-500/10 hover:text-rose-400 transition-colors rounded-sm"
                        >
                          Cancel
                        </button>
                      )}

                      <Link
                        href={route}
                        onClick={() => markJobSeen(job.id)}
                        className="flex items-center gap-0.5 text-[11px] text-mono-inkMuted hover:text-mono-ink underline decoration-mono-hairline"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Stage text and status */}
                  <div className="flex items-center justify-between text-[11px] text-mono-inkMuted">
                    <div className="flex items-center gap-1 truncate max-w-[200px]">
                      {isRunning && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                      {isSuccess && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                      {isFailed && <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />}
                      <span className="truncate">{job.message || job.stage}</span>
                    </div>
                    <span className="font-mono text-[10px] shrink-0">{Math.round(job.progress)}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 bg-mono-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isSuccess
                          ? "bg-emerald-500"
                          : isFailed
                          ? "bg-rose-500"
                          : isCancelled
                          ? "bg-mono-inkMuted"
                          : "bg-mono-ink"
                      }`}
                      style={{ width: `${Math.max(2, Math.min(100, job.progress))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTray;
