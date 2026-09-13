"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "stem-vocals" | "stem-drums" | "stem-bass" | "stem-other" | "stem-instrumental";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "secondary",
  children,
  ...props
}) => {
  const variants = {
    primary: "bg-white/10 text-white border-white/20 font-mono",
    secondary: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-white/10",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    "stem-vocals": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    "stem-drums": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    "stem-bass": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "stem-other": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "stem-instrumental": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
