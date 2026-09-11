"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
  Layers,
  Sparkles,
  UploadCloud,
  Link2,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Flame,
  ArrowRight,
  Disc,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Select";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { StageStepper } from "@/components/ui/StageStepper";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { WaveformVisualizer } from "@/components/audio/WaveformVisualizer";
import { MashupHero } from "@/components/visual/MashupHero";
import { ModeAHero } from "@/components/layout/ModeAHero";
import { StemSelection, CompatibilityScore, calculateCompatibility } from "@/domain/value-objects/MashupConfig";
import { useRealtimeJob } from "@/lib/useRealtimeJob";
import { formatDuration, formatBytes } from "@/lib/utils";

function MashupCreatorContent() {
  // Track A State
  const [modeA, setModeA] = useState<"file" | "url">("file");
  const [fileA, setFileA] = useState<File | null>(null);
  const [urlA, setUrlA] = useState<string>("");

  // Track B State
  const [modeB, setModeB] = useState<"file" | "url">("file");
  const [fileB, setFileB] = useState<File | null>(null);
  const [urlB, setUrlB] = useState<string>("");

  // Stem Selection (Default: Vocals from Track A, Beat & Bass from Track B)
  const [selection, setSelection] = useState<StemSelection>({
    trackA: { vocals: true, drums: false, bass: false, other: false },
    trackB: { vocals: false, drums: true, bass: true, other: true },
  });

  // Mixing & DSP Controls
  const [autoKeyMatch, setAutoKeyMatch] = useState<boolean>(true);
  const [autoTempoMatch, setAutoTempoMatch] = useState<boolean>(true);
  const [outputFormat, setOutputFormat] = useState<"mp3" | "wav" | "flac">("mp3");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live Compatibility Estimation
  const [compatibility, setCompatibility] = useState<CompatibilityScore>(
    calculateCompatibility("C Major", "8B", 124, "G Major", "9B", 126)
  );

  // Completed Mashup State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(180);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const {
    jobId,
    status,
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

  const stagesList = [
    { id: "RESOLVING", label: "Resolving", description: "Fetch streams" },
    { id: "ANALYSIS", label: "Dual Isolation", description: "Demucs v4 stems" },
    { id: "MODEL_INFERENCE", label: "Key & Tempo", description: "Camelot alignment" },
    { id: "STEM_RECONSTRUCTION", label: "Pitch & Time", description: "DSP modulation" },
    { id: "EXPORT", label: "Mastering", description: "-14 LUFS mixdown" },
  ];

  const handleStartMashup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const hasSourceA = (modeA === "file" && fileA) || (modeA === "url" && urlA.trim());
    const hasSourceB = (modeB === "file" && fileB) || (modeB === "url" && urlB.trim());

    if (!hasSourceA || !hasSourceB) {
      setSubmitError("Please provide both Track A and Track B audio sources");
      return;
    }

    const anyA = Object.values(selection.trackA).some(Boolean);
    const anyB = Object.values(selection.trackB).some(Boolean);
    if (!anyA && !anyB) {
      setSubmitError("Please select at least one stem to include in the remix");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (modeA === "file" && fileA) formData.append("fileA", fileA);
      if (modeA === "url") formData.append("urlA", urlA.trim());

      if (modeB === "file" && fileB) formData.append("fileB", fileB);
      if (modeB === "url") formData.append("urlB", urlB.trim());

      formData.append("selection", JSON.stringify(selection));
      formData.append("autoKeyMatch", String(autoKeyMatch));
      formData.append("autoTempoMatch", String(autoTempoMatch));
      formData.append("outputFormat", outputFormat);

      const res = await fetch("/api/mashup/create", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize mashup creation");
      }

      watchJob(data.jobId);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Mashup initiation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStem = (track: "trackA" | "trackB", stem: "vocals" | "drums" | "bass" | "other") => {
    setSelection((prev) => ({
      ...prev,
      [track]: {
        ...prev[track],
        [stem]: !prev[track][stem],
      },
    }));
  };

  const completedAsset = mediaAssets && mediaAssets.length > 0 ? mediaAssets[0] : null;

  return (
    <div className="w-full flex flex-col items-center">
      {/* =========================================================================
          MODE A: HERO CHAPTER (Editorial Storytelling)
          ========================================================================= */}
      <ModeAHero
        chapterNumber="06 // HARMONIC REMIXING"
        badge="Camelot Harmonic Matrix"
        headline="Two songs. One harmonic blend."
        subheadline="Automated Camelot key matching, phase beat synchronization, and -14 LUFS mastering."
        description="Blend vocals, basslines, and beats across any two tracks. The harmonic collision engine detects relative Camelot keys, aligns tempo phases, and safeguards audio quality with strict ±4 semitone shift caps."
        stats={[
          { label: "Harmonic Theory", value: "Camelot Wheel" },
          { label: "Pitch Safety Cap", value: "±4 st" },
          { label: "Phase Beat Sync", value: "Locked" },
          { label: "Master Loudness", value: "-14 LUFS" },
        ]}
        visualComponent={<MashupHero />}
        toolAnchorId="mashup-workspace"
        toolCtaText="Launch Mashup Studio"
      />

      {/* =========================================================================
          SEAM & MODE B: CALM PRECISION STUDIO WORKSPACE
          ========================================================================= */}
      <div
        id="mashup-workspace"
        className="w-full border-t border-white/10 bg-[#080809] py-16 px-4 sm:px-6 mode-b-precision"
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-8">
          {/* Workspace Title Header */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-sm">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  AI Mashup & Remix Studio
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Demucs Dual De-mixing • Rubberband Time & Pitch • -14 LUFS Mixdown
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              DUAL STEM COLLISION
            </span>
          </div>

          {/* Main Setup Studio Card */}
          {!isProcessing && !isCompleted && (
            <Card variant="glass" className="w-full p-6 sm:p-8 shadow-apple dark:shadow-apple-dark">
              <form onSubmit={handleStartMashup} className="flex flex-col gap-8">
                {/* Dual Track Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Track A Box (Acapella / Lead) */}
                  <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                        <Disc className="w-4 h-4" />
                        <span>Track A (Lead / Vocals)</span>
                      </div>
                      <Tabs
                        tabs={[
                          { id: "file", label: "Upload" },
                          { id: "url", label: "URL" },
                        ]}
                        activeTab={modeA}
                        onChange={(id) => setModeA(id as any)}
                      />
                    </div>

                    {modeA === "file" ? (
                      <FileDropzone
                        selectedFile={fileA}
                        onFileSelect={setFileA}
                        label="Select Track A audio file"
                        sublabel="MP3, WAV, FLAC up to 100MB"
                      />
                    ) : (
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={urlA}
                        onChange={(e) => setUrlA(e.target.value)}
                        leftIcon={<Link2 className="w-4 h-4 text-indigo-500" />}
                      />
                    )}

                    {/* Track A Stem Checklist */}
                    <div className="pt-2 border-t border-indigo-500/10">
                      <span className="text-xs font-semibold text-neutral-400 block mb-2">
                        Include Stems from Track A:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "vocals", label: "Vocals", color: "#6366F1" },
                          { key: "drums", label: "Drums", color: "#F43F5E" },
                          { key: "bass", label: "Bass", color: "#10B981" },
                          { key: "other", label: "Instruments", color: "#F59E0B" },
                        ].map((stem) => {
                          const isChecked = selection.trackA[stem.key as keyof typeof selection.trackA];
                          return (
                            <button
                              key={`stemA_${stem.key}`}
                              type="button"
                              onClick={() => toggleStem("trackA", stem.key as any)}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                                isChecked
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                  : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                              }`}
                            >
                              <span>{stem.label}</span>
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: isChecked ? "#fff" : stem.color }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Track B Box (Instrumental / Beat) */}
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <Disc className="w-4 h-4" />
                        <span>Track B (Backing / Beat)</span>
                      </div>
                      <Tabs
                        tabs={[
                          { id: "file", label: "Upload" },
                          { id: "url", label: "URL" },
                        ]}
                        activeTab={modeB}
                        onChange={(id) => setModeB(id as any)}
                      />
                    </div>

                    {modeB === "file" ? (
                      <FileDropzone
                        selectedFile={fileB}
                        onFileSelect={setFileB}
                        label="Select Track B audio file"
                        sublabel="MP3, WAV, FLAC up to 100MB"
                      />
                    ) : (
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={urlB}
                        onChange={(e) => setUrlB(e.target.value)}
                        leftIcon={<Link2 className="w-4 h-4 text-emerald-500" />}
                      />
                    )}

                    {/* Track B Stem Checklist */}
                    <div className="pt-2 border-t border-emerald-500/10">
                      <span className="text-xs font-semibold text-neutral-400 block mb-2">
                        Include Stems from Track B:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "vocals", label: "Vocals", color: "#6366F1" },
                          { key: "drums", label: "Drums", color: "#F43F5E" },
                          { key: "bass", label: "Bass", color: "#10B981" },
                          { key: "other", label: "Instruments", color: "#F59E0B" },
                        ].map((stem) => {
                          const isChecked = selection.trackB[stem.key as keyof typeof selection.trackB];
                          return (
                            <button
                              key={`stemB_${stem.key}`}
                              type="button"
                              onClick={() => toggleStem("trackB", stem.key as any)}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                                isChecked
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                              }`}
                            >
                              <span>{stem.label}</span>
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: isChecked ? "#fff" : stem.color }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pre-Render Compatibility Meter & DSP Options */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 font-bold">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Harmonic Compatibility: {compatibility.scorePercent}% Match
                        </h4>
                        <p className="text-xs text-neutral-400 font-mono">
                          Camelot: {compatibility.camelotA} vs {compatibility.camelotB} • BPM: {compatibility.bpmA} vs {compatibility.bpmB}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {compatibility.pitchShiftCapped && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Pitch Shift Capped (±4 st)
                        </span>
                      )}
                      {compatibility.tempoStretchWarning && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> &gt;20% Tempo Stretch
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggles & Format */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-300">
                      <input
                        type="checkbox"
                        checked={autoKeyMatch}
                        onChange={(e) => setAutoKeyMatch(e.target.checked)}
                        className="rounded text-apple-blue focus:ring-apple-blue"
                      />
                      <span>Auto Key-Matching (Pitch-shift capped ±4 st)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-300">
                      <input
                        type="checkbox"
                        checked={autoTempoMatch}
                        onChange={(e) => setAutoTempoMatch(e.target.checked)}
                        className="rounded text-apple-blue focus:ring-apple-blue"
                      />
                      <span>Auto Tempo-Matching (Time-stretch to sync)</span>
                    </label>

                    <Select
                      label="Mastering Format"
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value as any)}
                      options={[
                        { value: "mp3", label: "MP3 (320 kbps Master)" },
                        { value: "wav", label: "WAV (Uncompressed 24-bit)" },
                        { value: "flac", label: "FLAC (Lossless Free Audio)" },
                      ]}
                    />
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-apple"
                >
                  <Layers className="w-4 h-4" /> Render AI Mashup Mixdown
                </Button>
              </form>
            </Card>
          )}

          {/* Live SSE Real-Time Progress */}
          {isProcessing && (
            <Card variant="glass" className="w-full p-8 text-center flex flex-col items-center gap-6 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-400">
                <Sparkles className="w-5 h-5 animate-spin" />
                <h3 className="text-lg font-bold text-white">
                  Rendering AI Mashup Mixdown
                </h3>
              </div>

              <ProgressRing progress={progress} size={140} strokeWidth={10} color="#F43F5E" />

              <p className="text-sm font-medium text-neutral-300 max-w-md">
                {message || "Isolating stems, tuning Camelot key, and time-stretching beats..."}
              </p>

              <StageStepper
                stages={stagesList}
                currentStageId={stage}
                isCompleted={isCompleted}
                isFailed={isFailed}
              />
            </Card>
          )}

          {/* Completed Mashup Player */}
          {isCompleted && completedAsset && (
            <Card variant="glass" className="w-full p-8 flex flex-col gap-6 animate-in fade-in shadow-apple">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {completedAsset.name}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      Target -14 LUFS Master • Format: {completedAsset.format?.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    href={completedAsset.filePath}
                    download
                    size="sm"
                    className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Master
                  </Button>
                  <Button variant="glass" size="sm" onClick={reset} className="text-xs">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Create Another
                  </Button>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={completedAsset.filePath}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => setIsPlaying(false)}
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>

                <WaveformVisualizer
                  waveformData={completedAsset.waveformData}
                  currentTime={currentTime}
                  duration={duration || 180}
                  onSeek={(time) => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = time;
                      setCurrentTime(time);
                    }
                  }}
                  accentColor="#F43F5E"
                  height={36}
                />
              </div>

              {/* Transport Bar */}
              <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/10">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!audioRef.current) return;
                    if (isPlaying) {
                      audioRef.current.pause();
                      setIsPlaying(false);
                    } else {
                      audioRef.current.play().catch(() => {});
                      setIsPlaying(true);
                    }
                  }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-apple"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MashupCreatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MashupCreatorContent />
    </Suspense>
  );
}
