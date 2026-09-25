"use client";
import { useEffect, useState } from "react";
import { LockKeyhole, Save, Eye, EyeOff, Copy } from "lucide-react";
import { encryptNote, decryptNote } from "@/lib/private-note";
import { toast } from "sonner";

interface StoredNoteData {
  login: string;
  password: string;
  notes: string;
}

function parseNote(raw: string): StoredNoteData {
  if (!raw) return { login: "", password: "", notes: "" };
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      return {
        login: typeof obj.login === "string" ? obj.login : "",
        password: typeof obj.password === "string" ? obj.password : "",
        notes: typeof obj.notes === "string" ? obj.notes : "",
      };
    }
  } catch {
    // If it was stored in the legacy plain-text format
    return { login: "", password: "", notes: raw };
  }
  return { login: "", password: "", notes: raw };
}

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

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function lock() {
    setUnlocked(false);
    setCode("");
    setRepeatCode("");
    setLogin("");
    setPassword("");
    setNotes("");
    setShowPassword(false);
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

  async function copyToClipboard(val: string, fieldName: string) {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      toast.success(`Скопировано: ${fieldName}`);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  async function createNote() {
    if (code.length < 4 || code !== repeatCode) {
      toast.error("Нужен код защиты от 4 символов и совпадающее повторение.");
      return;
    }
    setBusy(true);
    try {
      const payload = JSON.stringify({ login, password, notes });
      localStorage.setItem(storageKey, await encryptNote(payload, code, userId));
      setExists(true);
      setUnlocked(true);
      setRepeatCode("");
      toast.success("Данные успешно сохранены на этом устройстве");
    } catch {
      toast.error("Не удалось создать заметку. Проверьте доступ к хранилищу браузера.");
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    setBusy(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        throw new Error("not-found");
      }
      const decrypted = await decryptNote(saved, code, userId);
      const parsed = parseNote(decrypted);
      setLogin(parsed.login);
      setPassword(parsed.password);
      setNotes(parsed.notes);
      setUnlocked(true);
      setRepeatCode("");
    } catch (error: any) {
      toast.error(
        "Не удалось открыть заметку. Проверьте код и доступ к хранилищу браузера.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(
    nextLogin = login,
    nextPassword = password,
    nextNotes = notes,
    includeDelivery = false,
  ) {
    setBusy(true);
    try {
      const payload = JSON.stringify({
        login: nextLogin,
        password: nextPassword,
        notes: nextNotes,
      });
      localStorage.setItem(
        storageKey,
        await encryptNote(payload, code, userId),
      );
      setLogin(nextLogin);
      setPassword(nextPassword);
      setNotes(nextNotes);
      setExists(true);
      if (includeDelivery) onStored();
      toast.success("Данные сохранены на этом устройстве");
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
        Для открытия нужен отдельный код от 4 символов. Если забыть код или
        очистить данные браузера, восстановить заметку не получится. На другом
        устройстве она не появится.
      </p>

      {storageError ? (
        <p role="alert" className="inline-error">
          Хранилище браузера недоступно. Сохранение заметок отключено.
        </p>
      ) : !unlocked ? (
        !exists ? (
          <form
            className="space-y-4 max-w-lg"
            onSubmit={(e) => {
              e.preventDefault();
              void createNote();
            }}
          >
            <div className="p-4 rounded-xl border border-border bg-surface/50 space-y-3">
              <p className="font-medium text-foreground">
                Впишите свои данные, чтобы не забыть:
              </p>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Логин eMaktab</span>
                <input
                  className="control w-full"
                  type="text"
                  placeholder="Введите логин от eMaktab"
                  autoComplete="off"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Пароль eMaktab</span>
                <div className="relative flex items-center">
                  <input
                    className="control w-full pr-10"
                    type={showPassword ? "text" : "password"}
                    placeholder="Введите пароль от eMaktab"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 text-foreground-muted hover:text-foreground p-1 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Подсказка или заметка (по желанию)</span>
                <textarea
                  className="control w-full min-h-20"
                  placeholder="Подсказка к паролю, секретный вопрос или комментарий..."
                  autoComplete="off"
                  spellCheck={false}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-foreground-muted">
                Придумайте код для защиты этой заметки (от 4 символов):
              </p>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Код для заметки</span>
                <input
                  className="control w-full"
                  type="password"
                  autoComplete="off"
                  minLength={4}
                  maxLength={128}
                  required
                  placeholder="Придумайте код (минимум 4 символа)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Повторите код</span>
                <input
                  className="control w-full"
                  type="password"
                  autoComplete="off"
                  required
                  placeholder="Повторите придуманный код"
                  value={repeatCode}
                  onChange={(e) => setRepeatCode(e.target.value)}
                />
              </label>
            </div>

            <button className="button primary" disabled={busy}>
              <Save size={16} />
              Сохранить личную заметку
            </button>
          </form>
        ) : (
          <form
            className="space-y-3 max-w-lg"
            onSubmit={(e) => {
              e.preventDefault();
              void unlock();
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Код для заметки</span>
              <input
                className="control w-full"
                aria-label="Код для заметки"
                type="password"
                autoComplete="off"
                minLength={4}
                maxLength={128}
                required
                placeholder="Введите ваш код для открытия заметки"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={busy}>
              Открыть заметку
            </button>
          </form>
        )
      ) : (
        <div className="space-y-4 max-w-lg">
          <p className="font-medium text-foreground">
            Впишите свои данные, чтобы не забыть:
          </p>
          <div className="p-4 rounded-xl border border-border bg-surface/50 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Логин eMaktab</span>
              <div className="flex gap-2">
                <input
                  className="control flex-1 min-w-0"
                  type="text"
                  placeholder="Логин eMaktab"
                  autoComplete="off"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
                {login && (
                  <button
                    type="button"
                    className="button shrink-0"
                    onClick={() => void copyToClipboard(login, "Логин")}
                    title="Скопировать логин"
                  >
                    <Copy size={16} />
                    Скопировать
                  </button>
                )}
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Пароль eMaktab</span>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0 flex items-center">
                  <input
                    className="control w-full pr-10"
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль eMaktab"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 text-foreground-muted hover:text-foreground p-1 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <button
                    type="button"
                    className="button shrink-0"
                    onClick={() => void copyToClipboard(password, "Пароль")}
                    title="Скопировать пароль"
                  >
                    <Copy size={16} />
                    Скопировать
                  </button>
                )}
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Подсказка или заметка</span>
              <textarea
                className="control w-full min-h-24"
                maxLength={8000}
                autoComplete="off"
                spellCheck={false}
                placeholder="Подсказка к паролю, секретный вопрос или комментарий..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => void save(login, password, notes)}
            >
              <Save size={16} />
              Сохранить изменения
            </button>
            <button type="button" className="button" onClick={lock}>
              Закрыть заметку
            </button>
          </div>

          {delivery && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <p>
                Новый пароль получен от учителя. Нажмите кнопку, чтобы обновить логин и пароль в заметке.
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => {
                  const nextLogin = delivery.login || login;
                  const nextPassword = delivery.password;
                  const noteAddition = `\n\nПолучено от учителя: ${new Date().toLocaleDateString("ru-RU")}\nВременный пароль: ${delivery.password}`;
                  const nextNotes = notes ? notes + noteAddition : noteAddition.trim();
                  setLogin(nextLogin);
                  setPassword(nextPassword);
                  setNotes(nextNotes);
                  void save(nextLogin, nextPassword, nextNotes, true);
                }}
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
