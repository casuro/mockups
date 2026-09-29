import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { Avatar, PeopleMenu, PriorityTag, statusLabel, StatusBadge, UrgencyTag, useUI, Who } from "./context";
import { ago, Rich, span, when } from "./format";
import * as I from "./icons";
import type { PagerDutyIncident, PagerDutyTimelineEntry, TimelineType } from "./types";
import { sourceName } from "./use-pagerduty";

// The incident drawer: number, title, status, urgency and priority; the
// Acknowledge / Resolve / Reassign / Add Responders / Escalate buttons; the
// conference bridge; details; the note box; the timeline, newest first; and
// the alerts grouped into it. Full screen on a phone.

const ICON: Record<TimelineType, ComponentType<{ className?: string }>> = {
  trigger: I.Alert,
  notify: I.Bell,
  ack: I.Check,
  resolve: I.Check,
  reassign: I.Swap,
  escalate: I.Escalate,
  responders: I.Users,
  note: I.Note,
  alert: I.Alert,
  custom: I.Note,
};
const CHANNEL = { push: I.Phone, sms: I.Sms, phone: I.Phone, email: I.Bell };

function SourceMark({ source }: { source: string }) {
  return source === "datadog" ? <I.DatadogLogo /> : <I.Alert />;
}

export function IncidentDrawer() {
  const { pagerduty } = useUI();
  const shown = useRef<PagerDutyIncident | null>(null);
  // The drawer keeps the last incident while it slides out.
  if (pagerduty.current) shown.current = pagerduty.current;
  const incident = pagerduty.current ?? shown.current;
  return (
    <>
      <div className="scrim" onClick={() => pagerduty.ui.openIncident(null)} />
      <aside className="detail" aria-label="Incident details" aria-hidden={!pagerduty.current} inert={!pagerduty.current}>
        {incident ? <Incident key={incident.id} incident={incident} /> : null}
      </aside>
    </>
  );
}

function Incident({ incident: i }: { incident: PagerDutyIncident }) {
  const { pagerduty, menu, setMenu, renderCustom } = useUI();
  const { state, seed } = pagerduty;
  const policy = state.policies[seed.services[i.service]?.policy ?? ""];
  const done = i.status === "resolved";
  const top = useRef<HTMLDivElement>(null);
  const timeline = i.timeline.map((e, n) => [e, n] as const).sort((a, b) => b[0].at - a[0].at || b[1] - a[1]).map(([e]) => e);
  const draft = state.drafts[i.id] ?? "";

  // A newly opened incident starts at the top.
  useEffect(() => {
    top.current?.closest(".detail")?.scrollTo(0, 0);
  }, [i.id]);

  const act = (what: Parameters<typeof pagerduty.ui.act>[0], arg?: string) => {
    setMenu(null);
    pagerduty.ui.act(what, arg);
  };

  return (
    <>
      <div className="d-head" ref={top}>
        <div className="crumbs">
          <button className="link" onClick={() => pagerduty.ui.openIncident(null)}>Incidents</button>
          <span>/</span>
          <span>{`#${i.id}`}</span>
          <span className="grow" />
          <button className="x-btn" aria-label="Close incident" onClick={() => pagerduty.ui.openIncident(null)}><I.X /></button>
        </div>
        <h2>{i.title}</h2>
        <div className="badges">
          <StatusBadge status={i.status} />
          <UrgencyTag urgency={i.urgency} />
          <span className="sep" />
          <PriorityTag priority={i.priority} />
          <span className="muted">{`#${i.id} · ${i.service}`}</span>
        </div>
        <div className="actions">
          <button className={`btn${i.status === "triggered" ? " primary" : ""}`} disabled={i.status !== "triggered"} onClick={() => act("acknowledge")}><I.Check />Acknowledge</button>
          <button className={`btn${i.status === "acknowledged" ? " primary" : ""}`} disabled={done} onClick={() => act("resolve")}><I.Check />Resolve</button>
          <span className="wrap">
            <button className="btn" disabled={done} aria-expanded={menu === "reassign"} onClick={() => setMenu(menu === "reassign" ? null : "reassign")}><I.Swap />Reassign</button>
            {menu === "reassign" ? <PeopleMenu label="Reassign to" exclude={[i.assignee]} pick={(id) => act("reassign", id)} /> : null}
          </span>
          <span className="wrap">
            <button className="btn" disabled={done} aria-expanded={menu === "responders"} onClick={() => setMenu(menu === "responders" ? null : "responders")}><I.Users />Add Responders</button>
            {menu === "responders" ? <PeopleMenu label="Request responders" exclude={[i.assignee, ...i.responders]} pick={(id) => act("responder", id)} /> : null}
          </span>
          <button className="btn" disabled={done || !policy || i.level >= policy.levels.length} onClick={() => act("escalate")}><I.Escalate />Escalate</button>
        </div>
        {i.bridge && (i.bridge.zoom || i.bridge.slack) ? (
          <div className="bridge">
            <span className="lbl">Conference bridge</span>
            {i.bridge.zoom ? (
              <span className="item">
                <span className="logo"><I.ZoomLogo /></span>
                <button className="link" aria-label={`Join Zoom bridge ${i.bridge.zoom}`} onClick={() => pagerduty.ui.action(`Zoom: ${i.bridge!.zoom}`)}>{i.bridge.zoom}</button>
              </span>
            ) : null}
            {i.bridge.zoom && i.bridge.slack ? <span className="dot">·</span> : null}
            {i.bridge.slack ? (
              <span className="item">
                <span className="logo"><I.SlackLogo /></span>
                <button className="link" aria-label={`Open Slack channel ${i.bridge.slack}`} onClick={() => pagerduty.ui.action(`Slack: ${i.bridge!.slack}`)}>{i.bridge.slack}</button>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="d-body">
        <section className="d-sec">
          <h3>Details</h3>
          <dl className="kv">
            <div><dt>Service</dt><dd><button className="link" aria-label={`Service ${i.service}`} onClick={() => pagerduty.ui.action(`Service: ${i.service}`)}>{i.service}</button></dd></div>
            <div><dt>Escalation policy</dt><dd>{policy?.name ?? "-"}<span className="muted">{`(level ${i.level})`}</span></dd></div>
            <div><dt>Assigned to</dt><dd><Who id={i.assignee} /></dd></div>
            <div><dt>Responders</dt><dd>{i.responders.length ? i.responders.map((id) => <Who key={id} id={id} />) : <span className="muted">None yet</span>}</dd></div>
            <div><dt>Created</dt><dd>{when(i.createdAt)}</dd></div>
            <div><dt>{done ? "Time to resolve" : "Open for"}</dt><dd>{span((done ? (i.resolvedAt ?? Date.now()) : Date.now()) - i.createdAt)}</dd></div>
          </dl>
        </section>
        <section className="d-sec">
          <h3>Add note</h3>
          <div className="note-box">
            <textarea
              placeholder="Add a note for responders"
              aria-label="Add a note"
              value={draft}
              onChange={(e) => pagerduty.ui.setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  pagerduty.ui.note();
                }
              }}
            />
            <div className="note-foot">
              <span className="hint">Notes are shared with everyone on this incident</span>
              <button className="btn sm primary" onClick={() => pagerduty.ui.note()}>Add Note</button>
            </div>
          </div>
        </section>
        <section className="d-sec">
          <h3>Timeline</h3>
          <div className="tl">
            {timeline.map((e) => <Line key={e.id} entry={e} incident={i} renderCustom={renderCustom} />)}
          </div>
        </section>
        <section className="d-sec">
          <h3>Alerts <span className="count">{i.alerts.length}</span></h3>
          {i.alerts.length ? (
            i.alerts.map((a, n) => (
              <div className="alert-row" key={n}>
                <span className="src">{a.source ? <SourceMark source={a.source} /> : <I.Alert />}</span>
                <div className="s">
                  <b>{a.title}{a.source && a.source !== "datadog" ? <span className="via">{sourceName(a.source)}</span> : null}</b>
                  <span>{[a.detail, ago(a.at)].filter(Boolean).join(" · ")}</span>
                </div>
                <span className={`alert-st ${done ? "resolved" : a.status}`}>{done ? "Resolved" : statusLabel(a.status)}</span>
              </div>
            ))
          ) : (
            <div className="muted">No alerts</div>
          )}
        </section>
      </div>
    </>
  );
}

function Line({ entry: e, incident, renderCustom }: { entry: PagerDutyTimelineEntry; incident: PagerDutyIncident; renderCustom?: (entry: PagerDutyTimelineEntry, incident: PagerDutyIncident) => ReactNode }) {
  const { pagerduty } = useUI();
  const Icon = e.type === "notify" && e.channel ? CHANNEL[e.channel] : ICON[e.type];
  const note = e.type === "note";
  return (
    <div className={`ev ${e.type}`}>
      <span className="dot">{e.via ? <SourceMark source={e.via} /> : note && e.by ? <Avatar id={e.by} size="sm" /> : <Icon />}</span>
      <div className="line">
        {note ? <><b>{pagerduty.people[e.by ?? ""]?.name ?? e.by ?? "Someone"}</b> added a note</> : <Rich text={e.text} />}
        {e.via ? <span className="via">{sourceName(e.via)}</span> : null}
      </div>
      <div className="when">{`${when(e.at)} · ${ago(e.at)}`}</div>
      {note ? <div className="note">{e.text}</div> : null}
      {e.type === "custom" && e.custom && renderCustom ? <div className="custom">{renderCustom(e, incident)}</div> : null}
    </div>
  );
}
