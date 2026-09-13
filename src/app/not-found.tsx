"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 font-mono">
      <div className="w-16 h-16 border border-[var(--line)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--ink-primary)] mb-6">
        <Compass className="w-8 h-8 stroke-[1.5]" />
      </div>

      <span className="text-xs uppercase tracking-widest text-[var(--ink-secondary)] mb-2">
        Error 404 • Missing Track
      </span>

      <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[var(--ink-primary)] mb-3">
        Frequency Not Found
      </h1>

      <p className="text-xs text-[var(--ink-secondary)] max-w-md mb-8">
        The requested pipeline, stem, or route is not available on this server.
      </p>

      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="primary" className="flex items-center gap-2 text-xs">
            <Home className="w-3.5 h-3.5 stroke-[1.5]" /> Home
          </Button>
        </Link>
        <Link href="/stems">
          <Button variant="secondary" className="flex items-center gap-2 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" /> Vocal / Instrument Splitter
          </Button>
        </Link>
      </div>
    </div>
  );
}
