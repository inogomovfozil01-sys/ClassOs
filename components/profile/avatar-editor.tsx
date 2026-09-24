"use client";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-context";
import { UserAvatar } from "@/components/ui/user-avatar";
export function AvatarEditor() {
  const { user, refreshUser } = useAuth();
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
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
      toast.success(remove ? "Фотография удалена" : "Аватарка сохранена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4" aria-labelledby="avatar-heading">
      <h2 id="avatar-heading" className="text-sm font-semibold">
        Фото профиля
      </h2>
      <div className="avatar-editor">
        <UserAvatar
          src={preview || user?.avatarUrl}
          name={`${user?.firstName || ""} ${user?.lastName || ""}`}
          size={96}
        />
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-foreground-muted">
            JPG, PNG или WebP до 4 МБ. Фото обрезается по центру и будет видно
            участникам класса.
          </p>
          <div className="toolbar-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
            >
              {file ? "Выбрать другое фото" : "Выбрать фотографию"}
            </button>
            {file && (
              <>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? "Сохранение…" : "Сохранить фото"}
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => setFile(null)}
                >
                  Отмена
                </button>
              </>
            )}
            {user?.avatarUrl && !file && (
              <button
                className="button danger"
                disabled={busy}
                onClick={() => setRemoveConfirm(true)}
              >
                Удалить фото
              </button>
            )}
          </div>
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
          if (!chosen) return;
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(chosen.type) ||
            chosen.size > 4 * 1024 * 1024
          ) {
            toast.error("Выберите JPG, PNG или WebP до 4 МБ");
            return;
          }
          setFile(chosen);
          setRemoveConfirm(false);
        }}
      />
      {removeConfirm && (
        <div className="space-y-3">
          <p className="text-sm">
            Удалить фотографию? Вместо неё будут показаны инициалы.
          </p>
          <div className="toolbar-actions">
            <button
              className="button danger"
              disabled={busy}
              onClick={() => void save(true)}
            >
              Да, удалить фото
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setRemoveConfirm(false)}
            >
              Оставить фото
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
