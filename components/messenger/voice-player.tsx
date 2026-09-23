"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { toast } from "sonner";
export function VoicePlayer({
  url,
  initialDuration = 0,
}: {
  url: string;
  initialDuration?: number;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    const a = new Audio(url);
    a.preload = "metadata";
    audio.current = a;
    a.onloadedmetadata = () =>
      setDuration(Number.isFinite(a.duration) ? a.duration : initialDuration);
    a.ontimeupdate = () => {
      setTime(a.currentTime);
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    };
    a.onended = () => setPlaying(false);
    a.onerror = () => {
      setPlaying(false);
      toast.error("Не удалось загрузить голосовое сообщение");
    };
    return () => {
      a.pause();
      a.src = "";
      audio.current = null;
    };
  }, [url, initialDuration]);
  async function toggle() {
    if (!audio.current) return;
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      try {
        audio.current.playbackRate = speed;
        await audio.current.play();
        setPlaying(true);
      } catch {
        toast.error("Не удалось воспроизвести запись");
      }
    }
  }
  const format = (n: number) =>
    `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
  return (
    <div className="flex items-center gap-2 p-2 border border-border rounded-lg w-[240px] max-w-full">
      <button
        className="icon-button"
        aria-label={playing ? "Приостановить" : "Воспроизвести"}
        onClick={toggle}
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-foreground-muted">
          Голосовое сообщение
        </span>
        <input
          aria-label="Позиция воспроизведения"
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={time}
          onChange={(e) => {
            if (audio.current) {
              audio.current.currentTime = Number(e.target.value);
              setTime(Number(e.target.value));
            }
          }}
          className="w-full accent-accent"
        />
        <p className="text-[11px] text-foreground-muted tabular-nums">
          {format(time)} / {format(duration)}
        </p>
      </div>
      <button
        className="text-xs p-2"
        aria-label="Скорость воспроизведения"
        onClick={() => {
          const n = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
          setSpeed(n);
          if (audio.current) audio.current.playbackRate = n;
        }}
      >
        {speed}×
      </button>
    </div>
  );
}
