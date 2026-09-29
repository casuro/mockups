// The Datadog app's data. A `DatadogSeed` is the org as it opens: who is
// signed in, the services, the template variables and the dashboard on
// screen. `DatadogState` is what changes while someone uses it; it is plain
// JSON, so it can be saved and handed back to `useDatadog` to pick up where
// they left off.

import type { LOGOS } from "./icons";

/** A brand mark from icons.tsx, for a widget title. */
export type LogoName = keyof typeof LOGOS;

export interface DatadogPerson {
  name: string;
  email?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's first letter by default. */
  initials?: string;
  color?: string;
}

/** A monitor's state: the colors of the status pills and the counts. */
export type MonitorStatus = "alert" | "warn" | "ok" | "nodata";

/** One of the time picker's choices. */
export interface TimePreset {
  /** "1h" */
  key: string;
  /** The grey badge: "1h". */
  badge: string;
  /** "Past 1 Hour" */
  label: string;
  /** How far back it reaches, in ms. */
  span: number;
  /** The time between two points of a timeseries, in ms. */
  step: number;
}

/** A template variable in the bar under the header: `$env`, `$service`. */
export interface TemplateVariable {
  /** "env", shown without the $. */
  name: string;
  options: string[];
  /** Selected at the start and after Reset; the first option by default. */
  default?: string;
}

/**
 * What a widget's data function gets: the time range on screen and the
 * template variables. `times` are the points of a timeseries, `step` apart.
 */
export interface DataContext {
  start: number;
  end: number;
  step: number;
  times: number[];
  /** The time preset's key: "1h". */
  preset: string;
  /** Template variable values by name: { env: "prod", service: "*" }. */
  vars: Record<string, string>;
}

/** A value, or a function of the time range and template variables that gives it. */
export type Live<T> = T | ((ctx: DataContext) => T);

/** A point of a timeseries: [time in ms, value]. A null value is a gap. */
export type Point = [number, number | null];

export interface Series {
  /** Unique within the widget; what the legend hides and shows. */
  key: string;
  /** The legend and tooltip label; the key by default. */
  name?: string;
  /** The service's color when the key is one of `services`, a palette color otherwise. */
  color?: string;
  points: Point[];
}

/** How values are written on axes and in tooltips. */
export type Unit = "ms" | "pct" | "rps" | "errs" | "count" | "number";

/** A dashed line across a timeseries: "Critical 95%". */
export interface Threshold {
  value: number;
  label: string;
  /** A CSS color, e.g. "var(--alert)". */
  color: string;
  /** Shades the area above it. */
  fill?: boolean;
}

/** An event: a deploy, a monitor alert, an incident. Listed by the event stream and drawn as markers on timeseries. */
export interface StreamEvent {
  id?: string;
  /** When it happened: a timestamp in ms, or a date string. */
  at: number | string;
  /** Sets the icon. */
  kind: "deploy" | "watchdog" | "alert" | "ok" | "incident" | "pagerduty" | "k8s" | "aws";
  title: string;
  text?: string;
  /** The service it is about, for markers limited to a service. */
  service?: string;
  /** Always gets a labelled flag on charts, even where flags are crowded. */
  major?: boolean;
}

export interface QueryValueData {
  value: number | null;
  /** The sparkline under the value. */
  spark?: (number | null)[];
}

/** A query value's color: the first rule whose bound the value passes. */
export interface QueryValueRule {
  tone: "good" | "warn" | "bad";
  /** Applies when the value is at or above this. */
  above?: number;
  /** Applies when the value is below this. */
  below?: number;
}

export interface TopListItem {
  name: string;
  value: number;
  /** The bar's color; green to red by value (as CPU %) by default. */
  color?: string;
  /** The hover text. */
  tip?: string;
}

/** A host on the host map. */
export interface Host {
  name: string;
  /** 0-100: fills the hexagon green to red. */
  value: number;
  /** Shown in its tooltip under the value: { Service: "checkout", Zone: "us-east-1a" }. */
  tags?: Record<string, string>;
}

/** Latency buckets over time. */
export interface HeatmapData {
  /** Bucket edges in ms, low to high: n + 1 edges for n buckets. */
  edges: number[];
  columns: { start: number; end: number; counts: number[] }[];
}

export interface SloData {
  /** 99.9 */
  target: number;
  d7: number;
  d30: number;
  d90: number;
  /** Error budget left, in percent. */
  budget: number;
  burn1h: number;
  burn6h: number;
}

export interface WidgetBase {
  /** Unique on the dashboard. */
  id: string;
  /** Twelve columns across: 2, 3, 4, 6, 8 or 12. */
  span: 2 | 3 | 4 | 6 | 8 | 12;
  /** Rows of 64px: 2 to 5. */
  rows: 2 | 3 | 4 | 5;
  /** Takes both columns at tablet width, like a wide widget. */
  wideOnTablet?: boolean;
  title?: Live<string>;
  /** Grey text after the title: "by service". */
  context?: Live<string>;
  /** A brand mark before the title. */
  logo?: LogoName;
  /** Shown in full screen and copied by "Copy query". */
  query?: Live<string>;
  /** At most this many points across the time range: `step` widens to fit. */
  maxPoints?: number;
}

export interface TimeseriesWidget extends WidgetBase {
  kind: "timeseries";
  display: "line" | "area" | "stacked" | "bars";
  unit?: Unit;
  series: Live<Series[]>;
  thresholds?: Threshold[];
  /** Fit the y axis to the data instead of starting at 0. */
  yAuto?: boolean;
  /** The y axis never goes above this. */
  yMax?: number;
  /** The legend under the chart. Default true. */
  legend?: boolean;
  /** Which events are drawn on it: deploys by default, `false` for none. */
  markers?: boolean | ((event: StreamEvent, ctx: DataContext) => boolean);
}

export interface QueryValueWidget extends WidgetBase {
  kind: "query_value";
  data: Live<QueryValueData>;
  /** Small text after the number: "%", "ms", "req/s". */
  unit?: string;
  decimals?: number;
  /** 1.2k, 3.4M. */
  compact?: boolean;
  /** Colors by value; the number stays plain without them. */
  rules?: QueryValueRule[];
  /** Grey line under the value: "avg, last 5 minutes". */
  caption?: string;
}

export interface TopListWidget extends WidgetBase {
  kind: "toplist";
  items: Live<TopListItem[]>;
  /** Written after each value. Default "%". */
  unit?: string;
  /** The value of a full bar. Default 100. */
  max?: number;
  /** Shown when there are no items. */
  empty?: Live<string>;
}

export interface HeatmapWidget extends WidgetBase {
  kind: "heatmap";
  data: Live<HeatmapData>;
}

export interface HostMapWidget extends WidgetBase {
  kind: "hostmap";
  hosts: Live<Host[]>;
  /** The value's name in the tooltip. Default "CPU usage". */
  metric?: string;
  empty?: Live<string>;
}

export interface SloWidget extends WidgetBase {
  kind: "slo";
  data: Live<SloData>;
}

export interface MonitorSummaryWidget extends WidgetBase {
  kind: "monitor_summary";
  /** Monitor ids from the seed; all of them by default. */
  monitors?: string[];
}

export interface EventStreamWidget extends WidgetBase {
  kind: "event_stream";
  /** Which events it lists; all in the time range by default. */
  filter?: (event: StreamEvent) => boolean;
}

export interface NoteWidget extends WidgetBase {
  kind: "note";
  heading?: string;
  /** Paragraphs, split on blank lines. */
  text?: string;
  /** People ids shown as "On call". */
  oncall?: string[];
}

/** Anything else, drawn by the `renderWidget` prop of <Datadog>. */
export interface CustomWidget extends WidgetBase {
  kind: "custom";
  type: string;
  data?: unknown;
}

export type Widget =
  | TimeseriesWidget
  | QueryValueWidget
  | TopListWidget
  | HeatmapWidget
  | HostMapWidget
  | SloWidget
  | MonitorSummaryWidget
  | EventStreamWidget
  | NoteWidget
  | CustomWidget;

/** Data a world call can put in place of a widget's own, by the widget's kind. */
export type WidgetData = Series[] | QueryValueData | TopListItem[] | HeatmapData | Host[] | SloData;

export interface Monitor {
  id: string;
  name: string;
  /** A person id: their face on the row. */
  owner?: string;
  status: Live<MonitorStatus>;
}

export interface Dashboard {
  title: string;
  /** Shown in the mobile top bar; the title by default. */
  shortTitle?: string;
  /** The breadcrumb after "Dashboards". */
  folder?: string;
  /** In reading order: the grid packs them left to right. */
  widgets: Widget[];
  /** Starred at the start. */
  starred?: boolean;
}

export interface DatadogSeed {
  org: {
    name: string;
    /** "app.datadoghq.com" */
    host?: string;
    /** "US1" */
    site?: string;
  };
  /** The signed-in person's id. */
  me: string;
  people: Record<string, DatadogPerson>;
  /** Service colors, used for series whose key is the service name. */
  services?: Record<string, { color: string }>;
  variables?: TemplateVariable[];
  /** The time picker's choices; Datadog's 15m to 1w by default. */
  presets?: TimePreset[];
  /** The preset on at the start. Default "1h". */
  time?: string;
  monitors?: Monitor[];
  /** For the event stream and chart markers. */
  events?: Live<StreamEvent[]>;
  dashboard: Dashboard;
  theme?: "light" | "dark";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface DatadogState {
  version: 1;
  /** The time preset's key. */
  time: string;
  vars: Record<string, string>;
  /** Series hidden from the legend, by widget id. */
  hidden: Record<string, string[]>;
  starred: boolean;
  navCollapsed: boolean;
  /** The widget open in full screen. */
  fullscreen: string | null;
  /** Monitor statuses set by the world, over the seed's. */
  monitors: Record<string, MonitorStatus>;
  /** Widget data set by the world, over the seed's. */
  data: Record<string, WidgetData>;
  /** Events added by the world. */
  events: (StreamEvent & { id: string; at: number })[];
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type DatadogEvent =
  | { type: "time"; preset: string }
  | { type: "variable"; name: string; value: string }
  | { type: "legend"; widget: string; series: string; visible: boolean }
  | { type: "fullscreen"; widget: string; open: boolean }
  | { type: "nav"; item: string }
  | { type: "star"; starred: boolean }
  | { type: "share" }
  | { type: "copy_query"; widget: string; query: string }
  | { type: "edit_widget"; widget: string }
  | { type: "theme"; theme: "light" | "dark" }
  | { type: "logout" };
