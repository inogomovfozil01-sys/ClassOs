"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
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
        body: JSON.stringify({ username, password }),
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
    <div className="auth-page">
      <div className="auth-brand">
        <span className="brand-mark">C/</span>ClassOS
      </div>
      <div className="auth-form">
        <h1>{setup ? "Настройка пространства" : "Вход в систему"}</h1>
        <p>
          {setup
            ? "Создайте аккаунт владельца. После этого вы сможете пригласить свой класс."
            : "Всё для вашего класса — в одном месте."}
        </p>
        <form onSubmit={submit} className="form-stack">
          <label className="field">
            Логин
            <input
              required
              minLength={setup ? 3 : undefined}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ваш логин"
            />
          </label>
          <label className="field">
            Пароль
            <div className="password-field">
              <input
                required
                minLength={setup ? 6 : undefined}
                type={visible ? "text" : "password"}
                autoComplete={setup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={setup ? "Не менее 6 символов" : "Ваш пароль"}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={!ready || busy}>
            {busy ? "Подождите…" : setup ? "Создать пространство" : "Войти"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-footer mt-6">
          {setup
            ? "Вы получите роль владельца автоматически."
            : "Аккаунт выдаёт администратор вашего класса."}
        </p>
      </div>
      <footer className="auth-footer">ClassOS · Пространство для учёбы</footer>
    </div>
  );
}
