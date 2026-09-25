import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { getSticker } from "@/lib/chat-expressions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // Verify membership
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: resourceId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Доступ к чату запрещён" },
        { status: 403 },
      );
    }

    // Check deleted-for-me messages
    const deletedSetting = await prisma.systemSetting.findUnique({
      where: { key: `deleted_msgs:${user.id}` },
    });
    const userDeletedSet = new Set<string>();
    if (deletedSetting?.value) {
      try {
        const arr = JSON.parse(deletedSetting.value);
        if (Array.isArray(arr)) arr.forEach((id: string) => userDeletedSet.add(id));
      } catch {}
    }

    const cursor = new URL(req.url).searchParams.get("before");
    const query = new URL(req.url).searchParams.get("q")?.trim();
    const messages = await prisma.message.findMany({
      where: {
        conversationId: resourceId,
        isDeleted: false,
        ...(query ? { content: { contains: query } } : {}),
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
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 101,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const activeMessages = messages.filter((m) => !userDeletedSet.has(m.id));
    const page = activeMessages.slice(0, 100).reverse();

    // Map readers per message
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: resourceId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const lastReadIds = members
      .map((m) => m.lastReadMessageId)
      .filter(Boolean) as string[];

    const readMessages = lastReadIds.length > 0
      ? await prisma.message.findMany({
          where: { id: { in: lastReadIds } },
          select: { id: true, createdAt: true },
        })
      : [];

    const lastReadMap = new Map<string, number>();
    for (const rm of readMessages) {
      lastReadMap.set(rm.id, rm.createdAt.getTime());
    }

    const memberReadUntil = new Map<string, number>();
    for (const m of members) {
      if (m.lastReadMessageId && lastReadMap.has(m.lastReadMessageId)) {
        memberReadUntil.set(m.userId, lastReadMap.get(m.lastReadMessageId)!);
      }
    }

    const formattedMessages = page.map((m) => {
      const msgTime = m.createdAt.getTime();
      const readByUsers = members
        .filter(
          (mbr) =>
            mbr.userId !== m.senderId &&
            (memberReadUntil.get(mbr.userId) || 0) >= msgTime,
        )
        .map((mbr) => mbr.user);

      return {
        ...m,
        readByUsers,
        readByOther: readByUsers.length > 0,
      };
    });

    return NextResponse.json({
      messages: formattedMessages,
      hasMore: activeMessages.length > 100,
      nextCursor: page[0]?.id || null,
    });
  } catch (error: any) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { error: "Ошибка получения сообщений" },
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // Check membership
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: resourceId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const body = await req.json();
    const { content, type, replyToId, attachments } = body;

    if (type === "STICKER" && (!getSticker(content) || attachments?.length)) {
      return NextResponse.json({ error: "Выберите стикер из набора ClassOS" }, { status: 400 });
    }

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: "Сообщение не может быть пустым" },
        { status: 400 },
      );
    }

    const message = await prisma.message.create({
      data: {
        conversationId: resourceId,
        senderId: user.id,
        content: content?.trim() || "",
        type: type || (attachments?.length ? "IMAGE" : "TEXT"),
        replyToId: replyToId || null,
        attachments: attachments?.length
          ? {
              create: attachments.map((att: any) => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize || 0,
                mimeType: att.mimeType || "application/octet-stream",
                waveform: att.waveform || null,
              })),
            }
          : undefined,
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

    // Realtime broadcast via global io if available
    if ((global as any).io) {
      (global as any).io
        .to(`conv:${resourceId}`)
        .emit("message:received", message);
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка отправки сообщения" },
      { status: 500 },
    );
  }
}
