"use client";

import React, { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Camera,
  UploadCloud,
  Trash2,
  Check,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export function AvatarEditor() {
  const { user, refreshUser } = useAuth();
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileValidation = (candidateFile?: File) => {
    if (!candidateFile) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(candidateFile.type) ||
      candidateFile.size > 4 * 1024 * 1024
    ) {
      toast.error("Пожалуйста, выберите изображение JPG, PNG или WebP до 4 МБ");
      return;
    }
    setFile(candidateFile);
    setRemoveConfirm(false);
    toast.info("Фото выбрано. Нажмите «Сохранить фото» для применения");
  };

  async function save(remove = false) {
    setBusy(true);
    try {
      const body = new FormData();
      if (file) body.set("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: remove ? "DELETE" : "POST",
        ...(remove ? {} : { body }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Не удалось сохранить фото");
      await refreshUser();
      setFile(null);
      setRemoveConfirm(false);
      toast.success(remove ? "Фотография удалена" : "Фото профиля успешно обновлено!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files?.[0];
        handleFileValidation(droppedFile);
      }}
      className={`relative p-5 sm:p-6 rounded-3xl border transition-all duration-200 ${
        isDragOver
          ? "bg-accent/15 border-accent ring-2 ring-accent/30 shadow-lg scale-[1.01]"
          : "bg-surface-elevated/40 border-border"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar with Camera Overlay */}
        <div className="relative group shrink-0">
          <div className="relative rounded-full ring-4 ring-accent/20 border-2 border-accent/40 shadow-xl overflow-hidden p-0.5 bg-surface">
            <UserAvatar
              src={preview || user?.avatarUrl}
              name={`${user?.firstName || ""} ${user?.lastName || ""}`}
              size={100}
            />
          </div>

          {/* Quick Camera Action Badge */}
          <button
            type="button"
            onClick={() => picker.current?.click()}
            title="Загрузить новое фото"
            disabled={busy}
            className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 border-2 border-surface"
          >
            <Camera size={16} />
          </button>
        </div>

        {/* Info & Toolbar */}
        <div className="flex-1 text-center sm:text-left min-w-0 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
              <span>Фотография профиля</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold">
                512 × 512 WebP
              </span>
            </h3>
            <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
              Перетащите файл сюда или нажмите кнопку для выбора. Поддерживаются JPG, PNG, WebP до 4 МБ. Фото автоматически оптимизируется.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <UploadCloud size={15} />
              <span>{file ? "Выбрать другое" : "Загрузить фото"}</span>
            </button>

            {file && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                >
                  {busy ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{busy ? "Сохранение..." : "Применить фото"}</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFile(null)}
                  className="px-3 py-2 rounded-xl bg-surface hover:bg-surface-elevated text-foreground-muted hover:text-foreground text-xs font-medium transition-colors"
                >
                  <X size={14} />
                </button>
              </>
            )}

            {user?.avatarUrl && !file && !removeConfirm && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRemoveConfirm(true)}
                className="px-3 py-2 rounded-xl text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Удалить</span>
              </button>
            )}
          </div>

          {/* Inline Delete Confirmation */}
          {removeConfirm && (
            <div className="p-3 rounded-2xl bg-danger/10 border border-danger/25 space-y-2 animate-fade-in text-xs">
              <p className="text-danger font-medium">
                Удалить фотографию профиля? Вместо неё будут отображаться ваши инициалы.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save(true)}
                  className="px-3 py-1.5 rounded-xl bg-danger hover:bg-danger/90 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  {busy ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>Да, удалить</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRemoveConfirm(false)}
                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-foreground-muted hover:text-foreground text-xs font-medium"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={picker}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Фотография профиля"
        onChange={(e) => {
          const chosen = e.target.files?.[0];
          e.target.value = "";
          handleFileValidation(chosen);
        }}
      />
    </div>
  );
}
