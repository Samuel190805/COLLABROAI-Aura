"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Sliders,
  Disc,
  FileText,
  Activity,
  RotateCcw,
  RotateCw,
  Tv,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { extractCanonicalYouTubeId } from "@/domain/value-objects/SourceUrlValidator";
import { WaveformVisualizer } from "@/components/audio/WaveformVisualizer";
import { AudioVisualizerCanvas } from "@/components/visual/AudioVisualizerCanvas";
import { GraphicEqualizer } from "@/components/player/GraphicEqualizer";
import { SyncedLyricsView } from "@/components/player/SyncedLyricsView";

export interface MediaPlayerProps {
  src: string;
  mediaType?: "audio" | "video";
  title?: string;
  artist?: string;
  poster?: string;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
  compact?: boolean;
  showSubPanels?: boolean;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  src,
  mediaType,
  title = "Media Playback",
  artist = "SplitStream",
  poster,
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  className = "",
  compact = false,
  showSubPanels = true,
}) => {
  // Determine if media is video or audio
  const ytId = extractCanonicalYouTubeId(src);
  const isVideo =
    mediaType === "video" ||
    !!ytId ||
    /\.(mp4|webm|mkv|mov|avi)($|\?)/i.test(src);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isTheater, setIsTheater] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeSubPanel, setActiveSubPanel] = useState<"waveform" | "eq" | "lyrics" | "vinyl">("waveform");

  // YouTube Iframe API initialization if needed
  useEffect(() => {
    if (!ytId) return;

    let pollTimer: NodeJS.Timeout | null = null;

    const loadYT = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        (window as any).onYouTubeIframeAPIReady = () => initPlayer();
      }
    };

    const initPlayer = () => {
      if (!ytIframeRef.current) return;
      try {
        ytPlayerRef.current = new (window as any).YT.Player(ytIframeRef.current, {
          events: {
            onReady: (e: any) => {
              const dur = e.target.getDuration() || 0;
              setDuration(dur);
              if (autoPlay) {
                e.target.playVideo();
                setIsPlaying(true);
              }
            },
            onStateChange: (e: any) => {
              // 1 = playing, 2 = paused, 0 = ended
              if (e.data === 1) setIsPlaying(true);
              else if (e.data === 2) setIsPlaying(false);
              else if (e.data === 0) {
                setIsPlaying(false);
                onEnded?.();
              }
            },
          },
        });
      } catch {
        // ignore
      }
    };

    loadYT();

    // Poll current time for YouTube
    pollTimer = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        try {
          const ct = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = ytPlayerRef.current.getDuration() || 0;
          setCurrentTime(ct);
          if (dur > 0) setDuration(dur);
          onTimeUpdate?.(ct, dur);
        } catch {
          // ignore
        }
      }
    }, 250);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [ytId, autoPlay, onTimeUpdate, onEnded]);

  // Audio / Video time updates
  const handleMediaTimeUpdate = useCallback(() => {
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (el.duration && !isNaN(el.duration)) {
      setDuration(el.duration);
    }
    onTimeUpdate?.(el.currentTime, el.duration || 0);
  }, [isVideo, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    if (ytId && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
        return;
      } catch {
        // fallback
      }
    }

    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, isVideo, ytId]);

  const handleSeek = useCallback((time: number) => {
    if (ytId && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(time, true);
        setCurrentTime(time);
        return;
      } catch {
        // fallback
      }
    }

    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    el.currentTime = time;
    setCurrentTime(time);
  }, [isVideo, ytId]);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);

    if (ytId && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(newVol * 100);
      } catch {}
    }

    if (videoRef.current) videoRef.current.volume = newVol;
    if (audioRef.current) audioRef.current.volume = newVol;
  }, [ytId]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (ytId && ytPlayerRef.current) {
      try {
        if (nextMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch {}
    }

    if (videoRef.current) videoRef.current.muted = nextMuted;
    if (audioRef.current) audioRef.current.muted = nextMuted;
  }, [isMuted, ytId]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);

    if (ytId && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setPlaybackRate(newSpeed);
      } catch {}
    }

    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  }, [ytId]);

  const skipSeconds = useCallback((sec: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + sec));
    handleSeek(next);
  }, [currentTime, duration, handleSeek]);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const progressFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 transition-all duration-200",
        isTheater ? "w-full max-w-none col-span-full" : "w-full",
        className
      )}
    >
      {/* Media Surface */}
      {isVideo ? (
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {ytId ? (
            <iframe
              ref={ytIframeRef}
              src={`https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&rel=0&modestbranding=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              autoPlay={autoPlay}
              playsInline
              className="w-full h-full object-contain"
              onTimeUpdate={handleMediaTimeUpdate}
              onLoadedMetadata={handleMediaTimeUpdate}
              onEnded={() => {
                setIsPlaying(false);
                onEnded?.();
              }}
              onClick={togglePlay}
            />
          )}
        </div>
      ) : (
        <div className="relative w-full bg-neutral-50 dark:bg-black/40 border-b border-black/10 dark:border-white/10 p-6 flex flex-col items-center justify-center min-h-[160px]">
          <audio
            ref={audioRef}
            src={src}
            autoPlay={autoPlay}
            onTimeUpdate={handleMediaTimeUpdate}
            onLoadedMetadata={handleMediaTimeUpdate}
            onEnded={() => {
              setIsPlaying(false);
              onEnded?.();
            }}
          />

          {/* Subpanel Views for Audio */}
          {activeSubPanel === "waveform" && (
            <div className="w-full max-w-2xl flex flex-col items-center gap-3">
              <AudioVisualizerCanvas isPlaying={isPlaying} barCount={48} height={50} className="w-full" />
              <WaveformVisualizer
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                height={32}
                className="w-full"
              />
            </div>
          )}

          {activeSubPanel === "vinyl" && (
            <div className="relative w-36 h-36 flex items-center justify-center my-2">
              <div
                className={cn(
                  "w-36 h-36 rounded-full bg-[#111111] border-4 border-neutral-800 shadow-2xl flex items-center justify-center transition-transform duration-300",
                  isPlaying && "animate-[spin_4s_linear_infinite]"
                )}
                style={{
                  backgroundImage: `radial-gradient(circle, #222 15%, #111 16%, #1a1a1a 40%, #0d0d0d 60%, #151515 80%, #111 100%)`,
                }}
              >
                <div className="w-12 h-12 rounded-full bg-neutral-900 border-2 border-white/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-black border border-white/30" />
                </div>
              </div>
            </div>
          )}

          {activeSubPanel === "eq" && (
            <div className="w-full max-w-2xl py-2">
              <GraphicEqualizer audioElement={audioRef.current} />
            </div>
          )}

          {activeSubPanel === "lyrics" && (
            <div className="w-full max-w-2xl py-2 max-h-[160px] overflow-y-auto">
              <SyncedLyricsView
                mediaUrl={src}
                currentTime={currentTime}
                duration={duration}
                onSeekTo={handleSeek}
              />
            </div>
          )}
        </div>
      )}

      {/* Sub-panel Navigation Tabs (Audio mode only) */}
      {!isVideo && showSubPanels && !compact && (
        <div className="flex items-center gap-1 border-b border-black/10 dark:border-white/10 px-4 py-2 bg-neutral-100 dark:bg-[#111111] text-xs">
          <button
            onClick={() => setActiveSubPanel("waveform")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1.5",
              activeSubPanel === "waveform"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Activity className="w-3.5 h-3.5" /> Waveform
          </button>
          <button
            onClick={() => setActiveSubPanel("eq")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1.5",
              activeSubPanel === "eq"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Sliders className="w-3.5 h-3.5" /> 10-Band EQ
          </button>
          <button
            onClick={() => setActiveSubPanel("vinyl")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1.5",
              activeSubPanel === "vinyl"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Disc className="w-3.5 h-3.5" /> Vinyl
          </button>
          <button
            onClick={() => setActiveSubPanel("lyrics")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1.5",
              activeSubPanel === "lyrics"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            )}
          >
            <FileText className="w-3.5 h-3.5" /> Lyrics
          </button>
        </div>
      )}

      {/* Shared Transport Chrome */}
      <div className="p-4 flex flex-col gap-3">
        {/* Scrubber / Seek bar */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-neutral-500 w-12 text-right">
            {formatDuration(currentTime)}
          </span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              handleSeek(fraction * duration);
            }}
            className="relative flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 cursor-pointer overflow-hidden group"
          >
            <div
              className="absolute top-0 left-0 bottom-0 bg-black dark:bg-white transition-all duration-75"
              style={{ width: `${progressFraction * 100}%` }}
            />
          </div>
          <span className="font-mono text-xs tabular-nums text-neutral-500 w-12">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Media Metadata */}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate text-black dark:text-white">{title}</h4>
            <p className="text-xs text-neutral-500 truncate">{artist}</p>
          </div>

          {/* Center: Main Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => skipSeconds(-5)}
              className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              title="Rewind 5s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center hover:opacity-90 transition-opacity"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
            </button>
            <button
              onClick={() => skipSeconds(5)}
              className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              title="Fast Forward 5s"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Volume, Speed & Modifiers */}
          <div className="flex items-center gap-3">
            {/* Speed selector */}
            <div className="relative group">
              <select
                value={speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-transparent text-xs font-mono text-neutral-600 dark:text-neutral-300 border border-black/10 dark:border-white/10 px-1.5 py-1 cursor-pointer focus:outline-none"
              >
                {SPEED_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-white dark:bg-neutral-900 text-black dark:text-white">
                    {opt}x
                  </option>
                ))}
              </select>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-neutral-200 dark:bg-neutral-800 accent-black dark:accent-white cursor-pointer"
              />
            </div>

            {/* Video-specific toggles */}
            {isVideo && (
              <>
                <button
                  onClick={() => setIsTheater((prev) => !prev)}
                  className={cn(
                    "p-1.5 transition-colors hidden sm:inline-flex",
                    isTheater
                      ? "text-black dark:text-white font-bold"
                      : "text-neutral-500 hover:text-black dark:hover:text-white"
                  )}
                  title="Theater Mode"
                >
                  <Tv className="w-4 h-4" />
                </button>
                {!ytId && (
                  <button
                    onClick={togglePiP}
                    className="p-1.5 text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                    title="Picture in Picture"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayer;
