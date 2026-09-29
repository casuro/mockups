import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ClaudeCodeContext, useUI, type ClaudeCodeUI, type MenuEntry, type MenuOptions } from "./context";
import * as I from "./icons";
import { NewSession } from "./NewSession";
import { Session } from "./Session";
import { Sidebar } from "./Sidebar";
import type { Item, SessionState } from "./types";
import { pendingOf, type ClaudeCodeApp, type ToastIcon } from "./use-claude-code";
import "./claude-code.css";

// Claude Code, as in apps/claude-code.html. Give it an app from
// useClaudeCode(); it fills the box it is put in (give that box a height),
// whether that is the whole screen or one pane of it, and narrows to the
// tablet and phone layouts when the box is narrow.

export interface ClaudeCodeProps {
  claudeCode: ClaudeCodeApp;
  /** Draws a transcript entry of type "custom": a form, a chart, anything the kit does not have. */
  renderItem?: (item: Item, session: SessionState) => ReactNode;
  /** What the Preview pane shows for a session: the app being built. */
  renderPreview?: (session: SessionState) => ReactNode;
  /** Replaces the Terminal pane's body (a real terminal, say). */
  renderTerminal?: (session: SessionState) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface MenuState {
  anchor: HTMLElement;
  entries: MenuEntry[];
  options: MenuOptions;
}

export function ClaudeCode({ claudeCode: app, renderItem, renderPreview, renderTerminal, className, style }: ClaudeCodeProps) {
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [modal, setModal] = useState<{ content: ReactNode; size?: "sm" } | null>(null);
  const { state } = app;
  const session = app.current;

  const narrow = useCallback(() => (root.current?.clientWidth ?? 1440) < 760, []);
  const openMenu = useCallback((anchor: HTMLElement, entries: MenuEntry[], options: MenuOptions = {}) => setMenu({ anchor, entries, options }), []);
  const openModal = useCallback((content: ReactNode, size?: "sm") => {
    setMenu(null);
    setModal({ content, size });
  }, []);
  const closeModal = useCallback(() => setModal(null), []);
  const focusSearch = useCallback(() => {
    if (narrow()) setDrawer(true);
    else if (app.state.sidebarCollapsed) app.ui.edit((d) => void (d.sidebarCollapsed = false));
    setTimeout(() => {
      search.current?.focus();
      search.current?.select();
    }, 0);
  }, [narrow, app.state.sidebarCollapsed, app.ui]);

  // Opening a session closes the phone drawer, and on a phone its panes too.
  const opened = useRef(state.active);
  useEffect(() => {
    if (opened.current === state.active) return;
    opened.current = state.active;
    setDrawer(false);
    if (narrow() && Object.values(app.state.panes).some(Boolean)) app.ui.closePanes();
  }, [state.active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: the mockup's shortcuts. Latest values through a ref, one listener.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    const t = e.target as HTMLElement;
    const typing = t.matches?.("input, textarea, select, [contenteditable]");
    if (menu) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenu(null);
      }
      return;
    }
    if (mod && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        app.open(null);
      } else if (k === "k") {
        e.preventDefault();
        focusSearch();
      } else if (k === "j" && session) {
        e.preventDefault();
        app.ui.togglePane("terminal", undefined, narrow());
      } else if (k === "b") {
        e.preventDefault();
        if (narrow()) setDrawer((o) => !o);
        else app.ui.edit((d) => void (d.sidebarCollapsed = !d.sidebarCollapsed));
      }
      return;
    }
    if (e.key === "Escape") {
      if (modal) return void (e.preventDefault(), setModal(null));
      if (drawer) return setDrawer(false);
      if (!session) return;
      if (session.status === "running") return void (e.preventDefault(), app.ui.stop(session.id));
      const p = pendingOf(session);
      if (p && !typing) return app.ui.answer(session.id, p.id, p.type === "plan" ? "keep" : "deny");
      if ((root.current?.clientWidth ?? 1440) < 1101 && Object.values(state.panes).some(Boolean)) app.ui.closePanes();
      return;
    }
    // 1, 2, 3 answer the prompt Claude is waiting on.
    if (session && !typing && !mod && !modal && /^[123]$/.test(e.key)) {
      const p = pendingOf(session);
      if (!p) return;
      const answer = p.type === "plan" ? ({ 1: "approve", 2: "keep" } as const)[e.key as "1" | "2"] : ({ 1: "once", 2: "always", 3: "deny" } as const)[e.key as "1" | "2" | "3"];
      if (answer) {
        e.preventDefault();
        app.ui.answer(session.id, p.id, answer);
      }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: ClaudeCodeUI = {
    app,
    root,
    narrow,
    openMenu,
    menuAnchor: menu?.anchor ?? null,
    openModal,
    closeModal,
    setDrawer,
    focusSearch,
    composer,
    renderItem,
    renderPreview,
    renderTerminal,
  };

  const frame = ["app", state.sidebarCollapsed ? "sb-collapsed" : "", drawer ? "drawer" : ""].filter(Boolean).join(" ");

  return (
    <ClaudeCodeContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-claude-code${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onClickCapture={(e) => {
          if (!menu || (e.target as HTMLElement).closest(".menu")) return;
          // A click outside closes the menu; on its own button it only closes it.
          if (menu.anchor.contains(e.target as Node)) e.stopPropagation();
          setMenu(null);
        }}
      >
        <div className={frame}>
          <Sidebar search={search} />
          <div className="scrim" onClick={() => setDrawer(false)} />
          <main className="main">{session ? <Session s={session} /> : <NewSession />}</main>
        </div>
        {menu ? <Menu menu={menu} close={() => setMenu(null)} /> : null}
        {modal ? (
          <div className="modal-root">
            <div className="ov" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
              <div className={`modal${modal.size ? ` ${modal.size}` : ""}`} role="dialog" aria-modal="true">{modal.content}</div>
            </div>
          </div>
        ) : null}
        <Toasts />
        <Tooltip />
      </div>
    </ClaudeCodeContext.Provider>
  );
}

/** A menu under (or above) its button, kept inside the app's box, with arrow-key navigation. */
function Menu({ menu, close }: { menu: MenuState; close: () => void }) {
  const { root } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [kb, setKb] = useState(-1);
  const { anchor, entries, options: o } = menu;
  useLayoutEffect(() => {
    const box = root.current?.getBoundingClientRect();
    const m = ref.current;
    if (!box || !m) return;
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth;
    const mh = m.offsetHeight;
    let top = o.above ? r.top - mh - 6 : r.bottom + 6;
    if (!o.above && top + mh > box.bottom - 8) top = Math.max(box.top + 8, r.top - mh - 6);
    if (o.above && top < box.top + 8) top = r.bottom + 6;
    let left = o.alignRight ? r.right - mw : r.left;
    left = Math.max(box.left + 8, Math.min(box.right - mw - 8, left));
    setPos({ left: left - box.left, top: top - box.top });
  }, [anchor, o.above, o.alignRight, root]);
  const items = entries.filter((e): e is Extract<MenuEntry, { run: () => void }> => "run" in e);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setKb((k) => (k + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length);
      }
      if (e.key === "Enter" && kb >= 0) {
        e.preventDefault();
        close();
        items[kb].run();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items, kb, close]);
  let n = -1;
  return (
    <div
      ref={ref}
      className="menu"
      role="menu"
      style={{ minWidth: o.width ?? 200, left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      {entries.map((e, i) => {
        if ("sep" in e) return <div key={i} className="sep" />;
        if ("header" in e) return <div key={i} className="mh">{e.header}</div>;
        const k = ++n;
        return (
          <button
            key={i}
            className={`mi${e.danger ? " danger" : ""}${kb === k ? " kb" : ""}`}
            role="menuitem"
            onClick={() => {
              close();
              e.run();
            }}
          >
            {e.icon}
            <span className="ml">
              {e.label}
              {e.desc ? <span className="md2">{e.desc}</span> : null}
            </span>
            {e.kbd ? e.kbd.split(" ").map((x) => <kbd key={x}>{x}</kbd>) : null}
            {e.toggle !== undefined ? <span className={`switch${e.toggle ? " on" : ""}`} /> : null}
            {e.checked ? <I.Check className="chk" /> : e.checked === false ? <span style={{ width: 16 }} /> : null}
          </button>
        );
      })}
    </div>
  );
}

const TOAST_ICONS: Record<ToastIcon, (p: { className?: string }) => ReactNode> = {
  check: I.CheckC, hand: I.Hand, layers: I.Layers, archive: I.Archive, unarchive: I.Unarchive, trash: I.Trash, pr: I.Pr,
  ext: I.Ext, undo: I.Undo, comment: I.Comment, help: I.Help, logout: I.Logout, zap: I.Zap, map: I.Map,
};

function Toasts() {
  const { app } = useUI();
  return (
    <div className="toasts" aria-live="polite">
      {app.toasts.map((t) => {
        const Icon = TOAST_ICONS[t.icon];
        return (
          <div key={t.id} className={`toast${t.out ? " out" : ""}`}>
            <Icon />
            <span>{t.text}</span>
            {t.action ? <button onClick={t.action.run}>{t.action.label}</button> : null}
          </div>
        );
      })}
    </div>
  );
}

/** The dark tooltip for anything with `data-tip` (and `data-kbd` keys), after a short hover. */
function Tooltip() {
  const { root } = useUI();
  const [tip, setTip] = useState<{ text: string; keys: string[]; left: number; top: number; shown: boolean } | null>(null);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setTip((t) => (t ? { ...t, shown: false } : t));
    };
    const over = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (t === current) return;
      hide();
      if (!t || !t.dataset.tip || matchMedia("(hover: none)").matches) return;
      current = t;
      timer = setTimeout(() => {
        if (!host.contains(t)) return;
        setTip({ text: t.dataset.tip!, keys: t.dataset.kbd ? t.dataset.kbd.split(" ") : [], left: -9999, top: -9999, shown: false });
        requestAnimationFrame(() => {
          const tipEl = el.current;
          if (!tipEl || current !== t) return;
          const box = host.getBoundingClientRect();
          const r = t.getBoundingClientRect();
          const w = tipEl.offsetWidth;
          const h = tipEl.offsetHeight;
          let top = r.bottom + 6;
          if (top + h > box.bottom - 4) top = r.top - h - 6;
          const left = Math.max(box.left + 6, Math.min(box.right - w - 6, r.left + r.width / 2 - w / 2));
          setTip((x) => (x ? { ...x, left: left - box.left, top: top - box.top, shown: true } : x));
        });
      }, 380);
    };
    host.addEventListener("mouseover", over);
    host.addEventListener("mousedown", hide, true);
    host.addEventListener("mouseleave", hide);
    return () => {
      clearTimeout(timer);
      host.removeEventListener("mouseover", over);
      host.removeEventListener("mousedown", hide, true);
      host.removeEventListener("mouseleave", hide);
    };
  }, [root]);
  return (
    <div ref={el} className={`tip${tip?.shown ? " show" : ""}`} role="tooltip" style={{ left: tip?.left ?? -9999, top: tip?.top ?? -9999 }}>
      {tip?.text}
      {tip?.keys.map((k) => <kbd key={k}>{k}</kbd>)}
    </div>
  );
}
