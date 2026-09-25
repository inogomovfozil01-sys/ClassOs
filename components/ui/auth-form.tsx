"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Sparkles, User, Lock, RefreshCw, School } from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";

export function AuthForm({ setup = false }: { setup?: boolean }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.needsSetup !== setup)
          router.replace(d.needsSetup ? "/setup" : "/login");
        else setReady(true);
      })
      .catch(() => {
        setError("Не удалось подключиться. Проверьте соединение.");
        setReady(true);
      });
  }, [setup, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(setup ? "/api/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Не удалось войти");
      await refreshUser();
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Нет соединения с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-surface-elevated/40 to-background text-foreground relative overflow-hidden">
      {/* Decorative backdrop gradients */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-border-strong shadow-2xl relative z-10 animate-fade-in">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-3">
            <School size={14} />
            <span>Школа №180 · 7-«Б»</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            ClassOS
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            {setup
              ? "Создание аккаунта владельца и первоначальная настройка"
              : "Закрытая цифровая экосистема школьного класса"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Логин в системе
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                required
                minLength={setup ? 3 : undefined}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="напр. firdavs_bahodirov"
                className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-3.5 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                required
                minLength={setup ? 6 : undefined}
                type={visible ? "text" : "password"}
                autoComplete={setup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={setup ? "Не менее 6 символов" : "Ваш пароль"}
                className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-10 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="p-3 rounded-2xl bg-danger/10 border border-danger/25 text-xs text-danger font-medium text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!ready || busy}
            className="w-full py-3 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
          >
            {busy ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Проверка данных...</span>
              </>
            ) : (
              <>
                <span>{setup ? "Создать пространство" : "Войти в систему"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {!setup && (
          <div className="mt-6 pt-5 border-t border-border/50 text-center space-y-3">
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-2xl bg-accent/10 hover:bg-accent/15 border border-accent/25 text-xs font-semibold text-accent transition-colors"
            >
              <Sparkles size={14} />
              <span>Присоединиться по спец-ссылке класса</span>
              <ArrowRight size={13} />
            </Link>

            <p className="text-[11px] text-foreground-muted">
              Ученики могут мгновенно создать аккаунт по имени и фамилии
            </p>
          </div>
        )}

        {setup && (
          <p className="mt-6 text-center text-xs text-foreground-muted">
            Вы получите права Владельца системы автоматически
          </p>
        )}
      </div>

      <footer className="absolute bottom-3 text-center w-full text-[11px] text-foreground-muted pointer-events-none">
        ClassOS · Школа №180
      </footer>
    </div>
  );
}
