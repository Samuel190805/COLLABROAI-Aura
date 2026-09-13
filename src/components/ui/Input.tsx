"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-mono-inkMuted mb-1.5 uppercase tracking-wider font-mono text-[11px]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-mono-inkMuted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-sm bg-mono-bg border-hairline px-3.5 py-2 text-xs text-mono-ink placeholder-mono-inkMuted transition-colors duration-150 focus:border-mono-ink focus:outline-none focus:ring-1 focus:ring-mono-ink",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-mono-ink text-mono-ink",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-mono-inkMuted flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-mono-ink font-mono">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
