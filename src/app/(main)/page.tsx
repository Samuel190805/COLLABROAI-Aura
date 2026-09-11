"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sliders,
  Download,
  Languages,
  Music,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Zap,
  Cpu,
  Flame,
  Activity,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MagneticWrapper } from "@/components/cursor/MagneticWrapper";
import { StemWaveSplittingHero } from "@/components/visual/StemWaveSplittingHero";
import { LinkMorphHero } from "@/components/visual/LinkMorphHero";
import { SpeechBubbleHero } from "@/components/visual/SpeechBubbleHero";
import { ChordHero } from "@/components/visual/ChordHero";
import { MashupHero } from "@/components/visual/MashupHero";
import { AudioVisualizerCanvas } from "@/components/visual/AudioVisualizerCanvas";
import { FullscreenOverlayNav } from "@/components/layout/FullscreenOverlayNav";

export default function HomePage() {
  const [overlayOpen, setOverlayOpen] = useState(false);

  const scrollToFirstChapter = () => {
    const el = document.getElementById("chapter-stems");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* =========================================================================
          HERO CHAPTER: THE EDITORIAL TITLE DECK
          ========================================================================= */}
      <section className="w-full min-h-[92vh] flex flex-col justify-between pt-28 pb-12 px-6 sm:px-12 max-w-7xl mx-auto relative">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-apple-blue/15 blur-[150px] rounded-full pointer-events-none -z-10" />

        {/* Top Header Tag */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-apple-blue bg-apple-blue/10 border border-apple-blue/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous AI Audio Laboratory</span>
          </div>

          <span className="font-mono text-xs text-neutral-500 hidden sm:inline-block">
            V1.0 // ZERO-RETENTION DISCIPLINE
          </span>
        </div>

        {/* Massive Editorial Asymmetric Title */}
        <div className="my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4"
          >
            <div className="font-mono text-xs sm:text-sm font-semibold tracking-widest text-neutral-400">
              SIX STUDIO-GRADE CAPABILITIES • ONE UNIFIED SUITE
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white leading-[0.88] text-balance">
              PRECISION STEMS. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-apple-blueAccent">
                HARMONIC REMIXES.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-neutral-400 max-w-2xl font-normal leading-relaxed mt-2">
              Deep neural de-mixing, Camelot key collision, lossless link extraction, and voice-preserving speech translation — with strict zero-bloat storage retention.
            </p>
          </motion.div>

          {/* Action CTAs with Magnetic Physics */}
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <MagneticWrapper strength={0.3}>
              <Button href="/stems" size="lg" className="flex items-center gap-2 shadow-apple bg-apple-blue hover:bg-apple-blueHover text-white">
                <Sliders className="w-4 h-4" /> Separate Stems
              </Button>
            </MagneticWrapper>

            <MagneticWrapper strength={0.3}>
              <Button href="/mashup" variant="glass" size="lg" className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> Mashup Studio
              </Button>
            </MagneticWrapper>

            <MagneticWrapper strength={0.3}>
              <button
                onClick={() => setOverlayOpen(true)}
                className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-semibold transition-all backdrop-blur-md"
              >
                Browse All 6 Tools →
              </button>
            </MagneticWrapper>
          </div>
        </div>

        {/* Bottom Giant Stat Callouts & Scroll Cue */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">6-STEM</span>
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Demucs Ensemble</p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">-14 LUFS</span>
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Master Loudness</p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">30+</span>
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Voice Languages</p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">0 KB</span>
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Storage Bloat</p>
            </div>
          </div>

          <button
            onClick={scrollToFirstChapter}
            className="flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors group"
          >
            <span>DISCOVER CHAPTERS</span>
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-y-0.5 transition-transform">
              <ArrowDown className="w-3 h-3 text-apple-blue" />
            </div>
          </button>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 01: STEM SEPARATOR (Asymmetric Left-Aligned Text, Right Visual)
          ========================================================================= */}
      <section
        id="chapter-stems"
        className="w-full min-h-[90vh] py-24 px-6 sm:px-12 border-t border-white/10 flex items-center"
      >
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Block */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tracking-widest text-indigo-400">
                01 // DEMIXING
              </span>
              <span className="w-8 h-[1px] bg-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Meta Demucs v4
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.92] text-balance">
              Isolate the <br />
              unisolatable.
            </h2>

            <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed font-normal">
              Extract individual Vocals, Drums, Bass, Piano, and Guitar with state-of-the-art hybrid transformers and post-separation spectral denoising.
            </p>

            <div className="flex items-center gap-8 pt-4 border-t border-white/10 font-mono">
              <div>
                <span className="text-2xl font-bold text-white">44.1 kHz</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Sample Rate</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">32-bit</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Float Depth</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-indigo-400">Zero Bleed</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Denoise Pass</p>
              </div>
            </div>

            <div className="pt-4">
              <MagneticWrapper strength={0.3}>
                <Button href="/stems" size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-apple">
                  <span>Open Stem Separator</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </MagneticWrapper>
            </div>
          </div>

          {/* Right Signature Visual */}
          <div className="lg:col-span-5">
            <StemWaveSplittingHero />
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 02: UNIVERSAL DOWNLOADER (Asymmetric Right-Aligned Text, Left Visual)
          ========================================================================= */}
      <section className="w-full min-h-[90vh] py-24 px-6 sm:px-12 border-t border-white/10 bg-white/[0.01] flex items-center">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Signature Visual */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <LinkMorphHero />
          </div>

          {/* Right Text Block */}
          <div className="lg:col-span-7 flex flex-col gap-6 order-1 lg:order-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tracking-widest text-blue-400">
                02 // EXTRACTION
              </span>
              <span className="w-8 h-[1px] bg-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                FFprobe Validated
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.92] text-balance">
              Lossless streams. <br />
              Zero noise.
            </h2>

            <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed font-normal">
              Server-side stream extraction directly from remote media sources into verified 320 kbps MP3, FLAC, and 1080p MP4 with automatic loudness mastering.
            </p>

            <div className="flex items-center gap-8 pt-4 border-t border-white/10 font-mono">
              <div>
                <span className="text-2xl font-bold text-white">320 kbps</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Max Audio Bitrate</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">1080p</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Full HD Video</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-blue-400">Auto-Tag</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Fingerprinting</p>
              </div>
            </div>

            <div className="pt-4">
              <MagneticWrapper strength={0.3}>
                <Button href="/download" size="lg" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-apple">
                  <span>Open Universal Downloader</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </MagneticWrapper>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 03: TRANSLATE & SPEAK (Asymmetric Left-Aligned Text, Right Visual)
          ========================================================================= */}
      <section className="w-full min-h-[90vh] py-24 px-6 sm:px-12 border-t border-white/10 flex items-center">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Block */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tracking-widest text-emerald-400">
                03 // TRANSLATION
              </span>
              <span className="w-8 h-[1px] bg-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Neural Formant Shaper
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.92] text-balance">
              Your voice in <br />
              every tongue.
            </h2>

            <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed font-normal">
              Translate speech across 30+ languages while preserving the acoustic pitch, timbre, cadence, and emotion of the original speaker.
            </p>

            <div className="flex items-center gap-8 pt-4 border-t border-white/10 font-mono">
              <div>
                <span className="text-2xl font-bold text-white">30+</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Global Languages</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">Whisper</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Neural ASR</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-emerald-400">Diarized</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Multi-Speaker</p>
              </div>
            </div>

            <div className="pt-4">
              <MagneticWrapper strength={0.3}>
                <Button href="/translate" size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-apple">
                  <span>Open Translate & Speak</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </MagneticWrapper>
            </div>
          </div>

          {/* Right Signature Visual */}
          <div className="lg:col-span-5">
            <SpeechBubbleHero />
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 04: STUDIO MEDIA PLAYER (Asymmetric Right-Aligned Text, Left Visual)
          ========================================================================= */}
      <section className="w-full min-h-[90vh] py-24 px-6 sm:px-12 border-t border-white/10 bg-white/[0.01] flex items-center">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Signature Visual Stage */}
          <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl">
            <div className="w-full flex items-center justify-between mb-4 text-xs font-mono text-neutral-400">
              <span>ACOUSTIC SPECTRUM</span>
              <span className="text-amber-400">5-BAND EQ ACTIVE</span>
            </div>
            <AudioVisualizerCanvas isPlaying={true} barCount={48} height={120} color="#F59E0B" className="w-full" />
            <div className="w-full flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-neutral-500">
              <span>60Hz • 250Hz • 1kHz • 4kHz • 16kHz</span>
              <span>KARAOKE SYNC</span>
            </div>
          </div>

          {/* Right Text Block */}
          <div className="lg:col-span-7 flex flex-col gap-6 order-1 lg:order-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tracking-widest text-amber-400">
                04 // PLAYBACK
              </span>
              <span className="w-8 h-[1px] bg-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Studio Fidelity
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.92] text-balance">
              Studio acoustics <br />
              in your browser.
            </h2>

            <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed font-normal">
              High-resolution playback with a 5-band studio parametric equalizer, bass maximizer, synchronized Whisper lyrics, and instant pipeline routing.
            </p>

            <div className="flex items-center gap-8 pt-4 border-t border-white/10 font-mono">
              <div>
                <span className="text-2xl font-bold text-white">5-Band</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Graphic EQ</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">Whisper</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Karaoke Lyrics</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-amber-400">Local-First</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">IndexedDB</p>
              </div>
            </div>

            <div className="pt-4">
              <MagneticWrapper strength={0.3}>
                <Button href="/player" size="lg" className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-apple">
                  <span>Open Studio Player</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </MagneticWrapper>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 05: CHORD DETECTOR (Asymmetric Left-Aligned Text, Right Visual)
          ========================================================================= */}
      <section className="w-full min-h-[90vh] py-24 px-6 sm:px-12 border-t border-white/10 flex items-center">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Block */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tracking-widest text-amber-400">
                05 // HARMONY
              </span>
              <span className="w-8 h-[1px] bg-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Stem Chroma AI
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.92] text-balance">
              Every chord <br />
              decoded live.
            </h2>

            <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed font-normal">
              Detect harmonic progressions by isolating the bassline and harmonics. Practice with interactive Guitar, Piano, and Ukulele charts and live mic pitch detection.
            </p>

            <div className="flex items-center gap-8 pt-4 border-t border-white/10 font-mono">
              <div>
                <span className="text-2xl font-bold text-white">3</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Instruments</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">±6 st</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Transpose</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-amber-400">Live Mic</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Practice Mode</p>
              </div>
            </div>

            <div className="pt-4">
              <MagneticWrapper strength={0.3}>
                <Button href="/chords" size="lg" className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 shadow-apple">
                  <span>Open Chord Detector</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </MagneticWrapper>
            </div>
          </div>

          {/* Right Signature Visual */}
          <div className="lg:col-span-5">
            <ChordHero />
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 06: MASHUP CREATOR (Asymmetric Right-Aligned Text, Left Visual)
          ========================================================================= */}
      <section className="w-full min-h-[90vh] py-24 px-6 sm:px-12 border-t border-white/10 bg-white/[0.01] flex items-center">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Signature Visual */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <MashupHero />
          </div>

          {/* Right Text Block */}
          <div className="lg:col-span-7 flex flex-col gap-6 order-1 lg:order-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tracking-widest text-rose-400">
                06 // REMIXING
              </span>
              <span className="w-8 h-[1px] bg-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Camelot Harmonic Mixing
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.92] text-balance">
              Harmonic collision <br />
              engineering.
            </h2>

            <p className="text-base sm:text-lg text-neutral-400 max-w-lg leading-relaxed font-normal">
              Blend stems from any two songs with automated Camelot key alignment, phase-locked beat matching, and -14 LUFS mastering.
            </p>

            <div className="flex items-center gap-8 pt-4 border-t border-white/10 font-mono">
              <div>
                <span className="text-2xl font-bold text-white">±4 st</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Quality Safety Cap</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">Phase Lock</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Beat Sync</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-rose-400">Rubberband</span>
                <p className="text-[10px] text-neutral-400 uppercase font-sans">Pitch Engine</p>
              </div>
            </div>

            <div className="pt-4">
              <MagneticWrapper strength={0.3}>
                <Button href="/mashup" size="lg" className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-apple">
                  <span>Open AI Mashup Creator</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </MagneticWrapper>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          GRAND FINALE CTA: THE COMPLETE LAB
          ========================================================================= */}
      <section className="w-full py-32 px-6 sm:px-12 border-t border-white/10 relative overflow-hidden text-center flex flex-col items-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-apple-blue/20 blur-[160px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <span className="font-mono text-xs uppercase tracking-widest text-apple-blue font-bold">
            READY TO TRANSFORM YOUR MEDIA?
          </span>

          <h2 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white leading-[0.88] text-balance">
            ENTER THE AUDIO LAB.
          </h2>

          <p className="text-base sm:text-xl text-neutral-400 max-w-xl font-normal">
            Select any capability from the overlay menu or start with stem separation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <MagneticWrapper strength={0.35}>
              <button
                onClick={() => setOverlayOpen(true)}
                className="px-8 py-4 rounded-full bg-white text-black hover:bg-neutral-200 text-sm font-black tracking-tight shadow-apple transition-all active:scale-95 flex items-center gap-2"
              >
                <span>Browse All Features</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </MagneticWrapper>

            <MagneticWrapper strength={0.35}>
              <Button href="/stems" variant="glass" size="lg" className="px-8 py-4 rounded-full text-sm font-bold">
                Start Stem Isolation
              </Button>
            </MagneticWrapper>
          </div>
        </div>
      </section>

      {/* Fullscreen Overlay Menu State */}
      <FullscreenOverlayNav
        isOpen={overlayOpen}
        onClose={() => setOverlayOpen(false)}
      />
    </div>
  );
}
