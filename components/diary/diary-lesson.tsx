"use client";
import Link from "next/link";
import { Lesson, Homework, homeworkForLesson } from "@/lib/diary";
export function DiaryLesson({
  lesson,
  index,
  date,
  homework,
  actions,
}: {
  lesson: Lesson;
  index: number;
  date: Date;
  homework: Homework[];
  actions?: React.ReactNode;
}) {
  const assignments = homeworkForLesson(homework, lesson.subjectId, date);
  return (
    <article className={`diary-lesson ${lesson.cancelled ? "cancelled" : ""}`}>
      <div className="diary-lesson-time">
        <span>{index + 1}</span>
        <time>
          {lesson.startTime}
          <small>{lesson.endTime}</small>
        </time>
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/subjects/${lesson.subjectId}`} className="lesson-subject">
          {lesson.subject.name}
        </Link>
        <p className="lesson-meta">
          {[
            lesson.teacher &&
              `${lesson.teacher.lastName} ${lesson.teacher.firstName}`,
            lesson.classroom && `Каб. ${lesson.classroom.number}`,
          ]
            .filter(Boolean)
            .join(" · ") || "Учитель и кабинет не указаны"}
        </p>
        {lesson.modified && (
          <p className="text-xs text-warning mt-2">
            {lesson.cancelled ? "Урок отменён" : "Изменение расписания"}
            {lesson.note ? ` · ${lesson.note}` : ""}
          </p>
        )}
        {!lesson.cancelled &&
          (assignments.length ? (
            assignments.map((h) => (
              <Link
                href={`/homework/${h.id}`}
                key={h.id}
                className="lesson-homework"
              >
                <span>ДЗ</span>
                {h.title}
                <span className="ml-auto">→</span>
              </Link>
            ))
          ) : (
            <p className="text-[11px] text-foreground-muted mt-2">
              На эту дату ДЗ не задано
            </p>
          ))}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}
