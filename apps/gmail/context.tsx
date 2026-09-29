import { createContext, useContext, type ButtonHTMLAttributes, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { GmailMessage } from "./types";
import type { GmailMailbox } from "./use-gmail";

// What every part of <Gmail> reads: the mailbox, and the bits of screen
// state the parts share (which popover or dialog is up, the mobile drawer,
// the search box).

/** A popover under a button: the select menu, the Google apps grid, the account card, a label's menu. */
export type PopKind = { kind: "select" } | { kind: "apps" } | { kind: "account" } | { kind: "label"; name: string };

/** A dialog over everything: naming a label (new, nested, renamed) or removing one. */
export type DialogKind = { kind: "newLabel"; parent?: string } | { kind: "editLabel"; name: string } | { kind: "removeLabel"; name: string };

export interface GmailUI {
  gmail: GmailMailbox;
  root: RefObject<HTMLDivElement | null>;
  renderCustom?: (message: GmailMessage) => ReactNode;
  pop: (PopKind & { anchor: HTMLElement }) | null;
  openPop: (anchor: HTMLElement, pop: PopKind) => void;
  closePop: () => void;
  openDialog: (dialog: DialogKind) => void;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  quickSettings: boolean;
  setQuickSettings: (open: boolean) => void;
}

export const GmailContext = createContext<GmailUI | null>(null);

export function useUI() {
  const ui = useContext(GmailContext);
  if (!ui) throw new Error("Gmail parts must be inside <Gmail>");
  return ui;
}

/** A person's photo, or their initial on their color. `id` can be an address outside `people`. */
export function Avatar({ id, className = "av", style }: { id: string; className?: string; style?: CSSProperties }) {
  const p = useUI().gmail.person(id);
  return p.photo ? (
    <img className={className} src={p.photo} alt="" style={style} />
  ) : (
    <span className={className} style={{ background: p.color, ...style }}>{p.name.charAt(0).toUpperCase()}</span>
  );
}

/** An icon button with Gmail's hover tooltip. */
export function IconButton({ tip, label, className = "icon-btn", children, ...rest }: { tip?: string; label?: string; className?: string; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button className={className} data-tip={tip} aria-label={label ?? tip} {...rest}>
      {children}
    </button>
  );
}
