import type { ReactNode } from "react";

// Times as the inbox writes them, and the *bold* names in event lines.

export const clockTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const daysAgo = (at: number) => Math.round((dayStart(Date.now()) - dayStart(at)) / 86400000);
const shortDate = (at: number) => new Date(at).toLocaleDateString([], { month: "short", day: "numeric" });

/** "Today", "Yesterday", or "Sep 21": the line above a day's messages. */
export function dayLabel(at: number) {
  const days = daysAgo(at);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : shortDate(at);
}

/** Under a message: "10:02 AM" today, then "Yesterday", then "Sep 21". */
export function messageTime(at: number) {
  const days = daysAgo(at);
  return days <= 0 ? clockTime(at) : dayLabel(at);
}

/** In the list: "now", "2m", "3h", "Yesterday", "Sep 21". */
export function ago(at: number, now = Date.now()) {
  const m = Math.floor((now - at) / 60000);
  const days = daysAgo(at);
  if (days <= 0) return m < 1 ? "now" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
  return dayLabel(at);
}

/** The local time in a time zone, for the details panel. */
export function localTime(timezone?: string) {
  try {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: timezone });
  } catch {
    return clockTime(Date.now());
  }
}

/** An event line: *stars* make a name bold. */
export function EventText({ text }: { text: string }) {
  const out: ReactNode[] = text.split(/\*([^*\n]+)\*/).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
  return <>{out}</>;
}
