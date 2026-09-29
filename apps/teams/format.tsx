import type { ReactNode } from "react";
import type { Person } from "./use-teams";

// Message text as React: *bold*, `code`, ```blocks```, @person mentions and
// bare URLs. The same rules as the mockup's fmt(), built as elements rather
// than an HTML string.

export interface FormatContext {
  people: Record<string, Person>;
  me: string;
  onLink: (url: string) => void;
}

const INLINE = /`([^`\n]+)`|(https?:\/\/[^\s<]+)|\*([^*\n]+)\*|@(\w+)/g;

function inline(text: string, ctx: FormatContext, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    const k = `${key}.${n++}`;
    const [whole, code, url, bold, mention] = m;
    if (mention !== undefined && !ctx.people[mention]) continue;
    if (at > last) out.push(text.slice(last, at));
    if (code !== undefined) out.push(<code key={k}>{code}</code>);
    else if (url !== undefined)
      out.push(
        <a key={k} href="#" onClick={(e) => { e.preventDefault(); ctx.onLink(url); }}>
          {url}
        </a>
      );
    else if (bold !== undefined) out.push(<b key={k}>{inline(bold, ctx, k)}</b>);
    else if (mention !== undefined)
      out.push(<span key={k} className={`mention${mention === ctx.me ? " me" : ""}`}>{ctx.people[mention].name}</span>);
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A message's text as paragraphs, with code blocks between them. */
export function Text({ text, ctx }: { text: string; ctx: FormatContext }) {
  const out: ReactNode[] = [];
  let line: ReactNode[] = [];
  let n = 0;
  const flush = () => {
    out.push(<p key={`p${n++}`}>{line}</p>);
    line = [];
  };
  text.split(/```([\s\S]+?)```/).forEach((part, i) => {
    if (i % 2 === 1) {
      // As the browser parses the mockup's <p>..<pre>..</pre></p>: the block closes the paragraph.
      out.push(<p key={`p${n++}`}>{line}</p>, <pre key={`pre${n++}`}>{part.replace(/^\n/, "")}</pre>);
      line = [];
      return;
    }
    part.split("\n").forEach((l, j, lines) => {
      line.push(...inline(l, ctx, `${i}.${j}`));
      if (j < lines.length - 1) flush();
    });
  });
  flush();
  return <>{out}</>;
}

/** The text with its marks taken out, for a one-line preview. */
export const plain = (text: string) => text.replace(/[*`]/g, "").replace(/\s+/g, " ").trim();

// ---------- Times ----------

export const clockTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Today", "Yesterday", "Friday", "Last week", or "September 3". */
export function dayLabel(at: number) {
  const days = Math.round((dayStart(Date.now()) - dayStart(at)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(at).toLocaleDateString([], { weekday: "long" });
  if (days < 14) return "Last week";
  return new Date(at).toLocaleDateString([], { month: "long", day: "numeric" });
}

/** A meeting's running time: "14:23", "1:02:09". */
export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** How long a call lasted: "4m 12s". */
export const duration = (ms: number) => {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};

export const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word === "person" ? "people" : `${word}s`}`;

export const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();
