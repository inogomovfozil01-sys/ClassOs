"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import {
  canManageUsers,
  getRoleBadgeColor,
  getRoleDisplayName,
} from "@/lib/auth/rbac";
import {
  Users,
  Plus,
  Search,
  Shield,
  Lock,
  Ban,
  CheckCircle,
  Trash2,
  X,
  KeyRound,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

function AdminUsersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [submitting, setSubmitting] = useState(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  const canAdmin = canManageUsers(user?.role);

  useEffect(() => {
    if (searchParams.get("action") === "create" && canAdmin) {
      setIsCreateOpen(true);
    }
  }, [searchParams, canAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !username || !tempPassword) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          middleName,
          username,
          tempPassword,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        `Пользователь @${data.user.username} создан! Передайте ему временный пароль.`,
      );
      setIsCreateOpen(false);
      setFirstName("");
      setLastName("");
      setMiddleName("");
      setUsername("");
      setTempPassword("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (targetId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Роль пользователя обновлена");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleBlock = async (
    targetId: string,
    currentBlocked: boolean,
  ) => {
    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !currentBlocked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        currentBlocked
          ? "Пользователь разблокирован"
          : "Пользователь заблокирован",
      );
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;

    try {
      const res = await fetch(
        `/api/users/${resetModalUser.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        `Новый временный пароль установлен для @${resetModalUser.username}`,
      );
      setResetModalUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    if (
      !confirm(
        `Удалить аккаунт ${targetUser.lastName} ${targetUser.firstName} (@${targetUser.username})?`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Аккаунт удалён");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName =
        `${u.firstName} ${u.lastName} ${u.username}`.toLowerCase();
      if (!matchName.includes(q)) return false;
    }
    return true;
  });

  return (
    <AppShell title="Ученики и роли">
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Управление пользователями
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Один аккаунт классного руководителя. Преподавателей предметов
              добавляйте в «Информации класса» — без аккаунтов.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Создать аккаунт</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по имени, фамилии или логину..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-surface-elevated border border-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="ALL">Все роли</option>
            <option value="STUDENT">Ученики</option>
            <option value="LEADER">Лидер класса</option>
            <option value="TEACHER">Классный руководитель</option>
            <option value="ADMIN">Администраторы</option>
            <option value="OWNER">Владелец</option>
          </select>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Загрузка аккаунтов...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-xs text-foreground-muted border border-border">
            Пользователи не найдены
          </div>
        ) : (
          <div className="glass-panel rounded-3xl border border-border overflow-hidden ">
            <div className="divide-y divide-border/60">
              {filteredUsers.map((u) => {
                const isOwnerUser = u.role === "OWNER";

                return (
                  <div
                    key={u.id}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-hover/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {u.lastName} {u.firstName} {u.middleName || ""}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getRoleBadgeColor(
                              u.role,
                            )}`}
                          >
                            {getRoleDisplayName(u.role)}
                          </span>
                          {u.isBlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger-muted/30 border border-danger/40 text-danger font-bold">
                              Заблокирован
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground-muted font-mono mt-0.5">
                          @{u.username}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isOwnerUser && (
                        <>
                          {/* Role selector */}
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value)
                            }
                            className="bg-surface-elevated border border-border rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
                          >
                            <option value="STUDENT">Ученик</option>
                            <option value="LEADER">Лидер класса</option>
                            <option
                              value="TEACHER"
                              disabled={usersList.some(
                                (other) =>
                                  other.role === "TEACHER" && other.id !== u.id,
                              )}
                            >
                              Классный руководитель
                            </option>
                            <option value="ADMIN">Админ</option>
                          </select>

                          {/* Reset password button */}
                          <button
                            onClick={() => setResetModalUser(u)}
                            className="p-1.5 rounded-xl bg-surface-elevated border border-border hover:border-border-strong text-foreground-muted hover:text-foreground"
                            title="Сбросить пароль"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Block/Unblock button */}
                          <button
                            onClick={() => handleToggleBlock(u.id, u.isBlocked)}
                            className={`p-1.5 rounded-xl border transition-colors ${
                              u.isBlocked
                                ? "bg-success-muted/20 border-success/30 text-success"
                                : "bg-surface-elevated border-border text-foreground-muted hover:text-danger"
                            }`}
                            title={
                              u.isBlocked ? "Разблокировать" : "Заблокировать"
                            }
                          >
                            <Ban className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-xl bg-surface-elevated border border-border text-foreground-muted hover:text-danger hover:border-danger/30 transition-colors"
                            title="Удалить аккаунт"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div
              className="fixed inset-0"
              onClick={() => setIsCreateOpen(false)}
            />
            <div className="w-full max-w-md glass-panel rounded-3xl p-6 relative z-10 border border-border-strong ">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-base text-foreground">
                    Создать аккаунт
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-full text-foreground-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-foreground-muted mb-1">
                      Имя
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Иван"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-foreground-muted mb-1">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Иванов"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1">
                    Отчество (опционально)
                  </label>
                  <input
                    type="text"
                    placeholder="Иванович"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1">
                    Логин для входа
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ivan_ivanov"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1">
                    Временный пароль
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр.: Class2026!"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-foreground-muted mt-0.5 block">
                    Пользователю будет предложено сменить пароль при первом
                    входе.
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1">
                    Роль
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="STUDENT">Ученик (Student)</option>
                    <option value="LEADER">Лидер класса (Leader)</option>
                    <option
                      value="TEACHER"
                      disabled={usersList.some(
                        (other) => other.role === "TEACHER",
                      )}
                    >
                      Классный руководитель (один на класс)
                    </option>
                    <option value="ADMIN">Администратор (Admin)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold  transition-all disabled:opacity-50"
                >
                  {submitting ? "Создание..." : "Создать аккаунт"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div
              className="fixed inset-0"
              onClick={() => setResetModalUser(null)}
            />
            <div className="w-full max-w-sm glass-panel rounded-3xl p-6 relative z-10 border border-border-strong ">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-sm text-foreground">
                    Сброс пароля
                  </h3>
                </div>
                <button
                  onClick={() => setResetModalUser(null)}
                  className="p-1 rounded-full text-foreground-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-foreground-muted mb-3">
                Новый временный пароль для @{resetModalUser.username}:
              </p>

              <form
                onSubmit={handleResetPassword}
                className="space-y-3 text-xs"
              >
                <input
                  type="text"
                  required
                  placeholder="Минимум 6 символов"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                />

                <button
                  type="submit"
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-all"
                >
                  Установить новый пароль
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">
          Загрузка...
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}
