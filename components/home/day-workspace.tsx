"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { EmptyState, Skeleton } from "@/components/ui/workspace";
import { useDiary } from "@/components/diary/use-diary";
import { DiaryLesson } from "@/components/diary/diary-lesson";
import { HomeworkRow } from "@/components/diary/homework-row";
import { StoriesSection } from "@/components/profile/stories-section";
import {
  lessonsOnDate,
  localDate,
  addDays,
  formatDay,
  agendaOnDate,
} from "@/lib/diary";
import {
  Calendar,
  Clock,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  Users,
  School,
  Sun,
  Moon,
  CloudSun,
  Bell,
  CheckSquare,
} from "lucide-react";

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

  const currentHour = date.getHours();
  const isMorning = currentHour >= 5 && currentHour < 12;
  const isDay = currentHour >= 12 && currentHour < 18;
  const greeting = isMorning
    ? "Доброе утро"
    : isDay
      ? "Добрый день"
      : "Добрый вечер";

  const GreetingIcon = isMorning ? Sun : isDay ? CloudSun : Moon;

  const timeline = data
    ? agendaOnDate(data, date).filter((item) => today || item.kind !== "lesson")
    : [];

  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return (
    <AppShell title={today ? "Сегодня" : "Главная"}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ========================================================
            HERO GREETING BANNER
            ======================================================== */}
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-border shadow-xl p-6 sm:p-8 bg-gradient-to-br from-accent/15 via-purple-600/10 to-sky-500/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/80 backdrop-blur-md border border-border text-[11px] font-semibold text-foreground-muted">
                  <School size={13} className="text-accent" />
                  <span>7-«Б» класс · Школа №180</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Учебный день</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                <GreetingIcon className="text-accent shrink-0" size={28} />
                <span>
                  {today
                    ? `Сегодня, ${formatDay(date)}`
                    : `${greeting}${user?.firstName ? ", " + user.firstName : ""}!`}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-foreground-muted capitalize">
                {formattedDate}
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="flex-1 sm:flex-none p-3.5 rounded-2xl bg-surface/80 backdrop-blur-md border border-border text-center sm:text-left min-w-[110px]">
                <p className="text-[11px] text-foreground-muted">Уроков</p>
                <p className="text-xl font-bold text-foreground">{lessons.length}</p>
              </div>

              <div className="flex-1 sm:flex-none p-3.5 rounded-2xl bg-surface/80 backdrop-blur-md border border-border text-center sm:text-left min-w-[110px]">
                <p className="text-[11px] text-foreground-muted">Заданий</p>
                <p className="text-xl font-bold text-accent">{homework.length}</p>
              </div>

              {exams.length > 0 && (
                <div className="flex-1 sm:flex-none p-3.5 rounded-2xl bg-surface/80 backdrop-blur-md border border-border text-center sm:text-left min-w-[110px]">
                  <p className="text-[11px] text-foreground-muted">Контрольных</p>
                  <p className="text-xl font-bold text-amber-400">{exams.length}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="relative z-10 flex items-center gap-2 pt-5 mt-5 border-t border-border/60 overflow-x-auto no-scrollbar">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border text-xs font-semibold text-foreground transition-colors shrink-0 shadow-sm"
            >
              <Calendar size={13} className="text-accent" />
              <span>Расписание</span>
            </Link>

            <Link
              href="/homework"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border text-xs font-semibold text-foreground transition-colors shrink-0 shadow-sm"
            >
              <BookOpen size={13} className="text-purple-400" />
              <span>Задания ({homework.length})</span>
            </Link>

            <Link
              href="/chats"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border text-xs font-semibold text-foreground transition-colors shrink-0 shadow-sm"
            >
              <MessageSquare size={13} className="text-sky-400" />
              <span>Чат класса</span>
            </Link>

            <Link
              href="/members"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border text-xs font-semibold text-foreground transition-colors shrink-0 shadow-sm"
            >
              <Users size={13} className="text-emerald-400" />
              <span>Одноклассники</span>
            </Link>
          </div>
        </div>

        {/* Stories of 7-«Б» Class (Instagram / Telegram style) */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-border shadow-lg">
          <StoriesSection currentUser={user} />
        </div>

        {error ? (
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : loading || !data ? (
          <Skeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ========================================================
                LEFT COLUMN (2/3): NEXT LESSON + TODAY'S SCHEDULE
                ======================================================== */}
            <div className="lg:col-span-2 space-y-6">
              {/* Next Lesson Featured Card */}
              {next && (
                <div className="next-lesson">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="eyebrow">
                      <Clock size={13} />
                      <span>{next.startTime <= now ? "Сейчас идёт" : "Следующий урок"}</span>
                    </span>

                    <span className="text-xs px-2.5 py-1 rounded-full bg-surface/80 border border-border font-semibold text-accent">
                      {next.startTime} – {next.endTime}
                    </span>
                  </div>

                  <Link href={`/subjects/${next.subjectId}`} className="block">
                    {next.subject.name}
                  </Link>

                  <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted">
                    {next.classroom && (
                      <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-medium">
                        Кабинет {next.classroom.number}
                      </span>
                    )}
                    {next.teacher && (
                      <span>
                        Учитель: {next.teacher.lastName} {next.teacher.firstName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Today's Schedule Card */}
              <div className="glass-panel p-6 rounded-3xl border border-border space-y-4 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Calendar size={18} className="text-accent" />
                      <span>Расписание на сегодня</span>
                    </h2>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {lessons.length} {lessons.length === 1 ? "урок" : lessons.length < 5 ? "урока" : "уроков"} в расписании
                    </p>
                  </div>

                  <Link
                    href="/schedule"
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
                  >
                    <span>Вся неделя</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {lessons.length ? (
                  <div className="space-y-2 pt-1">
                    {lessons.map((l, i) => (
                      <DiaryLesson
                        key={l.id}
                        lesson={l}
                        index={i}
                        date={date}
                        homework={data.homework}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="На сегодня уроков нет"
                    description="Отличный повод повторить пройденный материал или отдохнуть."
                    action={
                      <Link className="button primary mt-2" href="/schedule">
                        Открыть расписание на неделю
                      </Link>
                    }
                  />
                )}
              </div>

              {/* Day Timeline Events (if any) */}
              {timeline.length > 0 && (
                <div className="glass-panel p-6 rounded-3xl border border-border space-y-4 shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Sparkles size={18} className="text-purple-400" />
                      <span>{today ? "Повестка дня" : "Другие дела сегодня"}</span>
                    </h2>

                    <Link
                      href="/events"
                      className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                      <span>Календарь</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {timeline.map((t) => (
                      <Link className="day-event" key={t.id} href={t.href}>
                        <time>{t.time || "Весь день"}</time>
                        <div className="min-w-0 flex-1">
                          <small>{t.detail}</small>
                          <strong>{t.title}</strong>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================
                RIGHT COLUMN (1/3): HOMEWORK + EXAMS + ANNOUNCEMENTS
                ======================================================== */}
            <div className="space-y-6">
              {/* Homework Card */}
              <div className="glass-panel p-6 rounded-3xl border border-border space-y-4 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <BookOpen size={18} className="text-accent" />
                    <span>Домашние задания</span>
                  </h2>

                  <Link
                    href="/homework"
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <span>Все ({homework.length})</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {homework.length ? (
                  <div className="space-y-2">
                    {homework.slice(0, 5).map((h) => (
                      <HomeworkRow key={h.id} homework={h} />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border text-center space-y-1.5">
                    <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">
                      Все задания выполнены!
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      На ближайшую неделю невыполненных уроков нет
                    </p>
                  </div>
                )}
              </div>

              {/* Upcoming Exams Card */}
              <div className="glass-panel p-6 rounded-3xl border border-border space-y-4 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CheckSquare size={18} className="text-amber-400" />
                    <span>Контрольные работы</span>
                  </h2>

                  <Link
                    href="/tests"
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <span>Все</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {exams.length ? (
                  <div className="space-y-2">
                    {exams.map((e) => (
                      <Link href="/tests" key={e.id} className="subtle-row">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-xs text-foreground truncate">
                            {e.subject?.name} · {e.title}
                          </strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold shrink-0">
                            {formatDay(e.date)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-foreground-muted text-center py-2">
                    Контрольные пока не запланированы
                  </p>
                )}
              </div>

              {/* Important Announcements Card */}
              <div className="glass-panel p-6 rounded-3xl border border-border space-y-4 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Bell size={18} className="text-sky-400" />
                    <span>Важные объявления</span>
                  </h2>

                  <Link
                    href="/news"
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <span>Новости</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {lessons
                  .filter((l) => l.modified)
                  .map((l) => (
                    <Link
                      href={`/schedule?date=${key}`}
                      className="subtle-row bg-amber-500/5 border-amber-500/20"
                      key={l.id}
                    >
                      <strong className="text-amber-400 flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        <span>
                          {l.cancelled ? "Отмена урока" : "Замена"} · {l.subject.name}
                        </span>
                      </strong>
                      <p className="text-foreground-muted">
                        {l.note || `${l.startTime} — ${l.endTime}`}
                      </p>
                    </Link>
                  ))}

                {important ? (
                  <Link
                    href={`/news?post=${important.id}`}
                    className="subtle-row"
                  >
                    <strong className="truncate block">{important.title}</strong>
                    <p className="line-clamp-2 text-foreground-muted mt-1">
                      {important.content}
                    </p>
                  </Link>
                ) : (
                  <p className="text-xs text-foreground-muted text-center py-2">
                    Свежих объявлений пока нет
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
