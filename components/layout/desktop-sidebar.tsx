"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Clock,
  CalendarDays,
  BookOpen,
  MessageSquare,
  Newspaper,
  FolderOpen,
  Table2,
  Users,
  History,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  CheckSquare,
  Command,
  LogOut,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import {
  canManageUsers,
  isLeaderOrHigher,
  getRoleDisplayName,
} from "@/lib/auth/rbac";

export const schoolLinks = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/homework", label: "Домашние задания", icon: BookOpen },
  { href: "/subjects", label: "Предметы", icon: GraduationCap },
  { href: "/news", label: "Новости", icon: Newspaper },
  { href: "/events", label: "События", icon: CalendarDays },
  { href: "/files", label: "Файлы", icon: FolderOpen },
  { href: "/chats", label: "Чаты", icon: MessageSquare },
  { href: "/tables", label: "Таблицы", icon: Table2 },
  { href: "/members", label: "Наш класс", icon: Users },
  { href: "/today", label: "Сегодня", icon: Clock },
  { href: "/tests", label: "Контрольные", icon: CheckSquare },
  { href: "/duty", label: "Дежурства", icon: Users },
  { href: "/emaktab", label: "Забыл пароль", icon: CheckSquare },
  { href: "/ai", label: "Учебный помощник", icon: Command },
];
export function DesktopSidebar() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  if (!user) return null;
  const adminLinks = canManageUsers(user.role)
    ? [
        { href: "/admin", label: "Админ-панель", icon: LayoutGrid },
        { href: "/admin/users", label: "Пользователи", icon: Users },
        { href: "/admin/roles", label: "Роли", icon: Users },
        { href: "/admin/audit", label: "История", icon: History },
        { href: "/admin/settings", label: "Настройки", icon: Settings },
      ]
    : [];
  const link = (item: (typeof schoolLinks)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      aria-current={path === item.href ? "page" : undefined}
      className={`sidebar-link ${path === item.href || (item.href !== "/" && path.startsWith(item.href + "/")) ? "active" : ""}`}
    >
      <item.icon size={17} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      <Link href="/" className="sidebar-brand">
        <div className="brand-mark">C/</div>
        {!collapsed && (
          <div>
            <strong>ClassOS</strong>
            <small>Рабочее пространство класса</small>
          </div>
        )}
      </Link>
      <nav className="sidebar-navigation" aria-label="Разделы ClassOS">
        {schoolLinks.map((item, i) => (
          <div key={item.href}>
            {!collapsed && (i === 1 || i === 4 || i === 10) && (
              <div className="sidebar-group">
                {i === 1 ? "Учёба" : i === 4 ? "Класс" : "Дополнительно"}
              </div>
            )}
            {link(item)}
          </div>
        ))}
        {isLeaderOrHigher(user.role) &&
          link({
            href: "/class/manage",
            label: "Информация класса",
            icon: Settings,
          })}
        {adminLinks.length > 0 && (
          <>
            {!collapsed && (
              <div className="sidebar-group">Администрирование</div>
            )}
            {adminLinks.map(link)}
          </>
        )}
      </nav>
      <div className="sidebar-profile">
        <Link href="/profile" aria-label="Профиль" className="brand-mark">
          {(user.firstName || user.username).slice(0, 1).toUpperCase()}
        </Link>
        {!collapsed && (
          <Link href="/profile" className="min-w-0 flex-1">
            <span>
              {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                user.username}
            </span>
            <small>{getRoleDisplayName(user.role)}</small>
          </Link>
        )}
        <button
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-toggle icon-button"
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
      </div>
      {!collapsed && (
        <button onClick={logout} className="sidebar-link mt-2">
          <LogOut size={15} />
          Выйти
        </button>
      )}
    </aside>
  );
}
