import { Fragment, type ReactNode } from "react";
import { useUI } from "./context";
import { Rich } from "./format";
import * as I from "./icons";
import type { ConfluenceBlock, ConfluencePage } from "./types";

// A page's content: headings, paragraphs, lists, panels, tables, code,
// checklists, and the `custom` escape hatch, drawn as in the mockup.

const TONE = { info: "info", note: "note", warning: "warn", success: "ok" } as const;

/** The anchor of a heading: its own `id`, or its place in the page. */
export const headingKey = (block: Extract<ConfluenceBlock, { type: "heading" }>, index: number) => block.id ?? `h-${index}`;

export function Blocks({ page }: { page: ConfluencePage }) {
  const { fmt, confluence, renderBlock } = useUI();
  return (
    <div className="body">
      {page.blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return b.level === 3 ? (
              <h3 key={i}><Rich text={b.text} ctx={fmt} /></h3>
            ) : (
              <h2 key={i} data-h={headingKey(b, i)}><Rich text={b.text} ctx={fmt} /></h2>
            );
          case "paragraph":
            return <p key={i}><Rich text={b.text} ctx={fmt} /></p>;
          case "list": {
            const items = b.items.map((t, j) => <li key={j}><Rich text={t} ctx={fmt} /></li>);
            return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
          }
          case "panel": {
            const Icon = I.PanelIcon[b.tone];
            return (
              <div key={i} className={`panel ${TONE[b.tone]}`}>
                <span className="pi"><Icon /></span>
                <p><Rich text={b.text} ctx={fmt} /></p>
              </div>
            );
          }
          case "table":
            return (
              <div key={i} className="tbl">
                <table>
                  <tbody>
                    <tr>{b.head.map((h, j) => <th key={j}><Rich text={h} ctx={fmt} /></th>)}</tr>
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, k) => <td key={k}><Rich text={c} ctx={fmt} /></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return <Code key={i} code={b.code} sql={b.language?.toLowerCase() === "sql"} />;
          case "tasks":
            return (
              <ul key={i} className="tasks">
                {b.items.map((t, j) => (
                  <li
                    key={j}
                    className={t.done ? "done" : ""}
                    role="checkbox"
                    aria-checked={!!t.done}
                    tabIndex={0}
                    onClick={() => confluence.ui.check(i, j)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        confluence.ui.check(i, j);
                      }
                    }}
                  >
                    <span className="cb"><I.Check /></span>
                    <span className="tt"><Rich text={t.text} ctx={fmt} /></span>
                  </li>
                ))}
              </ul>
            );
          case "custom":
            return <Fragment key={i}>{renderBlock?.(b, page) ?? null}</Fragment>;
        }
      })}
    </div>
  );
}

// The mockup's SQL keywords, plus the common ones.
const KEYWORDS = new Set(
  "CREATE INDEX CONCURRENTLY ALTER TABLE ADD COLUMN SET NOT NULL DEFAULT ON IF EXISTS VALIDATE CONSTRAINT CHECK lock_timeout SELECT FROM WHERE UPDATE INSERT INTO VALUES DELETE DROP BEGIN COMMIT ROLLBACK JOIN LEFT INNER AND OR AS PRIMARY KEY REFERENCES UNIQUE".split(" ")
);
const TOKENS = /(--.*$|\/\/.*$)|('[^'\n]*'|"[^"\n]*")|\b(\w+)\b/g;

function highlight(line: string, sql: boolean, key: number): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of line.matchAll(TOKENS)) {
    const [whole, comment, str, word] = m;
    if (word !== undefined && !(sql && KEYWORDS.has(word))) continue;
    const at = m.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    const cls = comment !== undefined ? "tc" : str !== undefined ? "ts" : "tk";
    out.push(<span key={`${key}.${n++}`} className={cls}>{whole}</span>);
    last = at + whole.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function Code({ code, sql }: { code: string; sql: boolean }) {
  const lines = code.split("\n");
  return (
    <pre className="code">
      <span className="ln">{lines.map((_, i) => i + 1).join("\n")}</span>
      <code>
        {lines.map((l, i) => (
          <Fragment key={i}>
            {i ? "\n" : null}
            {highlight(l, sql, i)}
          </Fragment>
        ))}
      </code>
    </pre>
  );
}
