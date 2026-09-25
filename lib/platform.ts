export type Platform = "ios" | "android" | "mac" | "windows" | "web";
export function detectPlatform(userAgent: string, platform = "", touchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent) || (/mac/i.test(platform) && touchPoints > 1)) return "ios";
  if (/mac/i.test(platform + userAgent)) return "mac";
  if (/win/i.test(platform + userAgent)) return "windows";
  return "web";
}
