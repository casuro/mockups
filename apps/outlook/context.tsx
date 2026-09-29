import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { OutlookMessage } from "./types";
import type { OutlookMailbox } from "./use-outlook";

// What every part of <Outlook> reads: the mailbox, the size the app is laid
// out at, the menu host, and the composer's editor (the ribbon's Message tab
// formats it too).

export type MenuItem =
  /** `run` gets where the menu was, to open a follow-up menu in its place. */
  | { label: string; icon?: ReactNode; run: (from: DOMRect) => void; checked?: boolean; hint?: ReactNode; disabled?: boolean }
  | { caption: string }
  | "-";

export interface MenuOptions {
  align?: "left" | "right";
  className?: string;
}

/** Where a menu opens: under an element, or at a point (a right-click). */
export type MenuAnchor = HTMLElement | { x: number; y: number };

export interface OutlookUI {
  outlook: OutlookMailbox;
  root: RefObject<HTMLDivElement | null>;
  /** Under 1200px: the reading pane covers the list. */
  narrow: boolean;
  /** Under 760px: the phone layout. */
  phone: boolean;
  menu: (anchor: MenuAnchor, content: MenuItem[] | ReactNode, options?: MenuOptions) => void;
  closeMenu: () => void;
  /** The element a menu is open under, to show it pressed. */
  menuAnchor: HTMLElement | null;
  renderCustom?: (message: OutlookMessage) => ReactNode;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  /** The folder pane shows the new folder's name field. */
  newFolder: boolean;
  setNewFolder: (open: boolean) => void;
  settings: boolean;
  setSettings: (open: boolean) => void;
  /** The composer's body. */
  editor: RefObject<HTMLDivElement | null>;
  /** Saves the draft a moment after the last change. */
  scheduleSave: () => void;
  /** The checked conversations, or the open one. */
  targets: string[];
}

export const OutlookContext = createContext<OutlookUI | null>(null);

export function useUI() {
  const ui = useContext(OutlookContext);
  if (!ui) throw new Error("Outlook parts must be inside <Outlook>");
  return ui;
}

// Fluent's "colorful" avatar pairs: background and text, light then dark.
const AVATAR = [
  ["#dce6f7", "#0f548c", "#0e3a5e", "#b4d6fa"], ["#f9d9d9", "#9c2a2a", "#4a1f1f", "#f1bbbc"], ["#fdeecf", "#8a5a00", "#4a3a17", "#fbd97e"],
  ["#e0f2e0", "#0b6a0b", "#1b3a1b", "#a7e3a5"], ["#f7e1d4", "#8a3707", "#472a1a", "#f9c2a2"], ["#e6e6e6", "#424242", "#3d3d3d", "#d6d6d6"],
  ["#ece0f8", "#5c2e91", "#34224a", "#d8c7ef"], ["#d4f0f0", "#006666", "#123d3d", "#9fe0e0"],
];

/** A person's picture, or their initials on their color. `size` is "s20", "s24", "s40" or "s72" (32px otherwise). */
export function Avatar({ id, size = "" }: { id: string; size?: string }) {
  const { outlook } = useUI();
  const p = outlook.person(id);
  const cls = `av${size ? ` ${size}` : ""}`;
  if (p.photo) return <img className={cls} src={p.photo} alt={p.name} />;
  const c = AVATAR[((p.color % 8) + 8) % 8];
  const dark = outlook.state.theme === "dark";
  return (
    <span className={cls} role="img" aria-label={p.name} style={{ background: dark ? c[2] : c[0], color: dark ? c[3] : c[1] }}>
      {p.initials}
    </span>
  );
}
