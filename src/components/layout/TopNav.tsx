"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scissors,
  Download,
  Languages,
  Music2,
  Layers,
  Sparkles,
  Video,
  Activity,
  Sun,
  Moon,
  Menu,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJobs } from "@/lib/jobs-context";
import { JobKind } from "@/domain/value-objects/JobStatus";

interface NavItemConfig {
  href: string;
  label: string;
  icon: React.ElementType;
  jobType?: JobKind;
}

const NAV_ITEMS: NavItemConfig[] = [
  { href: "/stems", label: "Splitter", icon: Scissors, jobType: "STEM_SEPARATION" },
  { href: "/download", label: "Downloader", icon: Download, jobType: "MEDIA_DOWNLOAD" },
  { href: "/convert", label: "Converter", icon: ArrowLeftRight, jobType: "MEDIA_CONVERSION" },
  { href: "/translate", label: "Translate", icon: Languages, jobType: "TRANSLATE_SPEAK" },
  { href: "/mashup", label: "Mashup", icon: Layers, jobType: "MASHUP_RENDER" },
  { href: "/chords", label: "Chords", icon: Sparkles, jobType: "CHORD_DETECTION" },
  { href: "/player", label: "Audio Player", icon: Music2 },
  { href: "/video-player", label: "Video Player", icon: Video },
  { href: "/status", label: "Status", icon: Activity },
];

export const TopNav: React.FC = () => {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unseenCountForType } = useJobs();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-mono-bg border-b-hairline transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-mono-ink select-none"
        >
          <span className="w-4 h-4 bg-mono-ink inline-block" />
          <span className="font-mono text-xs tracking-widest uppercase font-semibold">
            SPLITSTREAM
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            const unseenCount = item.jobType ? unseenCountForType(item.jobType) : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-tight rounded-sm transition-colors duration-150",
                  isActive
                    ? "bg-mono-ink text-mono-bg"
                    : "text-mono-inkMuted hover:text-mono-ink hover:bg-mono-bgAlt"
                )}
              >
                <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>{item.label}</span>
                {unseenCount > 0 && (
                  <span className="relative flex h-2 w-2 ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Chrome (Theme Toggle & Mobile Menu) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 text-mono-inkMuted hover:text-mono-ink border-hairline rounded-sm hover:bg-mono-bgAlt transition-colors"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 stroke-[1.5]" />
            ) : (
              <Moon className="w-3.5 h-3.5 stroke-[1.5]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-mono-inkMuted hover:text-mono-ink border-hairline rounded-sm hover:bg-mono-bgAlt transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 stroke-[1.5]" />
            ) : (
              <Menu className="w-4 h-4 stroke-[1.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-hairline bg-mono-bg px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            const unseenCount = item.jobType ? unseenCountForType(item.jobType) : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-xs font-medium tracking-tight rounded-sm transition-colors",
                  isActive
                    ? "bg-mono-ink text-mono-bg"
                    : "text-mono-inkMuted hover:text-mono-ink hover:bg-mono-bgAlt"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 stroke-[1.5]" />
                  <span>{item.label}</span>
                </div>
                {unseenCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default TopNav;
