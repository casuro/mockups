# Datadog (React)

`apps/datadog.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/datadog src/apps/datadog
```

It needs only React 19. The styles are plain CSS scoped to `.kit-datadog`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Noto Sans is embedded, so nothing loads from the network.

## Use

```tsx
import { Datadog, useDatadog, type DatadogSeed } from "./apps/datadog";

const seed: DatadogSeed = {
  org: { name: "Northwind" },
  me: "you",
  people: {
    you: { name: "Sam Rivera", email: "sam@northwind.dev" },
    priya: { name: "Priya Shah" },
  },
  services: { api: { color: "#632ca6" }, web: { color: "#3d6ecf" } },
  variables: [{ name: "env", options: ["prod", "staging"] }],
  monitors: [{ id: "api-5xx", name: "api 5xx rate above 2%", owner: "priya", status: "alert" }],
  events: [{ at: Date.now() - 20 * 60_000, kind: "deploy", title: "Deploy #88", service: "api" }],
  dashboard: {
    title: "API Overview",
    widgets: [
      {
        id: "rps", kind: "timeseries", display: "line", unit: "rps", span: 8, rows: 4,
        title: "Requests per second",
        // Data can be a function of the time range and template variables.
        series: (ctx) => ["api", "web"].map((key) => ({
          key,
          points: ctx.times.map((t) => [t, 100 + 20 * Math.sin(t / 600_000)]),
        })),
      },
      {
        id: "err", kind: "query_value", span: 4, rows: 2, title: "5xx error rate",
        data: { value: 3.1, spark: [0.2, 0.3, 2.9, 3.1] }, unit: "%", decimals: 2,
        rules: [{ tone: "bad", above: 2 }, { tone: "good" }],
      },
      { id: "mon", kind: "monitor_summary", span: 4, rows: 2, title: "Monitors" },
    ],
  },
};

function Screen() {
  const datadog = useDatadog(seed, {
    onEvent(event) {
      if (event.type === "time") {
        // They zoomed out to event.preset; record it, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Datadog datadog={datadog} />
    </div>
  );
}
```

`<Datadog>` fills the box it is in, so give that box a height. It switches to
Datadog's tablet layout (icon nav, two columns) when the box is under 1180px
wide and to its phone layout (drawer nav, one column) under 760px, whatever
the window size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `photo` is a
  picture URL, otherwise initials on `color`.
- `services`: colors, used by any series whose key is the service name.
- `variables`: the template variables (`$env`, `$service`) with their options.
- `presets`: the time picker; Datadog's Past 15 Minutes to Past 1 Week by
  default. `time` is the one on at the start.
- `monitors`, each with a `status` (alert, warn, ok, nodata) or a function of
  the time range that gives one. Alerting ones badge Monitors in the nav.
- `events`: deploys, alerts, incidents. The event stream lists those in the
  time range, and timeseries draw them as markers (deploys by default).
- `dashboard`: a title, a folder for the breadcrumb, and `widgets` in reading
  order on a 12-column grid (`span`) of 64px rows (`rows`). A widget is a
  `timeseries` (line, area, stacked area or stacked bars, with thresholds and
  markers), `query_value` (with a sparkline and colors by `rules`),
  `toplist`, `heatmap`, `hostmap`, `slo`, `monitor_summary`, `event_stream`,
  `note`, or `custom`.

A widget's data, title, context and query can each be a value or a function
of `ctx`: `{ start, end, step, times, preset, vars }`. Functions run again
when the time range or a variable changes, so one dashboard answers
`$env:staging` and "Past 1 Week" on its own. The series of one widget share
their times (`ctx.times` is the usual choice).

## Driving it

`useDatadog` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `datadog.setSeries(widgetId, data)` | Puts `data` in place of the widget's own: series for a timeseries, `{ value, spark }` for a query value, items, hosts, heatmap or SLO data. `null` goes back to its own. |
| `datadog.setMonitorStatus(id, status)` | A monitor changes state: the summary counts, its row and the nav badge follow. `null` goes back to the seed's. |
| `datadog.addEvent({ kind, title, text, service })` | An event lands now (or at `at`): first in the event stream, and a marker on the charts that show its kind. Returns its id. |
| `datadog.setTime(preset)` / `datadog.setVariable(name, value)` | Changes the time range or a template variable. |
| `datadog.openWidget(id)` / `(null)` | Opens a widget in full screen, or closes it. |
| `datadog.setTheme("dark")` | Light or dark. |
| `datadog.toast(text)` | A notice at the bottom. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "time", preset }` | They pick a time range. |
| `{ type: "variable", name, value }` | They pick a template variable value, or Reset puts one back. |
| `{ type: "legend", widget, series, visible }` | They show or hide a series from a legend. |
| `{ type: "fullscreen", widget, open }` | They open or close a widget in full screen. |
| `{ type: "nav", item }` | They click a nav item ("Monitors", "Help", "Personal Settings"...). |
| `{ type: "star", starred }` / `{ type: "share" }` | They star the dashboard or copy its link. |
| `{ type: "copy_query", widget, query }` / `{ type: "edit_widget", widget }` | They use a widget's menu. |
| `{ type: "theme", theme }` / `{ type: "logout" }` | From the user menu. |

`datadog.state` is everything that changed, as plain JSON: save it, and pass
it back as `useDatadog(seed, { restore })` to pick up where they left off.
`datadog.view` is what is on screen: the time range, each widget's data, the
monitors' statuses and the events in range.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-datadog.ts` and
`Datadog.tsx`; you should not need to open them.

### Imports

```ts
import {
  Datadog, useDatadog,
  DEFAULT_PRESETS, cpuColor, SEC, MIN, HOUR, DAY,
  type DatadogProps, type DatadogApp, type DatadogOptions,
  type DatadogSeed, type DatadogState, type DatadogEvent,
  type Widget, type WidgetData, type Series, type Point, type StreamEvent,
  type MonitorStatus, type QueryValueData, type TopListItem, type Host,
  type HeatmapData, type SloData, type DataContext, type Live,
} from "./apps/datadog";
// The brand marks are not re-exported by index.ts:
import { DatadogLogo } from "./apps/datadog/icons";
// Nor is the launcher logo and its Dock tile (see the repo README):
import { AppLogo, appTile } from "./apps/datadog/icons";
```

`index.ts` re-exports every type in `types.ts` (`export type *`), plus
`Person`, `ListedEvent` and `ResolvedWidget` from `use-datadog.ts`.
`DEFAULT_PRESETS` is the time picker's default list (keys `"15m"`, `"1h"`,
`"4h"`, `"1d"`, `"1w"`); `SEC`, `MIN`, `HOUR`, `DAY` are milliseconds;
`cpuColor(v: number): string` is the green-to-red color of a 0-100 value.

### The hook

```ts
function useDatadog(seed: DatadogSeed, options?: DatadogOptions): DatadogApp;

interface DatadogOptions {
  restore?: DatadogState | null;              // a saved `datadog.state`; read once, on mount
  onEvent?: (event: DatadogEvent) => void;    // everything the signed-in person does
}
```

`restore` is only used when its `version` is `1`, and only on the first
render; changing it later does nothing. `onEvent` is read through a ref, so
an inline function is fine. Keep `seed` stable (a module constant or
`useMemo`): the drawn view is recomputed whenever the seed object changes.
`seed.me` must be a key of `seed.people`, or the hook throws.

### The seed

```ts
interface DatadogSeed {
  org: { name: string; host?: string; site?: string };  // required; host "app.datadoghq.com", site "US1"
  me: string;                                          // required: a key of `people`
  people: Record<string, {                             // required
    name: string; email?: string; photo?: string; initials?: string; color?: string;
  }>;
  services?: Record<string, { color: string }>;       // series whose key is a service get its color
  variables?: { name: string; options: string[]; default?: string }[];  // "$env": name "env"
  presets?: { key: string; badge: string; label: string; span: number; step: number }[]; // DEFAULT_PRESETS
  time?: string;                                       // preset key on at the start; default "1h"
  monitors?: { id: string; name: string; owner?: string; status: Live<MonitorStatus> }[];
  events?: Live<StreamEvent[]>;
  dashboard: {                                         // required
    title: string; shortTitle?: string; folder?: string; starred?: boolean;
    widgets: Widget[];                                 // reading order, 12-column grid
  };
  theme?: "light" | "dark";
}

type MonitorStatus = "alert" | "warn" | "ok" | "nodata";
type Live<T> = T | ((ctx: DataContext) => T);
interface DataContext { start: number; end: number; step: number; times: number[]; preset: string; vars: Record<string, string> }

interface StreamEvent {
  id?: string;
  at: number | string;                 // ms timestamp or date string
  kind: "deploy" | "watchdog" | "alert" | "ok" | "incident" | "pagerduty" | "k8s" | "aws";
  title: string; text?: string; service?: string;
  major?: boolean;                     // always a labelled flag on charts
}
```

Every widget has these fields, then the fields of its `kind`:

```ts
// Common to all widgets
{ id: string; span: 2 | 3 | 4 | 6 | 8 | 12; rows: 2 | 3 | 4 | 5;
  wideOnTablet?: boolean; title?: Live<string>; context?: Live<string>;
  logo?: "datadog" | "github" | "kubernetes" | "aws" | "pagerduty" | "postgresql" | "redis";
  query?: Live<string>; maxPoints?: number }

{ kind: "timeseries"; display: "line" | "area" | "stacked" | "bars";
  series: Live<Series[]>;              // required
  unit?: "ms" | "pct" | "rps" | "errs" | "count" | "number";
  thresholds?: { value: number; label: string; color: string; fill?: boolean }[];
  yAuto?: boolean; yMax?: number; legend?: boolean;
  markers?: boolean | ((event: StreamEvent, ctx: DataContext) => boolean) }  // deploys by default
{ kind: "query_value"; data: Live<QueryValueData>; unit?: string; decimals?: number;
  compact?: boolean; rules?: { tone: "good" | "warn" | "bad"; above?: number; below?: number }[];
  caption?: string }
{ kind: "toplist"; items: Live<TopListItem[]>; unit?: string /* "%" */; max?: number /* 100 */; empty?: Live<string> }
{ kind: "heatmap"; data: Live<HeatmapData> }
{ kind: "hostmap"; hosts: Live<Host[]>; metric?: string; empty?: Live<string> }
{ kind: "slo"; data: Live<SloData> }
{ kind: "monitor_summary"; monitors?: string[] }          // monitor ids; all by default
{ kind: "event_stream"; filter?: (event: StreamEvent) => boolean }
{ kind: "note"; heading?: string; text?: string; oncall?: string[] }  // oncall: people ids
{ kind: "custom"; type: string; data?: unknown }          // drawn by the renderWidget prop

interface Series { key: string; name?: string; color?: string; points: Point[] }
type Point = [number, number | null];                     // [time ms, value]; null is a gap
interface QueryValueData { value: number | null; spark?: (number | null)[] }
interface TopListItem { name: string; value: number; color?: string; tip?: string }
interface Host { name: string; value: number /* 0-100 */; tags?: Record<string, string> }
interface HeatmapData { edges: number[]; columns: { start: number; end: number; counts: number[] }[] }
interface SloData { target: number; d7: number; d30: number; d90: number; budget: number; burn1h: number; burn6h: number }
type WidgetData = Series[] | QueryValueData | TopListItem[] | HeatmapData | Host[] | SloData;
```

### What code can do

Every function is stable across renders and reads the latest state, so it is
safe to call from timers and after `await`.

```ts
datadog.setSeries(widgetId: string, data: WidgetData | null): void
  // Replaces the widget's own data (Series[] for a timeseries, QueryValueData for a
  // query value, TopListItem[], Host[], HeatmapData, SloData); null restores its own.
  // The data is fixed: it no longer follows the time range or variables.
datadog.setMonitorStatus(id: string, status: MonitorStatus | null): void
  // Monitor changes state: summary counts, its row, the nav badge. null = seed status.
datadog.addEvent(event: Omit<StreamEvent, "at"> & { at?: number | string }): string
  // { kind, title, text?, service?, major?, id?, at? }; `at` defaults to now. Returns its id.
datadog.toast(text: string): void          // a notice at the bottom (at most 3 shown)
datadog.setTime(key: string): void         // a preset key, e.g. "4h"; does not emit an event
datadog.setVariable(name: string, value: string): void  // does not emit an event
datadog.openWidget(id: string | null): void             // full screen, or close with null
datadog.setTheme(theme: "light" | "dark"): void
```

Read-only properties:

```ts
datadog.state: DatadogState    // save this; see State below
datadog.view: {
  preset: TimePreset; ctx: DataContext;
  widgets: Record<string, ResolvedWidget>;  // { widget, ctx, title, context, query, data }
  monitors: { id: string; name: string; owner?: string; status: MonitorStatus }[];
  events: ListedEvent[];                    // in the time range, newest first
  alerting: number;                         // monitors in "alert"
}
datadog.seed: DatadogSeed
datadog.people: Record<string, Person>      // { id, name, email?, initials, color, photo? }
datadog.me: string
datadog.presets: TimePreset[]
datadog.notices: { id: number; text: string }[]
datadog.ui                                  // internal: the handlers <Datadog> wires; do not call
```

There is no "metric changed" call other than `setSeries`: to make a line
spike, build new `Series[]` (usually from `datadog.view.widgets[id].ctx.times`)
and set them. The time range's end is `Date.now()` when the view was last
recomputed (on any state change), not a ticking clock.

### Events

```ts
type DatadogEvent =
  | { type: "time"; preset: string }                        // picked a time range
  | { type: "variable"; name: string; value: string }       // picked a variable value, or Reset
  | { type: "legend"; widget: string; series: string; visible: boolean }
  | { type: "fullscreen"; widget: string; open: boolean }
  | { type: "nav"; item: string }                           // "Monitors", "Help", "Personal Settings"...
  | { type: "star"; starred: boolean }
  | { type: "share" }
  | { type: "copy_query"; widget: string; query: string }
  | { type: "edit_widget"; widget: string }
  | { type: "theme"; theme: "light" | "dark" }
  | { type: "logout" };
```

Only the signed-in person's actions emit events; the world calls above do not.

### State

`datadog.state` is plain JSON (`structuredClone`-safe), so it can go straight
into `casuro.store.set(...)`:

```ts
interface DatadogState {
  version: 1;
  time: string;                                  // preset key
  vars: Record<string, string>;
  hidden: Record<string, string[]>;              // hidden series by widget id
  starred: boolean;
  navCollapsed: boolean;
  fullscreen: string | null;
  monitors: Record<string, MonitorStatus>;       // set by the world, over the seed's
  data: Record<string, WidgetData>;              // set by the world, over the seed's
  events: (StreamEvent & { id: string; at: number })[];  // added by the world
  theme: "light" | "dark";
  seq: number;
}
```

It holds only what changed; the seed (with its functions) is not in it. To
restore, pass the same seed and `{ restore: saved }` on mount. Toasts are
not saved.

### The component

```ts
interface DatadogProps {
  datadog: DatadogApp;                              // required: the hook's return
  renderWidget?: (widget: Widget) => ReactNode;    // draws `custom` widgets
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent (`height: 100%`), so the parent needs a definite height.
It needs no provider and no global CSS; it imports `datadog.css` itself.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Datadog, useDatadog, MIN, type DatadogSeed, type DatadogState, type Series } from "./apps/datadog";

const seed: DatadogSeed = {
  org: { name: "Northwind" },
  me: "you",
  people: { you: { name: "Sam Rivera" }, priya: { name: "Priya Shah" } },
  services: { api: { color: "#632ca6" } },
  monitors: [{ id: "api-5xx", name: "api 5xx rate above 2%", owner: "priya", status: "ok" }],
  events: [{ at: Date.now() - 20 * MIN, kind: "deploy", title: "Deploy #88", service: "api" }],
  dashboard: {
    title: "API Overview",
    widgets: [
      { id: "err", kind: "timeseries", display: "line", unit: "pct", span: 8, rows: 4, title: "5xx rate",
        series: (ctx) => [{ key: "api", points: ctx.times.map((t) => [t, 0.4]) }] },
      { id: "mon", kind: "monitor_summary", span: 4, rows: 2, title: "Monitors" },
      { id: "stream", kind: "event_stream", span: 4, rows: 2, title: "Events" },
    ],
  },
};

export function DatadogScene() {
  const [saved, setSaved] = useState<DatadogState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ datadog?: DatadogState }>().then((s) => setSaved(s?.datadog ?? null));
  }, []);
  if (saved === undefined) return null;          // wait: restore is read on mount only
  return <Dashboard restore={saved} />;
}

function Dashboard({ restore }: { restore: DatadogState | null }) {
  const datadog = useDatadog(seed, {
    restore,
    async onEvent(event) {
      if (event.type === "time") {
        casuro.track.decision({ summary: `Zoomed the dashboard to ${event.preset}` });
      }
      if (event.type === "fullscreen" && event.open && event.widget === "err") {
        casuro.track.decision({ summary: "Opened the 5xx rate chart in full screen" });
        const reply = await casuro.llm(
          [
            { role: "system", content: "You are Priya Shah, the on-call engineer. One short sentence." },
            { role: "user", content: "The candidate just opened the 5xx chart. What do you add to the incident?" },
          ],
          { persona: "Priya Shah" },
        );
        casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "incident", text: reply });
        datadog.addEvent({ kind: "incident", title: "Priya Shah: " + reply.slice(0, 80), text: reply, service: "api" });
        datadog.toast("Priya added a note to the incident");
      }
    },
  });

  // A timed incident: the error rate spikes and the monitor fires 30s in.
  useEffect(() => {
    const id = setTimeout(() => {
      const times = datadog.view.widgets.err.ctx.times;
      const spike: Series[] = [{ key: "api", points: times.map((t, i) => [t, i > times.length - 8 ? 3.4 : 0.4]) }];
      datadog.setSeries("err", spike);
      datadog.setMonitorStatus("api-5xx", "alert");
      datadog.addEvent({ kind: "alert", title: "[Triggered] api 5xx rate above 2%", service: "api", major: true });
    }, 30_000);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save everything that changed.
  useEffect(() => {
    void casuro.store.set({ datadog: datadog.state });
  }, [datadog.state]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Datadog datadog={datadog} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Datadog.tsx` | The layout, popovers, tooltips, the full-screen widget, toasts, Escape. |
| `Nav.tsx` | The left navigation, the phone top bar, the user menu. |
| `Header.tsx` | The page header with star, Share and time picker; the template variable bar. |
| `Widgets.tsx` | The grid, a widget's frame and menu, and the widgets that are not charts. |
| `charts.tsx` | Timeseries, heatmap, host map and sparkline, drawn in SVG. |
| `use-datadog.ts` | The state and what changes it. |
| `format.ts` | Numbers, times, axes and colors. |
| `datadog.css` | The look, from the mockup. |

For a widget the kit has no part for (a table, a funnel, a runbook), give it
`kind: "custom", type, data` and draw it with
`<Datadog renderWidget={(w) => ...} />`. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=datadog` next to `/apps/datadog.html`: the same dashboard and
story, drawn by the React version.
