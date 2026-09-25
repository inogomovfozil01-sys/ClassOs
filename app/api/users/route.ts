import {
  ensureSingleHomeroomTeacher,
  HomeroomTeacherConflict,
} from "@/lib/homeroom-teacher";
import { syncTableMembers } from "@/lib/table-members";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageUsers } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/audit";
import { isValidLatinName } from "@/lib/username-ai";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        role: true,
        avatarUrl: true,
        isBlocked: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    if (error instanceof HomeroomTeacherConflict)
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Ошибка получения пользователей" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canManageUsers(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, middleName, username, tempPassword, role } =
      body;

    if (!firstName || !lastName || !username || !tempPassword || !role) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 },
      );
    }

    const cleanFirst = String(firstName).trim();
    const cleanLast = String(lastName).trim();

    if (!isValidLatinName(cleanFirst) || !isValidLatinName(cleanLast)) {
      return NextResponse.json(
        {
          error:
            "Имя и фамилия должны быть написаны только английскими буквами (латиницей, например: Shakhzod Bakhodirov)",
        },
        { status: 400 },
      );
    }

    if (role === "OWNER") {
      return NextResponse.json(
        { error: "Роль OWNER создаётся только при первичной установке" },
        { status: 403 },
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким логином уже существует" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(tempPassword);

    const newUser = await prisma.$transaction(async (tx) => {
      await ensureSingleHomeroomTeacher(tx, role);
      return tx.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName?.trim() || null,
          username: cleanUsername,
          passwordHash,
          role,
          mustChangePassword: true, // Forces password change on first login
        },
      });
    });

    await syncTableMembers();

    // Auto-add new user to General Class Chat!
    const classChat = await prisma.conversation.findFirst({
      where: { type: "CLASS" },
    });
    if (classChat) {
      await prisma.conversationMember
        .create({
          data: {
            conversationId: classChat.id,
            userId: newUser.id,
          },
        })
        .catch(() => {});
    }

    await logAuditEvent({
      userId: currentUser.id,
      action: "USER_CREATED",
      entity: "USER",
      entityId: newUser.id,
      details: { username: newUser.username, role: newUser.role },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    if (error instanceof HomeroomTeacherConflict)
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания пользователя" },
      { status: 500 },
    );
  }
}
