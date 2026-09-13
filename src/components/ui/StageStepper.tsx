"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StageStep {
  id: string;
  label: string;
}

export interface StageStepperProps {
  stages: StageStep[];
  currentStageId: string;
  progressPercent?: number; // 0 to 100
  isCompleted?: boolean;
  isFailed?: boolean;
  className?: string;
}

export const StageStepper: React.FC<StageStepperProps> = ({
  stages,
  currentStageId,
  progressPercent = 0,
  isCompleted = false,
  isFailed = false,
  className,
}) => {
  const currentIndex = stages.findIndex(
    (s) => s.id.toUpperCase() === currentStageId.toUpperCase()
  );

  // Compute hairline progress width
  const totalStages = Math.max(1, stages.length - 1);
  const activeFraction = isCompleted
    ? 1.0
    : currentIndex >= 0
    ? Math.max(0, Math.min(1, (currentIndex + (progressPercent % 25) / 25 * 0.8) / totalStages))
    : 0;

  return (
    <div className={cn("w-full py-3", className)}>
      {/* Stage Labels Bar */}
      <div className="flex items-center justify-between mb-2">
        {stages.map((stage, idx) => {
          const isCurrent = !isCompleted && currentIndex === idx && !isFailed;
          const isPast = isCompleted || (currentIndex > idx && !isFailed);

          return (
            <div key={stage.id} className="flex items-center gap-1.5">
              <span className={cn(
                "font-mono text-[11px] tabular-nums",
                isCurrent ? "text-mono-ink font-bold" : isPast ? "text-mono-ink" : "text-mono-inkMuted"
              )}>
                0{idx + 1}
              </span>
              <span className={cn(
                "text-xs tracking-tight uppercase font-medium",
                isCurrent ? "text-mono-ink font-semibold" : isPast ? "text-mono-ink" : "text-mono-inkMuted"
              )}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Thin Horizontal Moving Hairline Tracker */}
      <div className="relative w-full h-[1px] bg-mono-line overflow-hidden">
        <div
          className={cn(
            "absolute top-0 bottom-0 left-0 transition-all duration-200",
            isFailed ? "bg-mono-inkMuted opacity-50" : "bg-mono-ink"
          )}
          style={{ width: `${Math.round(activeFraction * 100)}%` }}
        />
      </div>

      {/* Progress percentage readout */}
      <div className="flex items-center justify-between mt-1.5 font-mono text-[10px] text-mono-inkMuted">
        <span>{isFailed ? "PROCESS INTERRUPTED" : isCompleted ? "COMPLETED" : "PROCESSING"}</span>
        <span className="tabular-nums font-medium text-mono-ink">
          {isCompleted ? "100%" : `${Math.round(progressPercent)}%`}
        </span>
      </div>
    </div>
  );
};

export default StageStepper;
