import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Pop, type Box } from "./context";
import { caretOffset, fromDOM, rangeAt } from "./format";
import * as I from "./icons";
import type { NotionBlock, NotionBlockInput, NotionBlockType } from "./types";
import { converted, hasText, locate, type NotionWorkspace } from "./use-notion";

// Light editing, as in the mockup: Enter starts a new block (the same
// kind, in a list), Backspace in an empty block turns it back into text
// and then removes it, "/" opens the block menu, and markdown shortcuts
// at the start of a text block ("# ", "- ", "1. ", "[] ", "> ", '" ',
// "---") turn it into that block.

interface SlashItem {
  type: NotionBlockType;
  label: string;
  icon: ReactNode;
  /** The markdown shortcut, shown on the right. */
  md?: string;
}

const SLASH: SlashItem[] = [
  { type: "text", label: "Text", icon: <I.Text /> },
  { type: "h1", label: "Heading 1", icon: <I.Heading n={1} />, md: "#" },
  { type: "h2", label: "Heading 2", icon: <I.Heading n={2} />, md: "##" },
  { type: "h3", label: "Heading 3", icon: <I.Heading n={3} />, md: "###" },
  { type: "bullet", label: "Bulleted list", icon: <I.Bullet />, md: "-" },
  { type: "number", label: "Numbered list", icon: <I.Numbered />, md: "1." },
  { type: "todo", label: "To-do list", icon: <I.Todo />, md: "[]" },
  { type: "toggle", label: "Toggle list", icon: <I.Toggle />, md: ">" },
  { type: "quote", label: "Quote", icon: <I.Quote />, md: '"' },
  { type: "callout", label: "Callout", icon: <I.Callout /> },
  { type: "divider", label: "Divider", icon: <I.Divider />, md: "---" },
  { type: "code", label: "Code", icon: <I.Code />, md: "```" },
];

const MD: Record<string, NotionBlockType> = { "#": "h1", "##": "h2", "###": "h3", "-": "bullet", "*": "bullet", "1.": "number", "[]": "todo", ">": "toggle", '"': "quote" };
const LISTS: NotionBlockType[] = ["bullet", "number", "todo", "toggle"];

/** An empty block of a type, with that type's defaults (a 💡 callout, plain-text code). */
export const blank = (type: NotionBlockType): NotionBlockInput => {
  const { id, ...rest } = converted({ id: "", type: "text", text: "", children: [] }, type);
  return { ...rest, children: [] } as NotionBlockInput;
};

/** The page's blocks in reading order, skipping the insides of closed toggles. */
export function visible(blocks: NotionBlock[], out: NotionBlock[] = []) {
  for (const b of blocks) {
    out.push(b);
    if (b.type !== "toggle" || b.open) visible(b.children, out);
  }
  return out;
}

interface Slash {
  el: HTMLElement;
  id: string;
  /** Where the "/" is in the block's text. */
  start: number;
  hi: number;
  list: SlashItem[];
  query: string;
  anchor: Box;
}

export function useEditor({ notion, root, focus, onOpen }: {
  notion: NotionWorkspace;
  root: RefObject<HTMLDivElement | null>;
  focus: (id: string, atEnd?: boolean, then?: (el: HTMLElement) => void) => void;
  /** The "/" menu opened: other popovers close. */
  onOpen: () => void;
}) {
  const [slash, setSlashState] = useState<Slash | null>(null);
  const ref = useRef<Slash | null>(null);
  const setSlash = useCallback((s: Slash | null) => {
    ref.current = s;
    setSlashState(s);
  }, []);
  const closeSlash = useCallback(() => setSlash(null), [setSlash]);
  const { ui } = notion;

  /** Redraws the menu for what is typed after the "/", or closes it. */
  const drawSlash = useCallback((el: HTMLElement, id: string, start: number, hi = 0) => {
    const off = caretOffset(el);
    const t = el.textContent ?? "";
    const query = t.slice(start + 1, off).toLowerCase();
    if (t[start] !== "/" || off <= start || query.length > 20) return setSlash(null);
    const list = SLASH.filter((x) => x.label.toLowerCase().includes(query.trim()));
    const prev = ref.current;
    let anchor = prev?.el === el ? prev.anchor : null;
    if (!anchor) {
      const box = root.current!.getBoundingClientRect();
      const sel = getSelection();
      const r = (sel?.rangeCount && sel.getRangeAt(0).getClientRects()[0]) || el.getBoundingClientRect();
      anchor = { left: r.left - box.left, top: r.top - box.top, right: r.right - box.left, bottom: r.bottom - box.top };
      onOpen();
    }
    setSlash({ el, id, start, hi: Math.min(hi, Math.max(0, list.length - 1)), list, query, anchor });
  }, [root, setSlash, onOpen]);

  const apply = useCallback((item: SlashItem | undefined) => {
    const s = ref.current;
    if (!s || !item) return setSlash(null);
    const { el, id, start } = s;
    setSlash(null);
    const at = locate(notion.state, id);
    if (!at) return;
    const b = at.block;
    rangeAt(el, start, caretOffset(el)).deleteContents();
    const text = b.type === "code" ? (el.textContent ?? "") : fromDOM(el);
    let target = id;
    if (!el.textContent && b.type !== "code") ui.turnInto(id, item.type, "");
    else {
      ui.editText(id, text);
      target = ui.insertAfter(id, blank(item.type));
    }
    if (item.type === "divider") target = ui.insertAfter(target, blank("text"));
    focus(target);
  }, [notion.state, ui, focus, setSlash]);

  const onTextInput = useCallback((el: HTMLElement, block: NotionBlock, e: InputEvent) => {
    if (block.type === "code") return ui.editText(block.id, el.textContent ?? "");
    if (el.innerHTML === "<br>") el.innerHTML = "";
    ui.editText(block.id, fromDOM(el));
    const off = caretOffset(el);
    const t = el.textContent ?? "";
    const s = ref.current;
    if (e.data === "/") drawSlash(el, block.id, off - 1);
    else if (s && s.el === el) drawSlash(el, block.id, s.start, s.hi);
    if (block.type !== "text") return;
    const m = e.inputType?.startsWith("insert") ? t.match(/^(#{1,3}|[-*]|1\.|\[\]|>|")[  ]/) : null;
    if (m && MD[m[1]]) {
      rangeAt(el, 0, m[0].length).deleteContents();
      setSlash(null);
      ui.turnInto(block.id, MD[m[1]], fromDOM(el));
      focus(block.id);
    } else if (t === "---") {
      setSlash(null);
      ui.turnInto(block.id, "divider");
      focus(ui.insertAfter(block.id, blank("text")));
    }
  }, [ui, drawSlash, focus, setSlash]);

  const onTextKey = useCallback((el: HTMLElement, block: NotionBlock, e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    const s = ref.current;
    if (s && s.el === el) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = Math.max(1, s.list.length);
        setSlash({ ...s, hi: (s.hi + (e.key === "ArrowDown" ? 1 : -1) + n) % n });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        apply(s.list[s.hi]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setSlash(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      const list = LISTS.includes(block.type);
      if (list && !el.textContent) {
        ui.turnInto(block.id, "text");
        focus(block.id);
      } else focus(ui.insertAfter(block.id, blank(list ? block.type : "text")));
    } else if (e.key === "Backspace" && !el.textContent && !el.querySelector(".mn")) {
      e.preventDefault();
      if (block.type !== "text") {
        ui.turnInto(block.id, "text");
        focus(block.id);
        return;
      }
      const page = notion.page;
      const order = visible(page.blocks);
      const i = order.findIndex((b) => b.id === block.id);
      if (i <= 0) return;
      const prev = order.slice(0, i).reverse().find(hasText);
      ui.remove(block.id);
      if (prev) focus(prev.id);
    }
  }, [ui, notion.page, apply, focus, setSlash]);

  /** Opens the menu in a block that holds just "/" (the gutter's +). */
  const startSlash = useCallback((el: HTMLElement, id: string) => drawSlash(el, id, 0), [drawSlash]);

  const menu = slash ? (
    <Pop anchor={slash.anchor} width={300} className="slash" keepFocus label="Blocks">
      {slash.list.length ? <div className="mh">{slash.query ? "Results" : "Basic blocks"}</div> : <div className="mempty">No results</div>}
      {slash.list.map((x, i) => (
        <button key={x.type} className={`mi${i === slash.hi ? " on" : ""}`} onClick={() => apply(x)} ref={i === slash.hi ? (b) => b?.scrollIntoView({ block: "nearest" }) : undefined}>
          <span className="ic">{x.icon}</span>
          <span className="lbl">{x.label}</span>
          {x.md ? <span className="kb">{x.md}</span> : null}
        </button>
      ))}
      <div className="msep" />
      <div className="mfoot">Type '/' on the page<span className="r">esc</span></div>
    </Pop>
  ) : null;

  return { onTextInput, onTextKey, startSlash, closeSlash, slashOpen: !!slash, menu };
}
