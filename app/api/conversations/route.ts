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

    // Collect all otherUser IDs and lastReadMessage IDs across conversations
    const otherUserIds = new Set<string>();
    for (const m of memberships) {
      for (const cm of m.conversation.members) {
        if (cm.userId !== user.id) otherUserIds.add(cm.userId);
      }
    }

    const lastReadIds = Array.from(
      new Set(
        memberships
          .flatMap((m) => m.conversation.members.map((cm) => cm.lastReadMessageId))
          .filter(Boolean) as string[],
      ),
    );

    // Fetch timestamps of read markers
    const readMessages =
      lastReadIds.length > 0
        ? await prisma.message.findMany({
            where: { id: { in: lastReadIds } },
            select: { id: true, createdAt: true },
          })
        : [];

    const readTimestampMap = new Map<string, number>();
    for (const rm of readMessages) {
      readTimestampMap.set(rm.id, rm.createdAt.getTime());
    }

    // Fetch presence info from SystemSetting
    const presenceSettings =
      otherUserIds.size > 0
        ? await prisma.systemSetting.findMany({
            where: {
              key: {
                in: Array.from(otherUserIds).map((id) => `presence:${id}`),
              },
            },
          })
        : [];

    const presenceMap = new Map<string, number>();
    for (const ps of presenceSettings) {
      const uId = ps.key.replace("presence:", "");
      const ts = Number(ps.value);
      if (!isNaN(ts)) presenceMap.set(uId, ts);
    }

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

        // Determine read status of the last message
        let isLastMessageRead = false;
        if (lastMessage) {
          const msgTime = new Date(lastMessage.createdAt).getTime();
          if (lastMessage.senderId === user.id) {
            // Did any recipient read it?
            isLastMessageRead = conv.members.some((cm) => {
              if (cm.userId === user.id || !cm.lastReadMessageId) return false;
              const readTime = readTimestampMap.get(cm.lastReadMessageId);
              return readTime ? readTime >= msgTime : false;
            });
          } else {
            // Did current user read it?
            if (m.lastReadMessageId) {
              const myReadTime = readTimestampMap.get(m.lastReadMessageId);
              isLastMessageRead = myReadTime ? myReadTime >= msgTime : false;
            } else {
              isLastMessageRead = false;
            }
          }
        }

        // Determine chat title & avatar for DIRECT chats
        let displayName = conv.name;
        let displayAvatar = conv.avatarUrl;
        let otherUser: any = null;

        if (conv.type === "DIRECT") {
          const otherMember = conv.members.find(
            (member) => member.userId !== user.id,
          );
          if (otherMember?.user) {
            const lastSeenTs = presenceMap.get(otherMember.userId);
            otherUser = {
              ...otherMember.user,
              lastSeenAt: lastSeenTs ? new Date(lastSeenTs).toISOString() : null,
              isOnline: lastSeenTs ? Date.now() - lastSeenTs < 90 * 1000 : false,
            };
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
                isRead: isLastMessageRead,
              }
            : null,
        };
      }),
    );

    // Strictly sort conversations by latest message timestamp descending
    conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

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
