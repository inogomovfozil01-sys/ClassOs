import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const classrooms = await prisma.classroom.findMany({
      orderBy: { number: "asc" },
    });

    return NextResponse.json({ classrooms });
  } catch (error: any) {
    console.error("Fetch classrooms error:", error);
    return NextResponse.json(
      { error: "Ошибка получения кабинетов" },
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
    const { number, building, floor, notes } = body;

    if (!number) {
      return NextResponse.json(
        { error: "Укажите номер или название кабинета" },
        { status: 400 },
      );
    }

    const classroom = await prisma.classroom.create({
      data: {
        number: number.trim(),
        building: building?.trim() || null,
        floor: floor?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CLASSROOM_CREATED",
      entity: "CLASSROOM",
      entityId: classroom.id,
      details: { number: classroom.number },
    });

    return NextResponse.json({ success: true, classroom });
  } catch (error: any) {
    console.error("Create classroom error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания кабинета" },
      { status: 500 },
    );
  }
}
