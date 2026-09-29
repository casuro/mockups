import { Avatar, PeopleMenu, PriorityTag, StatusBadge, UrgencyTag, useUI, Who } from "./context";
import { ago, shift, when } from "./format";
import * as I from "./icons";
import type { UrgencyFilter } from "./types";
import { TABS, visible } from "./use-pagerduty";

// The Incidents page: the title, the status tabs and urgency filter, the
// bulk bar, the table (cards on a phone), and beside it the "On call now"
// card and the signed-in person's counts. A row opens its incident.

const COUNT_CLASS: Record<string, string> = { triggered: "t", acknowledged: "a" };

export function IncidentList() {
  const { pagerduty, menu, setMenu } = useUI();
  const { state, me, people } = pagerduty;
  const name = (id: string) => people[id]?.name ?? id;
  const rows = visible(state, me, name);
  const selected = state.incidents.filter((i) => state.selected.includes(i.id));
  const all = rows.length > 0 && rows.every((r) => state.selected.includes(r.id));
  const canAck = selected.some((i) => i.status === "triggered");
  const canResolve = selected.some((i) => i.status !== "resolved");

  return (
    <div className="page-in">
        <div className="page-head">
          <h1>Incidents</h1>
          <button className="btn" onClick={() => pagerduty.ui.action("Saved filters")}><I.Cog />Saved filters</button>
          <button className="btn primary" onClick={() => pagerduty.ui.action("New Incident")}><I.Plus />New Incident</button>
        </div>
        <section className="card list" aria-label="Incidents">
          <div className="filters">
            <div className="tabs" role="tablist">
              {TABS.map((t) => {
                const n = state.incidents.filter((i) => t.test(i, me)).length;
                return (
                  <button key={t.id} className={`tab${state.tab === t.id ? " on" : ""}`} role="tab" aria-selected={state.tab === t.id} onClick={() => pagerduty.ui.filter({ tab: t.id })}>
                    {t.name}
                    <span className={`n${n && COUNT_CLASS[t.id] ? ` ${COUNT_CLASS[t.id]}` : ""}`}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="urg">
              Urgency
              <div className="seg" role="group" aria-label="Urgency">
                {(["all", "high", "low"] as UrgencyFilter[]).map((u) => (
                  <button key={u} className={state.urgency === u ? "on" : ""} aria-pressed={state.urgency === u} onClick={() => pagerduty.ui.filter({ urgency: u })}>
                    {u === "all" ? "All" : u === "high" ? "High" : "Low"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="bulk">
            <input type="checkbox" className="chk" aria-label="Select all incidents" checked={all} disabled={!rows.length} onChange={(e) => pagerduty.ui.selectAll(e.target.checked)} />
            <button className="btn sm" disabled={!canAck} onClick={() => pagerduty.ui.bulk("acknowledge")}><I.Check />Acknowledge</button>
            <button className="btn sm" disabled={!canResolve} onClick={() => pagerduty.ui.bulk("resolve")}><I.Check />Resolve</button>
            <span className="anchor">
              <button className="btn sm" disabled={!canResolve} aria-expanded={menu === "bulk"} onClick={() => setMenu(menu === "bulk" ? null : "bulk")}><I.Swap />Reassign</button>
              {menu === "bulk" ? (
                <PeopleMenu label="Reassign to" pick={(id) => { setMenu(null); pagerduty.ui.bulk("reassign", id); }} />
              ) : null}
            </span>
            <span className="count">{selected.length ? `${selected.length} selected` : `${rows.length} incident${rows.length === 1 ? "" : "s"}`}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th aria-label="Select" /><th>Status</th><th>Priority</th><th>Urgency</th><th>Title</th><th>Service</th><th>Assigned to</th><th>Created</th><th>#</th></tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((i) => {
                    const on = state.selected.includes(i.id);
                    return (
                      <tr key={i.id} className={on ? "sel" : ""} onClick={() => pagerduty.ui.openIncident(i.id)}>
                        <td className="c-chk" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="chk" aria-label={`Select incident #${i.id}`} checked={on} onChange={(e) => pagerduty.ui.select(i.id, e.target.checked)} />
                        </td>
                        <td className="c-status"><StatusBadge status={i.status} /></td>
                        <td className="c-prio"><PriorityTag priority={i.priority} /></td>
                        <td className="c-urg"><UrgencyTag urgency={i.urgency} /></td>
                        <td className="title">
                          <button className="title-btn" aria-label={`Open incident #${i.id}: ${i.title}`} onClick={(e) => { e.stopPropagation(); pagerduty.ui.openIncident(i.id); }}>
                            <b>{i.title}</b>
                          </button>
                          <span className="sub">{`${i.alerts.length} alert${i.alerts.length === 1 ? "" : "s"}`}</span>
                        </td>
                        <td className="c-svc">{i.service}</td>
                        <td className="c-who"><Who id={i.assignee} /></td>
                        <td className="c-created muted" title={when(i.createdAt)}>{ago(i.createdAt)}</td>
                        <td className="num">{i.id}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={9} className="empty">No incidents match these filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <OnCall />
    </div>
  );
}

function OnCall() {
  const { pagerduty } = useUI();
  const { state, people, me } = pagerduty;
  const policy = state.policies[state.onCall.policy];
  const mine = state.incidents.filter((i) => i.assignee === me && i.status !== "resolved");
  const resolved = state.incidents.filter((i) => i.status === "resolved" && (i.assignee === me || i.responders.includes(me))).length;
  return (
    <aside className="side">
      {policy ? (
        <section className="card" aria-label="On call now">
          <h2><span className="live" />On call now</h2>
          <div className="pol">{policy.name}</div>
          {policy.levels.map((id, n) => (
            <div className="lvl" key={`${n}-${id}`}>
              <span className="n">{n + 1}</span>
              <Avatar id={id} size="lg" />
              <div className="t">
                <b>{people[id]?.name ?? id}{id === me ? <span className="you">You</span> : null}</b>
                <span>{n === 0 && policy.rotation ? policy.rotation : (people[id]?.role ?? "")}</span>
              </div>
            </div>
          ))}
          {state.onCall.until ? <div className="shift">Rotation hands over <b>{shift(state.onCall.until)}</b></div> : null}
          <button className="link" onClick={() => pagerduty.ui.action("View schedule")}>View schedule</button>
        </section>
      ) : null}
      <section className="card" aria-label="Your incidents">
        <h2>Your incidents</h2>
        <div className="stat-row">
          <div className="stat"><b>{mine.filter((i) => i.status === "triggered").length}</b><span>Triggered</span></div>
          <div className="stat"><b>{mine.filter((i) => i.status === "acknowledged").length}</b><span>Acknowledged</span></div>
          <div className="stat"><b>{resolved}</b><span>Resolved</span></div>
        </div>
      </section>
    </aside>
  );
}
