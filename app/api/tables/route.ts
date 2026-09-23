import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageTables } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";

import { TABLE_MEMBER_ROLES } from "@/lib/table-members";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const tables = await prisma.customTable.findMany({
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { columns: true, rows: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tables });
  } catch (error: any) {
    console.error("Fetch tables error:", error);
    return NextResponse.json(
      { error: "Ошибка получения таблиц" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageTables(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, initialColumns } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Укажите название таблицы" },
        { status: 400 },
      );
    }

    const members = await prisma.user.findMany({
      where: { role: { in: TABLE_MEMBER_ROLES }, isBlocked: false },
      select: { id: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const table = await prisma.customTable.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        createdById: user.id,
        rows: {
          create: members.map((member, index) => ({
            studentId: member.id,
            orderIndex: index,
          })),
        },
        columns: {
          create: [
            { title: "Ученик", type: "STUDENT", orderIndex: 0 },
            ...(initialColumns || []).map((col: any, idx: number) => ({
              title: col.title,
              type: col.type,
              orderIndex: idx + 1,
            })),
          ],
        },
      },
      include: { columns: true },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CUSTOM_TABLE_CREATED",
      entity: "TABLE",
      entityId: table.id,
      details: { title: table.title },
    });

    return NextResponse.json({ success: true, table });
  } catch (error: any) {
    console.error("Create table error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания таблицы" },
      { status: 500 },
    );
  }
}
