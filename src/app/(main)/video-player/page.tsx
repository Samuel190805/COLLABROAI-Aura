"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Video,
  Upload,
  Link2,
  Trash2,
  ListVideo,
} from "lucide-react";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { localLibrary, LocalMediaItem } from "@/lib/localLibrary";
import { formatBytes } from "@/lib/utils";

function VideoPlayerContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [mode, setMode] = useState<"youtube" | "local">(initialUrl ? "youtube" : "youtube");
  const [urlInput, setUrlInput] = useState(
    initialUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  const [activeVideoUrl, setActiveVideoUrl] = useState(
    initialUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );

  const [items, setItems] = useState<LocalMediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadLocalLibrary = React.useCallback(async () => {
    try {
      const all = await localLibrary.getAllItems("video");
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
      if (!file.type.includes("video") && !file.name.match(/\.(mp4|webm|mkv|mov|avi)$/i)) {
        continue;
      }

      const item: LocalMediaItem = {
        id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: "video",
        format: file.name.split(".").pop() || "mp4",
        size: file.size,
        lastModified: file.lastModified,
        url: URL.createObjectURL(file),
        addedAt: Date.now(),
      };

      await localLibrary.addItem(item);
    }

    setMode("local");
    await loadLocalLibrary();
  };

  const currentLocalTrack =
    currentIndex >= 0 && currentIndex < items.length ? items[currentIndex] : null;

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setActiveVideoUrl(urlInput.trim());
      setMode("youtube");
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await localLibrary.removeItem(id);
    await loadLocalLibrary();
  };

  const handleClearAll = async () => {
    await localLibrary.clearAll("video");
    setItems([]);
    setCurrentIndex(-1);
  };

  const activeSrc = mode === "youtube" ? activeVideoUrl : currentLocalTrack?.url || "";
  const activeTitle = mode === "youtube" ? "Video Stream" : currentLocalTrack?.title || "Local Video";

  return (
    <div className="min-h-screen bg-mono-bg text-mono-ink px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-black/10 dark:border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">Video Playback</span>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Unified Video Player</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Supports YouTube streaming and local video containers with theater mode and Picture-in-Picture.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mkv,.mov"
              multiple
              onChange={handleAddFiles}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Video
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleApplyUrl} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube or video stream URL..."
              className="w-full bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Load Video
          </button>
        </form>

        {/* Player + Library Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Unified Player */}
          <div className="lg:col-span-2 space-y-4">
            {activeSrc ? (
              <MediaPlayer
                key={activeSrc}
                src={activeSrc}
                mediaType="video"
                title={activeTitle}
                artist={mode === "youtube" ? "Web Stream" : "Local File"}
              />
            ) : (
              <div className="h-64 border border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
                <Video className="w-8 h-8 opacity-40" />
                No video loaded. Enter a URL or upload a file.
              </div>
            )}
          </div>

          {/* Local Library / Queue */}
          <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-4 flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-3">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <ListVideo className="w-4 h-4" /> Local Library ({items.length})
              </div>
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {items.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-xs text-neutral-400">No local files in library</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] underline text-neutral-500 hover:text-black dark:hover:text-white"
                  >
                    Add video files
                  </button>
                </div>
              ) : (
                items.map((item, idx) => {
                  const isCurrent = mode === "local" && idx === currentIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setMode("local");
                      }}
                      className={`p-2 border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isCurrent
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-medium"
                          : "border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{item.title}</p>
                        <p className={`text-[10px] truncate ${isCurrent ? "opacity-70" : "text-neutral-500"}`}>
                          {item.format.toUpperCase()} &bull; {formatBytes(item.size)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="opacity-40 hover:opacity-100 p-1"
                        title="Delete"
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

export default function VideoPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent animate-spin" />
        </div>
      }
    >
      <VideoPlayerContent />
    </Suspense>
  );
}
