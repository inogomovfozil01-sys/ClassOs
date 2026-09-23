"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Table2,
  History,
  Database,
  Settings,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import { canManageUsers } from "@/lib/auth/rbac";
import { request } from "@/components/tables/model";
export default function AdminPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<{
    users: number;
    tables: number;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (canManageUsers(user?.role))
      Promise.all([request("/api/users"), request("/api/tables")])
        .then(([u, t]) =>
          setCounts({ users: u.users.length, tables: t.tables.length }),
        )
        .catch((e) => setError(e.message));
  }, [user?.role]);
  return (
    <AppShell title="Управление">
      <PageHeader
        title="Управление классом"
        description="Аккаунты, учебные данные и история изменений."
      />
      {!canManageUsers(user?.role) ? (
        <p className="text-foreground-muted">
          Этот раздел доступен администраторам.
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          {counts && (
            <p className="text-sm text-foreground-muted mb-6">
              {counts.users} пользователей · {counts.tables} ведомостей
            </p>
          )}
          <div className="table-list">
            {[
              {
                href: "/admin/users",
                title: "Пользователи",
                description: "Аккаунты, роли, временные пароли и доступ",
                icon: Users,
              },
              {
                href: "/admin/roles",
                title: "Роли и права",
                description:
                  "Возможности ученика, учителя, лидера и администратора",
                icon: Users,
              },
              {
                href: "/tables",
                title: "Таблицы и ведомости",
                description: "Посещаемость, оценки и записи класса",
                icon: Table2,
              },
              {
                href: "/admin/audit",
                title: "История действий",
                description: "Изменения и события системы",
                icon: History,
              },
              {
                href: "/admin/backup",
                title: "Резервное копирование",
                description: "Выгрузка данных класса",
                icon: Database,
              },
              {
                href: "/admin/settings",
                title: "Настройки",
                description: "Оформление и установка приложения",
                icon: Settings,
              },
            ].map((i) => (
              <Link className="table-list-row" href={i.href} key={i.href}>
                <i.icon size={18} />
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.description}</p>
                </div>
                <span />
                <span />
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
