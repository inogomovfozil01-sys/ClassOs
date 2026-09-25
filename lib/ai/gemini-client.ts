import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

export async function generateContentWithFallback(
  client: GoogleGenAI,
  params: {
    contents: any;
    model?: string;
    config?: any;
  }
) {
  const primaryModel = params.model || GEMINI_MODEL;
  const candidateModels = [
    primaryModel,
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-3.8-flash',
  ];
  const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));

  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
      const response = await client.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} failed, trying fallback:`, err?.message || err);
    }
  }
  throw lastError;
}
