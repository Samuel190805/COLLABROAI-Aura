"use client";

import React, { createContext, useContext, useState, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Music,
  X,
} from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import { formatDuration } from "@/lib/utils";

export interface AudioTrackItem {
  id: string;
  title: string;
  artist?: string;
  src: string;
  albumArt?: string;
  duration?: number;
}

interface AudioContextType {
  currentTrack: AudioTrackItem | null;
  isPlaying: boolean;
  playTrack: (track: AudioTrackItem) => void;
  togglePlay: () => void;
  pause: () => void;
  closePlayer: () => void;
}

const AudioContext = createContext<AudioContextType>({
  currentTrack: null,
  isPlaying: false,
  playTrack: () => {},
  togglePlay: () => {},
  pause: () => {},
  closePlayer: () => {},
});

export const useGlobalAudio = () => useContext(AudioContext);

export const GlobalAudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentTrack, setCurrentTrack] = useState<AudioTrackItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTrack = (track: AudioTrackItem) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = track.src;
      audioRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playTrack,
        togglePlay,
        pause,
        closePlayer,
      }}
    >
      {children}

      <audio
        ref={audioRef}
        loop={isLooping}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
              setDuration(audioRef.current.duration);
            }
          }
        }}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
      />

      {currentTrack && (
        <div className="fixed bottom-3 left-3 right-3 max-w-4xl mx-auto z-50 font-mono">
          <div className="bg-[var(--bg-primary)] border border-[var(--line)] p-3 flex items-center justify-between gap-3 shadow-sm">
            {/* Track Info */}
            <div className="flex items-center gap-2.5 min-w-0 w-1/4">
              <div className="w-8 h-8 border border-[var(--line)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--ink-primary)] shrink-0">
                <Music className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-[var(--ink-primary)] truncate">
                  {currentTrack.title}
                </h5>
                <p className="text-[10px] text-[var(--ink-secondary)] truncate">
                  {currentTrack.artist || "SplitStream Playback"}
                </p>
              </div>
            </div>

            {/* Controls & Progress */}
            <div className="flex-1 flex flex-col items-center max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-1 border transition-colors cursor-pointer ${
                    isLooping
                      ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
                      : "border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  <Repeat className="w-3 h-3 stroke-[1.5]" />
                </button>
                <button
                  onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                  className="p-1 border border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  <SkipBack className="w-3 h-3 stroke-[1.5]" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-7 h-7 border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-primary)] flex items-center justify-center cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                  className="p-1 border border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  <SkipForward className="w-3 h-3 stroke-[1.5]" />
                </button>
              </div>

              <div className="w-full flex items-center gap-2 text-[10px] text-[var(--ink-secondary)]">
                <span>{formatDuration(currentTime)}</span>
                <div className="flex-1">
                  <Slider
                    value={currentTime}
                    min={0}
                    max={duration || 100}
                    onChange={handleSeek}
                  />
                </div>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Volume & Close */}
            <div className="flex items-center gap-2 justify-end w-1/4">
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      const next = !isMuted;
                      setIsMuted(next);
                      audioRef.current.muted = next;
                    }
                  }}
                  className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <div className="w-16">
                  <Slider
                    value={isMuted ? 0 : volume * 100}
                    min={0}
                    max={100}
                    onChange={(v) => {
                      const val = v / 100;
                      setVolume(val);
                      if (audioRef.current) audioRef.current.volume = val;
                      if (isMuted) setIsMuted(false);
                    }}
                  />
                </div>
              </div>

              <button
                onClick={closePlayer}
                className="p-1 border border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer ml-1"
              >
                <X className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AudioContext.Provider>
  );
};
