import { Fragment, type ReactNode } from "react";

// How the GitHub mockup writes things: "5 hours ago", "1m 12s", the little
// Markdown that comments use, a unified diff as rows, and a runner's log
// line with its ANSI colors.

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago". */
export function ago(at: number) {
  const d = Math.max(0, Date.now() - at);
  if (d < 45 * SEC) return "now";
  if (d < HOUR) {
    const m = Math.max(1, Math.round(d / MIN));
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (d < DAY) {
    const h = Math.round(d / HOUR);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  return d < 2 * DAY ? "yesterday" : `${Math.round(d / DAY)} days ago`;
}

/** A duration in seconds, as GitHub writes it: "42s", "1m 12s". */
export const dur = (secs: number) => (secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`);

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Dark or white text on a label of this color. */
export function labelStyle(color: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return { background: color, color: r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#1f2328" : "#fff" };
}

/** `code`, **bold** and @mentions, inside a line. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|(?<=^|\s)@\w+)/g);
  return (
    <>
      {parts.map((p, i): ReactNode => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        if (p[0] === "`") return <code key={i}>{p.slice(1, -1)}</code>;
        return p[0] === "*" ? <b key={i}>{p.slice(2, -2)}</b> : <a key={i}>{p}</a>;
      })}
    </>
  );
}

/** The little Markdown comments use: paragraphs and "- " lists. */
export function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i): ReactNode =>
        block.startsWith("- ") ? (
          <ul key={i}>{block.split("\n").map((l, n) => <li key={n}><Inline text={l.slice(2)} /></li>)}</ul>
        ) : (
          <p key={i}><Inline text={block} /></p>
        )
      )}
    </>
  );
}

export interface DiffRow {
  type: "hunk" | "add" | "del" | "ctx";
  /** The line number before and after. */
  o?: number;
  n?: number;
  text: string;
}

/** A unified diff, as rows: hunk headers, context, additions and deletions with both line numbers. */
export function diffRows(diff: string): DiffRow[] {
  let o = 0;
  let n = 0;
  return diff.split("\n").map((text): DiffRow => {
    const m = /^@@ -(\d+),?\d* \+(\d+)/.exec(text);
    if (m) {
      o = +m[1];
      n = +m[2];
      return { type: "hunk", text };
    }
    if (text[0] === "+") return { type: "add", n: n++, text };
    if (text[0] === "-") return { type: "del", o: o++, text };
    return { type: "ctx", o: o++, n: n++, text };
  });
}

const SGR: Record<string, string> = { 1: "c-bold", 31: "c-red", 32: "c-green", 33: "c-yellow", 34: "c-blue", 36: "c-cyan", 90: "c-gray", 41: "bg-red", 46: "bg-cyan" };

/** One log line: its ANSI colors become spans. */
export function Ansi({ text }: { text: string }) {
  let cls: string[] = [];
  return (
    <>
      {text.split(/(\x1b\[\d+m)/).map((part, i): ReactNode => {
        const m = /^\x1b\[(\d+)m$/.exec(part);
        if (m) {
          cls = m[1] === "0" ? [] : SGR[m[1]] ? [...cls, SGR[m[1]]] : cls;
          return null;
        }
        return part && cls.length ? <span key={i} className={cls.join(" ")}>{part}</span> : part;
      })}
    </>
  );
}
