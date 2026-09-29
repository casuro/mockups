import type { ReactNode } from "react";

// A message's text as React (paragraphs, bullets, `code`, *bold*, links),
// the same text flattened for snippets and search, and Gmail's dates.

const INLINE = /`([^`\n]+)`|\*([^*\n]+)\*|(https?:\/\/[^\s<]+)/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}.${n++}`;
    if (m[1] !== undefined) out.push(<code key={k}>{m[1]}</code>);
    else if (m[2] !== undefined) out.push(<b key={k}>{m[2]}</b>);
    else out.push(<a key={k} href={m[3]} target="_blank" rel="noreferrer">{m[3]}</a>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The body: blank lines split paragraphs, "- " lines make a list, single newlines are line breaks. */
export function Body({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  text.split(/\n\s*\n/).forEach((para, i) => {
    const lines = para.split("\n");
    let run: string[] = [];
    let items: string[] = [];
    let started = i > 0;
    const flush = () => {
      if (run.length) {
        const k = `${i}.${blocks.length}`;
        blocks.push(<p key={k}>{run.flatMap((l, j) => (j ? [<br key={j} />, ...inline(l, `${k}.${j}`)] : inline(l, `${k}.${j}`)))}</p>);
      }
      if (items.length) {
        const k = `${i}.${blocks.length}`;
        // A list that is its own paragraph sits a paragraph's gap below the text before it.
        blocks.push(<ul key={k} className={started ? "para" : undefined}>{items.map((l, j) => <li key={j}>{inline(l, `${k}.${j}`)}</li>)}</ul>);
      }
      run = [];
      items = [];
      started = false;
    };
    for (const line of lines) {
      if (/^\s*- /.test(line)) {
        if (run.length) flush();
        items.push(line.replace(/^\s*- /, ""));
      } else {
        if (items.length) flush();
        run.push(line);
      }
    }
    flush();
  });
  return <>{blocks}</>;
}

/** The text without its markup: for snippets and search, or (`keepLines`) to put back in a text box. */
export function plain(text: string, keepLines = false) {
  const t = text.replace(/`([^`\n]+)`/g, "$1").replace(/\*([^*\n]+)\*/g, "$1").replace(/^\s*- /gm, "");
  return keepLines ? t : t.replace(/\s+/g, " ").trim();
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** In the list: the time today, "Sep 27" this year, the full date before. */
export function listDate(ms: number) {
  const d = new Date(ms);
  const now = new Date();
  if (sameDay(d, now)) return time(d);
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString();
}

/** Over an open message: "Mon, Sep 28, 9:42 AM (3 hours ago)". */
export function fullDate(ms: number) {
  const d = new Date(ms);
  const mins = Math.round((Date.now() - ms) / 60000);
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"} ago`;
  const rel = mins < 60 ? unit(Math.max(1, mins), "minute") : mins < 1440 ? unit(Math.round(mins / 60), "hour") : unit(Math.round(mins / 1440), "day");
  const base = sameDay(d, new Date()) ? time(d) : `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, ${time(d)}`;
  return `${base} (${rel})`;
}

/** An invitation's hours: "2:00 - 3:00pm". */
export function timeRange(start: number, end: number) {
  const hm = (ms: number) => {
    const d = new Date(ms);
    return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return `${hm(start)} - ${hm(end)}${new Date(end).getHours() < 12 ? "am" : "pm"}`;
}

const FILE_TYPES: Record<string, [string, string]> = {
  pdf: ["#d93025", "PDF"],
  xlsx: ["#188038", "XLS"],
  docx: ["#1a73e8", "DOC"],
  fig: ["#a259ff", "FIG"],
  png: ["#e37400", "IMG"],
  jpg: ["#e37400", "IMG"],
  ics: ["#1a73e8", "ICS"],
  zip: ["#5f6368", "ZIP"],
};

/** A file's small colored badge: "PDF" on red, "XLS" on green. */
export function FileIcon({ name }: { name: string }) {
  const [color, tag] = FILE_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? ["#5f6368", "FILE"];
  return <span className="fic" style={{ background: color }}>{tag}</span>;
}
