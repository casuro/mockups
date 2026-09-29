import { createContext, useContext, type ReactNode } from "react";
import type { TicketStatus, ZendeskMessage } from "./types";
import type { ZendeskWorkspace } from "./use-zendesk";

// What every part of <Zendesk> reads: the workspace, and the bits of screen
// state the parts share (the composer's mode, which menu is open, the
// mobile drawer and properties panel). Plus the small pieces drawn
// everywhere: avatars and status badges.

export type ComposerMode = "public" | "note";

export interface ZendeskUI {
  zendesk: ZendeskWorkspace;
  renderCustom?: (message: ZendeskMessage) => ReactNode;
  mode: ComposerMode;
  setMode: (mode: ComposerMode) => void;
  /** The composer's open menu. */
  menu: "macros" | "submit" | null;
  setMenu: (menu: "macros" | "submit" | null) => void;
  /** The phone layout's drawer with the rail and the views. */
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  /** The phone layout's "Ticket properties" section. */
  propsOpen: boolean;
  setPropsOpen: (open: boolean) => void;
}

export const ZendeskContext = createContext<ZendeskUI | null>(null);

export function useUI() {
  const ui = useContext(ZendeskContext);
  if (!ui) throw new Error("Zendesk parts must be inside <Zendesk>");
  return ui;
}

/** An agent's or a requester's picture, or their initials. `size` is "sm" (20px), "" (24px) or "lg" (40px). */
export function Avatar({ id, size = "", title }: { id: string; size?: "sm" | "lg" | ""; title?: string }) {
  const p = useUI().zendesk.people[id];
  if (!p) return null;
  const className = size ? `av ${size}` : "av";
  return p.photo ? (
    <span className={className} title={title}>
      <img src={p.photo} alt="" />
    </span>
  ) : (
    <span className={className} style={{ background: p.color }} title={title}>
      {p.initials}
    </span>
  );
}

/** The coloured status square ("O"), or the wide one with the word. */
export function Badge({ status, wide }: { status: TicketStatus; wide?: boolean }) {
  return (
    <span className={`badge ${status}${wide ? " wide" : ""}`} title={status}>
      {wide ? status : status[0].toUpperCase()}
    </span>
  );
}
