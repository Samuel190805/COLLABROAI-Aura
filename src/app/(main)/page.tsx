"use client";

import React from "react";
import Link from "next/link";
import {
  Scissors,
  Download,
  Languages,
  Layers,
  Sparkles,
  Music2,
  Video,
  ArrowRight,
  ArrowLeftRight,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StemWaveSplittingHero } from "@/components/visual/StemWaveSplittingHero";

const TOOLS = [
  {
    num: "01",
    title: "Vocal / Instrument Splitter",
    href: "/stems",
    desc: "Direct two-source neural separation (Demucs v4 or DSP center-channel phase cancellation) isolating Vocals and Instrument tracks.",
    icon: Scissors,
    tag: "2-STEM ONLY",
  },
  {
    num: "02",
    title: "Link Downloader",
    href: "/download",
    desc: "Extract and transcode lossless audio & video from web URLs directly to MP3, WAV, FLAC, or MP4.",
    icon: Download,
    tag: "YT-DLP STREAM",
  },
  {
    num: "03",
    title: "Translate & Speak",
    href: "/translate",
    desc: "Speech-to-speech translation pipeline: Whisper ASR transcription, neural translation, and voice-preserved speech synthesis.",
    icon: Languages,
    tag: "ASR → MT → TTS",
  },
  {
    num: "04",
    title: "Mashup Studio",
    href: "/mashup",
    desc: "Pair Vocals from Track A with Instrument from Track B with Camelot Wheel harmonic key matching and automatic tempo stretching.",
    icon: Layers,
    tag: "CAMELOT SYNC",
  },
  {
    num: "05",
    title: "Chord Detector & Practice",
    href: "/chords",
    desc: "Chroma harmonic analysis executed exclusively against the isolated Instrument stem, complete with verified guitar/piano diagrams.",
    icon: Sparkles,
    tag: "INSTRUMENT CHROMA",
  },
  {
    num: "06",
    title: "Local Player Suite",
    href: "/player",
    desc: "Lossless local audio player with 10-band graphic EQ and B&W line-art vinyl view, plus dedicated video player.",
    icon: Music2,
    tag: "10-BAND EQ",
  },
  {
    num: "07",
    title: "Audio \u2194 Video Converter",
    href: "/convert",
    desc: "Extract pristine audio from video containers or render dynamic waveform visualization videos from audio masters.",
    icon: ArrowLeftRight,
    tag: "TRANSCODE & VISUALIZE",
  },
];

export default function HomePage() {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 border-b-hairline">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 bg-mono-ink inline-block" />
          <span className="font-mono text-xs uppercase tracking-widest text-mono-inkMuted">
            AUTONOMOUS LOCAL AUDIO WORKSTATION // V2.0
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8 flex flex-col gap-5">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-mono-ink leading-[0.9] uppercase text-balance">
              PRECISION STEMS. <br />
              HARMONIC REMIXES.
            </h1>

            <p className="text-sm sm:text-base text-mono-inkMuted max-w-2xl font-normal leading-relaxed">
              Local-first, zero-telemetry audio workstation. Strict 2-stem vocal/instrument separation, direct URL extraction, speech translation, and harmonic remixing.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Button href="/stems" variant="primary" pill={false} className="px-6 h-10 font-mono font-bold text-xs uppercase">
                Open 2-Stem Splitter
              </Button>
              <Button href="/mashup" variant="outline" pill={false} className="px-6 h-10 font-mono font-bold text-xs uppercase">
                Mashup Studio
              </Button>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 font-mono text-xs text-mono-inkMuted border-t-hairline lg:border-t-0 lg:border-l-hairline lg:pl-8 pt-6 lg:pt-0">
            <div className="flex items-center justify-between pb-2 border-b-hairline">
              <span>SEPARATION MODEL</span>
              <span className="text-mono-ink font-semibold">2-STEM (VOCALS / INST)</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b-hairline">
              <span>STORAGE DISCIPLINE</span>
              <span className="text-mono-ink font-semibold">AUTOMATIC 24H PURGE</span>
            </div>
            <div className="flex items-center justify-between">
              <span>TELEMETRY</span>
              <span className="text-mono-ink font-semibold">ZERO / LOCAL-FIRST</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Stem Interactive Preview Strip */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-b-hairline">
        <StemWaveSplittingHero />
      </section>

      {/* Six Workstation Tools Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8 pb-3 border-b-hairline">
          <h2 className="font-mono text-xs uppercase tracking-widest text-mono-ink font-bold">
            WORKSTATION TOOLS
          </h2>
          <span className="font-mono text-xs text-mono-inkMuted">6 MODULES ACTIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-mono-line border-hairline">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.num}
                href={tool.href}
                className="bg-mono-bg p-6 flex flex-col justify-between group hover:bg-mono-bgAlt transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-mono-inkMuted">{tool.num}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 border-hairline text-mono-ink">
                      {tool.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 stroke-[1.5] text-mono-ink" />
                    <h3 className="font-mono text-sm font-bold text-mono-ink tracking-tight uppercase">
                      {tool.title}
                    </h3>
                  </div>
                  <p className="text-xs text-mono-inkMuted leading-relaxed">
                    {tool.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t-hairline flex items-center justify-between text-xs font-mono text-mono-ink font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>ENTER TOOL</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Zero Telemetry Banner */}
      <section className="w-full border-t-hairline bg-mono-bgAlt py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-mono-inkMuted">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 stroke-[1.5] text-mono-ink" />
            <span className="text-mono-ink font-semibold">Strict Local Retention</span>
            <span>—</span>
            <span>Audio stays on your machine with automated intermediate cleanups.</span>
          </div>
          <Link href="/status" className="text-mono-ink hover:underline">
            View Engine Status & Storage Health →
          </Link>
        </div>
      </section>
    </div>
  );
}
