import { Fragment, type ReactNode } from "react";

// Times the way the PagerDuty mockup writes them: "Today at 7:30 AM" for
// when something happened, "12 min ago" beside it, "1h 16m" for how long
// an incident has been open, and **bold** in timeline lines.

const MIN = 60_000;
const DAY = 86_400_000;

const clock = (at: number) => new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function daysAgo(at: number, now = Date.now()) {
  const a = new Date(at);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** "Today at 7:30 AM", "Yesterday at 2:06 PM", "Friday at 9:00 AM", "Sep 21 at 4:10 PM". */
export function when(at: number) {
  const days = daysAgo(at);
  if (days === 0) return `Today at ${clock(at)}`;
  if (days === 1) return `Yesterday at ${clock(at)}`;
  if (days > 1 && days < 7) return `${new Date(at).toLocaleDateString("en-US", { weekday: "long" })} at ${clock(at)}`;
  return `${new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${clock(at)}`;
}

/** "just now", "12 min ago", "5 hr ago", "2 d ago". */
export function ago(at: number) {
  const m = Math.max(0, Math.round((Date.now() - at) / MIN));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.floor(h / 24)} d ago`;
}

/** A duration: "12m", "1h 16m", "2d 3h". */
export function span(ms: number) {
  const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** "Fri, Oct 2, 9:00 AM". */
export const shift = (at: number) =>
  new Date(at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** A timeline line with its `**bold**` parts bold. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i): ReactNode => (i % 2 ? <b key={i}>{p}</b> : <Fragment key={i}>{p}</Fragment>))}</>;
}

