// Dates, sizes and mail bodies, the way apps/outlook.html writes them.

const DAY = 86_400_000;

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "9:40 AM" */
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
/** "Tue" */
export const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-US", { weekday: "short" });
/** "9/28" */
export const fmtMD = (t: number) => `${new Date(t).getMonth() + 1}/${new Date(t).getDate()}`;

/** The time in the message list: "9:40 AM" today, "Tue 9:40 AM" this week, "Tue 9/8" this year, "9/8/2025" before. */
export function listTime(t: number) {
  const now = Date.now();
  const days = (startOfDay(now) - startOfDay(t)) / DAY;
  if (days <= 0) return fmtTime(t);
  if (days < 7) return `${fmtDay(t)} ${fmtTime(t)}`;
  if (new Date(t).getFullYear() === new Date(now).getFullYear()) return `${fmtDay(t)} ${fmtMD(t)}`;
  return `${fmtMD(t)}/${new Date(t).getFullYear()}`;
}

/** "Mon 9/28/2026 9:40 AM" */
export const fullTime = (t: number) => `${fmtDay(t)} ${fmtMD(t)}/${new Date(t).getFullYear()} ${fmtTime(t)}`;

/** The date group a message falls in: Today, Yesterday, This week, Last week... */
export function groupOf(t: number) {
  const now = new Date();
  const today = startOfDay(now.getTime());
  const days = Math.round((today - startOfDay(t)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  const weekStart = today - now.getDay() * DAY;
  if (t >= weekStart) return "This week";
  if (t >= weekStart - 7 * DAY) return "Last week";
  if (t >= weekStart - 14 * DAY) return "Two weeks ago";
  const d = new Date(t);
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return "Earlier this month";
  return "Older";
}

/** "12 AM", "1 PM" on the invite's day view; "2:30 PM" off the hour. */
export const hourLabel = (t: number) => fmtTime(t).replace(":00", "");

export const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const initialsOf = (name: string) =>
  name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** HTML as one line of plain text, for previews and search. */
export const strip = (html: string) =>
  html
    .replace(/<(style|script)[^>]*>.*?<\/\1>/gs, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Plain text as mail paragraphs: a blank line starts a new one, a single newline breaks the line. */
export const textToHtml = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

/** A message's body as HTML: its `html`, or its `text` as paragraphs, with the signature under it. */
export function bodyHtml(m: { text?: string; html?: string; signature?: string }) {
  const body = m.html ?? textToHtml(m.text ?? "");
  const sig = m.signature ? `<div class="sig">${escapeHtml(m.signature).replace(/\n/g, "<br>")}</div>` : "";
  return body + sig;
}

/** A message's body as one line of text. */
export const bodyText = (m: { text?: string; html?: string; signature?: string }) => strip(bodyHtml(m));

/** What the composer typed, cut down to a small allowlist of tags and styles before it is stored or shown. */
export function clean(html: string) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const OK = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "UL", "OL", "LI", "BR", "DIV", "P", "SPAN", "FONT", "A", "BLOCKQUOTE"]);
  const walk = (node: Node) =>
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) return;
      if (!(n instanceof Element) || !OK.has(n.tagName)) {
        if (n instanceof Element && !["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(n.tagName)) {
          walk(n);
          n.replaceWith(...n.childNodes);
        } else n.parentNode?.removeChild(n);
        return;
      }
      const keep: Record<string, string> = {};
      const href = n.getAttribute("href") ?? "";
      if (n.tagName === "A" && /^https?:/i.test(href)) keep.href = href;
      const color = n.getAttribute("color") ?? "";
      if (n.tagName === "FONT" && /^#?\w+$/.test(color)) keep.color = color;
      const st = n.getAttribute("style") ?? "";
      const css: string[] = [];
      const col = st.match(/(?:^|;)\s*color:\s*(#[0-9a-f]{3,8}|rgb\([\d,\s]+\))/i);
      const bg = st.match(/background-color:\s*(#[0-9a-f]{3,8}|rgb\([\d,\s]+\))/i);
      const al = st.match(/text-align:\s*(left|center|right)/i);
      if (col) css.push(`color:${col[1]}`);
      if (bg) css.push(`background-color:${bg[1]}`);
      if (al) css.push(`text-align:${al[1]}`);
      [...n.attributes].forEach((a) => n.removeAttribute(a.name));
      Object.entries(keep).forEach(([k, v]) => n.setAttribute(k, v));
      if (n.tagName === "A") {
        n.setAttribute("target", "_blank");
        n.setAttribute("rel", "noopener");
      }
      if (css.length) n.setAttribute("style", css.join(";"));
      walk(n);
    });
  walk(tpl.content);
  return tpl.innerHTML;
}

/** `text` with every match of `q` marked, for search results. */
export function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}
