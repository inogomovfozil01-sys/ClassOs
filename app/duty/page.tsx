"use client";
import { ViewportLayer } from "@/components/ui/viewport-layer";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { canManageDuty } from "@/lib/auth/rbac";
import {
  CheckSquare,
  Plus,
  Calendar,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function DutyPage() {
  const { user } = useAuth();
  const [duties, setDuties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canEdit = canManageDuty(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dutyRes, usersRes] = await Promise.all([
        fetch("/api/duty"),
        fetch("/api/users"),
      ]);
      const [dutyData, usersData] = await Promise.all([
        dutyRes.json(),
        usersRes.json(),
      ]);

      setDuties(dutyData.duties || []);
      setUsers(usersData.users || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleStudentSelection = (sId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !selectedStudentIds.length) {
      toast.error("Выберите дату и хотя бы одного дежурного");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          studentIds: selectedStudentIds,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("График дежурства сохранён");
      setIsOpen(false);
      setSelectedStudentIds([]);
      setNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Find next duty for current logged-in user
  const userNextDuty = duties.find(
    (d) => d.isUserDuty && new Date(d.date) >= new Date(),
  );

  return (
    <AppShell title="Дежурства по классу">
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              График дежурств
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Расписание дежурств по классу, поддержание порядка и проветривание
              кабинетов
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Назначить дежурных</span>
            </button>
          )}
        </div>

        {/* User personal duty highlight banner */}
        {userNextDuty && (
          <div className="p-4 sm:p-5 rounded-3xl bg-success/15 border border-success/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-success/20 text-success flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-success">
                Ваше ближайшее дежурство:{" "}
                {new Date(userNextDuty.date).toLocaleDateString("ru-RU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <p className="text-[11px] text-success/80 mt-0.5">
                Вместе с вами:{" "}
                {userNextDuty.students
                  .filter((s: any) => s.id !== user?.id)
                  .map((s: any) => `${s.lastName} ${s.firstName}`)
                  .join(", ") || "Один"}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Загрузка графика...
          </div>
        ) : duties.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-3 border border-border">
            <CheckSquare className="w-10 h-10 text-accent mx-auto" />
            <h3 className="font-bold text-sm text-foreground">
              График дежурств пуст
            </h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              {canEdit
                ? "Нажмите кнопку выше, чтобы назначить дежурных на ближайшие дни."
                : "Лидер класса ещё не заполнил график дежурств."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {duties.map((duty) => (
              <div
                key={duty.id}
                className={`p-4 rounded-3xl glass-panel border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  duty.isUserDuty
                    ? "border-success/40 bg-success/5"
                    : "border-border"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-bold text-foreground capitalize">
                      {new Date(duty.date).toLocaleDateString("ru-RU", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                    {duty.isUserDuty && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-bold">
                        Вы дежурный
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-foreground-muted">
                    Дежурные:{" "}
                    <strong className="text-foreground font-semibold">
                      {duty.students?.length
                        ? duty.students
                            .map((s: any) => `${s.lastName} ${s.firstName}`)
                            .join(", ")
                        : "Не указаны"}
                    </strong>
                  </p>

                  {duty.notes && (
                    <p className="text-[11px] text-foreground-muted italic">
                      {duty.notes}
                    </p>
                  )}
                </div>

                <span className="text-[11px] px-2.5 py-1 rounded-xl bg-surface-elevated border border-border text-foreground-muted font-medium self-start sm:self-auto">
                  {duty.status === "COMPLETED" ? "Завершено" : "Запланировано"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {isOpen && (
          <ViewportLayer className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
            <div className="w-full max-w-md glass-panel rounded-3xl p-6 relative z-10 border border-border-strong  max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-base text-foreground">
                    Назначить дежурных
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-foreground-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Дата
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Выберите дежурных учеников (кликните для выбора)
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-2xl bg-surface-elevated border border-border custom-scrollbar">
                    {users.map((u) => {
                      const isSelected = selectedStudentIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleStudentSelection(u.id)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? "bg-accent/20 border border-accent/40 text-foreground font-semibold"
                              : "hover:bg-surface-hover text-foreground-muted"
                          }`}
                        >
                          <span>
                            {u.lastName} {u.firstName}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Особые поручения / кабинет
                  </label>
                  <input
                    type="text"
                    placeholder="напр.: Полить цветы, подготовить доску"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedStudentIds.length}
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold  transition-all disabled:opacity-50"
                >
                  {submitting ? "Сохранение..." : "Назначить на эту дату"}
                </button>
              </form>
            </div>
          </ViewportLayer>
        )}
      </div>
    </AppShell>
  );
}
