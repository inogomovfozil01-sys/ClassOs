import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminOrOwner, isLeaderOrHigher } from "@/lib/auth/rbac";

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
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const context = await access(resourceId);
    if (!context || context.message.senderId !== context.user.id)
      return NextResponse.json(
        { error: "Нельзя изменять это сообщение" },
        { status: 403 },
      );
    const { content } = await req.json();
    if (context.message.type === "STICKER") {
      return NextResponse.json({ error: "Стикеры нельзя редактировать" }, { status: 400 });
    }
    if (
      typeof content !== "string" ||
      (!content.trim() && !context.message.attachments.length)
    )
      return NextResponse.json(
        { error: "Укажите текст сообщения" },
        { status: 400 },
      );
    const message = await prisma.message.update({
      where: { id: resourceId },
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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: resourceId } = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "for_all";

    const message = await prisma.message.findUnique({
      where: { id: resourceId },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Сообщение не найдено" },
        { status: 404 },
      );
    }

    const isMember = message.conversation.members.length > 0;
    if (!isMember && !isAdminOrOwner(user.role)) {
      return NextResponse.json(
        { error: "Нет доступа к сообщению" },
        { status: 403 },
      );
    }

    // 1. Delete only for current user ("Удалить только у меня")
    if (mode === "for_me") {
      const key = `deleted_msgs:${user.id}`;
      const existing = await prisma.systemSetting.findUnique({ where: { key } });
      let ids: string[] = [];
      if (existing?.value) {
        try {
          ids = JSON.parse(existing.value);
        } catch {}
      }
      if (!ids.includes(resourceId)) {
        ids.push(resourceId);
        if (ids.length > 500) ids = ids.slice(-500);
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(ids) },
          create: { key, value: JSON.stringify(ids) },
        });
      }
      return NextResponse.json({ success: true, mode: "for_me", id: resourceId });
    }

    // 2. Delete for everyone ("Удалить у всех")
    const memberRole = message.conversation.members[0]?.role;
    const canDeleteForAll =
      message.senderId === user.id ||
      memberRole === "ADMIN" ||
      isAdminOrOwner(user.role) ||
      isLeaderOrHigher(user.role);

    if (!canDeleteForAll) {
      return NextResponse.json(
        { error: "Нельзя удалить это сообщение у всех" },
        { status: 403 },
      );
    }

    const updated = await prisma.message.update({
      where: { id: resourceId },
      data: { isDeleted: true },
    });

    emit(message.conversationId, updated);
    return NextResponse.json({ success: true, mode: "for_all", id: resourceId });
  } catch (error: any) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      { error: "Не удалось удалить сообщение" },
      { status: 500 },
    );
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const context = await access(resourceId);
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
          messageId: resourceId,
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
