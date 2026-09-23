import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageDuty } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const duties = await prisma.duty.findMany({
      orderBy: { date: "asc" },
    });

    // Populate student user records
    const populated = await Promise.all(
      duties.map(async (d) => {
        let studentUsers: any[] = [];
        try {
          const ids = JSON.parse(d.studentIds);
          studentUsers = await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, firstName: true, lastName: true },
          });
        } catch {}

        return {
          ...d,
          students: studentUsers,
          isUserDuty: studentUsers.some((s) => s.id === user.id),
        };
      }),
    );

    return NextResponse.json({ duties: populated });
  } catch (error: any) {
    console.error("Fetch duties error:", error);
    return NextResponse.json(
      { error: "Ошибка получения дежурств" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageDuty(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await req.json();
    const { date, studentIds, notes } = body;

    if (!date || !studentIds || !studentIds.length) {
      return NextResponse.json(
        { error: "Укажите дату и дежурных учеников" },
        { status: 400 },
      );
    }

    const duty = await prisma.duty.create({
      data: {
        date,
        studentIds: JSON.stringify(studentIds),
        notes: notes?.trim() || null,
        status: "SCHEDULED",
      },
    });

    // Notify assigned students
    for (const sId of studentIds) {
      await createNotification({
        userId: sId,
        type: "DUTY",
        title: "Назначено дежурство по классу",
        message: `Вы назначены дежурным на ${date}.`,
        link: "/duty",
      });
    }

    await logAuditEvent({
      userId: user.id,
      action: "DUTY_SCHEDULED",
      entity: "DUTY",
      entityId: duty.id,
      details: { date, studentIds },
    });

    return NextResponse.json({ success: true, duty });
  } catch (error: any) {
    console.error("Create duty error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания графика" },
      { status: 500 },
    );
  }
}
