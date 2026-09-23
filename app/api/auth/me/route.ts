import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    const usersCount = await prisma.user.count();
    return NextResponse.json(
      { user: null, needsSetup: usersCount === 0 },
      { status: 401 },
    );
  }

  // Get unread notifications count
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return NextResponse.json({
    user,
    unreadNotifications: unreadCount,
  });
}
