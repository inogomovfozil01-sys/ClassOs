"use client";
import { ViewportLayer } from "@/components/ui/viewport-layer";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Link as LinkIcon,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function TestsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [isOpen, setIsOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [topics, setTopics] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTopics, setEditTopics] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const canCreate = isLeaderOrHigher(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [exRes, subsRes] = await Promise.all([
        fetch("/api/exams"),
        fetch("/api/subjects"),
      ]);
      const [exData, subsData] = await Promise.all([
        exRes.json(),
        subsRes.json(),
      ]);

      setExams(exData.exams || []);
      setSubjects(subsData.subjects || []);

      if (subsData.subjects?.length > 0 && !subjectId) {
        setSubjectId(subsData.subjects[0].id);
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

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (canCreate && query.get("action") === "create") setIsOpen(true);
    const id = query.get("exam");
    if (id && !loading)
      document
        .getElementById("exam-" + id)
        ?.scrollIntoView({ block: "center" });
  }, [canCreate, loading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !title || !date) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, title, date, topics, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Контрольная работа добавлена");
      setIsOpen(false);
      setTitle("");
      setTopics("");
      setNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setEditSubjectId(exam.subjectId);
    setEditTitle(exam.title);
    setEditDate(
      exam.date ? new Date(exam.date).toISOString().split("T")[0] : "",
    );
    setEditTopics(exam.topics || "");
    setEditNotes(exam.notes || "");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamId || !editTitle.trim() || !editDate) return;

    setEditSubmitting(true);
    try {
      const res = await fetch("/api/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExamId,
          subjectId: editSubjectId,
          title: editTitle.trim(),
          date: editDate,
          topics: editTopics.trim(),
          notes: editNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось обновить");

      toast.success("Информация о контрольной обновлена! 🎓");
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Ошибка обновления");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту контрольную работу?")) {
      return;
    }

    try {
      const res = await fetch(`/api/exams?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");

      toast.success("Контрольная работа удалена");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Ошибка удаления");
    }
  };

  const getCountdown = (targetDate: string) => {
    const diffDays = Math.ceil(
      (new Date(targetDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0)
      return {
        text: "Прошла",
        color: "bg-surface-elevated text-foreground-muted",
      };
    if (diffDays === 0)
      return {
        text: "Сегодня",
        color: "bg-danger/20 text-danger border-danger/30",
      };
    if (diffDays === 1)
      return {
        text: "Завтра",
        color: "bg-warning/20 text-warning border-warning/30",
      };
    return {
      text: `Через ${diffDays} дн.`,
      color: "bg-accent/15 text-accent border-accent/20",
    };
  };

  return (
    <AppShell title="Контрольные и тесты">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <GraduationCap className="text-accent w-7 h-7" />
              <span>Контрольные работы 7-«Б»</span>
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              График срезов знаний, тестов и четвертных контрольных
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
            >
              <Plus size={16} />
              <span>Добавить контрольную</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 rounded-3xl bg-surface-elevated animate-pulse border border-border"
              />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-foreground-muted mx-auto">
              <GraduationCap size={24} />
            </div>
            <h3 className="font-semibold text-foreground text-sm">
              Контрольных пока нет
            </h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Все запланированные тесты и контрольные работы 7-«Б» класса будут отображаться здесь.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((ex) => {
              const countdown = getCountdown(ex.date);
              return (
                <div
                  key={ex.id}
                  id={"exam-" + ex.id}
                  className="glass-panel rounded-3xl p-5 border border-border space-y-3 relative flex flex-col justify-between hover:border-border-strong transition-all shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-accent/15 text-accent border border-accent/20">
                        {ex.subject?.name || "Предмет"}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${countdown.color}`}
                      >
                        {countdown.text}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-foreground leading-snug">
                      {ex.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-foreground-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(ex.date).toLocaleDateString("ru-RU", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                    </div>

                    {ex.topics && (
                      <div className="pt-1 text-xs text-foreground-muted bg-surface-elevated/60 p-3 rounded-2xl border border-border">
                        <span className="font-semibold text-foreground block mb-0.5">
                          Темы:
                        </span>
                        <p className="whitespace-pre-wrap">{ex.topics}</p>
                      </div>
                    )}

                    {ex.notes && (
                      <p className="text-[11px] text-foreground-muted italic pt-1">
                        {ex.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions for Leader / Teacher / Admin */}
                  {canCreate && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ex)}
                        className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors shadow-xs"
                        title="Редактировать информацию"
                      >
                        <Pencil size={13} className="text-accent" />
                        <span>Изменить</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(ex.id)}
                        className="px-3 py-1.5 rounded-xl bg-danger/10 hover:bg-danger/20 border border-danger/20 text-xs font-semibold text-danger flex items-center gap-1.5 transition-colors shadow-xs"
                        title="Удалить контрольную"
                      >
                        <Trash2 size={13} />
                        <span>Удалить</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {isOpen && (
          <ViewportLayer className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
            <div className="w-full max-w-md glass-panel rounded-3xl p-6 relative z-10 border border-border-strong shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-base text-foreground">
                    Новая контрольная работа
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-foreground-muted hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
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
                    Название / Тип
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр. Контрольная работа по итогам главы 3"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Дата проведения
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Темы и вопросы
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Параграфы 12-16, формулы сокращенного умножения..."
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Примечания (необязательно)
                  </label>
                  <input
                    type="text"
                    placeholder="Взять калькулятор, двойные листочки..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-surface-elevated text-foreground-muted font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium shadow-md transition-all disabled:opacity-50"
                  >
                    {submitting ? "Создание..." : "Добавить"}
                  </button>
                </div>
              </form>
            </div>
          </ViewportLayer>
        )}

        {/* Edit Modal */}
        {isEditOpen && (
          <ViewportLayer className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="fixed inset-0" onClick={() => setIsEditOpen(false)} />
            <div className="w-full max-w-md glass-panel rounded-3xl p-6 relative z-10 border border-border-strong shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-base text-foreground">
                    Редактировать контрольную
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-full text-foreground-muted hover:text-foreground"
                >
                  <X className="w-5 h-5" />
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
                    Название / Тип
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
                    Дата проведения
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Темы и вопросы
                  </label>
                  <textarea
                    rows={3}
                    value={editTopics}
                    onChange={(e) => setEditTopics(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Примечания (необязательно)
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent"
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
      </div>
    </AppShell>
  );
}
