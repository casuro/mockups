import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { DatadogContext, useUI, type DatadogUI, type PopOptions } from "./context";
import { clamp } from "./format";
import { PageHead, TimePicker, VariableBar } from "./Header";
import * as I from "./icons";
import { MobileBar, Nav } from "./Nav";
import type { Widget } from "./types";
import type { DatadogApp } from "./use-datadog";
import { Grid, isChart, WidgetBody, WidgetTitle } from "./Widgets";
import "./datadog.css";

// Datadog, as in apps/datadog.html: a dashboard with its navigation. Give it
// an app from useDatadog(); it fills the box it is put in (give that box a
// height), whether that is the whole screen or one pane of it, and narrows
// to Datadog's tablet and phone layouts when the box is narrow.

export interface DatadogProps {
  datadog: DatadogApp;
  /** Draws a `custom` widget: anything the kit does not have. */
  renderWidget?: (widget: Widget) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface Pop {
  anchor: HTMLElement;
  content: () => ReactNode;
  options: PopOptions;
}

export function Datadog({ datadog: app, renderWidget, className, style }: DatadogProps) {
  const root = useRef<HTMLDivElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [pop, setPop] = useState<Pop | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [chartTip, setChartTip] = useState<{ content: ReactNode; x: number; y: number } | null>(null);
  const [fontsReady, setFontsReady] = useState(0);
  const { state } = app;

  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => live && setFontsReady((n) => n + 1));
    return () => void (live = false);
  }, []);

  // ---------- Popover: one at a time, under its anchor ----------

  const closePop = useCallback(() => setPop(null), []);
  const openPop = useCallback((anchor: HTMLElement, content: () => ReactNode, options: PopOptions = {}) => {
    setPop((p) => (p?.anchor === anchor ? null : { anchor, content, options }));
  }, []);

  useLayoutEffect(() => {
    if (!pop) return;
    const { anchor, options } = pop;
    anchor.classList.add("menu-open");
    anchor.setAttribute("aria-expanded", "true");
    const el = popRef.current, box = root.current?.getBoundingClientRect();
    if (el && box) {
      const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      let x: number, y: number;
      if (options.side === "right") {
        x = r.right + 8;
        y = r.bottom - h;
      } else {
        y = r.bottom + 4;
        x = options.align === "end" ? r.right - w : r.left;
        if (y + h > box.bottom - 8) y = r.top - 4 - h;
      }
      el.style.left = `${clamp(x, box.left + 8, box.right - w - 8) - box.left}px`;
      el.style.top = `${clamp(y, box.top + 8, box.bottom - h - 8) - box.top}px`;
    }
    return () => {
      anchor.classList.remove("menu-open");
      anchor.setAttribute("aria-expanded", "false");
    };
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

  // ---------- Tooltips ----------

  const chartTipRef = useRef<HTMLDivElement>(null);
  const showChartTip = useCallback((content: ReactNode, x: number, y: number) => setChartTip({ content, x, y }), []);
  const hideChartTip = useCallback(() => setChartTip(null), []);
  useLayoutEffect(() => {
    const el = chartTipRef.current, box = root.current?.getBoundingClientRect();
    if (!chartTip || !el || !box) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = chartTip.x + 14, y = chartTip.y + 14;
    if (x + w > box.right - 8) x = chartTip.x - 14 - w;
    if (x < box.left + 8) x = box.left + 8;
    if (y + h > box.bottom - 8) y = Math.max(box.top + 8, chartTip.y - 14 - h);
    el.style.left = `${x - box.left}px`;
    el.style.top = `${y - box.top}px`;
  }, [chartTip]);

  // The small dark label on anything with data-tip, after a short hover.
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
    const nav = t.dataset.tipNav;
    if (nav && !((root.current?.querySelector<HTMLElement>(".nav")?.offsetWidth ?? 200) < 100)) return;
    tipTimer.current = setTimeout(() => {
      const el = tipRef.current, box = root.current?.getBoundingClientRect();
      if (!el || !box || !t.isConnected || t.classList.contains("menu-open") || !t.dataset.tip) return;
      el.textContent = t.dataset.tip;
      const r = t.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      let x: number, y: number;
      if (nav) {
        x = r.right + 8;
        y = r.top + r.height / 2 - h / 2;
      } else {
        x = r.left + r.width / 2 - w / 2;
        y = r.bottom + 6;
        if (y + h > box.bottom - 4) y = r.top - 6 - h;
      }
      el.style.left = `${clamp(x, box.left + 4, box.right - w - 4) - box.left}px`;
      el.style.top = `${clamp(y, box.top + 4, box.bottom - h - 4) - box.top}px`;
      el.classList.add("show");
    }, 350);
  };
  useEffect(() => () => clearTimeout(tipTimer.current), []);

  // ---------- Keys and window ----------

  const escape = useRef<() => void>(() => {});
  escape.current = () => {
    if (pop) {
      setPop(null);
      pop.anchor.focus();
    } else if (state.fullscreen) app.ui.fullscreen(null);
    else if (navOpen) setNavOpen(false);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") escape.current();
    };
    const onResize = () => {
      setPop(null);
      setChartTip(null);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const ui: DatadogUI = { app, root, renderWidget, openPop, closePop, showChartTip, hideChartTip, fontsReady };
  const appClass = ["app", state.navCollapsed ? "nav-collapsed" : "", navOpen ? "nav-open" : ""].filter(Boolean).join(" ");

  return (
    <DatadogContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-datadog${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseOver={onMouseOver}
        onMouseDown={hideTip}
        onScrollCapture={() => {
          hideTip();
          setChartTip(null);
        }}
      >
        <div className={appClass}>
          <Nav onNavigate={() => setNavOpen(false)} />
          <div className="nav-scrim" onClick={() => setNavOpen(false)} />
          <div className="main">
            <MobileBar onMenu={() => setNavOpen(true)} />
            <div className="view">
              <PageHead />
              <VariableBar />
              <Grid />
            </div>
          </div>
        </div>
        {state.fullscreen ? <FullScreen id={state.fullscreen} /> : null}
        {pop ? (
          <div className="pop" ref={popRef}>
            {pop.content()}
          </div>
        ) : null}
        <div className="tip" ref={tipRef} />
        {chartTip ? (
          <div className="ctip show" ref={chartTipRef}>
            {chartTip.content}
          </div>
        ) : null}
        <Toasts />
      </div>
    </DatadogContext.Provider>
  );
}

function FullScreen({ id }: { id: string }) {
  const { app } = useUI();
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => modal.current?.focus(), [id]);
  const rw = app.view.widgets[id];
  if (!rw) return null;
  const close = () => app.ui.fullscreen(null);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal wide" ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-label={rw.title}>
        <div className="modal-head">
          <h2><WidgetTitle rw={rw} /></h2>
          <span style={{ display: "flex", gap: 8 }}><TimePicker /></span>
          <button className="icon-btn" aria-label="Close full screen" onClick={close}><I.X /></button>
        </div>
        <div className="modal-body fs-body">
          <div className="fs-query" title={rw.query}>{rw.query}</div>
          {isChart(rw.widget) ? <WidgetBody rw={rw} full /> : <div className="ch"><WidgetBody rw={rw} full /></div>}
        </div>
      </div>
    </div>
  );
}

function Toasts() {
  const { app } = useUI();
  return (
    <div className="toast-host">
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
    const a = setTimeout(() => setOut(true), 2600);
    const b = setTimeout(() => done.current(), 2820);
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
