"use client";
import { useEffect, useState } from "react";
import { LockKeyhole, Save, Eye, EyeOff } from "lucide-react";
import { encryptNote, decryptNote } from "@/lib/private-note";
import { toast } from "sonner";

export function PrivateNote({
  userId,
  delivery,
  onStored,
}: {
  userId: string;
  delivery: { password: string; login: string } | null;
  onStored: () => void;
}) {
  const storageKey = "classos.private-emaktab.v1." + userId;
  const [exists, setExists] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [repeatCode, setRepeatCode] = useState("");
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  function lock() {
    setUnlocked(false);
    setCode("");
    setRepeatCode("");
    setText("");
    setVisible(false);
  }
  useEffect(() => {
    lock();
    try {
      setExists(Boolean(localStorage.getItem(storageKey)));
    } catch {
      setStorageError(true);
    }
    const hide = () => {
      if (document.visibilityState === "hidden") lock();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [storageKey]);
  async function unlock() {
    setBusy(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setText(await decryptNote(saved, code, userId));
      else {
        if (code.length < 8 || code !== repeatCode) throw Error("new-code");
        // Persist the empty vault immediately so an interrupted editing session is recoverable.
        localStorage.setItem(storageKey, await encryptNote("", code, userId));
        setText("");
        setExists(true);
      }
      setUnlocked(true);
      setRepeatCode("");
    } catch (error: any) {
      toast.error(
        error?.message === "new-code"
          ? "Нужен код от 8 символов и совпадающее повторение."
          : "Не удалось открыть заметку. Проверьте код и доступ к хранилищу браузера.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(nextText = text, includeDelivery = false) {
    setBusy(true);
    try {
      localStorage.setItem(
        storageKey,
        await encryptNote(nextText, code, userId),
      );
      setText(nextText);
      setExists(true);
      if (includeDelivery) onStored();
      toast.success("Заметка сохранена на этом устройстве");
    } catch {
      toast.error(
        "Не удалось сохранить заметку. Проверьте настройки браузера.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="emaktab-personal space-y-4">
      <h2 className="flex gap-2 items-center">
        <LockKeyhole size={20} />
        Моя личная заметка
      </h2>
      <p>
        Сохраните здесь свой логин, пароль или подсказку. Заметка хранится в
        зашифрованном виде только в этом браузере. Учитель и другие пользователи
        её не видят.
      </p>
      <p>
        Для открытия нужен отдельный код от 8 символов. Если забыть код или
        очистить данные браузера, восстановить заметку не получится. На другом
        устройстве она не появится.
      </p>
      {storageError ? (
        <p role="alert" className="inline-error">
          Хранилище браузера недоступно. Сохранение заметок отключено.
        </p>
      ) : !unlocked ? (
        <form
          className="space-y-3 max-w-lg"
          onSubmit={(e) => {
            e.preventDefault();
            void unlock();
          }}
        >
          <label className="block space-y-2">
            <span>
              {exists ? "Код для заметки" : "Придумайте код для заметки"}
            </span>
            <input
              className="control w-full"
              aria-label="Код для заметки"
              type="password"
              autoComplete="off"
              minLength={8}
              maxLength={128}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {!exists && (
            <label className="block space-y-2">
              <span>Повторите код</span>
              <input
                className="control w-full"
                type="password"
                autoComplete="off"
                required
                value={repeatCode}
                onChange={(e) => setRepeatCode(e.target.value)}
              />
            </label>
          )}
          <button className="button" disabled={busy}>
            {exists ? "Открыть заметку" : "Создать личную заметку"}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className="button" onClick={() => setVisible(!visible)}>
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}{" "}
              {visible ? "Скрыть содержимое" : "Показать и изменить"}
            </button>
            <button className="button" onClick={lock}>
              Закрыть заметку
            </button>
          </div>
          {visible && (
            <label className="block space-y-2">
              <span>Содержимое заметки</span>
            <textarea
              aria-label="Содержимое заметки"
                className="control w-full min-h-40"
                maxLength={8000}
                autoComplete="off"
                spellCheck={false}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
          )}
          {visible && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void save()}
            >
              <Save size={16} />
              Сохранить заметку
            </button>
          )}
          {delivery && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <p>
                Новый пароль получен от учителя. Можно добавить его в личную
                заметку.
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void save(
                    `${text}\n\nПолучено от учителя: ${new Date().toLocaleDateString("ru-RU")}\nЛогин: ${delivery.login || "не указан"}\nВременный пароль: ${delivery.password}\nПосле входа смените временный пароль.`,
                    true,
                  )
                }
              >
                Сохранить полученный пароль в заметку
              </button>
            </div>
          )}
        </div>
      )}
      {exists && (
        <div className="pt-2">
          {!deleteConfirm ? (
            <button className="button" onClick={() => setDeleteConfirm(true)}>
              Удалить заметку с устройства
            </button>
          ) : (
            <div className="space-y-2">
              <p>Заметка будет удалена без возможности восстановления.</p>
              <div className="flex gap-2">
                <button
                  className="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(storageKey);
                      lock();
                      setExists(false);
                      setDeleteConfirm(false);
                      toast.success("Заметка удалена");
                    } catch {
                      toast.error("Не удалось удалить заметку");
                    }
                  }}
                >
                  Удалить безвозвратно
                </button>
                <button
                  className="button"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
