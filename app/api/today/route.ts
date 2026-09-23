import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const todayDate = new Date();
    const dateStr = todayDate.toISOString().split("T")[0];
    const jsDay = todayDate.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon .. 7=Sun

    // 1. Base lessons for today
    const baseLessons =
      dayOfWeek <= 6
        ? await prisma.scheduleLesson.findMany({
            where: { dayOfWeek },
            include: {
              subject: true,
              teacher: true,
              classroom: true,
            },
            orderBy: { startTime: "asc" },
          })
        : [];

    // 2. Date-specific exceptions for today
    const exceptions = await prisma.scheduleException.findMany({
      where: { date: dateStr },
      include: {
        lesson: {
          include: { subject: true, teacher: true, classroom: true },
        },
      },
    });

    // Merge base lessons and exceptions
    const todayLessons = baseLessons
      .filter((l) => {
        // Exclude cancelled
        const exc = exceptions.find(
          (e) => e.lessonId === l.id && e.action === "CANCELLED",
        );
        return !exc;
      })
      .map((l) => {
        const exc = exceptions.find(
          (e) => e.lessonId === l.id && e.action === "MODIFIED",
        );
        return {
          ...l,
          isModified: Boolean(exc),
          exceptionNote: exc?.note || null,
        };
      });

    // 3. Active homework due today or in the next 3 days
    const startOfToday = new Date(todayDate);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfRange = new Date(todayDate);
    endOfRange.setDate(endOfRange.getDate() + 4);

    const activeHomework = await prisma.homework.findMany({
      where: {
        dueDate: {
          gte: startOfToday,
          lte: endOfRange,
        },
      },
      include: {
        subject: true,
        statuses: {
          where: { studentId: user.id },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    });

    // 4. Upcoming tests in next 7 days
    const upcomingExams = await prisma.exam.findMany({
      where: {
        date: { gte: startOfToday },
      },
      include: { subject: true },
      orderBy: { date: "asc" },
      take: 3,
    });

    // 5. Today's duty
    const duty = await prisma.duty.findFirst({
      where: { date: dateStr },
    });

    let dutyStudents: any[] = [];
    if (duty && duty.studentIds) {
      try {
        const ids = JSON.parse(duty.studentIds);
        dutyStudents = await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true },
        });
      } catch {}
    }

    // 6. Latest important news post
    const latestNews = await prisma.newsPost.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({
      dateStr,
      todayLessons,
      activeHomework: activeHomework.map((h) => ({
        ...h,
        personalStatus: h.statuses[0]?.status || "NOT_STARTED",
      })),
      upcomingExams,
      duty: duty ? { ...duty, students: dutyStudents } : null,
      latestNews,
    });
  } catch (error: any) {
    console.error("Today API error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки данных дня" },
      { status: 500 },
    );
  }
}
