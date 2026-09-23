import { getGeminiClient, GEMINI_MODEL } from './gemini-client';
import prisma from '@/lib/prisma';

export async function generateLeaderDraft(input: string) {
  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true, shortName: true },
  });

  const client = getGeminiClient();

  if (!client) {
    // Intelligent fallback parser if API key is not configured
    return {
      success: true,
      draft: {
        type: 'HOMEWORK',
        subjectId: subjects[0]?.id || '',
        subjectName: subjects[0]?.name || 'Математика',
        title: input.slice(0, 50),
        description: input,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    };
  }

  try {
    const prompt = `Ты — AI-помощник Лидера класса в ClassOS.
Лидер надиктовал или быстро ввёл заметку о домашнем задании или объявлении.
Вот существующие предметы класса:
${JSON.stringify(subjects, null, 2)}

Текст лидера: "${input}"

Извлеки информацию и верни СТРОГО JSON объект следующего вида (без markdown кавычек, чистый JSON):
{
  "type": "HOMEWORK" или "ANNOUNCEMENT",
  "subjectId": "<id предмета из списка выше, если опознан, иначе пусто>",
  "subjectName": "<название предмета>",
  "title": "<краткий заголовок задания>",
  "description": "<подробное описание>",
  "dueDate": "<дата в формате YYYY-MM-DD на которую задано, по умолчанию завтра>"
}`;

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawText = response.text || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      success: true,
      draft: parsed,
    };
  } catch (error: any) {
    console.error('Error in leader AI draft:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
