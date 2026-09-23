"use client";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, EmptyState } from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import * as rights from "@/lib/auth/rbac";
const roles: rights.Role[] = ["STUDENT", "TEACHER", "LEADER", "ADMIN", "OWNER"];
const permissions = [
  ["Расписание, учителя и кабинеты", rights.canEditSchedule],
  ["Публикация домашних заданий", rights.canPublishHomework],
  ["Новости и события", rights.canPublishNews],
  ["Таблицы класса", rights.canManageTables],
  ["Дежурства", rights.canManageDuty],
  ["Создание аккаунтов и назначение ролей", rights.canManageUsers],
  ["Помощник лидера", rights.canAccessLeaderAI],
  ["Полный JARVIS", rights.canAccessJarvis],
] as const;
export default function RolesPage() {
  const { user } = useAuth();
  return (
    <AppShell title="Роли">
      <PageHeader
        title="Роли и права"
        description="Кто может читать и изменять информацию класса."
        actions={
          rights.canManageUsers(user?.role) && (
            <Link className="button" href="/admin/users">
              Назначить роль пользователю
            </Link>
          )
        }
      />
      {!rights.canManageUsers(user?.role) ? (
        <EmptyState title="Раздел доступен администратору" />
      ) : (
        <>
          <p className="text-sm text-foreground-muted mb-6">
            Все участники видят учебную информацию и могут отмечать выполнение
            своего ДЗ. Права редактирования определяются ролью.
          </p>
          <div className="md:hidden divide-y divide-border">
            {roles.map((role) => (
              <section key={role} className="py-4">
                <h2 className="font-semibold text-sm mb-3">
                  {rights.getRoleDisplayName(role)}
                </h2>
                <ul className="space-y-2 text-xs text-foreground-muted">
                  {permissions
                    .filter(([, check]) => check(role))
                    .map(([name]) => (
                      <li key={name} className="flex items-center gap-2">
                        <Check size={14} className="text-accent shrink-0" />
                        {name}
                      </li>
                    ))}
                  {role === "STUDENT" && (
                    <li>
                      Просмотр учебной информации и личные отметки о выполнении
                      ДЗ.
                    </li>
                  )}
                </ul>
              </section>
            ))}
          </div>
          <div className="hidden md:block relative overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-xs">
              <caption className="sr-only">Права ролей ClassOS</caption>
              <thead>
                <tr>
                  <th className="p-4 text-left min-w-[210px]">Действие</th>
                  {roles.map((r) => (
                    <th className="p-4 min-w-[100px]" key={r}>
                      {rights.getRoleDisplayName(r)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map(([name, check]) => (
                  <tr key={name} className="border-t border-border">
                    <th scope="row" className="p-4 text-left font-normal">
                      {name}
                    </th>
                    {roles.map((r) => (
                      <td className="p-4 text-center" key={r}>
                        <span className="sr-only">
                          {check(r) ? "Разрешено" : "Недоступно"}
                        </span>
                        {check(r) ? (
                          <Check
                            size={16}
                            className="mx-auto text-accent"
                            aria-hidden
                          />
                        ) : (
                          <Minus
                            size={14}
                            className="mx-auto text-foreground-muted"
                            aria-hidden
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-foreground-muted mt-4">
            Эта таблица отражает действующие права системы. Изменить роль
            участника можно в разделе «Пользователи».
          </p>
        </>
      )}
    </AppShell>
  );
}
