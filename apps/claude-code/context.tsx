import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { Item, SessionState } from "./types";
import type { ClaudeCodeApp } from "./use-claude-code";

// What every part of <ClaudeCode> reads: the app, the slots the page fills
// in, and the pop-ups the parts share (menus, dialogs, tooltips).

export type MenuEntry =
  | { header: ReactNode }
  | { sep: true }
  | {
      label: string;
      desc?: string;
      icon?: ReactNode;
      /** Space-separated keys: "⌘ ,". */
      kbd?: string;
      /** A check mark (true) or the room for one (false). */
      checked?: boolean;
      /** A switch on the right, on or off. */
      toggle?: boolean;
      danger?: boolean;
      run: () => void;
    };

export interface MenuOptions {
  width?: number;
  above?: boolean;
  alignRight?: boolean;
}

export interface ClaudeCodeUI {
  app: ClaudeCodeApp;
  root: RefObject<HTMLDivElement | null>;
  /** The box is phone-sized (under 760px): one pane at a time, the sidebar as a drawer. */
  narrow: () => boolean;
  openMenu: (anchor: HTMLElement, entries: MenuEntry[], options?: MenuOptions) => void;
  /** The anchor of the open menu, to draw it pressed. */
  menuAnchor: HTMLElement | null;
  openModal: (content: ReactNode, size?: "sm") => void;
  closeModal: () => void;
  setDrawer: (open: boolean) => void;
  focusSearch: () => void;
  composer: RefObject<HTMLTextAreaElement | null>;
  renderItem?: (item: Item, session: SessionState) => ReactNode;
  renderPreview?: (session: SessionState) => ReactNode;
  renderTerminal?: (session: SessionState) => ReactNode;
}

export const ClaudeCodeContext = createContext<ClaudeCodeUI | null>(null);

export function useUI() {
  const ui = useContext(ClaudeCodeContext);
  if (!ui) throw new Error("ClaudeCode parts must be inside <ClaudeCode>");
  return ui;
}

/** A person's picture, or their initial on a plain disc. */
export function Avatar({ photo, name, size }: { photo?: string; name: string; size: number }) {
  const style = { width: size, height: size };
  return photo ? (
    <img className="avatar" src={photo} width={size} height={size} alt="" style={style} />
  ) : (
    <span className="avatar initials" role="img" aria-label={name} style={{ ...style, fontSize: Math.round(size * 0.42) }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
