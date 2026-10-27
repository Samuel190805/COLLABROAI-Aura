import React from "react";

export function PageLoading({ message = "Loading Workspace..." }: { message?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 font-mono text-center p-8">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 border-2 border-mono-hairline rounded-full" />
        <div className="absolute inset-0 border-2 border-mono-ink border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-xs text-mono-inkMuted tracking-wider uppercase font-semibold">
        {message}
      </p>
    </div>
  );
}

export default PageLoading;
