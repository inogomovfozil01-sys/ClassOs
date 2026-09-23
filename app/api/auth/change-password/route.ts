import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Новый пароль должен содержать минимум 6 символов" },
        { status: 400 },
      );
    }

    // If not flagged with mustChangePassword, verify old password
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 },
      );
    }

    if (!dbUser.mustChangePassword) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: "Укажите текущий пароль" },
          { status: 400 },
        );
      }
      const isOldValid = await verifyPassword(oldPassword, dbUser.passwordHash);
      if (!isOldValid) {
        return NextResponse.json(
          { error: "Неверный текущий пароль" },
          { status: 400 },
        );
      }
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "USER_PASSWORD_CHANGED",
      entity: "USER",
      entityId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Пароль успешно обновлён",
    });
  } catch (error: any) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Ошибка смены пароля" }, { status: 500 });
  }
}
