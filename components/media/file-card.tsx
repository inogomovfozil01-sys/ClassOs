"use client";
import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { MediaViewer } from "@/components/media/media-viewer";
import { VoicePlayer } from "@/components/messenger/voice-player";
import { isVoiceAttachment } from "@/lib/media";
export function FileCard({
  name,
  url,
  mimeType,
  size,
}: {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const visual =
    mimeType?.startsWith("image/") || mimeType?.startsWith("video/");
  if (isVoiceAttachment({ mimeType, fileName: name }))
    return <VoicePlayer url={url} />;
  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg min-w-0">
      {visual ? (
        <button
          type="button"
          className="shrink-0"
          aria-label={`Открыть ${name}`}
          onClick={() => setOpen(true)}
        >
          {mimeType?.startsWith("image/") ? (
            <img
              src={url}
              alt={name}
              loading="lazy"
              className="w-12 h-12 object-cover rounded-md"
            />
          ) : (
            <span className="text-xs">Видео</span>
          )}
        </button>
      ) : (
        <FileText size={22} className="shrink-0 text-foreground-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate" title={name}>
          {name}
        </p>
        <p className="text-[11px] text-foreground-muted mt-1 truncate">
          {name.includes(".") ? name.split(".").pop()?.slice(0, 12).toUpperCase() : "Файл"}
          {size ? ` · ${(size / 1024 / 1024).toFixed(1)} МБ` : ""}
        </p>
      </div>
      <a
        className="icon-button"
        href={url}
        download={name}
        aria-label={`Скачать ${name}`}
      >
        <Download size={15} />
      </a>
      {visual && (
        <MediaViewer
          isOpen={open}
          onClose={() => setOpen(false)}
          items={[
            {
              url,
              type: mimeType?.startsWith("image/") ? "image" : "video",
              fileName: name,
            },
          ]}
        />
      )}
    </div>
  );
}
