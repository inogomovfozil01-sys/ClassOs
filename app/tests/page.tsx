"use client";

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
} from "lucide-react";
import { toast } from "sonner";

export default function TestsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isOpen, setIsOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [topics, setTopics] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      color: "bg-accent/20 text-accent border-accent/30",
    };
  };

  return (
    <AppShell title="Контрольные и экзамены">
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Контрольные и зачёты
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Календарь проверочных работ, список тем и материалов для
              подготовки
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить контрольную</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Загрузка...
          </div>
        ) : exams.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-3 border border-border">
            <GraduationCap className="w-10 h-10 text-accent mx-auto" />
            <h3 className="font-bold text-sm text-foreground">
              Контрольных работ пока нет
            </h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              {canCreate
                ? "Нажмите кнопку добавления, чтобы предупредить класс о предстоящей контрольной."
                : "Учителя и лидер ещё не назначили контрольных работ."}
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
                  className="glass-panel rounded-3xl p-5 border border-border space-y-3 relative flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-accent/15 text-accent border border-accent/20">
                        {ex.subject.name}
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
                        {new Date(ex.date).toLocaleDateString("ru-RU")}
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
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
            <div className="w-full max-w-md glass-panel rounded-3xl p-6 relative z-10 border border-border-strong ">
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
                    Название / Тип работы
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр.: Контрольная работа за 1 четверть"
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
                    Темы и вопросы для подготовки
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Параграфы 1-8, формулы площадей..."
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold  transition-all disabled:opacity-50"
                >
                  {submitting ? "Сохранение..." : "Запланировать контрольную"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
