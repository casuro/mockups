import type { MonitorStatus, TimePreset, Unit } from "./types";

// Numbers, times, axes and colors, as apps/datadog.html writes and draws them.

export const SEC = 1e3, MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Datadog's time picker. */
export const DEFAULT_PRESETS: TimePreset[] = [
  { key: "15m", badge: "15m", label: "Past 15 Minutes", span: 15 * MIN, step: 10 * SEC },
  { key: "1h", badge: "1h", label: "Past 1 Hour", span: HOUR, step: 30 * SEC },
  { key: "4h", badge: "4h", label: "Past 4 Hours", span: 4 * HOUR, step: 2 * MIN },
  { key: "1d", badge: "1d", label: "Past 1 Day", span: DAY, step: 10 * MIN },
  { key: "1w", badge: "1w", label: "Past 1 Week", span: 7 * DAY, step: HOUR },
];

export const STATUS_LABEL: Record<MonitorStatus, string> = { alert: "Alert", warn: "Warn", nodata: "No Data", ok: "OK" };

// ---------- Times ----------

export function fmtClock(t: number, sec = false) {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}${sec ? ":" + pad2(d.getSeconds()) : ""}`;
}
export function fmtDay(t: number) {
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export const fmtFull = (t: number, sec = false) => `${fmtDay(t)}, ${fmtClock(t, sec)}`;
export function fmtAgo(t: number) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
export const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

/** Points `step` apart across [start, end]. */
export function timesIn(start: number, end: number, step: number) {
  const out: number[] = [];
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) out.push(t);
  return out;
}
/** A step wide enough that the range holds at most `maxPoints`. */
export const coarse = (start: number, end: number, step: number, maxPoints: number) =>
  step * Math.max(1, Math.ceil((end - start) / step / maxPoints));

/** Time axis ticks at least 78px apart, on round local times. */
export function timeTicks(start: number, end: number, plotW: number) {
  const IV = [10 * SEC, 15 * SEC, 30 * SEC, MIN, 2 * MIN, 5 * MIN, 10 * MIN, 15 * MIN, 30 * MIN, HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY];
  const span = end - start;
  const iv = IV.find((c) => plotW / (span / c) >= 78) ?? 2 * DAY;
  const off = -new Date(start).getTimezoneOffset() * MIN;
  const label = (t: number) => {
    const d = new Date(t);
    const midnight = d.getHours() === 0 && d.getMinutes() === 0;
    if (iv >= DAY || (midnight && span > 6 * HOUR)) return fmtDay(t);
    return fmtClock(t, iv < MIN);
  };
  const ticks: { t: number; label: string }[] = [];
  for (let t = Math.ceil((start + off) / iv) * iv - off; t <= end; t += iv) ticks.push({ t, label: label(t) });
  return ticks;
}

// ---------- Numbers ----------

const trimZ = (s: string) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);
export function fmtK(v: number, d = 1) {
  const a = Math.abs(v);
  if (a >= 1e6) return trimZ((v / 1e6).toFixed(d)) + "M";
  if (a >= 1e3) return trimZ((v / 1e3).toFixed(d)) + "k";
  return trimZ(v.toFixed(a < 10 ? Math.max(d, 1) : a < 100 ? d : 0));
}
function decFor(step: number) {
  if (step >= 1 && Number.isInteger(+step.toFixed(8))) return 0;
  const e = Math.floor(Math.log10(step));
  const mant = step / 10 ** e;
  return Math.max(0, -e + (Math.abs(mant - Math.round(mant)) > 1e-6 ? 1 : 0));
}
export function fmtAxis(v: number, unit: Unit, step: number) {
  if (Math.abs(v) < 1e-9) return "0";
  switch (unit) {
    case "ms": return v >= 1000 ? trimZ((v / 1000).toFixed(decFor(step / 1000))) + "s" : v.toFixed(decFor(step)) + "ms";
    case "pct": return v.toFixed(decFor(step)) + "%";
    case "rps": case "errs": case "count":
      return Math.abs(v) >= 1000 ? (v / 1000).toFixed(decFor(step / 1000)) + "k" : v.toFixed(decFor(step));
    default: return v.toFixed(decFor(step));
  }
}
export function fmtVal(v: number | null | undefined, unit: Unit) {
  if (v == null || Number.isNaN(v)) return "No data";
  switch (unit) {
    case "ms": return v >= 1000 ? (v / 1000).toFixed(2) + " s" : (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v)) + " ms";
    case "pct": return v.toFixed(v < 10 ? 2 : 1) + "%";
    case "rps": return fmtK(v, v >= 1000 ? 2 : 1) + " req/s";
    case "errs": return fmtK(v, 2) + " err/s";
    case "count": return fmtK(v, 1);
    default: return fmtK(v, 2);
  }
}
function niceStep(range: number, count: number) {
  const raw = range / Math.max(1, count), mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}
export function yScale(lo: number, hi: number, plotH: number, auto: boolean, cap?: number) {
  const nt = clamp(Math.floor(plotH / 34), 2, 6);
  if (!(hi > lo)) hi = lo + (Math.abs(lo) || 1);
  const step = niceStep(auto ? hi - lo : hi, nt);
  let yMin = auto ? Math.floor(lo / step) * step : 0;
  let yMax = Math.ceil(hi / step) * step;
  if (yMax <= yMin) yMax = yMin + step;
  if (auto && (yMax - yMin) / step < 2) yMin -= step;
  if (cap != null && yMax > cap) yMax = cap;
  const ticks: number[] = [];
  for (let k = 0; ; k++) {
    const v = +(yMin + k * step).toFixed(10);
    if (v > yMax + step * 1e-6) break;
    ticks.push(v);
  }
  return { yMin, yMax, step, ticks };
}

let measure: CanvasRenderingContext2D | null | undefined;
/** The width of chart text in Noto Sans, to fit axis labels and event flags. */
export function textW(s: string, size = 10.5, weight = 400) {
  if (measure === undefined) measure = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!measure) return s.length * size * 0.55;
  measure.font = `${weight} ${size}px "Noto Sans", -apple-system, sans-serif`;
  return measure.measureText(s).width;
}

// ---------- Colors ----------

function hexRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
export function mixStops(stops: [number, string][], v: number) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], k = (v - a) / (b - a);
      const x = hexRgb(ca), y = hexRgb(cb);
      return `rgb(${x.map((c, j) => Math.round(c + (y[j] - c) * k)).join(",")})`;
    }
  }
  return stops[stops.length - 1][1];
}
export const CPU_STOPS: [number, string][] = [[0, "#3bb273"], [35, "#7cc242"], [55, "#d9c826"], [70, "#f5a623"], [85, "#e0373d"], [100, "#a8141a"]];
/** Green to red over 0-100: the host map's and the top list's fill. */
export const cpuColor = (v: number) => mixStops(CPU_STOPS, v);
export const heatStops = (dark: boolean): [number, string][] =>
  dark
    ? [[0, "#2b2140"], [0.25, "#43306b"], [0.5, "#6a44a8"], [0.75, "#9c6fe2"], [1, "#dcc4ff"]]
    : [[0, "#efe7fa"], [0.25, "#d3bdf0"], [0.5, "#a47bdc"], [0.75, "#7440bd"], [1, "#43127f"]];

/** For series with no color and no service. */
export const PALETTE = ["#3d6ecf", "#632ca6", "#1a9fb9", "#3bb273", "#f5a623", "#c2417a", "#a855f7", "#e0373d"];
