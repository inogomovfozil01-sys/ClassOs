import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageTables } from "@/lib/auth/rbac";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageTables(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { rowId, columnId, value } = await req.json();

    if (!rowId || !columnId) {
      return NextResponse.json(
        { error: "Некорректные координаты ячейки" },
        { status: 400 },
      );
    }

    const [row, column] = await Promise.all([
      prisma.customTableRow.findFirst({
        where: { id: rowId, tableId: params.id },
      }),
      prisma.customTableColumn.findFirst({
        where: { id: columnId, tableId: params.id },
      }),
    ]);
    if (!row || !column) {
      return NextResponse.json(
        { error: "Ячейка не принадлежит этой таблице" },
        { status: 400 },
      );
    }

    const cell = await prisma.customTableCell.upsert({
      where: {
        rowId_columnId: {
          rowId,
          columnId,
        },
      },
      update: {
        value: value === null || value === undefined ? null : String(value),
      },
      create: {
        rowId,
        columnId,
        value: value === null || value === undefined ? null : String(value),
      },
    });

    return NextResponse.json({ success: true, cell });
  } catch (error: any) {
    console.error("Update cell error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления ячейки" },
      { status: 500 },
    );
  }
}
