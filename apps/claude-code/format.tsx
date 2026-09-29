import { useState, type ReactNode } from "react";
import * as I from "./icons";
import type { Hunk, Lang } from "./types";

// Text as Claude Code draws it: one-line syntax highlighting, the small
// markdown Claude writes in, colored terminal output, the diff model and
// numbers. The same rules as the mockup's hl(), md(), colorOut() and
// parseHunk(), built as elements rather than HTML strings.

export const langOf = (path: string): Lang =>
  /\.sql$/.test(path) ? "sql" : /\.(css|astro)$/.test(path) ? "css" : /\.sh$/.test(path) ? "sh" : "ts";

/** The shortcut key: ⌘ on a Mac, Ctrl elsewhere. */
export const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";

export const baseName = (path: string) => path.split("/").pop() ?? path;

/** 84200 -> "84.2k" */
export const fmtK = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));

// ---------- Syntax highlighting (single line, token regexes) ----------

const KW: Record<string, string> = {
  ts: "import|export|from|const|let|var|function|return|async|await|if|else|for|while|of|in|new|class|extends|interface|type|default|throw|try|catch|finally|break|continue|true|false|null|undefined|this|typeof|describe|it|expect|test",
  sql: "SELECT|FROM|WHERE|UPDATE|SET|INSERT|INTO|VALUES|DELETE|CREATE|INDEX|CONCURRENTLY|IF|NOT|EXISTS|ON|AND|OR|IN|ORDER|BY|LIMIT|BEGIN|COMMIT|END|LOOP|EXIT|WHEN|DECLARE|AS|REPLACE|PROCEDURE|LANGUAGE|CALL|FOR|SKIP|LOCKED|GET|DIAGNOSTICS|RAISE|NOTICE|IS|NULL|DEFAULT|int|plpgsql",
  css: "color-scheme|prefers-reduced-motion|reduce|none|@media",
  sh: "npm|npx|git|psql|cd|echo|export",
};
const RULES: Partial<Record<Lang, { re: RegExp; cls: string[] }>> = {};

function rules(lang: Lang) {
  const cached = RULES[lang];
  if (cached) return cached;
  const kw = new RegExp(`\\b(?:${KW[lang] ?? KW.ts})\\b`);
  const table: Record<Lang, [RegExp, string][]> = {
    ts: [[/\/\/.*/, "com"], [/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`?/, "str"], [/\b\d[\d_.]*\b/, "num"], [kw, "kw"], [/\b[A-Z][A-Za-z0-9]*\b/, "type"], [/\b[a-zA-Z_$][\w$]*(?=\()/, "fn"]],
    sql: [[/--.*/, "com"], [/'(?:[^']|'')*'/, "str"], [/\b\d+\b/, "num"], [kw, "kw"], [/\b[a-z_]+(?=\()/, "fn"]],
    css: [[/\/\*.*?\*\/|\/\/.*/, "com"], [/"[^"]*"|'[^']*'/, "str"], [/--[\w-]+/, "type"], [/#[0-9a-fA-F]{3,8}\b|\b\d[\d.]*(?:px|ms|s|%|rem|em)?\b/, "num"], [/[\w-]+(?=\s*:(?!:))/, "fn"], [kw, "kw"]],
    sh: [[/#.*/, "com"], [/"[^"]*"|'[^']*'/, "str"], [kw, "kw"], [/\s--?[\w-]+/, "fn"]],
    text: [],
  };
  const parts = table[lang] ?? [];
  const out = { re: new RegExp(parts.map(([r]) => `(${r.source})`).join("|") || "(?!)", "g"), cls: parts.map((p) => p[1]) };
  RULES[lang] = out;
  return out;
}

/** One line of code with its tokens colored. */
export function highlight(line: string, lang: Lang = "ts"): ReactNode[] {
  if (!line) return [];
  const { re, cls } = rules(lang);
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  re.lastIndex = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (!m[0]) {
      re.lastIndex++;
      continue;
    }
    if (m.index > last) out.push(line.slice(last, m.index));
    const gi = m.slice(1).findIndex((g) => g !== undefined);
    out.push(<span key={n++} className={`tok-${cls[gi]}`}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

// ---------- Markdown ----------

/** `code` and **bold**. */
export function inlineMd(text: string, key = "m"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(/\*\*([^*]+)\*\*|`([^`]+)`/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}${n++}`;
    // Bold may wrap code (**`file.ts`**), as the mockup replaces code first.
    out.push(m[2] !== undefined ? <code key={k}>{m[2]}</code> : <strong key={k}>{inlineMd(m[1], k)}</strong>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const hl: Lang = lang === "bash" ? "sh" : (["ts", "sql", "css", "sh"].includes(lang) ? lang : "text") as Lang;
  const lines = code.split("\n");
  return (
    <div className="codeblock">
      <div className="cb-h">
        <span>{lang}</span>
        <span className="grow" />
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          <I.Copy />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        {lines.map((l, i) => (
          <span key={i}>
            {highlight(l, hl)}
            {i < lines.length - 1 ? "\n" : null}
          </span>
        ))}
      </pre>
    </div>
  );
}

/** Claude's markdown: paragraphs, ### headings, - lists, 1. lists, ```fences```, `code`, **bold**. `caret` ends it with the streaming caret. */
export function Markdown({ text, caret = false }: { text: string; caret?: boolean }) {
  const lines = text.split("\n");
  const blocks: { kind: "p" | "h3" | "ul" | "ol" | "code"; body: string[]; lang?: string }[] = [];
  let i = 0;
  const special = /^(```|###\s|\s*[-*]\s|\d+\.\s)/;
  while (i < lines.length) {
    const l = lines[i];
    const fence = l.match(/^```(\w*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", body, lang: fence[1] || "text" });
    } else if (/^###\s/.test(l)) {
      blocks.push({ kind: "h3", body: [l.replace(/^###\s/, "")] });
      i++;
    } else if (/^\s*[-*]\s/.test(l)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) body.push(lines[i++].replace(/^\s*[-*]\s/, ""));
      blocks.push({ kind: "ul", body });
    } else if (/^\d+\.\s/.test(l)) {
      const body: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) body.push(lines[i++].replace(/^\d+\.\s/, ""));
      blocks.push({ kind: "ol", body });
    } else if (!l.trim()) i++;
    else {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim() && !special.test(lines[i])) body.push(lines[i++]);
      blocks.push({ kind: "p", body: [body.join(" ")] });
    }
  }
  // The caret goes at the end of the last paragraph, item or heading, like the mockup.
  let caretAt = -1;
  if (caret) for (let b = blocks.length - 1; b >= 0; b--) if (blocks[b].kind !== "code") { caretAt = b; break; }
  const mark = <span className="caret" />;
  return (
    <>
      {blocks.map((b, n) => {
        const end = n === caretAt ? mark : null;
        if (b.kind === "code") return <CodeBlock key={n} lang={b.lang!} code={b.body.join("\n")} />;
        if (b.kind === "h3") return <h3 key={n}>{inlineMd(b.body[0])}{end}</h3>;
        if (b.kind === "p") return <p key={n}>{inlineMd(b.body[0])}{end}</p>;
        const List = b.kind;
        return (
          <List key={n}>
            {b.body.map((li, k) => <li key={k}>{inlineMd(li)}{k === b.body.length - 1 ? end : null}</li>)}
          </List>
        );
      })}
      {caret && caretAt < 0 ? mark : null}
    </>
  );
}

// ---------- Terminal output ----------

/** A line starting with ESC[31m (ANSI red) is drawn red, like `git status` does. */
const RED = "\u001b[31m";

/** Colors test-runner output the way the mockup does: passes green, failures red, chrome dim. */
export function TermOutput({ text }: { text: string }) {
  const lines = text.replace(/^\n/, "").split("\n");
  return (
    <>
      {lines.map((l, i) => {
        const nl = i < lines.length - 1 ? "\n" : null;
        let node: ReactNode = l;
        if (l.startsWith(RED)) node = <span className="t-red">{l.slice(RED.length)}</span>;
        else if (/^\s*(✓|✔)/.test(l) || (/\bpassed\b/.test(l) && !/failed/.test(l))) node = <span className="t-green">{l}</span>;
        else if (/^\s*(✕|✘|×)/.test(l) || /\bfailed\b|Error:|→ expected|→ CSS/.test(l)) node = <span className="t-red">{l}</span>;
        else if (/^\s*RUN\s/.test(l)) {
          const at = l.indexOf("RUN");
          node = <>{l.slice(0, at)}<span className="t-pass" style={{ background: "#2f5f9a" }}>RUN</span>{l.slice(at + 3)}</>;
        } else if (/^>/.test(l) || /Start at|Duration|To open|show-report/.test(l)) node = <span className="t-dim">{l}</span>;
        return <span key={i}>{node}{nl}</span>;
      })}
    </>
  );
}

// ---------- Diffs ----------

export interface DiffRow {
  op: " " | "+" | "-";
  text: string;
  /** Old line number (context and removed lines). */
  o?: number;
  /** New line number (context and added lines). */
  n?: number;
}

export function parseHunk(h: Hunk) {
  const rows: DiffRow[] = [];
  let o = h.oldStart;
  let n = h.newStart;
  for (const raw of h.lines.split("\n")) {
    const op = raw[0] === "+" || raw[0] === "-" ? raw[0] : " ";
    const text = raw.length && (raw[0] === "+" || raw[0] === "-" || raw[0] === " ") ? raw.slice(1) : raw;
    if (op === "+") rows.push({ op, text, n: n++ });
    else if (op === "-") rows.push({ op, text, o: o++ });
    else rows.push({ op, text, o: o++, n: n++ });
  }
  const oc = rows.filter((r) => r.op !== "+").length;
  const nc = rows.filter((r) => r.op !== "-").length;
  return { rows, header: `@@ -${h.oldStart},${oc} +${h.newStart},${nc} @@` };
}

/** Lines added and removed. */
export function stats(hunks: Hunk[]) {
  let a = 0;
  let d = 0;
  for (const h of hunks)
    for (const raw of h.lines.split("\n")) {
      if (raw[0] === "+") a++;
      else if (raw[0] === "-") d++;
    }
  return { a, d };
}

export function DiffStat({ a, d }: { a: number; d: number }) {
  return (
    <span className="diff-stat">
      <span className="a">+{a}</span>
      <span className="d">-{d}</span>
    </span>
  );
}

// ---------- Times ----------

const DAY = 86400000;

/** The sidebar group a session falls in. */
export function groupOf(at: number): "Today" | "Yesterday" | "Previous 7 days" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (at >= today.getTime()) return "Today";
  if (at >= today.getTime() - DAY) return "Yesterday";
  return "Previous 7 days";
}
