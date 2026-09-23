import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
const store = require("@/lib/emaktab-store.cjs");
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!store.STUDENT_ROLES.includes(user.role))
    return NextResponse.json({ personal: null });
  const record = await prisma.systemSetting.findUnique({
    where: { key: store.PREFIX + user.id },
  });
  return NextResponse.json({
    personal: store.present(
      record
        ? store.parseRecord(record.value)
        : store.initialRecord(new Date()),
    ),
  });
}
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!store.STUDENT_ROLES.includes(user.role))
    return NextResponse.json(
      { error: "Подтверждать доступ может только сам ученик" },
      { status: 403 },
    );
  const body = await req.json();
  if (body.userId && body.userId !== user.id)
    return NextResponse.json(
      { error: "Можно изменить только свой статус" },
      { status: 403 },
    );
  if (!["WORKING", "NEEDS_HELP"].includes(body.status))
    return NextResponse.json(
      { error: "Выберите статус доступа" },
      { status: 400 },
    );
  if (Object.keys(body).some((key) => !["status", "userId"].includes(key)))
    return NextResponse.json(
      { error: "Отправляйте только статус, без логина и пароля" },
      { status: 400 },
    );
  const now = new Date();
  const record = {
    status: body.status,
    confirmedAt: now.toISOString(),
    nextReminderAt: new Date(now.getTime() + store.INTERVAL_MS).toISOString(),
  };
  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key: store.PREFIX + user.id },
      create: { key: store.PREFIX + user.id, value: JSON.stringify(record) },
      update: { value: JSON.stringify(record) },
    });
    await tx.notification.updateMany({
      where: { userId: user.id, link: "/emaktab", isRead: false },
      data: { isRead: true },
    });
  });
  return NextResponse.json({ personal: store.present(record) });
}
