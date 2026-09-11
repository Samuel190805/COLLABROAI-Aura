"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Sliders,
  Download,
  Languages,
  Music,
  Layers,
  Activity,
} from "lucide-react";
import { FullscreenOverlayNav } from "./FullscreenOverlayNav";
import { MagneticWrapper } from "@/components/cursor/MagneticWrapper";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/stems", label: "Stems", icon: Sliders },
  { href: "/download", label: "Download", icon: Download },
  { href: "/translate", label: "Translate", icon: Languages },
  { href: "/player", label: "Studio Player", icon: Music },
  { href: "/chords", label: "Chords", icon: Sparkles },
  { href: "/mashup", label: "Mashup", icon: Layers },
  { href: "/status", label: "Status", icon: Activity },
];

export const MinimalHeader: React.FC = () => {
  const pathname = usePathname();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "backdrop-blur-xl bg-black/75 border-b border-white/10 py-2.5 shadow-sm"
            : "bg-gradient-to-b from-black/60 to-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
          {/* Logo Mark (Top-Left) */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group select-none cursor-pointer"
            aria-label="SplitStream Home"
          >
            <div className="w-8 h-8 rounded-xl bg-apple-blue flex items-center justify-center text-white shadow-lg shadow-apple-blue/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tighter text-white">
                SPLITSTREAM
              </span>
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-apple-blue animate-pulse" />
            </div>
          </Link>

          {/* Desktop Frosted Glass Quick Pill Bar (Center) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-2xl shadow-apple">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
                    isActive
                      ? "bg-apple-blue text-white shadow-sm shadow-apple-blue/30"
                      : "text-neutral-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "opacity-75")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Minimal Menu Trigger (Top-Right) */}
          <div className="flex items-center gap-3">
            <MagneticWrapper strength={0.25}>
              <button
                type="button"
                onClick={() => setOverlayOpen(true)}
                className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-md transition-all shadow-sm active:scale-95 cursor-pointer"
                aria-label="Open Navigation Menu"
              >
                <span className="font-mono text-[11px] text-neutral-300 group-hover:text-white transition-colors">
                  MENU
                </span>
                <div className="w-4 h-4 flex flex-col justify-center gap-1">
                  <span className="w-4 h-0.5 bg-white rounded-full group-hover:w-3 transition-all" />
                  <span className="w-2.5 h-0.5 bg-apple-blue rounded-full group-hover:w-4 transition-all" />
                </div>
              </button>
            </MagneticWrapper>
          </div>
        </div>
      </header>

      {/* Fullscreen Overlay Menu */}
      <FullscreenOverlayNav
        isOpen={overlayOpen}
        onClose={() => setOverlayOpen(false)}
      />
    </>
  );
};

export default MinimalHeader;
