import prisma from '@/lib/prisma';

export interface CreateNotificationParams {
  userId: string;
  type: 'HOMEWORK' | 'SCHEDULE' | 'NEWS' | 'EVENT' | 'DUTY' | 'SYSTEM' | 'MESSAGE';
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export async function notifyAllStudents(params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const students = await prisma.user.findMany({
      where: {
        isBlocked: false,
      },
      select: { id: true },
    });

    const notifications = students.map((s) => ({
      userId: s.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });
  } catch (error) {
    console.error('Failed to broadcast notifications:', error);
  }
}
