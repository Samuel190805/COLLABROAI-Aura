"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Upload,
  Link2,
  FileVideo,
  FileAudio,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { useRealtimeJob } from "@/lib/useRealtimeJob";
import { formatBytes, formatDuration } from "@/lib/utils";

const AUDIO_FORMATS = [
  { value: "mp3", label: "MP3 (MPEG Audio, 320kbps)" },
  { value: "wav", label: "WAV (Uncompressed PCM, 16-bit 44.1kHz)" },
  { value: "flac", label: "FLAC (Lossless Audio)" },
  { value: "m4a", label: "M4A (AAC Audio, 256kbps)" },
  { value: "aac", label: "AAC (Raw AAC Stream)" },
  { value: "ogg", label: "OGG (Vorbis Audio)" },
];

const VIDEO_FORMATS = [
  { value: "mp4", label: "MP4 (H.264 / AAC)" },
  { value: "webm", label: "WebM (VP9 / Opus)" },
];

const RESOLUTIONS = [
  { value: "720p", label: "720p HD (1280x720)" },
  { value: "1080p", label: "1080p Full HD (1920x1080)" },
];

const VISUAL_TYPES = [
  { value: "waveform", label: "Dynamic Waveform Lines" },
  { value: "spectrum", label: "Frequency Spectrum" },
];

const STAGES = [
  { id: "ANALYSIS", label: "Analysis" },
  { id: "TRANSCODING", label: "Transcoding" },
  { id: "EXPORT", label: "Export & Validation" },
];

function MediaConverterContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [direction, setDirection] = useState<"video-to-audio" | "audio-to-video">("video-to-audio");
  const [inputMode, setInputMode] = useState<"file" | "url">(initialUrl ? "url" : "file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const [audioFormat, setAudioFormat] = useState<string>("mp3");
  const [videoFormat, setVideoFormat] = useState<string>("mp4");
  const [resolution, setResolution] = useState<string>("720p");
  const [visualType, setVisualType] = useState<string>("waveform");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [convertedAsset, setConvertedAsset] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  } = useRealtimeJob("MEDIA_CONVERSION");

  // Watch for job completion & resolve asset
  useEffect(() => {
    if (isCompleted && jobId) {
      if (mediaAssets && mediaAssets.length > 0) {
        setConvertedAsset(mediaAssets[0]);
      } else {
        // Fallback: fetch job detail
        fetch(`/api/jobs/${jobId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.job?.mediaAssets?.[0]) {
              setConvertedAsset(data.job.mediaAssets[0]);
            }
          })
          .catch(() => {});
      }
    }
  }, [isCompleted, jobId, mediaAssets]);

  const handleStartConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setConvertedAsset(null);

    if (inputMode === "file" && !selectedFile) {
      setSubmitError("Please select a media file to convert");
      return;
    }
    if (inputMode === "url" && !urlInput.trim()) {
      setSubmitError("Please enter a valid media or YouTube URL");
      return;
    }

    setIsSubmitting(true);

    try {
      let res: Response;
      const targetFormat = direction === "video-to-audio" ? audioFormat : videoFormat;

      if (inputMode === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("direction", direction);
        formData.append("outputFormat", targetFormat);
        formData.append("resolution", resolution);
        formData.append("visualType", visualType);
        res = await fetch("/api/convert", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            direction,
            url: urlInput.trim(),
            outputFormat: targetFormat,
            resolution,
            visualType,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.jobId) {
        watchJob(data.jobId, "MEDIA_CONVERSION");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Conversion failed to start";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAll = () => {
    reset();
    setSelectedFile(null);
    setUrlInput("");
    setConvertedAsset(null);
    setSubmitError(null);
  };

  const activeStageIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="min-h-screen bg-mono-bg text-mono-ink px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-black/10 dark:border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              Media Transcoder & Visualizer
            </span>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Audio &harr; Video Converter</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Extract lossless audio tracks from video containers or render dynamic waveform visualization videos from audio masters.
            </p>
          </div>

          {(isCompleted || isFailed) && (
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-1.5 self-start sm:self-end"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Convert Another
            </button>
          )}
        </div>

        {/* Direction Switcher Toggle */}
        {!isProcessing && !isCompleted && (
          <div className="grid grid-cols-2 border border-black/10 dark:border-white/10 p-1 bg-neutral-50 dark:bg-black/40">
            <button
              type="button"
              onClick={() => {
                setDirection("video-to-audio");
                setSelectedFile(null);
              }}
              className={`py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                direction === "video-to-audio"
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <FileVideo className="w-4 h-4" /> Video &rarr; Audio Extraction
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection("audio-to-video");
                setSelectedFile(null);
                setInputMode("file");
              }}
              className={`py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                direction === "audio-to-video"
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <FileAudio className="w-4 h-4" /> Audio &rarr; Video Visualizer
            </button>
          </div>
        )}

        {/* Realtime Stage Tracker (Horizontal Hairline) */}
        {isProcessing && (
          <div className="border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-[#0A0A0A] space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-neutral-500">Pipeline Execution</span>
              <span className="font-mono tabular-nums font-bold text-black dark:text-white">{progress}%</span>
            </div>

            {/* Horizontal Line Progress */}
            <div className="relative w-full h-[2px] bg-neutral-200 dark:bg-neutral-800">
              <div
                className="absolute top-0 left-0 bottom-0 bg-black dark:bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Stage Steps */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {STAGES.map((s, idx) => {
                const isPast = activeStageIndex > idx || (activeStageIndex === -1 && progress >= 80);
                const isCurrent = activeStageIndex === idx;

                return (
                  <div key={s.id} className="text-center space-y-1">
                    <p
                      className={`text-xs uppercase font-mono ${
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

            <p className="text-xs text-neutral-500 font-mono text-center pt-2">{message || "Processing media container..."}</p>
          </div>
        )}

        {/* Error Notification */}
        {(submitError || (isFailed && jobError)) && (
          <div className="p-4 border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 flex items-start gap-3 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Conversion Failed</p>
              <p className="mt-0.5">{submitError || jobError}</p>
            </div>
          </div>
        )}

        {/* Result Screen */}
        {isCompleted && convertedAsset && (
          <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-black dark:text-white" />
                <h3 className="text-sm font-bold tracking-tight">Conversion Complete</h3>
              </div>
              <span className="font-mono text-xs uppercase px-2 py-0.5 border border-black/10 dark:border-white/10">
                {convertedAsset.format?.toUpperCase()} &bull; FFPROBE VERIFIED
              </span>
            </div>

            {/* Unified Media Player Preview */}
            <MediaPlayer
              src={convertedAsset.filePath || convertedAsset.url}
              mediaType={direction === "video-to-audio" ? "audio" : "video"}
              title={convertedAsset.name || "Converted Media Output"}
              artist={`Format: ${convertedAsset.format?.toUpperCase()}`}
            />

            {/* Metrics & Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-neutral-50 dark:bg-black/40 border border-black/10 dark:border-white/10 text-xs font-mono">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Duration</span>
                <span className="font-bold">{formatDuration(convertedAsset.duration || 0)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">File Size</span>
                <span className="font-bold">{formatBytes(convertedAsset.sizeBytes || 0)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Codec</span>
                <span className="font-bold">{convertedAsset.codec || convertedAsset.format}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Direction</span>
                <span className="font-bold">{direction === "video-to-audio" ? "Video \u2192 Audio" : "Audio \u2192 Video"}</span>
              </div>
            </div>

            {/* Direct Download Action */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={convertedAsset.filePath || convertedAsset.url}
                download={convertedAsset.name || `converted_${jobId}.${convertedAsset.format || "mp3"}`}
                className="w-full sm:flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black font-medium text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" /> Download Converted File
              </a>
              <button
                type="button"
                onClick={handleResetAll}
                className="w-full sm:w-auto px-4 py-2.5 border border-black/10 dark:border-white/10 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                Start New Conversion
              </button>
            </div>
          </div>
        )}

        {/* Input Configuration Form */}
        {!isProcessing && !isCompleted && (
          <form onSubmit={handleStartConversion} className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-6 space-y-6">
            {/* Input Selection: Upload vs URL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                  Select Input Source
                </label>
                {direction === "video-to-audio" && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setInputMode("file")}
                      className={`font-medium ${inputMode === "file" ? "underline text-black dark:text-white" : "text-neutral-400"}`}
                    >
                      File Upload
                    </button>
                    <span className="text-neutral-300">/</span>
                    <button
                      type="button"
                      onClick={() => setInputMode("url")}
                      className={`font-medium ${inputMode === "url" ? "underline text-black dark:text-white" : "text-neutral-400"}`}
                    >
                      Video URL
                    </button>
                  </div>
                )}
              </div>

              {inputMode === "file" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={direction === "video-to-audio" ? "video/*,.mp4,.webm,.mkv,.mov,.avi" : "audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"}
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
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-black dark:text-white">{selectedFile.name}</p>
                        <p className="text-[10px] font-mono text-neutral-500">{formatBytes(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-black dark:text-white">
                          Click to select {direction === "video-to-audio" ? "video" : "audio"} file
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {direction === "video-to-audio" ? "MP4, WebM, MKV, MOV up to 500MB" : "MP3, WAV, FLAC, M4A up to 200MB"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or direct video URL"
                    className="w-full bg-neutral-50 dark:bg-black/40 border border-black/10 dark:border-white/10 pl-9 pr-3 py-2.5 text-xs font-mono focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>
              )}
            </div>

            {/* Target Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-black/10 dark:border-white/10">
              {direction === "video-to-audio" ? (
                <div className="col-span-full space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Target Audio Format
                  </label>
                  <select
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-mono focus:outline-none"
                  >
                    {AUDIO_FORMATS.map((fmt) => (
                      <option key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                      Target Video Container
                    </label>
                    <select
                      value={videoFormat}
                      onChange={(e) => setVideoFormat(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-mono focus:outline-none"
                    >
                      {VIDEO_FORMATS.map((fmt) => (
                        <option key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                      Resolution
                    </label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-mono focus:outline-none"
                    >
                      {RESOLUTIONS.map((res) => (
                        <option key={res.value} value={res.value}>
                          {res.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-full">
                    <label className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                      Waveform Visualizer Theme
                    </label>
                    <select
                      value={visualType}
                      onChange={(e) => setVisualType(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-mono focus:outline-none"
                    >
                      {VISUAL_TYPES.map((vt) => (
                        <option key={vt.value} value={vt.value}>
                          {vt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-medium text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {direction === "video-to-audio" ? "Extract & Transcode Audio" : "Render Video Visualization"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ConvertMediaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent animate-spin" />
        </div>
      }
    >
      <MediaConverterContent />
    </Suspense>
  );
}
