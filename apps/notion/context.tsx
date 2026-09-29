import { createContext, useContext, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import type { NotionBlock } from "./types";
import type { NotionWorkspace } from "./use-notion";

// What every part of <Notion> reads: the workspace, the open popover, the
// "/" menu, and a way to put the caret in a block once it is drawn. Also
// the small shared parts: Avatar, PageIcon and Pop.

/** A box relative to the app's root (not the window), so the app also works as one pane. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type PopKind = "workspace" | "share";

export interface NotionUI {
  notion: NotionWorkspace;
  root: RefObject<HTMLDivElement | null>;
  renderBlock?: (block: NotionBlock) => ReactNode;
  /** The popover that is open, and what it hangs from. */
  pop: { kind: PopKind; anchor: Box } | null;
  openPop: (kind: PopKind, from: Element | DOMRect) => void;
  closePop: () => void;
  /** Put the caret in a block once it is on screen (at its end, or its start). */
  focus: (id: string, atEnd?: boolean, then?: (el: HTMLElement) => void) => void;
  /** Where the caret goes next: read by the page after it draws. */
  pendingFocus: RefObject<{ id: string; atEnd: boolean; then?: (el: HTMLElement) => void } | null>;
  /** Keys and typing in a block's text: the "/" menu, markdown shortcuts, Enter and Backspace. */
  onTextInput: (el: HTMLElement, block: NotionBlock, e: InputEvent) => void;
  onTextKey: (el: HTMLElement, block: NotionBlock, e: KeyboardEvent) => void;
  /** Opens the "/" menu in a block whose text is "/". */
  startSlash: (el: HTMLElement, id: string) => void;
  toggleDrawer: (open?: boolean) => void;
  /** Scroll a block into view and flash it (the table of contents). */
  flash: (id: string) => void;
}

export const NotionContext = createContext<NotionUI | null>(null);

export function useUI() {
  const ui = useContext(NotionContext);
  if (!ui) throw new Error("Notion parts must be inside <Notion>");
  return ui;
}

export function Avatar({ id, className = "av" }: { id: string; className?: string }) {
  const p = useUI().notion.people[id];
  if (!p) return null;
  return p.photo ? (
    <img className={className} src={p.photo} alt={p.name} draggable={false} />
  ) : (
    <span className={`${className} ini`} style={{ background: p.color }} role="img" aria-label={p.name}>
      {p.initials}
    </span>
  );
}

/** A page's emoji, or the page icon when it has none. */
export function PageIcon({ id }: { id: string }) {
  const p = useUI().notion.state.pages[id];
  return p?.icon ? <>{p.icon}</> : <PageGlyph />;
}

function PageGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.75 3.25h5.5l3.5 3.5v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V3.75a.5.5 0 0 1 .5-.5z" />
      <path d="M11 3.5v3.5h3.5M7.75 10.5h4.5M7.75 13h4.5" />
    </svg>
  );
}

export const titleOf = (p: { title: string; parent?: string } | undefined, row = false) => p?.title || (row ? "Untitled" : "New page");

/**
 * A popover hanging from `anchor`: below it, or above when there is no room,
 * kept inside the app. `align="right"` lines its right edge up with the anchor's.
 */
export function Pop({ anchor, width, align = "left", className = "", keepFocus, children, label }: {
  anchor: Box;
  width?: number;
  align?: "left" | "right";
  className?: string;
  /** Clicking in it leaves the caret where it was (the "/" menu). */
  keepFocus?: boolean;
  children: ReactNode;
  label?: string;
}) {
  const { root } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = root.current;
    if (!el || !box) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = align === "right" ? Math.max(8, anchor.right - w) : Math.max(8, Math.min(anchor.left, box.clientWidth - w - 8));
    let top = anchor.bottom + 4;
    if (top + h > box.clientHeight - 8) top = Math.max(8, anchor.top - h - 4);
    setAt((prev) => (prev?.left === left && prev.top === top ? prev : { left, top }));
  }, [anchor, align, root, children]);
  return (
    <div
      ref={ref}
      className={`pop ${className}`}
      role="dialog"
      aria-label={label}
      style={{ width, left: at?.left ?? 0, top: at?.top ?? 0, visibility: at ? "visible" : "hidden" }}
      onMouseDown={keepFocus ? (e) => { if (!(e.target as HTMLElement).closest("input")) e.preventDefault(); } : undefined}
    >
      {children}
    </div>
  );
}
