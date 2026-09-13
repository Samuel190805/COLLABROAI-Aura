"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  Link2,
  ListMusic,
  Trash2,
  Scissors,
  Sparkles,
  Music,
} from "lucide-react";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { usePlaybackQueue, PlaylistItem } from "@/components/player/usePlaybackQueue";
import { validateAndNormalizeSourceUrl } from "@/domain/value-objects/SourceUrlValidator";

const DEFAULT_PLAYLIST: PlaylistItem[] = [
  {
    id: "track_demo_1",
    title: "Aura Harmonic Master (Demo)",
    author: "SplitStream",
    sourceType: "remote_url",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
    format: "mp3",
  },
  {
    id: "track_demo_2",
    title: "Acoustic Resonance Suite",
    author: "SplitStream",
    sourceType: "remote_url",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 423,
    format: "mp3",
  },
];

function AudioPlayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    queue,
    currentIndex,
    currentTrack,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playTrack,
    nextTrack,
  } = usePlaybackQueue({ initialQueue: DEFAULT_PLAYLIST });

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
        };
        addToQueue(newItem);
        playTrack(newItem.id);
      }
    }
  }, [initialUrl, addToQueue, playTrack]);

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: PlaylistItem[] = Array.from(files).map((f) => ({
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: f.name.replace(/\.[^/.]+$/, ""),
      author: "Local Master",
      sourceType: "local_audio",
      url: URL.createObjectURL(f),
      sizeBytes: f.size,
      format: f.name.split(".").pop(),
    }));

    addToQueue(newItems);
    if (newItems.length > 0) {
      playTrack(newItems[0].id);
    }
  };

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const validation = validateAndNormalizeSourceUrl(urlInput.trim());
    if (validation.isValid) {
      const newItem: PlaylistItem = {
        id: `url_${Date.now()}`,
        title: validation.youtubeVideoId ? `Stream (${validation.youtubeVideoId})` : "Stream Track",
        author: validation.platform.toUpperCase(),
        sourceType: validation.youtubeVideoId ? "youtube" : "remote_url",
        url: validation.normalizedUrl,
      };
      addToQueue(newItem);
      playTrack(newItem.id);
      setUrlInput("");
    }
  };

  return (
    <div className="min-h-screen bg-mono-bg text-mono-ink px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-black/10 dark:border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">Audio Playback</span>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Audio Master Player</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Harmonic visualization, 10-band mastering EQ, vinyl simulation, and synchronized lyrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              multiple
              onChange={handleLocalFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Audio
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleLoadUrl} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste stream or YouTube link to load into player..."
              className="w-full bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Load Track
          </button>
        </form>

        {/* Grid Layout: Main Player + Playlist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Unified Player Component */}
          <div className="lg:col-span-2 space-y-4">
            {currentTrack ? (
              <MediaPlayer
                key={currentTrack.id}
                src={currentTrack.url}
                mediaType="audio"
                title={currentTrack.title}
                artist={currentTrack.author || currentTrack.artist}
                onEnded={nextTrack}
              />
            ) : (
              <div className="h-64 border border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
                <Music className="w-8 h-8 opacity-40" />
                No audio track selected
              </div>
            )}

            {/* Quick Handoff Actions */}
            {currentTrack && (
              <div className="p-3 border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-mono text-neutral-500 uppercase text-[10px]">Quick Handoff</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/stems?url=${encodeURIComponent(currentTrack.url)}`)}
                    className="px-2.5 py-1 border border-black/10 dark:border-white/10 text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
                  >
                    <Scissors className="w-3 h-3" /> Separate Stems
                  </button>
                  <button
                    onClick={() => router.push(`/chords?url=${encodeURIComponent(currentTrack.url)}`)}
                    className="px-2.5 py-1 border border-black/10 dark:border-white/10 text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" /> Detect Chords
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Playlist Queue */}
          <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-4 flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-3">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <ListMusic className="w-4 h-4" /> Queue ({queue.length})
              </div>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {queue.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-8">Queue is empty</p>
              ) : (
                queue.map((track, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(idx)}
                      className={`p-2 border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isCurrent
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-medium"
                          : "border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{track.title}</p>
                        <p className={`text-[10px] truncate ${isCurrent ? "opacity-70" : "text-neutral-500"}`}>
                          {track.author || "Track"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(track.id);
                        }}
                        className="opacity-40 hover:opacity-100 p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AudioPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent animate-spin" />
        </div>
      }
    >
      <AudioPlayerContent />
    </Suspense>
  );
}
