import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  const usersCount = await prisma.user.count();
  return NextResponse.json({
    needsSetup: usersCount === 0,
  });
}

export async function POST(req: Request) {
  try {
    const usersCount = await prisma.user.count();
    if (usersCount > 0) {
      return NextResponse.json(
        {
          error:
            "Система ClassOS уже настроена. Начальная регистрация заблокирована.",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { firstName, lastName, username, password } = body;

    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return NextResponse.json(
        { error: "Укажите логин и пароль" },
        { status: 400 },
      );
    }

    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: "Логин должен содержать минимум 3 символа" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);

    const owner = await prisma.user.create({
      data: {
        firstName: typeof firstName === "string" ? firstName.trim() : "",
        lastName: typeof lastName === "string" ? lastName.trim() : "",
        username: username.trim().toLowerCase(),
        passwordHash,
        role: "OWNER",
        mustChangePassword: false,
      },
    });

    // Create session
    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const { token, expiresAt } = await createSession(
      owner.id,
      userAgent,
      ipAddress,
    );

    // Audit log
    await logAuditEvent({
      userId: owner.id,
      action: "SYSTEM_BOOTSTRAP_OWNER_CREATED",
      entity: "USER",
      entityId: owner.id,
      details: { username: owner.username },
      ipAddress,
    });

    // Also automatically create the universal Class General Group Chat!
    await prisma.conversation.create({
      data: {
        type: "CLASS",
        name: "Чат нашего класса",
        createdById: owner.id,
        members: {
          create: {
            userId: owner.id,
            role: "ADMIN",
          },
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: owner.id,
        username: owner.username,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: owner.role,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка первичной настройки" },
      { status: 500 },
    );
  }
}
