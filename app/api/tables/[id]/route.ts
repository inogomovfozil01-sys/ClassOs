import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageTables } from "@/lib/auth/rbac";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const table = await prisma.customTable.findUnique({
      where: { id: resourceId },
      include: {
        columns: { orderBy: { orderIndex: "asc" } },
        rows: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
            cells: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Таблица не найдена" },
        { status: 404 },
      );
    }

    return NextResponse.json({ table });
  } catch (error: any) {
    console.error("Fetch table details error:", error);
    return NextResponse.json(
      { error: "Ошибка получения таблицы" },
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
    const user = await getCurrentUser();
    if (!user || !canManageTables(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    await prisma.customTable.delete({ where: { id: resourceId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete table error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления таблицы" },
      { status: 500 },
    );
  }
}
