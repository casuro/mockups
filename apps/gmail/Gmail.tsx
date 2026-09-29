import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Compose } from "./Compose";
import { GmailContext, useUI, type DialogKind, type GmailUI, type PopKind } from "./context";
import { AccountCard, AppsMenu, Header, QuickSettings } from "./Header";
import * as I from "./icons";
import { ListToolbar, MailList, SelectMenu, Tabs, SearchChips } from "./MailList";
import { LabelDialog, LabelMenu, Nav } from "./Nav";
import { SidePanel, SideStrip } from "./Side";
import { Thread } from "./Thread";
import type { GmailMessage } from "./types";
import { listFor, type GmailMailbox } from "./use-gmail";
import "./gmail.css";

// Gmail, as in apps/gmail.html. Give it a mailbox from useGmail(); it fills
// the box it is put in (give that box a height), whether that is the whole
// screen or one pane of it, and narrows to Gmail's tablet and mobile layouts
// when the box is narrow.

export interface GmailProps {
  gmail: GmailMailbox;
  /** Draws a message's `custom` part: a form, a receipt, anything the kit does not have. */
  renderCustom?: (message: GmailMessage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Gmail({ gmail, renderCustom, className, style }: GmailProps) {
  const root = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<GmailUI["pop"]>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [quickSettings, setQuickSettings] = useState(false);
  const { state, ui: act } = gmail;

  const openPop = useCallback((anchor: HTMLElement, p: PopKind) => setPop({ ...p, anchor }), []);
  const closePop = useCallback(() => setPop(null), []);

  // Gmail's shortcuts: c compose, / search, e archive, # delete, r reply, s star,
  // u back to the list, j/k older/newer, Esc closes the top-most thing.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const target = e.target as HTMLElement;
    const typing = !!target.closest?.("input, textarea, select, [contenteditable]");
    if (target !== document.body && !root.current?.contains(target)) return;
    const s = gmail.state;
    if (e.key === "Escape") {
      if (dialog) setDialog(null);
      else if (pop) setPop(null);
      else if (quickSettings) setQuickSettings(false);
      else if (s.compose?.mode === "full") act.editCompose({ mode: "normal" });
      else if (!typing && s.open && s.pane !== "right") act.close();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || dialog) return;
    const open = s.open;
    if (e.key === "c") {
      e.preventDefault();
      act.compose();
    } else if (e.key === "/") {
      e.preventDefault();
      root.current?.querySelector<HTMLInputElement>(".searchbox input")?.focus();
    } else if (!open) return;
    else if (e.key === "e") act.act("archive", [open]);
    else if (e.key === "#") act.act("delete", [open]);
    else if (e.key === "r") act.startReply(open);
    else if (e.key === "u") act.close();
    else if (e.key === "s") act.toggleStar(open);
    else if (e.key === "j" || e.key === "k") {
      const list = listFor(s, gmail.person);
      const next = list[list.findIndex((m) => m.id === open) + (e.key === "j" ? 1 : -1)];
      if (next) gmail.open(next.id);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: GmailUI = {
    gmail,
    root,
    renderCustom,
    pop,
    openPop,
    closePop,
    openDialog: setDialog,
    drawer,
    setDrawer,
    quickSettings,
    setQuickSettings,
  };

  return (
    <GmailContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-gmail${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        data-density={state.density}
        onMouseDown={(e) => {
          if (pop && !(e.target as HTMLElement).closest(".pop, [data-pop-anchor]")) setPop(null);
        }}
      >
        <div className="app">
          <Header />
          <div className="body">
            <Nav />
            <Main />
            <SidePanel />
            <SideStrip />
          </div>
        </div>
        <button className="fab" onClick={() => act.compose()}>
          <I.Pencil />
          Compose
        </button>
        {drawer ? <div className="scrim" onClick={() => setDrawer(false)} /> : null}
        <Compose />
        {quickSettings ? <QuickSettings /> : null}
        {pop ? (
          <Popover anchor={pop.anchor} align={pop.kind === "label" ? "left" : "right"} className={pop.kind === "apps" ? "apps-pop" : pop.kind === "account" ? "acct-pop" : ""}>
            {pop.kind === "select" ? <SelectMenu /> : pop.kind === "apps" ? <AppsMenu /> : pop.kind === "account" ? <AccountCard /> : <LabelMenu name={pop.name} />}
          </Popover>
        ) : null}
        {dialog ? <LabelDialog dialog={dialog} onClose={() => setDialog(null)} /> : null}
        <Snackbar />
      </div>
    </GmailContext.Provider>
  );
}

/** The white card: the list, a conversation, or both side by side. */
function Main() {
  const { gmail } = useUI();
  const { state } = gmail;
  const list = listFor(state, gmail.person);
  const open = state.open ? state.mails.find((m) => m.id === state.open) : undefined;
  if (state.pane === "right")
    return (
      <main className="main">
        <ListToolbar list={list} />
        <Tabs />
        <SearchChips />
        <div className="split">
          <MailList list={list} />
          <div className="pane">
            {open ? (
              <Thread mail={open} list={list} inPane />
            ) : (
              <div className="empty">
                <I.Unread style={{ width: 56, height: 56, color: "var(--line-2)" }} />
                <span>No conversations selected</span>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  if (open)
    return (
      <main className="main">
        <Thread mail={open} list={list} />
      </main>
    );
  return (
    <main className="main">
      <ListToolbar list={list} />
      <Tabs />
      <SearchChips />
      <MailList list={list} />
    </main>
  );
}

/** A popover under its button, kept inside the app's box. */
function Popover({ anchor: button, align, className, children }: { anchor: HTMLElement; align: "left" | "right"; className: string; children: ReactNode }) {
  const { root } = useUI();
  const el = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // Measured after the render that shows the menu, so a button that only shows on hover is in place.
  useLayoutEffect(() => {
    const box = root.current?.getBoundingClientRect();
    const me = el.current;
    if (!box || !me) return;
    const r = button.getBoundingClientRect();
    const anchor = { left: r.left - box.left, right: r.right - box.left, bottom: r.bottom - box.top };
    const w = me.offsetWidth;
    const h = me.offsetHeight;
    const left = align === "left" ? Math.min(anchor.left, box.width - w - 8) : Math.max(8, Math.min(anchor.right - w, box.width - w - 8));
    const top = align === "left" ? Math.min(anchor.bottom + 4, box.height - h - 8) : anchor.bottom + 6;
    setPos({ left, top });
  }, [button, align, root]);
  return (
    <div ref={el} className={`pop${className ? ` ${className}` : ""}`} style={pos ?? { left: 0, top: 0, visibility: "hidden" }}>
      {children}
    </div>
  );
}

function Snackbar() {
  const { gmail } = useUI();
  const [shown, setShown] = useState(false);
  const notice = gmail.notice;
  useEffect(() => {
    if (!notice) return setShown(false);
    setShown(true);
    const t = setTimeout(() => setShown(false), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  // The text stays while it fades out.
  return (
    <div className={`snackbar${shown ? " show" : ""}`} role="status" aria-live="polite">
      <span className="txt">{notice?.text ?? ""}</span>
      <span className="acts">
        {(notice?.actions ?? []).map((a) => (
          <button
            key={a.label}
            onClick={() => {
              setShown(false);
              a.run();
            }}
          >
            {a.label}
          </button>
        ))}
      </span>
      <button className="x" aria-label="Dismiss" onClick={() => setShown(false)}>
        <I.Close />
      </button>
    </div>
  );
}
