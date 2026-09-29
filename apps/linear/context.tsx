import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { LinearActivity } from "./types";
import type { LinearWorkspace } from "./use-linear";

// What every part of <Linear> reads: the workspace, and the bits of screen
// state the parts share (the property menu, the command menu, the drawer).

export type MenuKind = "status" | "priority" | "assignee";

export interface LinearUI {
  linear: LinearWorkspace;
  root: RefObject<HTMLDivElement | null>;
  renderCustom?: (entry: LinearActivity) => ReactNode;
  /** Opens a property menu under `anchor`, or closes it when it is already open there. */
  openMenu: (anchor: HTMLElement, kind: MenuKind, id: string) => void;
  openCommand: () => void;
  toggleDrawer: () => void;
}

export const LinearContext = createContext<LinearUI | null>(null);

export function useUI() {
  const ui = useContext(LinearContext);
  if (!ui) throw new Error("Linear parts must be inside <Linear>");
  return ui;
}

/** A person's round face, or the dashed ring of "Unassigned" when `id` is empty. */
export function Avatar({ id, size = 20 }: { id: string | null | undefined; size?: number }) {
  const p = useUI().linear.people[id ?? ""];
  const box = { width: size, height: size };
  if (!p) return <span className="av none" style={box} title="Unassigned" />;
  return p.photo ? (
    <img className="av" src={p.photo} alt="" title={p.name} style={box} />
  ) : (
    <span className="av" style={{ ...box, background: p.color }} title={p.name}>
      {p.initials}
    </span>
  );
}
