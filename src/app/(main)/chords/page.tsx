"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Link2,
  Search,
  Upload,
  RotateCcw,
  Music2,
  AlertCircle,
  Repeat,
  Volume2,
  ChevronRight,
} from "lucide-react";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { ChordDiagram } from "@/components/chords/ChordDiagram";
import {
  ChordEvent,
  SongSection,
  transposeChord,
  simplifyChord,
  calculateBestCapo,
} from "@/domain/value-objects/ChordData";
import { useRealtimeJob } from "@/lib/useRealtimeJob";
import { formatDuration } from "@/lib/utils";

const STAGES = [
  { id: "RESOLVING", label: "Resolving Stream" },
  { id: "ANALYSIS", label: "Instrument Isolation" },
  { id: "MODEL_INFERENCE", label: "ML & CQT Recognition" },
  { id: "EXPORT", label: "HMM Viterbi Smoothing" },
];

function ChordDetectorContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [inputMode, setInputMode] = useState<"url" | "search" | "file">(initialUrl ? "url" : "url");
  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Analysis result
  const [chordTimeline, setChordTimeline] = useState<ChordEvent[]>([]);
  const [detectedKey, setDetectedKey] = useState<string>("C Major");
  const [originalKey, setOriginalKey] = useState<string>("C Major");
  const [camelotKey, setCamelotKey] = useState<string>("8B");
  const [bpm, setBpm] = useState<number>(120);
  const [capo, setCapo] = useState<number>(0);
  const [sections, setSections] = useState<SongSection[]>([]);
  const [detectedVocabulary, setDetectedVocabulary] = useState<string[]>([]);
  const [mediaSrc, setMediaSrc] = useState<string>("");
  const [isVideo, setIsVideo] = useState<boolean>(true);

  // Player synchronization
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [transposeSemis, setTransposeSemis] = useState<number>(0);
  const [isSimplified, setIsSimplified] = useState<boolean>(false);
  const [instrument, setInstrument] = useState<"guitar" | "piano" | "ukulele">("guitar");

  // Loop / Practice Mode (Section B.8)
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [loopRange, setLoopRange] = useState<{ startSec: number; endSec: number } | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const activeChordButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const {
    jobId,
    stage,
    progress,
    message,
    error: jobError,
    mediaAssets,
    isCompleted,
    isFailed,
    isProcessing,
    watchJob,
    reset,
    cancel,
  } = useRealtimeJob("CHORD_DETECTION");

  // On job completion, extract chord timeline, sections, and metadata
  useEffect(() => {
    if (isCompleted && jobId) {
      if (mediaAssets && mediaAssets.length > 0) {
        const asset = mediaAssets[0];
        const meta = (asset.metadata || {}) as any;
        const chords = meta.chordTimeline || meta.chords || [];
        setChordTimeline(chords);
        setDetectedKey(meta.detectedKey || "C Major");
        setOriginalKey(meta.originalKey || meta.detectedKey || "C Major");
        setCamelotKey(meta.camelotKey || "8B");
        setBpm(meta.bpm || 120);
        setCapo(meta.recommendedCapo || 0);
        setSections(meta.sections || []);
        setDetectedVocabulary(meta.detectedVocabulary || []);

        const src = meta.sourceUrl || asset.filePath || asset.url;
        setMediaSrc(src);
        setIsVideo(meta.mediaType === "video" || !!meta.sourceUrl);
      } else {
        // Fetch job detail directly
        fetch(`/api/jobs/${jobId}`)
          .then((res) => res.json())
          .then((data) => {
            const chords = data?.chordTimeline || data?.job?.resultMedia?.chordTimeline || [];
            if (chords.length > 0) {
              setChordTimeline(chords);
              setBpm(data.bpm || 120);
              setDetectedKey(data.key || "C Major");
              setOriginalKey(data.originalKey || data.key || "C Major");
              setSections(data.sections || []);
              setDetectedVocabulary(data.detectedVocabulary || []);
            }
          })
          .catch(() => {});
      }
    }
  }, [isCompleted, jobId, mediaAssets]);

  // Find active chord index based on current playback time
  const activeIndex = chordTimeline.findIndex((c, idx) => {
    const start = c.startSec ?? c.timestamp ?? 0;
    const end = c.endSec ?? chordTimeline[idx + 1]?.startSec ?? chordTimeline[idx + 1]?.timestamp ?? (duration || 9999);
    return currentTime >= start && currentTime < end;
  });

  const activeChordEvent = activeIndex >= 0 ? chordTimeline[activeIndex] : null;

  // Next 1-2 upcoming chords for lookahead anticipation (Section B.9)
  const nextChord1 = activeIndex >= 0 && activeIndex + 1 < chordTimeline.length ? chordTimeline[activeIndex + 1] : null;
  const nextChord2 = activeIndex >= 0 && activeIndex + 2 < chordTimeline.length ? chordTimeline[activeIndex + 2] : null;

  // Active song structure section based on current time (Section B.2)
  const activeSection = sections.find(
    (sec) => currentTime >= sec.startSec && currentTime <= sec.endSec
  );

  // Dynamic Capo suggestion calculation when user transposes (Section B.4)
  const rawKeyRoot = originalKey.replace(" Major", "").replace(" Minor", "").trim();
  const transposedKeyRoot = transposeChord(rawKeyRoot, transposeSemis);
  const effectiveTransposedKey = `${transposedKeyRoot}${originalKey.includes("Minor") ? " Minor" : " Major"}`;
  const effectiveCapo = calculateBestCapo(effectiveTransposedKey).fret;

  // Frame-accurate auto-scrolling with requestAnimationFrame (Section B.9)
  useEffect(() => {
    if (activeChordButtonRef.current && timelineContainerRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      animFrameRef.current = requestAnimationFrame(() => {
        activeChordButtonRef.current?.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      });
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeIndex]);

  // Audio synthesis preview callback (Section B.7)
  const playChordPreview = useCallback((chordStr: string) => {
    try {
      const audio = new Audio(`/api/chords/preview-audio?chord=${encodeURIComponent(chordStr)}`);
      audio.play().catch(() => {});
    } catch {}
  }, []);

  const handleStartDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (inputMode === "file" && !selectedFile) {
      setSubmitError("Please select an audio file");
      return;
    }
    if (inputMode === "url" && !urlInput.trim()) {
      setSubmitError("Please enter a valid YouTube or stream URL");
      return;
    }
    if (inputMode === "search" && !searchQuery.trim()) {
      setSubmitError("Please enter a search term");
      return;
    }

    setIsSubmitting(true);

    try {
      let endpoint = "/api/chords/detect";
      let body: any;

      if (inputMode === "file" && selectedFile) {
        endpoint = "/api/chords";
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("inputType", "file");
        body = formData;
      } else {
        body = JSON.stringify({
          inputType: inputMode,
          url: inputMode === "url" ? urlInput.trim() : undefined,
          query: inputMode === "search" ? searchQuery.trim() : undefined,
        });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: inputMode === "file" ? undefined : { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const targetJobId = data.jobId || data.id;

      if (!targetJobId) {
        throw new Error("No job ID received from detection service");
      }

      watchJob(targetJobId, "CHORD_DETECTION");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate chord detection";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeekToChord = (sec: number) => {
    setCurrentTime(sec);
  };

  const handleToggleSectionLoop = (sec: SongSection) => {
    if (isLooping && loopRange?.startSec === sec.startSec && loopRange?.endSec === sec.endSec) {
      setIsLooping(false);
      setLoopRange(null);
    } else {
      setLoopRange({ startSec: sec.startSec, endSec: sec.endSec });
      setIsLooping(true);
      setCurrentTime(sec.startSec);
    }
  };

  const handleResetAll = () => {
    reset();
    setChordTimeline([]);
    setMediaSrc("");
    setUrlInput("");
    setSearchQuery("");
    setSelectedFile(null);
    setSubmitError(null);
    setIsLooping(false);
    setLoopRange(null);
  };

  // Compute displayed chord with transpose and simplify applied non-destructively
  const formatChordDisplay = (rawChord: string) => {
    if (!rawChord || rawChord === "N.C." || rawChord === "nc") return "N.C.";
    let c = transposeChord(rawChord, transposeSemis);
    if (isSimplified) c = simplifyChord(c);
    return c;
  };

  const displayActiveChord = formatChordDisplay(activeChordEvent?.chord || "N.C.");
  const displayNext1 = nextChord1 ? formatChordDisplay(nextChord1.chord) : null;
  const displayNext2 = nextChord2 ? formatChordDisplay(nextChord2.chord) : null;

  const activeStageIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="min-h-screen bg-mono-bg text-mono-ink px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-black/10 dark:border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              Chordify-Parity ML Harmonic Engine
            </span>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Chord Detector &amp; Studio</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Instrument-isolated HMM Viterbi recognition, slash inversions, song structure sections, and practice loops.
            </p>
          </div>

          {(isCompleted || isFailed) && (
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-1.5 self-start sm:self-end"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Analyze Another Track
            </button>
          )}
        </div>

        {/* Input Switcher Tabs */}
        {!isProcessing && chordTimeline.length === 0 && (
          <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-6 space-y-6">
            <div className="flex border-b border-black/10 dark:border-white/10 text-xs font-medium">
              <button
                onClick={() => setInputMode("url")}
                className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  inputMode === "url"
                    ? "border-black dark:border-white text-black dark:text-white font-bold"
                    : "border-transparent text-neutral-500 hover:text-black dark:hover:text-white"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" /> YouTube URL
              </button>
              <button
                onClick={() => setInputMode("search")}
                className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  inputMode === "search"
                    ? "border-black dark:border-white text-black dark:text-white font-bold"
                    : "border-transparent text-neutral-500 hover:text-black dark:hover:text-white"
                }`}
              >
                <Search className="w-3.5 h-3.5" /> YouTube Search
              </button>
              <button
                onClick={() => setInputMode("file")}
                className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  inputMode === "file"
                    ? "border-black dark:border-white text-black dark:text-white font-bold"
                    : "border-transparent text-neutral-500 hover:text-black dark:hover:text-white"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Local File Upload
              </button>
            </div>

            <form onSubmit={handleStartDetection} className="space-y-4">
              {inputMode === "url" && (
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-neutral-50 dark:bg-black/40 border border-black/10 dark:border-white/10 pl-9 pr-3 py-2.5 text-xs font-mono focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>
              )}

              {inputMode === "search" && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search artist, song title, or music video..."
                    className="w-full bg-neutral-50 dark:bg-black/40 border border-black/10 dark:border-white/10 pl-9 pr-3 py-2.5 text-xs font-mono focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>
              )}

              {inputMode === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40 p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                  >
                    <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-black dark:text-white">{selectedFile.name}</p>
                        <p className="text-[10px] font-mono text-neutral-500">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-black dark:text-white">Click to select audio or video file</p>
                        <p className="text-[10px] text-neutral-400">MP3, WAV, FLAC, MP4 up to 100MB</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-medium text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Detect Chords &amp; Sync Playback
              </button>
            </form>
          </div>
        )}

        {/* Realtime Stage Tracker (Horizontal Line) */}
        {isProcessing && (
          <div className="border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-[#0A0A0A] space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-neutral-500">Chord Pipeline Progress</span>
              <span className="font-mono tabular-nums font-bold text-black dark:text-white">{progress}%</span>
            </div>

            <div className="relative w-full h-[2px] bg-neutral-200 dark:bg-neutral-800">
              <div
                className="absolute top-0 left-0 bottom-0 bg-black dark:bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              {STAGES.map((s, idx) => {
                const isPast = activeStageIndex > idx || (activeStageIndex === -1 && progress >= 90);
                const isCurrent = activeStageIndex === idx;

                return (
                  <div key={s.id} className="text-center space-y-1">
                    <p
                      className={`text-[11px] uppercase font-mono truncate ${
                        isCurrent
                          ? "font-bold text-black dark:text-white"
                          : isPast
                          ? "text-neutral-500 dark:text-neutral-400"
                          : "text-neutral-300 dark:text-neutral-700"
                      }`}
                    >
                      {s.label}
                    </p>
                    <div
                      className={`w-full h-1 mx-auto ${
                        isCurrent
                          ? "bg-black dark:bg-white"
                          : isPast
                          ? "bg-neutral-400 dark:bg-neutral-600"
                          : "bg-neutral-100 dark:bg-neutral-900"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-neutral-500 font-mono text-center pt-2">
              {message || "Running beat-synchronous ML chroma recognition on isolated instrument stem..."}
            </p>
          </div>
        )}

        {/* Error Notification */}
        {(submitError || (isFailed && jobError)) && (
          <div className="p-4 border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 flex items-start gap-3 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Analysis Failed</p>
              <p className="mt-0.5">{submitError || jobError}</p>
            </div>
          </div>
        )}

        {/* Synced Chordify-Style Player & Chord View */}
        {chordTimeline.length > 0 && (
          <div className="space-y-6">
            {/* Metadata Badges Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 text-xs font-mono">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Detected Key</span>
                <span className="font-bold text-sm text-black dark:text-white">
                  {effectiveTransposedKey}
                  {transposeSemis !== 0 && (
                    <span className="text-[10px] text-neutral-400 block font-normal">
                      Orig: {originalKey} ({transposeSemis > 0 ? `+${transposeSemis}` : transposeSemis})
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Camelot Wheel</span>
                <span className="font-bold text-sm text-black dark:text-white">{camelotKey}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Tempo</span>
                <span className="font-bold text-sm text-black dark:text-white">{Math.round(bpm)} BPM</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Capo Suggestion</span>
                <span className="font-bold text-sm text-black dark:text-white">
                  {effectiveCapo > 0 ? `Capo ${effectiveCapo}` : "No Capo (Standard)"}
                </span>
              </div>
            </div>

            {/* Song Structure Sections Strip (Section B.2 & B.8) */}
            {sections.length > 0 && (
              <div className="p-3 bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                    Song Structure Sections
                  </span>
                  {isLooping && loopRange && (
                    <span className="font-mono text-[10px] text-emerald-500 flex items-center gap-1 font-bold">
                      <Repeat className="w-3 h-3 animate-spin" />
                      Loop Active: {formatDuration(loopRange.startSec)} - {formatDuration(loopRange.endSec)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {sections.map((sec, idx) => {
                    const isSecActive = activeSection?.startSec === sec.startSec;
                    const isSecLooped = isLooping && loopRange?.startSec === sec.startSec;

                    return (
                      <div
                        key={idx}
                        className={`shrink-0 flex items-center border text-xs font-mono transition-all ${
                          isSecLooped
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : isSecActive
                            ? "border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold"
                            : "border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30"
                        }`}
                      >
                        <button
                          onClick={() => handleSeekToChord(sec.startSec)}
                          className="px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <span>{sec.label}</span>
                          <span className="text-[10px] opacity-60">({formatDuration(sec.startSec)})</span>
                        </button>
                        <button
                          onClick={() => handleToggleSectionLoop(sec)}
                          title="Toggle Loop for this section"
                          className="px-2 py-1.5 border-l border-inherit hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <Repeat className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Synced Player Surface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Unified Media Player */}
              <div className="lg:col-span-2 space-y-4">
                <MediaPlayer
                  src={mediaSrc}
                  mediaType={isVideo ? "video" : "audio"}
                  title={`Harmonic Track (${effectiveTransposedKey})`}
                  artist="Chordify Synced Pipeline"
                  onTimeUpdate={(ct, dur) => {
                    setCurrentTime(ct);
                    if (dur > 0) setDuration(dur);

                    // Handle Loop Practice Mode Boundary (Section B.8)
                    if (isLooping && loopRange && ct >= loopRange.endSec) {
                      handleSeekToChord(loopRange.startSec);
                    }
                  }}
                />

                {/* Transpose, Simplify, Speed & Practice Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Transpose (Section B.3: full ±11 semitone range) */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-neutral-500 uppercase text-[10px]">Transpose</span>
                      <div className="flex items-center gap-1 font-mono">
                        <button
                          onClick={() => setTransposeSemis((p) => Math.max(-11, p - 1))}
                          className="px-2 py-0.5 border border-black/10 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                          title="Transpose down 1 semitone"
                        >
                          -
                        </button>
                        <span className="w-8 text-center tabular-nums font-bold">
                          {transposeSemis > 0 ? `+${transposeSemis}` : transposeSemis}
                        </span>
                        <button
                          onClick={() => setTransposeSemis((p) => Math.min(11, p + 1))}
                          className="px-2 py-0.5 border border-black/10 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                          title="Transpose up 1 semitone"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Simplify Chords Toggle (Section B.5) */}
                    <button
                      onClick={() => setIsSimplified((p) => !p)}
                      className={`px-2.5 py-1 text-[11px] border border-black/10 dark:border-white/10 font-mono transition-colors ${
                        isSimplified
                          ? "bg-black text-white dark:bg-white dark:text-black font-bold"
                          : "text-neutral-500 hover:text-black dark:hover:text-white"
                      }`}
                      title="Collapse extended chords to triads (Cmaj7 -> C)"
                    >
                      Simplify Chords
                    </button>

                    {/* Loop Practice Mode Toggle (Section B.8) */}
                    <button
                      onClick={() => {
                        if (isLooping) {
                          setIsLooping(false);
                          setLoopRange(null);
                        } else if (activeSection) {
                          handleToggleSectionLoop(activeSection);
                        } else if (activeChordEvent) {
                          setLoopRange({
                            startSec: activeChordEvent.startSec ?? 0,
                            endSec: activeChordEvent.endSec ?? (activeChordEvent.startSec ?? 0) + 4,
                          });
                          setIsLooping(true);
                        }
                      }}
                      className={`px-2.5 py-1 text-[11px] border font-mono flex items-center gap-1.5 transition-colors ${
                        isLooping
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold"
                          : "border-black/10 dark:border-white/10 text-neutral-500 hover:text-black dark:hover:text-white"
                      }`}
                      title="Loop active section or chord for practice"
                    >
                      <Repeat className="w-3 h-3" />
                      {isLooping ? "Loop Active" : "Practice Loop"}
                    </button>
                  </div>

                  {/* Instrument Selector (Section B.6) */}
                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    <button
                      onClick={() => setInstrument("guitar")}
                      className={`px-2.5 py-1 transition-colors ${
                        instrument === "guitar"
                          ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                          : "text-neutral-500 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      Guitar
                    </button>
                    <button
                      onClick={() => setInstrument("ukulele")}
                      className={`px-2.5 py-1 transition-colors ${
                        instrument === "ukulele"
                          ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                          : "text-neutral-500 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      Ukulele
                    </button>
                    <button
                      onClick={() => setInstrument("piano")}
                      className={`px-2.5 py-1 transition-colors ${
                        instrument === "piano"
                          ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                          : "text-neutral-500 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      Piano
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Chord Diagram & Lookahead Box (Section B.6, B.7, B.9) */}
              <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-6 flex flex-col items-center justify-between">
                <div className="text-center space-y-1 mb-3 w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                      Active Chord
                    </span>
                    {activeChordEvent?.sectionLabel && (
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-white/5 border border-black/10 dark:border-white/10">
                        {activeChordEvent.sectionLabel}
                      </span>
                    )}
                  </div>
                  <h3 className="text-4xl font-black font-mono tracking-tight text-black dark:text-white">
                    {displayActiveChord}
                  </h3>
                  {activeChordEvent && (
                    <p className="font-mono text-[10px] text-neutral-400">
                      {formatDuration(activeChordEvent.startSec ?? 0)} - {formatDuration(activeChordEvent.endSec ?? 0)}
                    </p>
                  )}
                </div>

                {/* Fingering Diagram with relative capo fingering and click-to-preview audio */}
                <div className="w-full flex justify-center my-2">
                  {displayActiveChord !== "N.C." && displayActiveChord !== "nc" ? (
                    <ChordDiagram
                      chord={displayActiveChord}
                      instrument={instrument}
                      capo={effectiveCapo}
                      onPreview={playChordPreview}
                      className="border-0 bg-transparent p-0"
                    />
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-neutral-400 text-xs font-mono">
                      <Music2 className="w-8 h-8 opacity-30 mb-2" />
                      No harmonic chord (N.C.)
                    </div>
                  )}
                </div>

                {/* Synced Lookahead Pill (Section B.9) */}
                <div className="w-full pt-3 border-t border-black/10 dark:border-white/10 mt-3 text-xs font-mono">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1.5 uppercase tracking-wider">
                    <span>Lookahead Anticipation</span>
                    <span className="text-[9px]">Tap to Preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {displayNext1 ? (
                      <button
                        onClick={() => playChordPreview(displayNext1)}
                        className="flex-1 py-1.5 px-2 border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-white/5 flex items-center justify-between hover:border-black/40 dark:hover:border-white/40 transition-colors"
                      >
                        <span className="font-bold">{displayNext1}</span>
                        <span className="text-[9px] text-neutral-400">Next</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-1.5 text-center text-neutral-500 text-[10px]">End of track</div>
                    )}
                    {displayNext2 && (
                      <button
                        onClick={() => playChordPreview(displayNext2)}
                        className="flex-1 py-1.5 px-2 border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-white/5 flex items-center justify-between hover:border-black/40 dark:hover:border-white/40 transition-colors opacity-75"
                      >
                        <span className="font-bold">{displayNext2}</span>
                        <span className="text-[9px] text-neutral-400">+2</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Synced Chord Timeline (Chordify-style UX) */}
            <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-black/10 dark:border-white/10 pb-2">
                <span className="font-mono uppercase text-neutral-500 flex items-center gap-2">
                  Synchronized Chord Progression ({chordTimeline.length} Bars)
                  {isSimplified && <span className="text-[10px] text-neutral-400 font-normal">[Simplified]</span>}
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  Current: {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div
                ref={timelineContainerRef}
                className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-thin select-none"
              >
                {chordTimeline.map((item, idx) => {
                  const start = item.startSec ?? item.timestamp ?? 0;
                  const end = item.endSec ?? chordTimeline[idx + 1]?.startSec ?? chordTimeline[idx + 1]?.timestamp ?? start + 2;
                  const isActive = idx === activeIndex;
                  const isNext = idx === activeIndex + 1;
                  const chordName = formatChordDisplay(item.chord);

                  const isItemInLoop =
                    isLooping && loopRange && start >= loopRange.startSec && end <= loopRange.endSec;

                  return (
                    <div
                      key={idx}
                      className="relative shrink-0 flex flex-col"
                    >
                      {item.sectionLabel && (idx === 0 || chordTimeline[idx - 1]?.sectionLabel !== item.sectionLabel) && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 mb-1 px-1">
                          {item.sectionLabel}
                        </span>
                      )}
                      <button
                        ref={isActive ? activeChordButtonRef : null}
                        onClick={() => {
                          handleSeekToChord(start);
                          if (chordName !== "N.C.") {
                            playChordPreview(chordName);
                          }
                        }}
                        className={`w-24 h-20 border flex flex-col items-center justify-center gap-1 transition-all duration-150 ${
                          isActive
                            ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white scale-105 shadow-md ring-1 ring-white/30"
                            : isNext
                            ? "bg-neutral-100 dark:bg-neutral-800/80 border-black/20 dark:border-white/20"
                            : isItemInLoop
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                            : "bg-neutral-50 dark:bg-neutral-900 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30"
                        }`}
                      >
                        <span className="font-mono font-bold text-base leading-none">{chordName}</span>
                        <div className="flex items-center gap-1">
                          <span className={`font-mono text-[9px] ${isActive ? "opacity-80" : "text-neutral-400"}`}>
                            {formatDuration(start)}
                          </span>
                          {chordName !== "N.C." && (
                            <Volume2 className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChordDetectorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent animate-spin" />
        </div>
      }
    >
      <ChordDetectorContent />
    </Suspense>
  );
}
