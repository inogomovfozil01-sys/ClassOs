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
  const [subjectName, setSubjectName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
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
    setStart(lesson?.startTime || "08:00");
    setEnd(lesson?.endTime || "08:45");
    setError("");

    Promise.all([
      request("/api/subjects"),
      request("/api/teachers"),
      request("/api/classrooms"),
    ])
      .then(([s, t, r]) => {
        const subList = s.subjects || [];
        const teachList = t.teachers || [];
        const roomList = r.classrooms || [];
        setSubjects(subList);
        setTeachers(teachList);
        setRooms(roomList);

        const initialSubject =
          lesson?.subject?.name ||
          subList.find((x: any) => x.id === lesson?.subjectId)?.name ||
          "";
        const initialTeacher = lesson?.teacher
          ? `${lesson.teacher.lastName} ${lesson.teacher.firstName}`.trim()
          : teachList.find((x: any) => x.id === lesson?.teacherId)
            ? `${teachList.find((x: any) => x.id === lesson?.teacherId)?.lastName} ${teachList.find((x: any) => x.id === lesson?.teacherId)?.firstName}`.trim()
            : "";
        const initialRoom =
          lesson?.classroom?.number ||
          roomList.find((x: any) => x.id === lesson?.classroomId)?.number ||
          "";

        setSubjectName(initialSubject);
        setTeacherName(initialTeacher);
        setRoomNumber(initialRoom);
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
          subjectName: action !== "CANCELLED" ? subjectName.trim() : null,
          teacherName: action !== "CANCELLED" ? teacherName.trim() || null : null,
          roomNumber: action !== "CANCELLED" ? roomNumber.trim() || null : null,
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
              <input
                type="text"
                required
                placeholder="Впишите название предмета"
                list="exception-subjects-datalist"
                autoComplete="off"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
              <datalist id="exception-subjects-datalist">
                {subjects.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
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
              <input
                type="text"
                placeholder="Впишите имя учителя"
                list="exception-teachers-datalist"
                autoComplete="off"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
              />
              <datalist id="exception-teachers-datalist">
                {teachers.map((t) => (
                  <option
                    key={t.id}
                    value={`${t.lastName} ${t.firstName}`.trim()}
                  />
                ))}
              </datalist>
            </label>
            <label className="field">
              Кабинет
              <input
                type="text"
                placeholder="Впишите номер кабинета"
                list="exception-rooms-datalist"
                autoComplete="off"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
              <datalist id="exception-rooms-datalist">
                {rooms.map((r) => (
                  <option key={r.id} value={r.number} />
                ))}
              </datalist>
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
