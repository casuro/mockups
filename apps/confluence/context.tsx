import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { FormatContext } from "./format";
import type { ConfluenceBlock, ConfluencePage } from "./types";
import type { ConfluenceSpace } from "./use-confluence";

// What every part of <Confluence> reads: the space, the rich-text
// formatter's hooks, and the bits of screen state the parts share.

export interface ConfluenceUI {
  confluence: ConfluenceSpace;
  fmt: FormatContext;
  root: RefObject<HTMLDivElement | null>;
  /** The scrolling page area, for "On this page" jumps. */
  main: RefObject<HTMLElement | null>;
  reply: RefObject<HTMLTextAreaElement | null>;
  renderBlock?: (block: Extract<ConfluenceBlock, { type: "custom" }>, page: ConfluencePage) => ReactNode;
  toggleSide: () => void;
}

export const ConfluenceContext = createContext<ConfluenceUI | null>(null);

export function useUI() {
  const ui = useContext(ConfluenceContext);
  if (!ui) throw new Error("Confluence parts must be inside <Confluence>");
  return ui;
}

export function Avatar({ id, className = "av" }: { id: string; className?: string }) {
  const p = useUI().confluence.people[id];
  if (!p) return null;
  return p.photo ? (
    <img className={className} src={p.photo} alt={p.name} draggable={false} />
  ) : (
    <span className={`${className} ini`} style={{ background: p.color }} role="img" aria-label={p.name}>
      {p.initials}
    </span>
  );
}
