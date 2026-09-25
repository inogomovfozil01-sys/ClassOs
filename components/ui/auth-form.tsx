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
    <main className="sign-in-page">
      <aside className="sign-in-brand"><Link href="/login" className="auth-brand"><span className="brand-mark">C/</span>ClassOS</Link><div className="sign-in-intro"><p className="profile-eyebrow">ПРОСТРАНСТВО ВАШЕГО КЛАССА</p><h1>Всё школьное.<br />В одном месте.</h1><p>Расписание, задания, общение и общие воспоминания. Только ваш класс — ничего лишнего.</p><div className="sign-in-features"><span><School size={18} />Ваш класс</span><span><Lock size={18} />Закрытое пространство</span></div></div><p className="sign-in-footer">ClassOS · Школа №180</p></aside>
      <section className="sign-in-content"><div className="sign-in-form"><p className="profile-eyebrow">CLASSOS / {setup ? "НАСТРОЙКА" : "ВХОД"}</p><h2>{setup ? "Создайте пространство" : "С возвращением"}</h2><p>{setup ? "Настройте первый аккаунт владельца класса." : "Войдите в свой аккаунт, чтобы продолжить."}</p>
        <form onSubmit={submit} className="form-stack">
          <label className="field" htmlFor="login-username">Логин<input id="login-username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required autoCapitalize="none" spellCheck={false} placeholder="Ваш логин" disabled={busy} /></label>
          <label className="field" htmlFor="login-password">Пароль<div className="password-field"><input id="login-password" type={visible ? "text" : "password"} autoComplete={setup ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Введите пароль" disabled={busy} /><button type="button" className="icon-button" aria-label={visible ? "Скрыть пароль" : "Показать пароль"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {error && <p role="alert" className="inline-error">{error}</p>}
          <button type="submit" className="button primary" disabled={!ready || busy}>{busy ? <><RefreshCw size={16} className="animate-spin" />Проверка данных…</> : <>{setup ? "Создать пространство" : "Войти"}<ArrowRight size={16} /></>}</button>
        </form>
        {!setup && <div className="sign-in-join"><span>Первый раз здесь?</span><Link href="/join">Присоединиться к классу <ArrowRight size={14} /></Link></div>}
        <p className="sign-in-help">{setup ? "Этот аккаунт получит права владельца." : "Если не получается войти, обратитесь к администратору класса."}</p>
      </div></section>
    </main>
  );
}
