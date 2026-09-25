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
  const [subjectName, setSubjectName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [busy, setBusy] = useState(false);
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
    setSubjectName("");
    setTeacherName("");
    setRoomNumber("");

    Promise.all([
      request("/api/subjects"),
      request("/api/teachers"),
      request("/api/classrooms"),
    ])
      .then(([s, t, r]) => {
        setSubjects(s.subjects || []);
        setTeachers(t.teachers || []);
        setRooms(r.classrooms || []);
      })
      .catch((e) => setError(e.message));
  }, [isOpen, initialDay, initialTime]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectName.trim()) {
      setError("Укажите название предмета.");
      return;
    }
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
          subjectName: subjectName.trim(),
          teacherName: teacherName.trim() || null,
          roomNumber: roomNumber.trim() || null,
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
          <input
            type="text"
            required
            placeholder="Впишите название предмета (например, Математика)"
            list="subjects-datalist"
            autoComplete="off"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
          <datalist id="subjects-datalist">
            {subjects.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>

        <label className="field">
          Учитель
          <input
            type="text"
            placeholder="Впишите учителя (например, Иванова Анна)"
            list="teachers-datalist"
            autoComplete="off"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
          />
          <datalist id="teachers-datalist">
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
            placeholder="Впишите кабинет (например, 204)"
            list="rooms-datalist"
            autoComplete="off"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />
          <datalist id="rooms-datalist">
            {rooms.map((r) => (
              <option key={r.id} value={r.number} />
            ))}
          </datalist>
        </label>

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
            disabled={busy || !subjectName.trim()}
          >
            Сохранить урок
          </button>
        </div>
      </form>
    </Sheet>
  );
}
