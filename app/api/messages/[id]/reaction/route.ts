import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { emoji } = await req.json();
    if (!emoji) {
      return NextResponse.json({ error: "Укажите реакцию" }, { status: 400 });
    }

    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: resourceId,
          userId: user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "REMOVED", emoji });
    } else {
      const reaction = await prisma.messageReaction.create({
        data: {
          messageId: resourceId,
          userId: user.id,
          emoji,
        },
      });
      return NextResponse.json({ action: "ADDED", reaction });
    }
  } catch (error: any) {
    console.error("Message reaction error:", error);
    return NextResponse.json({ error: "Ошибка реакции" }, { status: 500 });
  }
}
