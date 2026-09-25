/**
 * Chat notification utilities for sound, mobile push, and mute management.
 */

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    // Play pleasing 2-tone melodic chime
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.08);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.32);
  } catch {}
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return "denied";
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export function sendChatPushNotification({
  title,
  body,
  url = "/chats",
  icon = "/icons/icon-192.svg",
}: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg: any) => {
        reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          vibrate: [200, 100, 200],
          data: { url },
        });
      });
    } else {
      const n = new Notification(title, {
        body,
        icon,
      });
      n.onclick = () => {
        window.focus();
        if (url && window.location.pathname !== url) {
          window.location.href = url;
        }
      };
    }
  } catch {}
}

// Muted conversations management
export function getMutedConversations(userId?: string): Set<string> {
  if (typeof window === "undefined" || !userId) return new Set();
  try {
    const raw = localStorage.getItem(`classos_muted_convs_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export function setConversationMuted(
  userId: string,
  convId: string,
  muted: boolean,
): Set<string> {
  const set = getMutedConversations(userId);
  if (muted) {
    set.add(convId);
  } else {
    set.delete(convId);
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        `classos_muted_convs_${userId}`,
        JSON.stringify(Array.from(set)),
      );
    } catch {}
  }
  return set;
}
