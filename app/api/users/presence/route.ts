import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const now = Date.now();

    // Touch current user's presence on GET as well
    try {
      await prisma.systemSetting.upsert({
        where: { key: `presence:${user.id}` },
        update: { value: String(now) },
        create: { key: `presence:${user.id}`, value: String(now) },
      });
    } catch {}

    const settings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: "presence:" } },
    });

    const onlineUserIds: string[] = [];
    const lastSeen: Record<string, string> = {};

    for (const s of settings) {
      const uId = s.key.replace("presence:", "");
      const ts = Number(s.value);
      if (!isNaN(ts)) {
        lastSeen[uId] = new Date(ts).toISOString();
        if (now - ts < 90 * 1000) {
          onlineUserIds.push(uId);
        }
      }
    }

    // Ensure current user is marked online
    if (!onlineUserIds.includes(user.id)) {
      onlineUserIds.push(user.id);
    }
    lastSeen[user.id] = new Date(now).toISOString();

    return NextResponse.json({ onlineUserIds, lastSeen });
  } catch (error: any) {
    console.error("Get presence error:", error);
    return NextResponse.json(
      { error: "Ошибка получения статусов присутствия" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const now = Date.now();
    await prisma.systemSetting.upsert({
      where: { key: `presence:${user.id}` },
      update: { value: String(now) },
      create: { key: `presence:${user.id}`, value: String(now) },
    });

    return NextResponse.json({ success: true, timestamp: now });
  } catch (error: any) {
    console.error("Presence heartbeat error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления присутствия" },
      { status: 500 },
    );
  }
}
