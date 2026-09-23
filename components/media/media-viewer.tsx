"use client";
import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
} from "lucide-react";
type MediaItem = {
  url: string;
  type: "image" | "video";
  fileName?: string;
  senderName?: string;
  date?: string;
};
export function MediaViewer({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  initialIndex?: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const start = useRef({ x: 0, y: 0, distance: 0, zoom: 1 });
  const lastTap = useRef(0);
  useEffect(() => {
    setIndex(Math.min(initialIndex, Math.max(0, items.length - 1)));
    setZoom(1);
  }, [initialIndex, isOpen, items.length]);
  const next = (direction: number) => {
    setIndex((i) => Math.max(0, Math.min(items.length - 1, i + direction)));
    setZoom(1);
  };
  useEffect(() => {
    if (!isOpen) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next(1);
      if (e.key === "ArrowLeft") next(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [isOpen, items.length]);
  const current = items[index];
  if (!current) return null;
  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/95 z-[90]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[91] text-white flex flex-col outline-none pt-safe pb-safe"
        >
          <Dialog.Title className="sr-only">Просмотр медиа</Dialog.Title>
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="min-w-0 text-xs">
              <p className="truncate">
                {current.senderName || current.fileName}
              </p>
              <p className="text-white/60 mt-1">
                {index + 1} / {items.length} {current.date}
              </p>
            </div>
            <div className="flex gap-1">
              {current.type === "image" && (
                <>
                  <button
                    className="p-3"
                    aria-label="Уменьшить"
                    onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                  >
                    <ZoomOut size={18} />
                  </button>
                  <button
                    className="p-3"
                    aria-label="Увеличить"
                    onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                  >
                    <ZoomIn size={18} />
                  </button>
                </>
              )}
              <a
                className="p-3"
                aria-label="Скачать оригинал"
                href={current.url}
                download={current.fileName}
              >
                <Download size={18} />
              </a>
              <Dialog.Close className="p-3" aria-label="Закрыть просмотр">
                <X size={20} />
              </Dialog.Close>
            </div>
          </div>
          <div
            className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center"
            style={{ touchAction: "none" }}
            onTouchStart={(e) => {
              const a = e.touches[0];
              const b = e.touches[1];
              start.current = {
                x: a.clientX,
                y: a.clientY,
                distance: b
                  ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
                  : 0,
                zoom,
              };
              if (!b) {
                const now = Date.now();
                if (now - lastTap.current < 300)
                  setZoom((z) => (z === 1 ? 2 : 1));
                lastTap.current = now;
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2) {
                const [a, b] = Array.from(e.touches);
                if (start.current.distance)
                  setZoom(
                    Math.max(
                      1,
                      Math.min(
                        4,
                        (start.current.zoom *
                          Math.hypot(
                            a.clientX - b.clientX,
                            a.clientY - b.clientY,
                          )) /
                          start.current.distance,
                      ),
                    ),
                  );
              }
            }}
            onTouchEnd={(e) => {
              if (start.current.distance || zoom > 1 || !e.changedTouches[0])
                return;
              const dx = e.changedTouches[0].clientX - start.current.x;
              const dy = e.changedTouches[0].clientY - start.current.y;
              if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy))
                next(dx < 0 ? 1 : -1);
              else if (dy > 110) onClose();
            }}
            onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
          >
            {current.type === "image" ? (
              <img
                src={current.url}
                alt={current.fileName || "Фотография"}
                draggable={false}
                className="max-w-full max-h-full object-contain"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <video
                src={current.url}
                controls
                className="max-w-full max-h-full"
              />
            )}
            {index > 0 && (
              <button
                className="absolute left-2 p-3 rounded-full bg-black/50"
                aria-label="Предыдущее"
                onClick={() => next(-1)}
              >
                <ChevronLeft />
              </button>
            )}
            {index < items.length - 1 && (
              <button
                className="absolute right-2 p-3 rounded-full bg-black/50"
                aria-label="Следующее"
                onClick={() => next(1)}
              >
                <ChevronRight />
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
