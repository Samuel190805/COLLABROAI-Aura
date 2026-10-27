"use client";

import React, { useState, Suspense } from "react";
import {
  Layers,
  Link2,
  FileAudio,
  RotateCcw,
  AlertCircle,
  Play,
  Pause,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { StageStepper } from "@/components/ui/StageStepper";
import { WaveformVisualizer } from "@/components/audio/WaveformVisualizer";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { ModeAHero } from "@/components/layout/ModeAHero";
import { useRealtimeJob } from "@/lib/useRealtimeJob";
import { formatDuration } from "@/lib/utils";

const STAGES = [
  { id: "RESOLVING", label: "Resolve" },
  { id: "ANALYSIS", label: "2-Stem Split" },
  { id: "MODEL_INFERENCE", label: "Key / BPM" },
  { id: "STEM_RECONSTRUCTION", label: "Align" },
  { id: "EXPORT", label: "Master" },
];

function MashupContent() {
  const [modeA, setModeA] = useState<"file" | "url">("file");
  const [fileA, setFileA] = useState<File | null>(null);
  const [urlA, setUrlA] = useState("");

  const [modeB, setModeB] = useState<"file" | "url">("file");
  const [fileB, setFileB] = useState<File | null>(null);
  const [urlB, setUrlB] = useState("");

  // Simplified 2-Stem Selection: Which track's Vocals and which track's Instrument to keep
  const [vocalsFrom, setVocalsFrom] = useState<"A" | "B">("A");
  const [instrumentFrom, setInstrumentFrom] = useState<"A" | "B">("B");

  const [autoKeyMatch, setAutoKeyMatch] = useState(true);
  const [autoTempoMatch, setAutoTempoMatch] = useState(true);
  const [outputFormat, setOutputFormat] = useState<"mp3" | "wav" | "flac">("mp3");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Playback state for completed mashup
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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
    cancel,
  } = useRealtimeJob("MASHUP_RENDER");

  const handleStartMashup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (modeA === "file" && !fileA) {
      setSubmitError("Please select Track A audio file");
      return;
    }
    if (modeA === "url" && !urlA.trim()) {
      setSubmitError("Please enter Track A media URL");
      return;
    }
    if (modeB === "file" && !fileB) {
      setSubmitError("Please select Track B audio file");
      return;
    }
    if (modeB === "url" && !urlB.trim()) {
      setSubmitError("Please enter Track B media URL");
      return;
    }

    setIsSubmitting(true);

    try {
      let res: Response;

      if ((modeA === "file" && fileA) || (modeB === "file" && fileB)) {
        const formData = new FormData();
        if (fileA) formData.append("fileA", fileA);
        if (urlA.trim()) formData.append("urlA", urlA.trim());
        if (fileB) formData.append("fileB", fileB);
        if (urlB.trim()) formData.append("urlB", urlB.trim());

        formData.append("selection", JSON.stringify({ vocalsSource: vocalsFrom, instrumentSource: instrumentFrom, vocalsFrom, instrumentFrom }));
        formData.append("autoKeyMatch", String(autoKeyMatch));
        formData.append("autoTempoMatch", String(autoTempoMatch));
        formData.append("outputFormat", outputFormat);

        res = await fetch("/api/mashup", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/mashup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackA: { type: "url", url: urlA.trim(), name: "Track A" },
            trackB: { type: "url", url: urlB.trim(), name: "Track B" },
            selection: { vocalsSource: vocalsFrom, instrumentSource: instrumentFrom, vocalsFrom, instrumentFrom },
            autoKeyMatch,
            autoTempoMatch,
            outputFormat,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (data.jobId) {
        watchJob(data.jobId, "MASHUP_RENDER");
      } else {
        throw new Error("Missing jobId in response");
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to initialize mashup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setFileA(null);
    setUrlA("");
    setFileB(null);
    setUrlB("");
    setSubmitError(null);
    setIsPlaying(false);
  };

  const masterAsset = mediaAssets?.[0];

  return (
    <div className="w-full flex flex-col items-center">
      <ModeAHero
        chapterNumber="CHAPTER 04 // STUDIO"
        badge="2-STEM VOCAL + INSTRUMENT PAIRING"
        headline="MASHUP STUDIO"
        subheadline="Combine the Vocal from Track A with the Instrument from Track B."
        description="Pristine Camelot Wheel harmonic key detection & BPM detection analyzed against isolated Instrument stems, auto pitch-shifting (max ±4 semitones), and auto tempo-stretching into a mastered mix."
        toolAnchorId="mashup-workspace"
        toolCtaText="Open Mashup Workspace"
      />

      <div id="mashup-workspace" className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isCompleted && masterAsset ? (
          <div className="p-6 sm:p-8 border-hairline bg-mono-bg rounded-sm flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b-hairline font-mono text-xs">
              <div>
                <span className="font-bold text-mono-ink uppercase">{masterAsset.name}</span>
                <p className="text-mono-inkMuted text-[11px] mt-0.5">EBU R128 -14 LUFS Normalized Master</p>
              </div>
              <Button variant="outline" pill={false} onClick={handleReset} className="h-8 gap-1.5 text-xs font-mono">
                <RotateCcw className="w-3.5 h-3.5" /> CREATE ANOTHER MASHUP
              </Button>
            </div>

            <MediaPlayer
              src={masterAsset.filePath}
              mediaType="audio"
              title={masterAsset.name}
              artist="Mastered 2-Stem Mashup"
            />

            <div className="flex items-center justify-end pt-4 border-t-hairline">
              <a
                href={masterAsset.filePath}
                download={`${masterAsset.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.${masterAsset.format || "mp3"}`}
                className="h-9 px-4 rounded-sm border-hairline flex items-center gap-2 text-xs font-mono hover:bg-mono-ink hover:text-mono-bg transition-colors"
              >
                <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>DOWNLOAD MASTER</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 border-hairline bg-mono-bg rounded-sm flex flex-col gap-6">
            <div className="pb-4 border-b-hairline">
              <h3 className="font-mono text-sm font-bold uppercase tracking-tight">
                Dual Track Ingestion & Stem Selection
              </h3>
              <p className="text-xs text-mono-inkMuted font-mono mt-0.5">
                Choose which song provides the Vocals and which provides the Instrument
              </p>
            </div>

            <form onSubmit={handleStartMashup} className="flex flex-col gap-6">
              {/* Dual Track Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Track A */}
                <div className="p-4 border-hairline bg-mono-bgAlt rounded-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase">Track A</span>
                    <Tabs
                      tabs={[
                        { id: "file", label: "File" },
                        { id: "url", label: "URL" },
                      ]}
                      activeTab={modeA}
                      onChange={(id) => setModeA(id as "file" | "url")}
                    />
                  </div>
                  {modeA === "file" ? (
                    <FileDropzone
                      accept="audio/*,video/*"
                      onFileSelect={setFileA}
                      selectedFile={fileA}
                      label="Select Track A Audio"
                      sublabel="MP3, WAV, FLAC"
                    />
                  ) : (
                    <Input
                      label="Track A URL"
                      placeholder="https://..."
                      value={urlA}
                      onChange={(e) => setUrlA(e.target.value)}
                    />
                  )}
                </div>

                {/* Track B */}
                <div className="p-4 border-hairline bg-mono-bgAlt rounded-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase">Track B</span>
                    <Tabs
                      tabs={[
                        { id: "file", label: "File" },
                        { id: "url", label: "URL" },
                      ]}
                      activeTab={modeB}
                      onChange={(id) => setModeB(id as "file" | "url")}
                    />
                  </div>
                  {modeB === "file" ? (
                    <FileDropzone
                      accept="audio/*,video/*"
                      onFileSelect={setFileB}
                      selectedFile={fileB}
                      label="Select Track B Audio"
                      sublabel="MP3, WAV, FLAC"
                    />
                  ) : (
                    <Input
                      label="Track B URL"
                      placeholder="https://..."
                      value={urlB}
                      onChange={(e) => setUrlB(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Simplified 2-Stem Selection Matrix */}
              <div className="p-5 border-hairline bg-mono-bg rounded-sm flex flex-col gap-4">
                <span className="font-mono text-xs font-bold uppercase tracking-wide">
                  Pairing Configuration
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vocals Source Radio */}
                  <div className="p-3 border-hairline rounded-sm">
                    <p className="font-mono text-[11px] text-mono-inkMuted mb-2 uppercase">Vocals Source</p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
                        <input
                          type="radio"
                          name="vocalsFrom"
                          value="A"
                          checked={vocalsFrom === "A"}
                          onChange={() => setVocalsFrom("A")}
                          className="accent-mono-ink"
                        />
                        <span>Track A Vocals</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
                        <input
                          type="radio"
                          name="vocalsFrom"
                          value="B"
                          checked={vocalsFrom === "B"}
                          onChange={() => setVocalsFrom("B")}
                          className="accent-mono-ink"
                        />
                        <span>Track B Vocals</span>
                      </label>
                    </div>
                  </div>

                  {/* Instrument Source Radio */}
                  <div className="p-3 border-hairline rounded-sm">
                    <p className="font-mono text-[11px] text-mono-inkMuted mb-2 uppercase">Instrument Source</p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
                        <input
                          type="radio"
                          name="instrumentFrom"
                          value="A"
                          checked={instrumentFrom === "A"}
                          onChange={() => setInstrumentFrom("A")}
                          className="accent-mono-ink"
                        />
                        <span>Track A Instrument</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
                        <input
                          type="radio"
                          name="instrumentFrom"
                          value="B"
                          checked={instrumentFrom === "B"}
                          onChange={() => setInstrumentFrom("B")}
                          className="accent-mono-ink"
                        />
                        <span>Track B Instrument</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* DSP Alignment Switches */}
                <div className="flex flex-wrap items-center gap-6 pt-2 font-mono text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoKeyMatch}
                      onChange={(e) => setAutoKeyMatch(e.target.checked)}
                      className="accent-mono-ink"
                    />
                    <span>Auto Key-Match (max ±4 semitones)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoTempoMatch}
                      onChange={(e) => setAutoTempoMatch(e.target.checked)}
                      className="accent-mono-ink"
                    />
                    <span>Auto Tempo-Stretch (BPM align)</span>
                  </label>
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
                    currentStageId={stage || "RESOLVING"}
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
                  HARMONIC ALIGNMENT: 2-STEM COLLISION
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  pill={false}
                  isLoading={isSubmitting || isProcessing}
                  disabled={isSubmitting || isProcessing}
                  className="px-6 h-10 font-mono font-bold text-xs uppercase"
                >
                  {isProcessing ? "Rendering Mashup..." : "Render Mashup"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MashupPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-mono text-xs text-mono-inkMuted">Loading Studio...</div>}>
      <MashupContent />
    </Suspense>
  );
}
