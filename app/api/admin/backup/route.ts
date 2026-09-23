import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdminOrOwner(user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    // Export all primary class data
    const [
      users,
      subjects,
      teachers,
      classrooms,
      lessons,
      exceptions,
      homework,
      exams,
      duties,
      news,
      events,
      tables,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.subject.findMany(),
      prisma.teacherProfile.findMany(),
      prisma.classroom.findMany(),
      prisma.scheduleLesson.findMany(),
      prisma.scheduleException.findMany(),
      prisma.homework.findMany({ include: { attachments: true } }),
      prisma.exam.findMany(),
      prisma.duty.findMany(),
      prisma.newsPost.findMany({ include: { comments: true } }),
      prisma.classEvent.findMany({ include: { rsvps: true } }),
      prisma.customTable.findMany({
        include: { columns: true, rows: { include: { cells: true } } },
      }),
    ]);

    const backupData = {
      meta: {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: `@${user.username}`,
        ecosystem: "ClassOS Single Class",
      },
      data: {
        users,
        subjects,
        teachers,
        classrooms,
        lessons,
        exceptions,
        homework,
        exams,
        duties,
        news,
        events,
        tables,
      },
    };

    await logAuditEvent({
      userId: user.id,
      action: "SYSTEM_BACKUP_DOWNLOADED",
      entity: "SYSTEM",
    });

    const filename = `classos-backup-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Ошибка создания резервной копии" },
      { status: 500 },
    );
  }
}
