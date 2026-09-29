import type { DocsBlock, DocsContent, DocsText } from "./types";

// The document body. It is kept as HTML (what the editable page holds);
// these turn blocks into that HTML and make the marks comments and
// suggestions leave in it: wrap the text a comment is on, strike text and
// insert its replacement, and undo either.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** **bold**, *italic*, [link](url), "\n" breaks, runs of spaces kept. */
export function inline(text: DocsText): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/ {2,}/g, (s) => " " + "&nbsp;".repeat(s.length - 1))
    .replace(/\n/g, "<br>");
}

function block(b: DocsBlock): string {
  switch (b.type) {
    case "title":
      return `<div class="doc-t">${inline(b.text)}</div>`;
    case "subtitle":
      return `<p class="sub">${inline(b.text)}</p>`;
    case "p":
    case "h1":
    case "h2":
    case "h3":
      return `<${b.type}>${inline(b.text)}</${b.type}>`;
    case "ul":
    case "ol":
      return `<${b.type}>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${b.type}>`;
    case "table": {
      const head = b.header ? `<tr>${b.header.map((h) => `<th>${inline(h)}</th>`).join("")}</tr>` : "";
      return `<table><tbody>${head}${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    }
    case "html":
      return b.html;
  }
}

/** Parses, lets `fn` change the tree, and returns the HTML as the page would serialize it. */
export function edit(html: string, fn?: (root: HTMLElement) => void): string {
  const root = document.createElement("div");
  root.innerHTML = html;
  fn?.(root);
  return root.innerHTML;
}

export const toHtml = (content: DocsContent) => edit(typeof content === "string" ? content : content.map(block).join(""));

/** The words, as the page shows them. */
export function plainText(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html.replace(/<\/(p|div|h1|h2|h3|li|tr)>|<br>/g, "$&\n");
  return (root.textContent ?? "").replace(/ /g, " ").replace(/\n{2,}/g, "\n").trim();
}

/** The text nodes and offsets that make up the first match of `quote` (whitespace-insensitive to nbsp). */
export function findText(root: Node, quote: string): { node: Text; start: number; end: number }[] | null {
  if (!quote) return null;
  const nodes: Text[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) nodes.push(walk.currentNode as Text);
  const all = nodes.map((n) => n.data).join("").replace(/ /g, " ");
  const at = all.indexOf(quote.replace(/ /g, " "));
  if (at < 0) return null;
  const out: { node: Text; start: number; end: number }[] = [];
  let pos = 0;
  for (const node of nodes) {
    const from = Math.max(at, pos);
    const to = Math.min(at + quote.length, pos + node.data.length);
    if (from < to) out.push({ node, start: from - pos, end: to - pos });
    pos += node.data.length;
  }
  return out;
}

/** Wraps the first match of `quote` in `make()`, one wrapper per text node it spans. Returns the wrappers. */
export function wrapText(root: HTMLElement, quote: string, make: () => HTMLElement): HTMLElement[] {
  const parts = findText(root, quote);
  if (!parts) return [];
  return parts.map(({ node, start, end }) => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const el = make();
    range.surroundContents(el);
    return el;
  });
}

export const unwrap = (el: Element) => el.replaceWith(...el.childNodes);

/** Every mark a thread left: its highlight, or its struck and inserted text. */
export const marksOf = (root: ParentNode, id: string) => [...root.querySelectorAll<HTMLElement>(`[data-c="${id}"], [data-s="${id}"]`)];

export function markComment(root: HTMLElement, quote: string, id: string) {
  return wrapText(root, quote, () => {
    const el = document.createElement("span");
    el.className = "hl";
    el.dataset.c = id;
    return el;
  }).length > 0;
}

export function markSuggestion(root: HTMLElement, replace: string, replacement: string, id: string) {
  const dels = wrapText(root, replace, () => {
    const el = document.createElement("del");
    el.className = "sg-del";
    el.dataset.s = id;
    return el;
  });
  if (!dels.length) return false;
  if (replacement) {
    const ins = document.createElement("ins");
    ins.className = "sg-ins";
    ins.dataset.s = id;
    ins.textContent = replacement;
    dels[dels.length - 1].after(ins);
  }
  return true;
}

/** Takes a thread's marks out: a comment's highlight goes; a suggestion keeps the new text (accept) or the old (reject). */
export function settle(root: HTMLElement, id: string, how: "resolve" | "accept" | "reject") {
  for (const el of marksOf(root, id)) {
    if (how === "accept" && el.tagName === "DEL") el.remove();
    else if (how === "reject" && el.tagName === "INS") el.remove();
    else unwrap(el);
  }
}
