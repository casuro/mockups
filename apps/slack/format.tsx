import type { ReactNode } from "react";
import type { Person } from "./use-slack";

// Slack's mrkdwn as React: *bold*, _italic_, ~strike~, `code`, ```blocks```,
// @person mentions, #channel links and bare URLs. The same rules as the
// mockup's fmt(), built as elements rather than an HTML string.

export interface FormatContext {
  people: Record<string, Person>;
  me: string;
  onChannel: (id: string) => void;
  onLink: (url: string) => void;
}

const INLINE =
  /`([^`\n]+)`|(https?:\/\/[^\s<]+)|\*([^*\n]+)\*|(^|\s)_([^_\n]+)_|~([^~\n]+)~|@(\w+)|#([a-z][\w-]+)/g;

function inline(text: string, ctx: FormatContext, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    const k = `${key}.${n++}`;
    const [whole, code, url, bold, lead, italic, strike, mention, channel] = m;
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
    else if (italic !== undefined) out.push(lead, <i key={k}>{inline(italic, ctx, k)}</i>);
    else if (strike !== undefined) out.push(<s key={k}>{inline(strike, ctx, k)}</s>);
    else if (mention !== undefined)
      out.push(
        <span key={k} className={`mention${mention === ctx.me ? " me" : ""}`}>
          @{ctx.people[mention].name.split(" ")[0]}
        </span>
      );
    else if (channel !== undefined)
      out.push(
        <a key={k} href="#" onClick={(e) => { e.preventDefault(); ctx.onChannel(channel); }}>
          #{channel}
        </a>
      );
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A message's text as paragraphs; a code block sits between them as Slack draws it. */
export function Mrkdwn({ text, ctx }: { text: string; ctx: FormatContext }) {
  const out: ReactNode[] = [];
  const parts = text.split(/```([\s\S]+?)```/);
  let line: ReactNode[] = [];
  let n = 0;
  const flush = () => {
    out.push(<p key={`p${n++}`}>{line}</p>);
    line = [];
  };
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      // A block on its own line: the mockup's <p><pre> becomes <p></p><pre></pre><p></p>.
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

/** The topic line of a channel: one run of inline text, no paragraphs. */
export function InlineMrkdwn({ text, ctx }: { text: string; ctx: FormatContext }) {
  return <>{inline(text, ctx)}</>;
}

// ---------- Times ----------

export const clockTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const ordinal = (n: number) =>
  n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th"));

/** "Today", "Yesterday", or "Friday, September 25th". */
export function dayLabel(at: number) {
  const days = Math.round((dayStart(Date.now()) - dayStart(at)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(at);
  return `${d.toLocaleDateString([], { weekday: "long" })}, ${d.toLocaleDateString([], { month: "long" })} ${ordinal(d.getDate())}`;
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s % 60).padStart(2, "0")}`;
};
