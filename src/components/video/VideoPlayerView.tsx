"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Scissors,
  Music,
  PictureInPicture2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { YouTubeEmbed, extractYouTubeId } from "./YouTubeEmbed";
import { formatDuration } from "@/lib/utils";

export interface VideoPlayerViewProps {
  mode: "local" | "youtube";
  src?: string;
  title?: string;
  className?: string;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  mode,
  src,
  title = "Video Playback",
  className = "",
}) => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [voiceClarity, setVoiceClarity] = useState(false);

  const isYouTube = mode === "youtube" || (src && extractYouTubeId(src) !== null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
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
  };

  const handleSendToDownloader = () => {
    if (src) router.push(`/download?url=${encodeURIComponent(src)}`);
  };

  const handleSendToStems = () => {
    if (src) router.push(`/stems?url=${encodeURIComponent(src)}`);
  };

  const handleSendToChords = () => {
    if (src) router.push(`/chords?url=${encodeURIComponent(src)}`);
  };

  return (
    <div className={`w-full flex flex-col gap-3 font-mono ${className}`}>
      {/* Video Viewport */}
      <div
        ref={containerRef}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative w-full aspect-video border border-[var(--line)] bg-[var(--bg-primary)] overflow-hidden group"
      >
        {isYouTube && src ? (
          <YouTubeEmbed videoIdOrUrl={src} autoPlay={false} />
        ) : (
          <>
            <video
              ref={videoRef}
              src={src}
              onClick={togglePlay}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
                    setDuration(videoRef.current.duration);
                  }
                }
              }}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Overlay Controls */}
            <div
              className={`absolute inset-x-0 bottom-0 p-3 bg-[var(--bg-primary)]/90 border-t border-[var(--line)] transition-opacity duration-200 ${
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Timeline scrubber */}
              <div className="mb-2">
                <Slider
                  value={currentTime}
                  min={0}
                  max={duration || 100}
                  onChange={handleSeek}
                />
              </div>

              <div className="flex items-center justify-between text-[var(--ink-primary)]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-1 border border-[var(--line)] hover:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        const next = !isMuted;
                        setIsMuted(next);
                        videoRef.current.muted = next;
                      }
                    }}
                    className="p-1 border border-[var(--line)] hover:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="w-16 hidden sm:block">
                    <Slider
                      value={isMuted ? 0 : volume * 100}
                      min={0}
                      max={100}
                      onChange={(v) => {
                        const val = v / 100;
                        setVolume(val);
                        if (videoRef.current) videoRef.current.volume = val;
                        if (isMuted) setIsMuted(false);
                      }}
                    />
                  </div>

                  <span className="text-[10px] text-[var(--ink-secondary)] ml-1">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVoiceClarity(!voiceClarity)}
                    className={`px-1.5 py-0.5 text-[10px] border cursor-pointer transition-colors ${
                      voiceClarity
                        ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
                        : "border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                    title="Voice Presence Boost"
                  >
                    <Zap className="w-3 h-3 inline mr-0.5 stroke-[1.5]" /> Clarity
                  </button>

                  <select
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    className="bg-[var(--bg-secondary)] border border-[var(--line)] text-[var(--ink-primary)] px-1.5 py-0.5 text-[10px] cursor-pointer"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1.0}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2.0}>2.0x</option>
                  </select>

                  <button
                    onClick={togglePiP}
                    title="Picture in Picture"
                    className="p-1 border border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5 stroke-[1.5]" />
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    title="Fullscreen"
                    className="p-1 border border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-3.5 h-3.5 stroke-[1.5]" />
                    ) : (
                      <Maximize className="w-3.5 h-3.5 stroke-[1.5]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Track info and quick action handoffs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border border-[var(--line)] bg-[var(--bg-secondary)]">
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-[var(--ink-primary)] truncate">
            {title}
          </h4>
          <p className="text-[10px] text-[var(--ink-secondary)]">
            {isYouTube ? "YouTube Stream Source" : "Local Cinema Storage"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSendToStems}
            className="text-xs h-7 px-2 font-mono flex items-center gap-1"
          >
            <Scissors className="w-3 h-3 stroke-[1.5]" /> Stems
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSendToChords}
            className="text-xs h-7 px-2 font-mono flex items-center gap-1"
          >
            <Music className="w-3 h-3 stroke-[1.5]" /> Chords
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSendToDownloader}
            className="text-xs h-7 px-2 font-mono flex items-center gap-1"
          >
            <Download className="w-3 h-3 stroke-[1.5]" /> Downloader
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerView;
