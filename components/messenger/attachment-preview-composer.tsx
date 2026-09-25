"use client";

import React, { useState, useEffect } from "react";
import { X, Send, FileText, Image as ImageIcon, Paperclip } from "lucide-react";

interface AttachmentPreviewComposerProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onSend: (caption: string) => void;
  onCancel: () => void;
  uploading: boolean;
  progress?: number;
}

export function AttachmentPreviewComposer({
  files,
  onRemoveFile,
  onSend,
  onCancel,
  uploading,
  progress = 0,
}: AttachmentPreviewComposerProps) {
  const [caption, setCaption] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) =>
      f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
    );
    setPreviews(urls);
    return () => urls.forEach((url) => url && URL.revokeObjectURL(url));
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className="p-3 rounded-3xl glass-panel border border-border-strong mb-2 animate-slide-up space-y-3 ">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <span className="text-xs font-bold text-foreground">
          Отправить {files.length} {files.length === 1 ? "файл" : "файла"}
        </span>
        <button
          onClick={onCancel}
          disabled={uploading}
          className="p-1 rounded-full text-foreground-muted hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thumbnails row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {files.map((file, idx) => {
          const isImg = file.type.startsWith("image/");
          const previewUrl = previews[idx];

          return (
            <div
              key={idx}
              className="relative w-20 h-20 rounded-2xl bg-surface-elevated border border-border overflow-hidden shrink-0 group flex flex-col items-center justify-center p-1"
            >
              {isImg && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-center p-1 min-w-0 w-full">
                  <FileText className="w-6 h-6 text-accent mb-1" />
                  <span className="text-[9px] text-foreground-muted truncate w-full">
                    {file.name}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
                disabled={uploading}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Caption & Send */}
      {uploading && (
        <div role="status" className="text-xs text-foreground-muted">
          Загрузка: {progress}%
          <progress max={100} value={progress} className="w-full" />
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          placeholder="Добавить подпись к файлам..."
          value={caption}
          disabled={uploading}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !uploading) onSend(caption);
          }}
          className="min-w-0 flex-1 bg-surface-elevated border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => onSend(caption)}
          disabled={uploading}
          className="shrink-0 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Отправить</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
