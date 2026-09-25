import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiApiKey(): string | null {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    return process.env.GEMINI_API_KEY.trim();
  }

  // Fallback to reading from local env files if running in dev without explicit env injection
  try {
    const cwd = process.cwd();
    const candidateFiles = ['.env.production.local', '.env.local', '.env'];
    for (const file of candidateFiles) {
      const fullPath = path.join(cwd, file);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, 'utf8');
        const match = text.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
        if (match && match[1] && match[1].trim() !== '' && !match[1].includes('[SENSITIVE]')) {
          process.env.GEMINI_API_KEY = match[1].trim();
          return match[1].trim();
        }
      }
    }
  } catch {
    // Ignore fs errors in constrained environments
  }

  return null;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];
  const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));

  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
      const response = await client.models.generateContent({
        ...params,
        model,
      });
      if (response) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} failed, trying fallback:`, err?.message || err);
    }
  }
  throw lastError;
}
