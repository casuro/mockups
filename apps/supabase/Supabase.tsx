import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { SupabaseContext, useUI, type Overlay, type PopOptions, type SupabaseUI } from "./context";
import { clamp } from "./format";
import * as I from "./icons";
import { Overlays } from "./Panels";
import { SnippetList, SqlView } from "./SqlEditor";
import { TableList, TableView } from "./TableEditor";
import { Rail, TopBar } from "./TopBar";
import type { SupabaseApp } from "./use-supabase";
import "./supabase.css";

// Supabase Studio, as in apps/supabase.html. Give it an app from
// useSupabase(); it fills the box it is put in (give that box a height),
// whether that is the whole screen or one pane of it, and narrows to the
// phone layout when the box is under 760px wide.

export interface SupabaseProps {
  supabase: SupabaseApp;
  className?: string;
  style?: CSSProperties;
}

interface Pop {
  anchor: HTMLElement;
  content: () => ReactNode;
  options: PopOptions;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function Supabase({ supabase: app, className, style }: SupabaseProps) {
  const root = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlayState] = useState<Overlay | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const { state } = app;

  // ---------- Popover: one at a time, under its anchor ----------

  const closePop = useCallback(() => setPop(null), []);
  const openPop = useCallback((anchor: HTMLElement, content: () => ReactNode, options: PopOptions = {}) => {
    setPop((p) => (p?.anchor === anchor ? null : { anchor, content, options }));
  }, []);
  const setOverlay = useCallback((o: Overlay | null) => {
    setPop(null);
    setOverlayState(o);
  }, []);

  useLayoutEffect(() => {
    if (!pop) return;
    const { anchor, options } = pop;
    anchor.setAttribute("aria-expanded", "true");
    const el = popRef.current;
    const box = root.current?.getBoundingClientRect();
    if (el && box) {
      const r = anchor.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = options.align === "end" ? r.right - w : r.left;
      let y = r.bottom + 6;
      if (y + h > box.bottom - 8) y = Math.max(box.top + 8, r.top - h - 6);
      el.style.left = `${clamp(x, box.left + 8, box.right - w - 8) - box.left}px`;
      el.style.top = `${y - box.top}px`;
    }
    return () => anchor.setAttribute("aria-expanded", "false");
  }, [pop]);

  useEffect(() => {
    if (!pop) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !pop.anchor.contains(t)) setPop(null);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [pop]);

  // Another view or table closes what was open over the old one.
  useEffect(() => {
    setPop(null);
    setListOpen(false);
  }, [state.view, state.table, state.snippet]);

  // ---------- Tooltips ----------

  const tipRef = useRef<HTMLDivElement>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTip = () => {
    clearTimeout(tipTimer.current);
    tipRef.current?.classList.remove("show");
  };
  const onMouseOver = (e: ReactMouseEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
    hideTip();
    if (!t || matchMedia("(hover: none)").matches) return;
    tipTimer.current = setTimeout(() => {
      const el = tipRef.current;
      const box = root.current?.getBoundingClientRect();
      if (!el || !box || !t.isConnected || !t.dataset.tip) return;
      el.textContent = t.dataset.tip;
      const r = t.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const y = r.bottom + 6 + h > box.bottom ? r.top - 6 - h : r.bottom + 6;
      el.style.left = `${clamp(r.left + r.width / 2 - w / 2, box.left + 4, box.right - w - 4) - box.left}px`;
      el.style.top = `${y - box.top}px`;
      el.classList.add("show");
    }, 400);
  };
  useEffect(() => () => clearTimeout(tipTimer.current), []);

  // ---------- Keys: ⌘K search, ⌘↵ run, Esc closes the top-most thing ----------

  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e: KeyboardEvent) => {
    // ⌘K and ⌘↵ while focus is in the kit, or nowhere yet (the page just
    // loaded): on a desktop, another app with focus keeps its own.
    const active = document.activeElement;
    const ours = !active || active === document.body || !!root.current?.contains(active);
    const mod = (e.metaKey || e.ctrlKey) && ours;
    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOverlay(overlay?.kind === "palette" ? null : { kind: "palette" });
      return;
    }
    if (mod && e.key === "Enter" && state.view === "sql" && !overlay && state.snippet) {
      e.preventDefault();
      app.ui.run(state.snippet);
      return;
    }
    if (e.key !== "Escape") return;
    if (pop) {
      pop.anchor.focus();
      setPop(null);
    } else if (overlay) setOverlay(null);
    else if (railOpen) setRailOpen(false);
    else if (listOpen) setListOpen(false);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    const onResize = () => setPop(null);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const ui: SupabaseUI = {
    app, root, openPop, closePop, overlay, setOverlay, railOpen, setRailOpen, listOpen, setListOpen,
    selected, setSelected, flash, setFlash, mod: isMac ? "⌘" : "Ctrl",
  };

  return (
    <SupabaseContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-supabase${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseOver={onMouseOver}
        onMouseDown={hideTip}
        onScrollCapture={hideTip}
      >
        <div className="app">
          <TopBar />
          <div className="body">
            <Rail />
            {state.view === "sql" ? <SnippetList /> : <TableList />}
            {listOpen ? <div className="list-scrim" onClick={() => setListOpen(false)} /> : null}
            <main className="editor">{state.view === "sql" ? <SqlView /> : <TableView />}</main>
          </div>
        </div>
        <Overlays />
        {pop ? (
          <div className={`pop${pop.options.className ? ` ${pop.options.className}` : ""}`} ref={popRef}>
            {pop.content()}
          </div>
        ) : null}
        <div className="tip" ref={tipRef} role="tooltip" />
        <Toasts />
      </div>
    </SupabaseContext.Provider>
  );
}

function Toasts() {
  const { app } = useUI();
  return (
    <div className="toasts" aria-live="polite">
      {app.notices.map((n) => (
        <Toast key={n.id} text={n.text} onDone={() => app.ui.dismiss(n.id)} />
      ))}
    </div>
  );
}

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  const [out, setOut] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const a = setTimeout(() => setOut(true), 2800);
    const b = setTimeout(() => done.current(), 3020);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  return (
    <div className={`toast${out ? " out" : ""}`} role="status">
      <I.CheckCircle />
      <span>{text}</span>
    </div>
  );
}
