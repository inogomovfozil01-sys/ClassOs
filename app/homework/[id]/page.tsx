"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  PageHeader,
  Skeleton,
  EmptyState,
  Sheet,
} from "@/components/ui/workspace";
import { FileCard } from "@/components/media/file-card";
import { Homework, formatDay } from "@/lib/diary";
import { request, json } from "@/components/tables/model";
import { useAuth } from "@/components/providers/auth-context";
import { canPublishHomework } from "@/lib/auth/rbac";
export default function HomeworkDetail() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!homework) return;
    setBusy(true);
    try {
      const result = await request(
        "/api/homework",
        json("PATCH", { id, ...draft }),
      );
      setHomework({ ...homework, ...result.homework });
      setEditing(false);
      toast.success("Задание обновлено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }
  const { id } = useParams<{ id: string }>();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    request("/api/homework")
      .then((d) =>
        setHomework(d.homework.find((h: Homework) => h.id === id) || null),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);
  async function status(value: string) {
    if (!homework) return;
    setBusy(true);
    try {
      await request(
        "/api/homework/status",
        json("POST", { homeworkId: id, status: value }),
      );
      setHomework({ ...homework, personalStatus: value });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось изменить статус",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell title="Домашнее задание">
      <Link
        href="/homework"
        className="inline-flex items-center gap-2 text-xs text-foreground-muted mb-6"
      >
        <ArrowLeft size={14} />
        Все задания
      </Link>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : !homework ? (
        <EmptyState
          title="Задание не найдено"
          description="Возможно, оно было удалено."
        />
      ) : (
        <div className="homework-detail">
          <Link
            className="text-xs text-foreground-muted"
            href={`/subjects/${homework.subjectId}`}
          >
            {homework.subject.name} →
          </Link>
          <PageHeader
            title={homework.title}
            actions={
              canPublishHomework(user?.role) && (
                <button
                  className="button"
                  onClick={() => {
                    setDraft({
                      title: homework.title,
                      description: homework.description,
                      dueDate: homework.dueDate.slice(0, 10),
                    });
                    setEditing(true);
                  }}
                >
                  Редактировать
                </button>
              )
            }
            description={`Срок: ${formatDay(homework.dueDate)} · Задано ${formatDay(homework.createdAt)}`}
          />
          <div className="description">
            {homework.description || "Дополнительного описания нет."}
          </div>
          {homework.attachments.length > 0 && (
            <section className="space-y-3 mb-8">
              <h2 className="text-sm font-semibold">Вложения</h2>
              {homework.attachments.map((a) => (
                <FileCard
                  key={a.id}
                  name={a.fileName}
                  url={a.fileUrl}
                  mimeType={a.mimeType}
                  size={a.fileSize}
                />
              ))}
            </section>
          )}
          <section className="border-t border-border pt-5">
            <h2 className="text-sm font-semibold mb-2">Мой статус</h2>
            <p className="text-xs text-foreground-muted mb-4">
              Личная отметка о выполнении. Это не оценка учителя.
            </p>
            <div className="segmented w-fit">
              {[
                ["NOT_STARTED", "Не начато"],
                ["IN_PROGRESS", "В процессе"],
                ["DONE", "Готово"],
              ].map(([value, label]) => (
                <button
                  disabled={busy}
                  key={value}
                  aria-pressed={homework.personalStatus === value}
                  onClick={() => status(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <Link
            href={`/schedule?date=${homework.dueDate.slice(0, 10)}`}
            className="button mt-6"
          >
            Расписание на этот день →
          </Link>
        </div>
      )}
      <Sheet
        open={editing}
        onOpenChange={(v) => !busy && setEditing(v)}
        title="Изменить домашнее задание"
      >
        <form onSubmit={save} className="form-stack">
          <label className="field">
            Что задано
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="field">
            Описание
            <textarea
              rows={5}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <label className="field">
            Срок
            <input
              type="date"
              required
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            />
          </label>
          <p className="text-xs text-foreground-muted">
            Изменение появится в расписании, у предмета и в уведомлениях класса.
          </p>
          <button className="button primary" disabled={busy}>
            {busy ? "Сохранение…" : "Сохранить изменения"}
          </button>
        </form>
      </Sheet>
    </AppShell>
  );
}
