"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-context";
import { DiaryData } from "@/lib/diary";
import { request } from "@/components/tables/model";
export function useDiary() {
  const { user } = useAuth();
  const [data, setData] = useState<DiaryData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [
        schedule,
        homework,
        subjects,
        teachers,
        classrooms,
        exceptions,
        exams,
        events,
        news,
      ] = await Promise.all(
        [
          "/schedule",
          "/homework",
          "/subjects",
          "/teachers",
          "/classrooms",
          "/schedule/exceptions",
          "/exams",
          "/events",
          "/news",
        ].map((path) => request("/api" + path)),
      );
      setData({
        lessons: schedule.lessons,
        homework: homework.homework,
        subjects: subjects.subjects,
        teachers: teachers.teachers,
        classrooms: classrooms.classrooms,
        exceptions: exceptions.exceptions,
        exams: exams.exams,
        events: events.events,
        posts: news.posts,
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить дневник");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, error, loading, refresh };
}
