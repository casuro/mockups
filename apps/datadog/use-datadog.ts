import { useCallback, useMemo, useRef, useState } from "react";
import { coarse, DEFAULT_PRESETS, PALETTE, timesIn, toTime } from "./format";
import type {
  DataContext,
  DatadogEvent,
  DatadogSeed,
  DatadogState,
  Live,
  Monitor,
  MonitorStatus,
  StreamEvent,
  Widget,
  WidgetData,
} from "./types";

// The org behind <Datadog>: its state, what the world does to it (new data
// for a widget, a monitor changing state, an event arriving) and what the
// signed-in person does (pick a time range or a template variable, hide a
// series, open a widget in full screen). Every change goes through `update`,
// which keeps a ref in step with React state, so calls made between renders
// (timers, awaited replies) see what the last one wrote. Every function it
// returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  email?: string;
  initials: string;
  color: string;
  photo?: string;
}

export interface DatadogOptions {
  /** A state saved from `datadog.state`, to pick up where it was left. */
  restore?: DatadogState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: DatadogEvent) => void;
}

/** An event with its time in ms and an id. */
export type ListedEvent = StreamEvent & { id: string; at: number };

/** A widget as drawn now: its data for the time range on screen. */
export interface ResolvedWidget {
  widget: Widget;
  ctx: DataContext;
  title: string;
  context: string;
  query: string;
  /** The world's data when it set some, the widget's own otherwise. Undefined for widgets without data. */
  data: WidgetData | undefined;
}

const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

function live<T>(v: Live<T>, ctx: DataContext): T {
  return typeof v === "function" ? (v as (c: DataContext) => T)(ctx) : v;
}

function normalizePeople(seed: DatadogSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people)) {
    out[id] = { id, name: p.name, email: p.email, photo: p.photo, color: p.color ?? colorFor(id), initials: p.initials ?? p.name.trim().charAt(0).toUpperCase() };
  }
  if (!out[seed.me]) throw new Error(`Datadog: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

const defaultVars = (seed: DatadogSeed) =>
  Object.fromEntries((seed.variables ?? []).map((v) => [v.name, v.default ?? v.options[0] ?? ""]));

function initialState(seed: DatadogSeed): DatadogState {
  return {
    version: 1,
    time: seed.time ?? "1h",
    vars: defaultVars(seed),
    hidden: {},
    starred: !!seed.dashboard.starred,
    navCollapsed: false,
    fullscreen: null,
    monitors: {},
    data: {},
    events: [],
    theme: seed.theme ?? "light",
    seq: 0,
  };
}

/** The widget's own data, before the world's. */
function ownData(w: Widget, ctx: DataContext): WidgetData | undefined {
  switch (w.kind) {
    case "timeseries": return live(w.series, ctx);
    case "query_value": case "heatmap": case "slo": return live(w.data, ctx);
    case "toplist": return live(w.items, ctx);
    case "hostmap": return live(w.hosts, ctx);
    default: return undefined;
  }
}

/** How many points a widget draws when it does not say: a query value's sparkline and bars are coarser. */
function maxPointsOf(w: Widget) {
  if (w.maxPoints) return w.maxPoints;
  if (w.kind === "query_value") return 60;
  if (w.kind === "heatmap") return 48;
  if (w.kind === "timeseries" && w.display === "bars") return 60;
  return 0;
}

export function useDatadog(seed: DatadogSeed, options: DatadogOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const presets = seed.presets ?? DEFAULT_PRESETS;
  const [state, setState] = useState<DatadogState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notices, setNotices] = useState<{ id: number; text: string }[]>([]);
  const noticeSeq = useRef(0);

  const update = useCallback((fn: (draft: DatadogState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: DatadogEvent) => opts.current.onEvent?.(event), []);

  // ---------- What is on screen, for the time range and variables ----------

  const view = useMemo(() => {
    const preset = presets.find((p) => p.key === state.time) ?? presets[0];
    // Like the mockup, the range ends when something changes, not on every frame.
    const end = Date.now();
    const start = end - preset.span;
    const ctx: DataContext = { start, end, step: preset.step, times: timesIn(start, end, preset.step), preset: preset.key, vars: state.vars };

    const widgets: Record<string, ResolvedWidget> = {};
    for (const w of seed.dashboard.widgets) {
      let wctx = ctx;
      const max = maxPointsOf(w);
      if (max) {
        const step = coarse(start, end, preset.step, max);
        let times = timesIn(start, end, step);
        // Bars show whole buckets only.
        if (w.kind === "timeseries" && w.display === "bars") times = times.filter((t) => t + step <= end + step * 0.5);
        wctx = { ...ctx, step, times };
      }
      widgets[w.id] = {
        widget: w,
        ctx: wctx,
        title: w.title ? live(w.title, ctx) : "",
        context: w.context ? live(w.context, ctx) : "",
        query: w.query ? live(w.query, ctx) : "",
        data: state.data[w.id] ?? ownData(w, wctx),
      };
    }

    const monitors = (seed.monitors ?? []).map((m: Monitor) => ({
      id: m.id,
      name: m.name,
      owner: m.owner,
      status: (state.monitors[m.id] ?? live(m.status, ctx)) as MonitorStatus,
    }));

    let n = 0;
    const events: ListedEvent[] = [...(seed.events ? live(seed.events, ctx) : []), ...state.events]
      .map((e) => ({ ...e, id: e.id ?? `e${++n}`, at: toTime(e.at) }))
      .filter((e) => e.at >= start && e.at <= end)
      .sort((a, b) => b.at - a.at);

    return { preset, ctx, widgets, monitors, events, alerting: monitors.filter((m) => m.status === "alert").length };
  }, [seed, presets, state]);

  // ---------- What the world does ----------

  /** A notice at the bottom. */
  const toast = useCallback((text: string) => {
    const id = ++noticeSeq.current;
    setNotices((list) => [...list, { id, text }].slice(-3));
  }, []);

  /** Puts `data` in place of a widget's own (series for a timeseries, `{ value, spark }` for a query value...), or back to its own with null. */
  const setSeries = useCallback(
    (widgetId: string, data: WidgetData | null) =>
      void update((s) => {
        if (data == null) delete s.data[widgetId];
        else s.data[widgetId] = data;
      }),
    [update]
  );

  /** A monitor changes state (the counts, its row, the nav badge), or goes back to its seed status with null. */
  const setMonitorStatus = useCallback(
    (id: string, status: MonitorStatus | null) =>
      void update((s) => {
        if (status == null) delete s.monitors[id];
        else s.monitors[id] = status;
      }),
    [update]
  );

  /** An event arrives: in the event stream, and as a marker on the charts that show its kind. Returns its id. */
  const addEvent = useCallback(
    (event: Omit<StreamEvent, "at"> & { at?: number | string }) => {
      let id = "";
      update((s) => {
        id = event.id ?? `w${++s.seq}`;
        s.events.push({ ...event, id, at: toTime(event.at) });
      });
      return id;
    },
    [update]
  );

  /** Switch the time range (a preset key). */
  const setTime = useCallback((key: string) => void update((s) => void (s.time = key)), [update]);

  /** Set a template variable. */
  const setVariable = useCallback((name: string, value: string) => void update((s) => void (s.vars[name] = value)), [update]);

  /** Open a widget in full screen, or close it with null. */
  const openWidget = useCallback((id: string | null) => void update((s) => void (s.fullscreen = id)), [update]);

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  // ---------- What the signed-in person does (wired by <Datadog>) ----------

  const pickTime = useCallback(
    (key: string) => {
      setTime(key);
      emit({ type: "time", preset: key });
    },
    [setTime, emit]
  );

  const pickVariable = useCallback(
    (name: string, value: string) => {
      setVariable(name, value);
      emit({ type: "variable", name, value });
    },
    [setVariable, emit]
  );

  const resetVariables = useCallback(() => {
    const defaults = defaultVars(seed);
    const changed = Object.keys(defaults).filter((k) => ref.current.vars[k] !== defaults[k]);
    update((s) => void (s.vars = defaults));
    for (const name of changed) emit({ type: "variable", name, value: defaults[name] });
  }, [seed, update, emit]);

  const toggleSeries = useCallback(
    (widget: string, key: string) => {
      let visible = false;
      update((s) => {
        const list = s.hidden[widget] ?? [];
        visible = list.includes(key);
        s.hidden[widget] = visible ? list.filter((k) => k !== key) : [...list, key];
      });
      emit({ type: "legend", widget, series: key, visible });
    },
    [update, emit]
  );

  const fullscreen = useCallback(
    (widget: string | null) => {
      const was = ref.current.fullscreen;
      if (was === widget) return;
      openWidget(widget);
      if (widget) emit({ type: "fullscreen", widget, open: true });
      else if (was) emit({ type: "fullscreen", widget: was, open: false });
    },
    [openWidget, emit]
  );

  const star = useCallback(() => {
    const s = update((d) => void (d.starred = !d.starred));
    toast(s.starred ? "Added to favorites" : "Removed from favorites");
    emit({ type: "star", starred: s.starred });
  }, [update, toast, emit]);

  const collapseNav = useCallback(() => void update((s) => void (s.navCollapsed = !s.navCollapsed)), [update]);

  const pickTheme = useCallback(
    (theme: "light" | "dark") => {
      setTheme(theme);
      emit({ type: "theme", theme });
    },
    [setTheme, emit]
  );

  const dismiss = useCallback((id: number) => setNotices((list) => list.filter((n) => n.id !== id)), []);

  const ui = useMemo(
    () => ({ pickTime, pickVariable, resetVariables, toggleSeries, fullscreen, star, collapseNav, pickTheme, dismiss, emit }),
    [pickTime, pickVariable, resetVariables, toggleSeries, fullscreen, star, collapseNav, pickTheme, dismiss, emit]
  );

  return {
    seed,
    people,
    me: seed.me,
    presets,
    /** Save this and pass it back as `restore`. */
    state,
    /** The time range, widget data, monitors and events as drawn now. */
    view,
    notices,
    // The world
    setSeries,
    setMonitorStatus,
    addEvent,
    toast,
    setTime,
    setVariable,
    openWidget,
    setTheme,
    // The signed-in person (wired by <Datadog>)
    ui,
  };
}

export type DatadogApp = ReturnType<typeof useDatadog>;
