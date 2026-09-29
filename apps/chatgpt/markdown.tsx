import { Fragment, useState, type ReactNode } from "react";
import * as I from "./icons";

// The markdown ChatGPT answers are written in, as React: headings, **bold**,
// *italic*, `code`, [links](https://...), lists, > quotes, tables and fenced
// code blocks with light syntax highlighting. The same rules as the mockup's
// md(), built as elements rather than an HTML string. While an answer
// streams, half-written syntax is hidden and the pulsing cursor sits at the
// end of the last block.

type Block =
  | { t: "p"; lines: string[] }
  | { t: "h"; level: number; text: string }
  | { t: "hr" }
  | { t: "code"; lang: string; code: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "quote"; blocks: Block[] }
  | { t: "list"; ordered: boolean; start: number; items: { text: string; sub: string[] }[] };

export function parse(src: string): Block[] {
  const lines = src.replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  const para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: "p", lines: para.splice(0) });
  };
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    let m: RegExpMatchArray | null;
    if ((m = ln.match(/^```\s*([\w+-]*)/))) {
      flush();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push({ t: "code", lang: m[1] || "", code: buf.join("\n") });
      continue;
    }
    if (/^\s*$/.test(ln)) { flush(); i++; continue; }
    if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) { flush(); out.push({ t: "h", level: m[1].length, text: m[2] }); i++; continue; }
    if (/^(-{3,}|\*{3,})\s*$/.test(ln)) { flush(); out.push({ t: "hr" }); i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush();
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(ln);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push({ t: "table", head, rows });
      continue;
    }
    if (/^>\s?/.test(ln)) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push({ t: "quote", blocks: parse(buf.join("\n")) });
      continue;
    }
    if ((m = ln.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/))) {
      flush();
      const ordered = /\d/.test(m[2]);
      const items: { text: string; sub: string[] }[] = [];
      while (i < lines.length) {
        const mm = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (mm && mm[1].length < 2 && /\d/.test(mm[2]) === ordered) { items.push({ text: mm[3], sub: [] }); i++; continue; }
        if (mm && mm[1].length >= 2 && items.length) { items[items.length - 1].sub.push(mm[3]); i++; continue; }
        if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += " " + lines[i].trim(); i++; continue; }
        break;
      }
      out.push({ t: "list", ordered, start: ordered ? parseInt(m[2]) : 1, items });
      continue;
    }
    para.push(ln.trim());
    i++;
  }
  flush();
  return out;
}

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)|\[([^\]]+)\]\((https?:[^)\s]+)\)|->/g;

export function Inline({ text }: { text: string }) {
  return <>{inline(text, "i")}</>;
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    const k = `${key}.${n++}`;
    const [whole, code, bold, lead, em, label, url] = m;
    if (at > last) out.push(text.slice(last, at));
    if (code !== undefined) out.push(<code key={k}>{code}</code>);
    else if (bold !== undefined) out.push(<strong key={k}>{inline(bold, k)}</strong>);
    else if (em !== undefined) out.push(lead, <em key={k}>{inline(em, k)}</em>);
    else if (label !== undefined) out.push(<a key={k} href={url} target="_blank" rel="noopener noreferrer">{label}</a>);
    else out.push("→");
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const Cursor = () => <span className="cursor" />;

export interface MarkdownProps {
  text: string;
  /** Still being written: hide half-written syntax and show the cursor. */
  streaming?: boolean;
  onCopyCode?: (code: string) => void;
  onEditCode?: (code: string, lang: string) => void;
}

export function Markdown({ text, streaming, onCopyCode, onEditCode }: MarkdownProps) {
  const blocks = parse(streaming ? cleanPartial(text) : text);
  return <div className="md">{renderBlocks(blocks, "b", streaming ? "end" : null, { onCopyCode, onEditCode })}</div>;
}

type Tools = Pick<MarkdownProps, "onCopyCode" | "onEditCode">;

function renderBlocks(blocks: Block[], key: string, cursor: "end" | null, tools: Tools): ReactNode[] {
  const out = blocks.map((b, i) => renderBlock(b, `${key}.${i}`, i === blocks.length - 1 ? cursor : null, tools));
  if (cursor && !blocks.length) out.push(<Cursor key="cur" />);
  return out;
}

function renderBlock(b: Block, k: string, cur: "end" | null | false, tools: Tools): ReactNode {
  const c = cur ? <Cursor /> : null;
  switch (b.t) {
    case "p":
      return (
        <p key={k}>
          {b.lines.map((l, i) => (
            <span key={i}>{i ? <br /> : null}{inline(l, `${k}.${i}`)}</span>
          ))}
          {c}
        </p>
      );
    case "h": {
      const H = `h${b.level}` as "h1";
      return <H key={k}>{inline(b.text, k)}{c}</H>;
    }
    case "hr":
      return <Fragment key={k}><hr />{c}</Fragment>;
    case "code":
      return (
        <Fragment key={k}>
          <CodeBlock code={b.code} lang={b.lang} {...tools} />
          {c}
        </Fragment>
      );
    case "table": {
      const lastRow = b.rows.length - 1;
      return (
        <div className="tbl" key={k}>
          <table>
            <thead>
              <tr>{b.head.map((h, i) => <th key={i}>{inline(h, `${k}.h${i}`)}{cur && lastRow < 0 && i === b.head.length - 1 ? <Cursor /> : null}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>{r.map((cell, ci) => <td key={ci}>{inline(cell, `${k}.${ri}.${ci}`)}{cur && ri === lastRow && ci === r.length - 1 ? <Cursor /> : null}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "quote":
      return <blockquote key={k}>{renderBlocks(b.blocks, k, cur ? "end" : null, tools)}</blockquote>;
    case "list": {
      const L = b.ordered ? "ol" : "ul";
      const last = b.items.length - 1;
      return (
        <L key={k} start={b.ordered && b.start !== 1 ? b.start : undefined}>
          {b.items.map((it, i) => (
            <li key={i}>
              {inline(it.text, `${k}.${i}`)}
              {cur && i === last && !it.sub.length ? <Cursor /> : null}
              {it.sub.length ? (
                <ul>{it.sub.map((s, j) => <li key={j}>{inline(s, `${k}.${i}.${j}`)}{cur && i === last && j === it.sub.length - 1 ? <Cursor /> : null}</li>)}</ul>
              ) : null}
            </li>
          ))}
        </L>
      );
    }
  }
}

const LANG_LABEL: Record<string, string> = { js: "javascript", py: "python", sh: "bash", ts: "typescript" };

function CodeBlock({ code, lang, onCopyCode, onEditCode }: { code: string; lang: string } & Tools) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="codeblock">
      <div className="ch">
        <span>{LANG_LABEL[lang] ?? (lang || "text")}</span>
        <span className="tools">
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(code).catch(() => {});
              onCopyCode?.(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? <I.Check /> : <I.Copy />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button onClick={() => onEditCode?.(code, lang)}><I.Pencil /><span>Edit</span></button>
        </span>
      </div>
      <pre><code>{highlight(code, lang)}</code></pre>
    </div>
  );
}

// ---------- Syntax highlighting ----------

const KW: Record<string, string> = {
  sql: "select from where and or not null is in as on join left right inner outer full group by order having limit offset insert into values update set delete create table alter add column constraint check valid validate index concurrently if exists drop primary key references default begin end declare loop while commit rollback procedure function language returns return perform raise notice call replace int bigint smallint text boolean timestamp timestamptz varchar get diagnostics row_count distinct case when then else union all explain analyze buffers with",
  javascript: "const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof in of this null undefined true false",
  python: "def return if elif else for while in not and or import from as class try except finally raise with lambda None True False pass yield async await is",
  bash: "if then else fi for do done case esac function export echo cd sudo",
};
KW.js = KW.javascript;
KW.ts = KW.typescript = KW.javascript + " interface type enum implements readonly";
KW.py = KW.python;
KW.sh = KW.shell = KW.bash;
KW.plpgsql = KW.sql;

export function highlight(code: string, language: string): ReactNode[] {
  const lang = language.toLowerCase();
  const kws = KW[lang];
  if (!kws) return [code];
  const kwset = new Set(kws.split(" "));
  const ci = lang === "sql" || lang === "plpgsql";
  const com = ci ? "--[^\\n]*" : ["python", "py", "bash", "sh", "shell"].includes(lang) ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  const re = new RegExp(
    `(${com})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\/(?![/*])(?:\\\\.|[^/\\\\\\n])+\\/[gimsuy]*)|\\b(\\d+(?:\\.\\d+)?)\\b|([A-Za-z_$][\\w$]*)(?=\\s*\\()|([A-Za-z_$][\\w$]*)`,
    "g"
  );
  // Plain text is kept in runs, one text node each, so it lays out exactly like the mockup's.
  const out: ReactNode[] = [];
  let text = "";
  const push = (node: ReactNode) => {
    if (typeof node === "string") return void (text += node);
    if (text) out.push(text);
    text = "";
    out.push(node);
  };
  let last = 0;
  let n = 0;
  const span = (cls: string, t: string) => <span key={n++} className={cls}>{t}</span>;
  for (const m of code.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) push(code.slice(last, at));
    const [t, c, s, rx, num, fn, id] = m;
    const kw = (w: string) => kwset.has(ci ? w.toLowerCase() : w);
    if (c) push(span("t-com", t));
    else if (s) push(span("t-str", t));
    else if (rx && lang !== "sql" && lang !== "python" && /[=(,:]\s*$/.test(code.slice(Math.max(0, at - 3), at))) push(span("t-str", t));
    else if (rx) push(t);
    else if (num) push(span("t-num", t));
    else if (fn) push(span(kw(fn) ? "t-kw" : "t-fn", fn));
    else if (id) push(kw(id) ? span("t-kw", id) : /^[A-Z][A-Za-z]+Error$|^(RegExp|Math|JSON|Promise|Object|Array|String)$/.test(id) ? span("t-type", id) : id);
    last = at + t.length;
  }
  if (last < code.length) push(code.slice(last));
  if (text) out.push(text);
  return out;
}

/** While streaming, hide half-written constructs so raw markdown never flashes. */
export function cleanPartial(t: string) {
  const lines = t.split("\n");
  let last = lines[lines.length - 1];
  const fences = (t.match(/^```/gm) || []).length;
  if (fences % 2 === 0) {
    if (/^\s*\|/.test(last)) {
      lines.pop();
      // A table needs its header and separator before it can render.
      let k = lines.length;
      while (k > 0 && /^\s*\|/.test(lines[k - 1])) k--;
      if (lines.length - k < 2) lines.length = k;
      return lines.join("\n");
    }
    if (/^\s*(#{1,4}|[-*]|\d+\.?|>)\s*$/.test(last) || /^`{1,2}$/.test(last.trim())) {
      lines.pop();
      return lines.join("\n");
    }
    if ((last.match(/\*\*/g) || []).length % 2) {
      const i = last.lastIndexOf("**");
      last = last.slice(0, i) + last.slice(i + 2);
    }
    if ((last.replace(/\*\*/g, "").match(/\*/g) || []).length % 2 && /\*[^*\s][^*]*$/.test(last)) last = last.replace(/\*([^*]*)$/, "$1");
    if ((last.match(/`/g) || []).length % 2) {
      const i = last.lastIndexOf("`");
      last = last.slice(0, i) + last.slice(i + 1);
    }
    last = last.replace(/\[([^\]]*)(\]\([^)]*)?$/, "$1");
    lines[lines.length - 1] = last;
  }
  return lines.join("\n");
}

/** The words without the markdown: for search snippets and the share preview. */
export function plain(src: string) {
  return src.replace(/```[\w-]*\n?/g, "").replace(/[*#>`|]/g, "").replace(/\n{2,}/g, "\n").trim();
}
