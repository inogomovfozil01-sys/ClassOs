import { cookies } from 'next/headers';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'classos_session';
const SESSION_MAX_AGE_DAYS = 30;

export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  });

  return { session, token, expiresAt };
}

export async function getSessionUser(token: string) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          middleName: true,
          role: true,
          avatarUrl: true,
          isBlocked: true,
          mustChangePassword: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.user.isBlocked) {
    return null;
  }

  return session.user;
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    return await getSessionUser(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function destroySession(token: string) {
  if (!token) return;
  await prisma.session.delete({ where: { token } }).catch(() => {});
}

export async function destroyAllUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
}
