"use client";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Search, Command, User } from "lucide-react";
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
        <span className="hidden md:inline">Рабочее пространство / </span>
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
          <kbd>Ctrl K</kbd>
        </button>
        {canAccessJarvis(user?.role) && (
          <button
            className="icon-button"
            onClick={onOpenJarvis}
            aria-label="Открыть JARVIS"
            title="JARVIS"
          >
            <Command size={16} />
          </button>
        )}
        <NotificationCenter />
        <Link href="/profile" className="icon-button" aria-label="Профиль">
          <UserAvatar src={user?.avatarUrl} name={user?.firstName || user?.username || "Профиль"} size={28} />
        </Link>
      </div>
    </header>
  );
}
