import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
async function access(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const message = await prisma.message.findFirst({
    where: {
      id,
      isDeleted: false,
      conversation: { members: { some: { userId: user.id } } },
    },
    include: { attachments: true },
  });
  return message ? { user, message } : null;
}
function emit(conversationId: string, payload: any) {
  (global as any).io
    ?.to(`conv:${conversationId}`)
    .emit("message:updated", payload);
}
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const context = await access(params.id);
    if (!context || context.message.senderId !== context.user.id)
      return NextResponse.json(
        { error: "Нельзя изменять это сообщение" },
        { status: 403 },
      );
    const { content } = await req.json();
    if (
      typeof content !== "string" ||
      (!content.trim() && !context.message.attachments.length)
    )
      return NextResponse.json(
        { error: "Укажите текст сообщения" },
        { status: 400 },
      );
    const message = await prisma.message.update({
      where: { id: params.id },
      data: { content: content.trim(), editedAt: new Date() },
    });
    emit(message.conversationId, message);
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: "Не удалось изменить сообщение" },
      { status: 500 },
    );
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const context = await access(params.id);
    if (!context || context.message.senderId !== context.user.id)
      return NextResponse.json(
        { error: "Нельзя удалить это сообщение" },
        { status: 403 },
      );
    const message = await prisma.message.update({
      where: { id: params.id },
      data: { isDeleted: true },
    });
    emit(message.conversationId, message);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось удалить сообщение" },
      { status: 500 },
    );
  }
}
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const context = await access(params.id);
    if (!context)
      return NextResponse.json(
        { error: "Нет доступа к сообщению" },
        { status: 403 },
      );
    const { action, conversationId, reason } = await req.json();
    if (action === "report") {
      if (typeof reason !== "string" || !reason.trim())
        return NextResponse.json({ error: "Укажите причину" }, { status: 400 });
      await prisma.messageReport.create({
        data: {
          messageId: params.id,
          reporterId: context.user.id,
          reason: reason.trim(),
        },
      });
      return NextResponse.json({ success: true });
    }
    if (action !== "forward")
      return NextResponse.json(
        { error: "Неизвестное действие" },
        { status: 400 },
      );
    const member = await prisma.conversationMember.findFirst({
      where: { conversationId, userId: context.user.id },
    });
    if (!member)
      return NextResponse.json(
        { error: "Нет доступа к беседе" },
        { status: 403 },
      );
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: context.user.id,
        content: context.message.content,
        type: context.message.type,
        isForwarded: true,
        attachments: {
          create: context.message.attachments.map((a) => ({
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
            waveform: a.waveform,
          })),
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        attachments: true,
        reactions: true,
      },
    });
    (global as any).io
      ?.to(`conv:${conversationId}`)
      .emit("message:received", message);
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: "Не удалось выполнить действие" },
      { status: 500 },
    );
  }
}
