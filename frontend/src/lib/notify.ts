
const ASKED_KEY = "internova_notif_asked";

export const notifSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export async function requestPermissionOnce(): Promise<boolean> {
  if (!notifSupported()) return false;
  try {
    if (localStorage.getItem(ASKED_KEY)) return Notification.permission === "granted";
  } catch {}
  if (Notification.permission === "default") {
    try {
      const p = await Notification.requestPermission();
      try {
        localStorage.setItem(ASKED_KEY, "1");
      } catch {}
      return p === "granted";
    } catch {
      return false;
    }
  }
  return Notification.permission === "granted";
}

export function showBrowserNotification(title: string, body: string, url?: string) {
  if (!notifSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      tag: `internova-${Date.now()}`,
    });
    if (url) {
      n.onclick = () => {
        window.focus();
        window.location.href = url;
        n.close();
      };
    }
  } catch {}
}

export function announceNew(items: { _id: string; title: string; body: string; link: string; read: boolean }[]) {
  let seen: string[] = [];
  try {
    seen = JSON.parse(sessionStorage.getItem("internova_seen_notifs") || "[]");
  } catch {}
  const fresh = items.filter((i) => !i.read && !seen.includes(i._id));
  
  const first = seen.length === 0 && sessionStorage.getItem("internova_seen_init") !== "1";
  const now = items.map((i) => i._id);
  try {
    sessionStorage.setItem("internova_seen_notifs", JSON.stringify(now));
    sessionStorage.setItem("internova_seen_init", "1");
  } catch {}
  if (first) return;
  fresh.slice(0, 3).forEach((i) => showBrowserNotification(i.title, i.body, i.link));
}
