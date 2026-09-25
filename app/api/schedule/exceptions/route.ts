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
      subjectName,
      teacherId,
      teacherName,
      classroomId,
      roomNumber,
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

    let finalSubjectId = subjectId;
    let finalTeacherId = teacherId;
    let finalClassroomId = classroomId;

    if (!finalSubjectId && subjectName && typeof subjectName === "string" && subjectName.trim()) {
      const sName = subjectName.trim();
      const allSubjects = await prisma.subject.findMany();
      let s = allSubjects.find((x: any) => x.name.trim().toLowerCase() === sName.toLowerCase());
      if (!s) {
        s = await prisma.subject.create({
          data: {
            name: sName,
            shortName: sName.slice(0, 8),
            color: "#308574",
          },
        });
      }
      finalSubjectId = s.id;
    }

    if (!finalTeacherId && teacherName && typeof teacherName === "string" && teacherName.trim()) {
      const tName = teacherName.trim();
      const parts = tName.split(/\s+/);
      const lastName = parts[0] || tName;
      const firstName = parts.slice(1).join(" ") || "";
      const allTeachers = await prisma.teacherProfile.findMany();
      let t = allTeachers.find(
        (x: any) =>
          `${x.lastName} ${x.firstName}`.trim().toLowerCase() === tName.toLowerCase() ||
          x.lastName.trim().toLowerCase() === lastName.toLowerCase()
      );
      if (!t) {
        t = await prisma.teacherProfile.create({
          data: {
            lastName,
            firstName: firstName || "Учитель",
          },
        });
      }
      finalTeacherId = t.id;
    }

    if (!finalClassroomId && roomNumber && typeof roomNumber === "string" && roomNumber.trim()) {
      const rNum = roomNumber.trim();
      const allRooms = await prisma.classroom.findMany();
      let r = allRooms.find((x: any) => x.number.trim().toLowerCase() === rNum.toLowerCase());
      if (!r) {
        r = await prisma.classroom.create({
          data: {
            number: rNum,
          },
        });
      }
      finalClassroomId = r.id;
    }

    const exception = await prisma.scheduleException.create({
      data: {
        date,
        lessonId: lessonId || null,
        action, // MODIFIED, CANCELLED, MOVED, EXTRA
        subjectId: finalSubjectId || null,
        teacherId: finalTeacherId || null,
        classroomId: finalClassroomId || null,
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
      entity: "SCHEDULE",
      entityId: exception.id,
      details: { date, action, note },
    });

    return NextResponse.json({ success: true, exception });
  } catch (error: any) {
    console.error("Create schedule exception error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка добавления изменения" },
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
        { error: "ID изменения не указан" },
        { status: 400 },
      );
    }

    await prisma.scheduleException.delete({ where: { id } });

    await logAuditEvent({
      userId: user.id,
      action: "SCHEDULE_EXCEPTION_DELETED",
      entity: "SCHEDULE",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete schedule exception error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления изменения" },
      { status: 500 },
    );
  }
}
