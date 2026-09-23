import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
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
          messageId: params.id,
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
          messageId: params.id,
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
