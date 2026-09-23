"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CalendarDays,
} from "lucide-react";
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
import { LessonDialog } from "@/components/schedule/lesson-dialog";
import { ScheduleExceptionDialog } from "@/components/schedule/schedule-exception-dialog";
import { useDiary } from "@/components/diary/use-diary";
import { DiaryLesson } from "@/components/diary/diary-lesson";
import {
  Lesson,
  addDays,
  monday,
  formatDay,
  lessonsOnDate,
  localDate,
} from "@/lib/diary";
import { request } from "@/components/tables/model";
const days = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];
export default function SchedulePage() {
  const { user } = useAuth();
  const canEdit = isLeaderOrHigher(user?.role);
  const { data, error, loading, refresh } = useDiary();
  const [week, setWeek] = useState(monday(new Date()));
  const [day, setDay] = useState(Math.min((new Date().getDay() + 6) % 7, 5));
  const [editing, setEditing] = useState(false);
  const [add, setAdd] = useState(false);
  const [addDay, setAddDay] = useState(1);
  const [time, setTime] = useState("08:00");
  const [exception, setException] = useState(false);
  const [exceptionDate, setExceptionDate] = useState(localDate(new Date()));
  const [exceptionLesson, setExceptionLesson] = useState<Lesson | null>(null);
  const [remove, setRemove] = useState<Lesson | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const date = query.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parsed = new Date(date + "T12:00:00");
      setWeek(monday(parsed));
      setDay(Math.min((parsed.getDay() + 6) % 7, 5));
    }
    if (canEdit && query.get("action")) {
      setEditing(true);
      if (query.get("action") === "exception") setException(true);
      else {
        setAddDay(new Date().getDay() || 1);
        setAdd(true);
      }
    }
  }, [canEdit]);
  const dates = days.map((_, i) => addDays(week, i));
  function openAdd(d: number) {
    setAddDay(d);
    const last = data?.lessons
      .filter((l) => l.dayOfWeek === d)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .at(-1);
    setTime(last?.endTime || "08:00");
    setAdd(true);
  }
  async function deleteLesson() {
    if (!remove) return;
    setBusy(true);
    try {
      await request(`/api/schedule?id=${remove.id}`, { method: "DELETE" });
      setRemove(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setBusy(false);
    }
  }
  const renderDay = (date: Date, index: number) => {
    if (!data) return null;
    const lessons = lessonsOnDate(data, date);
    return (
      <>
        {lessons.map((l, i) => (
          <DiaryLesson
            key={l.id}
            lesson={l}
            index={i}
            date={date}
            homework={data.homework}
            actions={
              canEdit &&
              editing && (
                <>
                  <button
                    className="text-xs text-foreground-muted"
                    onClick={() => {
                      setExceptionLesson(l);
                      setExceptionDate(localDate(date));
                      setException(true);
                    }}
                  >
                    Изменить на дату
                  </button>
                  {data.lessons.some((base) => base.id === l.id) && (
                    <button
                      className="icon-button ml-auto"
                      aria-label={`Удалить ${l.subject.name}`}
                      onClick={() => setRemove(l)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )
            }
          />
        ))}
        {!lessons.length && (
          <p className="text-xs text-foreground-muted py-8">
            Уроки не добавлены
          </p>
        )}
        {canEdit && editing && (
          <button
            className="button w-full mt-3"
            onClick={() => openAdd(index + 1)}
          >
            <Plus size={14} />
            Добавить урок
          </button>
        )}
      </>
    );
  };
  return (
    <AppShell title="Расписание">
      <PageHeader
        title="Расписание"
        description="Уроки, домашние задания и изменения на выбранную неделю."
        actions={
          canEdit && (
            <div className="segmented">
              <button aria-pressed={!editing} onClick={() => setEditing(false)}>
                Просмотр
              </button>
              <button aria-pressed={editing} onClick={() => setEditing(true)}>
                Редактирование
              </button>
            </div>
          )
        }
      />
      <div className="week-toolbar">
        <div className="flex items-center gap-2">
          <button
            className="icon-button"
            aria-label="Предыдущая неделя"
            onClick={() => setWeek(addDays(week, -7))}
          >
            <ChevronLeft size={17} />
          </button>
          <strong>
            {week.getDate()} — {formatDay(dates[5])}
          </strong>
          <button
            className="icon-button"
            aria-label="Следующая неделя"
            onClick={() => setWeek(addDays(week, 7))}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <button
          className="button"
          onClick={() => {
            setWeek(monday(new Date()));
            setDay(Math.min((new Date().getDay() + 6) % 7, 5));
          }}
        >
          Текущая неделя
        </button>
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : (
        data && (
          <>
            {!data.lessons.length && !data.exceptions.length && (
              <EmptyState
                title="Расписание ещё не заполнено"
                description={
                  canEdit
                    ? "Добавьте первый урок. Предмет, учителя и кабинет можно создать сразу в форме."
                    : "Расписание появится, когда лидер класса добавит уроки."
                }
                action={
                  canEdit && (
                    <button
                      className="button primary"
                      onClick={() => openAdd(day + 1)}
                    >
                      <Plus size={15} />
                      Добавить урок
                    </button>
                  )
                }
              />
            )}
            <div className="week-columns hidden lg:grid">
              {dates.map((date, i) => (
                <section
                  key={i}
                  className={`week-day ${localDate(date) === localDate(new Date()) ? "is-today" : ""}`}
                >
                  <header>
                    <span>{days[i]}</span>
                    <strong>{date.getDate()}</strong>
                  </header>
                  {renderDay(date, i)}
                </section>
              ))}
            </div>
            <div className="lg:hidden">
              <div className="day-tabs" role="tablist" aria-label="День недели">
                {dates.map((date, i) => (
                  <button
                    role="tab"
                    key={i}
                    aria-selected={day === i}
                    onClick={() => setDay(i)}
                  >
                    {days[i].slice(0, 2)}
                    <span className="block mt-1 text-[11px]">
                      {date.getDate()}
                    </span>
                  </button>
                ))}
              </div>
              <h2 className="text-sm font-semibold mb-2">
                {days[day]}, {formatDay(dates[day])}
              </h2>
              {renderDay(dates[day], day)}
            </div>
          </>
        )
      )}
      <LessonDialog
        isOpen={add}
        onClose={() => setAdd(false)}
        onSuccess={refresh}
        initialDay={addDay}
        initialTime={time}
      />
      <ScheduleExceptionDialog
        isOpen={exception}
        onClose={() => setException(false)}
        onSuccess={refresh}
        lesson={exceptionLesson}
        defaultDate={exceptionDate}
      />
      <Sheet
        open={!!remove}
        onOpenChange={(v) => !v && setRemove(null)}
        title="Удалить урок из расписания?"
        description="Урок будет удалён из еженедельного шаблона. Для отмены только на одну дату используйте «Изменить на дату»."
      >
        <div className="form-actions">
          <button className="button" onClick={() => setRemove(null)}>
            Отмена
          </button>
          <button
            className="button danger"
            disabled={busy}
            onClick={deleteLesson}
          >
            Удалить
          </button>
        </div>
      </Sheet>
    </AppShell>
  );
}
