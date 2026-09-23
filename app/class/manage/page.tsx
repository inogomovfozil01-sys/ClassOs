"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, BookOpen, Users, DoorOpen } from "lucide-react";
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
import { isLeaderOrHigher, canManageUsers } from "@/lib/auth/rbac";
import { request, json } from "@/components/tables/model";
export default function ClassManage() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useDiary();
  const [tab, setTab] = useState("teachers");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const canEdit = isLeaderOrHigher(user?.role);
  useEffect(() => {
    if (canManageUsers(user?.role))
      request("/api/users")
        .then((d) =>
          setAccounts(d.users.filter((u: any) => u.role === "TEACHER")),
        )
        .catch(() => {});
  }, [user?.role]);
  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
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
      await request(
        endpoint,
        json(
          "POST",
          tab === "subjects"
            ? {
                ...form,
                shortName: form.shortName || form.name?.slice(0, 6),
                color: "#308574",
              }
            : form,
        ),
      );
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
  return (
    <AppShell title="Информация класса">
      <PageHeader
        title="Информация класса"
        description="Преподаватели предметов — записи для расписания, им не нужен аккаунт. Единственный аккаунт учителя предназначен классному руководителю."
      />
      {!canEdit ? (
        <EmptyState title="Редактирование доступно лидеру класса" />
      ) : (
        <>
          <div className="home-shortcuts">
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
          <div
            className="content-tabs"
            role="tablist"
            aria-label="Данные класса"
          >
            {[
              ["teachers", "Учителя"],
              ["subjects", "Предметы"],
              ["rooms", "Кабинеты"],
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
          <button className="button primary mb-5" onClick={() => setOpen(true)}>
            <Plus size={15} />
            {tab === "teachers"
              ? "Добавить преподавателя"
              : tab === "subjects"
                ? "Добавить предмет"
                : "Добавить кабинет"}
          </button>
          {loading ? (
            <Skeleton />
          ) : error ? (
            <p role="alert" className="inline-error">
              {error}
            </p>
          ) : (
            data && (
              <>
                {tab === "teachers" &&
                  (data.teachers.length ? (
                    data.teachers.map((t) => (
                      <div className="member-row" key={t.id}>
                        <Users size={19} />
                        <div>
                          <strong>
                            {t.lastName} {t.firstName} {t.middleName || ""}
                          </strong>
                          <p>
                            {t.subjectName || "Предмет не указан"} ·{" "}
                            {t.user ? "Аккаунт связан" : "Без аккаунта"}
                          </p>
                          {t.notes && <p>{t.notes}</p>}
                          {canManageUsers(user?.role) && (
                            <label className="block text-xs mt-2">
                              Аккаунт классного руководителя (если это он)
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
                      title="Учителя ещё не добавлены"
                      description="Учителю не обязательно иметь аккаунт. Добавьте информацию о нём для расписания."
                    />
                  ))}
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
                            {s.teacher
                              ? `${s.teacher.lastName} ${s.teacher.firstName}`
                              : "Учитель не назначен"}
                            {s.defaultClassroom
                              ? ` · Каб. ${s.defaultClassroom.number}`
                              : ""}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyState title="Предметы ещё не добавлены" />
                  ))}
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
              </>
            )
          )}
          <Sheet
            open={open}
            onOpenChange={setOpen}
            title={
              tab === "teachers"
                ? "Преподаватель предмета"
                : tab === "subjects"
                  ? "Новый предмет"
                  : "Новый кабинет"
            }
            description={
              tab === "teachers"
                ? "Это запись для расписания, а не регистрация аккаунта."
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
                      value={form.lastName || ""}
                      onChange={(e) => set("lastName", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Имя
                    <input
                      required
                      value={form.firstName || ""}
                      onChange={(e) => set("firstName", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Отчество
                    <input
                      value={form.middleName || ""}
                      onChange={(e) => set("middleName", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Предмет
                    <input
                      value={form.subjectName || ""}
                      onChange={(e) => set("subjectName", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Дополнительная информация
                    <textarea
                      rows={2}
                      value={form.notes || ""}
                      onChange={(e) => set("notes", e.target.value)}
                    />
                  </label>
                  {canManageUsers(user?.role) && (
                    <label className="field">
                      Аккаунт классного руководителя (если это он)
                      <select
                        value={form.userId || ""}
                        onChange={(e) => set("userId", e.target.value)}
                      >
                        <option value="">Без аккаунта</option>
                        {accounts.map((a) => (
                          <option value={a.id} key={a.id}>
                            {a.lastName} {a.firstName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              ) : tab === "subjects" ? (
                <>
                  <label className="field">
                    Название
                    <input
                      required
                      value={form.name || ""}
                      onChange={(e) => set("name", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Учитель
                    <select
                      value={form.teacherId || ""}
                      onChange={(e) => set("teacherId", e.target.value)}
                    >
                      <option value="">Не назначен</option>
                      {data?.teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.lastName} {t.firstName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Кабинет
                    <select
                      value={form.defaultClassroomId || ""}
                      onChange={(e) =>
                        set("defaultClassroomId", e.target.value)
                      }
                    >
                      <option value="">Не указан</option>
                      {data?.classrooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.number}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label className="field">
                  Номер кабинета
                  <input
                    required
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
        </>
      )}
    </AppShell>
  );
}
