import { createContext, useContext, type CSSProperties, type RefObject } from "react";
import type { GoogleDocsApp } from "./use-google-docs";

// What every part of <GoogleDocs> reads: the app, the editable page, and the
// bits of screen state the parts share (the open menu, the comment in focus,
// the comment being written, the toolbar's reading of the selection).

export interface Selection {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  /** "Normal text", "Title", "Heading 1"... */
  style: string;
  size: number;
}

export interface DocsUI {
  docs: GoogleDocsApp;
  root: RefObject<HTMLDivElement | null>;
  page: RefObject<HTMLElement | null>;
  /** The open menu and the button it hangs from. */
  menu: { name: string; anchor: HTMLElement } | null;
  toggleMenu: (name: string, anchor: HTMLElement) => void;
  closeMenu: () => void;
  /** The thread in focus: its card is raised and its text darker. */
  active: string | null;
  setActive: (id: string | null) => void;
  /** A comment being written on a selection: its highlight is in the page, its card has only a box. */
  draft: string | null;
  cancelDraft: () => void;
  /** The toolbar's reading of the selection. */
  sel: Selection;
  zoom: string;
  setZoom: (zoom: string) => void;
  font: string;
  /** Runs a formatting command on the page (where the selection was). */
  cmd: (command: string, value?: string) => void;
  applyStyle: (tag: string) => void;
  setFont: (font: string) => void;
  addComment: () => void;
  openShare: () => void;
  /** Re-places the comment cards and cursors (after anything moves the text); the canvas fills it in. */
  layoutRef: RefObject<() => void>;
  menusHidden: boolean;
  toggleMenus: () => void;
}

export const DocsContext = createContext<DocsUI | null>(null);

export function useUI() {
  const ui = useContext(DocsContext);
  if (!ui) throw new Error("Google Docs parts must be inside <GoogleDocs>");
  return ui;
}

export function Avatar({ id, className, style, title }: { id: string; className?: string; style?: CSSProperties; title?: string }) {
  const p = useUI().docs.people[id];
  if (!p) return null;
  return p.photo ? (
    <img className={className} src={p.photo} alt={p.name} title={title} style={style} />
  ) : (
    <span className={`${className ?? ""} initials`} style={{ background: p.color, ...style }} role="img" aria-label={p.name} title={title}>
      {p.initials}
    </span>
  );
}
