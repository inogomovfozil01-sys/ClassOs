import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canPublishHomework } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyAllStudents } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    const where: any = {};
    if (subjectId) {
      where.subjectId = subjectId;
    }

    const homeworkList = await prisma.homework.findMany({
      where,
      include: {
        subject: true,
        createdBy: {
          select: { firstName: true, lastName: true, role: true },
        },
        attachments: true,
        statuses: {
          where: { studentId: user.id },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Format with personal status
    const formatted = homeworkList.map((hw) => ({
      ...hw,
      personalStatus: hw.statuses[0]?.status || "NOT_STARTED",
    }));

    return NextResponse.json({ homework: formatted });
  } catch (error: any) {
    console.error("Fetch homework error:", error);
    return NextResponse.json({ error: "Ошибка получения ДЗ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canPublishHomework(user.role)) {
      return NextResponse.json(
        { error: "Недостаточно прав для публикации ДЗ" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { subjectId, title, description, dueDate, attachments } = body;

    if (!subjectId || !title || !dueDate) {
      return NextResponse.json(
        { error: "Заполните предмет, задание и срок сдачи" },
        { status: 400 },
      );
    }

    const homework = await prisma.homework.create({
      data: {
        subjectId,
        title: title.trim(),
        description: description?.trim() || "",
        dueDate: new Date(dueDate),
        createdById: user.id,
        attachments: attachments?.length
          ? {
              create: attachments.map((a: any) => ({
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                fileSize: a.fileSize || 0,
                mimeType: a.mimeType || "application/octet-stream",
              })),
            }
          : undefined,
      },
      include: {
        subject: true,
        attachments: true,
      },
    });

    // Notify all students
    await notifyAllStudents({
      type: "HOMEWORK",
      title: `Новое ДЗ: ${homework.subject.name}`,
      message: `${homework.title} (срок: ${new Date(dueDate).toLocaleDateString("ru-RU")})`,
      link: `/homework/${homework.id}`,
    });

    await logAuditEvent({
      userId: user.id,
      action: "HOMEWORK_PUBLISHED",
      entity: "HOMEWORK",
      entityId: homework.id,
      details: { subject: homework.subject.name, title: homework.title },
    });

    return NextResponse.json({ success: true, homework });
  } catch (error: any) {
    console.error("Publish homework error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка публикации ДЗ" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canPublishHomework(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await req.json();
    const { id, subjectId, title, description, dueDate, attachments } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID задания обязателен" }, { status: 400 });
    }

    const existing = await prisma.homework.findUnique({
      where: { id },
      include: { subject: true, attachments: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Задание не найдено" },
        { status: 404 },
      );
    }

    const updateData: any = {};
    if (typeof subjectId === "string" && subjectId) updateData.subjectId = subjectId;
    if (typeof title === "string" && title.trim()) updateData.title = title.trim();
    if (typeof description === "string") updateData.description = description.trim();
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) updateData.dueDate = parsed;
    }

    // Attachments update if provided
    if (Array.isArray(attachments)) {
      // Delete existing attachments and create new
      await prisma.homeworkAttachment.deleteMany({ where: { homeworkId: id } });
      if (attachments.length > 0) {
        updateData.attachments = {
          create: attachments.map((a: any) => ({
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileSize: a.fileSize || 0,
            mimeType: a.mimeType || "application/octet-stream",
          })),
        };
      }
    }

    const homework = await prisma.homework.update({
      where: { id },
      data: updateData,
      include: { subject: true, attachments: true },
    });

    await notifyAllStudents({
      type: "HOMEWORK",
      title: `Изменено ДЗ: ${homework.subject.name}`,
      message: homework.title,
      link: `/homework/${id}`,
    });

    await logAuditEvent({
      userId: user.id,
      action: "HOMEWORK_UPDATED",
      entity: "HOMEWORK",
      entityId: id,
      details: {
        before: { title: existing.title, dueDate: existing.dueDate },
        after: { title: homework.title, dueDate: homework.dueDate },
      },
    });

    return NextResponse.json({ success: true, homework });
  } catch (error: any) {
    console.error("Update homework error:", error);
    return NextResponse.json(
      { error: error.message || "Не удалось изменить домашнее задание" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canPublishHomework(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID задания не указан" }, { status: 400 });
    }

    const existing = await prisma.homework.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
    }

    await prisma.homework.delete({ where: { id } });

    await logAuditEvent({
      userId: user.id,
      action: "HOMEWORK_DELETED",
      entity: "HOMEWORK",
      entityId: id,
      details: { title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete homework error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка удаления задания" },
      { status: 500 },
    );
  }
}
