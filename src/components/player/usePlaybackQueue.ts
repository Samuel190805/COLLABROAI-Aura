"use client";

import { useState, useCallback, useMemo } from "react";

export interface PlaylistItem {
  id: string;
  title: string;
  artist?: string;
  author?: string;
  url: string;
  mediaType?: "audio" | "video";
  sourceType?: "local_audio" | "local_video" | "youtube" | "remote_url";
  duration?: number;
  thumbnailUrl?: string;
  format?: string;
  sizeBytes?: number;
}

export interface UsePlaybackQueueOptions {
  initialQueue?: PlaylistItem[];
  initialIndex?: number;
  initialVolume?: number;
  initialSpeed?: number;
}

export function usePlaybackQueue(options: UsePlaybackQueueOptions = {}) {
  const {
    initialQueue = [],
    initialIndex = 0,
    initialVolume = 0.85,
    initialSpeed = 1.0,
  } = options;

  const [queue, setQueue] = useState<PlaylistItem[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(initialVolume);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(initialSpeed);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);

  const currentTrack = useMemo<PlaylistItem | null>(() => {
    if (queue.length === 0) return null;
    if (currentIndex < 0 || currentIndex >= queue.length) return queue[0];
    return queue[currentIndex];
  }, [queue, currentIndex]);

  const addToQueue = useCallback((item: PlaylistItem | PlaylistItem[]) => {
    setQueue((prev) => {
      const itemsToAdd = Array.isArray(item) ? item : [item];
      const existingIds = new Set(prev.map((t) => t.id));
      const filtered = itemsToAdd.filter((t) => !existingIds.has(t.id));
      return [...prev, ...filtered];
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      return filtered;
    });
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const playTrack = useCallback((indexOrId: number | string) => {
    if (typeof indexOrId === "number") {
      setCurrentIndex(indexOrId);
      setIsPlaying(true);
    } else {
      setQueue((prev) => {
        const foundIndex = prev.findIndex((t) => t.id === indexOrId);
        if (foundIndex !== -1) {
          setCurrentIndex(foundIndex);
          setIsPlaying(true);
        }
        return prev;
      });
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      setCurrentIndex(randomIndex);
      return;
    }

    setCurrentIndex((prev) => {
      if (prev + 1 < queue.length) {
        return prev + 1;
      }
      if (isLooping) {
        return 0;
      }
      setIsPlaying(false);
      return prev;
    });
  }, [queue.length, isShuffle, isLooping]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : isLooping ? queue.length - 1 : 0));
  }, [queue.length, isLooping]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  return {
    queue,
    setQueue,
    currentIndex,
    setCurrentIndex,
    currentTrack,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    playbackSpeed,
    setPlaybackSpeed,
    isLooping,
    setIsLooping,
    isShuffle,
    setIsShuffle,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playTrack,
    nextTrack,
    prevTrack,
    togglePlay,
    toggleMute,
    toggleLoop,
    toggleShuffle,
  };
}
