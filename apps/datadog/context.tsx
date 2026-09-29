import { createContext, useContext, useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import type { Widget } from "./types";
import type { DatadogApp } from "./use-datadog";

// What every part of <Datadog> reads: the app, the one popover and chart
// tooltip open at a time, and small shared parts (Avatar, useSize).

export interface PopOptions {
  /** Line its right edge up with the anchor's. */
  align?: "end";
  /** Open to the right of the anchor, bottoms aligned (the nav's user menu). */
  side?: "right";
}

export interface DatadogUI {
  app: DatadogApp;
  root: RefObject<HTMLDivElement | null>;
  renderWidget?: (widget: Widget) => ReactNode;
  /** Opens a popover under `anchor`; the same anchor again closes it. `content` is re-drawn on every render. */
  openPop: (anchor: HTMLElement, content: () => ReactNode, options?: PopOptions) => void;
  closePop: () => void;
  /** The chart tooltip, at a pointer position in the window. */
  showChartTip: (content: ReactNode, x: number, y: number) => void;
  hideChartTip: () => void;
  /** Bumped when the font has loaded, so charts re-measure their labels. */
  fontsReady: number;
}

export const DatadogContext = createContext<DatadogUI | null>(null);

export function useUI() {
  const ui = useContext(DatadogContext);
  if (!ui) throw new Error("Datadog parts must be inside <Datadog>");
  return ui;
}

export function Avatar({ id, className = "av", tip = true }: { id: string; className?: string; tip?: boolean }) {
  const p = useUI().app.people[id];
  if (!p) return null;
  const dataTip = tip ? p.name : undefined;
  return p.photo ? (
    <img className={className} src={p.photo} alt={p.name} data-tip={dataTip} />
  ) : (
    <span className={`${className} av-i`} style={{ background: p.color }} role="img" aria-label={p.name} data-tip={dataTip}>
      {p.initials}
    </span>
  );
}

/** The element's content box, kept up to date. */
export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (w: number, h: number) => setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    set(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(([e]) => set(Math.round(e.contentRect.width), Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
