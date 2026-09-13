"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Download,
  Link2,
  Music,
  Video,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Play,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { StageStepper } from "@/components/ui/StageStepper";
import { LinkMorphHero } from "@/components/visual/LinkMorphHero";
import { ModeAHero } from "@/components/layout/ModeAHero";
import { useRealtimeJob } from "@/lib/useRealtimeJob";
import { useGlobalAudio } from "@/components/audio/GlobalAudioPlayer";
import { formatDuration, formatBytes } from "@/lib/utils";

interface MediaPreviewInfo {
  id: string;
  title: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  author?: string;
  sourceUrl: string;
}

function LinkDownloaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isResolving, setIsResolving] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<MediaPreviewInfo | null>(null);
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");
  const [targetFormat, setTargetFormat] = useState("mp3");
  const [qualityOrResolution, setQualityOrResolution] = useState("320k");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { playTrack } = useGlobalAudio();

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

  useEffect(() => {
    if (initialUrl && !previewInfo) {
      setUrlInput(initialUrl);
      resolveUrl(initialUrl);
    }
  }, [initialUrl, previewInfo]);

  const stagesList = [
    { id: "RESOLVING", label: "Resolving", description: "Stream parsing" },
    { id: "DOWNLOADING", label: "Downloading", description: "Payload retrieval" },
    { id: "TRANSCODING", label: "Transcoding", description: "FFmpeg encoding" },
    { id: "EXPORT", label: "Validation", description: "FFprobe verified" },
  ];

  const resolveUrl = async (url: string) => {
    if (!url.trim()) return;
    setErrorMsg(null);
    setIsResolving(true);

    try {
      const res = await fetch("/api/download/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not resolve URL");
      }
      setPreviewInfo(data.metadata);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to inspect link");
    } finally {
      setIsResolving(false);
    }
  };

  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg("Please enter a media URL");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput.trim(),
          mediaType,
          targetFormat,
          qualityOrResolution,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Download failed to initialize");
      }

      watchJob(data.jobId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Download failed to initialize");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadedAsset = mediaAssets && mediaAssets.length > 0 ? mediaAssets[0] : null;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Editorial Chapter Hero */}
      <ModeAHero
        chapterNumber="02 // STREAM EXTRACTION"
        badge="Direct Stream Archiver"
        headline="Lossless audio and video. Extracted instantly."
        subheadline="Acoustic fingerprinting, -14 LUFS loudness mastering, and verified container integrity."
        description="Extract streams from YouTube and remote media URLs directly to studio 320 kbps MP3, FLAC, and 1080p MP4 formats with automated ID3 tag extraction and zero storage bloat."
        stats={[
          { label: "Audio Bitrate", value: "320 kbps" },
          { label: "Lossless Codec", value: "FLAC" },
          { label: "Video Container", value: "1080p MP4" },
          { label: "Loudness", value: "-14 LUFS" },
        ]}
        visualComponent={<LinkMorphHero />}
        toolAnchorId="download-workspace"
        toolCtaText="Open Downloader"
        align="right"
      />

      {/* Monolith Precision Studio Workspace */}
      <div
        id="download-workspace"
        className="w-full border-t border-[var(--line)] bg-[var(--bg-primary)] py-12 px-4 sm:px-6"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          {/* Section Header */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border border-[var(--line)] flex items-center justify-center text-[var(--ink-primary)]">
                <Download className="w-3.5 h-3.5 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold tracking-tight uppercase text-[var(--ink-primary)]">
                  Universal Downloader Workspace
                </h2>
                <p className="text-[11px] font-mono text-[var(--ink-secondary)]">
                  FFmpeg / FFprobe Verified Pipeline • EBU R128 Dual-Pass Normalization
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[var(--line)] text-[var(--ink-secondary)]">
              {mediaType.toUpperCase()} MODE
            </span>
          </div>

          {/* Main Action Input Card */}
          {!isProcessing && !isCompleted && (
            <Card className="w-full p-6">
              <form onSubmit={handleStartDownload} className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                  <div className="flex-1">
                    <Input
                      label="Media or YouTube URL"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => resolveUrl(urlInput)}
                    isLoading={isResolving}
                    className="h-9 text-xs shrink-0 font-mono"
                  >
                    Inspect Link
                  </Button>
                </div>

                {/* Media Metadata Preview Card */}
                {previewInfo && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-[var(--line)] bg-[var(--bg-secondary)]">
                    {previewInfo.thumbnailUrl ? (
                      <div className="relative w-24 h-16 shrink-0 bg-[var(--bg-primary)] border border-[var(--line)] overflow-hidden">
                        <img
                          src={previewInfo.thumbnailUrl}
                          alt={previewInfo.title}
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 border border-[var(--line)] text-[var(--ink-primary)] flex items-center justify-center shrink-0">
                        <Music className="w-6 h-6 stroke-[1.5]" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-mono font-bold text-[var(--ink-primary)] truncate">
                        {previewInfo.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-secondary)] mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 stroke-[1.5]" /> {previewInfo.author || "Creator"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 stroke-[1.5]" /> {formatDuration(previewInfo.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio vs Video Mode Selector */}
                <div className="flex justify-center pt-2">
                  <Tabs
                    tabs={[
                      { id: "audio", label: "Extract Audio", icon: <Music className="w-3.5 h-3.5 stroke-[1.5]" /> },
                      { id: "video", label: "Download Video", icon: <Video className="w-3.5 h-3.5 stroke-[1.5]" /> },
                    ]}
                    activeTab={mediaType}
                    onChange={(id) => {
                      setMediaType(id as "audio" | "video");
                      setTargetFormat(id === "audio" ? "mp3" : "mp4");
                      setQualityOrResolution(id === "audio" ? "320k" : "1080p");
                    }}
                  />
                </div>

                {/* Transcoding Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--line)]">
                  {mediaType === "audio" ? (
                    <>
                      <Select
                        label="Audio Format"
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        options={[
                          { value: "mp3", label: "MP3 (MPEG Audio Layer III)" },
                          { value: "wav", label: "WAV (Uncompressed PCM)" },
                          { value: "flac", label: "FLAC (Lossless Free Audio)" },
                          { value: "m4a", label: "M4A (Apple AAC)" },
                          { value: "ogg", label: "OGG (Vorbis Audio)" },
                        ]}
                      />

                      <Select
                        label="Audio Bitrate"
                        value={qualityOrResolution}
                        onChange={(e) => setQualityOrResolution(e.target.value)}
                        options={[
                          { value: "320k", label: "320 kbps (Studio Fidelity)" },
                          { value: "256k", label: "256 kbps (High Quality)" },
                          { value: "192k", label: "192 kbps (Standard)" },
                          { value: "128k", label: "128 kbps (Compact)" },
                        ]}
                      />
                    </>
                  ) : (
                    <>
                      <Select
                        label="Video Container"
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        options={[
                          { value: "mp4", label: "MP4 (H.264 / AAC Universal)" },
                          { value: "webm", label: "WebM (VP9 / Opus)" },
                          { value: "mkv", label: "MKV (Matroska Container)" },
                        ]}
                      />

                      <Select
                        label="Resolution"
                        value={qualityOrResolution}
                        onChange={(e) => setQualityOrResolution(e.target.value)}
                        options={[
                          { value: "best", label: "Best Available Resolution" },
                          { value: "1080p", label: "1080p Full HD" },
                          { value: "720p", label: "720p HD" },
                          { value: "480p", label: "480p SD" },
                          { value: "360p", label: "360p Compact" },
                        ]}
                      />
                    </>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 border border-[var(--line)] bg-[var(--bg-secondary)] text-xs text-[var(--ink-primary)] font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.5]" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 font-mono"
                >
                  <Download className="w-3.5 h-3.5 stroke-[1.5]" /> Download & Transcode Stream
                </Button>
              </form>
            </Card>
          )}

          {/* Processing State */}
          {isProcessing && (
            <Card className="w-full p-8 flex flex-col items-center gap-6 text-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--ink-primary)] animate-pulse" />
                <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-[var(--ink-primary)]">
                  Downloading & Transcoding
                </h3>
              </div>

              {/* Monolith Linear Progress */}
              <div className="w-full max-w-md flex flex-col gap-2">
                <div className="flex justify-between text-[11px] font-mono text-[var(--ink-secondary)]">
                  <span>{message || "Downloading stream..."}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1 bg-[var(--line)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--ink-primary)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <StageStepper
                stages={stagesList}
                currentStageId={stage}
                isCompleted={isCompleted}
                isFailed={isFailed}
              />
            </Card>
          )}

          {/* Failed State */}
          {isFailed && (
            <Card className="w-full p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-10 h-10 border border-[var(--line)] flex items-center justify-center text-[var(--ink-primary)]">
                <AlertCircle className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                Download Failed
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] font-mono max-w-md">
                {error || "Could not complete media download. Please check the URL and try again."}
              </p>
              <Button variant="secondary" onClick={reset} className="text-xs font-mono">
                <RotateCcw className="w-3.5 h-3.5 mr-1 stroke-[1.5]" /> Try Another Link
              </Button>
            </Card>
          )}

          {/* Completed State */}
          {isCompleted && downloadedAsset && (
            <Card className="w-full p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-primary)]">
                  <CheckCircle2 className="w-4 h-4 stroke-[1.5]" />
                  <span className="font-semibold uppercase tracking-wider">Transcode Complete & Verified</span>
                </div>
                <Button variant="secondary" size="sm" onClick={reset} className="text-xs font-mono">
                  <RotateCcw className="w-3 h-3 mr-1 stroke-[1.5]" /> New Link
                </Button>
              </div>

              <div className="p-4 border border-[var(--line)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 border border-[var(--line)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--ink-primary)] shrink-0">
                    {downloadedAsset.kind === "DOWNLOAD_VIDEO" ? (
                      <Video className="w-5 h-5 stroke-[1.5]" />
                    ) : (
                      <Music className="w-5 h-5 stroke-[1.5]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-mono font-bold text-[var(--ink-primary)] truncate">
                      {downloadedAsset.name}
                    </h4>
                    <p className="text-[11px] text-[var(--ink-secondary)] font-mono mt-0.5">
                      Format: {downloadedAsset.format.toUpperCase()} • Codec: {downloadedAsset.codec}
                      {downloadedAsset.sizeBytes ? ` • ${formatBytes(downloadedAsset.sizeBytes)}` : ""}
                      {downloadedAsset.duration ? ` • ${formatDuration(downloadedAsset.duration)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end font-mono">
                  {downloadedAsset.kind === "DOWNLOAD_AUDIO" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        playTrack({
                          id: downloadedAsset.id,
                          title: downloadedAsset.name,
                          src: downloadedAsset.filePath,
                          duration: downloadedAsset.duration || 180,
                        })
                      }
                      className="text-xs h-8"
                    >
                      <Play className="w-3 h-3 fill-current mr-1" /> Preview
                    </Button>
                  )}

                  <Button
                    href={downloadedAsset.filePath}
                    download={`${downloadedAsset.name}.${downloadedAsset.format}`}
                    size="sm"
                    className="text-xs h-8"
                  >
                    <Download className="w-3 h-3 mr-1 stroke-[1.5]" /> Save
                  </Button>
                </div>
              </div>

              {/* Quick Action Handoffs (Section 4.2.8) */}
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-secondary)] mb-3 block">
                  Quick Action Handoffs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/stems?url=${encodeURIComponent(urlInput)}`)}
                    className="p-3 border border-[var(--line)] bg-[var(--bg-secondary)] hover:border-[var(--ink-primary)] flex items-center justify-between transition-colors text-left font-mono group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold block text-[var(--ink-primary)]">
                        Separate Stems
                      </span>
                      <span className="text-[10px] text-[var(--ink-secondary)]">
                        Extract Vocals & Instrument
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/mashup?urlA=${encodeURIComponent(urlInput)}`)}
                    className="p-3 border border-[var(--line)] bg-[var(--bg-secondary)] hover:border-[var(--ink-primary)] flex items-center justify-between transition-colors text-left font-mono group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold block text-[var(--ink-primary)]">
                        Send to Mashup
                      </span>
                      <span className="text-[10px] text-[var(--ink-secondary)]">
                        Load into Deck A
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/chords?url=${encodeURIComponent(urlInput)}`)}
                    className="p-3 border border-[var(--line)] bg-[var(--bg-secondary)] hover:border-[var(--ink-primary)] flex items-center justify-between transition-colors text-left font-mono group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold block text-[var(--ink-primary)]">
                        Detect Chords
                      </span>
                      <span className="text-[10px] text-[var(--ink-secondary)]">
                        Run Harmonic Analysis
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]" />
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LinkDownloaderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-5 h-5 border-2 border-[var(--ink-primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LinkDownloaderContent />
    </Suspense>
  );
}
