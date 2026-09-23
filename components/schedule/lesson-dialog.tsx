"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/workspace";
import { request, json } from "@/components/tables/model";
export function LessonDialog({
  isOpen,
  onClose,
  onSuccess,
  initialDay = 1,
  initialTime = "08:00",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDay?: number;
  initialTime?: string;
}) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [day, setDay] = useState(initialDay);
  const [start, setStart] = useState(initialTime);
  const [end, setEnd] = useState("08:45");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  const [creating, setCreating] = useState("");
  const [name, setName] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);
  const [metaBusy, setMetaBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    setDay(initialDay);
    setStart(initialTime);
    const [h, m] = initialTime.split(":").map(Number);
    const total = h * 60 + m + 45;
    setEnd(
      `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    );
    setError("");
    setCreating("");
    setSubject("");
    setTeacher("");
    setRoom("");
    Promise.all([
      request("/api/subjects"),
      request("/api/teachers"),
      request("/api/classrooms"),
    ])
      .then(([s, t, r]) => {
        setSubjects(s.subjects);
        setTeachers(t.teachers);
        setRooms(r.classrooms);
      })
      .catch((e) => setError(e.message));
  }, [isOpen, initialDay, initialTime]);
  async function create() {
    if (!name.trim()) return;
    setMetaBusy(true);
    try {
      if (creating === "subject") {
        const d = await request(
          "/api/subjects",
          json("POST", { name, shortName: name.slice(0, 6), color: "#308574" }),
        );
        setSubjects((s) => [...s, d.subject]);
        setSubject(d.subject.id);
      } else if (creating === "teacher") {
        const d = await request(
          "/api/teachers",
          json("POST", { firstName: name, lastName: last }),
        );
        setTeachers((t) => [...t, d.teacher]);
        setTeacher(d.teacher.id);
      } else {
        const d = await request(
          "/api/classrooms",
          json("POST", { number: name }),
        );
        setRooms((r) => [...r, d.classroom]);
        setRoom(d.classroom.id);
      }
      setCreating("");
      setName("");
      setLast("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setMetaBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (end <= start) {
      setError("Конец урока должен быть позже начала.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request(
        "/api/schedule",
        json("POST", {
          dayOfWeek: day,
          startTime: start,
          endTime: end,
          subjectId: subject,
          teacherId: teacher || null,
          classroomId: room || null,
          isRecurring: true,
        }),
      );
      onSuccess();
      onClose();
      toast.success("Урок добавлен");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить урок");
    } finally {
      setBusy(false);
    }
  }
  const quick = (kind: string) => {
    setCreating(creating === kind ? "" : kind);
    setName("");
    setLast("");
  };
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => !v && onClose()}
      title="Добавить урок"
      description="Предмет, время и место занятия."
    >
      <form className="form-stack" onSubmit={save}>
        <label className="field">
          День недели
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {[
              "Понедельник",
              "Вторник",
              "Среда",
              "Четверг",
              "Пятница",
              "Суббота",
            ].map((d, i) => (
              <option value={i + 1} key={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Начало
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="field">
            Конец
            <input
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          Предмет
          <select
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Выберите предмет</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="text-xs text-foreground-muted text-left"
          onClick={() => quick("subject")}
        >
          + Новый предмет
        </button>
        <label className="field">
          Учитель
          <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">Не назначен</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.lastName} {t.firstName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="text-xs text-foreground-muted text-left"
          onClick={() => quick("teacher")}
        >
          + Новый учитель
        </button>
        <label className="field">
          Кабинет
          <select value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="">Не указан</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="text-xs text-foreground-muted text-left"
          onClick={() => quick("room")}
        >
          + Новый кабинет
        </button>
        {creating && (
          <div className="form-stack p-4 bg-surface-elevated rounded-xl">
            <label className="field">
              {creating === "teacher"
                ? "Имя учителя"
                : creating === "room"
                  ? "Номер кабинета"
                  : "Название предмета"}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {creating === "teacher" && (
              <label className="field">
                Фамилия учителя
                <input value={last} onChange={(e) => setLast(e.target.value)} />
              </label>
            )}
            <button
              type="button"
              className="button"
              disabled={
                metaBusy ||
                !name.trim() ||
                (creating === "teacher" && !last.trim())
              }
              onClick={create}
            >
              Создать и выбрать
            </button>
          </div>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="button primary"
            disabled={busy || metaBusy || !subject}
          >
            Сохранить урок
          </button>
        </div>
      </form>
    </Sheet>
  );
}
