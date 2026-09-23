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
      description,
    } = body;

    if (!name || !shortName) {
      return NextResponse.json(
        { error: "Укажите полное и краткое название предмета" },
        { status: 400 },
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        shortName: shortName.trim(),
        color: color || "#6366f1",
        teacherId: teacherId || null,
        defaultClassroomId: defaultClassroomId || null,
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
