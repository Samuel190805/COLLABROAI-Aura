"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t-hairline bg-mono-bg text-mono-ink mt-20 relative z-10 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 bg-mono-ink inline-block" />
            <div>
              <span className="font-mono text-xs font-semibold tracking-widest uppercase text-mono-ink">
                SPLITSTREAM
              </span>
              <p className="text-xs text-mono-inkMuted font-mono">
                Local-First Audio & Video Workstation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-mono-inkMuted">
            <Link href="/stems" className="hover:text-mono-ink transition-colors">
              Splitter
            </Link>
            <Link href="/download" className="hover:text-mono-ink transition-colors">
              Downloader
            </Link>
            <Link href="/translate" className="hover:text-mono-ink transition-colors">
              Translate
            </Link>
            <Link href="/mashup" className="hover:text-mono-ink transition-colors">
              Mashup
            </Link>
            <Link href="/chords" className="hover:text-mono-ink transition-colors">
              Chords
            </Link>
            <Link href="/player" className="hover:text-mono-ink transition-colors">
              Audio Player
            </Link>
            <Link href="/video-player" className="hover:text-mono-ink transition-colors">
              Video Player
            </Link>
            <Link href="/status" className="hover:text-mono-ink transition-colors">
              Status
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-mono-inkMuted">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Zero-Telemetry Local Processing</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-mono-inkMuted font-mono">
          <p>© {new Date().getFullYear()} SplitStream. Monolith Workstation Architecture.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-mono-ink transition-colors">
              Sign In
            </Link>
            <span>•</span>
            <Link href="/signup" className="hover:text-mono-ink transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
