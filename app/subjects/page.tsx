"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  PageHeader,
  Sheet,
  EmptyState,
  Skeleton,
} from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { request, json } from "@/components/tables/model";
import { useDiary } from "@/components/diary/use-diary";
import { nextLesson, localDate, formatDay } from "@/lib/diary";
export default function SubjectsPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useDiary();
  const subjects = data?.subjects || [];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request(
        "/api/subjects",
        json("POST", {
          name,
          shortName: short || name.slice(0, 6),
          color: "#308574",
        }),
      );
      setOpen(false);
      setName("");
      setShort("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell title="Предметы">
      <PageHeader
        title="Предметы"
        description="Учебные дисциплины, учителя и кабинеты."
        actions={
          isLeaderOrHigher(user?.role) && (
            <button className="button primary" onClick={() => setOpen(true)}>
              <Plus size={15} />
              Добавить предмет
            </button>
          )
        }
      />
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : !subjects.length ? (
        <EmptyState
          title="Предметы пока не добавлены"
          description="Лидер класса может добавить предметы здесь или при составлении расписания."
        />
      ) : (
        <div className="table-list">
          {subjects.map((s) => {
            const next = data ? nextLesson(data, s.id) : null;
            const pending =
              data?.homework.filter(
                (h) =>
                  h.subjectId === s.id &&
                  h.personalStatus !== "DONE" &&
                  localDate(h.dueDate) >= localDate(new Date()),
              ).length || 0;
            return (
              <Link
                href={`/subjects/${s.id}`}
                key={s.id}
                className="table-list-row"
              >
                <BookOpen size={18} />
                <div>
                  <strong>{s.name}</strong>
                  <p>
                    {s.teacher
                      ? `${s.teacher.lastName} ${s.teacher.firstName}`
                      : "Учитель не назначен"}
                  </p>
                </div>
                <small>
                  {pending
                    ? `${pending} ДЗ к выполнению`
                    : "Нет заданий к выполнению"}
                </small>
                <small>
                  {s.defaultClassroom
                    ? `Каб. ${s.defaultClassroom.number}`
                    : "Кабинет —"}
                  <br />
                  {next
                    ? `${formatDay(next.date)} · ${next.lesson.startTime}`
                    : "Урок не запланирован"}
                </small>
              </Link>
            );
          })}
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="Новый предмет">
        <form onSubmit={create} className="form-stack">
          <label className="field">
            Название
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Краткое название
            <input value={short} onChange={(e) => setShort(e.target.value)} />
          </label>
          <button className="button primary" disabled={busy}>
            Добавить предмет
          </button>
        </form>
      </Sheet>
    </AppShell>
  );
}
