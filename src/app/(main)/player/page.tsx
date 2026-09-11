"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Music,
  Video,
  Upload,
  Link2,
  ListMusic,
  Maximize2,
  Repeat,
  Shuffle,
  Mic,
  FastForward,
  Rewind,
  Share2,
  Download,
  Scissors,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Slider } from "@/components/ui/Slider";
import { WaveformVisualizer } from "@/components/audio/WaveformVisualizer";
import { AudioVisualizerCanvas } from "@/components/visual/AudioVisualizerCanvas";
import { YouTubeEmbed } from "@/components/video/YouTubeEmbed";
import { GraphicEqualizer } from "@/components/player/GraphicEqualizer";
import { SyncedLyricsView } from "@/components/player/SyncedLyricsView";
import { ModeAHero } from "@/components/layout/ModeAHero";
import { formatDuration, formatBytes } from "@/lib/utils";
import { validateAndNormalizeSourceUrl } from "@/domain/value-objects/SourceUrlValidator";

export interface PlaylistItem {
  id: string;
  title: string;
  author: string;
  sourceType: "local_audio" | "local_video" | "youtube" | "remote_url";
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  format?: string;
  sizeBytes?: number;
}

const DEFAULT_PLAYLIST: PlaylistItem[] = [
  {
    id: "track_demo_1",
    title: "Quantum Harmonics (Demo Mix)",
    author: "SplitStream Studio",
    sourceType: "remote_url",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
    format: "mp3",
  },
  {
    id: "track_demo_2",
    title: "Acoustic Resonance Master",
    author: "SplitStream Studio",
    sourceType: "remote_url",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 423,
    format: "mp3",
  },
];

function MediaPlayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  // Player & Queue State
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(DEFAULT_PLAYLIST);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);

  // Mode & UI tabs
  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const [activeSideTab, setActiveSideTab] = useState<"lyrics" | "eq" | "queue">("lyrics");

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentItem = playlist[currentIndex] || playlist[0];

  // Handle URL passed via search params on load
  useEffect(() => {
    if (initialUrl) {
      const validation = validateAndNormalizeSourceUrl(initialUrl);
      if (validation.isValid) {
        const newItem: PlaylistItem = {
          id: `item_${Date.now()}`,
          title: validation.youtubeVideoId ? `YouTube (${validation.youtubeVideoId})` : "Stream Track",
          author: validation.platform.toUpperCase(),
          sourceType: validation.youtubeVideoId ? "youtube" : "remote_url",
          url: validation.normalizedUrl,
          thumbnailUrl: validation.youtubeVideoId
            ? `https://img.youtube.com/vi/${validation.youtubeVideoId}/hqdefault.jpg`
            : undefined,
        };
        setPlaylist((prev) => [newItem, ...prev]);
        setCurrentIndex(0);
      }
    }
  }, [initialUrl]);

  const isVideoSource =
    currentItem?.sourceType === "local_video" ||
    (currentItem?.sourceType === "remote_url" &&
      [".mp4", ".webm", ".mkv", ".mov"].some((ext) => currentItem.url.toLowerCase().endsWith(ext)));

  const isYouTubeSource = currentItem?.sourceType === "youtube";

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (mediaRef.current) {
      mediaRef.current.volume = isMuted ? 0 : newVol;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = speed;
    }
  };

  const handleNext = () => {
    if (isShuffle) {
      const rand = Math.floor(Math.random() * playlist.length);
      setCurrentIndex(rand);
    } else {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      handleSeek(0);
    } else {
      setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
      setIsPlaying(true);
    }
  };

  // Local File Picker
  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: PlaylistItem[] = Array.from(files).map((f) => {
      const isVideo = f.type.startsWith("video/") || [".mp4", ".mkv", ".webm", ".mov"].some((ext) => f.name.toLowerCase().endsWith(ext));
      const blobUrl = URL.createObjectURL(f);
      return {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: f.name.replace(/\.[^/.]+$/, ""),
        author: "Local Master",
        sourceType: isVideo ? "local_video" : "local_audio",
        url: blobUrl,
        sizeBytes: f.size,
        format: f.name.split(".").pop(),
      };
    });

    setPlaylist((prev) => [...newItems, ...prev]);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  // Load URL input
  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const validation = validateAndNormalizeSourceUrl(urlInput.trim());
    if (!validation.isValid) return;

    const newItem: PlaylistItem = {
      id: `item_${Date.now()}`,
      title: validation.youtubeVideoId ? `YouTube (${validation.youtubeVideoId})` : "Streaming Media",
      author: validation.platform.toUpperCase(),
      sourceType: validation.youtubeVideoId ? "youtube" : "remote_url",
      url: validation.normalizedUrl,
      thumbnailUrl: validation.youtubeVideoId
        ? `https://img.youtube.com/vi/${validation.youtubeVideoId}/hqdefault.jpg`
        : undefined,
    };

    setPlaylist((prev) => [newItem, ...prev]);
    setCurrentIndex(0);
    setIsPlaying(true);
    setUrlInput("");
  };

  // Quick Action Handlers
  const sendToStems = () => {
    if (currentItem?.url) {
      router.push(`/stems?url=${encodeURIComponent(currentItem.url)}`);
    }
  };

  const sendToChords = () => {
    if (currentItem?.url) {
      router.push(`/chords?url=${encodeURIComponent(currentItem.url)}`);
    }
  };

  const sendToDownloader = () => {
    if (currentItem?.url) {
      router.push(`/download?url=${encodeURIComponent(currentItem.url)}`);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* =========================================================================
          MODE A: CONDENSED HERO CHAPTER (Brief, for repeated daily usage)
          ========================================================================= */}
      <ModeAHero
        chapterNumber="04 // ACOUSTIC PLAYBACK"
        badge="Parametric EQ & Synced Lyrics"
        headline="Studio fidelity. Every format."
        subheadline="Universal audio, video, and YouTube playback with 5-band mastering EQ."
        description="Lossless local playback and stream player equipped with real-time synchronized karaoke lyrics, dynamic bass boost, and instant pipeline routing."
        stats={[
          { label: "Studio Equalizer", value: "5-Band" },
          { label: "Karaoke Sync", value: "Whisper" },
          { label: "Stream Engine", value: "YouTube/Local" },
          { label: "Master Routing", value: "Instant" },
        ]}
        visualComponent={
          <div className="w-full flex flex-col items-center justify-center p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl">
            <AudioVisualizerCanvas isPlaying={isPlaying} barCount={36} height={90} color="#F59E0B" className="w-full" />
            <span className="text-[11px] font-mono text-amber-400 mt-2">REAL-TIME DSP SPECTRUM</span>
          </div>
        }
        toolAnchorId="player-workspace"
        toolCtaText="Go to Studio Player"
        condensed={true}
        align="right"
      />

      {/* =========================================================================
          SEAM & MODE B: CALM PRECISION STUDIO PLAYBACK DECK
          ========================================================================= */}
      <div
        id="player-workspace"
        className="w-full border-t border-white/10 bg-[#080809] py-16 px-4 sm:px-6 mode-b-precision"
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLocalFile}
            multiple
            accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.mp4,.webm,.mkv"
            className="hidden"
          />

          {/* Top Controls & Input Bar */}
          <Card variant="glass" className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <form onSubmit={handleLoadUrl} className="flex-1 flex items-center gap-2 w-full">
              <Input
                placeholder="Paste YouTube video or direct media link..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                leftIcon={<Link2 className="w-4 h-4 text-apple-blue" />}
                className="flex-1"
              />
              <Button type="submit" size="sm" className="h-10 text-xs shrink-0 bg-amber-600 hover:bg-amber-700 text-white">
                Load Link
              </Button>
            </form>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="glass"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs h-10"
              >
                <Upload className="w-4 h-4" /> Open Local Files
              </Button>
            </div>
          </Card>

          {/* Main Player Display & Tools Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Media Stage & Transport (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <Card variant="glass" className="p-6 flex flex-col gap-5 relative overflow-hidden shadow-apple dark:shadow-apple-dark">
                {/* Visual Screen / Video Player */}
                <div className="w-full aspect-video rounded-2xl bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
                  {isYouTubeSource ? (
                    <YouTubeEmbed videoIdOrUrl={currentItem.url} className="w-full h-full" />
                  ) : isVideoSource ? (
                    <video
                      ref={(el) => {
                        mediaRef.current = el;
                      }}
                      src={currentItem.url}
                      className="w-full h-full object-contain"
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                      onEnded={handleNext}
                      controls={false}
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-neutral-900 to-black p-6">
                      {/* Hidden Audio Node */}
                      <audio
                        ref={(el) => {
                          mediaRef.current = el;
                        }}
                        src={currentItem.url}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={handleNext}
                      />

                      {/* Audio Visualizer Canvas */}
                      <AudioVisualizerCanvas isPlaying={isPlaying} color="#F59E0B" className="w-full h-36 opacity-80" />

                      <div className="text-center mt-2 z-10">
                        <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">
                          {currentItem.title}
                        </h3>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">
                          {currentItem.author} • {currentItem.format?.toUpperCase() || "STEREO"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Title & Quick Actions Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">
                      {currentItem.title}
                    </h2>
                    <p className="text-xs text-neutral-400 font-mono">
                      {currentItem.author} • Source: {currentItem.sourceType.replace("_", " ").toUpperCase()}
                    </p>
                  </div>

                  {/* Quick Pipeline Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={sendToStems}
                      title="Send to Stem Separator"
                      className="text-[11px] h-8 flex items-center gap-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                    >
                      <Scissors className="w-3.5 h-3.5" /> Stems
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={sendToChords}
                      title="Send to Chord Detector"
                      className="text-[11px] h-8 flex items-center gap-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    >
                      <Music className="w-3.5 h-3.5" /> Chords
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={sendToDownloader}
                      title="Send to Downloader"
                      className="text-[11px] h-8 flex items-center gap-1 bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20"
                    >
                      <Download className="w-3.5 h-3.5" /> Save
                    </Button>
                  </div>
                </div>

                {/* Timeline Scrub Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                  <WaveformVisualizer
                    currentTime={currentTime}
                    duration={duration || 180}
                    onSeek={handleSeek}
                    accentColor="#F59E0B"
                    height={28}
                  />
                </div>

                {/* Transport Bar Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={`p-2 rounded-xl cursor-pointer transition-all ${
                        isShuffle ? "bg-amber-500 text-white shadow-sm" : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                      title="Shuffle"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLooping(!isLooping)}
                      className={`p-2 rounded-xl cursor-pointer transition-all ${
                        isLooping ? "bg-amber-500 text-white shadow-sm" : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                      title="Loop"
                    >
                      <Repeat className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Center Play Controls */}
                  <div className="flex items-center gap-3">
                    <Button variant="glass" size="icon" onClick={handlePrev} className="h-9 w-9">
                      <Rewind className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="primary"
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white shadow-apple"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </Button>
                    <Button variant="glass" size="icon" onClick={handleNext} className="h-9 w-9">
                      <FastForward className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Volume & Speed Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMuted(!isMuted);
                          if (mediaRef.current) mediaRef.current.muted = !isMuted;
                        }}
                        className="text-neutral-400 hover:text-neutral-200 cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-red-500" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <div className="w-20">
                        <Slider
                          value={isMuted ? 0 : volume * 100}
                          min={0}
                          max={100}
                          onChange={(v) => handleVolumeChange(v / 100)}
                        />
                      </div>
                    </div>

                    <select
                      value={playbackSpeed.toString()}
                      onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                      className="px-2 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-neutral-300"
                    >
                      <option value="0.75">0.75x</option>
                      <option value="1.0">1.0x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2.0">2.0x</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Synced Lyrics, Equalizer & Queue Tabs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex justify-center">
                <Tabs
                  tabs={[
                    { id: "lyrics", label: "Synced Lyrics", icon: <Mic className="w-4 h-4" /> },
                    { id: "eq", label: "Studio EQ", icon: <Sliders className="w-4 h-4" /> },
                    { id: "queue", label: "Queue", icon: <ListMusic className="w-4 h-4" /> },
                  ]}
                  activeTab={activeSideTab}
                  onChange={(id) => setActiveSideTab(id as any)}
                />
              </div>

              {activeSideTab === "lyrics" && (
                <SyncedLyricsView
                  mediaUrl={currentItem.url}
                  currentTime={currentTime}
                  duration={duration}
                  onSeekTo={handleSeek}
                  className="h-[460px]"
                />
              )}

              {activeSideTab === "eq" && (
                <GraphicEqualizer
                  audioElement={mediaRef.current}
                  className="h-[460px] flex flex-col justify-between"
                />
              )}

              {activeSideTab === "queue" && (
                <Card variant="glass" className="h-[460px] p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                    <h4 className="text-sm font-bold text-white">
                      Playlist Queue ({playlist.length})
                    </h4>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs h-7"
                    >
                      + Add Track
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                    {playlist.map((item, idx) => {
                      const isCurrent = idx === currentIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setCurrentIndex(idx);
                            setIsPlaying(true);
                          }}
                          className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isCurrent
                              ? "bg-amber-500 text-white shadow-sm font-semibold"
                              : "bg-white/5 text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs opacity-60 font-mono w-4">{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{item.title}</p>
                              <p className={`text-[10px] font-mono ${isCurrent ? "text-white/80" : "text-neutral-400"}`}>
                                {item.author}
                              </p>
                            </div>
                          </div>

                          {isCurrent && isPlaying && (
                            <div className="flex items-center gap-0.5">
                              <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
                              <span className="w-1 h-4 bg-white rounded-full animate-pulse delay-75" />
                              <span className="w-1 h-2 bg-white rounded-full animate-pulse delay-150" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnifiedMediaPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-apple-blue border-t-transparent animate-spin" />
        </div>
      }
    >
      <MediaPlayerContent />
    </Suspense>
  );
}
