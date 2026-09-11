"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Download,
  Link2,
  Music,
  Video,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Play,
  Clock,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { StageStepper } from "@/components/ui/StageStepper";
import { ProgressRing } from "@/components/ui/ProgressRing";
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
    { id: "DOWNLOADING", label: "Downloading", description: "Fetching payload" },
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
      setErrorMsg(err instanceof Error ? err.message : "Failed to preview link");
    } finally {
      setIsResolving(false);
    }
  };

  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg("Please enter a valid URL");
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
        throw new Error(data.error || "Download failed to initiate");
      }

      watchJob(data.jobId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Download initiation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadedAsset = mediaAssets && mediaAssets.length > 0 ? mediaAssets[0] : null;

  return (
    <div className="w-full flex flex-col items-center">
      {/* =========================================================================
          MODE A: HERO CHAPTER (Editorial Storytelling)
          ========================================================================= */}
      <ModeAHero
        chapterNumber="02 // STREAM EXTRACTION"
        badge="Zero Loss Codec Transcoder"
        headline="Lossless audio and video. Extracted instantly."
        subheadline="Acoustic fingerprinting, -14 LUFS loudness mastering, and verified container integrity."
        description="Extract streams from YouTube and remote media URLs directly to studio 320 kbps MP3, FLAC, and 1080p MP4 formats with automated ID3 tag extraction and zero storage bloat."
        stats={[
          { label: "Audio Transcode", value: "320 kbps" },
          { label: "Lossless Option", value: "FLAC" },
          { label: "Max Resolution", value: "1080p HD" },
          { label: "Target Loudness", value: "-14 LUFS" },
        ]}
        visualComponent={<LinkMorphHero />}
        toolAnchorId="download-workspace"
        toolCtaText="Open Downloader Studio"
        align="right"
      />

      {/* =========================================================================
          SEAM & MODE B: CALM PRECISION STUDIO WORKSPACE
          ========================================================================= */}
      <div
        id="download-workspace"
        className="w-full border-t border-white/10 bg-[#080809] py-16 px-4 sm:px-6 mode-b-precision"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          {/* Workspace Title Header */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Universal Downloader Workspace
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  FFmpeg / FFprobe Verified Pipeline • EBU R128 Dual-Pass Normalization
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {mediaType.toUpperCase()} MODE
            </span>
          </div>

          {/* Main Action Input Card */}
          {!isProcessing && !isCompleted && (
            <Card variant="glass" className="w-full p-6 sm:p-8 shadow-apple dark:shadow-apple-dark">
              <form onSubmit={handleStartDownload} className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="Media or YouTube URL"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      leftIcon={<Link2 className="w-4 h-4 text-apple-blue" />}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="glass"
                    onClick={() => resolveUrl(urlInput)}
                    isLoading={isResolving}
                    className="h-10 text-xs shrink-0"
                  >
                    Inspect Link
                  </Button>
                </div>

                {/* Media Metadata Preview Card */}
                {previewInfo && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in">
                    {previewInfo.thumbnailUrl ? (
                      <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                        <img
                          src={previewInfo.thumbnailUrl}
                          alt={previewInfo.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-apple-blue/10 text-apple-blue flex items-center justify-center shrink-0">
                        <Music className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {previewInfo.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {previewInfo.author || "Creator"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(previewInfo.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio vs Video Mode Selector */}
                <div className="flex justify-center pt-2">
                  <Tabs
                    tabs={[
                      { id: "audio", label: "Extract Audio", icon: <Music className="w-4 h-4" /> },
                      { id: "video", label: "Download Video", icon: <Video className="w-4 h-4" /> },
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
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
                        ]}
                      />

                      <Select
                        label="Audio Bitrate"
                        value={qualityOrResolution}
                        onChange={(e) => setQualityOrResolution(e.target.value)}
                        options={[
                          { value: "320k", label: "320 kbps (High Fidelity)" },
                          { value: "256k", label: "256 kbps (Standard High)" },
                          { value: "192k", label: "192 kbps (Good)" },
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
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white shadow-apple"
                >
                  <Download className="w-4 h-4" /> Download & Transcode Stream
                </Button>
              </form>
            </Card>
          )}

          {/* Live SSE Real-Time Download Progress */}
          {isProcessing && (
            <Card variant="glass" className="w-full p-8 text-center flex flex-col items-center gap-6 animate-in fade-in">
              <div className="flex items-center gap-2 text-blue-400">
                <Sparkles className="w-5 h-5 animate-spin" />
                <h3 className="text-lg font-bold text-white">
                  Downloading & Transcoding
                </h3>
              </div>

              <ProgressRing progress={progress} size={140} strokeWidth={10} color="#0071E3" />

              <p className="text-sm font-medium text-neutral-300 max-w-md">
                {message || "Downloading stream..."}
              </p>

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
            <Card variant="glass" className="w-full p-8 text-center flex flex-col items-center gap-4 border-red-500/30">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Download Failed
              </h3>
              <p className="text-sm text-neutral-400 max-w-md">
                {error || "Could not complete media download. Please check the URL and try again."}
              </p>
              <Button variant="secondary" onClick={reset} className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Another Link
              </Button>
            </Card>
          )}

          {/* Completed State */}
          {isCompleted && downloadedAsset && (
            <Card variant="glass" className="w-full p-8 flex flex-col gap-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Transcode Complete & Validated via FFprobe</span>
                </div>
                <Button variant="glass" size="sm" onClick={reset} className="text-xs flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Download Another
                </Button>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    {downloadedAsset.kind === "DOWNLOAD_VIDEO" ? (
                      <Video className="w-6 h-6" />
                    ) : (
                      <Music className="w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white truncate">
                      {downloadedAsset.name}
                    </h4>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      Format: {downloadedAsset.format.toUpperCase()} • Codec: {downloadedAsset.codec}
                      {downloadedAsset.sizeBytes ? ` • ${formatBytes(downloadedAsset.sizeBytes)}` : ""}
                      {downloadedAsset.duration ? ` • ${formatDuration(downloadedAsset.duration)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
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
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Play Preview
                    </Button>
                  )}

                  <Button
                    href={downloadedAsset.filePath}
                    download={`${downloadedAsset.name}.${downloadedAsset.format}`}
                    size="sm"
                    className="text-xs flex items-center gap-1.5 bg-apple-blue hover:bg-apple-blueHover text-white shadow-apple"
                  >
                    <Download className="w-3.5 h-3.5" /> Save to Device
                  </Button>

                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => router.push(`/stems?url=${encodeURIComponent(urlInput)}`)}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Separate Stems
                  </Button>
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
          <div className="w-8 h-8 rounded-full border-2 border-apple-blue border-t-transparent animate-spin" />
        </div>
      }
    >
      <LinkDownloaderContent />
    </Suspense>
  );
}
