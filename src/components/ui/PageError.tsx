"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface PageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export function PageError({
  error,
  reset,
  title = "An Error Occurred",
}: PageErrorProps) {
  useEffect(() => {
    console.error("[Page Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 font-mono py-12">
      <div className="w-12 h-12 border-hairline bg-mono-bgAlt flex items-center justify-center text-mono-ink mb-4">
        <AlertCircle className="w-6 h-6 stroke-[1.5] text-rose-500" />
      </div>

      <span className="text-[10px] uppercase tracking-widest text-mono-inkMuted mb-1">
        Error Boundary
      </span>

      <h2 className="text-xl font-bold uppercase tracking-tight text-mono-ink mb-2">
        {title}
      </h2>

      <p className="text-xs text-mono-inkMuted max-w-md mb-6">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>

      <div className="flex items-center gap-3">
        <Button variant="primary" pill={false} onClick={() => reset()} className="text-xs gap-1.5 h-9">
          <RotateCcw className="w-3.5 h-3.5" /> Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" pill={false} className="text-xs gap-1.5 h-9">
            <Home className="w-3.5 h-3.5" /> Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default PageError;
