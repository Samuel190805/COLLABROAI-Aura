"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Clock,
  HardDrive,
  ListMusic,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { AudioVisualizerCanvas } from "@/components/visual/AudioVisualizerCanvas";
import { localLibrary, LocalMediaItem } from "@/lib/localLibrary";
import { formatDuration, formatBytes } from "@/lib/utils";

export default function AudioPlayerPage() {
  const [items, setItems] = useState<LocalMediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

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

  // Load items from IndexedDB
  useEffect(() => {
    loadLocalLibrary();
  }, [loadLocalLibrary]);

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (!file.type.includes("audio") && !file.name.match(/\.(mp3|wav|flac|m4a|aac|ogg)$/i)) {
        continue;
      }

      const item: LocalMediaItem = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Local Track",
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
    <div className="w-full pt-28 pb-20 px-4 sm:px-6 mode-b-precision">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-8">
        {/* Title Header */}
        <div className="text-center max-w-2xl flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-apple-blue bg-apple-blue/10 border border-apple-blue/20">
            <Music className="w-3.5 h-3.5" />
            <span>Purely Local Playback</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Local Audio Player
          </h1>
          <p className="text-sm text-neutral-400 font-normal">
            Zero cloud telemetry, instant IndexedDB queue, and real-time frequency visualizer.
          </p>
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
          accept="audio/*"
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
          {/* Left Column: Now Playing Centerpiece Deck */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card variant="glass" className="p-8 flex flex-col items-center text-center relative overflow-hidden">
              {/* Spinning Disc / Cover Art Centerpiece */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 shadow-2xl border-4 border-neutral-800 flex items-center justify-center mb-6">
                <div
                  className={`w-full h-full rounded-full flex items-center justify-center transition-transform duration-1000 ${
                    isPlaying ? "animate-[spin_10s_linear_infinite]" : ""
                  }`}
                >
                  {/* Vinyl Grooves */}
                  <div className="w-40 h-40 rounded-full border border-neutral-700/40 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full border border-neutral-700/30 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-apple-blue flex items-center justify-center text-white shadow-inner">
                        <Music className="w-7 h-7" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Track Info */}
              <h3 className="text-xl font-bold text-white mb-1 max-w-sm truncate">
                {currentTrack?.title || "No Track Selected"}
              </h3>
              <p className="text-xs text-neutral-400 font-medium mb-4">
                {currentTrack ? `${currentTrack.artist} • ${currentTrack.format.toUpperCase()} (${formatBytes(currentTrack.size)})` : "Add audio files or folders to start"}
              </p>

              {/* Real-Time Frequency Visualizer Canvas */}
              <div className="w-full flex justify-center mb-6">
                <AudioVisualizerCanvas isPlaying={isPlaying} barCount={40} height={36} color="#0071E3" />
              </div>

              {/* Timeline Scrubber */}
              <div className="w-full flex flex-col gap-1.5 mb-6">
                <Slider
                  value={currentTime}
                  min={0}
                  max={duration || 100}
                  onChange={handleSeek}
                  accentColor="#0071E3"
                />
                <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
                <button
                  type="button"
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isShuffle ? "text-apple-blue bg-apple-blue/10" : "text-neutral-400 hover:text-white"
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2.5 rounded-full text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer active:scale-95"
                  title="Previous Track"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!currentTrack}
                  className="w-14 h-14 rounded-full bg-apple-blue text-white flex items-center justify-center shadow-lg shadow-apple-blue/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2.5 rounded-full text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer active:scale-95"
                  title="Next Track"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isLooping ? "text-apple-blue bg-apple-blue/10" : "text-neutral-400 hover:text-white"
                  }`}
                  title="Loop"
                >
                  <Repeat className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3 w-48">
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      const next = !isMuted;
                      setIsMuted(next);
                      audioRef.current.muted = next;
                    }
                  }}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
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
            </Card>
          </div>

          {/* Right Column: Local Library Playlist Queue */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-apple-blue" />
                <h4 className="text-sm font-bold text-white">
                  Local Queue ({items.length})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs flex items-center gap-1"
                >
                  <FilePlus className="w-3.5 h-3.5" /> Files
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                  className="text-xs flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> Folder
                </Button>
                {items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                    title="Clear Queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <Card variant="glass" className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 flex items-center justify-center">
                  <HardDrive className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-neutral-300">
                  No local audio files in library
                </p>
                <p className="text-[11px] text-neutral-400 max-w-xs">
                  Pick individual audio files or an entire folder from your device. Files stay stored locally in your browser.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs flex items-center gap-1.5 mt-2 bg-apple-blue hover:bg-apple-blueHover text-white"
                >
                  <FilePlus className="w-3.5 h-3.5" /> Choose Local Audio
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const isItemPlaying = idx === currentIndex && isPlaying;
                  const isSelected = idx === currentIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={() => playIndex(idx)}
                      className={`group flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-apple-blue/15 border-apple-blue/30 shadow-sm"
                          : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-apple-blue text-white shadow-sm shadow-apple-blue/40" : "bg-neutral-800 text-neutral-400 group-hover:text-white"
                          }`}
                        >
                          {isItemPlaying ? (
                            <Volume2 className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Music className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5
                            className={`text-xs font-semibold truncate ${
                              isSelected ? "text-apple-blue font-bold" : "text-neutral-200 group-hover:text-white"
                            }`}
                          >
                            {item.title}
                          </h5>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {item.format.toUpperCase()} • {formatBytes(item.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete from Queue"
                      >
                        <Trash2 className="w-4 h-4" />
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
