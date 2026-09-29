import type { RichText } from "./types";

// Rich text, both ways: the kit's markup (see `RichText` in types.ts) to the
// HTML a block's contenteditable shows, and that HTML back to markup as it
// is edited. Also dates, "5m ago", code highlighting, and the caret.

export interface FormatContext {
  me: string;
  person: (id: string) => { name: string } | undefined;
  page: (id: string) => { title: string; icon?: string } | undefined;
}

export const escapeHTML = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The page icon drawn where a page has no emoji. */
export const PAGE_SVG =
  '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.75 3.25h5.5l3.5 3.5v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V3.75a.5.5 0 0 1 .5-.5z"/><path d="M11 3.5v3.5h3.5M7.75 10.5h4.5M7.75 13h4.5"/></svg>';

const TOKEN =
  /\\([*~`[\]@\\])|\[\[([\w-]+)\]\]|\*\*(.+?)\*\*|~~(.+?)~~|\*(.+?)\*|`([^`]+)`|\[((?:\\.|[^\]\\])*)\]\(([^)\s]+)\)|(?<![\w.])@(\d{4}-\d{2}-\d{2})|(?<![\w.])@([A-Za-z][\w-]*)/g;
const COLORS = new Set(["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"]);

/** Markup to the HTML inside a block. Everything is escaped; only http(s) and mailto links become links. */
export function toHTML(src: RichText, ctx: FormatContext): string {
  let out = "";
  let last = 0;
  const re = new RegExp(TOKEN.source, "g");
  for (let m = re.exec(src); m; m = re.exec(src)) {
    out += escapeHTML(src.slice(last, m.index));
    last = re.lastIndex;
    const [all, lit, pageId, bold, strike, italic, code, label, target, date, personId] = m;
    if (lit) out += escapeHTML(lit);
    else if (pageId) {
      const p = ctx.page(pageId);
      out += p
        ? `<span class="mn pg" contenteditable="false" data-pg="${escapeHTML(pageId)}"><span class="pe">${p.icon ? escapeHTML(p.icon) : PAGE_SVG}</span><span class="pt">${escapeHTML(p.title || "New page")}</span></span>`
        : escapeHTML(all);
    } else if (bold) out += `<b>${toHTML(bold, ctx)}</b>`;
    else if (strike) out += `<s>${toHTML(strike, ctx)}</s>`;
    else if (italic) out += `<i>${toHTML(italic, ctx)}</i>`;
    else if (code) out += `<code>${escapeHTML(code)}</code>`;
    else if (target) {
      const inner = toHTML(label ?? "", ctx);
      if (target.startsWith("comment:")) out += `<span class="cm" data-th="${escapeHTML(target.slice(8))}">${inner}</span>`;
      else if (target.startsWith("color:") && COLORS.has(target.slice(6))) out += `<span class="c-${target.slice(6)}">${inner}</span>`;
      else if (/^(https?:|mailto:)/.test(target)) out += `<a href="${escapeHTML(target)}">${inner}</a>`;
      else out += inner;
    } else if (date) out += `<span class="mn" contenteditable="false" data-d="${date}"><span class="at">@</span>${escapeHTML(fmtLong(date))}</span>`;
    else if (personId) {
      const p = ctx.person(personId);
      out += p
        ? `<span class="mn${personId === ctx.me ? " me" : ""}" contenteditable="false" data-p="${escapeHTML(personId)}"><span class="at">@</span>${escapeHTML(p.name)}</span>`
        : escapeHTML(all);
    } else out += escapeHTML(all);
  }
  return out + escapeHTML(src.slice(last));
}

const escapeMarkup = (s: string) => s.replace(/[\\*~`[\]@]/g, "\\$&");

/** A block's edited HTML back to markup. */
export function fromDOM(root: Node): RichText {
  let out = "";
  root.childNodes.forEach((node, i) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += escapeMarkup((node.textContent ?? "").replace(/ /g, " "));
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    const inner = () => fromDOM(node);
    const wrap = (mark: string) => {
      const s = inner();
      return s ? mark + s + mark : "";
    };
    const d = node.dataset;
    if (d.p) out += `@${d.p}`;
    else if (d.d) out += `@${d.d}`;
    else if (d.pg) out += `[[${d.pg}]]`;
    else if (d.th) out += `[${inner()}](comment:${d.th})`;
    else if (tag === "B" || tag === "STRONG") out += wrap("**");
    else if (tag === "I" || tag === "EM") out += wrap("*");
    else if (tag === "S" || tag === "STRIKE" || tag === "DEL") out += wrap("~~");
    else if (tag === "CODE") out += node.textContent ? `\`${node.textContent.replace(/`/g, "")}\`` : "";
    else if (tag === "A" && node.getAttribute("href")) out += `[${inner()}](${node.getAttribute("href")})`;
    else if (tag === "BR") out += i === root.childNodes.length - 1 ? "" : "\n";
    else if (tag === "DIV" || tag === "P") out += (i ? "\n" : "") + inner();
    else {
      const color = [...node.classList].find((c) => /^c-[a-z]+$/.test(c));
      out += color ? `[${inner()}](color:${color.slice(2)})` : inner();
    }
  });
  return out;
}

/** Markup as plain words: mentions by name. */
export function plain(src: RichText, ctx: FormatContext) {
  const div = document.createElement("div");
  div.innerHTML = toHTML(src, ctx);
  return div.textContent ?? "";
}

// ---------- Dates ----------

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "2026-10-10" as "October 10, 2026". */
export function fmtLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "just now", "5m ago", "3h ago", "yesterday", "4d ago". */
export function rel(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

// ---------- Code ----------

export const LANGS: Record<string, string> = { plain: "Plain text", bash: "Bash", sql: "SQL", javascript: "JavaScript" };
const KW = new Set("select from where create index concurrently if not exists on alter table add column set update in is null limit text".split(" "));

/** Code as HTML, with SQL and bash keywords, strings, numbers and comments colored. */
export function highlight(code: string, lang = "plain") {
  if (lang !== "sql" && lang !== "bash") return escapeHTML(code);
  const re = new RegExp(`(${lang === "sql" ? "--[^\\n]*" : "#[^\\n]*"})|('[^'\\n]*')|(\\b\\d+\\b)|([A-Za-z_]\\w*)`, "g");
  let out = "";
  let last = 0;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    out += escapeHTML(code.slice(last, m.index));
    const c = m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : lang === "sql" && KW.has(m[0].toLowerCase()) ? "k" : lang === "bash" && m[0] === "make" ? "f" : "";
    out += c ? `<span class="tok-${c}">${escapeHTML(m[0])}</span>` : escapeHTML(m[0]);
    last = re.lastIndex;
  }
  return out + escapeHTML(code.slice(last));
}

// ---------- The caret ----------

/** How many characters of `el` come before the caret. */
export function caretOffset(el: HTMLElement) {
  const s = getSelection();
  if (!s?.rangeCount || !s.focusNode || !el.contains(s.focusNode)) return 0;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setEnd(s.focusNode, s.focusOffset);
  return r.toString().length;
}

/** The range covering characters `start` to `end` of `el`. */
export function rangeAt(el: HTMLElement, start: number, end: number) {
  const r = document.createRange();
  r.selectNodeContents(el);
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let setStart = false;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const len = n.textContent?.length ?? 0;
    if (!setStart && start <= seen + len) {
      r.setStart(n, start - seen);
      setStart = true;
    }
    if (setStart && end <= seen + len) {
      r.setEnd(n, end - seen);
      break;
    }
    seen += len;
  }
  return r;
}

/** Puts the caret at the end (or the start) of `el`. */
export function focusEl(el: HTMLElement | null | undefined, atEnd = true) {
  if (!el) return;
  el.focus({ preventScroll: false });
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(!atEnd);
  const s = getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
}
