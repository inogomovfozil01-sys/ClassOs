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
  Pencil,
  Trash2,
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

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingHwId, setEditingHwId] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

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
          prev.map((hw) =>
            hw.id === homeworkId ? { ...hw, personalStatus: newStatus } : hw,
          ),
        );
        toast.success(
          newStatus === "DONE"
            ? "Отлично! Задание выполнено! 🎉"
            : "Статус обновлен",
        );
      }
    } catch {
      toast.error("Не удалось обновить статус");
    }
  };

  const handleAiDraft = async () => {
    if (!aiDraftPrompt.trim()) return;
    try {
      setIsGeneratingAi(true);
      const res = await fetch("/api/ai/parse-homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiDraftPrompt }),
      });
      if (!res.ok) throw new Error("AI не смог распознать текст");
      const data = await res.json();
      if (data.subjectId) setSubjectId(data.subjectId);
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.dueDate) setDueDate(data.dueDate);
      toast.success("AI заполнил форму задания! Проверьте и сохраните.");
    } catch (e: any) {
      toast.error(e.message || "Ошибка распознавания");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !title || !dueDate) return;

    setSubmitting(true);
    try {
      const attachments = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const uploaded = await uploadFile(fd, (p) => setUploadProgress(p));
        attachments.push(uploaded);
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
      setDescription("");
      setFiles([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleOpenEdit = (hw: any) => {
    setEditingHwId(hw.id);
    setEditSubjectId(hw.subjectId);
    setEditTitle(hw.title);
    setEditDescription(hw.description || "");
    setEditDueDate(
      hw.dueDate ? new Date(hw.dueDate).toISOString().split("T")[0] : "",
    );
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHwId || !editTitle.trim() || !editDueDate) return;

    setEditSubmitting(true);
    try {
      const res = await fetch("/api/homework", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingHwId,
          subjectId: editSubjectId,
          title: editTitle.trim(),
          description: editDescription.trim(),
          dueDate: editDueDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось обновить");

      toast.success("Домашнее задание обновлено! 📚");
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Ошибка обновления");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteHomework = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить это домашнее задание?")) return;

    try {
      const res = await fetch(`/api/homework?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");

      toast.success("Домашнее задание удалено");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Ошибка удаления");
    }
  };

  const filteredHomework = homeworkList.filter((hw) => {
    if (filterSubject !== "ALL" && hw.subjectId !== filterSubject) return false;
    if (filterStatus !== "ALL") {
      const currentStatus = hw.personalStatus || "NOT_STARTED";
      if (filterStatus !== currentStatus) return false;
    }
    const due = localDate(hw.dueDate);
    const today = localDate(new Date());
    if (period === "today" && due !== today) return false;
    if (period === "tomorrow" && due !== localDate(addDays(new Date(), 1)))
      return false;
    if (
      period === "week" &&
      (due < today || due > localDate(addDays(new Date(), 7)))
    )
      return false;
    return true;
  });

  return (
    <AppShell title="Домашние задания">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <BookOpen className="text-accent w-7 h-7" />
              <span>Домашние задания 7-«Б»</span>
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Актуальные задания от учителей и старосты с материалами и дедлайнами
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
            >
              <Plus size={16} />
              <span>Задать ДЗ</span>
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setPeriod("today")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                period === "today"
                  ? "bg-accent text-white shadow-xs"
                  : "bg-surface-elevated text-foreground-muted hover:text-foreground"
              }`}
            >
              На сегодня
            </button>
            <button
              onClick={() => setPeriod("tomorrow")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                period === "tomorrow"
                  ? "bg-accent text-white shadow-xs"
                  : "bg-surface-elevated text-foreground-muted hover:text-foreground"
              }`}
            >
              На завтра
            </button>
            <button
              onClick={() => setPeriod("week")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                period === "week"
                  ? "bg-accent text-white shadow-xs"
                  : "bg-surface-elevated text-foreground-muted hover:text-foreground"
              }`}
            >
              Ближайшая неделя
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                period === "all"
                  ? "bg-accent text-white shadow-xs"
                  : "bg-surface-elevated text-foreground-muted hover:text-foreground"
              }`}
            >
              Все задания
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-surface-elevated border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="ALL">Все предметы</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-surface-elevated border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="ALL">Любой статус</option>
              <option value="NOT_STARTED">Не начато</option>
              <option value="IN_PROGRESS">В процессе</option>
              <option value="DONE">Готово</option>
            </select>
          </div>
        </div>

        {/* Homework list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-3xl bg-surface-elevated animate-pulse border border-border"
              />
            ))}
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-foreground-muted mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-semibold text-foreground text-sm">
              Нет заданий по выбранным фильтрам
            </h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              {canCreate
                ? "Нажмите кнопку ниже, чтобы записать и опубликовать первое задание для класса."
                : "Лидер или учителя ещё не добавили домашних заданий."}
            </p>
            {canCreate && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-xs"
              >
                + Задать ДЗ
              </button>
            )}
          </div>
        ) : (
          <div className="homework-list space-y-3.5">
            {filteredHomework.map((hw) => {
              const due = new Date(hw.dueDate);
              const isOverdue =
                due < new Date() && hw.personalStatus !== "DONE";

              return (
                <div
                  key={hw.id}
                  className="glass-panel p-5 rounded-3xl border border-border space-y-3 relative hover:border-border-strong transition-all shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-accent/15 text-accent border border-accent/25">
                        {hw.subject?.name}
                      </span>
                      <div className="flex items-center gap-2">
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

                        {/* Edit & Delete for Leader / Teacher / Admin */}
                        {canCreate && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(hw)}
                              className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-accent border border-border transition-colors"
                              title="Редактировать ДЗ"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHomework(hw.id)}
                              className="p-1.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 transition-colors"
                              title="Удалить ДЗ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-foreground leading-snug">
                      <Link href={`/homework/${hw.id}`} className="hover:text-accent transition-colors">
                        {hw.title} →
                      </Link>
                    </h3>

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
                            size={att.fileSize}
                            mimeType={att.mimeType}
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
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 relative z-10 border border-border-strong shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-md"
                >
                  {submitting ? "Публикация..." : "Опубликовать для класса"}
                </button>
              </div>
            </form>
          </div>
        </ViewportLayer>
      )}

      {/* Edit Homework Modal */}
      {isEditOpen && (
        <ViewportLayer className="legacy-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsEditOpen(false)}
          />
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 relative z-10 border border-border-strong shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-base text-foreground">
                  Редактировать домашнее задание
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground-muted mb-1.5">
                  Предмет
                </label>
                <select
                  required
                  value={editSubjectId}
                  onChange={(e) => setEditSubjectId(e.target.value)}
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
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
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
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground-muted mb-1.5">
                  Подробное описание или заметка
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-surface-elevated text-foreground-muted font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium shadow-md transition-all disabled:opacity-50"
                >
                  {editSubmitting ? "Сохранение..." : "Сохранить изменения"}
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
