"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Music,
  FolderPlus,
  FilePlus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Trash2,
  HardDrive,
  ListMusic,
  Scissors,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { AudioVisualizerCanvas } from "@/components/visual/AudioVisualizerCanvas";
import { localLibrary, LocalMediaItem } from "@/lib/localLibrary";
import { formatDuration, formatBytes } from "@/lib/utils";

export default function AudioPlayerPage() {
  const router = useRouter();
  const [items, setItems] = useState<LocalMediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [rpm, setRpm] = useState<33 | 45 | 78>(33);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const loadLocalLibrary = React.useCallback(async () => {
    try {
      const all = await localLibrary.getAllItems("audio");
      setItems(all);
      if (all.length > 0 && currentIndex === -1) {
        setCurrentIndex(0);
      }
    } catch {
      // ignore
    }
  }, [currentIndex]);

  useEffect(() => {
    loadLocalLibrary();
  }, [loadLocalLibrary]);

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (!file.type.includes("audio") && !file.name.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus|aiff)$/i)) {
        continue;
      }

      const item: LocalMediaItem = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Local Audio",
        type: "audio",
        format: file.name.split(".").pop() || "mp3",
        size: file.size,
        lastModified: file.lastModified,
        url: URL.createObjectURL(file),
        addedAt: Date.now(),
      };

      await localLibrary.addItem(item);
    }

    await loadLocalLibrary();
  };

  const currentTrack = currentIndex >= 0 && currentIndex < items.length ? items[currentIndex] : null;

  const playIndex = (index: number) => {
    if (index < 0 || index >= items.length) return;
    setCurrentIndex(index);
    setIsPlaying(true);
    if (audioRef.current && items[index].url) {
      audioRef.current.src = items[index].url;
      audioRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current.src && currentTrack.url) {
        audioRef.current.src = currentTrack.url;
      }
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (items.length === 0) return;
    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * items.length);
      playIndex(nextIdx);
    } else {
      const nextIdx = (currentIndex + 1) % items.length;
      playIndex(nextIdx);
    }
  };

  const handlePrev = () => {
    if (items.length === 0) return;
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    playIndex(prevIdx);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleRpmChange = (newRpm: 33 | 45 | 78) => {
    setRpm(newRpm);
    if (audioRef.current) {
      // 33 = 1.0x, 45 = 1.36x, 78 = 2.36x
      const rate = newRpm === 33 ? 1.0 : newRpm === 45 ? 1.36 : 2.0;
      audioRef.current.playbackRate = rate;
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await localLibrary.removeItem(id);
    await loadLocalLibrary();
  };

  const handleClearAll = async () => {
    await localLibrary.clearAll("audio");
    setItems([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
  };

  return (
    <div className="w-full pt-28 pb-20 px-4 sm:px-6 bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-8">
        {/* Title Header */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border border-[var(--line)] flex items-center justify-center text-[var(--ink-primary)]">
              <Music className="w-3.5 h-3.5 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-sm font-mono font-bold tracking-tight uppercase text-[var(--ink-primary)]">
                Local Audio Player
              </h1>
              <p className="text-[11px] font-mono text-[var(--ink-secondary)]">
                Client-side Web Audio • IndexedDB queue • Turntable view
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[var(--line)] text-[var(--ink-secondary)]">
            OFFLINE ENGINE
          </span>
        </div>

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
            if (!isLooping) handleNext();
          }}
        />

        {/* Hidden file & folder inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aiff"
          onChange={handleAddFiles}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory is standard for folder picker
          webkitdirectory=""
          directory=""
          onChange={handleAddFiles}
          className="hidden"
        />

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Turntable Deck & Transport (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <Card className="p-6 flex flex-col items-center text-center relative overflow-hidden">
              {/* Monolith Turntable Line Art Centerpiece */}
              <div className="relative w-52 h-52 sm:w-60 sm:h-60 border border-[var(--line)] bg-[var(--bg-secondary)] flex items-center justify-center mb-6">
                {/* Vinyl record */}
                <div
                  className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-[var(--line)] bg-[var(--bg-primary)] flex items-center justify-center transition-transform ${
                    isPlaying ? "animate-[spin_4s_linear_infinite]" : ""
                  }`}
                  style={{
                    animationDuration: rpm === 33 ? "4s" : rpm === 45 ? "3s" : "1.8s",
                  }}
                >
                  <div className="w-36 h-36 rounded-full border border-[var(--line)] flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-[var(--line)] flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-[var(--line)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--ink-primary)]">
                        <Music className="w-5 h-5 stroke-[1.5]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tonearm line */}
                <div
                  className={`absolute top-4 right-4 w-1 bg-[var(--ink-primary)] origin-top transition-transform duration-500 ${
                    isPlaying ? "h-24 rotate-[25deg]" : "h-20 rotate-0"
                  }`}
                />
              </div>

              {/* RPM Selector */}
              <div className="flex items-center gap-1 mb-4 font-mono">
                <span className="text-[10px] uppercase text-[var(--ink-secondary)] mr-1">Speed:</span>
                {([33, 45, 78] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRpmChange(r)}
                    className={`px-2 py-0.5 text-[10px] border transition-colors cursor-pointer ${
                      rpm === r
                        ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)] font-bold"
                        : "border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {r} RPM
                  </button>
                ))}
              </div>

              {/* Track Info */}
              <h3 className="text-sm font-mono font-bold text-[var(--ink-primary)] mb-0.5 max-w-sm truncate">
                {currentTrack?.title || "No Track Selected"}
              </h3>
              <p className="text-[10px] text-[var(--ink-secondary)] font-mono mb-4">
                {currentTrack
                  ? `${currentTrack.artist} • ${currentTrack.format.toUpperCase()} (${formatBytes(currentTrack.size)})`
                  : "Add audio files or folders to begin"}
              </p>

              {/* Visualizer Canvas */}
              <div className="w-full flex justify-center mb-5">
                <AudioVisualizerCanvas isPlaying={isPlaying} barCount={32} height={28} />
              </div>

              {/* Timeline Scrubber */}
              <div className="w-full flex flex-col gap-1 mb-5 font-mono">
                <Slider
                  value={currentTime}
                  min={0}
                  max={duration || 100}
                  onChange={handleSeek}
                />
                <div className="flex items-center justify-between text-[10px] text-[var(--ink-secondary)] px-0.5">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1.5 border transition-colors cursor-pointer ${
                    isShuffle
                      ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
                      : "border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4 stroke-[1.5]" />
                </button>

                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 border border-[var(--line)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  title="Previous"
                >
                  <SkipBack className="w-4 h-4 stroke-[1.5]" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!currentTrack}
                  className="w-10 h-10 border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-primary)] flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 border border-[var(--line)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  title="Next"
                >
                  <SkipForward className="w-4 h-4 stroke-[1.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-1.5 border transition-colors cursor-pointer ${
                    isLooping
                      ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
                      : "border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  }`}
                  title="Loop"
                >
                  <Repeat className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 w-44">
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      const next = !isMuted;
                      setIsMuted(next);
                      audioRef.current.muted = next;
                    }
                  }}
                  className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 stroke-[1.5]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 stroke-[1.5]" />
                  )}
                </button>
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

              {/* Quick Actions (Section 4.6.8) */}
              {currentTrack && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--line)] w-full justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/stems?url=${encodeURIComponent(currentTrack?.url || "")}`)}
                    className="text-xs h-7 font-mono flex items-center gap-1"
                  >
                    <Scissors className="w-3 h-3 stroke-[1.5]" /> Split Stems
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/chords?url=${encodeURIComponent(currentTrack?.url || "")}`)}
                    className="text-xs h-7 font-mono flex items-center gap-1"
                  >
                    <Music className="w-3 h-3 stroke-[1.5]" /> Chords
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Playlist Queue (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-2 font-mono">
                <ListMusic className="w-3.5 h-3.5 stroke-[1.5] text-[var(--ink-primary)]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                  Local Queue ({items.length})
                </h4>
              </div>

              <div className="flex items-center gap-1 font-mono">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-6 px-2"
                >
                  <FilePlus className="w-3 h-3 mr-1 stroke-[1.5]" /> File
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                  className="text-xs h-6 px-2"
                >
                  <FolderPlus className="w-3 h-3 mr-1 stroke-[1.5]" /> Folder
                </Button>
                {items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1 border border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer ml-1"
                    title="Clear"
                  >
                    <Trash2 className="w-3 h-3 stroke-[1.5]" />
                  </button>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border border-[var(--line)] text-[var(--ink-secondary)] flex items-center justify-center">
                  <HardDrive className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-xs font-mono font-medium text-[var(--ink-primary)]">
                  Library is empty
                </p>
                <p className="text-[10px] text-[var(--ink-secondary)] font-mono max-w-xs">
                  Select audio files or folders. Tracks persist locally in IndexedDB.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-mono mt-1"
                >
                  <FilePlus className="w-3 h-3 mr-1 stroke-[1.5]" /> Add Local Audio
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const isSelected = idx === currentIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => playIndex(idx)}
                      className={`flex items-center justify-between p-2.5 border cursor-pointer transition-colors font-mono ${
                        isSelected
                          ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
                          : "bg-[var(--bg-secondary)] border-[var(--line)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] opacity-60 w-4">{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{item.title}</p>
                          <p className={`text-[9px] ${isSelected ? "opacity-70" : "text-[var(--ink-secondary)]"}`}>
                            {item.format.toUpperCase()} • {formatBytes(item.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className={`p-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${
                          isSelected ? "text-[var(--bg-primary)]" : "text-[var(--ink-secondary)]"
                        }`}
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3 stroke-[1.5]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
