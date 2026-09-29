import { createContext, useContext, type ReactNode, type RefObject } from "react";
import * as I from "./icons";
import type { WhatsAppMessage } from "./types";
import type { WhatsAppApp } from "./use-whatsapp";

// What every part of <WhatsApp> reads: the app, and the bits of screen state
// the parts share (the list filter, the phone layout's open conversation).

export type Filter = "All" | "Unread" | "Favorites" | "Groups";

export interface WhatsAppUI {
  whatsapp: WhatsAppApp;
  renderCustom?: (message: WhatsAppMessage) => ReactNode;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  query: string;
  setQuery: (query: string) => void;
  /** On a phone, the conversation covers the list once a chat is opened. */
  convOpen: boolean;
  setConvOpen: (open: boolean) => void;
  composer: RefObject<HTMLInputElement | null>;
  /** A button that only shows a notice in the mockup: toasts its label and reports it. */
  press: (label: string) => void;
}

export const WhatsAppContext = createContext<WhatsAppUI | null>(null);

export function useUI() {
  const ui = useContext(WhatsAppContext);
  if (!ui) throw new Error("WhatsApp parts must be inside <WhatsApp>");
  return ui;
}

/** A person's photo (initials on their color without one), or a group's picture or icon. */
export function Avatar({ person, chat, className = "av" }: { person?: string; chat?: string; className?: string }) {
  const { whatsapp } = useUI();
  if (chat) {
    const info = whatsapp.chat(chat);
    if (info.group)
      return info.photo ? <img className={className} src={info.photo} alt="" /> : <div className={`${className} grp`}><I.Group /></div>;
    person = info.with;
  }
  const p = person ? whatsapp.people[person] : undefined;
  if (!p) return <div className={className} />;
  return p.photo ? (
    <img className={className} src={p.photo} alt="" />
  ) : (
    <div className={`${className} ini`} style={{ background: p.color }}>{p.initials}</div>
  );
}
