import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  transliterate,
  generateSmartUsername,
  isValidLatinName,
  containsCyrillic,
  transliterateToLatinName,
} from "../lib/username-ai";

vi.mock("../lib/ai/gemini-client", () => ({
  getGeminiClient: vi.fn().mockReturnValue(null),
  generateContentWithFallback: vi.fn(),
}));

describe("Smart username generation and transliteration", () => {
  it("correctly transliterates Russian and Uzbek Cyrillic characters", () => {
    expect(transliterate("Фирдавс")).toBe("firdavs");
    expect(transliterate("Баходиров")).toBe("bahodirov");
    expect(transliterate("Фозил")).toBe("fozil");
    expect(transliterate("Иноғомов")).toBe("inogomov");
    expect(transliterate("Шерзод")).toBe("sherzod");
  });

  it("transliterates capitalized names to readable Latin names", () => {
    expect(transliterateToLatinName("Фирдавс")).toBe("Firdavs");
    expect(transliterateToLatinName("Баходиров")).toBe("Bahodirov");
    expect(transliterateToLatinName("Шахзод")).toBe("Shahzod");
  });

  it("strictly validates English / Latin names and detects Cyrillic", () => {
    expect(isValidLatinName("Shakhzod")).toBe(true);
    expect(isValidLatinName("Bakhodirov")).toBe(true);
    expect(isValidLatinName("O'Connor")).toBe(true);
    expect(isValidLatinName("Ali-Reza")).toBe(true);
    expect(isValidLatinName("Madina")).toBe(true);

    // Rejects Cyrillic and symbols
    expect(isValidLatinName("Шахзод")).toBe(false);
    expect(isValidLatinName("Баходиров")).toBe(false);
    expect(isValidLatinName("John123")).toBe(false);
    expect(isValidLatinName("")).toBe(false);
    expect(isValidLatinName("A")).toBe(false);

    // Cyrillic detection
    expect(containsCyrillic("Фирдавс")).toBe(true);
    expect(containsCyrillic("Firdavs")).toBe(false);
    expect(containsCyrillic("Firdavs Баходиров")).toBe(true);
  });

  it("generates a clean valid username from first and last name", async () => {
    const result = await generateSmartUsername("Фирдавс", "Баходиров");
    expect(result.username).toBeTruthy();
    expect(typeof result.username).toBe("string");
    expect(result.username.length).toBeGreaterThanOrEqual(3);
    // Should be lowercase latin characters with possible underscores/dots
    expect(/^[a-z0-9_.]+$/.test(result.username)).toBe(true);
    expect(result.username.includes("firdavs") || result.username.includes("bahodirov")).toBe(true);
  });

  it("handles empty or single name inputs gracefully without crashing", async () => {
    const resFirst = await generateSmartUsername("Тимур", "");
    expect(resFirst.username).toBeTruthy();
    expect(resFirst.username.includes("timur")).toBe(true);

    const resEmpty = await generateSmartUsername("", "");
    expect(resEmpty.username).toBeTruthy();
    expect(resEmpty.username.length).toBeGreaterThan(0);
  });
});

