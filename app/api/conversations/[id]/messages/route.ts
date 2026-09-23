import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

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
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 101,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const page = messages.slice(0, 100).reverse();
    const readers = await prisma.conversationMember.findMany({
      where: { conversationId: resourceId, userId: { not: user.id } },
      select: { lastReadMessageId: true },
    });
    const readMessages = await prisma.message.findMany({
      where: {
        conversationId: resourceId,
        id: {
          in: readers.flatMap((r) =>
            r.lastReadMessageId ? [r.lastReadMessageId] : [],
          ),
        },
      },
      select: { createdAt: true },
    });
    const readUntil = Math.max(
      0,
      ...readMessages.map((m) => m.createdAt.getTime()),
    );
    return NextResponse.json({
      messages: page.map((m) => ({
        ...m,
        readByOther:
          m.senderId === user.id && m.createdAt.getTime() <= readUntil,
      })),
      hasMore: messages.length > 100,
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
