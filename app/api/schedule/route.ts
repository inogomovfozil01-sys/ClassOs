import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";
import { seedDefaultSchedule } from "@/lib/schedule-default";

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

    let lessons = await prisma.scheduleLesson.findMany({
      where,
      include: {
        subject: true,
        teacher: true,
        classroom: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Auto-seed eMaktab schedule if database schedule is currently empty
    if (!dayOfWeek && lessons.length === 0) {
      await seedDefaultSchedule();
      lessons = await prisma.scheduleLesson.findMany({
        where,
        include: {
          subject: true,
          teacher: true,
          classroom: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    }

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

    if (body.action === "seed_default") {
      await seedDefaultSchedule();
      return NextResponse.json({ success: true, message: "Расписание из eMaktab успешно загружено" });
    }

    const {
      dayOfWeek,
      startTime,
      endTime,
      subjectId,
      subjectName,
      teacherId,
      teacherName,
      classroomId,
      roomNumber,
      isRecurring,
    } = body;

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

    if (!dayOfWeek || !startTime || !endTime || !finalSubjectId) {
      return NextResponse.json(
        { error: "Заполните обязательные поля урока (день, время и предмет)" },
        { status: 400 },
      );
    }

    const lesson = await prisma.scheduleLesson.create({
      data: {
        dayOfWeek: parseInt(dayOfWeek, 10),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        subjectId: finalSubjectId,
        teacherId: finalTeacherId || null,
        classroomId: finalClassroomId || null,
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
