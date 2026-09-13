"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  HardDrive,
  Cpu,
  CheckCircle2,
  RefreshCw,
  Shield,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/utils";

interface HealthData {
  status: string;
  disk: {
    totalSpaceBytes: number;
    freeSpaceBytes: number;
    usedByAppBytes: number;
    percentUsed: number;
  };
  queue: {
    pendingJobs: number;
    activeJobs: number;
    completedJobs24h: number;
    failedJobs24h: number;
  };
  stemsService: {
    status: "online" | "offline";
    engine: "demucs" | "dsp_fallback";
    gpuAvailable: boolean;
  };
  retention: {
    lastSweepTimestamp: string;
    filesDeletedLastSweep: number;
    bytesFreedLastSweep: number;
  };
}

export default function StatusPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealthData(data);
      setLastRefreshed(new Date());
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full pt-28 pb-20 px-4 sm:px-6 bg-[var(--bg-primary)] font-mono">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 pb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 stroke-[1.5] text-[var(--ink-primary)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--ink-secondary)]">
              System Telemetry & Health
            </span>
          </div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-[var(--ink-primary)]">
            Service Health & Retention Monitor
          </h1>
          <p className="text-xs text-[var(--ink-secondary)]">
            Live telemetry for 2-stem DSP engines, task queue, disk utilization, and storage retention.
          </p>
        </div>

        {/* Top Health Overview Banner */}
        <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--line)] flex items-center justify-center text-[var(--ink-primary)]">
              <CheckCircle2 className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                  System Status: {healthData?.status === "ok" ? "Operational" : "Degraded"}
                </h3>
              </div>
              <p className="text-[10px] text-[var(--ink-secondary)] mt-0.5">
                Refreshed: {lastRefreshed.toLocaleTimeString()} • Polling: 15s interval
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchHealth}
            isLoading={isLoading}
            className="text-xs h-7 px-2 font-mono"
          >
            <RefreshCw className="w-3 h-3 mr-1 stroke-[1.5]" /> Refresh
          </Button>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Disk & App Storage (Section 4.8.3) */}
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 stroke-[1.5] text-[var(--ink-primary)]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                  Disk & Application Storage
                </h4>
              </div>
              <span className="text-[10px] text-[var(--ink-secondary)]">
                {healthData?.disk?.percentUsed ?? 0}% Full
              </span>
            </div>

            {/* Storage Meter */}
            <div className="w-full h-1.5 bg-[var(--line)] overflow-hidden">
              <div
                className="h-full bg-[var(--ink-primary)] transition-all duration-300"
                style={{ width: `${healthData?.disk?.percentUsed || 0}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[9px] uppercase text-[var(--ink-secondary)] block">Free Disk</span>
                <span className="text-xs font-bold text-[var(--ink-primary)]">
                  {healthData?.disk?.freeSpaceBytes ? formatBytes(healthData.disk.freeSpaceBytes) : "—"}
                </span>
              </div>
              <div className="p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[9px] uppercase text-[var(--ink-secondary)] block">Used By App</span>
                <span className="text-xs font-bold text-[var(--ink-primary)]">
                  {healthData?.disk?.usedByAppBytes ? formatBytes(healthData.disk.usedByAppBytes) : "0 MB"}
                </span>
              </div>
            </div>
          </Card>

          {/* Job Queue Status (Section 4.8.3) */}
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
              <Layers className="w-3.5 h-3.5 stroke-[1.5] text-[var(--ink-primary)]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                Task Queue & Throughput
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[9px] uppercase text-[var(--ink-secondary)] block">Pending</span>
                <span className="text-xs font-bold text-[var(--ink-primary)]">
                  {healthData?.queue?.pendingJobs ?? 0}
                </span>
              </div>
              <div className="p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[9px] uppercase text-[var(--ink-secondary)] block">Active</span>
                <span className="text-xs font-bold text-[var(--ink-primary)]">
                  {healthData?.queue?.activeJobs ?? 0}
                </span>
              </div>
              <div className="p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[9px] uppercase text-[var(--ink-secondary)] block">Done 24h</span>
                <span className="text-xs font-bold text-[var(--ink-primary)]">
                  {healthData?.queue?.completedJobs24h ?? 0}
                </span>
              </div>
              <div className="p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[9px] uppercase text-[var(--ink-secondary)] block">Failed 24h</span>
                <span className="text-xs font-bold text-[var(--ink-primary)]">
                  {healthData?.queue?.failedJobs24h ?? 0}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Engine & Retention Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Separation Microservice / Fallback */}
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
              <Cpu className="w-3.5 h-3.5 stroke-[1.5] text-[var(--ink-primary)]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                Stem Separation Engine
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[10px] uppercase text-[var(--ink-secondary)]">Microservice</span>
                <span className="font-bold text-[var(--ink-primary)]">
                  {healthData?.stemsService?.status?.toUpperCase() || "OFFLINE"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[10px] uppercase text-[var(--ink-secondary)]">Active Engine</span>
                <span className="font-bold text-[var(--ink-primary)]">
                  {healthData?.stemsService?.engine === "demucs"
                    ? "Demucs 2-Stem (FastAPI)"
                    : "DSP Center-Channel Fallback"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[10px] uppercase text-[var(--ink-secondary)]">GPU Acceleration</span>
                <span className="font-bold text-[var(--ink-primary)]">
                  {healthData?.stemsService?.gpuAvailable ? "Enabled" : "Disabled (CPU)"}
                </span>
              </div>
            </div>
          </Card>

          {/* Retention Sweep (Section 4.8.3) */}
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
              <Shield className="w-3.5 h-3.5 stroke-[1.5] text-[var(--ink-primary)]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                Storage Retention Sweep (24h)
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[10px] uppercase text-[var(--ink-secondary)]">Last Sweep</span>
                <span className="text-[10px] text-[var(--ink-primary)]">
                  {healthData?.retention?.lastSweepTimestamp
                    ? new Date(healthData.retention.lastSweepTimestamp).toLocaleTimeString()
                    : "Active"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[10px] uppercase text-[var(--ink-secondary)]">Deleted Last Sweep</span>
                <span className="font-bold text-[var(--ink-primary)]">
                  {healthData?.retention?.filesDeletedLastSweep ?? 0} files
                </span>
              </div>
              <div className="flex items-center justify-between p-2 border border-[var(--line)] bg-[var(--bg-secondary)]">
                <span className="text-[10px] uppercase text-[var(--ink-secondary)]">Freed Last Sweep</span>
                <span className="font-bold text-[var(--ink-primary)]">
                  {healthData?.retention?.bytesFreedLastSweep
                    ? formatBytes(healthData.retention.bytesFreedLastSweep)
                    : "0 MB"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
