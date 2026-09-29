import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { clock, type FormatContext } from "./format";
import type { TeamsMeetingState, TeamsMessage } from "./types";
import type { Chat, TeamsApp } from "./use-teams";

// What every part of <Teams> reads: the app, the formatter's hooks, and the
// bits of screen state the parts share (the emoji picker, the meeting
// window, which messages have been drawn before), plus the small pieces
// drawn everywhere: avatars with presence, and a meeting's running clock.

export type PickerTarget = { kind: "message"; id: string } | { kind: "composer" };

export interface TeamsUI {
  teams: TeamsApp;
  fmt: FormatContext;
  root: RefObject<HTMLDivElement | null>;
  renderCustom?: (message: TeamsMessage) => ReactNode;
  renderScreen?: (meeting: TeamsMeetingState) => ReactNode;
  openPicker: (anchor: HTMLElement, target: PickerTarget) => void;
  /** A reaction that just changed, to pop once: "messageId:emoji". */
  popped: string | null;
  react: (id: string, emoji: string) => void;
  /** Messages drawn before: only new ones slide in. */
  seen: Set<string>;
  composer: RefObject<HTMLTextAreaElement | null>;
  /** The composer's text. */
  draft: string;
  setDraft: (next: string | ((draft: string) => string)) => void;
  /** The meeting fills the app, or sits in the small window in the corner. */
  callView: "full" | "mini";
  setCallView: (view: "full" | "mini") => void;
  /** The meeting's side panel. */
  panel: "chat" | "people" | null;
  setPanel: (panel: "chat" | "people" | null) => void;
  /** Show the pre-join screen for a running meeting (or bring back the one you are in). */
  openPrejoin: (id: string) => void;
  /** The meeting's reactions menu, under its React button. */
  reactPop: { left: number; top: number } | null;
  setReactPop: (at: { left: number; top: number } | null) => void;
}

export const TeamsContext = createContext<TeamsUI | null>(null);

export function useUI() {
  const ui = useContext(TeamsContext);
  if (!ui) throw new Error("Teams parts must be inside <Teams>");
  return ui;
}

export function Avatar({ id, className = "av", style }: { id: string; className?: string; style?: CSSProperties }) {
  const p = useUI().teams.people[id];
  if (!p) return null;
  return p.photo ? (
    <img className={className} src={p.photo} alt={p.name} style={style} />
  ) : (
    <div className={className} style={{ background: p.color, ...style }} role="img" aria-label={p.name}>
      {p.initials}
    </div>
  );
}

export function PresenceDot({ id, style }: { id: string; style?: CSSProperties }) {
  const p = useUI().teams.people[id];
  if (!p) return null;
  return <span className={`pres ${p.presence}`} title={p.note} style={style} />;
}

/** An avatar with the presence dot on its corner. */
export function AvatarPresence({ id }: { id: string }) {
  return (
    <span className="avw">
      <Avatar id={id} />
      <PresenceDot id={id} />
    </span>
  );
}

/** A chat's picture: the person with their presence, or two faces for a group. */
export function ChatAvatar({ chat }: { chat: Chat }) {
  if (chat.kind === "dm" && chat.with) return <AvatarPresence id={chat.with} />;
  return (
    <span className="group-av">
      <Avatar id={chat.others[0]} />
      <Avatar id={chat.others[1] ?? chat.others[0]} />
    </span>
  );
}

/** Time since `from`, ticking every second: "14:23". */
export function Elapsed({ from }: { from: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{clock(now - from)}</>;
}
