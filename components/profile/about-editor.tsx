"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Edit3, ExternalLink, Sparkles, Check, Loader2 } from "lucide-react";
import { request, json } from "@/components/tables/model";

export function AboutEditor({ userId }: { userId: string }) {
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request(`/api/profiles/${userId}`)
      .then((d) => {
        setBio(d.profile.bio || "");
        setSaved(d.profile.bio || "");
      })
      .catch((e) => toast.error(e.message));
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await request(`/api/profiles/${userId}`, json("PATCH", { bio: bio.trim() }));
      setSaved(bio.trim());
      toast.success("Описание профиля сохранено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения описания");
    } finally {
      setBusy(false);
    }
  };

  const isChanged = saved !== null && bio.trim() !== (saved || "").trim();

  return (
    <div className="pt-4 border-t border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Edit3 size={15} className="text-accent" />
            <span>О себе (Bio в стиле Telegram)</span>
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Краткое описание, увлечения и статус, которые видны одноклассникам в вашем профиле
          </p>
        </div>

        <Link
          href={`/members/${userId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-semibold text-foreground transition-colors self-start sm:self-auto shrink-0 shadow-xs"
        >
          <ExternalLink size={13} className="text-accent" />
          <span>Смотреть мой профиль</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            rows={3}
            maxLength={300}
            value={bio}
            disabled={saved === null || busy}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Например: Люблю математику и шахматы ♟️ | Увлекаюсь программированием"
            className="w-full bg-surface-elevated border border-border focus:border-accent rounded-2xl p-3.5 text-xs sm:text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all resize-none shadow-xs"
          />
          <div className="absolute right-3 bottom-3 text-[10px] font-mono text-foreground-muted">
            {bio.length}/300
          </div>
        </div>

        {/* Telegram Live Preview */}
        {bio.trim() && (
          <div className="p-3 rounded-2xl bg-surface-elevated/50 border border-border/80 flex items-start gap-2.5 animate-fade-in">
            <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-foreground-muted tracking-wider block">
                Превью в Telegram-профиле:
              </span>
              <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">
                {bio}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          {saved !== null && !isChanged && bio.trim() && (
            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
              <Check size={13} />
              <span>Сохранено</span>
            </span>
          )}

          <button
            type="submit"
            disabled={busy || saved === null || !isChanged}
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {busy ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Сохранить описание</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
