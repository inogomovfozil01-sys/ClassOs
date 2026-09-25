import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      include: {
        teacher: true,
        defaultClassroom: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ subjects });
  } catch (error: any) {
    console.error("Fetch subjects error:", error);
    return NextResponse.json(
      { error: "Ошибка получения предметов" },
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
      name,
      shortName,
      color,
      teacherId,
      defaultClassroomId,
      roomNumber,
      description,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Укажите название предмета" },
        { status: 400 },
      );
    }

    const trimmedName = name.trim();
    const finalShortName = (shortName && typeof shortName === "string" && shortName.trim())
      ? shortName.trim()
      : trimmedName.slice(0, 8);

    let finalClassroomId = defaultClassroomId;
    if (!finalClassroomId && roomNumber && typeof roomNumber === "string" && roomNumber.trim()) {
      const rNum = roomNumber.trim();
      const allRooms = await prisma.classroom.findMany();
      let r = allRooms.find((x: any) => x.number.trim().toLowerCase() === rNum.toLowerCase());
      if (!r) {
        r = await prisma.classroom.create({ data: { number: rNum } });
      }
      finalClassroomId = r.id;
    }

    const subject = await prisma.subject.create({
      data: {
        name: trimmedName,
        shortName: finalShortName,
        color: color || "#308574",
        teacherId: teacherId || null,
        defaultClassroomId: finalClassroomId || null,
        description: description?.trim() || null,
      },
      include: {
        teacher: true,
        defaultClassroom: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "SUBJECT_CREATED",
      entity: "SUBJECT",
      entityId: subject.id,
      details: { name: subject.name },
    });

    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    console.error("Create subject error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания предмета" },
      { status: 500 },
    );
  }
}
