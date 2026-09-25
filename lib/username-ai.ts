import prisma from "./prisma";
import { getGeminiClient, generateContentWithFallback } from "./ai/gemini-client";

import { transliterate } from "./username-format";
export { containsCyrillic, LATIN_NAME_REGEX, isValidLatinName, transliterateToLatinName, transliterate } from "./username-format";

export async function generateSmartUsername(
  firstName: string,
  lastName: string,
): Promise<{ username: string; suggestions: string[] }> {
  const cleanFirst = transliterate(firstName);
  const cleanLast = transliterate(lastName);

  const algorithmicCandidates: string[] = [];

  if (cleanFirst && cleanLast) {
    algorithmicCandidates.push(`${cleanFirst}_${cleanLast}`);
    algorithmicCandidates.push(`${cleanLast}_${cleanFirst}`);
    algorithmicCandidates.push(`${cleanFirst}.${cleanLast}`);
    algorithmicCandidates.push(`${cleanLast}_${cleanFirst[0]}`);
    algorithmicCandidates.push(`${cleanFirst[0]}_${cleanLast}`);
  } else if (cleanFirst) {
    algorithmicCandidates.push(cleanFirst);
    algorithmicCandidates.push(`${cleanFirst}_student`);
  } else if (cleanLast) {
    algorithmicCandidates.push(cleanLast);
    algorithmicCandidates.push(`${cleanLast}_student`);
  } else {
    algorithmicCandidates.push("student_180");
  }

  let aiCandidates: string[] = [];
  try {
    const gemini = getGeminiClient();
    if (gemini) {
      const prompt = `Generate 3 short, stylish, lowercase latin usernames for student "${firstName} ${lastName}". Return ONLY a valid JSON array of 3 strings, e.g. ["${cleanFirst}_${cleanLast}", "${cleanLast}_${cleanFirst[0] || 's'}", "${cleanFirst}.b"]. Do not return markdown.`;

      const response = await generateContentWithFallback(gemini, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text?.trim() || "";
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        aiCandidates = parsed
          .map((item: any) =>
            typeof item === "string"
              ? item.toLowerCase().replace(/[^a-z0-9_.]/g, "")
              : "",
          )
          .filter(Boolean);
      }
    }
  } catch (err) {
    // Fall back to algorithmic candidates safely
  }

  // Combine candidates, AI first then algorithmic
  const candidatePool = Array.from(
    new Set([...aiCandidates, ...algorithmicCandidates]),
  ).filter((c) => c.length >= 3 && c.length <= 30);

  // Check which candidates already exist in the database
  let takenSet = new Set<string>();
  try {
    const existingUsers = await prisma.user.findMany({
      where: {
        username: { in: candidatePool },
      },
      select: { username: true },
    });
    takenSet = new Set(existingUsers.map((u) => u.username.toLowerCase()));
  } catch {
    // Database check fallback
  }

  // Find first untaken candidate
  let chosenUsername = candidatePool.find((c) => !takenSet.has(c));

  // If all candidates are taken, find a unique variation with numbers
  if (!chosenUsername) {
    const base = candidatePool[0] || "student";
    let counter = 1;
    while (!chosenUsername) {
      const candidate = `${base}_${counter}`;
      try {
        const exists = await prisma.user.findUnique({
          where: { username: candidate },
          select: { id: true },
        });
        if (!exists) {
          chosenUsername = candidate;
          break;
        }
      } catch {
        chosenUsername = candidate;
        break;
      }
      counter++;
    }
  }

  const suggestions = candidatePool.filter(
    (c) => c !== chosenUsername && !takenSet.has(c),
  );

  return {
    username: chosenUsername,
    suggestions: suggestions.slice(0, 3),
  };
}
