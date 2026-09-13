"use client";

import React, { useRef, useEffect } from "react";

export interface AudioVisualizerCanvasProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}

export const AudioVisualizerCanvas: React.FC<AudioVisualizerCanvasProps> = ({
  isPlaying,
  barCount = 32,
  height = 40,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDark = document.documentElement.classList.contains("dark");
      const inkColor = isDark ? "#FAFAFA" : "#0A0A0A";

      const barWidth = Math.max(2, canvas.width / barCount - 2);

      for (let i = 0; i < barCount; i++) {
        let barHeight = 2;
        if (isPlaying) {
          const sinVal = Math.sin(phase + i * 0.35) * 0.5 + 0.5;
          const cosVal = Math.cos(phase * 1.4 + i * 0.25) * 0.5 + 0.5;
          barHeight = Math.max(2, (sinVal * 0.6 + cosVal * 0.4) * (canvas.height - 4));
        }

        const x = i * (barWidth + 2);
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = inkColor;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      if (isPlaying) {
        phase += 0.08;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={height}
      className={className}
    />
  );
};

export default AudioVisualizerCanvas;
