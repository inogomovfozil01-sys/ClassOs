import { expect, it } from "vitest";
import { detectPlatform } from "../lib/platform";
it("detects desktop and mobile platforms, including iPad desktop mode", () => {
  expect(detectPlatform("Mozilla/5.0 (iPhone)", "iPhone", 5)).toBe("ios");
  expect(detectPlatform("Mozilla/5.0 (Macintosh)", "MacIntel", 5)).toBe("ios");
  expect(detectPlatform("Mozilla/5.0 (Macintosh)", "MacIntel", 0)).toBe("mac");
  expect(detectPlatform("Mozilla/5.0 (Linux; Android 14)", "Linux", 5)).toBe("android");
  expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0)", "Win32", 0)).toBe("windows");
  expect(detectPlatform("Mozilla/5.0 (X11; Linux x86_64)", "Linux", 0)).toBe("web");
});
