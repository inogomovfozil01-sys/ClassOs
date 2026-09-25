export const STICKERS = [
  { id: "hello", label: "Привет!" },
  { id: "great", label: "Круто!" },
  { id: "thanks", label: "Спасибо!" },
  { id: "laugh", label: "Ахаха!" },
  { id: "think", label: "Думаю…" },
  { id: "done", label: "Готово!" },
  { id: "sleep", label: "Сплю…" },
  { id: "support", label: "Ты справишься!" },
] as const;

export function stickerContent(sticker: typeof STICKERS[number]) {
  return `Стикер: ${sticker.label}`;
}
export function getSticker(content: unknown) {
  return STICKERS.find(sticker => stickerContent(sticker) === content);
}

export const EMOJI_GROUPS = [
  { name: "Эмоции", items: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "🙂", "🙃", "😉", "😍", "🥰", "😘", "😎", "🤩", "🥳", "🤔", "🤨", "😐", "😴", "😭", "🥹", "😤", "😱", "🤯", "🫠", "🤗", "🤫", "🫡", "🥲"] },
  { name: "Жесты", items: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "👋", "✌️", "👌", "💪", "🫶", "🤞", "👀", "🧠", "✍️", "🫰"] },
  { name: "Учёба и жизнь", items: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨", "🎉", "💯", "✅", "❌", "📚", "📖", "📝", "✏️", "🎓", "🏫", "💻", "⏰", "📅", "⚽", "🏆", "🎮", "🎵", "☕", "🍕", "🌞", "🌙", "🚀", "🐱", "🐼"] },
];
