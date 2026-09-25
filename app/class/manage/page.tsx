"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  BookOpen,
  Users,
  DoorOpen,
  Search,
  MessageSquare,
  Clock,
  Sparkles,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  PageHeader,
  Sheet,
  EmptyState,
  Skeleton,
} from "@/components/ui/workspace";
import { useDiary } from "@/components/diary/use-diary";
import { useAuth } from "@/components/providers/auth-context";
import {
  isLeaderOrHigher,
  canManageUsers,
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/lib/auth/rbac";
import { request, json } from "@/components/tables/model";
import { UserAvatar } from "@/components/ui/user-avatar";

export default function ClassManage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, error, loading, refresh } = useDiary();
  const [tab, setTab] = useState("students");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [todayData, setTodayData] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const [chatBusy, setChatBusy] = useState("");
  const [busy, setBusy] = useState(false);

  const canEdit = isLeaderOrHigher(user?.role);

  useEffect(() => {
    // Fetch users for students table & accounts
    request("/api/users")
      .then((d) => {
        setAllUsers(d.users || []);
        if (canManageUsers(user?.role)) {
          setAccounts((d.users || []).filter((u: any) => u.role === "TEACHER"));
        }
      })
      .catch(() => {});

    // Fetch today's duty and summary for activity tab
    request("/api/today")
      .then((d) => setTodayData(d))
      .catch(() => {});
  }, [user?.role]);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function openChat(targetUserId: string) {
    setChatBusy(targetUserId);
    try {
      const d = await request(
        "/api/conversations",
        json("POST", { type: "DIRECT", targetUserId }),
      );
      router.push(`/chats?conversation=${d.conversation.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось открыть чат");
    } finally {
      setChatBusy("");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const endpoint =
        tab === "teachers"
          ? "/api/teachers"
          : tab === "rooms"
            ? "/api/classrooms"
            : "/api/subjects";

      let payload: any = form;
      if (tab === "subjects") {
        payload = {
          name: form.name?.trim(),
          shortName: form.shortName?.trim() || form.name?.trim().slice(0, 8),
          color: form.color || "#308574",
          roomNumber: form.roomNumber?.trim() || undefined,
        };
      } else if (tab === "teachers") {
        payload = {
          firstName: form.firstName?.trim(),
          lastName: form.lastName?.trim(),
          // patronymic (middleName) omitted per user request
          subjectName: form.subjectName?.trim() || undefined,
          notes: form.notes?.trim() || undefined,
          userId: form.userId || undefined,
        };
      } else if (tab === "rooms") {
        payload = {
          number: form.number?.trim(),
        };
      }

      await request(endpoint, json("POST", payload));
      setOpen(false);
      setForm({});
      await refresh();
      toast.success("Добавлено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  const studentsList = allUsers.filter(
    (u) => !u.isBlocked && ["STUDENT", "LEADER", "DEPUTY_LEADER"].includes(u.role),
  );

  const filteredStudents = studentsList.filter((s) => {
    const q = userSearch.toLowerCase();
    const fullName = `${s.lastName} ${s.firstName} ${s.username}`.toLowerCase();
    return fullName.includes(q);
  });

  return (
    <AppShell title="Информация класса">
      <PageHeader
        title="Информация класса"
        description="Ученики, активность класса, расписание предметов и классный руководитель."
      />

      {canEdit && (
        <div className="home-shortcuts mb-4">
          <Link className="button" href="/homework?action=create">
            Задать ДЗ
          </Link>
          <Link className="button" href="/schedule?action=create">
            Добавить урок
          </Link>
          <Link className="button" href="/news?action=create">
            Создать новость
          </Link>
          <Link className="button" href="/tests?action=create">
            Контрольная
          </Link>
          <Link className="button" href="/duty">
            Дежурства
          </Link>
        </div>
      )}

      <div
        className="content-tabs"
        role="tablist"
        aria-label="Данные класса"
      >
        {[
          ["students", "Таблица учеников"],
          ["activity", "Активность"],
          ["subjects", "Предметы"],
          ["rooms", "Кабинеты"],
          ["teachers", "Классный руководитель"],
        ].map(([v, l]) => (
          <button
            role="tab"
            key={v}
            aria-selected={tab === v}
            onClick={() => {
              setTab(v);
              setForm({});
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {canEdit && (tab === "subjects" || tab === "rooms" || tab === "teachers") && (
        <button className="button primary mb-5" onClick={() => setOpen(true)}>
          <Plus size={15} />
          {tab === "teachers"
            ? "Добавить руководителя"
            : tab === "subjects"
              ? "Добавить предмет"
              : "Добавить кабинет"}
        </button>
      )}

      {loading ? (
        <Skeleton />
      ) : error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : (
        data && (
          <>
            {/* 1. Таблица учеников */}
            {tab === "students" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="table-search flex-1 max-w-md">
                    <Search size={16} />
                    <input
                      aria-label="Поиск ученика"
                      placeholder="Поиск по имени, фамилии или логину…"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-foreground-muted font-medium px-1">
                    Всего учеников:{" "}
                    <span className="text-foreground font-semibold">
                      {studentsList.length}
                    </span>
                  </div>
                </div>

                {!allUsers.length ? (
                  <Skeleton />
                ) : !filteredStudents.length ? (
                  <EmptyState
                    title="Ученики не найдены"
                    description={
                      userSearch
                        ? "По вашему запросу никого не найдено."
                        : "В классе ещё нет добавленных учеников."
                    }
                  />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-foreground-muted bg-surface-elevated/50">
                          <th className="py-3 px-4 font-medium w-12 text-center">№</th>
                          <th className="py-3 px-4 font-medium">Ученик</th>
                          <th className="py-3 px-4 font-medium">Логин</th>
                          <th className="py-3 px-4 font-medium">Роль</th>
                          <th className="py-3 px-4 font-medium text-right">Чат</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredStudents.map((st, idx) => (
                          <tr
                            key={st.id}
                            className="hover:bg-surface-elevated/40 transition-colors"
                          >
                            <td className="py-3 px-4 text-center text-foreground-muted font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-medium text-foreground">
                              <div className="flex items-center gap-2.5">
                                <UserAvatar
                                  src={st.avatarUrl}
                                  name={`${st.firstName} ${st.lastName}`}
                                  size={30}
                                />
                                <span>
                                  {st.lastName} {st.firstName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-foreground-muted font-mono">
                              @{st.username}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getRoleBadgeColor(
                                  st.role,
                                )}`}
                              >
                                {getRoleDisplayName(st.role)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {st.id !== user?.id && (
                                <button
                                  className="icon-button"
                                  aria-label={`Написать ${st.firstName}`}
                                  title="Написать сообщение"
                                  disabled={chatBusy === st.id}
                                  onClick={() => openChat(st.id)}
                                >
                                  <MessageSquare size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. Активность класса */}
            {tab === "activity" && (
              <div className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-surface border border-border">
                    <div className="text-xs text-foreground-muted flex items-center gap-1.5 mb-1">
                      <Users size={14} className="text-accent" />
                      <span>Учеников</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {studentsList.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface border border-border">
                    <div className="text-xs text-foreground-muted flex items-center gap-1.5 mb-1">
                      <BookOpen size={14} className="text-accent" />
                      <span>Активных ДЗ</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {data.homework?.length || 0}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface border border-border">
                    <div className="text-xs text-foreground-muted flex items-center gap-1.5 mb-1">
                      <Sparkles size={14} className="text-accent" />
                      <span>Дежурные сегодня</span>
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate mt-1">
                      {todayData?.duty?.students?.length
                        ? todayData.duty.students
                            .map((s: any) => `${s.lastName} ${s.firstName[0]}.`)
                            .join(", ")
                        : "Не назначены"}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface border border-border">
                    <div className="text-xs text-foreground-muted flex items-center gap-1.5 mb-1">
                      <GraduationCap size={14} className="text-accent" />
                      <span>Предметов</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {data.subjects?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Active Homework */}
                <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-accent" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Ближайшие домашние задания
                      </h3>
                    </div>
                    <Link
                      href="/homework"
                      className="text-xs text-accent hover:underline"
                    >
                      Все задания →
                    </Link>
                  </div>
                  {!data.homework?.length ? (
                    <p className="text-xs text-foreground-muted py-2">
                      На ближайшие дни заданий нет
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.homework.slice(0, 4).map((hw: any) => (
                        <Link
                          href="/homework"
                          key={hw.id}
                          className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-xs"
                        >
                          <div>
                            <span className="font-semibold text-foreground">
                              {hw.subject?.name || "Предмет"}
                            </span>
                            <p className="text-foreground-muted line-clamp-1 mt-0.5">
                              {hw.title || hw.description}
                            </p>
                          </div>
                          <span className="text-foreground-muted shrink-0 flex items-center gap-1">
                            <Clock size={12} />
                            {hw.dueDate
                              ? new Date(hw.dueDate).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "Без срока"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duty & News Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Today's Duty */}
                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-accent" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Дежурство по классу
                        </h3>
                      </div>
                      <Link
                        href="/duty"
                        className="text-xs text-accent hover:underline"
                      >
                        График →
                      </Link>
                    </div>
                    {todayData?.duty?.students?.length ? (
                      <div className="space-y-2">
                        {todayData.duty.students.map((st: any) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-elevated/40"
                          >
                            <UserAvatar
                              name={`${st.firstName} ${st.lastName}`}
                              size={26}
                            />
                            <span className="text-xs font-medium text-foreground">
                              {st.lastName} {st.firstName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground-muted py-2">
                        На сегодня дежурные не назначены.
                      </p>
                    )}
                  </div>

                  {/* Latest Announcements */}
                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-accent" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Новости и объявления
                        </h3>
                      </div>
                      <Link
                        href="/news"
                        className="text-xs text-accent hover:underline"
                      >
                        Все новости →
                      </Link>
                    </div>
                    {data.posts?.length ? (
                      <div className="space-y-2">
                        {data.posts.slice(0, 3).map((post: any) => (
                          <Link
                            href={`/news/${post.id}`}
                            key={post.id}
                            className="block p-2.5 rounded-xl bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-xs"
                          >
                            <span className="font-semibold text-foreground line-clamp-1">
                              {post.title}
                            </span>
                            <p className="text-foreground-muted line-clamp-1 mt-0.5">
                              {post.body}
                            </p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground-muted py-2">
                        Пока нет объявлений для класса.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Предметы */}
            {tab === "subjects" &&
              (data.subjects.length ? (
                data.subjects.map((s) => (
                  <Link
                    href={`/subjects/${s.id}`}
                    className="member-row"
                    key={s.id}
                  >
                    <BookOpen size={19} />
                    <div>
                      <strong>{s.name}</strong>
                      <p>
                        {s.defaultClassroom
                          ? `Кабинет ${s.defaultClassroom.number}`
                          : "Кабинет не указан"}
                        {s.teacher
                          ? ` · ${s.teacher.lastName} ${s.teacher.firstName}`
                          : ""}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState title="Предметы ещё не добавлены" />
              ))}

            {/* 4. Кабинеты */}
            {tab === "rooms" &&
              (data.classrooms.length ? (
                data.classrooms.map((r) => (
                  <div className="member-row" key={r.id}>
                    <DoorOpen size={19} />
                    <strong>Кабинет {r.number}</strong>
                  </div>
                ))
              ) : (
                <EmptyState title="Кабинеты ещё не добавлены" />
              ))}

            {/* 5. Классный руководитель */}
            {tab === "teachers" &&
              (data.teachers.length ? (
                data.teachers.map((t) => (
                  <div className="member-row" key={t.id}>
                    <Users size={19} />
                    <div>
                      <strong>
                        {t.lastName} {t.firstName}
                      </strong>
                      <p>
                        {t.subjectName || "Классный руководитель"} ·{" "}
                        {t.user ? "Аккаунт связан" : "Без аккаунта"}
                      </p>
                      {t.notes && <p>{t.notes}</p>}
                      {canManageUsers(user?.role) && (
                        <label className="block text-xs mt-2">
                          Аккаунт классного руководителя
                          <select
                            className="input mt-1"
                            aria-label={`Аккаунт: ${t.lastName} ${t.firstName}`}
                            value={t.user?.id || ""}
                            onChange={async (e) => {
                              try {
                                await request(
                                  "/api/teachers",
                                  json("PATCH", {
                                    id: t.id,
                                    userId: e.target.value,
                                  }),
                                );
                                await refresh();
                                toast.success("Аккаунт обновлён");
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Не удалось связать аккаунт",
                                );
                              }
                            }}
                          >
                            <option value="">Без аккаунта</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.lastName} {a.firstName}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Классный руководитель ещё не добавлен"
                  description="В классе один классный руководитель. Учителям предметов не нужны отдельные аккаунты."
                />
              ))}
          </>
        )
      )}

      {/* Creation Sheet */}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={
          tab === "teachers"
            ? "Классный руководитель"
            : tab === "subjects"
              ? "Новый предмет"
              : "Новый кабинет"
        }
        description={
          tab === "teachers"
            ? "В классе один классный руководитель. Учителям предметов аккаунты не нужны."
            : undefined
        }
      >
        <form className="form-stack" onSubmit={submit}>
          {tab === "teachers" ? (
            <>
              <label className="field">
                Фамилия
                <input
                  required
                  placeholder="Фамилия"
                  value={form.lastName || ""}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </label>
              <label className="field">
                Имя
                <input
                  required
                  placeholder="Имя"
                  value={form.firstName || ""}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </label>
              <label className="field">
                Предмет (по желанию)
                <input
                  placeholder="Например: Русский язык"
                  value={form.subjectName || ""}
                  onChange={(e) => set("subjectName", e.target.value)}
                />
              </label>
              <label className="field">
                Дополнительная информация
                <textarea
                  rows={2}
                  placeholder="Контакты, примечания..."
                  value={form.notes || ""}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
              {canManageUsers(user?.role) && accounts.length > 0 && (
                <label className="field">
                  Связать с аккаунтом учителя
                  <select
                    value={form.userId || ""}
                    onChange={(e) => set("userId", e.target.value)}
                  >
                    <option value="">Без аккаунта</option>
                    {accounts.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.lastName} {a.firstName} (@{a.username})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : tab === "subjects" ? (
            <>
              <label className="field">
                Название предмета
                <input
                  required
                  placeholder="Например: Химия, Физика, Алгебра"
                  value={form.name || ""}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label className="field">
                Кабинет (заполняется вручную)
                <input
                  placeholder="Например: 401, 204 или СПОРТ.ЗАЛ"
                  value={form.roomNumber || ""}
                  onChange={(e) => set("roomNumber", e.target.value)}
                  list="classrooms-datalist"
                />
                <datalist id="classrooms-datalist">
                  {data?.classrooms.map((r) => (
                    <option key={r.id} value={r.number} />
                  ))}
                </datalist>
              </label>
            </>
          ) : (
            <label className="field">
              Номер кабинета
              <input
                required
                placeholder="Например: 401"
                value={form.number || ""}
                onChange={(e) => set("number", e.target.value)}
              />
            </label>
          )}

          <div className="form-actions">
            <button
              className="button"
              type="button"
              onClick={() => setOpen(false)}
            >
              Отмена
            </button>
            <button className="button primary" disabled={busy}>
              Сохранить
            </button>
          </div>
        </form>
      </Sheet>
    </AppShell>
  );
}
