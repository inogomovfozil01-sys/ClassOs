"use client";
import { ViewportLayer } from "@/components/ui/viewport-layer";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { localDate, addDays, monday, formatDay } from "@/lib/diary";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { canPublishHomework } from "@/lib/auth/rbac";
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  X,
  Sparkles,
  Paperclip,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { FileCard } from "@/components/media/file-card";
import { uploadFile } from "@/lib/upload";

function HomeworkContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [period, setPeriod] = useState("week");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Leader AI quick draft text
  const [aiDraftPrompt, setAiDraftPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const canCreate = canPublishHomework(user?.role);
  useEffect(() => {
    const subject = searchParams.get("subject");
    if (subject) {
      setSubjectId(subject);
      setFilterSubject(subject);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("action") === "create" && canCreate) {
      setIsCreateOpen(true);
    }
  }, [searchParams, canCreate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hwRes, subsRes] = await Promise.all([
        fetch("/api/homework"),
        fetch("/api/subjects"),
      ]);
      const [hwData, subsData] = await Promise.all([
        hwRes.json(),
        subsRes.json(),
      ]);

      setHomeworkList(hwData.homework || []);
      setSubjects(subsData.subjects || []);

      if (subsData.subjects?.length > 0 && !subjectId) {
        setSubjectId(searchParams.get("subject") || subsData.subjects[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (homeworkId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/homework/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeworkId, status: newStatus }),
      });
      if (res.ok) {
        setHomeworkList((prev) =>
          prev.map((h) =>
            h.id === homeworkId ? { ...h, personalStatus: newStatus } : h,
          ),
        );
        toast.success("Статус обновлён");
      }
    } catch {
      toast.error("Не удалось обновить статус");
    }
  };

  const handleAiDraft = async () => {
    if (!aiDraftPrompt.trim()) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/ai/leader-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiDraftPrompt.trim() }),
      });
      const data = await res.json();
      if (data.draft) {
        if (data.draft.subjectId) setSubjectId(data.draft.subjectId);
        if (data.draft.title) setTitle(data.draft.title);
        if (data.draft.description) setDescription(data.draft.description);
        if (data.draft.dueDate) setDueDate(data.draft.dueDate);
        toast.success("Черновик задания сформирован AI");
      }
    } catch {
      toast.error("Ошибка генерации черновика");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !title || !dueDate) {
      toast.error("Заполните обязательные поля");
      return;
    }

    setSubmitting(true);
    try {
      const attachments = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const d = await uploadFile(form, setUploadProgress);
        attachments.push({
          fileName: file.name,
          fileUrl: d.file.downloadUrl,
          fileSize: file.size,
          mimeType: file.type,
        });
      }
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          title,
          description,
          dueDate,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Домашнее задание опубликовано");
      setIsCreateOpen(false);
      setTitle("");
      setFiles([]);
      setDescription("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHomework = homeworkList.filter((h) => {
    const date = localDate(h.dueDate),
      today = localDate(new Date());
    if (period === "today" && date !== today) return false;
    if (period === "tomorrow" && date !== localDate(addDays(new Date(), 1)))
      return false;
    if (
      period === "week" &&
      (date < localDate(monday(new Date())) ||
        date > localDate(addDays(monday(new Date()), 6)))
    )
      return false;
    if (filterSubject !== "ALL" && h.subjectId !== filterSubject) return false;
    if (filterStatus === "DONE" && h.personalStatus !== "DONE") return false;
    if (filterStatus === "ACTIVE" && h.personalStatus === "DONE") return false;
    return true;
  });

  return (
    <AppShell title="Домашние задания">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Домашние задания
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Задания по срокам. Статус — ваша личная отметка, а не оценка
              учителя.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Задать ДЗ</span>
            </button>
          )}
        </div>

        <div className="content-tabs" role="tablist" aria-label="Срок задания">
          {[
            ["today", "Сегодня"],
            ["tomorrow", "Завтра"],
            ["week", "На этой неделе"],
            ["all", "Все"],
          ].map(([value, label]) => (
            <button
              role="tab"
              key={value}
              aria-selected={period === value}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filters */}
          <div className="p-1 rounded-2xl glass-panel border border-border flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterStatus === "ALL"
                  ? "bg-accent text-white shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterStatus("ACTIVE")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterStatus === "ACTIVE"
                  ? "bg-accent text-white shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              К выполнению
            </button>
            <button
              onClick={() => setFilterStatus("DONE")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterStatus === "DONE"
                  ? "bg-success text-white shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Сделано
            </button>
          </div>

          {/* Subject filter */}
          {subjects.length > 0 && (
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-surface-elevated border border-border rounded-2xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="ALL">Все предметы</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Homework list or Empty state */}
        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Загрузка заданий...
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-3 border border-border">
            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-foreground-muted">
              <BookOpen className="w-6 h-6 text-accent" />
            </div>
            <h4 className="font-bold text-sm text-foreground">
              Заданий пока нет
            </h4>
            <p className="text-xs text-foreground-muted max-w-xs mx-auto">
              {canCreate
                ? "Нажмите кнопку ниже, чтобы записать и опубликовать первое задание для класса."
                : "Лидер или учителя ещё не добавили домашних заданий."}
            </p>
            {canCreate && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all"
              >
                + Задать первое ДЗ
              </button>
            )}
          </div>
        ) : (
          <div className="homework-list">
            {filteredHomework.map((hw) => {
              const due = new Date(hw.dueDate);
              const isOverdue =
                due < new Date() && hw.personalStatus !== "DONE";

              return (
                <div key={hw.id} className="homework-row space-y-3 relative">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-accent/15 text-accent border border-accent/25">
                        {hw.subject?.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span
                          className={
                            isOverdue ? "text-danger font-semibold" : ""
                          }
                        >
                          До {due.toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-foreground leading-snug">
                      <Link href={`/homework/${hw.id}`}>{hw.title} →</Link>
                    </h3>
                    <p className="text-[11px] text-foreground-muted">
                      Задано {formatDay(hw.createdAt)}
                    </p>

                    {hw.description && (
                      <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                        {hw.description}
                      </p>
                    )}

                    {hw.attachments?.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {hw.attachments.map((att: any) => (
                          <FileCard
                            key={att.id}
                            name={att.fileName}
                            url={att.fileUrl}
                            mimeType={att.mimeType}
                            size={att.fileSize}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Personal Status Switcher */}
                  <div className="pt-3 border-t border-border/60 flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-xs text-foreground-muted font-medium">
                      Личная отметка:
                    </span>
                    <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-secondary border border-border text-xs">
                      <button
                        onClick={() => handleStatusChange(hw.id, "NOT_STARTED")}
                        className={`px-3 py-1 rounded-xl transition-all ${
                          hw.personalStatus === "NOT_STARTED" || !hw.personalStatus
                            ? "bg-surface-elevated text-foreground font-semibold shadow-xs"
                            : "text-foreground-muted hover:text-foreground"
                        }`}
                      >
                        Не начато
                      </button>
                      <button
                        onClick={() => handleStatusChange(hw.id, "IN_PROGRESS")}
                        className={`px-3 py-1 rounded-xl transition-all ${
                          hw.personalStatus === "IN_PROGRESS"
                            ? "bg-warning/25 text-warning font-semibold shadow-xs"
                            : "text-foreground-muted hover:text-foreground"
                        }`}
                      >
                        В процессе
                      </button>
                      <button
                        onClick={() => handleStatusChange(hw.id, "DONE")}
                        className={`px-3 py-1 rounded-xl transition-all ${
                          hw.personalStatus === "DONE"
                            ? "bg-success/25 text-success font-semibold shadow-xs"
                            : "text-foreground-muted hover:text-foreground"
                        }`}
                      >
                        ✓ Готово
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation Modal / Sheet */}
      {isCreateOpen && (
        <ViewportLayer className="legacy-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsCreateOpen(false)}
          />
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 relative z-10 border border-border-strong  max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-base text-foreground">
                  Новое домашнее задание
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Leader AI Quick Draft Box */}
            <div className="mb-4 p-3 rounded-2xl bg-surface-elevated/70 border border-accent/30 space-y-2">
              <div className="flex items-center gap-1.5 text-accent text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Быстрый AI ввод (надиктуйте или вставьте текст)</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="напр.: по алгебре параграф 12 номера 1-5 на четверг"
                  value={aiDraftPrompt}
                  onChange={(e) => setAiDraftPrompt(e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={isGeneratingAi || !aiDraftPrompt.trim()}
                  className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent text-white text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {isGeneratingAi ? "..." : "Распознать"}
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <label className="field">
                Фото и файлы
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              {files.length > 0 && (
                <p className="text-xs text-foreground-muted">
                  Выбрано файлов: {files.length}. Они загрузятся при публикации.
                </p>
              )}
              {submitting && files.length > 0 && (
                <p role="status">Загрузка файла: {uploadProgress}%</p>
              )}
              <div>
                <label className="block font-medium text-foreground-muted mb-1.5">
                  Предмет
                </label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground-muted mb-1.5">
                  Что задали? (краткий заголовок)
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр.: Номера 145-148, выучить правило"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground-muted mb-1.5">
                  Срок сдачи (к какому числу)
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground-muted mb-1.5">
                  Подробное описание или заметка
                </label>
                <textarea
                  rows={3}
                  placeholder="Дополнительные комментарии учителя, страницы, критерии оформления..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold  transition-all disabled:opacity-50"
                >
                  {submitting ? "Публикация..." : "Опубликовать для класса"}
                </button>
              </div>
            </form>
          </div>
        </ViewportLayer>
      )}
    </AppShell>
  );
}

export default function HomeworkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">
          Загрузка...
        </div>
      }
    >
      <HomeworkContent />
    </Suspense>
  );
}
