import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { IntercomContext, useUI, type IntercomUI, type MenuItem } from "./context";
import { Conversation } from "./Conversation";
import { ConversationList } from "./ConversationList";
import { Details } from "./Details";
import * as I from "./icons";
import { Rail, Side } from "./Sidebar";
import type { IntercomMessage } from "./types";
import type { IntercomWorkspace } from "./use-intercom";
import "./intercom.css";

// Intercom's Inbox, as in apps/intercom.html. Give it an inbox from
// useIntercom(); it fills the box it is put in (give that box a height),
// whether that is the whole screen or one pane of it. When the box is
// narrow, the details panel becomes a sheet, then the sidebar a drawer and
// the list and the conversation take turns.

export interface IntercomProps {
  intercom: IntercomWorkspace;
  /** Draws a message's `custom` part: a form, an order, anything the kit does not have. */
  renderCustom?: (message: IntercomMessage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface OpenMenu {
  items: MenuItem[];
  heading?: string;
  top: number;
  left: number;
}

export function Intercom({ intercom, renderCustom, className, style }: IntercomProps) {
  const root = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [conv, showConv] = useState(false);
  const caretToEnd = useRef(false);
  const { state } = intercom;

  // Another conversation starts with an empty composer.
  const opened = useRef(state.current);
  useEffect(() => {
    if (opened.current === state.current) return;
    opened.current = state.current;
    setDraft("");
  }, [state.current]);

  const insert = useCallback((text: string) => {
    setDraft((d) => d + (d && !d.endsWith(" ") ? " " : "") + text);
    caretToEnd.current = true;
  }, []);
  useLayoutEffect(() => {
    const el = composer.current;
    if (!caretToEnd.current || !el) return;
    caretToEnd.current = false;
    el.focus();
    el.selectionStart = el.selectionEnd = el.value.length;
  }, [draft]);

  const openMenu = useCallback((anchor: HTMLElement, items: MenuItem[], heading?: string) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    const r = anchor.getBoundingClientRect();
    setMenu({ items, heading, top: r.bottom - box.top + 4, left: r.left - box.left });
  }, []);

  // Esc closes the top-most thing: the menu, then the details sheet or the sidebar drawer.
  const escape = useRef<() => void>(() => {});
  escape.current = () => {
    if (menu) setMenu(null);
    else if (sheet || drawer) {
      setSheet(false);
      setDrawer(false);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") escape.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: IntercomUI = { intercom, renderCustom, openMenu, composer, draft, setDraft, insert, showConv, setDrawer, setSheet };
  const appClass = ["app", drawer ? "drawer" : "", sheet ? "sheet" : "", conv ? "show-conv" : ""].filter(Boolean).join(" ");

  return (
    <IntercomContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-intercom${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={intercom.seed.theme ?? "light"}
        onMouseDown={(e) => {
          if (menu && !(e.target as HTMLElement).closest(".menu")) setMenu(null);
        }}
      >
        <div className={appClass}>
          <Rail />
          <Side />
          <ConversationList />
          <Conversation />
          <Details />
          <div
            className="scrim"
            onClick={() => {
              setDrawer(false);
              setSheet(false);
            }}
          />
        </div>
        {menu ? <Menu menu={menu} close={() => setMenu(null)} /> : null}
        <Toast />
      </div>
    </IntercomContext.Provider>
  );
}

function Menu({ menu, close }: { menu: OpenMenu; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(menu.left);
  // Kept inside the app's box, as the mockup keeps it inside the window.
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.offsetParent as HTMLElement | null;
    if (!el || !box) return;
    setLeft(Math.max(8, Math.min(menu.left, box.clientWidth - el.offsetWidth - 8)));
  }, [menu]);
  return (
    <div ref={ref} className="menu" role="menu" style={{ top: menu.top, left }}>
      {menu.heading ? <div className="h">{menu.heading}</div> : null}
      {menu.items.map((item) => (
        <button
          key={item.key}
          role="menuitem"
          onClick={() => {
            close();
            item.onPick();
          }}
        >
          {item.label}
          {item.checked ? <> <I.Check /></> : null}
        </button>
      ))}
    </div>
  );
}

function Toast() {
  const { intercom } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!intercom.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2200);
    return () => clearTimeout(t);
  }, [intercom.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {intercom.notice?.text ?? ""}
    </div>
  );
}
