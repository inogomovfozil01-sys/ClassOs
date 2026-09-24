import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher, canManageUsers } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const teachers = await prisma.teacherProfile.findMany({
      include: {
        user: { select: { id: true, username: true, role: true, avatarUrl: true } },
        subjects: true,
      },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json({ teachers });
  } catch (error: any) {
    console.error("Fetch teachers error:", error);
    return NextResponse.json(
      { error: "Ошибка получения учителей" },
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
      firstName,
      lastName,
      middleName,
      subjectName,
      contact,
      notes,
      userId,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Укажите имя и фамилию учителя" },
        { status: 400 },
      );
    }

    if (userId) {
      if (!canManageUsers(user.role))
        return NextResponse.json(
          { error: "Связывать аккаунты может только администратор" },
          { status: 403 },
        );
      const account = await prisma.user.findFirst({
        where: { id: userId, role: "TEACHER" },
      });
      if (!account)
        return NextResponse.json(
          { error: "Выберите аккаунт учителя" },
          { status: 400 },
        );
    }
    const teacher = await prisma.teacherProfile.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName?.trim() || null,
        subjectName: subjectName?.trim() || null,
        contact: contact?.trim() || null,
        notes: notes?.trim() || null,
        userId: userId || null,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "TEACHER_PROFILE_CREATED",
      entity: "TEACHER",
      entityId: teacher.id,
      details: { name: `${teacher.lastName} ${teacher.firstName}` },
    });

    return NextResponse.json({ success: true, teacher });
  } catch (error: any) {
    console.error("Create teacher error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания учителя" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user.role))
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    const { id, userId } = await req.json();
    if (userId) {
      const account = await prisma.user.findFirst({
        where: { id: userId, role: "TEACHER" },
      });
      if (!account)
        return NextResponse.json(
          { error: "Выберите аккаунт учителя" },
          { status: 400 },
        );
    }
    const teacher = await prisma.teacherProfile.update({
      where: { id },
      data: { userId: userId || null },
    });
    await logAuditEvent({
      userId: user.id,
      action: "TEACHER_ACCOUNT_LINKED",
      entity: "TEACHER",
      entityId: id,
    });
    return NextResponse.json({ teacher });
  } catch {
    return NextResponse.json(
      {
        error:
          "Не удалось связать аккаунт. Возможно, он уже связан с другим учителем.",
      },
      { status: 400 },
    );
  }
}
