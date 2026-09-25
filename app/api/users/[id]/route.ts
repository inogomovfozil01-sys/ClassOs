import {
  ensureSingleHomeroomTeacher,
  HomeroomTeacherConflict,
} from "@/lib/homeroom-teacher";
import { syncTableMembers } from "@/lib/table-members";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageUsers } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const isSelf = currentUser.id === resourceId;
    if (!canManageUsers(currentUser.role) && !isSelf) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: resourceId },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 },
      );
    }

    // Safety: OWNER cannot be edited, downgraded, or blocked by others
    if (targetUser.role === "OWNER" && currentUser.role !== "OWNER") {
      return NextResponse.json(
        { error: "Владельца системы нельзя изменять" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { firstName, lastName, middleName, role, isBlocked } = body;

    const data: any = {};
    if (typeof firstName === "string") data.firstName = firstName.trim();
    if (typeof lastName === "string") data.lastName = lastName.trim();
    if (typeof middleName === "string") data.middleName = middleName.trim() || null;

    if (typeof isBlocked === "boolean") {
      if (!canManageUsers(currentUser.role)) {
        return NextResponse.json({ error: "Недостаточно прав для блокировки" }, { status: 403 });
      }
      if (targetUser.role === "OWNER") {
        return NextResponse.json(
          { error: "Владельца нельзя заблокировать" },
          { status: 400 },
        );
      }
      data.isBlocked = isBlocked;
    }
    if (role && role !== targetUser.role) {
      if (!canManageUsers(currentUser.role)) {
        return NextResponse.json({ error: "Недостаточно прав для смены роли" }, { status: 403 });
      }
      if (targetUser.role === "OWNER") {
        return NextResponse.json(
          { error: "Роль Владельца нельзя изменить" },
          { status: 400 },
        );
      }
      data.role = role;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await ensureSingleHomeroomTeacher(tx, data.role, resourceId);
      return tx.user.update({
        where: { id: resourceId },
        data,
      });
    });

    await syncTableMembers();

    await logAuditEvent({
      userId: currentUser.id,
      action: "USER_UPDATED",
      entity: "USER",
      entityId: updated.id,
      details: data,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    if (error instanceof HomeroomTeacherConflict)
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка обновления пользователя" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canManageUsers(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: resourceId },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 },
      );
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json(
        { error: "Владельца системы невозможно удалить" },
        { status: 403 },
      );
    }

    await prisma.user.delete({ where: { id: resourceId } });

    await logAuditEvent({
      userId: currentUser.id,
      action: "USER_DELETED",
      entity: "USER",
      entityId: resourceId,
      details: { username: targetUser.username },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof HomeroomTeacherConflict)
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка удаления пользователя" },
      { status: 500 },
    );
  }
}
