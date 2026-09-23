export type Subject = {
  id: string;
  name: string;
  shortName?: string;
  teacher?: Teacher | null;
  defaultClassroom?: { id: string; number: string } | null;
  description?: string;
};
export type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  subjectName?: string;
  notes?: string;
  subjects?: Subject[];
  user?: { id: string } | null;
};
export type Lesson = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subject: Subject;
  teacherId?: string;
  teacher?: Teacher | null;
  classroomId?: string;
  classroom?: { id: string; number: string } | null;
  cancelled?: boolean;
  modified?: boolean;
  note?: string;
};
export type Homework = {
  id: string;
  subjectId: string;
  subject: Subject;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  personalStatus: string;
  createdBy?: { firstName: string; lastName: string };
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }[];
};
export type Exception = {
  id: string;
  date: string;
  lessonId?: string;
  action: string;
  subjectId?: string;
  teacherId?: string;
  classroomId?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  createdAt: string;
};
export type DiaryData = {
  lessons: Lesson[];
  homework: Homework[];
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: { id: string; number: string }[];
  exceptions: Exception[];
  exams: any[];
  events: any[];
  posts: any[];
};
export const localDate = (date: Date | string) => {
  const d =
    typeof date === "string"
      ? new Date(date.length === 10 ? date + "T12:00:00" : date)
      : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
export function monday(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}
export const formatDay = (date: Date | string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(
    typeof date === "string" ? new Date(date) : date,
  );
export function homeworkForLesson(
  homework: Homework[],
  subjectId: string,
  date: Date,
) {
  return homework.filter(
    (h) =>
      h.subjectId === subjectId && localDate(h.dueDate) === localDate(date),
  );
}
export function lessonsOnDate(data: DiaryData, date: Date): Lesson[] {
  const key = localDate(date);
  const weekday = date.getDay() || 7;
  const changes = data.exceptions
    .filter((e) => e.date === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const apply = (base: Lesson, e?: Exception): Lesson =>
    !e
      ? base
      : {
          ...base,
          subjectId: e.subjectId || base.subjectId,
          subject:
            data.subjects.find((s) => s.id === e.subjectId) || base.subject,
          teacher:
            data.teachers.find((t) => t.id === e.teacherId) || base.teacher,
          classroom:
            data.classrooms.find((r) => r.id === e.classroomId) ||
            base.classroom,
          startTime: e.startTime || base.startTime,
          endTime: e.endTime || base.endTime,
          cancelled: e.action === "CANCELLED",
          modified: true,
          note: e.note,
        };
  const lessons = data.lessons
    .filter((l) => l.dayOfWeek === weekday)
    .map((l) =>
      apply(
        l,
        changes.find((e) => e.lessonId === l.id),
      ),
    );
  for (const e of changes.filter((e) => e.action === "EXTRA" && !e.lessonId)) {
    const subject = data.subjects.find((s) => s.id === e.subjectId);
    if (subject && e.startTime && e.endTime)
      lessons.push(
        apply(
          {
            id: e.id,
            dayOfWeek: weekday,
            subjectId: subject.id,
            subject,
            startTime: e.startTime,
            endTime: e.endTime,
          },
          e,
        ),
      );
  }
  return lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export function nextLesson(
  data: DiaryData,
  subjectId: string,
  now = new Date(),
) {
  for (let offset = 0; offset < 14; offset++) {
    const date = addDays(now, offset);
    const time = now.toTimeString().slice(0, 5);
    const lesson = lessonsOnDate(data, date).find(
      (l) =>
        l.subjectId === subjectId &&
        !l.cancelled &&
        (offset > 0 || l.endTime > time),
    );
    if (lesson) return { lesson, date };
  }
  return null;
}

export type AgendaItem = {
  id: string;
  kind: "lesson" | "homework" | "exam" | "event";
  title: string;
  time: string;
  detail: string;
  href: string;
  cancelled?: boolean;
  source: any;
};
export function agendaOnDate(data: DiaryData, date: Date): AgendaItem[] {
  const key = localDate(date);
  const items: AgendaItem[] = lessonsOnDate(data, date).map((l) => ({
    id: "lesson:" + l.id,
    kind: "lesson",
    title: l.subject.name,
    time: l.startTime,
    detail: `${l.startTime}–${l.endTime}${l.classroom ? " · Каб. " + l.classroom.number : ""}${l.cancelled ? " · Отменён" : ""}`,
    href: `/schedule?date=${key}`,
    cancelled: l.cancelled,
    source: l,
  }));
  data.homework
    .filter((h) => localDate(h.dueDate) === key)
    .forEach((h) =>
      items.push({
        id: "homework:" + h.id,
        kind: "homework",
        title: h.title,
        time: "",
        detail: `Срок ДЗ · ${h.subject.name}`,
        href: "/homework/" + h.id,
        source: h,
      }),
    );
  data.exams
    .filter((e) => localDate(e.date) === key)
    .forEach((e) => {
      const d = new Date(e.date);
      const time =
        d.getUTCHours() === 0 && d.getUTCMinutes() === 0
          ? ""
          : d.toTimeString().slice(0, 5);
      items.push({
        id: "exam:" + e.id,
        kind: "exam",
        title: e.title,
        time,
        detail: `Контрольная · ${e.subject?.name || ""}`,
        href: "/tests?exam=" + e.id,
        source: e,
      });
    });
  data.events
    .filter((e) => localDate(e.date) === key)
    .forEach((e) =>
      items.push({
        id: "event:" + e.id,
        kind: "event",
        title: e.title,
        time: e.time || "",
        detail: e.location || "Событие класса",
        href: `/events?date=${key}&event=${e.id}`,
        source: e,
      }),
    );
  return items.sort(
    (a, b) =>
      (a.time || "99:99").localeCompare(b.time || "99:99") ||
      a.id.localeCompare(b.id),
  );
}
