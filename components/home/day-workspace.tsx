"use client";
import Link from "next/link";
import { ArrowRight, CalendarDays, BookOpen, CalendarCheck, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import { useDiary } from "@/components/diary/use-diary";
import { DiaryLesson } from "@/components/diary/diary-lesson";
import { HomeworkRow } from "@/components/diary/homework-row";
import { StoriesSection } from "@/components/profile/stories-section";
import { lessonsOnDate, localDate, addDays, formatDay, agendaOnDate } from "@/lib/diary";

export function DayWorkspace({ today = false }: { today?: boolean }) {
  const { user } = useAuth(); const { data, error, loading } = useDiary();
  const date = new Date(); const key = localDate(date);
  const lessons = data ? lessonsOnDate(data, date) : [];
  const next = lessons.find(l => !l.cancelled && l.endTime > date.toTimeString().slice(0, 5));
  const homework = data?.homework.filter(h => localDate(h.dueDate) >= key && localDate(h.dueDate) <= localDate(addDays(date, 7)) && h.personalStatus !== "DONE") || [];
  const exams = data?.exams.filter(e => localDate(e.date) >= key).slice(0, 3) || [];
  const important = data?.posts.find(p => p.isPinned) || data?.posts[0];
  const timeline = data ? agendaOnDate(data, date).filter(item => item.kind !== "lesson") : [];
  const title = today ? "Сегодня" : `Здравствуйте${user?.firstName ? `, ${user.firstName}` : ""}`;
  return <AppShell title={today ? "Сегодня" : "Обзор"}><div className="dashboard">
    <PageHeader title={title} description={new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(date)} actions={<Link href="/chats" className="button"><MessageSquare size={16} />Чат класса</Link>} />
    {loading ? <Skeleton /> : error || !data ? <EmptyState title="Не удалось загрузить день" description={error || "Попробуйте обновить страницу"} /> : <>
      <div className="dashboard-metrics">
        {[{ href: "/schedule", label: "Уроки сегодня", value: lessons.filter(l => !l.cancelled).length, icon: CalendarDays }, { href: "/homework", label: "Задания на неделю", value: homework.length, icon: BookOpen }, { href: "/tests", label: "Ближайшие контрольные", value: exams.length, icon: CalendarCheck }].map(item => <Link href={item.href} className="dashboard-metric" key={item.href}><div><span>{item.label}</span><strong>{item.value}</strong></div><item.icon size={22} strokeWidth={1.5} /></Link>)}
      </div>
      <div className="dashboard-columns"><div className="dashboard-main">
        {next && <section className="dashboard-next"><div><p className="profile-eyebrow">{next.startTime <= date.toTimeString().slice(0, 5) ? "Сейчас идёт" : "Следующий урок"}</p><h2>{next.subject.name}</h2><p>{next.startTime}–{next.endTime}{next.classroom ? ` · Кабинет ${next.classroom.number}` : ""}</p></div><Link href={`/subjects/${next.subjectId}`} className="icon-button" aria-label="Открыть предмет"><ArrowRight size={17} /></Link></section>}
        <section className="dashboard-panel"><header><h2>Расписание на сегодня</h2><Link href="/schedule">Вся неделя <ArrowRight size={14} /></Link></header>{lessons.length ? lessons.map((lesson, index) => <DiaryLesson key={lesson.id} lesson={lesson} index={index} date={date} homework={data.homework} />) : <p className="dashboard-empty">На сегодня уроков нет.</p>}</section>
        <section className="dashboard-panel"><header><h2>Домашние задания</h2><Link href="/homework">Все задания <ArrowRight size={14} /></Link></header>{homework.length ? homework.slice(0, 5).map(h => <HomeworkRow key={h.id} homework={h} />) : <p className="dashboard-empty">Нет незавершённых заданий на ближайшую неделю.</p>}</section>
      </div><aside className="dashboard-aside">
        <section className="dashboard-panel"><header><h2>Объявления</h2><Link href="/news">Все</Link></header>{important ? <Link className="dashboard-announcement" href="/news"><p className="profile-eyebrow">{important.isPinned ? "Закреплено" : "Новости класса"}</p><h3>{important.title}</h3><p>{important.content?.slice(0, 240)}</p></Link> : <p className="dashboard-empty">Новых объявлений пока нет.</p>}</section>
        <section className="dashboard-panel"><header><h2>Ближайшие контрольные</h2></header>{exams.length ? exams.map(e => <Link className="dashboard-list-item" href="/tests" key={e.id}><span>{formatDay(e.date)}</span><strong>{e.title || e.subject?.name || "Контрольная работа"}</strong></Link>) : <p className="dashboard-empty">Контрольные пока не запланированы.</p>}</section>
        {timeline.length > 0 && <section className="dashboard-panel"><header><h2>Другие дела сегодня</h2></header>{timeline.map(t => <Link className="dashboard-list-item" key={t.id} href={t.href}><span>{t.time || "Сегодня"}</span><strong>{t.title}</strong></Link>)}</section>}
        <section className="dashboard-panel"><StoriesSection currentUser={user} /></section>
        <Link href="/albums" className="dashboard-album-link"><span><strong>Альбом класса</strong><small>Фотографии наших событий</small></span><ArrowRight size={18} /></Link>
      </aside></div>
    </>}
  </div></AppShell>;
}
