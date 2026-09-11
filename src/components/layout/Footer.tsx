"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-black/60 backdrop-blur-xl mt-20 relative z-10">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-apple-blue flex items-center justify-center text-white shadow-lg shadow-apple-blue/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white">
                SplitStream
              </span>
              <p className="text-xs text-neutral-400 font-mono">
                Professional AI Audio & Media Suite
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 font-medium">
            <Link href="/stems" className="hover:text-white transition-colors">
              Stem Separator
            </Link>
            <Link href="/download" className="hover:text-white transition-colors">
              Downloader
            </Link>
            <Link href="/translate" className="hover:text-white transition-colors">
              Translate & Speak
            </Link>
            <Link href="/player" className="hover:text-white transition-colors">
              Studio Player
            </Link>
            <Link href="/audio-player" className="hover:text-white transition-colors">
              Local Audio
            </Link>
            <Link href="/video-player" className="hover:text-white transition-colors">
              Local Video
            </Link>
            <Link href="/chords" className="hover:text-white transition-colors">
              Chord Detector
            </Link>
            <Link href="/mashup" className="hover:text-white transition-colors">
              Mashup Creator
            </Link>
            <Link href="/status" className="hover:text-white transition-colors">
              Status & Telemetry
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Retention Retention Discipline</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
          <p>© {new Date().getFullYear()} SplitStream. Hybrid Editorial & Precision Architecture.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-neutral-300 transition-colors">
              Sign In
            </Link>
            <span>•</span>
            <Link href="/signup" className="hover:text-neutral-300 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
