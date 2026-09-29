import type { ReactNode } from "react";
import type { Person } from "./use-google-docs";

// Comment times ("Just now", "Yesterday, 4:18 PM", "Sep 26, 2:14 PM") and
// comment text with @Full Name mentions.

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function when(at: number, now = Date.now()) {
  if (now - at < 60_000) return "Just now";
  const d = new Date(at);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(new Date(now)) - day(d)) / 86_400_000);
  if (days === 0) return `Today, ${clock(d)}`;
  if (days === 1) return `Yesterday, ${clock(d)}`;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}) });
  return `${date}, ${clock(d)}`;
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function Mentions({ text, people }: { text: string; people: Record<string, Person> }): ReactNode {
  const names = Object.values(people).map((p) => escRe(p.name)).sort((a, b) => b.length - a.length);
  if (!names.length) return text;
  const parts = text.split(new RegExp(`(@(?:${names.join("|")}))`, "g"));
  return parts.map((part, i) => (i % 2 ? <span key={i} className="mention">{part}</span> : part));
}
