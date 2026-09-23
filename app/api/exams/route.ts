import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyAllStudents } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const exams = await prisma.exam.findMany({
      include: { subject: true },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ exams });
  } catch (error: any) {
    console.error("Fetch exams error:", error);
    return NextResponse.json(
      { error: "Ошибка получения контрольных" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isLeaderOrHigher(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await req.json();
    const { subjectId, title, date, topics, materialsUrl, notes } = body;

    if (!subjectId || !title || !date) {
      return NextResponse.json(
        { error: "Укажите предмет, название и дату" },
        { status: 400 },
      );
    }

    const exam = await prisma.exam.create({
      data: {
        subjectId,
        title: title.trim(),
        date: new Date(date),
        topics: topics?.trim() || null,
        materialsUrl: materialsUrl?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: { subject: true },
    });

    await notifyAllStudents({
      type: "EVENT",
      title: `Контрольная: ${exam.subject.name}`,
      message: `${exam.title} назначена на ${new Date(date).toLocaleDateString("ru-RU")}`,
      link: `/tests?exam=${exam.id}`,
    });

    await logAuditEvent({
      userId: user.id,
      action: "EXAM_CREATED",
      entity: "EXAM",
      entityId: exam.id,
      details: { title: exam.title, date: exam.date },
    });

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    console.error("Create exam error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания" },
      { status: 500 },
    );
  }
}
