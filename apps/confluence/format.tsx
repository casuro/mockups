import type { ReactNode } from "react";
import * as I from "./icons";
import type { ConfluenceBlock, ConfluenceIssue, LozengeColor } from "./types";
import type { Person } from "./use-confluence";

// Rich text as React: *bold*, `code`, @person mentions, [[page]] links,
// {status:Text|color} lozenges and {jira:KEY} smart links, drawn with the
// same markup as the mockup's at(), loz() and jira() helpers. Also dates.

export interface FormatContext {
  people: Record<string, Person>;
  me: string;
  issues: Record<string, ConfluenceIssue>;
  pageTitle: (id: string) => string | undefined;
  onPage: (id: string) => void;
  onIssue: (key: string) => void;
}

const INLINE = /`([^`\n]+)`|\*([^*\n]+)\*|@(\w+)|\[\[([\w-]+)(?:\|([^\]]+))?\]\]|\{status:([^}|]+)(?:\|(\w+))?\}|\{jira:([\w-]+)\}/g;

export function Lozenge({ text, color }: { text: string; color?: string }) {
  const tone = color && color !== "grey" ? ` ${color}` : "";
  return <span className={`loz${tone}`}>{text}</span>;
}

export function Rich({ text, ctx }: { text: string; ctx: FormatContext }) {
  return <>{inline(text, ctx)}</>;
}

function inline(text: string, ctx: FormatContext, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    const k = `${key}.${n++}`;
    const [whole, code, bold, mention, page, label, status, color, jira] = m;
    if (mention !== undefined && !ctx.people[mention]) continue;
    if (at > last) out.push(text.slice(last, at));
    if (code !== undefined) out.push(<code key={k}>{code}</code>);
    else if (bold !== undefined) out.push(<b key={k}>{inline(bold, ctx, k)}</b>);
    else if (mention !== undefined)
      out.push(
        <span key={k} className={`mention${mention === ctx.me ? " self" : ""}`}>
          {`@${ctx.people[mention].name}`}
        </span>
      );
    else if (page !== undefined)
      out.push(
        <a key={k} href="#" onClick={(e) => { e.preventDefault(); ctx.onPage(page); }}>
          {label ?? ctx.pageTitle(page) ?? page}
        </a>
      );
    else if (status !== undefined) out.push(<Lozenge key={k} text={status} color={color as LozengeColor | undefined} />);
    else if (jira !== undefined) {
      const issue = ctx.issues[jira];
      out.push(
        <a key={k} className="jira" href="#" onClick={(e) => { e.preventDefault(); ctx.onIssue(jira); }}>
          <I.JiraIssue />
          <span className="jk">{jira}</span>
          {issue ? <span className="js">{issue.summary}</span> : null}
          {issue ? <Lozenge text={issue.status} color={issue.color} /> : null}
        </a>
      );
    }
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The words a reader sees, for the read time. */
export function plain(text: string) {
  return text.replace(INLINE, (whole, code, bold, mention, page, label, status, _c, jira) => code ?? bold ?? (mention ? "name" : undefined) ?? label ?? (page ? "page" : undefined) ?? status ?? jira ?? whole);
}

export function readTime(blocks: ConfluenceBlock[]) {
  const texts = blocks.flatMap((b) =>
    b.type === "heading" || b.type === "paragraph" || b.type === "panel" ? [b.text]
    : b.type === "list" ? b.items
    : b.type === "tasks" ? b.items.map((t) => t.text)
    : b.type === "table" ? [...b.head, ...b.rows.flat()]
    : b.type === "code" ? [b.code]
    : []
  );
  const words = texts.map(plain).join(" ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

/** "Sep 24, 2026". */
export function date(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "Just now" for the last minute, then "12 minutes ago" for the last hour, then the date. */
export function ago(ms: number, now = Date.now()) {
  const m = Math.floor((now - ms) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  return date(ms);
}
