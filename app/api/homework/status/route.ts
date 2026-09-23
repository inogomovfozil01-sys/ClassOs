import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { homeworkId, status } = await req.json();

    if (!homeworkId || !status) {
      return NextResponse.json(
        { error: "Некорректные параметры" },
        { status: 400 },
      );
    }

    const updated = await prisma.homeworkStatus.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId,
          studentId: user.id,
        },
      },
      update: { status },
      create: {
        homeworkId,
        studentId: user.id,
        status,
      },
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (error: any) {
    console.error("Update homework status error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления статуса" },
      { status: 500 },
    );
  }
}
