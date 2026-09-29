import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar, OutlookContext, useUI, type MenuAnchor, type MenuItem, type MenuOptions, type OutlookUI } from "./context";
import { Folders } from "./Folders";
import { bodyText } from "./format";
import { Ribbon, shortcutsDialog, TopBar } from "./Header";
import * as I from "./icons";
import { MessageList } from "./MessageList";
import { ReadingPane } from "./ReadingPane";
import type { OutlookMessage } from "./types";
import { lastOf, listOf, type OutlookMailbox } from "./use-outlook";
import "./outlook.css";

// Outlook mail, as in apps/outlook.html. Give it a mailbox from
// useOutlook(); it fills the box it is put in (give that box a height),
// whether that is the whole screen or one pane of it, and narrows to
// Outlook's tablet and phone layouts when the box is narrow.

export interface OutlookProps {
  outlook: OutlookMailbox;
  /** Draws a message's `custom` part under its body: a form, an approval, anything the kit does not have. */
  renderCustom?: (message: OutlookMessage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

type Menu = { anchor: MenuAnchor; content: MenuItem[] | ReactNode; options: MenuOptions };

export function Outlook({ outlook, renderCustom, className, style }: OutlookProps) {
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1440);
  const [menuState, setMenu] = useState<Menu | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [settings, setSettings] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { state } = outlook;
  const narrow = width < 1200;
  const phone = width < 760;

  // Laid out by its own width, not the window's.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  useEffect(() => outlook.ui.setNarrow(narrow), [narrow, outlook.ui]);
  useEffect(() => {
    if (!phone) setDrawer(false);
  }, [phone]);
  useEffect(() => () => void (saveTimer.current && clearTimeout(saveTimer.current)), []);

  const menu = useCallback((anchor: MenuAnchor, content: MenuItem[] | ReactNode, options: MenuOptions = {}) => {
    setMenu((m) => (m && anchor instanceof HTMLElement && m.anchor === anchor ? null : { anchor, content, options }));
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => outlook.ui.autosave(), 900);
  }, [outlook.ui]);

  const targets = state.selected.length ? state.selected : state.open ? [state.open] : [];

  const ui: OutlookUI = {
    outlook, root, narrow, phone, menu, closeMenu,
    menuAnchor: menuState?.anchor instanceof HTMLElement ? menuState.anchor : null,
    renderCustom, drawer, setDrawer, newFolder, setNewFolder, settings, setSettings, editor, scheduleSave, targets,
  };

  // Outlook's shortcuts, while focus is in the app (or nowhere in particular).
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const t = e.target as HTMLElement;
    if (!(root.current?.contains(t) || t === document.body)) return;
    const typing = !!t.closest("input, textarea, select, [contenteditable=true]");
    const s = outlook.state;
    if (e.key === "Escape") {
      if (outlook.dialog) return;
      if (menuState) return closeMenu();
      if (settings) return setSettings(false);
      if (drawer) return setDrawer(false);
      if (s.compose) return outlook.ui.closeCompose();
      if (s.selectMode || s.selected.length) return outlook.ui.setSelection([], false);
      if (s.open && (narrow || s.pane === "off")) return outlook.ui.closeConversation();
      if (s.query) return outlook.ui.search("");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();
      return outlook.ui.undo();
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || outlook.dialog) return;
    const cur = s.open;
    const k = e.key;
    if (k === "n" || k === "N") {
      e.preventDefault();
      outlook.ui.startCompose();
    } else if (k === "/") {
      e.preventDefault();
      search.current?.focus();
    } else if (k === "?") {
      e.preventDefault();
      shortcutsDialog(outlook);
    } else if (k === "R" && e.shiftKey && cur) {
      e.preventDefault();
      outlook.ui.respond("replyAll", cur);
    } else if (k === "F" && e.shiftKey && cur) {
      e.preventDefault();
      outlook.ui.respond("forward", cur);
    } else if (k === "r" && cur) {
      e.preventDefault();
      outlook.ui.respond("reply", cur);
    } else if ((k === "Delete" || k === "Backspace") && targets.length) {
      e.preventDefault();
      outlook.ui.remove(targets);
    } else if (k === "e" && targets.length) outlook.ui.archive(targets);
    else if (k === "q" && targets.length) outlook.ui.markRead(targets, true);
    else if (k === "u" && targets.length) outlook.ui.markRead(targets, false);
    else if (k === "Insert" && targets.length) outlook.ui.flag(targets);
    else if (["ArrowDown", "ArrowUp", "j", "k"].includes(k)) {
      const list = listOf(s, outlook.people, outlook.me);
      const order = s.query ? list : [...list.filter((c) => c.pinned), ...list.filter((c) => !c.pinned)];
      if (!order.length) return;
      e.preventDefault();
      const i = order.findIndex((c) => c.id === cur);
      const next = order[i < 0 ? 0 : Math.max(0, Math.min(order.length - 1, i + (k === "ArrowDown" || k === "j" ? 1 : -1)))];
      if (next && next.id !== cur) {
        outlook.ui.openConversation(next.id);
        requestAnimationFrame(() => {
          const row = root.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(next.id)}"]`);
          row?.scrollIntoView({ block: "nearest" });
          row?.focus({ preventScroll: true });
        });
      }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const c = state.compose;
  const hasOpen = !!(c && (c.kind === "new" || c.conversation === state.open)) || !!(state.open && !state.selected.length);

  return (
    <OutlookContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-outlook${state.density !== "roomy" ? ` ${state.density}` : ""}${hasOpen ? " reading-open" : ""}${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          const anchor = menuState?.anchor;
          if (menuState && !t.closest(".pop") && !(anchor instanceof HTMLElement && anchor.contains(t))) closeMenu();
          if (settings && !t.closest(".flyout, [data-settings]")) setSettings(false);
        }}
      >
        <div className="app">
          <TopBar search={search} />
          <div className="shell">
            <div className="workspace">
              <Ribbon />
              <div className={`content${state.navHidden ? " nav-hidden" : ""}`}>
                <Folders />
                <div className={`mailarea pane-${state.pane}${hasOpen ? " has-open" : ""}`}>
                  <MessageList />
                  <ReadingPane />
                </div>
              </div>
            </div>
          </div>
        </div>
        <button className="fab" onClick={() => outlook.ui.startCompose()}><I.NewMail />New mail</button>
        {drawer ? <div className="scrim" onClick={() => setDrawer(false)} /> : null}
        {settings ? <Settings /> : null}
        {menuState ? <Popover menu={menuState} /> : null}
        <Notification />
        <Toast />
        {outlook.dialog ? <Dialog key={outlook.dialog.title} /> : null}
      </div>
    </OutlookContext.Provider>
  );
}

function Popover({ menu }: { menu: Menu }) {
  const { root, closeMenu } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const { anchor, content, options } = menu;

  // Under its anchor (or at the point), kept inside the app.
  useLayoutEffect(() => {
    const box = root.current?.getBoundingClientRect();
    const p = ref.current;
    if (!box || !p) return;
    const r = anchor instanceof HTMLElement ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
    let left = (options.align === "right" ? r.right - p.offsetWidth : r.left) - box.left;
    left = Math.max(8, Math.min(left, box.width - p.offsetWidth - 8));
    let top = r.bottom + 4 - box.top;
    if (top + p.offsetHeight > box.height - 8) top = Math.max(8, r.top - box.top - p.offsetHeight - 4);
    setPos({ left, top });
  }, [anchor, content, options.align, root]);

  useEffect(() => {
    if (anchor instanceof HTMLElement) {
      anchor.setAttribute("aria-expanded", "true");
      return () => anchor.removeAttribute("aria-expanded");
    }
  }, [anchor]);

  const body = Array.isArray(content)
    ? (content as MenuItem[]).map((item, i) => {
        if (item === "-") return <div key={i} className="mdiv" />;
        if ("caption" in item) return <div key={i} className="mcap">{item.caption}</div>;
        return (
          <button
            key={i}
            className={`mi${item.disabled ? " dis" : ""}`}
            role="menuitem"
            onClick={() => {
              const from = ref.current!.getBoundingClientRect();
              closeMenu();
              item.run(from);
            }}
          >
            {item.icon ?? <span style={{ width: 20, flex: "none" }} />}
            <span>{item.label}</span>
            {item.checked ? <span className="ck"><I.Check /></span> : item.hint ? <span className="sh">{item.hint}</span> : null}
          </button>
        );
      })
    : content;

  return (
    <div ref={ref} className={`pop${options.className ? ` ${options.className}` : ""}`} role="menu" style={pos ?? { left: 0, top: 0, visibility: "hidden" }}>
      {body}
    </div>
  );
}

function Settings() {
  const { outlook, setSettings } = useUI();
  const { state } = outlook;
  const dark = state.theme === "dark";
  const set = outlook.ui.setView;
  const radio = (on: boolean, label: string, run: () => void, sub?: string) => (
    <button key={label} className={`radio${on ? " on" : ""}`} role="radio" aria-checked={on} onClick={run}>
      <span className="dot" />
      <span>{label}{sub ? <small>{sub}</small> : null}</span>
    </button>
  );
  return (
    <div className="flyout" role="dialog" aria-label="Settings">
      <div className="fh"><b>Settings</b><button className="ib" aria-label="Close settings" onClick={() => setSettings(false)}><I.Close /></button></div>
      <div className="fb">
        <h4>Theme</h4>
        <div className="themes">
          <button className={`theme-card${dark ? "" : " on"}`} aria-pressed={!dark} onClick={() => set({ theme: "light" })}>
            <div className="pv" style={{ background: "#f0f3f8" }}><i style={{ width: "22%", background: "#e3e8ef" }} /><i style={{ flex: 1, background: "#fff", boxShadow: "0 0 1px rgba(0,0,0,.3)" }} /><i style={{ flex: 1.4, background: "#fff", boxShadow: "0 0 1px rgba(0,0,0,.3)" }} /></div>
            <div className="nm"><I.Sun />Light</div>
          </button>
          <button className={`theme-card${dark ? " on" : ""}`} aria-pressed={dark} onClick={() => set({ theme: "dark" })}>
            <div className="pv" style={{ background: "#1a1a1a" }}><i style={{ width: "22%", background: "#242424" }} /><i style={{ flex: 1, background: "#292929" }} /><i style={{ flex: 1.4, background: "#292929" }} /></div>
            <div className="nm"><I.Moon />Dark</div>
          </button>
        </div>
        <button className={`switch${dark ? " on" : ""}`} role="switch" aria-checked={dark} style={{ marginTop: 8 }} onClick={() => set({ theme: dark ? "light" : "dark" })}>
          <span className="tr" />
          <span className="tx">Dark mode<small>Use a dark background for mail and the reading pane</small></span>
        </button>
        <h4>Focused Inbox</h4>
        <button className={`switch${state.focusedInbox ? " on" : ""}`} role="switch" aria-checked={state.focusedInbox} onClick={() => set({ focusedInbox: !state.focusedInbox })}>
          <span className="tr" />
          <span className="tx">Sort messages into Focused and Other<small>Other holds newsletters, receipts and other mail you read less often</small></span>
        </button>
        <h4>Display density</h4>
        <div role="radiogroup" aria-label="Display density">
          {radio(state.density === "roomy", "Roomy", () => set({ density: "roomy" }), "Extra space between messages")}
          {radio(state.density === "cozy", "Cozy", () => set({ density: "cozy" }), "A balance of space and content")}
          {radio(state.density === "compact", "Compact", () => set({ density: "compact" }), "Fit more messages, hide previews")}
        </div>
        <h4>Reading pane</h4>
        <div role="radiogroup" aria-label="Reading pane">
          {radio(state.pane === "right", "Show on the right", () => set({ pane: "right" }))}
          {radio(state.pane === "bottom", "Show on the bottom", () => set({ pane: "bottom" }))}
          {radio(state.pane === "off", "Hide reading pane", () => set({ pane: "off" }), "Messages open over the message list")}
        </div>
      </div>
      <div className="ff"><button className="link" onClick={() => outlook.toast("All Outlook settings: accounts, mail rules, signatures, calendar and more.")}>View all Outlook settings</button></div>
    </div>
  );
}

function Toast() {
  const { outlook } = useUI();
  const [shown, setShown] = useState(false);
  const n = outlook.notice;
  useEffect(() => {
    if (!n) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 6000);
    return () => clearTimeout(t);
  }, [n]);
  // The text stays while it fades out.
  return (
    <div className={`toast${n?.ok ? " ok" : ""}${shown ? " show" : ""}`} role="status" aria-live="polite">
      <span className="ico">{n?.ok ? <I.Check /> : <I.Info />}</span>
      <span className="txt">{n?.text ?? ""}</span>
      <span className="acts">
        {(n?.actions ?? []).map((a) => (
          <button key={a.label} onClick={() => { setShown(false); a.run(); }}>{a.label}</button>
        ))}
      </span>
      <button className="x" aria-label="Dismiss" onClick={() => setShown(false)}><I.Close /></button>
    </div>
  );
}

function Notification() {
  const { outlook } = useUI();
  const a = outlook.alert;
  const c = a ? outlook.state.conversations.find((x) => x.id === a.id) : undefined;
  const { dismissAlert } = outlook.ui;
  useEffect(() => {
    if (!a) return;
    const t = setTimeout(dismissAlert, 8000);
    return () => clearTimeout(t);
  }, [a, dismissAlert]);
  if (!a || !c) return null;
  return (
    <div
      key={a.n}
      className="notif"
      role="alert"
      onClick={() => {
        dismissAlert();
        outlook.open(c.id);
      }}
    >
      <Avatar id={a.from} size="s40" />
      <div className="t">
        <div className="nsrc"><I.Logo name="outlook" />Outlook · now</div>
        <b>{outlook.person(a.from).name}</b>
        <div className="s">{c.subject}</div>
        <div className="p">{bodyText(lastOf(c)).slice(0, 120)}</div>
      </div>
      <button className="ib sm" aria-label="Dismiss notification" onClick={(e) => { e.stopPropagation(); dismissAlert(); }}><I.Close /></button>
    </div>
  );
}

function Dialog() {
  const { outlook } = useUI();
  const d = outlook.dialog!;
  const [value, setValue] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const ok = d.ok ?? "OK";
  const cancel = d.cancel ?? "Cancel";
  const valid = d.input?.valid ? d.input.valid(value) : true;
  const close = () => outlook.ui.showDialog(null);
  const confirm = () => {
    if (!valid) return;
    close();
    d.onOk?.(value);
  };
  useEffect(() => {
    const first = box.current?.querySelector<HTMLElement>("input, .btn.primary, button");
    first?.focus();
  }, []);
  return (
    <div className="dialog-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={box}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={d.title}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
          if (e.key === "Enter" && ok && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            confirm();
          }
        }}
      >
        <h2>{d.title}</h2>
        {typeof d.body === "string" ? <p>{d.body}</p> : d.body}
        {d.input ? (
          <>
            {d.input.label ? <label style={{ display: "block", fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{d.input.label}</label> : null}
            {d.input.multiline ? (
              <textarea className="dlg-in" placeholder={d.input.placeholder} maxLength={1000} value={value} onChange={(e) => setValue(e.target.value)} aria-label={d.input.label ?? d.title} />
            ) : (
              <input className="dlg-in" style={{ minHeight: 36 }} placeholder={d.input.placeholder} value={value} onChange={(e) => setValue(e.target.value)} aria-label={d.input.label ?? d.title} />
            )}
          </>
        ) : null}
        {d.after}
        <div className="acts">
          {ok ? <button className="btn primary" disabled={!valid} style={d.danger ? { background: "var(--danger)" } : undefined} onClick={confirm}>{ok}</button> : null}
          {cancel ? <button className="btn" onClick={close}>{cancel}</button> : null}
        </div>
      </div>
    </div>
  );
}
