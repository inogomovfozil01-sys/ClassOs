"use client";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/workspace";
import { ThemeSelect } from "@/components/providers/app-providers";
import { useAuth } from "@/components/providers/auth-context";
import { canManageUsers, getRoleDisplayName } from "@/lib/auth/rbac";
import { InstallPWAButton } from "@/components/pwa/install-banner";
import { request, json } from "@/components/tables/model";
export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [busy, setBusy] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  async function password(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request(
        "/api/auth/change-password",
        json("POST", { oldPassword, newPassword }),
      );
      await refreshUser();
      setOld("");
      setNew("");
      toast.success("Пароль обновлён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }
  async function name(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request(
        `/api/users/${user?.id}`,
        json("PATCH", { firstName: first, lastName: last }),
      );
      await refreshUser();
      toast.success("Имя сохранено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell title="Профиль">
      <PageHeader
        title="Профиль и настройки"
        description={
          user
            ? `${user.username} · ${getRoleDisplayName(user.role)}`
            : undefined
        }
      />
      <div className="max-w-lg space-y-8">
        <section className="space-y-5">
          <h2 className="text-sm font-semibold">Оформление</h2>
          <ThemeSelect />
          <InstallPWAButton />
        </section>
        {user && canManageUsers(user.role) && (
          <form onSubmit={name} className="form-stack">
            <h2 className="text-sm font-semibold">Личные данные</h2>
            <label className="field">
              Имя
              <input
                required
                placeholder={user.firstName || "Ваше имя"}
                value={first}
                onChange={(e) => setFirst(e.target.value)}
              />
            </label>
            <label className="field">
              Фамилия
              <input
                required
                placeholder={user.lastName || "Ваша фамилия"}
                value={last}
                onChange={(e) => setLast(e.target.value)}
              />
            </label>
            <button className="button justify-self-start" disabled={busy}>
              Сохранить имя
            </button>
          </form>
        )}
        <form onSubmit={password} className="form-stack">
          <h2 className="text-sm font-semibold">Безопасность</h2>
          {user?.mustChangePassword && (
            <p className="text-sm text-warning">
              Замените временный пароль своим.
            </p>
          )}
          {!user?.mustChangePassword && (
            <label className="field">
              Текущий пароль
              <input
                type="password"
                autoComplete="current-password"
                required
                value={oldPassword}
                onChange={(e) => setOld(e.target.value)}
              />
            </label>
          )}
          <label className="field">
            Новый пароль
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
          </label>
          <button className="button justify-self-start" disabled={busy}>
            Изменить пароль
          </button>
        </form>
        <button className="button danger" onClick={logout}>
          Выйти из аккаунта
        </button>
      </div>
    </AppShell>
  );
}
