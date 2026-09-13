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

const NAV_ITEMS = [
  { href: "/stems", label: "Splitter", icon: Scissors },
  { href: "/download", label: "Downloader", icon: Download },
  { href: "/convert", label: "Converter", icon: ArrowLeftRight },
  { href: "/translate", label: "Translate", icon: Languages },
  { href: "/mashup", label: "Mashup", icon: Layers },
  { href: "/chords", label: "Chords", icon: Sparkles },
  { href: "/player", label: "Audio Player", icon: Music2 },
  { href: "/video-player", label: "Video Player", icon: Video },
  { href: "/status", label: "Status", icon: Activity },
];

export const TopNav: React.FC = () => {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Initial theme detection
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

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-tight rounded-sm transition-colors duration-150",
                  isActive
                    ? "bg-mono-ink text-mono-bg"
                    : "text-mono-inkMuted hover:text-mono-ink hover:bg-mono-bgAlt"
                )}
              >
                <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>{item.label}</span>
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

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs font-medium tracking-tight rounded-sm transition-colors",
                  isActive
                    ? "bg-mono-ink text-mono-bg"
                    : "text-mono-inkMuted hover:text-mono-ink hover:bg-mono-bgAlt"
                )}
              >
                <Icon className="w-4 h-4 stroke-[1.5]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default TopNav;
