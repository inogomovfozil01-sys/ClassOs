"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { ThemeCardSelector } from "@/components/profile/theme-card-selector";
import { StoriesSection } from "@/components/profile/stories-section";
import { InstallPWAButton } from "@/components/pwa/install-banner";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  getRoleDisplayName,
  canManageUsers,
  isLeaderOrHigher,
  Role,
} from "@/lib/auth/rbac";
import {
  User,
  Shield,
  KeyRound,
  Palette,
  School,
  LogOut,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  Lock,
  Smartphone,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Crown,
  GraduationCap,
  Bell,
  RefreshCw,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();

  // Active tab state
  const [activeTab, setActiveTab] = useState<
    "general" | "appearance" | "security" | "class"
  >("general");

  // Personal Information State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [isNameDirty, setIsNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Security / Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Copy helpers
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Logout modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Synchronize initial user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setMiddleName(user.middleName || "");
    }
  }, [user]);

  // Track if name fields changed
  useEffect(() => {
    if (!user) return;
    const isChanged =
      firstName.trim() !== (user.firstName || "").trim() ||
      lastName.trim() !== (user.lastName || "").trim() ||
      middleName.trim() !== (user.middleName || "").trim();
    setIsNameDirty(isChanged);
  }, [firstName, lastName, middleName, user]);

  // Handle Save Personal Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Имя и фамилия не могут быть пустыми");
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сохранить данные");
      }

      await refreshUser();
      setIsNameDirty(false);
      toast.success("Данные профиля успешно обновлены!");
    } catch (err: any) {
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setSavingName(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Новый пароль должен содержать не менее 6 символов");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: user?.mustChangePassword ? undefined : oldPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось изменить пароль");
      }

      await refreshUser();
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Пароль успешно обновлён!");
    } catch (err: any) {
      toast.error(err.message || "Ошибка смены пароля");
    } finally {
      setSavingPassword(false);
    }
  };

  // Password strength calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-border" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[A-ZА-Я]/.test(pass) && /[a-zа-я]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: "Слабый", color: "bg-danger" };
    if (score <= 3) return { score: 2, label: "Нормальный", color: "bg-amber-500" };
    return { score: 3, label: "Отличный", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  const copyUsername = () => {
    if (!user?.username) return;
    navigator.clipboard.writeText(`@${user.username}`).then(() => {
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
      toast.success("Логин скопирован!");
    });
  };

  const copyInviteLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/join`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
      toast.success("Ссылка для регистрации скопирована!");
    });
  };

  // Role visual icon & styling
  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case "OWNER":
        return {
          icon: Crown,
          bg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          desc: "Полный доступ к управлению пространством и классом",
        };
      case "ADMIN":
        return {
          icon: Shield,
          bg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          desc: "Управление пользователями, ролями и настройками",
        };
      case "LEADER":
        return {
          icon: Sparkles,
          bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          desc: "Редактирование расписания, дежурства и объявления",
        };
      case "TEACHER":
        return {
          icon: GraduationCap,
          bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          desc: "Публикация заданий, таблиц и новостей класса",
        };
      default:
        return {
          icon: User,
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          desc: "Доступ к расписанию, домашним заданиям, дневнику и чатам",
        };
    }
  };

  const roleMeta = getRoleBadge(user?.role);
  const RoleIcon = roleMeta.icon;

  const joinedFormatted = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "сентябрь 2026 г.";

  return (
    <AppShell title="Профиль">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Настройки профиля"
          description="Управление личными данными, внешним видом системы и параметрами безопасности"
        />

        {/* ========================================================
            HERO CARD: BANNER + AVATAR + IDENTITY
            ======================================================== */}
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-border shadow-xl">
          {/* Aesthetic Backdrop Gradient Banner */}
          <div className="h-32 sm:h-36 w-full bg-gradient-to-r from-accent/25 via-purple-600/20 to-sky-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/80 backdrop-blur-md border border-border text-[11px] font-semibold text-foreground-muted">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>В сети</span>
              </span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-5 -mt-16 sm:-mt-14">
            {/* Avatar & Names */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="relative rounded-full ring-4 ring-surface shadow-2xl p-0.5 bg-surface shrink-0">
                <UserAvatar
                  src={user?.avatarUrl}
                  name={`${user?.firstName || ""} ${user?.lastName || ""}`}
                  size={104}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                      "Пользователь"}
                  </h1>

                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${roleMeta.bg}`}
                  >
                    <RoleIcon size={13} />
                    <span>{getRoleDisplayName(user?.role)}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-foreground-muted">
                  {/* Clickable Username */}
                  <button
                    type="button"
                    onClick={copyUsername}
                    title="Нажмите, чтобы скопировать"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-border hover:border-accent text-accent font-mono transition-colors"
                  >
                    <span>@{user?.username}</span>
                    {copiedUsername ? <Check size={12} /> : <Copy size={12} />}
                  </button>

                  <span className="inline-flex items-center gap-1.5">
                    <School size={13} />
                    <span>7-«А» класс · Школа №180</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={13} />
                    <span>С нами {joinedFormatted}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-center">
              <button
                type="button"
                onClick={copyInviteLink}
                className="px-3.5 py-2 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copiedInvite ? (
                  <>
                    <Check size={14} className="text-success" />
                    <span>Ссылка скопирована!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-accent" />
                    <span>Ссылка для класса</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            STORIES / СТОРИСЫ (INSTAGRAM & TELEGRAM STYLE)
            ======================================================== */}
        <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-border shadow-lg">
          <StoriesSection currentUser={user} />
        </div>

        {/* ========================================================
            NAVIGATION TABS (PILL SWITCHER)
            ======================================================== */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface-elevated/50 border border-border overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "general"
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <User size={16} />
            <span>Личные данные</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "appearance"
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <Palette size={16} />
            <span>Оформление</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all relative ${
              activeTab === "security"
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <KeyRound size={16} />
            <span>Безопасность</span>
            {user?.mustChangePassword && (
              <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("class")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "class"
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <School size={16} />
            <span>Класс & Доступ</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: PERSONAL INFORMATION & AVATAR
            ======================================================== */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-fade-in">
            {/* Avatar Section */}
            <div className="glass-panel p-6 rounded-3xl border border-border space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Аватар профиля
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Персональная фотография для отображения в чатах, списках класса и журнале
                </p>
              </div>

              <AvatarEditor />
            </div>

            {/* Profile Fields Form */}
            <form
              onSubmit={handleSaveProfile}
              className="glass-panel p-6 rounded-3xl border border-border space-y-5"
            >
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Основная информация
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Ваши имя и фамилия отображаются в журнале, таблицах и чатах
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Имя <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Имя"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-3.5 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Фамилия <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Фамилия"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-3.5 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Отчество <span className="text-foreground-muted font-normal">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Отчество"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-2xl px-3.5 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Username & Role readonly information */}
              <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Логин в системе:</span>
                    <span className="ml-2 font-mono text-accent">@{user?.username}</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyUsername}
                    className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                  >
                    {copiedUsername ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    <span>{copiedUsername ? "Скопировано" : "Скопировать логин"}</span>
                  </button>
                </div>

                <div className="text-xs text-foreground-muted border-t border-border/50 pt-2.5">
                  <span className="font-semibold text-foreground">Роль: </span>
                  <span>{getRoleDisplayName(user?.role)} — {roleMeta.desc}</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!isNameDirty || savingName}
                  className="px-5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md hover:shadow-lg"
                >
                  {savingName ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Сохранить изменения</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 2: APPEARANCE & THEME & PWA
            ======================================================== */}
        {activeTab === "appearance" && (
          <div className="space-y-6 animate-fade-in">
            {/* Visual Theme Selector */}
            <div className="glass-panel p-6 rounded-3xl border border-border space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Цветовое оформление
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Выберите стиль интерфейса, который лучше всего подходит для вашего экрана
                </p>
              </div>

              <ThemeCardSelector />
            </div>

            {/* PWA & Mobile Installation Card */}
            <div className="glass-panel p-6 rounded-3xl border border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent shrink-0 shadow-inner">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Приложение ClassOS на телефон или ПК
                    </h2>
                    <p className="text-xs text-foreground-muted mt-1 leading-relaxed max-w-xl">
                      Установите ClassOS как нативное приложение: без рамок браузера, с мгновенной загрузкой, поддержкой офлайн-режима и push-уведомлениями.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-auto">
                  <InstallPWAButton />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2.5 text-xs text-foreground-muted">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <span>Работает без интернета</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-foreground-muted">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <span>Мгновенный запуск с экрана</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-foreground-muted">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <span>Полноэкранный режим</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: SECURITY & PASSWORD
            ======================================================== */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-fade-in">
            {/* Warning banner if temporary password is used */}
            {user?.mustChangePassword && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-400">
                    У вас установлен временный пароль
                  </h4>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    Вы вошли с временным паролем <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono font-bold text-amber-300">maktabim180</code>.
                    Пожалуйста, задайте свой личный надёжный пароль ниже.
                  </p>
                </div>
              </div>
            )}

            {/* Password Change Form */}
            <form
              onSubmit={handleChangePassword}
              className="glass-panel p-6 rounded-3xl border border-border space-y-5"
            >
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Смена пароля
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Используйте надежный пароль длиной не менее 6 символов
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                {/* Old password (if not temporary) */}
                {!user?.mustChangePassword && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Текущий пароль <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showOldPass ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        placeholder="Введите текущий пароль"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-10 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                      >
                        {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Новый пароль <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      placeholder="Минимум 6 символов"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-10 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground-muted">Надёжность пароля:</span>
                        <span className="font-semibold text-foreground">
                          {strength.label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden flex gap-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            strength.score >= 1 ? strength.color : "bg-transparent"
                          } flex-1`}
                        />
                        <div
                          className={`h-full rounded-full transition-all ${
                            strength.score >= 2 ? strength.color : "bg-transparent"
                          } flex-1`}
                        />
                        <div
                          className={`h-full rounded-full transition-all ${
                            strength.score >= 3 ? strength.color : "bg-transparent"
                          } flex-1`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Подтверждение пароля <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      placeholder="Повторите новый пароль"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-10 py-2.5 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors text-sm"
                    />
                  </div>

                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-danger mt-1">
                      Пароли не совпадают
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    savingPassword ||
                    !newPassword ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword
                  }
                  className="px-5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md hover:shadow-lg"
                >
                  {savingPassword ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Обновление пароля...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} />
                      <span>Сохранить новый пароль</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Active Session Info */}
            <div className="glass-panel p-6 rounded-3xl border border-border space-y-3">
              <h2 className="text-sm font-bold text-foreground">
                Текущий сеанс
              </h2>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-elevated/40 border border-border text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Браузерная сессия
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      Авторизован через сессионный токен ClassOS
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Активен</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: CLASS & ACCESS & INVITE
            ======================================================== */}
        {activeTab === "class" && (
          <div className="space-y-6 animate-fade-in">
            {/* Class Info Card */}
            <div className="glass-panel p-6 rounded-3xl border border-border space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Информация о классе
                </h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Закрытое пространство для учеников и преподавателей
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border space-y-1">
                  <p className="text-[11px] text-foreground-muted">Класс</p>
                  <p className="text-base font-bold text-foreground">7-«А» класс</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border space-y-1">
                  <p className="text-[11px] text-foreground-muted">Учебное заведение</p>
                  <p className="text-base font-bold text-foreground">Школа №180</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border space-y-1">
                  <p className="text-[11px] text-foreground-muted">Учебный год</p>
                  <p className="text-base font-bold text-foreground">2025–2026</p>
                </div>
              </div>
            </div>

            {/* Quick Invite Link Card */}
            <div className="glass-panel p-6 rounded-3xl border border-accent/20 bg-accent/5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-1">
                    <Sparkles size={13} />
                    <span>Быстрая ссылка для одноклассников</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    Приглашение в экосистему класса
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed max-w-xl">
                    Отправьте эту ссылку однокласснику: он вводит только имя и фамилию, а ИИ создаёт ему логин с временным паролем <code className="text-accent font-mono font-bold">maktabim180</code>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 p-3 rounded-2xl bg-surface border border-border font-mono text-xs text-accent truncate select-all">
                  {typeof window !== "undefined" ? `${window.location.origin}/join` : "https://classos-five.vercel.app/join"}
                </div>

                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="px-4 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
                >
                  {copiedInvite ? (
                    <>
                      <Check size={14} />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Скопировать ссылку</span>
                    </>
                  )}
                </button>

                <Link
                  href="/join"
                  target="_blank"
                  className="px-3.5 py-3 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground-muted hover:text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <ExternalLink size={14} />
                  <span>Открыть</span>
                </Link>
              </div>
            </div>

            {/* Role Permissions Explanation */}
            <div className="glass-panel p-6 rounded-3xl border border-border space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <RoleIcon size={18} className="text-accent" />
                <span>Ваши права в системе ({getRoleDisplayName(user?.role)})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                  <span>Просмотр расписания, звонков и замен</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                  <span>Доступ к общему чату класса и личным сообщениям</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                  <span>Электронный дневник и домашние задания</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                  <span>Список учеников и дежурство по классу</span>
                </div>

                {isLeaderOrHigher(user?.role) && (
                  <>
                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center gap-2.5">
                      <Sparkles size={15} className="shrink-0" />
                      <span>Управление расписанием и графиком дежурств</span>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center gap-2.5">
                      <Sparkles size={15} className="shrink-0" />
                      <span>Публикация объявлений и новостей класса</span>
                    </div>
                  </>
                )}

                {canManageUsers(user?.role) && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 sm:col-span-2 flex items-center gap-2.5">
                    <Shield size={15} className="shrink-0" />
                    <span>Администрирование: управление пользователями, сброс паролей и аудит</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            DANGER ZONE: LOGOUT
            ======================================================== */}
        <div className="p-6 rounded-3xl border border-danger/20 bg-danger/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-danger flex items-center gap-2">
              <LogOut size={16} />
              <span>Выход из учётной записи</span>
            </h3>
            <p className="text-xs text-foreground-muted">
              Завершить текущий сеанс на этом устройстве. Для повторного входа потребуется логин и пароль.
            </p>
          </div>

          {!showLogoutConfirm ? (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2.5 rounded-2xl bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Выйти из аккаунта</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 animate-fade-in shrink-0">
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2.5 rounded-2xl bg-danger hover:bg-danger/90 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Подтвердить выход</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-2.5 rounded-2xl bg-surface hover:bg-surface-elevated text-foreground-muted hover:text-foreground text-xs font-medium transition-colors"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
