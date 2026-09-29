import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useUI, ZendeskContext, type ComposerMode, type ZendeskUI } from "./context";
import { Rail, TopBar, ViewsPanel } from "./Nav";
import { TicketView } from "./Ticket";
import { TicketList } from "./TicketList";
import type { ZendeskMessage } from "./types";
import type { ZendeskWorkspace } from "./use-zendesk";
import "./zendesk.css";

// Zendesk's Agent Workspace, as in apps/zendesk.html. Give it a workspace
// from useZendesk(); it fills the box it is put in (give that box a
// height), whether that is the whole screen or one pane of it, and narrows
// to the phone layout when the box is narrow.

export interface ZendeskProps {
  zendesk: ZendeskWorkspace;
  /** Draws a message's `custom` part: a form, an order, anything the kit does not have. */
  renderCustom?: (message: ZendeskMessage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Zendesk({ zendesk, renderCustom, className, style }: ZendeskProps) {
  const [mode, setMode] = useState<ComposerMode>("public");
  const [menu, setMenu] = useState<ZendeskUI["menu"]>(null);
  const [drawer, setDrawer] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const { state, active } = zendesk;

  // Opening a ticket closes the menus and the drawer, and folds its properties on a phone.
  useEffect(() => {
    setMenu(null);
    setDrawer(false);
    setPropsOpen(false);
  }, [state.active]);

  // Esc closes an open menu or the drawer.
  const escape = useRef(() => {});
  escape.current = () => {
    setMenu(null);
    setDrawer(false);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && escape.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: ZendeskUI = { zendesk, renderCustom, mode, setMode, menu, setMenu, drawer, setDrawer, propsOpen, setPropsOpen };
  const appClass = ["app", active ? "in-ticket" : "", drawer ? "drawer-open" : ""].filter(Boolean).join(" ");

  return (
    <ZendeskContext.Provider value={ui}>
      <div
        className={`kit-zendesk${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseDown={(e) => {
          if (menu && !(e.target as HTMLElement).closest(".split")) setMenu(null);
        }}
      >
        <div className={appClass}>
          <Rail />
          <div className="main">
            <TopBar />
            <div className="body">
              <ViewsPanel />
              <main className="content">{active ? <TicketView key={active.id} ticket={active} /> : <TicketList />}</main>
            </div>
          </div>
          {drawer ? <div className="scrim" onClick={() => setDrawer(false)} /> : null}
        </div>
        <Toast />
      </div>
    </ZendeskContext.Provider>
  );
}

function Toast() {
  const { zendesk } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!zendesk.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2200);
    return () => clearTimeout(t);
  }, [zendesk.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {zendesk.notice?.text ?? ""}
    </div>
  );
}
