import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageUsers } from "@/lib/auth/rbac";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");

    const where: any = {};
    if (entity && entity !== "ALL") {
      where.entity = entity;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("Audit logs API error:", error);
    return NextResponse.json(
      { error: "Ошибка получения аудита" },
      { status: 500 },
    );
  }
}
