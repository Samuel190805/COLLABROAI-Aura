"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SplitStream Critical Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 font-mono">
      <div className="w-16 h-16 border border-[var(--line)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--ink-primary)] mb-6">
        <AlertCircle className="w-8 h-8 stroke-[1.5]" />
      </div>

      <span className="text-xs uppercase tracking-widest text-[var(--ink-secondary)] mb-2">
        Execution Exception • 500
      </span>

      <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[var(--ink-primary)] mb-3">
        Pipeline Interrupted
      </h1>

      <p className="text-xs text-[var(--ink-secondary)] max-w-md mb-8">
        {error.message || "An unexpected error occurred during execution. Intermediate files have been safely isolated."}
      </p>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => reset()} className="flex items-center gap-2 text-xs">
          <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" /> Try Again
        </Button>
        <Link href="/">
          <Button variant="secondary" className="flex items-center gap-2 text-xs">
            <Home className="w-3.5 h-3.5 stroke-[1.5]" /> Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
