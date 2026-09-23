import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageTables } from "@/lib/auth/rbac";

import { syncTableMembers, TABLE_MEMBER_ROLES } from "@/lib/table-members";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageTables(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { studentIds, addAllStudents } = await req.json();

    if (addAllStudents) {
      const count = await syncTableMembers(params.id);
      return NextResponse.json({ success: true, count });
    }
    if (
      studentIds !== undefined &&
      (!Array.isArray(studentIds) ||
        !studentIds.every((id) => typeof id === "string"))
    )
      return NextResponse.json(
        { error: "Некорректный список участников" },
        { status: 400 },
      );
    const eligible = studentIds?.length
      ? await prisma.user.findMany({
          where: {
            id: { in: studentIds },
            role: { in: TABLE_MEMBER_ROLES },
            isBlocked: false,
          },
          select: { id: true },
        })
      : [];
    const targetStudentIds = eligible.map((u) => u.id);
    // Get current max order index
    const currentRowsCount = await prisma.customTableRow.count({
      where: { tableId: params.id },
    });

    // Filter out students already in table
    const existingRows = await prisma.customTableRow.findMany({
      where: { tableId: params.id },
      select: { studentId: true },
    });
    const existingSet = new Set(existingRows.map((r) => r.studentId));

    const toAdd = targetStudentIds.filter((id) => !existingSet.has(id));

    if (!studentIds || studentIds.length === 0) {
      // Manual empty row addition
      const newRow = await prisma.customTableRow.create({
        data: {
          tableId: params.id,
          orderIndex: currentRowsCount,
        },
      });
      return NextResponse.json({ success: true, count: 1 });
    }

    const rowsData = toAdd.map((sId, idx) => ({
      tableId: params.id,
      studentId: sId,
      orderIndex: currentRowsCount + idx,
    }));

    await prisma.customTableRow.createMany({
      data: rowsData,
    });

    return NextResponse.json({ success: true, count: toAdd.length });
  } catch (error: any) {
    console.error("Add rows error:", error);
    return NextResponse.json(
      { error: "Ошибка добавления строк" },
      { status: 500 },
    );
  }
}
