import type { ReactNode } from "react";
import { Heatmap, HostMap, Sparkline, Timeseries } from "./charts";
import { Avatar, useUI } from "./context";
import { cpuColor, fmtAgo, fmtFull, fmtK, STATUS_LABEL } from "./format";
import * as I from "./icons";
import type { MonitorStatus, MonitorSummaryWidget, NoteWidget, QueryValueData, QueryValueWidget, SloData, StreamEvent, TopListItem, TopListWidget, Widget } from "./types";
import type { ResolvedWidget } from "./use-datadog";

// The dashboard grid and its widgets: the frame with its title and menu,
// and the bodies that are not charts (query value, top list, SLO, monitor
// summary, event stream, note).

const CHARTS = new Set<Widget["kind"]>(["timeseries", "heatmap", "hostmap"]);
export const isChart = (w: Widget) => CHARTS.has(w.kind);

export function Grid() {
  const { app } = useUI();
  return (
    <main className="dash">
      <div className="dash-grid">
        {app.seed.dashboard.widgets.map((w) => (
          <WidgetFrame key={w.id} rw={app.view.widgets[w.id]} />
        ))}
      </div>
    </main>
  );
}

/** The title, with its brand mark and grey context. */
export function WidgetTitle({ rw }: { rw: ResolvedWidget }) {
  const Logo = rw.widget.logo ? I.LOGOS[rw.widget.logo] : null;
  return (
    <>
      {Logo ? <span className="w-logo"><Logo /></span> : null}
      {rw.title}
      {rw.context ? <span className="ctx">{rw.context}</span> : null}
    </>
  );
}

function WidgetFrame({ rw }: { rw: ResolvedWidget }) {
  const { app, openPop, closePop } = useUI();
  const w = rw.widget;
  const cls = `w span-${w.span} rows-${w.rows}${w.wideOnTablet ? " t-span-2" : ""}${w.kind === "note" ? " note-w" : ""}`;
  if (w.kind === "note")
    return (
      <section className={cls}>
        <div className="w-body"><Note w={w} /></div>
      </section>
    );

  const menu = (anchor: HTMLElement) =>
    openPop(
      anchor,
      () => (
        <div className="menu" role="menu">
          {isChart(w) ? (
            <button className="mi" role="menuitem" onClick={() => {
                closePop();
                app.ui.fullscreen(w.id);
              }}>
              <I.Maximize /><span>View in full screen</span>
            </button>
          ) : null}
          <button
            className="mi"
            role="menuitem"
            onClick={() => {
              closePop();
              void navigator.clipboard?.writeText(rw.query).catch(() => {});
              app.toast("Query copied to clipboard");
              app.ui.emit({ type: "copy_query", widget: w.id, query: rw.query });
            }}
          >
            <I.Copy /><span>Copy query</span>
          </button>
          <div className="sep" />
          <button
            className="mi"
            role="menuitem"
            onClick={() => {
              closePop();
              app.ui.emit({ type: "edit_widget", widget: w.id });
            }}
          >
            <I.Pencil /><span>Edit</span>
          </button>
        </div>
      ),
      { align: "end" }
    );

  return (
    <section className={cls} aria-label={rw.title}>
      <div className="w-head">
        <div className="w-title"><WidgetTitle rw={rw} /></div>
        <button className="icon-btn w-menu-btn" aria-label="Widget options" aria-haspopup="true" onClick={(e) => menu(e.currentTarget)}>
          <I.More />
        </button>
      </div>
      <div className="w-body"><WidgetBody rw={rw} /></div>
    </section>
  );
}

export function WidgetBody({ rw, full = false }: { rw: ResolvedWidget; full?: boolean }): ReactNode {
  const { renderWidget } = useUI();
  const w = rw.widget;
  switch (w.kind) {
    case "timeseries": return <Timeseries rw={rw} full={full} />;
    case "heatmap": return <Heatmap rw={rw} />;
    case "hostmap": return <HostMap rw={rw} full={full} />;
    case "query_value": return <QueryValue w={w} data={rw.data as QueryValueData | undefined} />;
    case "toplist": return <TopList w={w} rw={rw} />;
    case "slo": return rw.data ? <Slo d={rw.data as SloData} /> : null;
    case "monitor_summary": return <MonitorSummary w={w} />;
    case "event_stream": return <EventStream filter={w.filter} />;
    case "note": return <Note w={w} />;
    case "custom": return renderWidget?.(w) ?? null;
  }
}

// ---------- Query value ----------

const TONE_COLOR = { good: "#2ea44f", warn: "#f5a623", bad: "#e0373d", neutral: "#632ca6" };

function QueryValue({ w, data }: { w: QueryValueWidget; data: QueryValueData | undefined }) {
  const v = data?.value ?? null;
  const rule = v == null ? undefined : w.rules?.find((r) => (r.above == null || v >= r.above) && (r.below == null || v < r.below));
  const tone = rule?.tone;
  const text = v == null ? "-" : w.compact ? fmtK(v, v >= 1000 ? 2 : 1) : v.toFixed(w.decimals ?? 0);
  return (
    <div className="qv">
      <div className={`qv-val ${tone ?? "neutral-t"}`}>
        {text}
        {w.unit && v != null ? <small>{w.unit}</small> : null}
      </div>
      {w.caption ? <div className="qv-sub">{w.caption}</div> : null}
      <div className="qv-spark">{data?.spark ? <Sparkline values={data.spark} color={TONE_COLOR[tone ?? "neutral"]} /> : null}</div>
    </div>
  );
}

// ---------- Top list ----------

function TopList({ w, rw }: { w: TopListWidget; rw: ResolvedWidget }) {
  const items = (rw.data as TopListItem[] | undefined) ?? [];
  const unit = w.unit ?? "%";
  const max = w.max ?? 100;
  if (!items.length) return <div className="w-empty">{w.empty ? (typeof w.empty === "function" ? w.empty(rw.ctx) : w.empty) : "No data"}</div>;
  return (
    <div className="toplist">
      {items.map((x) => (
        <div key={x.name} className="tl-row" data-tip={x.tip}>
          <span className="tl-name">{x.name}</span>
          <span><i className="tl-bar" style={{ display: "block", width: `${Math.min(100, (x.value / max) * 100).toFixed(1)}%`, background: x.color ?? cpuColor((x.value / max) * 100) }} /></span>
          <span className="tl-val">{x.value.toFixed(1)}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- SLO ----------

function Slo({ d }: { d: SloData }) {
  const bc = d.budget < 25 ? "var(--alert)" : d.budget < 50 ? "var(--warn)" : "var(--ok)";
  const allowed = 30 * 24 * 60 * (1 - d.target / 100);
  const col = (label: string, v: number) => (
    <div className="slo-col">
      <span>{label}</span>
      <b className={v >= d.target ? "ok" : "bad"}>{v.toFixed(2)}%</b>
    </div>
  );
  return (
    <div className="slo">
      <div className="slo-top">
        <b className="num">{d.d30.toFixed(2)}%</b>
        <span className="sub">30-day availability, target {d.target.toFixed(2)}%</span>
      </div>
      <div className="slo-cols">{col("7 days", d.d7)}{col("30 days", d.d30)}{col("90 days", d.d90)}</div>
      <div className="budget">
        <div className="budget-row"><span>Error budget remaining (30d)</span><b>{d.budget.toFixed(1)}%</b></div>
        <div className="budget-bar"><i style={{ width: `${d.budget}%`, background: bc }} /></div>
        <div className="budget-row">
          <span className="muted">{Math.round((allowed * d.budget) / 100)}m of {Math.round(allowed)}m allowed downtime left</span>
          <span className="muted">{d.budget < 25 ? "Burning fast" : "On track"}</span>
        </div>
      </div>
      <div className="burn">
        <div><span>Burn rate, 1h</span><b className={d.burn1h >= 10 ? "hot" : ""}>{d.burn1h.toFixed(1)}x</b></div>
        <div><span>Burn rate, 6h</span><b className={d.burn6h >= 6 ? "hot" : ""}>{d.burn6h.toFixed(1)}x</b></div>
      </div>
    </div>
  );
}

// ---------- Monitor summary ----------

const ORDER: Record<MonitorStatus, number> = { alert: 0, warn: 1, nodata: 2, ok: 3 };

function MonitorSummary({ w }: { w: MonitorSummaryWidget }) {
  const { app } = useUI();
  const ms = app.view.monitors.filter((m) => !w.monitors || w.monitors.includes(m.id));
  const list = ms.filter((m) => m.status !== "ok").sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  return (
    <>
      <div className="ms-counts">
        {(["alert", "warn", "nodata", "ok"] as const).map((k) => (
          <div key={k} className={`ms-c ${k}`}>
            <b>{ms.filter((m) => m.status === k).length}</b>
            <span><i className={`dot ${k}`} />{STATUS_LABEL[k]}</span>
          </div>
        ))}
      </div>
      <div className="ms-list">
        {list.length ? (
          list.map((m) => (
            <div key={m.id} className="ms-row">
              <span className={`status ${m.status}`}>{STATUS_LABEL[m.status]}</span>
              <span className="nm" title={m.name}>{m.name}</span>
              {m.owner ? <Avatar id={m.owner} className="av sm" /> : null}
            </div>
          ))
        ) : (
          <div className="w-empty">All monitors OK</div>
        )}
      </div>
    </>
  );
}

// ---------- Event stream ----------

function EventIcon({ kind }: { kind: StreamEvent["kind"] }) {
  switch (kind) {
    case "deploy": return <span className="ev-ic gh-mark"><span className="logo-i"><I.GithubLogo /></span></span>;
    case "k8s": return <span className="ev-ic"><span className="logo-i"><I.KubernetesLogo /></span></span>;
    case "aws": return <span className="ev-ic aws-mark"><span className="logo-i"><I.AwsLogo /></span></span>;
    case "pagerduty": return <span className="ev-ic"><span className="logo-i"><I.PagerdutyLogo /></span></span>;
    case "alert": return <span className="ev-ic alert"><I.Alert /></span>;
    case "ok": return <span className="ev-ic ok"><I.CheckCircle /></span>;
    case "incident": return <span className="ev-ic alert"><I.Siren /></span>;
    case "watchdog": return <span className="ev-ic brand"><I.Watchdog /></span>;
  }
}

function EventStream({ filter }: { filter?: (e: StreamEvent) => boolean }) {
  const { app } = useUI();
  const evs = filter ? app.view.events.filter(filter) : app.view.events;
  if (!evs.length) return <div className="w-empty">No events in this time frame</div>;
  return (
    <div className="evs">
      {evs.map((e) => (
        <div key={e.id} className="ev-row">
          <EventIcon kind={e.kind} />
          <div className="ev-main">
            <b>{e.title}</b>
            {e.text ? <span>{e.text}</span> : null}
          </div>
          <span className="ev-time" data-tip={fmtFull(e.at, true)}>{fmtAgo(e.at)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Note ----------

function Note({ w }: { w: NoteWidget }) {
  const { app } = useUI();
  return (
    <>
      {w.heading ? <h4>{w.heading}</h4> : null}
      {(w.text ?? "").split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      {w.oncall?.length ? (
        <div className="oncall">
          <span>On call</span>
          {w.oncall.map((id) => [<Avatar key={`a${id}`} id={id} className="av sm" />, <span key={`n${id}`}>{app.people[id]?.name ?? id}</span>])}
        </div>
      ) : null}
    </>
  );
}
