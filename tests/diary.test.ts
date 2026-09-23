import { describe, it, expect } from "vitest";
import {
  addDays,
  monday,
  localDate,
  lessonsOnDate,
  homeworkForLesson,
  nextLesson,
  type DiaryData,
} from "../lib/diary";
const subject = { id: "math", name: "Математика" };
const data = (): DiaryData => ({
  subjects: [subject],
  teachers: [],
  classrooms: [],
  homework: [],
  exceptions: [],
  exams: [],
  events: [],
  posts: [],
  lessons: [
    {
      id: "lesson",
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "09:45",
      subjectId: "math",
      subject,
    },
  ],
});
describe("Diary dates and shared lesson state", () => {
  it("keeps Monday and date arithmetic correct across years", () => {
    expect(localDate(monday(new Date(2027, 0, 3, 12)))).toBe("2026-12-28");
    expect(localDate(addDays(new Date(2026, 11, 31, 12), 1))).toBe(
      "2027-01-01",
    );
  });
  it("matches homework by both subject and calendar date", () => {
    const hw = [
      { id: "a", subjectId: "math", dueDate: "2026-09-23T12:00:00" },
      { id: "b", subjectId: "math", dueDate: "2026-09-24T12:00:00" },
      { id: "c", subjectId: "other", dueDate: "2026-09-23T12:00:00" },
    ] as any;
    expect(
      homeworkForLesson(hw, "math", new Date(2026, 8, 23)).map((h) => h.id),
    ).toEqual(["a"]);
  });
  it("applies only the latest exception on its exact date", () => {
    const d = data();
    d.exceptions = [
      {
        id: "old",
        lessonId: "lesson",
        date: "2026-09-23",
        action: "MODIFIED",
        startTime: "10:00",
        createdAt: "2026-09-20",
      },
      {
        id: "new",
        lessonId: "lesson",
        date: "2026-09-23",
        action: "CANCELLED",
        createdAt: "2026-09-21",
      },
    ];
    expect(lessonsOnDate(d, new Date(2026, 8, 23))[0].cancelled).toBe(true);
    expect(
      lessonsOnDate(d, new Date(2026, 8, 30))[0].cancelled,
    ).toBeUndefined();
    expect(
      localDate(nextLesson(d, "math", new Date(2026, 8, 23, 8))!.date),
    ).toBe("2026-09-30");
  });
  it("includes extra lessons and orders by actual time", () => {
    const d = data();
    d.exceptions = [
      {
        id: "extra",
        date: "2026-09-23",
        action: "EXTRA",
        subjectId: "math",
        startTime: "08:00",
        endTime: "08:45",
        createdAt: "2026-09-22",
      },
    ];
    expect(lessonsOnDate(d, new Date(2026, 8, 23)).map((l) => l.id)).toEqual([
      "extra",
      "lesson",
    ]);
  });
});

import { agendaOnDate } from "../lib/diary";
describe("Unified calendar agenda", () => {
  it("orders lessons and events by time, with date-only deadlines last", () => {
    const d = data();
    d.events = [
      { id: "meeting", title: "Собрание", date: "2026-09-23", time: "08:30" },
    ];
    d.homework = [
      {
        id: "hw",
        subjectId: "math",
        subject,
        title: "Задачи",
        dueDate: "2026-09-23T00:00:00Z",
      } as any,
    ];
    d.exams = [
      {
        id: "exam",
        title: "Контрольная",
        subject,
        date: "2026-09-23T00:00:00Z",
      },
    ];
    const agenda = agendaOnDate(d, new Date(2026, 8, 23, 12));
    expect(agenda.map((i) => i.id)).toEqual([
      "event:meeting",
      "lesson:lesson",
      "exam:exam",
      "homework:hw",
    ]);
    expect(agenda.find((i) => i.kind === "event")?.href).toContain(
      "event=meeting",
    );
    expect(agenda.find((i) => i.kind === "homework")?.href).toBe(
      "/homework/hw",
    );
  });
  it("does not mix entries from neighbouring dates", () => {
    const d = data();
    d.events = [
      { id: "tomorrow", title: "Завтра", date: "2026-09-24", time: "08:00" },
    ];
    expect(agendaOnDate(d, new Date(2026, 8, 23, 12)).map((i) => i.id)).toEqual(
      ["lesson:lesson"],
    );
  });
});
