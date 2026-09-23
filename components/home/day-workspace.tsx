"use client";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui/workspace";
import { useDiary } from "@/components/diary/use-diary";
import { DiaryLesson } from "@/components/diary/diary-lesson";
import { HomeworkRow } from "@/components/diary/homework-row";
import {
  lessonsOnDate,
  localDate,
  addDays,
  formatDay,
  agendaOnDate,
} from "@/lib/diary";
export function DayWorkspace({ today = false }: { today?: boolean }) {
  const { user } = useAuth();
  const { data, error, loading } = useDiary();
  const date = new Date();
  const key = localDate(date);
  const lessons = data ? lessonsOnDate(data, date) : [];
  const now = date.toTimeString().slice(0, 5);
  const next = lessons.find((l) => !l.cancelled && l.endTime > now);
  const homework =
    data?.homework.filter(
      (h) =>
        localDate(h.dueDate) >= key &&
        localDate(h.dueDate) <= localDate(addDays(date, 7)) &&
        h.personalStatus !== "DONE",
    ) || [];
  const events = data?.events.filter((e) => localDate(e.date) === key) || [];
  const exams =
    data?.exams.filter((e) => localDate(e.date) >= key).slice(0, 3) || [];
  const important =
    data?.posts.find((p) => p.isPinned) ||
    data?.posts.find(
      (p) => p.category === "Срочно" || p.category === "Объявления",
    ) ||
    data?.posts[0];
  const greeting =
    date.getHours() < 12
      ? "Доброе утро"
      : date.getHours() < 18
        ? "Добрый день"
        : "Добрый вечер";
  const timeline = data
    ? agendaOnDate(data, date).filter((item) => today || item.kind !== "lesson")
    : [];
  return (
    <AppShell title={today ? "Сегодня" : "Главная"}>
      <PageHeader
        title={
          today
            ? `Сегодня, ${formatDay(date)}`
            : `${greeting}${user?.firstName ? ", " + user.firstName : ""}`
        }
        description={
          today
            ? "Уроки и все дела на сегодня"
            : new Intl.DateTimeFormat("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(date)
        }
      />
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="home-layout">
            <div>
              {next && (
                <div className="next-lesson">
                  <span className="eyebrow">
                    {next.startTime <= now ? "Сейчас идёт" : "Следующий урок"}
                  </span>
                  <Link href={`/subjects/${next.subjectId}`}>
                    {next.subject.name}
                  </Link>
                  <p>
                    {next.startTime}–{next.endTime}
                    {next.classroom ? ` · Каб. ${next.classroom.number}` : ""}
                  </p>
                </div>
              )}
              <section>
                <div className="section-heading">
                  <h2>Сегодня · расписание</h2>
                  <Link href="/schedule">Вся неделя →</Link>
                </div>
                {lessons.length ? (
                  lessons.map((l, i) => (
                    <DiaryLesson
                      key={l.id}
                      lesson={l}
                      index={i}
                      date={date}
                      homework={data.homework}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="На сегодня уроков нет"
                    description="Посмотрите расписание на другие дни."
                    action={
                      <Link className="button" href="/schedule">
                        Открыть расписание
                      </Link>
                    }
                  />
                )}
              </section>
              {timeline.length > 0 && (
                <section className="mt-8">
                  <div className="section-heading">
                    <h2>{today ? "Повестка дня" : "Другие дела сегодня"}</h2>
                    <Link href="/events">Календарь →</Link>
                  </div>
                  {timeline.map((t) => (
                    <Link className="day-event" key={t.id} href={t.href}>
                      <time>{t.time || "В течение дня"}</time>
                      <div>
                        <small>{t.detail}</small>
                        <strong>{t.title}</strong>
                      </div>
                    </Link>
                  ))}
                </section>
              )}
            </div>
            <div>
              <section>
                <div className="section-heading">
                  <h2>Домашние задания</h2>
                  <Link href="/homework">Все задания →</Link>
                </div>
                {homework.length ? (
                  homework
                    .slice(0, 5)
                    .map((h) => <HomeworkRow key={h.id} homework={h} />)
                ) : (
                  <p className="subtle-row text-xs text-foreground-muted">
                    На ближайшую неделю невыполненных заданий нет.
                  </p>
                )}
              </section>
              <section className="mt-8">
                <div className="section-heading">
                  <h2>Ближайшие контрольные</h2>
                  <Link href="/tests">Все →</Link>
                </div>
                {exams.length ? (
                  exams.map((e) => (
                    <Link href="/tests" key={e.id} className="subtle-row">
                      <strong>
                        {e.subject?.name} · {e.title}
                      </strong>
                      <p>{formatDay(e.date)}</p>
                    </Link>
                  ))
                ) : (
                  <p className="subtle-row text-xs text-foreground-muted">
                    Контрольные пока не запланированы.
                  </p>
                )}
              </section>
              <section className="mt-8">
                <div className="section-heading">
                  <h2>Важно</h2>
                  <Link href="/news">Новости →</Link>
                </div>
                {lessons
                  .filter((l) => l.modified)
                  .map((l) => (
                    <Link
                      href={`/schedule?date=${key}`}
                      className="subtle-row"
                      key={l.id}
                    >
                      <strong>
                        {l.cancelled ? "Отмена" : "Изменение"} ·{" "}
                        {l.subject.name}
                      </strong>
                      <p>{l.note || `${l.startTime} — ${l.endTime}`}</p>
                    </Link>
                  ))}
                {important ? (
                  <Link
                    href={`/news?post=${important.id}`}
                    className="subtle-row"
                  >
                    <strong>{important.title}</strong>
                    <p className="line-clamp-3">{important.content}</p>
                  </Link>
                ) : (
                  <p className="subtle-row text-xs text-foreground-muted">
                    Важных объявлений пока нет.
                  </p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
