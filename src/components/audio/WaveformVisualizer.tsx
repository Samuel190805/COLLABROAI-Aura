"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

export interface WaveformVisualizerProps {
  waveformData?: number[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  height?: number;
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  waveformData,
  currentTime,
  duration,
  onSeek,
  height = 36,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const peaks =
    waveformData && waveformData.length > 0
      ? waveformData
      : [
          0.2, 0.4, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9, 0.4, 0.6, 0.8, 0.7, 0.5, 0.3, 0.6,
          0.8, 0.9, 0.7, 0.4, 0.6, 0.5, 0.8, 0.6, 0.4, 0.7, 0.9, 0.8, 0.5, 0.3, 0.6,
          0.8, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9, 0.4, 0.6, 0.8, 0.7, 0.5, 0.3,
        ];

  const progressFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.min(1, Math.max(0, clickX / rect.width));
    onSeek(fraction * duration);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{ height }}
      className={cn(
        "relative w-full flex items-center gap-[2px] cursor-pointer py-1 select-none",
        className
      )}
    >
      {peaks.map((peak, idx) => {
        const barFraction = idx / peaks.length;
        const isPlayed = barFraction <= progressFraction;

        return (
          <div
            key={idx}
            className={cn(
              "flex-1 transition-all duration-75",
              isPlayed ? "bg-mono-ink" : "bg-mono-line"
            )}
            style={{
              height: `${Math.max(10, peak * 100)}%`,
            }}
          />
        );
      })}

      {/* Hairline playhead */}
      <div
        className="absolute top-0 bottom-0 w-[1px] bg-mono-ink pointer-events-none transition-all duration-75"
        style={{
          left: `${progressFraction * 100}%`,
        }}
      />
    </div>
  );
};

export default WaveformVisualizer;
