"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/workspace";
import { request, json } from "@/components/tables/model";
import { localDate } from "@/lib/diary";
export function ScheduleExceptionDialog({
  isOpen,
  onClose,
  onSuccess,
  lesson,
  defaultDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lesson?: any;
  defaultDate?: string;
}) {
  const [date, setDate] = useState(defaultDate || localDate(new Date()));
  const [action, setAction] = useState("MODIFIED");
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    setDate(defaultDate || localDate(new Date()));
    setAction(lesson ? "MODIFIED" : "EXTRA");
    setNote("");
    setSubject(lesson?.subjectId || "");
    setTeacher(lesson?.teacherId || "");
    setRoom(lesson?.classroomId || "");
    setStart(lesson?.startTime || "08:00");
    setEnd(lesson?.endTime || "08:45");
    setError("");
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
  }, [isOpen, lesson, defaultDate]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (action !== "CANCELLED" && end <= start) {
      setError("Время окончания должно быть позже начала.");
      return;
    }
    setBusy(true);
    try {
      await request(
        "/api/schedule/exceptions",
        json("POST", {
          date,
          lessonId: lesson?.id || null,
          action,
          subjectId: subject || null,
          teacherId: teacher || null,
          classroomId: room || null,
          startTime: start,
          endTime: end,
          note,
        }),
      );
      onSuccess();
      onClose();
      toast.success("Изменение сохранено");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => !v && onClose()}
      title="Изменение расписания"
      description="Изменение только на указанную дату. Недельный шаблон сохранится."
    >
      <form className="form-stack" onSubmit={save}>
        <label className="field">
          Дата
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          Действие
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            {lesson ? (
              <>
                <option value="MODIFIED">Изменить урок</option>
                <option value="CANCELLED">Отменить урок</option>
              </>
            ) : (
              <option value="EXTRA">Добавить дополнительный урок</option>
            )}
          </select>
        </label>
        {action !== "CANCELLED" && (
          <>
            <label className="field">
              Предмет
              <select
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Выберите предмет</option>
                {subjects.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
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
              Учитель
              <select
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              >
                <option value="">Без изменения</option>
                {teachers.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.lastName} {t.firstName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Кабинет
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                <option value="">Без изменения</option>
                {rooms.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.number}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="field">
          Комментарий
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Что изменилось?"
          />
        </label>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="button primary" disabled={busy}>
            Сохранить изменение
          </button>
        </div>
      </form>
    </Sheet>
  );
}
