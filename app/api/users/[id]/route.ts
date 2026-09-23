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
  { params }: { params: { id: string } },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canManageUsers(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
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

    // Safety: OWNER cannot be edited, downgraded, or blocked by others
    if (targetUser.role === "OWNER" && currentUser.role !== "OWNER") {
      return NextResponse.json(
        { error: "Владельца системы нельзя изменять" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { firstName, lastName, role, isBlocked } = body;

    const data: any = {};
    if (firstName) data.firstName = firstName.trim();
    if (lastName) data.lastName = lastName.trim();
    if (typeof isBlocked === "boolean") {
      if (targetUser.role === "OWNER") {
        return NextResponse.json(
          { error: "Владельца нельзя заблокировать" },
          { status: 400 },
        );
      }
      data.isBlocked = isBlocked;
    }
    if (role && role !== targetUser.role) {
      if (targetUser.role === "OWNER") {
        return NextResponse.json(
          { error: "Роль Владельца нельзя изменить" },
          { status: 400 },
        );
      }
      data.role = role;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await ensureSingleHomeroomTeacher(tx, data.role, params.id);
      return tx.user.update({
        where: { id: params.id },
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
  { params }: { params: { id: string } },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canManageUsers(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
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

    if (targetUser.role === "OWNER") {
      return NextResponse.json(
        { error: "Владельца системы невозможно удалить" },
        { status: 403 },
      );
    }

    await prisma.user.delete({ where: { id: params.id } });

    await logAuditEvent({
      userId: currentUser.id,
      action: "USER_DELETED",
      entity: "USER",
      entityId: params.id,
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
