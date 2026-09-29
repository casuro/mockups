import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { SupabaseApp } from "./use-supabase";

// What every part of <Supabase> reads: the app, the one popover and the one
// overlay (side panel, dialog, search) open at a time, the drawers of the
// phone layout, and the rows ticked in the grid.

export interface PopOptions {
  /** Line its right edge up with the anchor's. */
  align?: "end";
  /** Extra class on the popover: "fp" for the filter and sort popovers. */
  className?: string;
}

/** What covers the app: the row editor, the new-column form, a dialog, or the search palette. */
export type Overlay =
  | { kind: "row"; table: string; id: string | null }
  | { kind: "column"; table: string }
  | { kind: "delete"; table: string; ids: string[] }
  | { kind: "rls"; table: string }
  | { kind: "connect" }
  | { kind: "palette" };

export interface SupabaseUI {
  app: SupabaseApp;
  root: RefObject<HTMLDivElement | null>;
  /** Opens a popover under `anchor`; the same anchor again closes it. `content` is re-drawn on every render. */
  openPop: (anchor: HTMLElement, content: () => ReactNode, options?: PopOptions) => void;
  closePop: () => void;
  overlay: Overlay | null;
  setOverlay: (overlay: Overlay | null) => void;
  /** Phone layout: the navigation drawer and the table / query list drawer. */
  railOpen: boolean;
  setRailOpen: (open: boolean) => void;
  listOpen: boolean;
  setListOpen: (open: boolean) => void;
  /** Row ids ticked in the grid of the table on screen. */
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  /** A row to highlight once, after it was added or saved. */
  flash: string | null;
  setFlash: (id: string | null) => void;
  /** "⌘" on a Mac, "Ctrl" elsewhere. */
  mod: string;
}

export const SupabaseContext = createContext<SupabaseUI | null>(null);

export function useUI() {
  const ui = useContext(SupabaseContext);
  if (!ui) throw new Error("Supabase parts must be inside <Supabase>");
  return ui;
}

/** A menu row: an icon, a label with an optional line under it, and a tick when current. */
export function MenuItem({ icon, label, sub, on, onClick }: { icon?: ReactNode; label: string; sub?: string; on?: boolean; onClick: () => void }) {
  return (
    <button className={`mi${on ? " on" : ""}`} onClick={onClick}>
      {icon}
      <span className="mt">
        {label}
        {sub ? <small>{sub}</small> : null}
      </span>
      {on ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="i ok">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
    </button>
  );
}

/** The signed-in person's picture, or their initials. */
export function UserAvatar({ className = "av" }: { className?: string }) {
  const { user } = useUI().app.seed;
  return user.photo ? (
    <img className={className} src={user.photo} alt="" />
  ) : (
    <span className={`${className} av-i`} aria-hidden="true">
      {user.name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}
