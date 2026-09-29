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
