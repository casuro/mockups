import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChatList, Rail } from "./ChatList";
import { WhatsAppContext, useUI, type Filter, type WhatsAppUI } from "./context";
import { Conversation } from "./Conversation";
import type { WhatsAppMessage } from "./types";
import type { WhatsAppApp } from "./use-whatsapp";
import "./whatsapp.css";

// WhatsApp Web, as in apps/whatsapp.html. Give it an app from useWhatsApp();
// it fills the box it is put in (give that box a height), whether that is
// the whole screen or one pane of it, and narrows to the phone layout (the
// list, then the chat over it) when the box is narrow.

export interface WhatsAppProps {
  whatsapp: WhatsAppApp;
  /** Draws a message's `custom` part: a location, a poll, anything the kit does not have. */
  renderCustom?: (message: WhatsAppMessage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function WhatsApp({ whatsapp, renderCustom, className, style }: WhatsAppProps) {
  const composer = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [convOpen, setConvOpen] = useState(false);
  const { state } = whatsapp;

  // Opening another chat puts the cursor in its composer
  // (not on first load: the page around the app decides where focus starts).
  const opened = useRef(state.open);
  useEffect(() => {
    if (opened.current === state.open) return;
    opened.current = state.open;
    composer.current?.focus({ preventScroll: true });
  }, [state.open]);

  const press = (label: string) => {
    whatsapp.toast(label);
    whatsapp.ui.emit({ type: "action", label, chat: state.open });
  };

  const ui: WhatsAppUI = { whatsapp, renderCustom, filter, setFilter, query, setQuery, convOpen, setConvOpen, composer, press };

  return (
    <WhatsAppContext.Provider value={ui}>
      <div className={`kit-whatsapp${className ? ` ${className}` : ""}`} style={style} data-theme={state.theme}>
        <div className={`app${convOpen ? " conv-open" : ""}`}>
          <Rail />
          <ChatList />
          <Conversation />
        </div>
        <Toast />
      </div>
    </WhatsAppContext.Provider>
  );
}

function Toast() {
  const { whatsapp } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!whatsapp.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 1800);
    return () => clearTimeout(t);
  }, [whatsapp.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {whatsapp.notice?.text ?? ""}
    </div>
  );
}
