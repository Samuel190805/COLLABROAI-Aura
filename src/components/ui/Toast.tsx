"use client";

import React, { useState, useEffect } from "react";
import { toast, ToastMessage } from "@/lib/toast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((updated) => {
      setToasts(updated);
    });
    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";

        return (
          <div
            key={t.id}
            className="pointer-events-auto p-4 rounded-2xl backdrop-blur-2xl bg-white/90 dark:bg-[#1c1c1e]/95 border border-neutral-200/80 dark:border-white/10 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300"
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {isError && <AlertCircle className="w-5 h-5 text-red-500" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-neutral-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-neutral-900 dark:text-white">
                {t.title}
              </h5>
              {t.description && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {t.description}
                </p>
              )}
            </div>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
