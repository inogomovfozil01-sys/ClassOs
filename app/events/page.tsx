"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
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
import { canManageEvents } from "@/lib/auth/rbac";
import {
  localDate,
  formatDay,
  addDays,
  monday,
  agendaOnDate,
} from "@/lib/diary";
import { request, json } from "@/components/tables/model";
const labels = {
  lesson: "Урок",
  homework: "Домашнее задание",
  exam: "Контрольная",
  event: "Событие",
};
export default function EventsPage() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useDiary();
  const canCreate = canManageEvents(user?.role);
  const [selected, setSelected] = useState(localDate(new Date()));
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: localDate(new Date()),
    time: "",
    location: "",
    rsvpEnabled: true,
  });
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const date = q.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSelected(date);
      setForm((f) => ({ ...f, date }));
    }
    if (q.get("action") === "create" && canCreate) setOpen(true);
  }, [canCreate]);
  useEffect(() => {
    if (!data) return;
    const id = new URLSearchParams(location.search).get("event");
    if (id)
      document
        .getElementById("event-" + id)
        ?.scrollIntoView({ block: "center" });
  }, [data]);
  const date = new Date(selected + "T12:00:00");
  const week = monday(date);
  const items = data
    ? agendaOnDate(data, date).filter(
        (i) => filter === "all" || i.kind === filter,
      )
    : [];
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request("/api/events", json("POST", form));
      setOpen(false);
      setSelected(form.date);
      setFilter("all");
      setForm({ ...form, title: "", description: "", location: "" });
      await refresh();
      toast.success("Событие добавлено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }
  async function rsvp(id: string, status: string) {
    setRsvpBusy(id);
    try {
      await request(`/api/events/${id}/rsvp`, json("POST", { status }));
      await refresh();
      toast.success("Ответ сохранён");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось сохранить ответ",
      );
    } finally {
      setRsvpBusy("");
    }
  }
  return (
    <AppShell title="События">
      <PageHeader
        title="События и календарь"
        description="Уроки, сроки заданий и дела класса — по дням."
        actions={
          canCreate && (
            <button
              className="button primary"
              onClick={() => {
                setForm((f) => ({ ...f, date: selected }));
                setOpen(true);
              }}
            >
              <Plus size={16} />
              Добавить событие
            </button>
          )
        }
      />
      <div className="agenda-toolbar">
        <div className="flex items-center gap-2">
          <button
            className="icon-button"
            aria-label="Предыдущая неделя"
            onClick={() => setSelected(localDate(addDays(date, -7)))}
          >
            <ChevronLeft size={17} />
          </button>
          <strong>
            {formatDay(week)} — {formatDay(addDays(week, 6))}
          </strong>
          <button
            className="icon-button"
            aria-label="Следующая неделя"
            onClick={() => setSelected(localDate(addDays(date, 7)))}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            aria-label="Дата календаря"
            value={selected}
            onChange={(e) => e.target.value && setSelected(e.target.value)}
          />
          <button
            className="button"
            onClick={() => setSelected(localDate(new Date()))}
          >
            Сегодня
          </button>
        </div>
      </div>
      <div className="agenda-week" aria-label="Дни недели">
        {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((d) => (
          <button
            key={localDate(d)}
            aria-pressed={localDate(d) === selected}
            onClick={() => setSelected(localDate(d))}
          >
            <span>{d.toLocaleDateString("ru-RU", { weekday: "short" })}</span>
            <strong>{d.getDate()}</strong>
            <i
              className={
                data && agendaOnDate(data, d).length ? "has-items" : ""
              }
            />
          </button>
        ))}
      </div>
      <div className="content-tabs" role="tablist" aria-label="Тип события">
        {[
          ["all", "Всё"],
          ["lesson", "Уроки"],
          ["homework", "ДЗ"],
          ["exam", "Контрольные"],
          ["event", "Мероприятия"],
        ].map(([v, l]) => (
          <button
            key={v}
            role="tab"
            aria-selected={filter === v}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <h2 className="text-sm font-semibold mb-4">
        {formatDay(date)} ·{" "}
        {date.toLocaleDateString("ru-RU", { weekday: "long" })}
      </h2>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : !items.length ? (
        <EmptyState
          title="На этот день записей нет"
          description="Выберите другой день или тип записи."
        />
      ) : (
        <div className="agenda-list">
          {items.map((item) => (
            <article
              key={item.id}
              id={item.kind === "event" ? "event-" + item.source.id : undefined}
              className={`agenda-row ${item.cancelled ? "is-cancelled" : ""}`}
            >
              <time>{item.time || "В течение дня"}</time>
              <div className="min-w-0">
                <small className="eyebrow">{labels[item.kind]}</small>
                {item.kind === "event" ? (
                  <h3>{item.title}</h3>
                ) : (
                  <Link className="agenda-title" href={item.href}>
                    {item.title} →
                  </Link>
                )}
                <p>{item.detail}</p>
                {item.kind === "event" && (
                  <>
                    <p className="whitespace-pre-wrap mt-2">
                      {item.source.description}
                    </p>
                    {item.source.rsvpEnabled && (
                      <div className="mt-4">
                        <div className="segmented w-fit flex-wrap">
                          {[
                            ["GOING", "Пойду"],
                            ["NOT_GOING", "Не пойду"],
                            ["UNSURE", "Не уверен"],
                          ].map(([v, l]) => (
                            <button
                              key={v}
                              disabled={rsvpBusy === item.source.id}
                              aria-pressed={item.source.userRsvp === v}
                              onClick={() => rsvp(item.source.id, v)}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2">
                          {item.source.counts?.going || 0} идут ·{" "}
                          {item.source.counts?.unsure || 0} думают
                        </p>
                      </div>
                    )}
                  </>
                )}
                {item.cancelled && item.source.note && (
                  <p className="text-warning">{item.source.note}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <Sheet
        open={open}
        onOpenChange={(v) => !busy && setOpen(v)}
        title="Новое событие"
        description="Укажите дату и детали для участников класса."
      >
        <form onSubmit={save} className="form-stack">
          <label className="field">
            Название
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              Дата
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="field">
              Время
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            Место
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label className="field">
            Описание
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.rsvpEnabled}
              onChange={(e) =>
                setForm({ ...form, rsvpEnabled: e.target.checked })
              }
            />
            Собирать ответы об участии
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Сохранение…" : "Добавить событие"}
          </button>
        </form>
      </Sheet>
    </AppShell>
  );
}
