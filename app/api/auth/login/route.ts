import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Введите логин и пароль" },
        { status: 400 },
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Ваш аккаунт заблокирован администратором" },
        { status: 403 },
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    const { token, expiresAt } = await createSession(
      user.id,
      userAgent,
      ipAddress,
    );

    await logAuditEvent({
      userId: user.id,
      action: "USER_LOGIN",
      entity: "USER",
      entityId: user.id,
      ipAddress,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        mustChangePassword: user.mustChangePassword,
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка авторизации" },
      { status: 500 },
    );
  }
}
