import prisma from '@/lib/prisma';
import { getGeminiClient, GEMINI_MODEL, generateContentWithFallback } from './gemini-client';

export type ActionRisk = 'READ' | 'WRITE' | 'HIGH_RISK';

export interface JarvisAction {
  id: string;
  tool: string;
  params: Record<string, any>;
  risk: ActionRisk;
  summary: string;
}

// 1. Read Tools (executed immediately)
export async function executeReadTool(toolName: string, params: any): Promise<any> {
  switch (toolName) {
    case 'getUsers': {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
        orderBy: { lastName: 'asc' },
      });
      return { total: users.length, users };
    }

    case 'getSchedule': {
      const lessons = await prisma.scheduleLesson.findMany({
        include: {
          subject: { select: { name: true, shortName: true } },
          classroom: { select: { number: true } },
          teacher: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
      return { total: lessons.length, lessons };
    }

    case 'getHomework': {
      const homework = await prisma.homework.findMany({
        include: {
          subject: { select: { name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      });
      return { total: homework.length, homework };
    }

    case 'getEvents': {
      const events = await prisma.classEvent.findMany({
        include: {
          _count: { select: { rsvps: true } },
        },
        orderBy: { date: 'asc' },
      });
      return { total: events.length, events };
    }

    case 'getNews': {
      const news = await prisma.newsPost.findMany({
        include: {
          author: { select: { firstName: true, lastName: true } },
          _count: { select: { comments: true, reactions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return { total: news.length, news };
    }

    case 'getTables': {
      const tables = await prisma.customTable.findMany({
        include: {
          columns: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { rows: true } },
        },
      });
      return { total: tables.length, tables };
    }

    case 'getTableRows': {
      if (!params?.tableId) return { error: 'tableId is required' };
      const table = await prisma.customTable.findUnique({
        where: { id: params.tableId },
        include: {
          columns: { orderBy: { orderIndex: 'asc' } },
          rows: {
            include: {
              student: { select: { firstName: true, lastName: true } },
              cells: true,
            },
          },
        },
      });
      return table;
    }

    case 'getClassStats': {
      const [usersCount, subjectsCount, lessonsCount, activeHwCount, newsCount] = await Promise.all([
        prisma.user.count(),
        prisma.subject.count(),
        prisma.scheduleLesson.count(),
        prisma.homework.count({ where: { dueDate: { gte: new Date() } } }),
        prisma.newsPost.count(),
      ]);
      return {
        usersCount,
        subjectsCount,
        lessonsCount,
        activeHwCount,
        newsCount,
      };
    }

    case 'getAuditLog': {
      const logs = await prisma.auditLog.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      });
      return { total: logs.length, logs };
    }

    default:
      throw new Error(`Unknown read tool: ${toolName}`);
  }
}

// 2. Write & High-Risk Tools execution (called only after explicit admin confirmation)
export async function executeConfirmedAction(tool: string, params: any, currentUserId: string) {
  switch (tool) {
    case 'createNews': {
      const post = await prisma.newsPost.create({
        data: {
          title: params.title,
          content: params.content,
          category: params.category || 'Объявления',
          authorId: currentUserId,
        },
      });
      return { success: true, message: 'Новость успешно создана', post };
    }

    case 'createEvent': {
      const event = await prisma.classEvent.create({
        data: {
          title: params.title,
          description: params.description || '',
          date: params.date,
          time: params.time || null,
          location: params.location || null,
          authorId: currentUserId,
        },
      });
      return { success: true, message: 'Событие успешно создано', event };
    }

    case 'changeUserRole': {
      const targetUser = await prisma.user.findUnique({ where: { id: params.userId } });
      if (!targetUser) throw new Error('Пользователь не найден');
      if (targetUser.role === 'OWNER') throw new Error('Невозможно изменить роль Владельца');

      const updated = await prisma.user.update({
        where: { id: params.userId },
        data: { role: params.newRole },
      });
      return { success: true, message: `Роль пользователя изменена на ${params.newRole}`, user: updated };
    }

    case 'blockUser': {
      const targetUser = await prisma.user.findUnique({ where: { id: params.userId } });
      if (!targetUser) throw new Error('Пользователь не найден');
      if (targetUser.role === 'OWNER') throw new Error('Невозможно заблокировать Владельца');

      const updated = await prisma.user.update({
        where: { id: params.userId },
        data: { isBlocked: true },
      });
      return { success: true, message: 'Пользователь заблокирован', user: updated };
    }

    case 'unblockUser': {
      const updated = await prisma.user.update({
        where: { id: params.userId },
        data: { isBlocked: false },
      });
      return { success: true, message: 'Пользователь разблокирован', user: updated };
    }

    default:
      throw new Error(`Неизвестное действие: ${tool}`);
  }
}

// 3. Process JARVIS query
export async function processJarvisMessage(query: string, adminUserId: string) {
  const client = getGeminiClient();

  // If no Gemini API key configured, use a rule-based intent router
  if (!client) {
    const lower = query.toLowerCase();

    if (lower.includes('статистик') || lower.includes('показател') || lower.includes('обзор')) {
      const stats = await executeReadTool('getClassStats', {});
      return {
        reply: `📊 Статистика класса ClassOS:\n• Пользователей: ${stats?.usersCount ?? 0}\n• Предметов: ${stats?.subjectsCount ?? 0}\n• Уроков в расписании: ${stats?.lessonsCount ?? 0}\n• Активных ДЗ: ${stats?.activeHwCount ?? 0}\n• Новостей: ${stats?.newsCount ?? 0}`,
        pendingAction: null,
      };
    }

    if (lower.includes('пользовател') || lower.includes('ученик') || lower.includes('кто в классе')) {
      const users = await executeReadTool('getUsers', {});
      return {
        reply: `В классе зарегистрировано ${users?.total ?? 0} аккаунтов.`,
        data: users?.users ?? [],
        pendingAction: null,
      };
    }

    if (lower.includes('расписани')) {
      const schedule = await executeReadTool('getSchedule', {});
      return {
        reply: `В расписании сейчас ${schedule?.total ?? 0} уроков.`,
        data: schedule?.lessons ?? [],
        pendingAction: null,
      };
    }

    if (lower.includes('аудит') || lower.includes('логи') || lower.includes('действи')) {
      const logs = await executeReadTool('getAuditLog', {});
      return {
        reply: `Последние ${logs?.total ?? 0} записей журнала аудита получены.`,
        data: logs?.logs ?? [],
        pendingAction: null,
      };
    }

    return {
      reply: `JARVIS работает в базовом режиме (для подключения нейросети укажите GEMINI_API_KEY). Вы можете запросить: "пользователи", "статистика", "расписание", "логи аудита".`,
      pendingAction: null,
    };
  }

  // With Gemini Client:
  try {
    const stats = await executeReadTool('getClassStats', {});
    const prompt = `Ты — JARVIS, интеллектуальный системный ассистент администратора ClassOS.
Доступные read-инструменты: getUsers, getSchedule, getHomework, getEvents, getNews, getTables, getClassStats, getAuditLog.
Доступные write-инструменты (ТРЕБУЮТ подтверждения):
- createNews (params: { title, content, category })
- createEvent (params: { title, description, date, time, location })
Доступные high-risk инструменты (ТРЕБУЮТ критического подтверждения):
- changeUserRole (params: { userId, newRole })
- blockUser (params: { userId, reason })

Текущая сводка системы: ${JSON.stringify(stats)}

Запрос администратора: "${query}"

Если запрос требует чтения данных, вызови соответствующий read-инструмент.
Если запрос требует создания или изменения, верни действие с флагом actionRequired: true, чтобы показать карточку подтверждения администратору.

Верни СТРОГО JSON следующего формата:
{
  "reply": "Текстовое пояснение или ответ администратору",
  "readToolToRun": "название_инструмента_если_нужно_прочитать_дополнительно (или null)",
  "pendingAction": {
    "tool": "createNews | createEvent | changeUserRole | blockUser",
    "params": { ... },
    "risk": "WRITE" или "HIGH_RISK",
    "summary": "Краткое описание действия для карточки подтверждения"
  } (или null, если подтверждения не требуется)
}`;

    const response = await generateContentWithFallback(client, {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = response.text || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: raw, pendingAction: null };

    if (parsed.readToolToRun) {
      const toolResult = await executeReadTool(parsed.readToolToRun, {});
      return {
        reply: parsed.reply,
        data: toolResult,
        pendingAction: parsed.pendingAction,
      };
    }

    return {
      reply: parsed.reply,
      pendingAction: parsed.pendingAction,
    };
  } catch (error: any) {
    console.error('Error in JARVIS:', error);
    return {
      reply: `Ошибка обработки запроса JARVIS: ${error?.message || 'Неизвестная ошибка'}`,
      pendingAction: null,
    };
  }
}
