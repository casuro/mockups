import type { ReactNode } from "react";
import type { Person } from "./use-jira";

// Dates as Jira writes them, descriptions as a safe HTML subset, and
// "@Full Name" mentions in comments.

const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "September 21, 2026" */
export const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
/** "21 Sep" */
export const fmtShort = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
/** "September 21, 2026 at 9:14 AM" */
export const fmtDateTime = (ts: number) => {
  const d = new Date(ts);
  const h = d.getHours();
  return `${fmtDate(ts)} at ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
/** "5 minutes ago", "yesterday", "3 days ago", then the date. */
export function rel(ts: number, now: number) {
  const d = now - ts;
  if (d < MIN) return "just now";
  if (d < HR) {
    const m = Math.round(d / MIN);
    return `${m} minute${m > 1 ? "s" : ""} ago`;
  }
  if (d < DAY) {
    const h = Math.round(d / HR);
    return `${h} hour${h > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(d / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return fmtDate(ts);
}
/** "2026-09-21", for date inputs. */
export const isoDay = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "CODE", "PRE", "H3", "DIV", "SPAN"]);

/** Keeps a description to <p>, <h3>, lists, <strong>, <em>, <code> and <pre>, with no attributes. Plain text becomes a paragraph. */
export function sanitize(html: string) {
  if (typeof document === "undefined") return html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const walk = (node: Node) => {
    for (const c of [...node.childNodes]) {
      if (c instanceof Element) {
        if (/^(SCRIPT|STYLE|TEMPLATE|IFRAME|OBJECT|SVG|MATH)$/i.test(c.tagName)) c.remove();
        else if (!ALLOWED.has(c.tagName)) {
          // Unwrap it, then look at the node again with its children in place.
          c.replaceWith(...c.childNodes);
          walk(node);
          return;
        } else {
          for (const a of [...c.attributes]) c.removeAttribute(a.name);
          walk(c);
        }
      } else if (c.nodeType !== Node.TEXT_NODE) c.remove();
    }
  };
  walk(tpl.content);
  let out = tpl.innerHTML
    .replace(/<div>/g, "<p>").replace(/<\/div>/g, "</p>")
    .replace(/<span>|<\/span>/g, "")
    .replace(/<b>/g, "<strong>").replace(/<\/b>/g, "</strong>")
    .replace(/<i>/g, "<em>").replace(/<\/i>/g, "</em>");
  if (out && !/^\s*<(p|ul|ol|h3|pre)/.test(out)) out = `<p>${out}</p>`;
  return out.replace(/<p>(\s|<br>)*<\/p>/g, "").trim();
}

/** Plain text with "@Full Name" mentions drawn as chips (the signed-in person's in blue). */
export function Mentions({ text, people, me }: { text: string; people: Record<string, Person>; me: string }) {
  const names = Object.values(people).map((p) => p.name).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{text}</>;
  const re = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const isMe = people[me]?.name === m[1];
    out.push(<span key={m.index} className={`mention${isMe ? " me-m" : ""}`}>@{m[1]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
