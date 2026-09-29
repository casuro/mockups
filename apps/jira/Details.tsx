import { useState, type ReactNode } from "react";
import { Avatar, CheckItem, EpicChip, Lozenge, MenuItem, useUI } from "./context";
import { fmtDate, fmtDateTime, rel } from "./format";
import * as I from "./icons";
import type { JiraField, JiraIssue } from "./types";

// An issue's right-hand panel: the status button and its menu, the Details
// fields with their pickers, and the created and updated dates.
export function StatusMenu({ issueKey }: { issueKey: string }) {
  const { jira, closePop } = useUI();
  const is = jira.state.issues[issueKey];
  if (!is) return null;
  return (
    <>
      <div className="menu-h">Transition to</div>
      {jira.statuses.map((s) => (
        <button
          key={s.id}
          className={`mi${is.status === s.id ? " on" : ""}`}
          role="menuitemradio"
          aria-label={s.name}
          aria-checked={is.status === s.id}
          onClick={() => (closePop(), jira.ui.setStatus(issueKey, s.id))}
        >
          <Lozenge status={s.id} />
          {is.status === s.id ? <span className="tick"><I.Check /></span> : null}
        </button>
      ))}
      <div className="mi-sep" />
      <MenuItem label="View workflow" onClick={() => (closePop(), jira.ui.emit({ type: "action", kind: "workflow", label: "View workflow", key: issueKey }))} />
    </>
  );
}

export function Picker({ issueKey, field }: { issueKey: string; field: JiraField }) {
  const { jira, closePop } = useUI();
  const { state, people, me } = jira;
  const is = state.issues[issueKey];
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState(String(is?.points ?? ""));
  if (!is) return null;
  const set = (v: unknown) => (jira.ui.setField(issueKey, field, v), closePop());

  if (field === "assignee" || field === "reporter") {
    const ids: (string | null)[] = [...(field === "assignee" ? [null] : []), ...Object.keys(people)];
    return (
      <>
        <div className="pop-search"><input className="text" placeholder="Search people" aria-label="Search people" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div>
          {ids.filter((id) => jira.pname(id).toLowerCase().includes(q.toLowerCase())).map((id) => (
            <MenuItem key={id ?? "none"} role="menuitemradio" on={is[field] === id} label={jira.pname(id)} sub={id ? people[id].role : undefined} icon={<Avatar id={id} size={24} />} onClick={() => set(id)} />
          ))}
        </div>
        {field === "assignee" && is.assignee !== me ? (
          <>
            <div className="mi-sep" />
            <MenuItem label="Assign to me" icon={<I.Person />} onClick={() => set(me)} />
          </>
        ) : null}
      </>
    );
  }
  if (field === "priority")
    return <>{I.PRIORITY_ORDER.map((p) => <MenuItem key={p} label={I.PRIORITY_NAMES[p]} icon={<I.PriorityIcon priority={p} />} on={is.priority === p} onClick={() => set(p)} />)}</>;
  if (field === "sprint")
    return (
      <>
        {state.sprints.filter((s) => s.state !== "closed").map((s) => (
          <MenuItem key={s.id} label={s.name} sub={s.state === "active" ? "Active sprint" : "Future sprint"} on={is.sprint === s.id} onClick={() => set(s.id)} />
        ))}
        <MenuItem label="None (move to backlog)" on={!is.sprint} onClick={() => set(null)} />
      </>
    );
  if (field === "epic")
    return (
      <>
        {state.epics.filter((k) => state.issues[k]).map((k) => (
          <MenuItem key={k} label={state.issues[k].summary} sub={k} icon={<I.TypeIcon type="epic" />} on={is.epic === k} onClick={() => set(k)} />
        ))}
        <div className="mi-sep" />
        <MenuItem label="Unlink parent" disabled={!is.epic} onClick={() => set(null)} />
      </>
    );
  if (field === "points") {
    const save = () => set(points === "" ? null : Math.max(0, Math.min(100, Math.round(+points))));
    return (
      <>
        <div className="pop-form">
          <input className="text" type="number" min={0} max={100} value={points} aria-label="Story point estimate" style={{ width: 96 }} onChange={(e) => setPoints(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), save())} />
          <button className="btn primary" onClick={save}>Save</button>
        </div>
        <div className="menu-h">Common estimates</div>
        <div style={{ display: "flex", gap: 4, padding: "0 12px 8px", flexWrap: "wrap" }}>
          {[1, 2, 3, 5, 8, 13].map((n) => <button key={n} className={`btn sm${is.points === n ? " selected" : ""}`} onClick={() => set(n)}>{n}</button>)}
        </div>
      </>
    );
  }
  if (field === "labels") {
    const add = () => {
      const l = label.trim().toLowerCase().replace(/\s+/g, "-");
      if (!l) return;
      jira.ui.addLabel(l);
      if (!is.labels.includes(l)) jira.ui.setField(issueKey, "labels", [...is.labels, l]);
      closePop();
    };
    return (
      <>
        <div className="pop-form">
          <input className="text" placeholder="Add or create a label" aria-label="New label" autoComplete="off" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
          <button className="btn" onClick={add}>Add</button>
        </div>
        {[...new Set([...state.labels, ...is.labels])].map((l) => (
          <CheckItem key={l} checked={is.labels.includes(l)} label={l} onClick={() => jira.ui.setField(issueKey, "labels", is.labels.includes(l) ? is.labels.filter((x) => x !== l) : [...is.labels, l])} />
        ))}
      </>
    );
  }
  if (field === "fixVersions")
    return (
      <>
        {state.versions.map((v) => (
          <CheckItem
            key={v.id}
            checked={is.fixVersions.includes(v.id)}
            label={<>{v.name}<small>{v.released ? "Released" : "Unreleased"}{v.date ? ` · ${fmtDate(v.date)}` : ""}</small></>}
            onClick={() => jira.ui.setField(issueKey, "fixVersions", is.fixVersions.includes(v.id) ? is.fixVersions.filter((x) => x !== v.id) : [...is.fixVersions, v.id])}
          />
        ))}
      </>
    );
  return null;
}

export function Details({ is }: { is: JiraIssue }) {
  const { jira, openPop, pop } = useUI();
  const { state, me } = jira;
  const [closed, setClosed] = useState(false);
  const sp = state.sprints.find((s) => s.id === is.sprint);
  const tone = jira.statuses.find((s) => s.id === is.status)?.tone ?? "todo";
  const none = (t: string) => <span className="none">{t}</span>;
  const fv = (field: JiraField, inner: ReactNode, label: string) => (
    <button
      className={`fv${field === "labels" || field === "fixVersions" ? " wrap" : ""}`}
      aria-haspopup="menu"
      aria-label={label}
      aria-expanded={pop?.id === `pick:${field}`}
      onClick={(e) => openPop(e.currentTarget, <Picker issueKey={is.key} field={field} />, { id: `pick:${field}`, cls: "wide" })}
    >
      {inner}
    </button>
  );
  const dev = is.dev;
  const act = (kind: string, label: string) => () => jira.ui.emit({ type: "action", kind, label, key: is.key });
  const parent = is.parent ? state.issues[is.parent] : null;
  return (
    <>
      <div className="status-row">
        <button
          className={`status-btn st-${tone}`}
          aria-haspopup="menu"
          aria-expanded={pop?.id === `status:${is.key}:side`}
          onClick={(e) => openPop(e.currentTarget, <StatusMenu issueKey={is.key} />, { id: `status:${is.key}:side` })}
        >
          {jira.statusName(is.status)}
          <I.ChevD />
        </button>
        {is.type !== "epic" && tone !== "done" ? <button className="btn subtle" onClick={act("automation", "Actions")}><I.Lightning />Actions</button> : null}
      </div>
      <div className={`details${closed ? " closed" : ""}`}>
        <button className="details-head" aria-expanded={!closed} onClick={() => setClosed(!closed)}>Details<I.ChevD /></button>
        <div className="dl">
          <div className="dt">Assignee</div>
          <div className="dd">
            {fv("assignee", <><Avatar id={is.assignee} size={24} /><span>{jira.pname(is.assignee)}</span></>, "Change assignee")}
            {is.assignee !== me ? <button className="link-btn" onClick={() => jira.ui.assign(is.key, me, true)}>Assign to me</button> : null}
          </div>
          <div className="dt">Reporter</div>
          <div className="dd">{fv("reporter", <><Avatar id={is.reporter} size={24} /><span>{jira.pname(is.reporter)}</span></>, "Change reporter")}</div>
          {dev ? (
            <>
              <div className="dt">Development</div>
              <div className="dd">
                <div className="dev">
                  <div className="dev-row"><I.Branch /><a onClick={act("dev", "branch")}>1 branch</a></div>
                  <div className="dev-row"><span className="br" title={dev.branch}>{dev.branch}</span></div>
                  <div className="dev-row">
                    <I.Commit />
                    <a onClick={act("dev", "commits")}>{dev.commits} commits</a>
                    {dev.lastCommit ? <span className="sub">{rel(dev.lastCommit, jira.now())}</span> : null}
                  </div>
                  {dev.pr ? (
                    <div className="dev-row">
                      <span className="logo-mono"><I.GitHubLogo /></span>
                      <a title={dev.pr.title} onClick={act("dev", `PR #${dev.pr.num}`)}>PR #{dev.pr.num}</a>
                      <span className={`lz lz-${dev.pr.state}`}>{dev.pr.state}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : is.type !== "epic" ? (
            <>
              <div className="dt">Development</div>
              <div className="dd">
                <button className="fv" onClick={() => jira.ui.createBranch(is.key)}><I.Branch /><span style={{ color: "var(--link)" }}>Create branch</span></button>
              </div>
            </>
          ) : null}
          <div className="dt">Labels</div>
          <div className="dd">{fv("labels", is.labels.length ? is.labels.map((l) => <span key={l} className="lbl-chip">{l}</span>) : none("None"), "Edit labels")}</div>
          {is.type !== "epic" && is.type !== "subtask" ? (
            <>
              <div className="dt">Sprint</div>
              <div className="dd">{fv("sprint", sp ? <span>{sp.name}</span> : none("None"), "Change sprint")}</div>
            </>
          ) : null}
          {is.type !== "subtask" ? (
            <>
              <div className="dt">Story point estimate</div>
              <div className="dd">{fv("points", is.points != null ? <span className="pts">{is.points}</span> : none("None"), "Change story points")}</div>
            </>
          ) : null}
          <div className="dt">Priority</div>
          <div className="dd">{fv("priority", <><I.PriorityIcon priority={is.priority} /><span>{I.PRIORITY_NAMES[is.priority]}</span></>, "Change priority")}</div>
          {is.type !== "epic" && is.type !== "subtask" ? (
            <>
              <div className="dt">Parent</div>
              <div className="dd">{fv("epic", is.epic && state.issues[is.epic] ? <><I.TypeIcon type="epic" /><EpicChip epic={is.epic} /></> : none("None"), "Change parent")}</div>
            </>
          ) : null}
          {parent ? (
            <>
              <div className="dt">Parent</div>
              <div className="dd"><button className="fv" onClick={() => jira.ui.openIssue(parent.key)}><I.TypeIcon type={parent.type} /><span>{parent.key}</span></button></div>
            </>
          ) : null}
          <div className="dt">Fix versions</div>
          <div className="dd">
            {fv("fixVersions", is.fixVersions.length ? is.fixVersions.map((v) => <span key={v} className="lbl-chip">{state.versions.find((x) => x.id === v)?.name ?? v}</span>) : none("None"), "Change fix versions")}
          </div>
        </div>
      </div>
      <div className="im-dates">
        <span className="cfg">
          <a onClick={act("configure", "Configure")}>
            <I.Gear style={{ display: "inline", width: 14, height: 14, verticalAlign: -2, marginRight: 4 }} />
            Configure
          </a>
        </span>
        Created {fmtDateTime(is.created)}
        <br />
        Updated {rel(is.updated, jira.now())}
      </div>
    </>
  );
}
