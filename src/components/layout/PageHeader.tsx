"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  badge?: string;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  badge,
  title,
  description,
  className,
  children,
}) => {
  return (
    <div className={cn("text-center max-w-4xl mx-auto pt-6 pb-6 px-4 relative flex flex-col items-center", className)}>
      {/* Ambient background soft glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-36 bg-white/[0.03] blur-[100px] rounded-full pointer-events-none -z-10" />

      {badge && (
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest text-neutral-400 bg-white/5 border border-white/10 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <span>{badge}</span>
        </div>
      )}

      <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4 leading-[1.1] animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75">
        {title}
      </h1>

      <p className="text-base sm:text-xl text-neutral-500 dark:text-neutral-400 font-normal max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        {description}
      </p>

      {children && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-200 w-full flex justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
