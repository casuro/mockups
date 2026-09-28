import { createContext, useContext, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { FormatContext } from "./format";
import type { SlackMessage } from "./types";
import type { SlackWorkspace } from "./use-slack";

// What every part of <Slack> reads: the workspace, the formatter's hooks,
// and the bits of screen state the parts share (the huddle window, the
// emoji picker, which messages have been drawn before).

export type PickerTarget = { kind: "message"; id: string } | { kind: "composer" } | { kind: "huddle" };

export interface SlackUI {
  slack: SlackWorkspace;
  fmt: FormatContext;
  root: RefObject<HTMLDivElement | null>;
  renderCustom?: (message: SlackMessage) => ReactNode;
  openPicker: (anchor: HTMLElement, target: PickerTarget) => void;
  huddleWindow: boolean;
  setHuddleWindow: (open: boolean) => void;
  /** A reaction that just changed, to pop once: "messageId:emoji". */
  popped: string | null;
  react: (id: string, emoji: string) => void;
  /** Messages drawn before: only new ones slide in. */
  seen: Set<string>;
  /** Charts drawn before: only a chart's first appearance grows. */
  grown: Set<string>;
  composer: RefObject<HTMLTextAreaElement | null>;
  threadComposer: RefObject<HTMLTextAreaElement | null>;
  /** The main composer's text. */
  draft: string;
  setDraft: (next: string | ((draft: string) => string)) => void;
  toggleSide: () => void;
}

export const SlackContext = createContext<SlackUI | null>(null);

export function useUI() {
  const ui = useContext(SlackContext);
  if (!ui) throw new Error("Slack parts must be inside <Slack>");
  return ui;
}

export function Avatar({ id, className = "av", style }: { id: string; className?: string; style?: CSSProperties }) {
  const p = useUI().slack.people[id];
  if (!p) return null;
  return p.photo ? (
    <img className={className} src={p.photo} alt={p.name} style={style} />
  ) : (
    <div className={className} style={{ background: p.color, ...style }} role="img" aria-label={p.name}>
      {p.initials}
    </div>
  );
}
