import { useRef } from "react";
import { Datadog, DAY, HOUR, MIN, SEC, useDatadog, cpuColor, type DataContext, type DatadogApp, type DatadogSeed, type MonitorStatus, type StreamEvent, type Widget } from "../apps/datadog";
import { FACES } from "./faces";

// apps/datadog.html's dashboard and data, driving the React version: the
// same services, hosts, monitors and events, and the same story (a deploy
// that halves checkout latency, then a 5xx incident from database pool
// exhaustion), computed from the time range and template variables.

// ---------- Deterministic pseudo-random data ----------

function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function hash2(a: number, b: number) {
  let h = Math.imul((a ^ 0x9e3779b9) | 0, 0x85ebca6b) ^ Math.imul(b | 0, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(seed: number, t: number, period: number) {
  const x = t / period, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = hash2(seed, i) * 2 - 1, b = hash2(seed, i + 1) * 2 - 1;
  return a + (b - a) * u;
}
const fbm = (seed: number, t: number, period: number) => vnoise(seed, t, period) * 0.6 + vnoise(seed + 7, t, period / 3.1) * 0.28 + vnoise(seed + 13, t, period / 9.7) * 0.12;
const jit = (seed: number, t: number) => hash2(seed + 99, Math.floor(t / 1000)) * 2 - 1;
const ramp = (t: number, t0: number, dur: number) => (t <= t0 ? 0 : Math.min(1, (t - t0) / dur));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pad2 = (n: number) => String(n).padStart(2, "0");

// Story anchors, relative to page load so the interesting parts are always in view.
const T0 = Math.floor(Date.now() / MIN) * MIN;
const DEPLOY_T = T0 - 38 * MIN; // Deploy #1482: checkout p95 drops from ~70ms to ~28ms
const INCIDENT_T = T0 - 14 * MIN; // checkout 5xx climbs past 2% (DB pool exhaustion)
const OLD_INC_T = T0 - 2 * DAY - 5 * HOUR; // resolved orders-service error spike

type Svc = { color: string; rps?: number; err?: number; lat?: number[]; post?: number[] };
const SVC: Record<string, Svc> = {
  "api-gateway": { color: "#632ca6", rps: 1850, err: 0.16, lat: [9, 24, 48] },
  "web-frontend": { color: "#3d6ecf", rps: 1240, err: 0.1, lat: [38, 96, 178] },
  checkout: { color: "#1a9fb9", rps: 420, err: 0.32, lat: [35, 70, 115], post: [14, 28, 46] },
  "orders-service": { color: "#3bb273", rps: 610, err: 0.2, lat: [22, 58, 104] },
  assessments: { color: "#f5a623", rps: 265, err: 0.26, lat: [60, 140, 258] },
  "postgres-primary": { color: "#a855f7" },
  "redis-cache": { color: "#c2417a" },
};
const WEB = ["api-gateway", "web-frontend", "checkout", "orders-service", "assessments"];
const EP_COLORS = ["#3d6ecf", "#632ca6", "#1a9fb9", "#3bb273", "#f5a623"];
type Ep = [string, number[], number[]?];
const EPS: Record<string, Ep[]> = {
  checkout: [
    ["POST /api/v1/checkout", [38, 72, 118], [15, 28, 46]],
    ["GET /api/v1/cart", [14, 34, 58], [8, 17, 29]],
    ["POST /api/v1/cart/items", [18, 46, 74], [10, 23, 38]],
    ["GET /api/v1/checkout/shipping-rates", [26, 62, 102], [13, 30, 48]],
    ["POST /api/v1/payments/authorize", [44, 92, 150], [30, 56, 88]],
  ],
  "api-gateway": [["GET /api/v1/*", [8, 22, 44]], ["POST /api/v1/*", [12, 30, 58]], ["WS /realtime", [5, 14, 30]], ["GET /healthz", [1, 3, 5]]],
  "web-frontend": [["GET /", [40, 96, 170]], ["GET /cart", [36, 88, 160]], ["GET /checkout", [52, 122, 210]], ["GET /assessments/:id", [44, 104, 188]]],
  "orders-service": [["POST /internal/orders", [26, 64, 112]], ["GET /internal/orders/:id", [10, 26, 48]], ["PATCH /internal/orders/:id/status", [18, 44, 80]]],
  assessments: [["POST /api/v1/assessments/:id/submit", [90, 210, 380]], ["GET /api/v1/assessments/:id", [30, 72, 130]], ["GET /api/v1/assessments", [40, 96, 170]]],
};

type Vars = Record<string, string>;
const scale = (v: Vars) => (v.env === "prod" ? 1 : 0.07) * (v.region === "us-east-1" ? 1 : 0.24);
const ctxSeed = (v: Vars, ...parts: (string | number)[]) => hashStr(parts.join("|") + "|" + v.env + "|" + v.region);
const incidentScope = (v: Vars) => v.env === "prod" && v.region === "us-east-1";
const focusSvc = (v: Vars) => (v.service === "*" ? "checkout" : v.service);
const svcsOf = (v: Vars) => (v.service === "*" ? WEB : [v.service]);
function diurnal(t: number) {
  const d = new Date(t);
  const h = d.getHours() + d.getMinutes() / 60;
  return 1 + 0.3 * Math.sin(((h - 9) / 24) * 2 * Math.PI);
}

function rps(v: Vars, svc: string, t: number) {
  const sd = ctxSeed(v, svc, "rps");
  return SVC[svc].rps! * scale(v) * diurnal(t) * (1 + 0.08 * fbm(sd, t, 25 * MIN) + 0.035 * jit(sd, t));
}
function errPct(v: Vars, svc: string, t: number) {
  const sd = ctxSeed(v, svc, "err");
  let x = SVC[svc].err! * (1 + 0.38 * fbm(sd, t, 14 * MIN) + 0.18 * jit(sd, t));
  if (incidentScope(v)) {
    const inc = ramp(t, INCIDENT_T, 3 * MIN);
    if (svc === "checkout") x += inc * (2.75 + 0.45 * fbm(sd + 3, t, 3 * MIN) + 0.12 * jit(sd + 5, t));
    if (svc === "api-gateway") x += inc * (0.48 + 0.08 * fbm(sd + 3, t, 3 * MIN));
    if (svc === "orders-service" && t > OLD_INC_T && t < OLD_INC_T + 42 * MIN) x += 1.45 * Math.sin((Math.PI * (t - OLD_INC_T)) / (42 * MIN)) * (1 + 0.2 * fbm(sd + 9, t, 4 * MIN));
  }
  return Math.max(0, x);
}
const errRate = (v: Vars, svc: string, t: number) => (rps(v, svc, t) * errPct(v, svc, t)) / 100;
function baseLat(pre: number[], post: number[] | undefined, q: number, t: number) {
  if (!post) return pre[q];
  return pre[q] + (post[q] - pre[q]) * ramp(t, DEPLOY_T, 100 * SEC);
}
function epLat(v: Vars, svc: string, ep: Ep, q: number, t: number) {
  const sd = ctxSeed(v, svc, ep[0], q);
  let x = baseLat(ep[1], ep[2], q, t);
  x *= (0.93 + 0.07 * diurnal(t)) * (1 + 0.1 * fbm(sd, t, 11 * MIN) + 0.05 * jit(sd, t));
  if (svc === "checkout" && incidentScope(v)) x *= 1 + ramp(t, INCIDENT_T, 3 * MIN) * (ep[0].includes("authorize") ? 0.55 : ep[0] === "POST /api/v1/checkout" ? 0.3 : 0.08);
  return x;
}
function svcLat(v: Vars, svc: string, q: number, t: number) {
  const sd = ctxSeed(v, svc, "lat", q);
  let x = baseLat(SVC[svc].lat!, SVC[svc].post, q, t);
  x *= (0.93 + 0.07 * diurnal(t)) * (1 + 0.09 * fbm(sd, t, 9 * MIN) + 0.04 * jit(sd, t));
  if (svc === "checkout" && incidentScope(v)) x *= 1 + ramp(t, INCIDENT_T, 3 * MIN) * 0.25;
  return x;
}
const apdex = (v: Vars, svc: string, t: number) => clamp(0.995 - errPct(v, svc, t) * 0.022 - Math.max(0, svcLat(v, svc, 1, t) - 50) / 900, 0, 1);
function pgConn(v: Vars, t: number) {
  const sd = ctxSeed(v, "pg", "conn");
  const base = v.env === "prod" ? (v.region === "us-east-1" ? 52 : 21) : 14;
  let x = base * (0.85 + 0.15 * diurnal(t)) * (1 + 0.07 * fbm(sd, t, 18 * MIN)) + 2 * jit(sd, t);
  if (incidentScope(v)) x += ramp(t, DEPLOY_T, 4 * MIN) * 9 + ramp(t, INCIDENT_T, 3 * MIN) * (30 + 2.5 * fbm(sd + 4, t, 2 * MIN));
  return clamp(x, 0, 100);
}
function redisHit(v: Vars, t: number) {
  const sd = ctxSeed(v, "redis", "hit");
  let x = 97.4 + 0.7 * fbm(sd, t, 20 * MIN) + 0.18 * jit(sd, t);
  if (incidentScope(v)) x -= ramp(t, INCIDENT_T, 4 * MIN) * 0.9;
  return clamp(x, 0, 100);
}
/** The mean over the last five minutes, as the mockup's query values and monitors read. */
function avgRecent(fn: (t: number) => number, end: number) {
  let s = 0;
  for (let i = 0; i < 10; i++) s += fn(end - i * 30 * SEC);
  return s / 10;
}

// ---------- Hosts ----------

interface HostDef { name: string; svc: string; env: string; region: string; az: string; base: number; seed: number; inc: number }
const HOSTS: HostDef[] = (() => {
  const out: HostDef[] = [];
  const add = (prefix: string, svc: string, n: number, env: string, region: string, base: number, inc = 0) => {
    for (let i = 1; i <= n; i++) {
      const sd = hashStr(prefix + i);
      out.push({ name: `${prefix}-${pad2(i)}`, svc, env, region, az: region + "abc"[(i - 1) % 3], base: base + (hash2(sd, 3) * 16 - 8), seed: sd, inc: inc * (0.75 + hash2(sd, 5) * 0.5) });
    }
  };
  add("prod-api-gw", "api-gateway", 6, "prod", "us-east-1", 36, 6);
  add("prod-web", "web-frontend", 6, "prod", "us-east-1", 31);
  add("prod-checkout", "checkout", 8, "prod", "us-east-1", 44, 24);
  add("prod-orders", "orders-service", 6, "prod", "us-east-1", 40, 9);
  add("prod-assess", "assessments", 4, "prod", "us-east-1", 27);
  add("prod-pg", "postgres-primary", 2, "prod", "us-east-1", 50, 21);
  add("prod-redis", "redis-cache", 3, "prod", "us-east-1", 21);
  add("dr-api-gw", "api-gateway", 2, "prod", "us-west-2", 14);
  add("dr-web", "web-frontend", 2, "prod", "us-west-2", 12);
  add("dr-checkout", "checkout", 2, "prod", "us-west-2", 16);
  add("dr-orders", "orders-service", 2, "prod", "us-west-2", 13);
  add("dr-pg", "postgres-primary", 1, "prod", "us-west-2", 22);
  add("stg-api-gw", "api-gateway", 1, "staging", "us-east-1", 11);
  add("stg-web", "web-frontend", 1, "staging", "us-east-1", 9);
  add("stg-checkout", "checkout", 2, "staging", "us-east-1", 13);
  add("stg-orders", "orders-service", 1, "staging", "us-east-1", 10);
  add("stg-assess", "assessments", 1, "staging", "us-east-1", 8);
  add("stg-pg", "postgres-primary", 1, "staging", "us-east-1", 15);
  add("stg-redis", "redis-cache", 1, "staging", "us-east-1", 6);
  return out;
})();
const hostsInScope = (v: Vars) => HOSTS.filter((h) => h.env === v.env && h.region === v.region && (v.service === "*" || h.svc === v.service));
function cpu(h: HostDef, t: number) {
  let x = h.base * (0.85 + 0.15 * diurnal(t)) + 9 * fbm(h.seed, t, 35 * MIN) + 2.5 * jit(h.seed, t);
  if (h.inc && h.env === "prod" && h.region === "us-east-1") x += h.inc * ramp(t, INCIDENT_T, 4 * MIN);
  return clamp(x, 1, 99);
}
const noHosts = (c: DataContext) => `No hosts match env:${c.vars.env} region:${c.vars.region}`;

// ---------- Events and monitors ----------

const EVENTS: (StreamEvent & { inc?: boolean })[] = [
  { at: DEPLOY_T, kind: "deploy", title: "Deploy #1482", text: "checkout v1.482.0 rolled out to prod (12/12 pods) by Marcus Chen", service: "checkout", major: true },
  { at: DEPLOY_T + 11 * MIN, kind: "watchdog", title: "Watchdog: latency improvement on checkout", text: "p95 of POST /api/v1/checkout dropped 61% after Deploy #1482" },
  { at: INCIDENT_T + 2 * MIN, kind: "alert", title: "Triggered: [P1] checkout 5xx rate above 2%", text: "service:checkout env:prod - value 3.08%", inc: true },
  { at: INCIDENT_T + 2.5 * MIN, kind: "pagerduty", title: "Hana Kim acknowledged the page", text: "Casuro Platform Primary escalation policy", inc: true },
  { at: INCIDENT_T + 3 * MIN, kind: "incident", title: "Incident IR-214 declared (SEV-2)", text: "Elevated 5xx on checkout - commander Dev Patel", inc: true },
  { at: INCIDENT_T + 6 * MIN, kind: "k8s", title: "HPA scaled checkout from 8 to 12 pods", text: "kube_deployment:checkout kube_namespace:payments", inc: true },
  { at: T0 - 3 * HOUR - 20 * MIN, kind: "aws", title: "EC2 scheduled maintenance completed", text: "prod-redis-02 (us-east-1b) rebooted, replica resynced" },
  { at: T0 - 7 * HOUR - 12 * MIN, kind: "deploy", title: "Deploy #1481", text: "orders-service v3.18.2 rolled out to prod by Sofia Alvarez", service: "orders-service" },
  { at: T0 - DAY - 3 * HOUR, kind: "deploy", title: "Deploy #1480", text: "web-frontend v5.40.0 rolled out to prod by Lena Okafor", service: "web-frontend" },
  { at: OLD_INC_T + 40 * MIN, kind: "ok", title: "Recovered: orders-service error rate above 1%", text: "service:orders-service env:prod", inc: true },
  { at: OLD_INC_T + 3 * MIN, kind: "alert", title: "Triggered: orders-service error rate above 1%", text: "service:orders-service env:prod - value 1.52%", inc: true },
  { at: OLD_INC_T - 20 * MIN, kind: "deploy", title: "Deploy #1479", text: "orders-service v3.18.0 with schema migration by Sofia Alvarez", service: "orders-service" },
];

const lvl = (v: number, crit: number, warn: number): MonitorStatus => (v >= crit ? "alert" : v >= warn ? "warn" : "ok");
const mon = (fn: (v: Vars, t: number) => number, crit: number, warn: number) => (c: DataContext) => lvl(avgRecent((t) => fn(c.vars, t), c.end), crit, warn);

// ---------- The dashboard ----------

const svcQuery = (c: DataContext, q: string) => q.replace("$focus", focusSvc(c.vars));

function qvData(c: DataContext, fn: (t: number) => number) {
  return { value: avgRecent(fn, c.end), spark: c.times.map(fn) };
}

const WIDGETS: Widget[] = [
  {
    id: "note", kind: "note", span: 4, rows: 2, wideOnTablet: true,
    heading: "Production Overview",
    text: "Golden signals for Casuro's customer-facing services, owned by the Platform team.",
    oncall: ["hana", "marcus"],
  },
  {
    id: "qv-err", kind: "query_value", span: 2, rows: 2, title: "5xx error rate", context: (c) => focusSvc(c.vars),
    query: (c) => svcQuery(c, "sum:trace.http.request.errors{service:$focus,env:$env,region:$region}.as_rate() / sum:trace.http.request.hits{service:$focus,env:$env,region:$region}.as_rate() * 100"),
    data: (c) => qvData(c, (t) => errPct(c.vars, focusSvc(c.vars), t)),
    unit: "%", decimals: 2, rules: [{ tone: "bad", above: 2 }, { tone: "warn", above: 1 }, { tone: "good" }], caption: "avg, last 5 minutes",
  },
  {
    id: "qv-apdex", kind: "query_value", span: 2, rows: 2, title: "Apdex", context: (c) => focusSvc(c.vars),
    query: (c) => svcQuery(c, "avg:trace.http.request.apdex{service:$focus,env:$env,region:$region}"),
    data: (c) => qvData(c, (t) => apdex(c.vars, focusSvc(c.vars), t)),
    decimals: 2, rules: [{ tone: "good", above: 0.94 }, { tone: "warn", above: 0.85 }, { tone: "bad" }], caption: "target 0.94, T = 100ms",
  },
  {
    id: "qv-p99", kind: "query_value", span: 2, rows: 2, title: "p99 latency", context: (c) => focusSvc(c.vars),
    query: (c) => svcQuery(c, "p99:trace.http.request{service:$focus,env:$env,region:$region}"),
    data: (c) => qvData(c, (t) => svcLat(c.vars, focusSvc(c.vars), 2, t)),
    unit: "ms", rules: [{ tone: "good", below: 150 }, { tone: "warn", below: 300 }, { tone: "bad" }], caption: "green below 150ms",
  },
  {
    id: "qv-rps", kind: "query_value", span: 2, rows: 2, title: "Throughput", context: (c) => (c.vars.service === "*" ? "all services" : c.vars.service),
    query: "sum:trace.http.request.hits{service:$service,env:$env,region:$region}.as_rate()",
    data: (c) => qvData(c, (t) => svcsOf(c.vars).reduce((a, s) => a + rps(c.vars, s, t), 0)),
    unit: "req/s", compact: true, caption: "sum, last 5 minutes",
  },
  {
    id: "ts-rps", kind: "timeseries", display: "stacked", unit: "rps", span: 6, rows: 4, title: "Requests per second", context: "by service",
    query: "sum:trace.http.request.hits{env:$env,region:$region,service:$service} by {service}.as_rate()",
    series: (c) => svcsOf(c.vars).map((s) => ({ key: s, points: c.times.map((t) => [t, rps(c.vars, s, t)]) })),
  },
  {
    id: "ts-lat", kind: "timeseries", display: "line", unit: "ms", span: 6, rows: 4, title: "p95 latency by endpoint", context: (c) => `service:${focusSvc(c.vars)}`,
    query: (c) => svcQuery(c, "p95:trace.http.request{service:$focus,env:$env,region:$region} by {resource_name}"),
    markers: (e, c) => e.kind === "deploy" && (e.service === focusSvc(c.vars) || c.vars.service === "*"),
    series: (c) => {
      const svc = focusSvc(c.vars);
      return EPS[svc].map((e, i) => ({ key: e[0], color: EP_COLORS[i % EP_COLORS.length], points: c.times.map((t) => [t, epLat(c.vars, svc, e, 1, t)]) }));
    },
  },
  {
    id: "ts-err", kind: "timeseries", display: "bars", unit: "errs", span: 4, rows: 4, title: "Errors by service", context: "5xx per second", markers: false,
    query: "sum:trace.http.request.errors{env:$env,region:$region,service:$service} by {service}.as_rate()",
    series: (c) =>
      svcsOf(c.vars).map((s) => ({
        key: s,
        points: c.times.map((t) => {
          let v = 0;
          for (let k = 0; k < 6; k++) v += errRate(c.vars, s, t + (c.step * k) / 6);
          return [t, v / 6];
        }),
      })),
  },
  {
    id: "heat", kind: "heatmap", span: 4, rows: 4, title: "Latency distribution", context: (c) => `service:${focusSvc(c.vars)}`,
    query: (c) => svcQuery(c, "histogram:trace.http.request.duration{service:$focus,env:$env,region:$region}"),
    data: (c) => {
      const v = c.vars, svc = focusSvc(v), step = c.step;
      const edges = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512];
      const erf = (x: number) => {
        const s = Math.sign(x);
        x = Math.abs(x);
        const k = 1 / (1 + 0.3275911 * x);
        return s * (1 - ((((1.061405429 * k - 1.453152027) * k + 1.421413741) * k - 0.284496736) * k + 0.254829592) * k * Math.exp(-x * x));
      };
      const cdf = (x: number, mu: number, sg: number) => 0.5 * (1 + erf((Math.log(x) - mu) / (sg * Math.SQRT2)));
      const columns = [];
      for (let t = Math.floor(c.start / step) * step; t < c.end; t += step) {
        const tm = Math.min(t + step / 2, c.end);
        const p50 = svcLat(v, svc, 0, tm), p95 = svcLat(v, svc, 1, tm);
        const mu = Math.log(p50), sg = Math.max(0.15, Math.log(p95 / p50) / 1.645);
        const total = (rps(v, svc, tm) * Math.min(step, c.end - t)) / 1000;
        const counts = [];
        for (let b = 0; b < edges.length - 1; b++) {
          const lo = b === 0 ? 1e-6 : edges[b], hi = b === edges.length - 2 ? 1e9 : edges[b + 1];
          const noise = 1 + 0.12 * (hash2(hashStr(svc + b), Math.floor(t / step)) - 0.5);
          counts.push(Math.max(0, total * (cdf(hi, mu, sg) - cdf(lo, mu, sg)) * noise));
        }
        columns.push({ start: Math.max(t, c.start), end: Math.min(t + step, c.end), counts });
      }
      return { edges, columns };
    },
  },
  {
    id: "top", kind: "toplist", span: 4, rows: 4, title: "Top hosts by CPU", context: "avg:system.cpu.user",
    query: "top(avg:system.cpu.user{env:$env,region:$region,service:$service} by {host}, 10, 'mean', 'desc')",
    empty: noHosts,
    items: (c) =>
      hostsInScope(c.vars)
        .map((h) => ({ h, v: avgRecent((t) => cpu(h, t), c.end) }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 10)
        .map(({ h, v }) => ({ name: h.name, value: v, color: cpuColor(v), tip: `${h.name} - ${h.svc}, ${h.az}` })),
  },
  {
    id: "slo", kind: "slo", span: 4, rows: 4, title: "Checkout availability SLO", context: "99.9% target",
    query: "slo:checkout-availability{env:$env}",
    data: (c) => {
      const v = c.vars;
      const d = v.env !== "prod" ? [99.98, 99.97, 99.96, 71.2, 0.4, 0.3]
        : !incidentScope(v) ? [99.99, 99.98, 99.97, 83.5, 0.2, 0.2]
        : c.end > INCIDENT_T ? [99.86, 99.92, 99.95, 21.6, 14.2, 3.1] : [99.94, 99.95, 99.96, 47.9, 0.8, 0.6];
      return { target: 99.9, d7: d[0], d30: d[1], d90: d[2], budget: d[3], burn1h: d[4], burn6h: d[5] };
    },
  },
  { id: "mon", kind: "monitor_summary", span: 4, rows: 4, title: "Monitor summary", context: "team:platform", query: "monitors{team:platform,env:$env}" },
  {
    id: "hex", kind: "hostmap", span: 4, rows: 4, title: "Host map", context: "fill: CPU %",
    query: "avg:system.cpu.user{env:$env,region:$region,service:$service} by {host}",
    empty: noHosts,
    hosts: (c) => hostsInScope(c.vars).map((h) => ({ name: h.name, value: avgRecent((t) => cpu(h, t), c.end), tags: { Service: h.svc, Zone: h.az, Env: h.env } })),
  },
  {
    id: "events", kind: "event_stream", span: 4, rows: 4, title: "Event stream", context: "sources: deploy, monitor, incident",
    query: 'events("sources:deploy,monitor,incident,kubernetes,aws env:$env")',
  },
  {
    id: "ts-db", kind: "timeseries", display: "area", unit: "pct", span: 4, rows: 4, logo: "postgresql", title: "postgres-primary connections", context: "% of max_connections",
    query: "max:postgresql.percent_usage_connections{db:postgres-primary,env:$env,region:$region} * 100",
    yMax: 100,
    markers: (e) => e.kind === "deploy" && !!e.major,
    thresholds: [{ value: 95, color: "var(--alert)", label: "Critical 95%", fill: true }, { value: 85, color: "var(--warn)", label: "Warning 85%" }],
    series: (c) => [{ key: "postgres-primary", points: c.times.map((t) => [t, pgConn(c.vars, t)]) }],
  },
  {
    id: "ts-cache", kind: "timeseries", display: "line", unit: "pct", span: 4, rows: 4, logo: "redis", title: "redis-cache hit ratio", context: "keyspace hits / lookups",
    query: "sum:redis.stats.keyspace_hits{env:$env,region:$region} / (sum:redis.stats.keyspace_hits{env:$env,region:$region} + sum:redis.stats.keyspace_misses{env:$env,region:$region}) * 100",
    yAuto: true, yMax: 100, legend: false, markers: false,
    series: (c) => [{ key: "redis-cache", points: c.times.map((t) => [t, redisHit(c.vars, t)]) }],
  },
];

export const DATADOG_DEMO: DatadogSeed = {
  org: { name: "Casuro", host: "app.datadoghq.com", site: "US1" },
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", photo: FACES.naman },
    hana: { name: "Hana Kim", photo: FACES.hana },
    marcus: { name: "Marcus Chen", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", photo: FACES.sofia },
    dev: { name: "Dev Patel", photo: FACES.dev },
    lena: { name: "Lena Okafor", photo: FACES.lena },
  },
  services: Object.fromEntries(Object.entries(SVC).map(([k, s]) => [k, { color: s.color }])),
  variables: [
    { name: "env", options: ["prod", "staging"] },
    { name: "service", options: ["*", ...WEB] },
    { name: "region", options: ["us-east-1", "us-west-2"] },
  ],
  time: "1h",
  monitors: [
    { id: "m1", name: "[P1] checkout 5xx rate above 2%", owner: "dev", status: mon((v, t) => errPct(v, "checkout", t), 2, 1) },
    { id: "m2", name: "[P2] postgres-primary connections above 95%", owner: "marcus", status: mon(pgConn, 95, 85) },
    { id: "m3", name: "[P3] api-gateway 5xx rate above 1%", owner: "hana", status: mon((v, t) => errPct(v, "api-gateway", t), 1, 0.5) },
    { id: "m4", name: "[P2] checkout p95 latency above 150ms", owner: "hana", status: mon((v, t) => svcLat(v, "checkout", 1, t), 150, 100) },
    { id: "m5", name: "orders-service error rate above 1%", owner: "sofia", status: mon((v, t) => errPct(v, "orders-service", t), 1, 0.75) },
    { id: "m6", name: "redis-cache memory usage above 80%", owner: "lena", status: "ok" },
    { id: "m7", name: "Disk usage above 85% on {{host.name}}", owner: "marcus", status: "ok" },
    { id: "m8", name: "web-frontend LCP p75 above 2.5s", owner: "lena", status: "ok" },
    { id: "m9", name: "Kubernetes pods in CrashLoopBackOff", owner: "dev", status: "ok" },
    { id: "m10", name: "assessments SLO burn rate above 2x", owner: "sofia", status: "ok" },
    { id: "m11", name: "Agent heartbeat missing on stg-assess-01", owner: "naman", status: "nodata" },
    { id: "m12", name: "checkout synthetic smoke test (staging)", owner: "dev", status: "nodata" },
  ],
  events: (c) => EVENTS.filter((e) => !e.inc || incidentScope(c.vars)),
  dashboard: { title: "Casuro Platform - Production Overview", shortTitle: "Production Overview", folder: "Platform", starred: true, widgets: WIDGETS },
};

export function DatadogPreview() {
  const ref = useRef<DatadogApp | null>(null);
  const datadog = useDatadog(DATADOG_DEMO, {
    onEvent(event) {
      const d = ref.current!;
      if (event.type === "nav") d.toast(`${event.item} isn't part of this mockup`);
      if (event.type === "edit_widget") d.toast("The widget editor isn't part of this mockup");
      if (event.type === "logout") d.toast("Logged out of Casuro (mockup)");
    },
  });
  ref.current = datadog;
  return <Datadog datadog={datadog} />;
}
