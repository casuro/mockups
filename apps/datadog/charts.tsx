import { useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useSize, useUI } from "./context";
import {
  clamp,
  CPU_STOPS,
  cpuColor,
  fmtAxis,
  fmtClock,
  fmtFull,
  fmtK,
  fmtVal,
  heatStops,
  MIN,
  mixStops,
  PALETTE,
  textW,
  timeTicks,
  yScale,
} from "./format";
import type { HeatmapData, Host, HostMapWidget, Series, TimeseriesWidget, Unit } from "./types";
import type { ListedEvent, ResolvedWidget } from "./use-datadog";

// The SVG charts of apps/datadog.html: timeseries (line, area, stacked area,
// stacked bars) with crosshair, tooltip, legend and event markers; the
// latency heatmap; the hexagon host map; the query value's sparkline.

interface Drawn {
  key: string;
  name: string;
  color: string;
  values: (number | null)[];
}

function pathFor(xs: number[], ys: (number | null)[]) {
  let d = "", pen = false;
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y == null || Number.isNaN(y)) {
      pen = false;
      continue;
    }
    d += (pen ? "L" : "M") + xs[i].toFixed(1) + " " + y.toFixed(1);
    pen = true;
  }
  return d;
}

/** The pointer relative to the chart's svg, and in the window. */
function pointer(e: ReactPointerEvent, box: HTMLElement | null) {
  const svg = box?.querySelector("svg");
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
}

// ---------- Timeseries ----------

export function Timeseries({ rw, full = false }: { rw: ResolvedWidget; full?: boolean }) {
  const { app, showChartTip, hideChartTip, fontsReady } = useUI();
  const w = rw.widget as TimeseriesWidget;
  const box = useRef<HTMLDivElement>(null);
  const { w: W, h: H } = useSize(box);
  const cid = "cp" + useId().replace(/[^a-z0-9]/gi, "");
  const [hover, setHover] = useState<number | null>(null);
  const hiddenList = app.state.hidden[w.id];
  const unit = w.unit ?? "number";

  const series: Drawn[] = useMemo(() => {
    const list = (rw.data as Series[] | undefined) ?? [];
    const ts = list[0]?.points.map((p) => p[0]) ?? [];
    return list.map((s, i) => ({
      key: s.key,
      name: s.name ?? s.key,
      color: s.color ?? app.seed.services?.[s.key]?.color ?? PALETTE[i % PALETTE.length],
      // Series of one widget share their times: values line up by index.
      values: ts.map((_, j) => s.points[j]?.[1] ?? null),
    }));
  }, [rw.data, app.seed.services]);
  const ts = useMemo(() => ((rw.data as Series[] | undefined)?.[0]?.points ?? []).map((p) => p[0]), [rw.data]);

  const events: ListedEvent[] = useMemo(() => {
    if (w.markers === false) return [];
    const pick = typeof w.markers === "function" ? w.markers : (e: ListedEvent) => e.kind === "deploy";
    return app.view.events.filter((e) => pick(e, rw.ctx));
  }, [w.markers, app.view.events, rw.ctx]);

  const g = useMemo(() => {
    const hid = new Set(hiddenList ?? []);
    const vis = series.filter((s) => !hid.has(s.key));
    if (W < 60 || H < 50) return null;
    const { start, end } = rw.ctx;
    const n = ts.length;
    const stacked = w.display === "stacked" || w.display === "bars";
    let lo = Infinity, hi = -Infinity;
    const cum = vis.map(() => new Array<number>(n));
    if (stacked) {
      for (let i = 0; i < n; i++) {
        let acc = 0;
        vis.forEach((s, j) => {
          acc += s.values[i] ?? 0;
          cum[j][i] = acc;
        });
        hi = Math.max(hi, acc);
      }
      lo = 0;
    } else {
      for (const s of vis) for (const v of s.values) if (v != null) { if (v > hi) hi = v; if (v < lo) lo = v; }
    }
    const empty = !vis.length || !Number.isFinite(hi);
    if (empty) { lo = 0; hi = 1; }
    for (const th of w.thresholds ?? []) if (th.value <= Math.max(hi, 1e-9) * 1.7) hi = Math.max(hi, th.value * 1.04);
    const top = events.length ? 22 : 8, bottom = 20;
    const plotH = Math.max(10, H - top - bottom);
    const ys = yScale(w.yAuto ? lo : 0, hi, plotH, !!w.yAuto, w.yMax);
    const labels = ys.ticks.map((v) => fmtAxis(v, unit, ys.step));
    const L = Math.ceil(Math.max(...labels.map((l) => textW(l)))) + 10, R = 8;
    const plotW = Math.max(10, W - L - R);
    const X = (t: number) => L + ((t - start) / (end - start)) * plotW;
    const Y = (v: number) => top + plotH - ((v - ys.yMin) / (ys.yMax - ys.yMin)) * plotH;
    const step = ts.length > 1 ? ts[1] - ts[0] : rw.ctx.step;
    const barStep = w.display === "bars" ? step : 0;
    const centers = ts.map((t) => t + barStep / 2);
    const xs = ts.map(X);

    const layer: ReactNode[] = [];
    ys.ticks.forEach((v, i) => {
      const y = Math.round(Y(v)) + 0.5;
      layer.push(<line key={`g${i}`} className={i === 0 ? "ax" : "gl"} x1={L} x2={L + plotW} y1={y} y2={y} />);
      layer.push(<text key={`gl${i}`} x={L - 6} y={y + 3.5} textAnchor="end">{labels[i]}</text>);
    });
    let lastRight = -Infinity;
    for (const tk of timeTicks(start, end, plotW)) {
      const x = X(tk.t), tw = textW(tk.label);
      if (x - tw / 2 < L - 2 || x + tw / 2 > W || x - tw / 2 < lastRight + 8) continue;
      layer.push(<line key={`xt${tk.t}`} className="ax" x1={Math.round(x) + 0.5} x2={Math.round(x) + 0.5} y1={top + plotH} y2={top + plotH + 4} />);
      layer.push(<text key={`xl${tk.t}`} x={x.toFixed(1)} y={top + plotH + 15} textAnchor="middle">{tk.label}</text>);
      lastRight = x + tw / 2;
    }
    (w.thresholds ?? []).forEach((th, i) => {
      if (th.value > ys.yMax || th.value < ys.yMin) return;
      const y = Math.round(Y(th.value)) + 0.5;
      if (th.fill) layer.push(<rect key={`tf${i}`} x={L} y={top} width={plotW} height={Math.max(0, y - top)} style={{ fill: th.color, opacity: 0.07 }} />);
      layer.push(<line key={`tl${i}`} className="th-line" x1={L} x2={L + plotW} y1={y} y2={y} style={{ stroke: th.color }} />);
      layer.push(<text key={`tt${i}`} className="th-lbl" x={L + 4} y={y - 4} style={{ fill: th.color }}>{th.label}</text>);
    });

    const marks: ReactNode[] = [];
    if (!empty) {
      if (w.display === "stacked") {
        for (let j = vis.length - 1; j >= 0; j--) {
          const up = cum[j].map(Y), dn = j ? cum[j - 1].map(Y) : xs.map(() => Y(0));
          let d = "M" + xs.map((x, i) => x.toFixed(1) + " " + up[i].toFixed(1)).join("L");
          for (let i = n - 1; i >= 0; i--) d += "L" + xs[i].toFixed(1) + " " + dn[i].toFixed(1);
          marks.push(<path key={vis[j].key} d={d + "Z"} fill={vis[j].color} fillOpacity=".78" stroke={vis[j].color} strokeWidth="1" strokeLinejoin="round" />);
        }
      } else if (w.display === "bars") {
        const bw = Math.max(1, ((plotW * step) / (end - start)) * 0.72);
        vis.forEach((s, j) => {
          let d = "";
          for (let i = 0; i < n; i++) {
            const y1 = Y(cum[j][i]), y0 = j ? Y(cum[j - 1][i]) : Y(0), h = y0 - y1;
            if (h <= 0.05) continue;
            d += `M${(X(centers[i]) - bw / 2).toFixed(1)} ${y1.toFixed(1)}h${bw.toFixed(1)}v${h.toFixed(1)}h${(-bw).toFixed(1)}Z`;
          }
          marks.push(<path key={s.key} d={d} fill={s.color} />);
        });
      } else {
        for (const s of vis) {
          const yv = s.values.map((v) => (v == null ? null : Y(v)));
          const d = pathFor(xs, yv);
          if (w.display === "area" && d)
            marks.push(<path key={`${s.key}a`} d={`${d}L${xs[n - 1].toFixed(1)} ${Y(ys.yMin).toFixed(1)}L${xs[0].toFixed(1)} ${Y(ys.yMin).toFixed(1)}Z`} fill={s.color} fillOpacity=".14" />);
          marks.push(<path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />);
        }
      }
    }

    const flags: { l: number; r: number }[] = [];
    const evs: ReactNode[] = [];
    events.forEach((e, i) => {
      if (X(e.at) < L || X(e.at) > L + plotW) return;
      const x = Math.round(X(e.at)) + 0.5;
      const lw = textW(e.title, 10, 600) + 10;
      const fx = x + lw > W ? x - lw : x;
      const clash = flags.some((f) => fx < f.r + 4 && fx + lw > f.l - 4);
      const flag = !clash && (e.major || lw < plotW / 2);
      if (flag) flags.push({ l: fx, r: fx + lw });
      evs.push(
        <g key={e.id} className="ev" data-i={i}>
          <line className="ev-line" x1={x} x2={x} y1={top - 4} y2={top + plotH} />
          <line className="ev-hit" x1={x} x2={x} y1={top - 6} y2={top + plotH} />
          {flag ? (
            <g className="ev-flag">
              <rect x={fx.toFixed(1)} y="2" width={lw.toFixed(1)} height="15" rx="2" />
              <text x={(fx + 5).toFixed(1)} y="13">{e.title}</text>
            </g>
          ) : (
            <path d={`M${x - 4} ${top - 9}h8l-4 5z`} fill="#632ca6" />
          )}
        </g>
      );
    });

    const nearest = (t: number) => {
      if (!n) return -1;
      let a = 0, b = n - 1;
      while (b - a > 1) {
        const m = (a + b) >> 1;
        if (centers[m] < t) a = m;
        else b = m;
      }
      return Math.abs(centers[a] - t) <= Math.abs(centers[b] - t) ? a : b;
    };

    return { vis, cum, stacked, empty, top, plotH, plotW, L, X, Y, ys, centers, layer, marks, evs, nearest, step, start, end };
  }, [series, hiddenList, ts, events, W, H, w.display, w.thresholds, w.yAuto, w.yMax, unit, rw.ctx, fontsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => {
    setHover(null);
    hideChartTip();
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!g) return;
    const p = pointer(e, box.current);
    if (!p) return;
    const ev = (e.target as Element).closest?.(".ev") as SVGGElement | null;
    if (ev) {
      setHover(null);
      const x = events[Number(ev.dataset.i)];
      showChartTip(
        <>
          <h5>{x.title}</h5>
          {x.text ? <div>{x.text}</div> : null}
          <div className="th" style={{ margin: "4px 0 0" }}>{fmtFull(x.at, true)}</div>
        </>,
        p.cx,
        p.cy
      );
      return;
    }
    if (!(p.x >= g.L && p.x <= g.L + g.plotW && p.y >= g.top - 2 && p.y <= g.top + g.plotH + 2)) return clear();
    const t = g.start + ((p.x - g.L) / g.plotW) * (g.end - g.start);
    const ly = clamp(p.y, g.top, g.top + g.plotH);
    const i = g.nearest(t);
    if (i < 0 || g.empty) return clear();
    setHover(i);
    const rows = g.vis.map((s, j) => ({ s, v: s.values[i], y: g.stacked ? g.cum[j][i] : s.values[i], lo: g.stacked ? (j ? g.cum[j - 1][i] : 0) : null }));
    let hl: (typeof rows)[number] | null = null;
    if (g.stacked) hl = rows.find((r) => r.y != null && ly <= g.Y(r.lo ?? 0) && ly >= g.Y(r.y)) ?? null;
    else {
      let best = 1e9;
      for (const r of rows) if (r.v != null) { const dd = Math.abs(g.Y(r.v) - ly); if (dd < best) { best = dd; hl = r; } }
      if (best > 24) hl = null;
    }
    rows.sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
    const shown = rows.slice(0, 10);
    const t0 = ts[i], sec = g.step < MIN;
    const head = w.display === "bars" ? `${fmtFull(t0, sec)} - ${fmtClock(t0 + g.step, sec)}` : fmtFull(t0, sec);
    showChartTip(
      <>
        <div className="th">{head}</div>
        {shown.map((r) => (
          <div key={r.s.key} className={`tr${r === hl ? " hl" : ""}`}>
            <i style={{ background: r.s.color }} />
            <span className="n">{r.s.name}</span>
            <span className="v">{fmtVal(r.v, unit)}</span>
          </div>
        ))}
        {rows.length > shown.length ? <div className="more">+{rows.length - shown.length} more</div> : null}
      </>,
      p.cx,
      p.cy
    );
  };

  const hid = new Set(hiddenList ?? []);
  let crosshair: ReactNode = null;
  if (g && hover != null && hover < ts.length && !g.empty) {
    const x = Math.round(g.X(g.centers[hover])) + 0.5;
    crosshair = (
      <>
        <line className="xh" x1={x} x2={x} y1={g.top} y2={g.top + g.plotH} />
        {w.display !== "bars"
          ? g.vis.map((s, j) => {
              const v = g.stacked ? g.cum[j][hover] : s.values[hover];
              return v == null ? null : <circle key={s.key} className="xh-dot" cx={x} cy={g.Y(v).toFixed(1)} r="3" fill={s.color} />;
            })
          : null}
      </>
    );
  }

  return (
    <div className="ch" onPointerMove={onMove} onPointerLeave={clear}>
      <div className="ch-svg" ref={box}>
        {g ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rw.title || "chart"}>
            <defs>
              <clipPath id={cid}>
                <rect x={g.L} y={g.top - 1} width={g.plotW} height={g.plotH + 2} />
              </clipPath>
            </defs>
            {g.layer}
            <g clipPath={`url(#${cid})`}>{g.marks}</g>
            {g.empty ? (
              <text className="nodata-t" x={g.L + g.plotW / 2} y={g.top + g.plotH / 2} textAnchor="middle">
                {g.vis.length ? "No data" : "All series hidden"}
              </text>
            ) : null}
            {g.evs}
            {crosshair}
          </svg>
        ) : null}
      </div>
      {full ? (
        <LegendTable series={series} hidden={hid} unit={unit} onToggle={(k) => app.ui.toggleSeries(w.id, k)} />
      ) : w.legend === false ? null : (
        <div className="ch-legend">
          {series.map((s) => (
            <button key={s.key} className={`lg${hid.has(s.key) ? " off" : ""}`} title="Click to show or hide" onClick={() => app.ui.toggleSeries(w.id, s.key)}>
              <i style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LegendTable({ series, hidden, unit, onToggle }: { series: Drawn[]; hidden: Set<string>; unit: Unit; onToggle: (key: string) => void }) {
  return (
    <div className="lg-table">
      <table>
        <thead>
          <tr><th>Series</th><th>Avg</th><th>Min</th><th>Max</th><th>Value</th></tr>
        </thead>
        <tbody>
          {series.map((s) => {
            const v = s.values.filter((x): x is number => x != null);
            const avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
            return (
              <tr key={s.key} className={hidden.has(s.key) ? "off" : ""} onClick={() => onToggle(s.key)}>
                <td><span className="nm"><i style={{ background: s.color }} />{s.name}</span></td>
                <td>{fmtVal(avg, unit)}</td>
                <td>{fmtVal(v.length ? Math.min(...v) : null, unit)}</td>
                <td>{fmtVal(v.length ? Math.max(...v) : null, unit)}</td>
                <td>{fmtVal(v.length ? v[v.length - 1] : null, unit)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Heatmap ----------

export function Heatmap({ rw }: { rw: ResolvedWidget }) {
  const { app, showChartTip, hideChartTip, fontsReady } = useUI();
  const box = useRef<HTMLDivElement>(null);
  const { w: W, h: H } = useSize(box);
  const data = rw.data as HeatmapData | undefined;
  const dark = app.state.theme === "dark";

  const g = useMemo(() => {
    if (!data || W < 60 || H < 50 || data.edges.length < 2) return null;
    const { start, end } = rw.ctx, top = 6, bottom = 20;
    const plotH = H - top - bottom;
    const nb = data.edges.length - 1;
    const every = plotH / nb < 13 ? 2 : 1;
    const lbls = data.edges.map((e) => (e >= 1000 ? e / 1000 + "s" : e + "ms"));
    const L = Math.ceil(Math.max(...lbls.map((l) => textW(l)))) + 10, R = 8, plotW = W - L - R;
    const X = (t: number) => L + ((t - start) / (end - start)) * plotW;
    const rowH = plotH / nb;
    let max = 0;
    for (const col of data.columns) for (const v of col.counts) max = Math.max(max, v);
    const stops = heatStops(dark);
    const cells: ReactNode[] = [];
    data.columns.forEach((col, ci) => {
      const x0 = Math.max(L, X(col.start)), x1 = Math.min(L + plotW, X(col.end));
      if (x1 <= x0) return;
      col.counts.forEach((v, b) => {
        if (v < max * 0.004) return;
        cells.push(
          <rect key={`${ci}:${b}`} className="cell" x={x0.toFixed(2)} y={(top + plotH - (b + 1) * rowH).toFixed(2)} width={(x1 - x0 + 0.35).toFixed(2)} height={(rowH + 0.35).toFixed(2)} fill={mixStops(stops, Math.sqrt(v / max))} />
        );
      });
    });
    const axis: ReactNode[] = [];
    data.edges.forEach((_, i) => {
      if (i % every) return;
      const y = top + plotH - i * rowH;
      axis.push(<text key={`y${i}`} x={L - 6} y={(y + 3.5).toFixed(1)} textAnchor="end">{lbls[i]}</text>);
    });
    let lastRight = -Infinity;
    for (const tk of timeTicks(start, end, plotW)) {
      const x = X(tk.t), tw = textW(tk.label);
      if (x - tw / 2 < L - 2 || x + tw / 2 > W || x - tw / 2 < lastRight + 8) continue;
      axis.push(<text key={`x${tk.t}`} x={x.toFixed(1)} y={top + plotH + 15} textAnchor="middle">{tk.label}</text>);
      lastRight = x + tw / 2;
    }
    return { L, top, plotW, plotH, rowH, nb, lbls, start, end, cells, axis };
  }, [data, W, H, rw.ctx, dark, fontsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (e: ReactPointerEvent) => {
    if (!g || !data) return;
    const p = pointer(e, box.current);
    if (!p) return;
    if (!(p.x >= g.L && p.x <= g.L + g.plotW && p.y >= g.top - 2 && p.y <= g.top + g.plotH + 2)) return hideChartTip();
    const t = g.start + ((p.x - g.L) / g.plotW) * (g.end - g.start);
    const col = data.columns.find((c) => t >= c.start && t < c.end);
    if (!col) return hideChartTip();
    const ly = clamp(p.y, g.top, g.top + g.plotH);
    const b = clamp(Math.floor((g.top + g.plotH - ly) / g.rowH), 0, g.nb - 1);
    const total = col.counts.reduce((a, v) => a + v, 0);
    const sec = rw.ctx.step < MIN;
    showChartTip(
      <>
        <div className="th">{fmtFull(col.start, sec)} - {fmtClock(col.end, sec)}</div>
        <div className="kv">
          <span>Latency</span><span>{g.lbls[b]} - {g.lbls[b + 1]}</span>
          <span>Requests</span><span>{fmtK(col.counts[b], 1)}</span>
          <span>Share</span><span>{total ? ((col.counts[b] / total) * 100).toFixed(1) : 0}%</span>
        </div>
      </>,
      p.cx,
      p.cy
    );
  };

  return (
    <div className="ch" onPointerMove={onMove} onPointerLeave={hideChartTip}>
      <div className="ch-svg heat" ref={box}>
        {g ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Latency heatmap">
            <rect x={g.L} y={g.top} width={g.plotW} height={g.plotH} style={{ fill: "var(--heat-0)" }} />
            {g.cells}
            {g.axis}
          </svg>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Host map ----------

export function HostMap({ rw, full = false }: { rw: ResolvedWidget; full?: boolean }) {
  const { showChartTip, hideChartTip } = useUI();
  const w = rw.widget as HostMapWidget;
  const box = useRef<HTMLDivElement>(null);
  const { w: W, h: H } = useSize(box);
  const hosts = (rw.data as Host[] | undefined) ?? [];
  const maxR = full ? 44 : 30;

  const hexes = useMemo(() => {
    if (W < 40 || H < 40 || !hosts.length) return null;
    const N = hosts.length, S3 = Math.sqrt(3);
    let best = { r: 0, cols: 1, rows: 1 };
    for (let cols = 1; cols <= N; cols++) {
      const rows = Math.ceil(N / cols);
      const r = Math.min(W / ((cols + (rows > 1 ? 0.5 : 0)) * S3), H / ((rows - 1) * 1.5 + 2));
      if (r > best.r) best = { r, cols, rows };
    }
    const r = Math.min(best.r, maxR), hw = S3 * r;
    const gridW = (best.cols + (best.rows > 1 ? 0.5 : 0)) * hw, gridH = (best.rows - 1) * 1.5 * r + 2 * r;
    const ox = (W - gridW) / 2 + hw / 2, oy = (H - gridH) / 2 + r;
    const rr = r * 0.93;
    return hosts.map((h, i) => {
      const row = Math.floor(i / best.cols), col = i % best.cols;
      const cx = ox + col * hw + (row % 2 ? hw / 2 : 0), cy = oy + row * 1.5 * r;
      let d = "";
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 180) * (60 * k - 90);
        d += (k ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1);
      }
      return <path key={h.name} className="hex" d={d + "Z"} fill={cpuColor(h.value)} data-i={i} />;
    });
  }, [hosts, W, H, maxR]);

  const onMove = (e: ReactPointerEvent) => {
    const hx = (e.target as Element).closest?.(".hex") as SVGPathElement | null;
    const h = hx ? hosts[Number(hx.dataset.i)] : null;
    if (!h) return hideChartTip();
    showChartTip(
      <>
        <h5>{h.name}</h5>
        <div className="kv">
          <span>{w.metric ?? "CPU usage"}</span><span>{h.value.toFixed(1)}%</span>
          {Object.entries(h.tags ?? {}).map(([k, v]) => [<span key={`k${k}`}>{k}</span>, <span key={`v${k}`}>{v}</span>])}
        </div>
      </>,
      e.clientX,
      e.clientY
    );
  };

  return (
    <div className="ch" onPointerMove={onMove} onPointerLeave={hideChartTip}>
      <div className="hexwrap" ref={box}>
        {!hosts.length ? (
          <div className="w-empty" style={{ height: "100%" }}>{w.empty ? (typeof w.empty === "function" ? w.empty(rw.ctx) : w.empty) : "No hosts"}</div>
        ) : hexes ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Host map">{hexes}</svg>
        ) : null}
      </div>
      <div className="hex-legend">
        <span>0%</span>
        <i style={{ background: `linear-gradient(90deg,${CPU_STOPS.map((x) => `${x[1]} ${x[0]}%`).join(",")})` }} />
        <span>100%</span>
        <span>{hosts.length} host{hosts.length === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}

// ---------- Sparkline ----------

export function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const v = values.filter((x): x is number => x != null);
  if (v.length < 2) return null;
  let mn = Math.min(...v), mx = Math.max(...v);
  const pad = (mx - mn) * 0.15 || 1;
  mn -= pad;
  mx += pad;
  const n = values.length;
  let line = "", pen = false;
  values.forEach((x, i) => {
    if (x == null) return void (pen = false);
    line += (pen ? "L" : "M") + ((i / (n - 1)) * 100).toFixed(2) + " " + (30 - ((x - mn) / (mx - mn)) * 30).toFixed(2);
    pen = true;
  });
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line}L100 30L0 30Z`} fill={color} fillOpacity=".12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
