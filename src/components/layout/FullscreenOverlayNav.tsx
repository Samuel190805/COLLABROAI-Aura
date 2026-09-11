"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sliders,
  Download,
  Languages,
  Music,
  Sparkles,
  Layers,
  ArrowUpRight,
  Activity,
  HardDrive,
  Video,
  User,
} from "lucide-react";

interface FullscreenOverlayNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIMARY_FEATURES = [
  {
    number: "01",
    href: "/stems",
    title: "Stem Separator",
    tagline: "6-Stem Isolation & Neural De-mixing",
    badge: "Demucs v4",
    icon: Sliders,
    accent: "group-hover:text-indigo-400",
  },
  {
    number: "02",
    href: "/download",
    title: "Universal Downloader",
    tagline: "Lossless FLAC, Auto-Tagging & -14 LUFS Mastering",
    badge: "Lossless 320k",
    icon: Download,
    accent: "group-hover:text-blue-400",
  },
  {
    number: "03",
    href: "/translate",
    title: "Translate & Speak",
    tagline: "Voice-Preserving Speech & Neural Diarization",
    badge: "30+ Languages",
    icon: Languages,
    accent: "group-hover:text-emerald-400",
  },
  {
    number: "04",
    href: "/player",
    title: "Studio Media Player",
    tagline: "Universal Audio & Video Player with 5-Band Studio EQ",
    badge: "Synced Lyrics",
    icon: Music,
    accent: "group-hover:text-amber-400",
  },
  {
    number: "05",
    href: "/chords",
    title: "AI Chord Detector",
    tagline: "Stem-Driven Chroma Detection & Live Mic Practice",
    badge: "Chroma AI",
    icon: Sparkles,
    accent: "group-hover:text-amber-300",
  },
  {
    number: "06",
    href: "/mashup",
    title: "AI Mashup Creator",
    tagline: "Camelot Harmonic Mixing & Phase Beat Synchronization",
    badge: "Remix Studio",
    icon: Layers,
    accent: "group-hover:text-rose-400",
  },
];

const UTILITY_LINKS = [
  { href: "/audio-player", label: "Local Audio Player", icon: HardDrive },
  { href: "/video-player", label: "Local Video Player", icon: Video },
  { href: "/status", label: "System Telemetry & Retention", icon: Activity },
  { href: "/login", label: "Sign In / Account", icon: User },
];

export const FullscreenOverlayNav: React.FC<FullscreenOverlayNavProps> = ({
  isOpen,
  onClose,
}) => {
  const pathname = usePathname();

  // Close overlay on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col justify-between p-6 sm:p-12 overflow-y-auto"
        >
          {/* Header Row inside overlay */}
          <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-3 font-bold text-white tracking-tighter text-lg group"
            >
              <div className="w-8 h-8 rounded-xl bg-apple-blue flex items-center justify-center text-white shadow-lg shadow-apple-blue/30 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="tracking-tight text-white font-extrabold">SPLITSTREAM</span>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-white/10 text-neutral-400">
                NAVIGATION
              </span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
              aria-label="Close navigation menu"
            >
              <span>Close</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Chapter Navigation Stack */}
          <div className="w-full max-w-7xl mx-auto my-auto py-8">
            <nav className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12">
              {PRIMARY_FEATURES.map((feat, idx) => {
                const isActive = pathname.startsWith(feat.href);
                return (
                  <motion.div
                    key={feat.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.05 + idx * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Link
                      href={feat.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        isActive
                          ? "bg-white/10 border-apple-blue/50 text-white"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/20 text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-mono text-xs sm:text-sm font-bold text-neutral-500 group-hover:text-apple-blue transition-colors w-6 shrink-0">
                          {feat.number}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className={`text-xl sm:text-2xl font-black tracking-tight transition-colors ${feat.accent} ${
                                isActive ? "text-apple-blue" : "text-white"
                              }`}
                            >
                              {feat.title}
                            </h3>
                            {feat.badge && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                                {feat.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 truncate mt-0.5 font-normal">
                            {feat.tagline}
                          </p>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 group-hover:text-white group-hover:bg-white/10 transition-all shrink-0 ml-3">
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </div>

          {/* Bottom Utility Bar */}
          <div className="w-full max-w-7xl mx-auto pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
            <div className="flex flex-wrap items-center gap-6">
              {UTILITY_LINKS.map((util) => (
                <Link
                  key={util.href}
                  href={util.href}
                  onClick={onClose}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <util.icon className="w-3.5 h-3.5 opacity-70" />
                  <span>{util.label}</span>
                </Link>
              ))}
            </div>

            <div className="font-mono text-[11px] text-neutral-500">
              SPLITSTREAM v1.0 • CLEAN ARCHITECTURE • ZERO BLOAT
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenOverlayNav;
