"use client";
import { useEffect, useRef, useState } from "react";
import { Square, Trash2, Send, Play } from "lucide-react";
import { toast } from "sonner";
export function VoiceRecorder({
  onSendVoice,
  onCancel,
}: {
  onSendVoice: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const sendOnStop = useRef(false);
  const durationRef = useRef(0);
  const preview = useRef<HTMLAudioElement | null>(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(16).fill(2));
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval>;
    let audioContext: AudioContext;
    let frame = 0;
    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        const r = new MediaRecorder(s);
        recorder.current = r;
        chunks.current = [];
        r.ondataavailable = (e) => {
          if (e.data.size) chunks.current.push(e.data);
        };
        r.onstop = () => {
          const result = new Blob(chunks.current, {
            type: r.mimeType.split(";")[0] || "audio/webm",
          });
          s.getTracks().forEach((t) => t.stop());
          clearInterval(timer);
          cancelAnimationFrame(frame);
          audioContext?.close().catch(() => {});
          if (active) {
            setRecording(false);
            setBlob(result);
            if (sendOnStop.current) onSendVoice(result, durationRef.current);
          }
        };
        r.start();
        started.current = Date.now();
        setRecording(true);
        timer = setInterval(() => {
          durationRef.current = Math.floor(
            (Date.now() - started.current) / 1000,
          );
          setDuration(durationRef.current);
        }, 250);
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        audioContext.createMediaStreamSource(s).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          analyser.getByteFrequencyData(data);
          if (active)
            setLevels(
              Array.from(data.slice(0, 16)).map((v) =>
                Math.max(2, (v / 255) * 24),
              ),
            );
          frame = requestAnimationFrame(draw);
        };
        draw();
      } catch {
        if (active) {
          toast.error(
            "Не удалось включить микрофон. Проверьте разрешение браузера.",
          );
          onCancel();
        }
      }
    }
    void start();
    return () => {
      active = false;
      clearInterval(timer);
      cancelAnimationFrame(frame);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      audioContext?.close().catch(() => {});
      if (preview.current) {
        preview.current.pause();
        URL.revokeObjectURL(preview.current.src);
      }
    };
  }, []);
  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  const send = () => {
    if (blob) onSendVoice(blob, duration);
    else {
      sendOnStop.current = true;
      stop();
    }
  };
  return (
    <div className="flex items-center gap-2 w-full">
      <button
        type="button"
        className="icon-button"
        aria-label="Отменить запись"
        onClick={onCancel}
      >
        <Trash2 size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs tabular-nums mb-1">
          {recording ? "Запись" : "Прослушать перед отправкой"} ·{" "}
          {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
        </p>
        <div className="flex gap-1 h-6 items-center" aria-hidden="true">
          {levels.map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-accent"
              style={{ height: recording ? h : 3 }}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label={recording ? "Остановить запись" : "Прослушать запись"}
        onClick={() => {
          if (recording) stop();
          else if (blob) {
            if (!preview.current)
              preview.current = new Audio(URL.createObjectURL(blob));
            preview.current
              .play()
              .catch(() => toast.error("Не удалось воспроизвести запись"));
          }
        }}
      >
        {recording ? <Square size={16} /> : <Play size={16} />}
      </button>
      <button
        type="button"
        className="icon-button"
        disabled={!recording && !blob}
        aria-label="Отправить голосовое"
        onClick={send}
      >
        <Send size={16} />
      </button>
    </div>
  );
}
