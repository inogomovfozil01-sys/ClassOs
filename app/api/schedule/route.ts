import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dayOfWeek = searchParams.get("dayOfWeek");

    const where: any = {};
    if (dayOfWeek) {
      where.dayOfWeek = parseInt(dayOfWeek, 10);
    }

    const lessons = await prisma.scheduleLesson.findMany({
      where,
      include: {
        subject: true,
        teacher: true,
        classroom: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ lessons });
  } catch (error: any) {
    console.error("Fetch schedule error:", error);
    return NextResponse.json(
      { error: "Ошибка получения расписания" },
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
      dayOfWeek,
      startTime,
      endTime,
      subjectId,
      teacherId,
      classroomId,
      isRecurring,
    } = body;

    if (!dayOfWeek || !startTime || !endTime || !subjectId) {
      return NextResponse.json(
        { error: "Заполните обязательные поля урока" },
        { status: 400 },
      );
    }

    const lesson = await prisma.scheduleLesson.create({
      data: {
        dayOfWeek: parseInt(dayOfWeek, 10),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        subjectId,
        teacherId: teacherId || null,
        classroomId: classroomId || null,
        isRecurring: isRecurring !== false,
      },
      include: {
        subject: true,
        teacher: true,
        classroom: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "SCHEDULE_LESSON_ADDED",
      entity: "SCHEDULE",
      entityId: lesson.id,
      details: {
        day: lesson.dayOfWeek,
        time: lesson.startTime,
        subject: lesson.subject.name,
      },
    });

    return NextResponse.json({ success: true, lesson });
  } catch (error: any) {
    console.error("Create schedule lesson error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка добавления урока" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isLeaderOrHigher(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "ID урока не указан" },
        { status: 400 },
      );
    }

    await prisma.scheduleLesson.delete({ where: { id } });

    await logAuditEvent({
      userId: user.id,
      action: "SCHEDULE_LESSON_DELETED",
      entity: "SCHEDULE",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete schedule lesson error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления урока" },
      { status: 500 },
    );
  }
}
