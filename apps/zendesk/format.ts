// Times the way Zendesk writes them: "Today 09:14", "Yesterday 16:20",
// "Sep 25" for when something happened, and "12 min ago" for when a
// ticket last changed.

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const monthDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

function daysAgo(at: number, now = Date.now()) {
  const a = new Date(at);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** "Just now", "Today 09:14", "Yesterday 16:20", "Sep 25". */
export function when(at: number) {
  if (Date.now() - at < 60_000 && at <= Date.now()) return "Just now";
  const d = new Date(at);
  const days = daysAgo(at);
  if (days === 0) return `Today ${hhmm(d)}`;
  if (days === 1) return `Yesterday ${hhmm(d)}`;
  return monthDay(d);
}

/** "Just now", "12 min ago", "2 hours ago", "Yesterday", "Sep 26". */
export function ago(at: number) {
  const ms = Date.now() - at;
  if (ms < 60_000) return "Just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < DAY) {
    const h = Math.floor(ms / 3_600_000);
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }
  return daysAgo(at) === 1 ? "Yesterday" : monthDay(new Date(at));
}

/** The time now in an IANA time zone: "9:41 AM". */
export function localTime(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date());
  } catch {
    return "";
  }
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
