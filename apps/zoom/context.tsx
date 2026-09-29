import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import * as I from "./icons";
import type { ZoomShare } from "./types";
import type { ZoomMeetingApi } from "./use-zoom";

// What every part of <Zoom> reads: the meeting, the kit's box, and the bits
// of screen state the parts share (the open menu and dialog, the chat draft,
// the annotation pen). Plus the small pieces several parts draw.

export type Modal =
  | { type: "confirm"; title: string; body: string; ok: string; cancel?: string; danger?: boolean; checkbox?: string; onOk: (checked: boolean) => void }
  | { type: "share" }
  | { type: "invite" };

export interface MenuOptions {
  place?: "top" | "bottom";
  align?: "start" | "center" | "end";
}

export type AnnoTool = "mouse" | "draw" | "stamp" | "eraser";
export type Stroke = { stamp: string; x: number; y: number } | { color: string; width: number; points: { x: number; y: number }[] };

export interface ZoomUI {
  zoom: ZoomMeetingApi;
  root: RefObject<HTMLDivElement | null>;
  /** The kit is phone-width (under 760px). */
  narrow: boolean;
  renderScreen?: (share: ZoomShare) => ReactNode;
  /** Opens a popover under or over `anchor`; the same key again closes it. `render` is called on every render, so it stays live. */
  openMenu: (anchor: HTMLElement, key: string, render: () => ReactNode, options?: MenuOptions) => void;
  closeMenu: () => void;
  menuKey: string | null;
  openModal: (modal: Modal) => void;
  closeModal: () => void;
  draft: string;
  setDraft: (draft: string) => void;
  /** Device picks and background blur: the caret menus next to Mute and Stop Video. */
  prefs: { mic: number; speaker: number; camera: number; blur: boolean };
  setPrefs: (patch: Partial<ZoomUI["prefs"]>) => void;
  anno: { tool: AnnoTool; color: string };
  setAnno: (patch: Partial<ZoomUI["anno"]>) => void;
  /** Annotation strokes by surface ("me", "view:<id>", "wb"), and a counter bumped when they change. */
  strokes: RefObject<Record<string, Stroke[]>>;
  inked: number;
  bumpInk: () => void;
  /** The toolbar buttons that did not fit, listed under More. */
  overflow: RefObject<Set<string>>;
  fullscreen: boolean;
  toggleFullscreen: () => void;
}

export const ZoomContext = createContext<ZoomUI | null>(null);

export function useUI() {
  const ui = useContext(ZoomContext);
  if (!ui) throw new Error("Zoom parts must be inside <Zoom>");
  return ui;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "12:34" or "1:02:03". */
export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return `${h ? `${h}:` : ""}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
};
/** "9:41 AM". */
export const timeOf = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** The meeting clock, ticking every second. */
export function Elapsed({ from }: { from: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{clock(now - from)}</>;
}

/** An element's size, kept current. */
export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** A person's picture, or their initials on their color. */
export function Avatar({ id, className = "av" }: { id: string; className?: string }) {
  const p = useUI().zoom.people[id];
  if (!p) return null;
  return p.photo ? (
    <img className={className} src={p.photo} alt="" />
  ) : (
    <span className={className} style={{ background: p.color, color: "#fff", display: "inline-grid", placeItems: "center", fontSize: 12, fontWeight: 700 }} aria-hidden="true">
      {p.initials}
    </span>
  );
}

/** Who has a tile: the self view and non-video people can be hidden from the View menu. */
export function visibleIds(zoom: ZoomMeetingApi) {
  const s = zoom.state;
  return s.people.filter((id) => !(id === zoom.me && s.hideSelf) && !(s.hideNonVideo && id !== zoom.me && !s.video.includes(id)));
}

/** The big tile in speaker view: the spotlight, the pin, whoever is talking, whoever talked last. */
export function focusId(zoom: ZoomMeetingApi, vis: string[]) {
  const s = zoom.state;
  if (s.spotlight && vis.includes(s.spotlight)) return s.spotlight;
  if (s.pinned && vis.includes(s.pinned)) return s.pinned;
  const now = zoom.speakingNow.find((id) => id !== zoom.me && vis.includes(id) && !s.muted.includes(id));
  if (now) return now;
  const last = zoom.recentSpeakers.current.find((id) => id !== zoom.me && vis.includes(id));
  return last ?? vis.find((v) => v !== zoom.me) ?? zoom.me;
}

// ---------- Menu pieces ----------

export function MI({ label, onClick, ck, icon, kbd, danger, disabled }: {
  label: ReactNode;
  onClick: () => void;
  /** A check column: true shows the check. */
  ck?: boolean;
  icon?: ReactNode;
  kbd?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { closeMenu } = useUI();
  return (
    <button className={`mi${danger ? " danger" : ""}`} disabled={disabled} onClick={() => { closeMenu(); onClick(); }}>
      {ck !== undefined ? <span className="ck">{ck ? <I.Check /> : null}</span> : icon}
      <span className="l">{label}</span>
      {kbd ? <kbd>{kbd}</kbd> : null}
    </button>
  );
}
export const Sep = () => <div className="msep" />;
export const MH = ({ children }: { children: ReactNode }) => <div className="mh">{children}</div>;

export const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const ALT = MAC ? "⌥" : "Alt+";
