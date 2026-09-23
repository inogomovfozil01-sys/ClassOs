import { describe, it, expect } from "vitest";
import { isVoiceAttachment, voiceDuration } from "../lib/media";
describe("Voice presentation", () => {
  it("recognises legacy voice files without audio MIME", () => {
    expect(
      isVoiceAttachment({
        fileName: "voice.webm",
        mimeType: "application/octet-stream",
      }),
    ).toBe(true);
    expect(
      isVoiceAttachment({
        fileName: "voice-message.webm",
        mimeType: "video/webm",
      }),
    ).toBe(true);
    expect(
      isVoiceAttachment({ fileName: "recording.bin" }, "AUDIO_VOICE"),
    ).toBe(true);
  });
  it("does not turn regular videos and documents into voice messages", () => {
    expect(
      isVoiceAttachment({ fileName: "lesson.webm", mimeType: "video/webm" }),
    ).toBe(false);
    expect(isVoiceAttachment({ fileName: "voice.pdf" })).toBe(false);
  });
  it("uses the recorded duration", () => {
    expect(voiceDuration("Голосовое сообщение (17 сек)")).toBe(17);
  });
});
