import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // Find all conversations user is a member of, plus the general CLASS chat
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const conversations = await Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation;
        const lastMessage = conv.messages[0] || null;
        const lastRead = m.lastReadMessageId
          ? await prisma.message.findUnique({
              where: { id: m.lastReadMessageId },
              select: { createdAt: true },
            })
          : null;
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            isDeleted: false,
            senderId: { not: user.id },
            ...(lastRead ? { createdAt: { gt: lastRead.createdAt } } : {}),
          },
        });

        // Determine chat title & avatar for DIRECT chats
        let displayName = conv.name;
        let displayAvatar = conv.avatarUrl;
        let otherUser = null;

        if (conv.type === "DIRECT") {
          otherUser = conv.members.find(
            (member) => member.userId !== user.id,
          )?.user;
          if (otherUser) {
            displayName = `${otherUser.lastName} ${otherUser.firstName}`;
            displayAvatar = otherUser.avatarUrl;
          }
        }

        return {
          id: conv.id,
          type: conv.type,
          name: displayName || "Беседа",
          avatarUrl: displayAvatar,
          otherUser,
          membersCount: conv.members.length,
          unreadCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                type: lastMessage.type,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { error: "Ошибка получения диалогов" },
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

    const { type, targetUserId, name, memberIds } = await req.json();

    if (type === "DIRECT") {
      if (!targetUserId) {
        return NextResponse.json(
          { error: "Укажите собеседника" },
          { status: 400 },
        );
      }

      // Check if direct conversation already exists between these two users
      const existing = await prisma.conversation.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId: user.id } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
      });

      if (existing) {
        return NextResponse.json({ success: true, conversation: existing });
      }

      // Create new direct conversation
      const conv = await prisma.conversation.create({
        data: {
          type: "DIRECT",
          createdById: user.id,
          members: {
            create: [
              { userId: user.id, role: "MEMBER" },
              { userId: targetUserId, role: "MEMBER" },
            ],
          },
        },
      });

      return NextResponse.json({ success: true, conversation: conv });
    }

    if (type === "GROUP") {
      if (!name) {
        return NextResponse.json(
          { error: "Укажите название группы" },
          { status: 400 },
        );
      }

      const allMemberIds = Array.from(new Set([user.id, ...(memberIds || [])]));

      const conv = await prisma.conversation.create({
        data: {
          type: "GROUP",
          name: name.trim(),
          createdById: user.id,
          members: {
            create: allMemberIds.map((uId) => ({
              userId: uId,
              role: uId === user.id ? "ADMIN" : "MEMBER",
            })),
          },
        },
      });

      return NextResponse.json({ success: true, conversation: conv });
    }

    return NextResponse.json(
      { error: "Некорректный тип чата" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания чата" },
      { status: 500 },
    );
  }
}
