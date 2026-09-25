"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  CalendarDays,
  BookOpen,
  MessageSquare,
  Newspaper,
  Menu,
  Settings,
  Users,
  User,
  Plus,
} from "lucide-react";
import { Sheet } from "@/components/ui/workspace";
import { schoolLinks } from "./desktop-sidebar";
import { useAuth } from "@/components/providers/auth-context";
import {
  canManageUsers,
  isLeaderOrHigher,
  canAccessClassFiles,
} from "@/lib/auth/rbac";
import { QuickActionSheet } from "./quick-action-sheet";
export function MobileBottomNav() {
  const path = usePathname();
  const { user } = useAuth();
  const [more, setMore] = useState(false);
  const [quick, setQuick] = useState(false);
  return (
    <>
      <nav className="mobile-nav" aria-label="Основная навигация">
        {[
          { href: "/", label: "Главная", icon: Home },
          { href: "/schedule", label: "Расписание", icon: CalendarDays },
          { href: "/homework", label: "ДЗ", icon: BookOpen },
          { href: "/chats", label: "Чаты", icon: MessageSquare },
        ].map((item) => (
          <Link
            href={item.href}
            key={item.href}
            aria-current={
              path === item.href ||
              (item.href !== "/" && path.startsWith(item.href + "/"))
                ? "page"
                : undefined
            }
          >
            <item.icon size={19} />
            {item.label}
          </Link>
        ))}
        <button onClick={() => setMore(true)} aria-expanded={more}>
          <Menu size={19} />
          Ещё
        </button>
      </nav>
      <Sheet open={more} onOpenChange={setMore} title="Ваш класс">
        <div className="more-links">
          {schoolLinks
            .filter(
              (item) =>
                !["/", "/schedule", "/homework", "/chats"].includes(
                  item.href,
                ) &&
                (item.href !== "/files" || canAccessClassFiles(user?.role)),
            )
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMore(false)}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          <Link href="/profile" onClick={() => setMore(false)}>
            <User size={18} />
            Профиль
          </Link>
          {isLeaderOrHigher(user?.role) && (
            <Link href="/class/manage" onClick={() => setMore(false)}>
              <Settings size={18} />
              Информация класса
            </Link>
          )}
          {canManageUsers(user?.role) && (
            <>
              <Link href="/admin" onClick={() => setMore(false)}>
                <Settings size={18} />
                Управление
              </Link>
              <Link href="/admin/users" onClick={() => setMore(false)}>
                <Users size={18} />
                Пользователи
              </Link>
            </>
          )}
        </div>
        {isLeaderOrHigher(user?.role) && (
          <button
            className="button mt-4 w-full"
            onClick={() => {
              setMore(false);
              setQuick(true);
            }}
          >
            <Plus size={16} />
            Быстрое добавление
          </button>
        )}
      </Sheet>
      <QuickActionSheet isOpen={quick} onClose={() => setQuick(false)} />
    </>
  );
}
