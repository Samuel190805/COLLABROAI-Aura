"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, ArrowRight } from "lucide-react";

export const SpeechBubbleHero: React.FC = () => {
  const phrases = [
    {
      sourceLang: "EN",
      sourceText: "Audio separation, media extraction, and speech translation.",
      targetLang: "ES",
      targetText: "Separación de audio, extracción de medios y traducción de voz.",
    },
    {
      sourceLang: "EN",
      sourceText: "Local-first zero telemetry audio workstation.",
      targetLang: "JA",
      targetText: "ローカル優先のゼロテレメトリオーディオワークステーション。",
    },
    {
      sourceLang: "FR",
      sourceText: "Une expérience sonore fluide et professionnelle.",
      targetLang: "EN",
      targetText: "A seamless and professional audio experience.",
    },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [phrases.length]);

  const current = phrases[index];

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full max-w-xl p-5 rounded-sm border-hairline bg-mono-bg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-hairline">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mono-ink flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 stroke-[1.5]" /> Neural Speech-to-Speech (ASR → MT → TTS)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 border-hairline text-mono-ink">
            {current.sourceLang} → {current.targetLang}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3"
          >
            {/* Input Speech Card */}
            <div className="p-3 border-hairline bg-mono-bgAlt rounded-sm">
              <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] text-mono-inkMuted uppercase">
                <Mic className="w-3 h-3 stroke-[1.5]" />
                <span>ORIGINAL SPEECH ({current.sourceLang})</span>
              </div>
              <p className="text-xs font-medium text-mono-ink">
                &ldquo;{current.sourceText}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-center text-mono-inkMuted">
              <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
            </div>

            {/* Synthesized Output Card */}
            <div className="p-3 border-hairline bg-mono-bg rounded-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-mono text-[10px] text-mono-ink uppercase">
                  <Volume2 className="w-3 h-3 stroke-[1.5]" />
                  <span>SYNTHESIZED SPEECH ({current.targetLang})</span>
                </div>
                <span className="font-mono text-[10px] text-mono-inkMuted">VOICE PRESERVED</span>
              </div>
              <p className="text-xs font-medium text-mono-ink">
                &ldquo;{current.targetText}&rdquo;
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SpeechBubbleHero;
