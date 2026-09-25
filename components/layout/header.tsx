"use client";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Search, Sparkles, User } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useAuth } from "@/components/providers/auth-context";
import { canAccessJarvis } from "@/lib/auth/rbac";

export function Header({
  title,
  onOpenCommandPalette,
  onOpenJarvis,
}: {
  title?: string;
  onOpenCommandPalette: () => void;
  onOpenJarvis?: () => void;
}) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="topbar-breadcrumb">ClassOS<span aria-hidden="true"> / </span></span>
        {title || "ClassOS"}
      </div>
      <div className="topbar-actions">
        <button
          className="search-trigger"
          onClick={onOpenCommandPalette}
          aria-label="Поиск и команды"
        >
          <Search size={16} />
          <span>Поиск</span>
          <kbd><span className="shortcut-apple">⌘ K</span><span className="shortcut-other">Ctrl K</span></kbd>
        </button>

        {/* Universal AI Assistant Button */}
        {canAccessJarvis(user?.role) ? (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs font-semibold transition-all shadow-xs active:scale-95"
            onClick={onOpenJarvis}
            aria-label="Открыть JARVIS"
            title="JARVIS AI — Системный ассистент"
          >
            <Sparkles size={14} className="animate-pulse text-accent" />
            <span className="hidden sm:inline">JARVIS</span>
          </button>
        ) : (
          <Link
            href="/ai"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs font-semibold transition-all shadow-xs active:scale-95"
            aria-label="Class AI — Учебный помощник"
            title="Class AI — Умный школьный помощник"
          >
            <Sparkles size={14} className="animate-pulse text-accent" />
            <span className="hidden sm:inline">Class AI</span>
          </Link>
        )}

        <NotificationCenter />
        <Link href="/profile" className="icon-button" aria-label="Профиль">
          <UserAvatar src={user?.avatarUrl} name={user?.firstName || user?.username || "Профиль"} size={28} />
        </Link>
      </div>
    </header>
  );
}
