import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageTables } from "@/lib/auth/rbac";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageTables(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { title, type, config } = await req.json();
    if (!title || !type) {
      return NextResponse.json(
        { error: "Укажите название и тип столбца" },
        { status: 400 },
      );
    }

    const count = await prisma.customTableColumn.count({
      where: { tableId: params.id },
    });

    const column = await prisma.customTableColumn.create({
      data: {
        tableId: params.id,
        title: title.trim(),
        type,
        config: config ? JSON.stringify(config) : null,
        orderIndex: count,
      },
    });

    return NextResponse.json({ success: true, column });
  } catch (error: any) {
    console.error("Add column error:", error);
    return NextResponse.json(
      { error: "Ошибка добавления столбца" },
      { status: 500 },
    );
  }
}
