const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ў: "o", ғ: "g", қ: "q", ҳ: "h",
};

const CYRILLIC_UPPER_MAP: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "Yo", Ж: "Zh",
  З: "Z", И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O",
  П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F", Х: "Kh", Ц: "Ts",
  Ч: "Ch", Ш: "Sh", Щ: "Shch", Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu",
  Я: "Ya", Ў: "O", Ғ: "G", Қ: "Q", Ҳ: "H",
};

export function containsCyrillic(text: string): boolean {
  return /[а-яА-ЯёЁўЎғҒқҚҳҲ]/.test(text);
}

export const LATIN_NAME_REGEX = /^[A-Za-z\s'-]+$/;

export function isValidLatinName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50 && LATIN_NAME_REGEX.test(trimmed);
}

export function transliterateToLatinName(text: string): string {
  let result = "";
  for (const char of text) {
    if (CYRILLIC_UPPER_MAP[char]) {
      result += CYRILLIC_UPPER_MAP[char];
    } else if (CYRILLIC_MAP[char]) {
      result += CYRILLIC_MAP[char];
    } else {
      result += char;
    }
  }
  return result.replace(/[^A-Za-z\s'-]/g, "").trim();
}

export function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9_]/g, "")
    .trim();
}
