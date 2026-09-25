"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  CheckCircle2,
  Lock,
  User,
  ShieldCheck,
  RefreshCw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-context";

export default function JoinPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [aiUsername, setAiUsername] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [customUsername, setCustomUsername] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Result state after account created
  const [createdData, setCreatedData] = useState<{
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    tempPassword: string;
  } | null>(null);

  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Debounced AI username suggestion
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!firstName.trim() && !lastName.trim()) {
      setAiUsername("");
      setSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setLoadingAi(true);
      try {
        const res = await fetch(
          `/api/auth/suggest-username?firstName=${encodeURIComponent(firstName.trim())}&lastName=${encodeURIComponent(lastName.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.username) {
            setAiUsername(data.username);
            setSuggestions(data.suggestions || []);
            if (!isEditingUsername) {
              setCustomUsername(data.username);
            }
          }
        }
      } catch {
        // Fallback handled gracefully
      } finally {
        setLoadingAi(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [firstName, lastName, isEditingUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Пожалуйста, укажите имя и фамилию");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/quick-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          chosenUsername: customUsername.trim() || aiUsername || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось создать аккаунт");
      }

      setCreatedData({
        user: data.user,
        tempPassword: data.tempPassword || "maktabim180",
      });
      toast.success("Аккаунт успешно создан!");
    } catch (err: any) {
      setError(err.message || "Ошибка соединения");
      toast.error(err.message || "Не удалось создать аккаунт");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnterAccount = async () => {
    try {
      await refreshUser();
      toast.success("Добро пожаловать в ClassOS!");
      window.location.href = "/";
    } catch {
      window.location.href = "/login";
    }
  };

  const copyToClipboard = (text: string, type: "login" | "pass" | "all") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "login") {
        setCopiedLogin(true);
        setTimeout(() => setCopiedLogin(false), 2000);
        toast.success("Логин скопирован!");
      } else if (type === "pass") {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
        toast.success("Пароль скопирован!");
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
        toast.success("Все данные скопированы в буфер обмена!");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-surface-elevated/40 to-background text-foreground relative overflow-hidden">
      {/* Decorative backdrop gradients */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-border-strong shadow-2xl relative z-10 animate-fade-in">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-3">
            <Sparkles size={14} className="animate-pulse" />
            <span>Приглашение в класс</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            ClassOS
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Быстрое создание аккаунта ученика
          </p>
        </div>

        {user && !createdData && (
          <div className="mb-5 p-3.5 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-between text-xs animate-fade-in">
            <div className="min-w-0 pr-2">
              <p className="font-semibold text-accent">Вы уже авторизованы</p>
              <p className="text-[11px] text-foreground-muted truncate">
                {[user.firstName, user.lastName].filter(Boolean).join(" ")} (@{user.username})
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 px-3 py-1.5 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-colors shadow-sm"
            >
              В кабинет →
            </Link>
          </div>
        )}

        {!createdData ? (
          /* ========================================================
             STEP 1: ENTER NAME & SURNAME (AI PICKS USERNAME)
             ======================================================== */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Ваше имя
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="напр. Фирдавс"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Ваша фамилия
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="напр. Баходиров"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* AI Username Preview Box */}
            {(firstName.trim() || lastName.trim()) && (
              <div className="p-3.5 rounded-2xl bg-accent/5 border border-accent/20 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-accent flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>Логин от ИИ:</span>
                  </span>
                  {loadingAi ? (
                    <span className="text-[11px] text-foreground-muted flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" />
                      подбираем...
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingUsername(!isEditingUsername)}
                      className="text-[11px] text-accent hover:underline font-medium"
                    >
                      {isEditingUsername ? "Оставить как есть" : "Изменить вручную"}
                    </button>
                  )}
                </div>

                {isEditingUsername ? (
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value.toLowerCase())}
                    className="w-full bg-surface border border-accent/40 rounded-xl px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none"
                    placeholder="свой логин"
                  />
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface/80 border border-border text-xs font-mono font-bold text-foreground">
                    <span>{customUsername || aiUsername || "генерация..."}</span>
                    <span className="text-[10px] font-sans font-normal text-success">
                      ✓ уникальный
                    </span>
                  </div>
                )}

                {/* Suggestions pill list */}
                {suggestions.length > 0 && !isEditingUsername && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-foreground-muted">
                      Варианты:
                    </span>
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setCustomUsername(sug);
                          setAiUsername(sug);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-colors ${
                          customUsername === sug
                            ? "bg-accent text-white border-accent"
                            : "bg-surface-elevated hover:bg-surface-hover border-border text-foreground-muted"
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Password notice */}
            <div className="p-3 rounded-2xl bg-surface-elevated/70 border border-border flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-surface-hover flex items-center justify-center text-foreground-muted shrink-0">
                <Lock size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground">
                  Временный пароль:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-accent">
                    maktabim180
                  </code>
                </p>
                <p className="text-[10px] text-foreground-muted">
                  Вы сможете изменить его в любое время в профиле
                </p>
              </div>
            </div>

            {error && (
              <p className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger font-medium text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !firstName.trim() || !lastName.trim()}
              className="w-full py-3 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Создание аккаунта...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Создать аккаунт</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-foreground-muted hover:text-accent transition-colors"
              >
                Уже есть аккаунт? Войти
              </Link>
            </div>
          </form>
        ) : (
          /* ========================================================
             STEP 2: SUCCESS CREDENTIALS CARD & ENTER ACCOUNT
             ======================================================== */
          <div className="space-y-5 animate-fade-in text-xs sm:text-sm">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-3xl bg-success/15 border border-success/30 text-success flex items-center justify-center mx-auto mb-2 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Поздравляем! Аккаунт готов 🎉
              </h2>
              <p className="text-xs text-foreground-muted">
                Сохраните ваши данные для входа в ClassOS:
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-3.5 shadow-sm">
              <div>
                <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block mb-1">
                  Ученик
                </span>
                <p className="text-sm font-bold text-foreground">
                  {createdData.user.lastName} {createdData.user.firstName}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block mb-1">
                  Ваш логин
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border font-mono text-xs">
                  <span className="font-bold text-foreground">
                    {createdData.user.username}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(createdData.user.username, "login")
                    }
                    className="p-1 rounded-lg hover:bg-surface-elevated text-accent transition-colors"
                    title="Скопировать логин"
                  >
                    {copiedLogin ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider block mb-1">
                  Временный пароль
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border font-mono text-xs">
                  <span className="font-bold text-foreground">
                    {createdData.tempPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(createdData.tempPassword, "pass")
                    }
                    className="p-1 rounded-lg hover:bg-surface-elevated text-accent transition-colors"
                    title="Скопировать пароль"
                  >
                    {copiedPass ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Copy All Data */}
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `ClassOS\nУченик: ${createdData.user.lastName} ${createdData.user.firstName}\nЛогин: ${createdData.user.username}\nПароль: ${createdData.tempPassword}\nСайт: https://classos-five.vercel.app`,
                  "all",
                )
              }
              className="w-full py-2 px-3 rounded-xl border border-dashed border-border bg-surface-elevated/40 hover:bg-surface-elevated text-foreground-muted hover:text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedAll ? <Check size={14} /> : <Copy size={14} />}
              <span>
                {copiedAll ? "Данные скопированы!" : "Скопировать всё в буфер"}
              </span>
            </button>

            {/* Enter Account Button */}
            <button
              type="button"
              onClick={handleEnterAccount}
              className="w-full py-3.5 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
            >
              <span>Войти в аккаунт</span>
              <ArrowRight size={17} />
            </button>

            <p className="text-[11px] text-center text-foreground-muted">
              Вы автоматически подключены к чату класса и таблице учеников.
            </p>
          </div>
        )}
      </div>

      <footer className="absolute bottom-3 text-center w-full text-[11px] text-foreground-muted pointer-events-none">
        ClassOS · Школа №180
      </footer>
    </div>
  );
}
