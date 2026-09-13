"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ModeAHeroStat {
  label: string;
  value: string;
  sublabel?: string;
}

export interface ModeAHeroProps {
  chapterNumber: string;
  badge?: string;
  headline: string;
  subheadline: string;
  description: string;
  stats?: ModeAHeroStat[];
  visualComponent?: React.ReactNode;
  toolAnchorId: string;
  toolCtaText?: string;
  align?: "left" | "right";
  condensed?: boolean;
}

export const ModeAHero: React.FC<ModeAHeroProps> = ({
  chapterNumber,
  badge,
  headline,
  subheadline,
  description,
  stats = [],
  visualComponent,
  toolAnchorId,
  toolCtaText = "Open Workspace",
  align = "left",
  condensed = false,
}) => {
  const scrollToTool = () => {
    const el = document.getElementById(toolAnchorId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      className={`w-full relative flex flex-col justify-center border-b-hairline ${
        condensed ? "pt-16 pb-12" : "pt-20 pb-16"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* Chapter Index + Badge */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold tracking-widest text-mono-ink uppercase">
            {chapterNumber}
          </span>
          <span className="w-6 h-[1px] bg-mono-line" />
          {badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border-hairline text-mono-ink">
              {badge}
            </span>
          )}
        </div>

        {/* Editorial Grid */}
        <div
          className={`grid grid-cols-1 ${visualComponent ? "lg:grid-cols-12" : ""} gap-8 lg:gap-12 items-center`}
        >
          {/* Primary Text Column */}
          <div
            className={`${visualComponent ? "lg:col-span-7" : "max-w-3xl"} flex flex-col gap-6`}
          >
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-mono-ink leading-[0.95] text-balance uppercase"
            >
              {headline}
            </motion.h1>

            <div className="flex flex-col gap-2.5 max-w-xl">
              <p className="text-sm sm:text-base font-semibold text-mono-ink tracking-tight">
                {subheadline}
              </p>
              <p className="text-xs sm:text-sm text-mono-inkMuted font-normal leading-relaxed">
                {description}
              </p>
            </div>

            {/* Oversized Stats */}
            {stats.length > 0 && (
              <div className="flex flex-wrap items-center gap-8 pt-4 border-t-hairline">
                {stats.map((st, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-2xl font-bold text-mono-ink font-mono tracking-tight">
                      {st.value}
                    </span>
                    <span className="text-[10px] font-mono text-mono-inkMuted uppercase tracking-wider">
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                pill={true}
                onClick={scrollToTool}
                className="gap-2.5 px-6 h-10 text-xs font-mono font-bold"
              >
                <span>{toolCtaText}</span>
                <ArrowDown className="w-3.5 h-3.5 stroke-[2]" />
              </Button>
            </div>
          </div>

          {/* Visual Column */}
          {visualComponent && (
            <div className="lg:col-span-5 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full"
              >
                {visualComponent}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ModeAHero;
