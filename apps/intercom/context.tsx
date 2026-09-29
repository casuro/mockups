import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { IntercomMessage } from "./types";
import type { IntercomWorkspace, Person } from "./use-intercom";

// What every part of <Intercom> reads: the inbox, the composer's draft, the
// dropdown menu, and which mobile panel is showing.

export interface MenuItem {
  key: string;
  label: ReactNode;
  /** A check mark on the right. */
  checked?: boolean;
  onPick: () => void;
}

export interface IntercomUI {
  intercom: IntercomWorkspace;
  renderCustom?: (message: IntercomMessage) => ReactNode;
  /** A dropdown under `anchor`, with an optional small heading. */
  openMenu: (anchor: HTMLElement, items: MenuItem[], heading?: string) => void;
  composer: RefObject<HTMLTextAreaElement | null>;
  /** The composer's text. */
  draft: string;
  setDraft: (next: string | ((draft: string) => string)) => void;
  /** Adds text at the end of the draft and puts the cursor after it. */
  insert: (text: string) => void;
  /** Narrow layout: the conversation is on screen instead of the list. */
  showConv: (show: boolean) => void;
  /** Narrow layout: the sidebar drawer and the details sheet. */
  setDrawer: (open: boolean) => void;
  setSheet: (open: boolean) => void;
}

export const IntercomContext = createContext<IntercomUI | null>(null);

export function useUI() {
  const ui = useContext(IntercomContext);
  if (!ui) throw new Error("Intercom parts must be inside <Intercom>");
  return ui;
}

/** A teammate's or a customer's picture, or their initials on a color. */
export function Avatar({ person, size }: { person: Person | undefined; size?: "sm" | "lg" }) {
  if (!person) return null;
  const className = `av${size ? ` ${size}` : ""}`;
  return person.photo ? (
    <img className={className} src={person.photo} alt={person.name} />
  ) : (
    <span className={className} style={{ background: person.color }} role="img" aria-label={person.name}>
      {person.initials}
    </span>
  );
}
