import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
    const member = await prisma.conversationMember.findFirst({
      where: { conversationId: resourceId, userId: user.id },
    });
    if (!member)
      return NextResponse.json(
        { error: "Нет доступа к беседе" },
        { status: 403 },
      );
    const { messageId } = await req.json();
    const message = await prisma.message.findFirst({
      where: { id: messageId, conversationId: resourceId },
    });
    if (!message)
      return NextResponse.json(
        { error: "Сообщение не найдено" },
        { status: 404 },
      );
    await prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadMessageId: message.id },
    });
    (global as any).io
      ?.to(`conv:${resourceId}`)
      .emit("message:read_update", {
        conversationId: resourceId,
        messageId: message.id,
        userId: user.id,
        createdAt: message.createdAt,
      });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Ошибка отметки прочтения" },
      { status: 500 },
    );
  }
}
