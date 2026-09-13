"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-mono-inkMuted mb-1.5 uppercase tracking-wider font-mono text-[11px]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full appearance-none rounded-sm bg-mono-bg border-hairline px-3.5 py-2 pr-9 text-xs text-mono-ink transition-colors duration-150 focus:border-mono-ink focus:outline-none focus:ring-1 focus:ring-mono-ink cursor-pointer font-mono",
              error && "border-mono-ink",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-mono-bg text-mono-ink"
              >
                {opt.label} {opt.sublabel ? `(${opt.sublabel})` : ""}
              </option>
            ))}
          </select>
          <div className="absolute right-3 pointer-events-none text-mono-inkMuted">
            <ChevronDown className="w-3.5 h-3.5 stroke-[1.5]" />
          </div>
        </div>
        {error && (
          <p className="mt-1 text-xs text-mono-ink font-mono">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
