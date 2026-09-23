import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageUsers } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canManageUsers(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 },
      );
    }

    if (targetUser.role === "OWNER" && currentUser.id !== targetUser.id) {
      return NextResponse.json(
        { error: "Сброс пароля Владельца запрещён" },
        { status: 403 },
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: params.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Terminate existing sessions to force re-login
    await prisma.session.deleteMany({ where: { userId: params.id } });

    await logAuditEvent({
      userId: currentUser.id,
      action: "ADMIN_RESET_USER_PASSWORD",
      entity: "USER",
      entityId: params.id,
      details: { username: targetUser.username },
    });

    return NextResponse.json({
      success: true,
      message: "Пароль успешно сброшен",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка сброса пароля" },
      { status: 500 },
    );
  }
}
