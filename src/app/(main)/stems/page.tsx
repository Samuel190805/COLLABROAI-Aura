"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Scissors,
  Link2,
  FileAudio,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { StageStepper } from "@/components/ui/StageStepper";
import { StemMixer, StemTrack } from "@/components/audio/StemMixer";
import { ModeAHero } from "@/components/layout/ModeAHero";
import { useRealtimeJob } from "@/lib/useRealtimeJob";

const STAGES = [
  { id: "ANALYSIS", label: "Analysis" },
  { id: "MODEL_INFERENCE", label: "De-Mixing" },
  { id: "STEM_RECONSTRUCTION", label: "Validation" },
  { id: "EXPORT", label: "Transcode" },
];

function StemSeparatorContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [inputMode, setInputMode] = useState<"file" | "url">(initialUrl ? "url" : "file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [outputFormat, setOutputFormat] = useState("mp3");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    jobId,
    stage,
    progress,
    message,
    error,
    mediaAssets,
    isCompleted,
    isFailed,
    isProcessing,
    watchJob,
    reset,
  } = useRealtimeJob();

  useEffect(() => {
    if (initialUrl && !jobId) {
      setUrlInput(initialUrl);
      setInputMode("url");
    }
  }, [initialUrl, jobId]);

  const handleStartSeparation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (inputMode === "file" && !selectedFile) {
      setSubmitError("Please select an audio file to separate");
      return;
    }
    if (inputMode === "url" && !urlInput.trim()) {
      setSubmitError("Please enter a media URL");
      return;
    }

    setIsSubmitting(true);

    try {
      let res: Response;

      if (inputMode === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("outputFormat", outputFormat);
        res = await fetch("/api/stems/separate", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/stems/separate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput.trim(), outputFormat }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.jobId) {
        watchJob(data.jobId);
      } else {
        throw new Error("Missing jobId in response");
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to queue separation job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
    setUrlInput("");
    setSubmitError(null);
  };

  // Extract engine metadata from completed stems
  const firstMeta = mediaAssets?.[0]?.metadata as any;
  const engine = firstMeta?.engine as "demucs" | "dsp-fallback" | undefined;
  const qualityLabel =
    firstMeta?.qualityLabel ||
    (engine === "demucs" ? "Studio quality (Demucs)" : "Standard quality (offline mode)");

  // Map 2 stems for mixer
  const mixerTracks: StemTrack[] = (mediaAssets || []).map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind as "STEM_VOCALS" | "STEM_INSTRUMENT",
    url: a.filePath,
    waveformData: a.waveformData || undefined,
    sizeBytes: a.sizeBytes || undefined,
    format: a.format || outputFormat,
    clarityPercent: (a.metadata as any)?.clarityPercent ?? 95,
    qualityLabel,
  }));

  return (
    <div className="w-full flex flex-col items-center">
      <ModeAHero
        chapterNumber="CHAPTER 01 // DECOMPOSITION"
        badge="2-STEM EXACT OUTPUT"
        headline="VOCAL & INSTRUMENT SPLITTER"
        subheadline="Native two-source separation: Vocals and Instrument only."
        description="Deep neural de-mixing (Demucs v4) or offline DSP center-channel phase cancellation with mandatory EBU R128 loudness normalization, 40Hz sub-cut, and FFprobe integrity validation."
        toolAnchorId="splitter-workspace"
        toolCtaText="Open Splitter Workspace"
      />

      <div id="splitter-workspace" className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isCompleted && mixerTracks.length > 0 ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b-hairline font-mono text-xs">
              <span className="text-mono-ink uppercase font-bold">2-TRACK SEPARATION COMPLETE</span>
              <Button variant="outline" pill={false} onClick={handleReset} className="h-8 gap-1.5 text-xs font-mono">
                <RotateCcw className="w-3.5 h-3.5" /> SEPARATE ANOTHER TRACK
              </Button>
            </div>

            {engine === "dsp-fallback" && (
              <div className="p-3.5 border-hairline bg-mono-bgAlt text-xs font-mono text-mono-ink flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold">[OFFLINE DSP MODE]</span>
                  <span className="text-mono-inkMuted">
                    Demucs microservice unavailable; rendered via high-speed center-channel phase cancellation.
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 border-hairline uppercase font-bold">
                  Standard Quality
                </span>
              </div>
            )}

            <StemMixer
              tracks={mixerTracks}
              title="Separation Master"
              qualityLabel={qualityLabel}
              engine={engine}
            />
          </div>
        ) : (
          <div className="p-6 sm:p-8 border-hairline bg-mono-bg rounded-sm flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b-hairline">
              <div className="flex items-center gap-2.5">
                <Scissors className="w-4 h-4 stroke-[1.5]" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-tight">Source Ingestion</h3>
              </div>
              <Tabs
                tabs={[
                  { id: "file", label: "Local File", icon: <FileAudio className="w-3.5 h-3.5" /> },
                  { id: "url", label: "Web Link", icon: <Link2 className="w-3.5 h-3.5" /> },
                ]}
                activeTab={inputMode}
                onChange={(id) => setInputMode(id as "file" | "url")}
              />
            </div>

            <form onSubmit={handleStartSeparation} className="flex flex-col gap-6">
              {inputMode === "file" ? (
                <FileDropzone
                  accept="audio/*,video/*"
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                  label="Drop audio track here or click to browse"
                  sublabel="Outputs two pristine tracks: Vocals and Instrument"
                />
              ) : (
                <Input
                  label="Media Stream URL (YouTube, Vimeo, Soundcloud)"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  leftIcon={<Link2 className="w-3.5 h-3.5" />}
                />
              )}

              {/* Format Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-hairline">
                <Select
                  label="Export Format"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  options={[
                    { value: "mp3", label: "MP3 (320 kbps High-Bitrate)" },
                    { value: "wav", label: "WAV (PCM Lossless 16-bit 44.1kHz)" },
                    { value: "flac", label: "FLAC (Lossless Compression)" },
                  ]}
                />
                <div className="flex flex-col justify-end">
                  <div className="p-2.5 border-hairline bg-mono-bgAlt text-[11px] font-mono text-mono-inkMuted flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-mono-ink shrink-0" />
                    <span>EBU R128 Loudness Normalization & -60dB noise gate applied to both stems.</span>
                  </div>
                </div>
              </div>

              {/* Submit Error */}
              {(submitError || error) && (
                <div className="p-3 border-hairline bg-mono-bgAlt text-xs font-mono text-mono-ink flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError || error}</span>
                </div>
              )}

              {/* Progress Stage Tracker */}
              {(isProcessing || isSubmitting) && (
                <div className="pt-4 border-t-hairline">
                  <StageStepper
                    stages={STAGES}
                    currentStageId={stage || "ANALYSIS"}
                    progressPercent={progress}
                    isCompleted={isCompleted}
                    isFailed={isFailed}
                  />
                  {message && (
                    <p className="mt-2 font-mono text-[11px] text-mono-inkMuted text-center">
                      {message}
                    </p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t-hairline flex items-center justify-between">
                <span className="font-mono text-[11px] text-mono-inkMuted">
                  OUTPUT: EXACTLY 2 STEMS (VOCALS & INSTRUMENT)
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  pill={false}
                  isLoading={isSubmitting || isProcessing}
                  disabled={isSubmitting || isProcessing}
                  className="px-6 h-10 font-mono font-bold text-xs uppercase"
                >
                  {isProcessing ? "Separating Audio..." : "Separate Stems"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StemSeparatorPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-mono text-xs text-mono-inkMuted">Loading Workspace...</div>}>
      <StemSeparatorContent />
    </Suspense>
  );
}
