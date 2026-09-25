import { getGeminiClient, GEMINI_MODEL, generateContentWithFallback } from './gemini-client';
import prisma from '@/lib/prisma';

export async function askStudentAI(prompt: string, studentId: string) {
  const client = getGeminiClient();

  // Gather authorized context for student
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon..7=Sun

  // Active homework
  const homeworks = await prisma.homework.findMany({
    where: {
      dueDate: { gte: new Date(today.setHours(0, 0, 0, 0)) },
    },
    include: {
      subject: { select: { name: true, shortName: true } },
    },
    take: 10,
    orderBy: { dueDate: 'asc' },
  });

  // Upcoming exams
  const exams = await prisma.exam.findMany({
    where: {
      date: { gte: new Date() },
    },
    include: {
      subject: { select: { name: true } },
    },
    take: 5,
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
    currentDate: new Date().toISOString().split('T')[0],
    todayLessons: lessons.map((l) => ({
      time: `${l.startTime} - ${l.endTime}`,
      subject: l.subject.name,
      room: l.classroom?.number || 'Не указан',
      teacher: l.teacher ? `${l.teacher.lastName} ${l.teacher.firstName}` : 'Не указан',
    })),
    upcomingHomework: homeworks.map((h) => ({
      subject: h.subject.name,
      task: h.title,
      details: h.description,
      due: h.dueDate.toISOString().split('T')[0],
    })),
    upcomingExams: exams.map((e) => ({
      subject: e.subject.name,
      title: e.title,
      date: e.date.toISOString().split('T')[0],
      topics: e.topics,
    })),
  };

  if (!client) {
    // Intelligent local fallback if API key is not yet set
    return {
      text: `[Class AI Demo Mode] API ключ Gemini не настроен на сервере, но вот данные из системы:\n\n` +
        `• Уроков сегодня: ${contextData.todayLessons.length}\n` +
        `• Активных домашних заданий: ${contextData.upcomingHomework.length}\n` +
        `• Предстоящих контрольных: ${contextData.upcomingExams.length}\n\n` +
        `Для включения полного интеллектуального ассистента добавьте GEMINI_API_KEY в файл .env.`,
      contextUsed: contextData,
    };
  }

  try {
    const systemPrompt = `Ты — Class AI, умный школьный ассистент закрытой цифровой экосистемы класса ClassOS.
Твоя цель — помогать ученикам в учёбе: объяснять сложные темы, помогать разобраться с заданиями, отвечать на вопросы о расписании, контрольных и домашних заданиях.
Ты общаешься вежливо, доступно, вдохновляюще и структурированно.
Вот актуальные данные класса для ответа:
${JSON.stringify(contextData, null, 2)}
Если ученик спрашивает про расписание или ДЗ, опирайся строго на эти данные. Если данных в расписании или ДЗ нет, честно скажи, что лидер класса пока их не внёс.`;

    const response = await generateContentWithFallback(client, {
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nВопрос ученика: ${prompt}` }],
        },
      ],
    });

    return {
      text: response.text || 'Извините, не удалось сформировать ответ.',
      contextUsed: contextData,
    };
  } catch (error: any) {
    console.error('Error in student AI:', error);
    return {
      text: `Ошибка при обращении к AI: ${error?.message || 'Неизвестная ошибка'}.`,
      contextUsed: contextData,
    };
  }
}
