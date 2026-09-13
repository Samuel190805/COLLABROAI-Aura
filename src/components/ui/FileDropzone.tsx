"use client";

import React, { useState, useRef } from "react";
import { cn, formatBytes } from "@/lib/utils";
import { Upload, FileAudio, FileVideo, X } from "lucide-react";

export interface FileDropzoneProps {
  accept?: string;
  maxSizeBytes?: number;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  label?: string;
  sublabel?: string;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept = "audio/*,video/*",
  maxSizeBytes = 200 * 1024 * 1024,
  onFileSelect,
  selectedFile,
  label = "Drop audio file here or browse",
  sublabel = "Supports MP3, WAV, FLAC, M4A, MP4 up to 200MB",
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndSet = (file: File) => {
    setError(null);
    if (maxSizeBytes && file.size > maxSizeBytes) {
      setError(`File size exceeds limit (${formatBytes(maxSizeBytes)})`);
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSet(e.target.files[0]);
    }
  };

  const isVideo = selectedFile?.type?.includes("video");

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center p-8 rounded-sm border border-dashed transition-colors duration-150 cursor-pointer text-center",
            isDragOver
              ? "border-mono-ink bg-mono-bgAlt"
              : "border-mono-line hover:border-mono-ink bg-mono-bg"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="w-10 h-10 border-hairline flex items-center justify-center text-mono-ink mb-3 rounded-sm bg-mono-bgAlt">
            <Upload className="w-4 h-4 stroke-[1.5]" />
          </div>
          <p className="text-xs font-medium text-mono-ink mb-1">
            {label}
          </p>
          <p className="text-[11px] text-mono-inkMuted font-mono">
            {sublabel}
          </p>
          {error && <p className="mt-2 text-xs text-mono-ink font-mono">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 rounded-sm border-hairline bg-mono-bg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 border-hairline flex items-center justify-center shrink-0 text-mono-ink bg-mono-bgAlt">
              {isVideo ? (
                <FileVideo className="w-4 h-4 stroke-[1.5]" />
              ) : (
                <FileAudio className="w-4 h-4 stroke-[1.5]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-mono-ink truncate">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-mono-inkMuted font-mono">
                {formatBytes(selectedFile.size)} • {selectedFile.type || "audio"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onFileSelect(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="p-1 border-hairline hover:border-mono-ink text-mono-inkMuted hover:text-mono-ink transition-colors"
          >
            <X className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
