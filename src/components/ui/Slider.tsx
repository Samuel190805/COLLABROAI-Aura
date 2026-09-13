"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  orientation?: "horizontal" | "vertical";
  label?: string;
  showValue?: boolean;
  valueFormatter?: (val: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      min = 0,
      max = 100,
      step = 1,
      onChange,
      orientation = "horizontal",
      label,
      showValue = false,
      valueFormatter = (v) => `${v}`,
      disabled,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    if (orientation === "vertical") {
      return (
        <div className={cn("flex flex-col items-center gap-2 select-none h-48", className)}>
          {showValue && (
            <span className="font-mono text-[10px] tabular-nums text-mono-inkMuted">
              {valueFormatter(value)}
            </span>
          )}
          <div className="relative flex-1 w-6 flex items-center justify-center">
            {/* Center rail */}
            <div className="w-[1px] h-full bg-mono-line relative">
              {/* Fill indicator */}
              <div
                className="absolute bottom-0 left-0 w-full bg-mono-ink"
                style={{ height: `${percentage}%` }}
              />
            </div>
            {/* Native slider hidden overlay */}
            <input
              ref={ref}
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              {...props}
            />
            {/* Flat thumb handle */}
            <div
              className="absolute w-5 h-2 bg-mono-ink border border-mono-bg pointer-events-none transition-transform duration-75"
              style={{
                bottom: `calc(${percentage}% - 4px)`,
              }}
            />
          </div>
          {label && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-mono-inkMuted">
              {label}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className={cn("w-full flex flex-col gap-1 select-none", className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between text-xs font-mono text-mono-inkMuted px-0.5 text-[11px]">
            {label && <span>{label}</span>}
            {showValue && <span className="tabular-nums text-mono-ink font-medium">{valueFormatter(value)}</span>}
          </div>
        )}
        <div className="relative flex items-center h-4">
          <div className="w-full h-[1px] bg-mono-line relative overflow-hidden">
            <div
              className="h-full bg-mono-ink"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />
          <div
            className="absolute w-2.5 h-3 bg-mono-ink border border-mono-bg pointer-events-none transition-transform duration-75"
            style={{
              left: `calc(${percentage}% - 5px)`,
            }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = "Slider";
export default Slider;
