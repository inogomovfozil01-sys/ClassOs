"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Skeleton, EmptyState } from "@/components/ui/workspace";
import { useDiary } from "@/components/diary/use-diary";
import { HomeworkRow } from "@/components/diary/homework-row";
import { FileCard } from "@/components/media/file-card";
import { nextLesson, formatDay, localDate } from "@/lib/diary";
import { request } from "@/components/tables/model";
import { useAuth } from "@/components/providers/auth-context";
import { canPublishHomework } from "@/lib/auth/rbac";
export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, error, loading } = useDiary();
  const [tab, setTab] = useState("overview");
  const [files, setFiles] = useState<any[]>([]);
  useEffect(() => {
    request(`/api/files?subjectId=${id}`)
      .then((d) =>
        setFiles((d.files || []).filter((f: any) => f.subjectId === id)),
      )
      .catch(() => {});
  }, [id]);
  const subject = data?.subjects.find((s) => s.id === id);
  const next = data ? nextLesson(data, id) : null;
  const homework = data?.homework.filter((h) => h.subjectId === id) || [];
  const exams = data?.exams.filter((e) => e.subjectId === id) || [];
  const attachments = homework.flatMap((h) => h.attachments);
  return (
    <AppShell title={subject?.name || "Предмет"}>
      <Link
        href="/subjects"
        className="inline-flex gap-2 items-center text-xs text-foreground-muted mb-6"
      >
        <ArrowLeft size={14} />
        Все предметы
      </Link>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : !subject ? (
        <EmptyState title="Предмет не найден" />
      ) : (
        <>
          <PageHeader
            title={subject.name}
            description={subject.description}
            actions={
              canPublishHomework(user?.role) && (
                <Link
                  href={`/homework?action=create&subject=${id}`}
                  className="button primary"
                >
                  <Plus size={15} />
                  Добавить ДЗ
                </Link>
              )
            }
          />
          <div className="subject-facts">
            <div>
              <small>Учитель</small>
              <strong>
                {subject.teacher
                  ? `${subject.teacher.lastName} ${subject.teacher.firstName} ${subject.teacher.middleName || ""}`
                  : "Не назначен"}
              </strong>
            </div>
            <div>
              <small>Кабинет</small>
              <strong>
                {subject.defaultClassroom?.number ||
                  next?.lesson.classroom?.number ||
                  "Не указан"}
              </strong>
            </div>
            <div>
              <small>Ближайший урок</small>
              <strong>
                {next
                  ? `${formatDay(next.date)} · ${next.lesson.startTime}`
                  : "Расписание ещё не заполнено"}
              </strong>
            </div>
          </div>
          <div
            className="content-tabs"
            role="tablist"
            aria-label="Раздел предмета"
          >
            {[
              ["overview", "Обзор"],
              ["homework", "ДЗ"],
              ["materials", "Материалы"],
              ["exams", "Контрольные"],
            ].map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "overview" && (
            <div className="home-layout">
              <section>
                <h2 className="text-sm font-semibold mb-3">
                  Актуальные задания
                </h2>
                {homework.filter(
                  (h) =>
                    h.personalStatus !== "DONE" &&
                    localDate(h.dueDate) >= localDate(new Date()),
                ).length ? (
                  homework
                    .filter(
                      (h) =>
                        h.personalStatus !== "DONE" &&
                        localDate(h.dueDate) >= localDate(new Date()),
                    )
                    .slice(0, 5)
                    .map((h) => <HomeworkRow homework={h} key={h.id} />)
                ) : (
                  <EmptyState title="Актуальных заданий нет" />
                )}
              </section>
              <section>
                <h2 className="text-sm font-semibold mb-3">Занятия</h2>
                {next ? (
                  <Link
                    className="subtle-row"
                    href={`/schedule?date=${localDate(next.date)}`}
                  >
                    <strong>
                      {formatDay(next.date)} · {next.lesson.startTime}–
                      {next.lesson.endTime}
                    </strong>
                    <p>Открыть расписание →</p>
                  </Link>
                ) : (
                  <p className="text-xs text-foreground-muted">
                    Уроки пока не добавлены.
                  </p>
                )}
              </section>
            </div>
          )}
          {tab === "homework" &&
            (homework.length ? (
              homework.map((h) => <HomeworkRow key={h.id} homework={h} />)
            ) : (
              <EmptyState title="Домашних заданий пока нет" />
            ))}
          {tab === "materials" && (
            <div className="space-y-3">
              {files.map((f) => (
                <FileCard
                  key={f.id}
                  name={f.name}
                  url={`/api/files/${f.id}`}
                  size={f.size}
                  mimeType={f.mimeType}
                />
              ))}
              {attachments.map((a) => (
                <FileCard
                  key={a.id}
                  name={a.fileName}
                  url={a.fileUrl}
                  size={a.fileSize}
                  mimeType={a.mimeType}
                />
              ))}
              {!files.length && !attachments.length && (
                <EmptyState
                  title="Материалы ещё не добавлены"
                  description="Здесь собраны файлы предмета и вложения к его заданиям."
                />
              )}
              {canPublishHomework(user?.role) && (
                <Link
                  className="button"
                  href={`/files?subject=${id}&action=upload`}
                >
                  Добавить материал
                </Link>
              )}
            </div>
          )}
          {tab === "exams" &&
            (exams.length ? (
              exams.map((e) => (
                <Link href="/tests" key={e.id} className="subtle-row">
                  <strong>{e.title}</strong>
                  <p>
                    {formatDay(e.date)} · {e.topics || "Темы не указаны"}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState title="Контрольные пока не запланированы" />
            ))}
        </>
      )}
    </AppShell>
  );
}
