import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isAdminOrOwner, isLeaderOrHigher } from "@/lib/auth/rbac";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    }

    const isMember = conversation.members.some((m) => m.userId === user.id);
    if (!isMember && !isAdminOrOwner(user.role)) {
      return NextResponse.json({ error: "Нет доступа к чату" }, { status: 403 });
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Fetch conversation details error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки информации о чате" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    }

    const currentMember = conversation.members.find((m) => m.userId === user.id);
    const isConvAdmin =
      currentMember?.role === "ADMIN" ||
      conversation.createdById === user.id ||
      isAdminOrOwner(user.role) ||
      isLeaderOrHigher(user.role);

    const body = await req.json();
    const { action } = body;

    // 1. Rename Group
    if (action === "rename") {
      if (!isConvAdmin) {
        return NextResponse.json(
          { error: "Только администратор группы может изменить название" },
          { status: 403 },
        );
      }
      const { name } = body;
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Укажите название группы" },
          { status: 400 },
        );
      }

      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: { name: name.trim() },
      });

      return NextResponse.json({ success: true, conversation: updated });
    }

    // 2. Add Member to Group
    if (action === "add_member") {
      if (!isConvAdmin) {
        return NextResponse.json(
          { error: "Только администратор группы может добавлять участников" },
          { status: 403 },
        );
      }
      const { userId } = body;
      if (!userId) {
        return NextResponse.json(
          { error: "Укажите пользователя для добавления" },
          { status: 400 },
        );
      }

      const exists = conversation.members.some((m) => m.userId === userId);
      if (exists) {
        return NextResponse.json(
          { error: "Пользователь уже состоит в группе" },
          { status: 400 },
        );
      }

      await prisma.conversationMember.create({
        data: {
          conversationId,
          userId,
          role: "MEMBER",
        },
      });

      return NextResponse.json({ success: true });
    }

    // 3. Remove Member from Group
    if (action === "remove_member") {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json(
          { error: "Укажите пользователя для удаления" },
          { status: 400 },
        );
      }

      // Member can remove themselves (leave group)
      const isSelf = userId === user.id;
      if (!isSelf && !isConvAdmin) {
        return NextResponse.json(
          { error: "Только администратор группы может удалять участников" },
          { status: 403 },
        );
      }

      // Cannot remove creator
      if (conversation.createdById === userId && !isSelf) {
        return NextResponse.json(
          { error: "Нельзя удалить создателя группы" },
          { status: 400 },
        );
      }

      await prisma.conversationMember.deleteMany({
        where: {
          conversationId,
          userId,
        },
      });

      return NextResponse.json({ success: true });
    }

    // 4. Change Member Role (ADMIN / MEMBER)
    if (action === "set_role") {
      if (!isConvAdmin) {
        return NextResponse.json(
          { error: "Только администратор группы может назначать права" },
          { status: 403 },
        );
      }
      const { userId, role } = body;
      if (!userId || !["ADMIN", "MEMBER"].includes(role)) {
        return NextResponse.json(
          { error: "Укажите корректную роль (ADMIN или MEMBER)" },
          { status: 400 },
        );
      }

      // Cannot downgrade group creator
      if (conversation.createdById === userId && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Нельзя снять права администратора у создателя группы" },
          { status: 400 },
        );
      }

      await prisma.conversationMember.updateMany({
        where: {
          conversationId,
          userId,
        },
        data: { role },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Неизвестное действие" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Update conversation error:", error);
    return NextResponse.json(
      { error: error?.message || "Ошибка обновления настроек чата" },
      { status: 500 },
    );
  }
}
