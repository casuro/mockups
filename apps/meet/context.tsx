import { createContext, useContext, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { MeetCall } from "./use-meet";

// What every part of <Meet> reads: the call, the screen's width class, and
// the bits of screen state the parts share (the open menu and dialog, the
// reaction bar, the whiteboard's strokes).

export type MenuItem =
  | "-"
  | { head: string }
  | { icon?: ReactNode; label: string; sub?: string; check?: boolean; run: () => void };

export interface MenuRequest {
  anchor: HTMLElement;
  items: MenuItem[];
  up?: boolean;
  align?: "left" | "center" | "right";
}

export type DialogKind = "layout" | "settings" | "report" | "add";

export interface Stroke {
  color: string;
  width: number;
  points: [number, number][];
}

export interface MeetUI {
  meet: MeetCall;
  root: RefObject<HTMLDivElement | null>;
  /** The kit's box is phone-sized (under 760px wide). */
  phone: boolean;
  /** Draws what `presenter` is presenting, at 1280 x 720. */
  renderScreen?: (presenter: string) => ReactNode;
  openMenu: (menu: MenuRequest) => void;
  closeMenu: () => void;
  dialog: DialogKind | null;
  settingsTab: "audio" | "video" | "general";
  openDialog: (kind: DialogKind | null, tab?: "audio" | "video" | "general") => void;
  reactOpen: boolean;
  setReactOpen: (open: boolean) => void;
  /** The whiteboard's drawing; kept here so it survives layout changes. */
  strokes: RefObject<Stroke[]>;
  toggleFullscreen: () => void;
}

export const MeetContext = createContext<MeetUI | null>(null);

export function useUI() {
  const ui = useContext(MeetContext);
  if (!ui) throw new Error("Meet parts must be inside <Meet>");
  return ui;
}

/** A round avatar: the photo, or the first letter on the person's color. */
export function Avatar({ id, size = 32, style }: { id: string; size?: number; style?: CSSProperties }) {
  const p = useUI().meet.people[id];
  if (!p) return null;
  return p.photo ? (
    <img className="av" src={p.photo} alt="" style={{ width: size, height: size, ...style }} />
  ) : (
    <span className="av" style={{ width: size, height: size, background: p.color, fontSize: Math.round(size * 0.42), ...style }}>
      {p.name[0]}
    </span>
  );
}

export function Stack({ ids, max = 4, size = 32 }: { ids: string[]; max?: number; size?: number }) {
  return (
    <span className="stack">
      {ids.slice(0, max).map((id) => <Avatar key={id} id={id} size={size} />)}
      {ids.length > max ? <span className="more" style={{ width: size, height: size }}>+{ids.length - max}</span> : null}
    </span>
  );
}

/** A Material switch. */
export function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return <button className={`switch${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={onChange} />;
}

export const clock = (at: number | Date) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
