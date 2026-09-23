export function isVoiceAttachment(
  file: { mimeType?: string; fileName?: string },
  messageType?: string,
) {
  return (
    messageType === "AUDIO_VOICE" ||
    Boolean(file.mimeType?.startsWith("audio/")) ||
    /\.(mp3|m4a|ogg|wav)$/i.test(file.fileName || "") ||
    /^voice(?:[-_. ].*)?\.(webm|mp4)$/i.test(file.fileName || "")
  );
}
export function voiceDuration(content?: string) {
  const match = content?.match(/^Голосовое сообщение \((\d+) сек\)$/);
  return match ? Number(match[1]) : 0;
}
