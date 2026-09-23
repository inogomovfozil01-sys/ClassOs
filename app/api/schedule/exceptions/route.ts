import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyAllStudents } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const where: any = {};
    if (date) {
      where.date = date;
    }

    const exceptions = await prisma.scheduleException.findMany({
      where,
      include: {
        lesson: {
          include: {
            subject: true,
            teacher: true,
            classroom: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ exceptions });
  } catch (error: any) {
    console.error("Fetch schedule exceptions error:", error);
    return NextResponse.json(
      { error: "Ошибка получения изменений" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isLeaderOrHigher(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await req.json();
    const {
      date,
      lessonId,
      action,
      subjectId,
      teacherId,
      classroomId,
      startTime,
      endTime,
      note,
    } = body;

    if (!date || !action) {
      return NextResponse.json(
        { error: "Укажите дату и тип изменения" },
        { status: 400 },
      );
    }

    const exception = await prisma.scheduleException.create({
      data: {
        date,
        lessonId: lessonId || null,
        action, // MODIFIED, CANCELLED, MOVED, EXTRA
        subjectId: subjectId || null,
        teacherId: teacherId || null,
        classroomId: classroomId || null,
        startTime: startTime || null,
        endTime: endTime || null,
        note: note?.trim() || null,
      },
    });

    // Notify students about schedule change
    const actionText =
      action === "CANCELLED"
        ? "Отмена урока"
        : action === "MOVED"
          ? "Перенос урока"
          : "Изменение в расписании";

    await notifyAllStudents({
      type: "SCHEDULE",
      title: `${actionText} на ${date}`,
      message: note || `Лидер класса внёс изменение в расписание на ${date}`,
      link: `/schedule?date=${date}`,
    });

    await logAuditEvent({
      userId: user.id,
      action: "SCHEDULE_EXCEPTION_CREATED",
      entity: "SCHEDULE_EXCEPTION",
      entityId: exception.id,
      details: { date, action, note },
    });

    return NextResponse.json({ success: true, exception });
  } catch (error: any) {
    console.error("Create schedule exception error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания изменения" },
      { status: 500 },
    );
  }
}
