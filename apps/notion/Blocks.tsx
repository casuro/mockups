import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useUI } from "./context";
import { Database } from "./Database";
import { escapeHTML, fromDOM, highlight, LANGS, toHTML } from "./format";
import * as I from "./icons";
import type { NotionBlock, NotionBlockType, NotionSketch } from "./types";
import { textOf } from "./use-notion";

// The blocks of a page. The tree is drawn as a flat list of rows, each
// indented by its depth, as in the mockup; a closed toggle's children are
// left out. Text is edited in place: see Editable.

export interface BlockRow {
  block: NotionBlock;
  depth: number;
  /** Its number, in a run of numbered-list siblings. */
  n: number;
}

export function flatten(blocks: NotionBlock[], depth = 0, out: BlockRow[] = []) {
  let n = 0;
  for (const block of blocks) {
    n = block.type === "number" ? n + 1 : 0;
    out.push({ block, depth, n });
    if (block.type !== "toggle" || block.open) flatten(block.children, depth + 1, out);
  }
  return out;
}

/** The mockup's class for each block type. */
const CLS: Record<NotionBlockType, string> = {
  text: "p", h1: "h1", h2: "h2", h3: "h3", bullet: "bul", number: "num", todo: "todo", toggle: "tog", quote: "quote", callout: "call",
  divider: "div", code: "code", table: "table", image: "img", bookmark: "bm", toc: "toc", database: "dbv", page: "page", custom: "custom",
};

const PH: Partial<Record<NotionBlockType, string>> = {
  text: "Press 'space' for AI or '/' for commands", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", bullet: "List", number: "List",
  todo: "To-do", toggle: "Toggle", quote: "Empty quote", callout: "Type something...",
};

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
/** 1. 2. 3. at the top, a. b. c. one level in, i. ii. iii. the next. */
function numLabel(n: number, depth: number) {
  if (depth % 3 === 1) return `${String.fromCharCode(96 + ((n - 1) % 26) + 1)}.`;
  if (depth % 3 === 2) return `${ROMAN[n - 1] ?? n}.`;
  return `${n}.`;
}

/**
 * A contenteditable that React leaves alone while it is typed in: its HTML
 * is set only when the stored text changes from somewhere else.
 */
export function Editable({ html, matches, className, ph, as = "div", onInput, onKeyDown }: {
  html: string;
  /** Whether what is on screen already says what is stored. */
  matches: (el: HTMLElement) => boolean;
  className?: string;
  ph?: string;
  as?: "div" | "td";
  onInput: (el: HTMLElement, e: InputEvent) => void;
  onKeyDown?: (el: HTMLElement, e: KeyboardEvent) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const shown = useRef<string | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || shown.current === html) return;
    if (shown.current !== null && el === document.activeElement && matches(el)) shown.current = html;
    else {
      el.innerHTML = html;
      shown.current = html;
    }
  });
  const props = {
    ref: (el: HTMLElement | null) => void (ref.current = el),
    className,
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: false,
    "data-ph": ph,
    onInput: (e: React.FormEvent<HTMLElement>) => onInput(e.currentTarget, e.nativeEvent as InputEvent),
    onKeyDown: onKeyDown ? (e: KeyboardEvent<HTMLElement>) => onKeyDown(e.currentTarget, e) : undefined,
  };
  return as === "td" ? <td {...props} /> : <div {...props} />;
}

function BlockText({ block }: { block: NotionBlock }) {
  const { notion, onTextInput, onTextKey } = useUI();
  const text = textOf(block);
  const code = block.type === "code";
  return (
    <Editable
      className={code ? "tx code" : "tx"}
      html={code ? highlight(text, block.language) : toHTML(text, notion.fmt)}
      matches={(el) => (code ? el.textContent : fromDOM(el)) === text}
      ph={PH[block.type]}
      onInput={(el, e) => onTextInput(el, block, e)}
      onKeyDown={(el, e) => onTextKey(el, block, e)}
    />
  );
}

function Sketch({ sketch }: { sketch: NotionSketch }) {
  if (sketch === "phones")
    return (
      <div className="art">
        {["", "b", "c"].map((hero, i) => (
          <div key={i} className={`phone${i === 1 ? " mid" : ""}`}>
            <i className="notch" />
            <div className={`hero ${hero}`} />
            <div className="ln t w8" />
            <div className="ln w6" />
            {i === 1 ? (
              <>
                <div className="ln w8" />
                <div className="dots"><i className="on" /><i /><i /></div>
              </>
            ) : (
              <>
                <div className="fld" />
                <div className="fld" />
              </>
            )}
            <div className="btn" />
          </div>
        ))}
      </div>
    );
  return (
    <div className="art art-arch">
      {sketch.boxes.map(([title, sub], i) => (
        <div key={i} className="arch-node">{title}{sub ? <small>{sub}</small> : null}</div>
      ))}
    </div>
  );
}

function CodeBar({ block }: { block: Extract<NotionBlock, { type: "code" }> }) {
  const { notion } = useUI();
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-bar">
      <button onClick={() => notion.ui.action("Language picker", block.id)}>{LANGS[block.language ?? "plain"] ?? "Plain text"}<I.ChevDown /></button>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(block.text ?? "").catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <I.Copy />{copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function headings(blocks: NotionBlock[], out: NotionBlock[] = []) {
  for (const b of blocks) {
    if (b.type === "h1" || b.type === "h2" || b.type === "h3") out.push(b);
    headings(b.children, out);
  }
  return out;
}

export function Block({ block: b, depth, n }: BlockRow) {
  const { notion, focus, startSlash, renderBlock, flash } = useUI();
  const { ui, fmt } = notion;
  const cls = ["blk", `t-${CLS[b.type]}`, b.background && `bb-${b.background}`, b.color && `bc-${b.color}`, b.type === "todo" && b.checked && "done"]
    .filter(Boolean)
    .join(" ");
  const add = () => {
    const id = ui.insertAfter(b.id, { type: "text", text: "/" });
    focus(id, true, (el) => startSlash(el, id));
  };

  let inner: React.ReactNode = null;
  switch (b.type) {
    case "text": case "h1": case "h2": case "h3": case "quote":
      inner = <BlockText block={b} />;
      break;
    case "bullet":
      inner = <><div className={`mk mk-bul l${depth % 3}`} /><BlockText block={b} /></>;
      break;
    case "number":
      inner = <><div className="mk mk-num">{numLabel(n, depth)}</div><BlockText block={b} /></>;
      break;
    case "todo":
      inner = (
        <>
          <div className="mk mk-todo">
            <button className={`cb${b.checked ? " on" : ""}`} aria-label="Toggle to-do" aria-pressed={!!b.checked} onClick={() => ui.check(b.id)}><I.Check /></button>
          </div>
          <BlockText block={b} />
        </>
      );
      break;
    case "toggle":
      inner = (
        <>
          <div className="mk mk-tog">
            <button className={`tri${b.open ? " open" : ""}`} aria-label={b.open ? "Collapse" : "Expand"} aria-expanded={!!b.open} onClick={() => ui.flip(b.id)}><I.Tri /></button>
          </div>
          <BlockText block={b} />
        </>
      );
      break;
    case "callout":
      inner = <><div className="call-ic">{b.icon ?? "💡"}</div><BlockText block={b} /></>;
      break;
    case "code":
      inner = <><CodeBar block={b} /><BlockText block={b} /></>;
      break;
    case "table":
      inner = (
        <div className="stbl-wrap">
          <table className={`stbl${b.header ? " hdr" : ""}`}>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <Editable key={c} as="td" html={toHTML(cell, fmt)} matches={(el) => fromDOM(el) === cell} onInput={(el) => ui.editCell(b.id, r, c, fromDOM(el))} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      break;
    case "image":
      inner = (
        <>
          <figure className="img-fig">
            {b.src ? <img src={b.src} alt={b.caption ?? ""} /> : b.sketch ? <Sketch sketch={b.sketch} /> : null}
          </figure>
          <Editable className="img-cap" ph="Write a caption..." html={escapeHTML(b.caption ?? "")} matches={(el) => el.textContent === (b.caption ?? "")} onInput={(el) => ui.editCaption(b.id, el.textContent ?? "")} />
        </>
      );
      break;
    case "bookmark": {
      const host = b.url.replace(/^\w+:\/\//, "");
      inner = (
        <div className="bm" role="link" tabIndex={0} onClick={() => ui.action("Open link", b.id)}>
          <div className="bm-body">
            <div className="bm-t">{b.title}</div>
            {b.description ? <div className="bm-d">{b.description}</div> : null}
            <div className="bm-u"><span className="ws-ic fav">{b.icon ?? host.charAt(0).toUpperCase()}</span>{b.url}</div>
          </div>
          <div className="bm-img" />
        </div>
      );
      break;
    }
    case "toc":
      inner = (
        <div className="toc">
          {headings(notion.page.blocks).map((h) => (
            <a key={h.id} className={`l${h.type.slice(1)}`} onClick={() => flash(h.id)} dangerouslySetInnerHTML={{ __html: toHTML(textOf(h), fmt) }} />
          ))}
        </div>
      );
      break;
    case "database":
      inner = <Database id={b.database} inline />;
      break;
    case "page":
      inner = (
        <div className="tx" dangerouslySetInnerHTML={{ __html: toHTML(`[[${b.page}]]`, fmt) }} />
      );
      break;
    case "custom":
      inner = renderBlock?.(b) ?? null;
      break;
  }

  return (
    <div className={cls} data-bid={b.id} style={{ "--in": depth } as CSSProperties}>
      <div className="gut">
        <button className="g-add" aria-label="Add block below" onClick={add}><I.Plus /></button>
        <button className="g-grip" aria-label="Drag to move" onClick={() => ui.action("Block menu", b.id)}><I.Grip /></button>
      </div>
      <div className="bc">{inner}</div>
    </div>
  );
}
