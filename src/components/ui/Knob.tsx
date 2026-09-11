"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface KnobProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  size?: number;
  label?: string;
  unit?: string;
  accentColor?: string;
  onChange: (value: number) => void;
  className?: string;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  min = -100,
  max = 100,
  step = 1,
  size = 48,
  label,
  unit = "",
  accentColor = "#0071E3",
  onChange,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(value);

  const percentage = Math.min(1, Math.max(0, (value - min) / (max - min)));
  // Map to 270 degree rotation arc (-135deg to +135deg)
  const rotationDeg = -135 + percentage * 270;

  const handleStart = (clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startValRef.current = value;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientY);
    }
  };

  const handleMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      const dy = startYRef.current - clientY;
      const range = max - min;
      const deltaVal = (dy / 100) * range;
      const rawNext = startValRef.current + deltaVal;
      const steppedVal = Math.round(rawNext / step) * step;
      const nextVal = Math.min(max, Math.max(min, steppedVal));
      onChange(nextVal);
    },
    [isDragging, max, min, step, onChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientY);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientY);
      }
    },
    [handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(Math.min(max, value + (step || 5)));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(Math.max(min, value - (step || 5)));
    }
  };

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      <div
        role="slider"
        aria-label={label || "Control Knob"}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ width: size, height: size }}
        className="relative rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300/80 dark:border-white/10 shadow-inner flex items-center justify-center cursor-ns-resize focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/50"
      >
        <div
          className="w-1.5 h-1.5 rounded-full absolute transition-transform duration-75 pointer-events-none"
          style={{
            top: 6,
            backgroundColor: accentColor,
            transform: `rotate(${rotationDeg}deg)`,
            transformOrigin: `50% ${size / 2 - 6}px`,
          }}
        />
        <div className="w-6 h-6 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm pointer-events-none" />
      </div>
      {label && (
        <span className="mt-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
          {label}
        </span>
      )}
      <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-300 font-medium">
        {value > 0 ? `+${value}` : value}
        {unit}
      </span>
    </div>
  );
};

export default Knob;
