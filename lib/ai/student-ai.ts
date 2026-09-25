import { getGeminiClient, GEMINI_MODEL, generateContentWithFallback } from './gemini-client';
import prisma from '@/lib/prisma';

export async function askStudentAI(prompt: string, studentId?: string) {
  const client = getGeminiClient();

  // Gather authorized context for student
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon..7=Sun

  // Active homework
  const homeworks = await prisma.homework.findMany({
    where: {
      dueDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    include: {
      subject: { select: { name: true, shortName: true } },
    },
    take: 15,
    orderBy: { dueDate: 'asc' },
  });

  // Upcoming exams
  const exams = await prisma.exam.findMany({
    where: {
      date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    include: {
      subject: { select: { name: true } },
    },
    take: 10,
    orderBy: { date: 'asc' },
  });

  // Today's lessons
  const lessons = await prisma.scheduleLesson.findMany({
    where: { dayOfWeek: dayOfWeek <= 6 ? dayOfWeek : 1 },
    include: {
      subject: { select: { name: true } },
      classroom: { select: { number: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  const contextData = {
    currentDate: new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    todayLessons: lessons.map((l) => ({
      time: `${l.startTime} – ${l.endTime}`,
      subject: l.subject.name,
      room: l.classroom?.number ? `Каб. ${l.classroom.number}` : 'Кабинет не указан',
      teacher: l.teacher ? `${l.teacher.lastName} ${l.teacher.firstName}` : 'Учитель не указан',
    })),
    upcomingHomework: homeworks.map((h) => ({
      subject: h.subject.name,
      task: h.title,
      details: h.description,
      due: new Date(h.dueDate).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      }),
    })),
    upcomingExams: exams.map((e) => ({
      subject: e.subject.name,
      title: e.title,
      date: new Date(e.date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      }),
      topics: e.topics,
    })),
  };

  // 1. Try Gemini first if client is available
  if (client) {
    try {
      const systemPrompt = `Ты — Class AI, дружелюбный, умный и вдохновляющий персональный школьный помощник 7-«Б» класса (Школа №180) в системе ClassOS.
Твоя цель:
1. Помогать одноклассникам в учёбе: просто и понятно объяснять сложные правила, формулы (по алгебре, геометрии, физике, русскому языку и т.д.), разбирать параграфы и задания.
2. Отвечать на вопросы по расписанию, домашним заданиям и контрольным работам нашего класса.
3. Отвечать структурированно, с форматированием (абзацы, списки, выделение ключевых моментов жирным).
4. Опираться на актуальные данные класса:
${JSON.stringify(contextData, null, 2)}

Если спрашивают про уроки или домашку, отвечай точно по этим данным. Если данных нет, скажи, что в электронный дневник пока не внесли.
Будь вежливым, поддерживающим и позитивным!`;

      const response = await generateContentWithFallback(client, {
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nВопрос ученика: ${prompt}` }],
          },
        ],
      });

      if (response && response.text) {
        return {
          text: response.text,
          contextUsed: contextData,
        };
      }
    } catch (err: any) {
      console.warn('[StudentAI] Gemini call failed, using intelligent local engine:', err?.message || err);
      // Fall through to local engine
    }
  }

  // 2. Intelligent Local Response Engine (guaranteed zero downtime)
  const queryLower = prompt.toLowerCase();

  // Homework Intent
  if (queryLower.includes('дз') || queryLower.includes('домашк') || queryLower.includes('задали') || queryLower.includes('задание')) {
    if (contextData.upcomingHomework.length === 0) {
      return {
        text: `📚 **Домашние задания:**\n\nНа ближайшие дни активных домашних заданий в системе не найдено! Можно отдохнуть или повторить пройденный материал. 🎯`,
        contextUsed: contextData,
      };
    }
    const list = contextData.upcomingHomework
      .map((h, i) => `${i + 1}. **${h.subject}** (к ${h.due}):\n   ${h.task}${h.details ? `\n   *Детали:* ${h.details}` : ''}`)
      .join('\n\n');
    return {
      text: `📚 **Актуальные домашние задания для 7-«Б» класса:**\n\n${list}\n\nУдачи в подготовке! Если нужна помощь с конкретной задачей — просто напиши мне условие! 💡`,
      contextUsed: contextData,
    };
  }

  // Schedule Intent
  if (queryLower.includes('расписани') || queryLower.includes('урок') || queryLower.includes('что сегодня') || queryLower.includes('первый урок') || queryLower.includes('пар')) {
    if (contextData.todayLessons.length === 0) {
      return {
        text: `⏰ **Расписание уроков:**\n\nНа сегодня уроков в расписании нет (выходной или каникулы). Отличный повод набраться сил! 🌟`,
        contextUsed: contextData,
      };
    }
    const list = contextData.todayLessons
      .map((l, i) => `${i + 1}. **${l.subject}** (${l.time})\n   📍 ${l.room} • 👤 ${l.teacher}`)
      .join('\n\n');
    return {
      text: `⏰ **Расписание уроков на ${contextData.currentDate}:**\n\n${list}\n\nНе забудь проверить сменку и тетради к урокам! 🎒`,
      contextUsed: contextData,
    };
  }

  // Exams Intent
  if (queryLower.includes('контрольн') || queryLower.includes('экзамен') || queryLower.includes('тест') || queryLower.includes('срез')) {
    if (contextData.upcomingExams.length === 0) {
      return {
        text: `📝 **Контрольные работы:**\n\nВ ближайшее время контрольных и проверочных работ не запланировано. Учимся в спокойном темпе! ✨`,
        contextUsed: contextData,
      };
    }
    const list = contextData.upcomingExams
      .map((e, i) => `${i + 1}. **${e.subject}** — *${e.title}*\n   📅 Дата: **${e.date}**${e.topics ? `\n   📖 Темы: ${e.topics}` : ''}`)
      .join('\n\n');
    return {
      text: `📝 **Предстоящие контрольные работы 7-«Б» класса:**\n\n${list}\n\nСоветую начать повторение тем заранее! Если нужно объяснить формулу или правило — спрашивай. 🚀`,
      contextUsed: contextData,
    };
  }

  // Greeting Intent
  if (queryLower.includes('привет') || queryLower.includes('здравствуй') || queryLower.includes('салам') || queryLower.includes('хай') || queryLower.includes('кто ты')) {
    return {
      text: `👋 Привет! Я **Class AI** — персональный школьный помощник 7-«Б» класса школы №180.\n\nЯ могу:\n• Показать актуальное **расписание** и кабинеты\n• Подсказать, что задали по **домашним заданиям**\n• Напомнить даты **контрольных работ**\n• Объяснить сложные темы по математике, физике, русскому или английскому языку\n\nЧем могу помочь прямо сейчас?`,
      contextUsed: contextData,
    };
  }

  // Default informative educational response
  return {
    text: `💡 **Ответ Class AI:**\n\nВы спросили: *"${prompt}"*\n\nНа сегодня в расписании **${contextData.todayLessons.length} уроков**, активных домашних заданий: **${contextData.upcomingHomework.length}**, запланировано контрольных: **${contextData.upcomingExams.length}**.\n\nВы можете спросить меня:\n• *"Что задали на завтра?"*\n• *"Какое расписание на сегодня?"*\n• *"Когда ближайшая контрольная?"*\n• Или напишите любую задачу/вопрос по уроку, и я помогу разобраться!`,
    contextUsed: contextData,
  };
}
