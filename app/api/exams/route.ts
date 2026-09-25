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

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Укажите корректную дату" },
        { status: 400 },
      );
    }

    const exam = await prisma.exam.create({
      data: {
        subjectId,
        title: title.trim(),
        date: parsedDate,
        topics: topics?.trim() || null,
        materialsUrl: materialsUrl?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: { subject: true },
    });

    await notifyAllStudents({
      type: "EVENT",
      title: `Контрольная: ${exam.subject.name}`,
      message: `${exam.title} назначена на ${parsedDate.toLocaleDateString("ru-RU")}`,
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

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isLeaderOrHigher(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав для редактирования" }, { status: 403 });
    }

    const body = await req.json();
    const { id, subjectId, title, date, topics, materialsUrl, notes } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID контрольной обязателен" }, { status: 400 });
    }

    const existing = await prisma.exam.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Контрольная не найдена" }, { status: 404 });
    }

    const updateData: any = {};
    if (subjectId && typeof subjectId === "string") updateData.subjectId = subjectId;
    if (title && typeof title === "string" && title.trim()) updateData.title = title.trim();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        updateData.date = parsedDate;
      }
    }
    if (typeof topics === "string") updateData.topics = topics.trim() || null;
    if (typeof materialsUrl === "string") updateData.materialsUrl = materialsUrl.trim() || null;
    if (typeof notes === "string") updateData.notes = notes.trim() || null;

    const updated = await prisma.exam.update({
      where: { id },
      data: updateData,
      include: { subject: true },
    });

    // Notify students about the change
    await notifyAllStudents({
      type: "EVENT",
      title: `Обновлена контрольная: ${updated.subject.name}`,
      message: `${updated.title} на ${new Date(updated.date).toLocaleDateString("ru-RU")}`,
      link: `/tests?exam=${updated.id}`,
    });

    await logAuditEvent({
      userId: user.id,
      action: "EXAM_UPDATED",
      entity: "EXAM",
      entityId: id,
      details: { before: existing, after: updated },
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (error: any) {
    console.error("Update exam error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка обновления контрольной" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isLeaderOrHigher(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав для удаления" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID контрольной не указан" }, { status: 400 });
    }

    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Контрольная не найдена" }, { status: 404 });
    }

    await prisma.exam.delete({ where: { id } });

    await logAuditEvent({
      userId: user.id,
      action: "EXAM_DELETED",
      entity: "EXAM",
      entityId: id,
      details: { title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete exam error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка удаления контрольной" },
      { status: 500 },
    );
  }
}
