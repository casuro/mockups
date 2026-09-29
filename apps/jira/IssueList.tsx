import type { ReactNode } from "react";
import { Avatar, CheckItem, Lozenge, useUI, type ListFilters } from "./context";
import { Crumbs } from "./Board";
import { rel } from "./format";
import * as I from "./icons";
import type { JiraIssue } from "./types";
import type { JiraProject } from "./use-jira";

// The Issues list: every issue in a sortable table, with Type, Status and
// Assignee filters and the JQL they add up to.

type Col = { id: string; label: string; val: (i: JiraIssue) => string | number };

function columns(jira: JiraProject): Col[] {
  const { state, people, statuses } = jira;
  const num = (k: string) => +k.slice(k.lastIndexOf("-") + 1);
  return [
    { id: "type", label: "Type", val: (i) => I.TYPE_NAMES[i.type] },
    { id: "key", label: "Key", val: (i) => num(i.key) },
    { id: "summary", label: "Summary", val: (i) => i.summary.toLowerCase() },
    { id: "status", label: "Status", val: (i) => statuses.findIndex((s) => s.id === i.status) },
    { id: "assignee", label: "Assignee", val: (i) => (i.assignee ? (people[i.assignee]?.name ?? "") : "~") },
    { id: "priority", label: "Priority", val: (i) => I.PRIORITY_ORDER.indexOf(i.priority) },
    { id: "epic", label: "Parent", val: (i) => (i.epic ? (state.issues[i.epic]?.summary ?? "") : "~") },
    { id: "sprint", label: "Sprint", val: (i) => (i.sprint ? (state.sprints.find((s) => s.id === i.sprint)?.name ?? "") : "~") },
    { id: "points", label: "Story points", val: (i) => i.points ?? -1 },
    { id: "updated", label: "Updated", val: (i) => i.updated },
  ];
}

function Jql({ f, cols }: { f: ListFilters; cols: Col[] }) {
  const { jira } = useUI();
  const kw = (t: string) => <span className="kw">{t}</span>;
  const str = (t: string) => <span className="str">"{t}"</span>;
  const parts: ReactNode[] = [<>{kw("project")} = {jira.seed.project.key}</>];
  const inList = (field: string, vals: string[], show: (v: string) => ReactNode) =>
    parts.push(
      <>
        {kw(field)} {vals.length > 1 ? "in (" : "= "}
        {vals.map((v, n) => <span key={v}>{n ? ", " : ""}{show(v)}</span>)}
        {vals.length > 1 ? ")" : ""}
      </>
    );
  if (f.type.length) inList("type", f.type, (v) => I.TYPE_NAMES[v as JiraIssue["type"]]);
  if (f.status.length) inList("status", f.status, (v) => str(jira.statusName(v)));
  if (f.assignee.length) inList("assignee", f.assignee, (v) => (v === jira.me ? <span className="fn">currentUser()</span> : v === "none" ? "EMPTY" : str(jira.pname(v))));
  if (f.text.trim()) parts.push(<>{kw("text")} ~ {str(f.text.trim())}</>);
  const col = cols.find((c) => c.id === f.sort.col)!;
  return (
    <>
      {parts.map((p, n) => <span key={n}>{n ? <> {kw("AND")} </> : null}{p}</span>)} {kw("ORDER BY")} {col.label.toLowerCase().replace(" ", "")} {f.sort.dir.toUpperCase()}
    </>
  );
}

function FilterMenu({ field }: { field: "type" | "status" | "assignee" }) {
  const { jira, list, setList } = useUI();
  const opts: [string, ReactNode, ReactNode?][] =
    field === "type"
      ? (["story", "task", "bug", "epic"] as const).map((t) => [t, I.TYPE_NAMES[t], <I.TypeIcon type={t} />])
      : field === "status"
        ? jira.statuses.map((s) => [s.id, <Lozenge status={s.id} />])
        : [...Object.values(jira.people).map((p): [string, ReactNode, ReactNode] => [p.id, p.name, <Avatar id={p.id} size={20} />]), ["none", "Unassigned", <Avatar id={null} size={20} />]];
  return (
    <>
      {opts.map(([v, label, icon]) => (
        <CheckItem
          key={v}
          checked={list[field].includes(v)}
          label={label}
          icon={icon}
          onClick={() => setList((l) => ({ ...l, [field]: l[field].includes(v) ? l[field].filter((x) => x !== v) : [...l[field], v] }))}
        />
      ))}
    </>
  );
}

export function IssueList() {
  const { jira, list: f, setList, openPop, pop } = useUI();
  const { state } = jira;
  const cols = columns(jira);
  const q = f.text.trim().toLowerCase();
  const col = cols.find((c) => c.id === f.sort.col)!;
  const dir = f.sort.dir === "asc" ? 1 : -1;
  const num = (k: string) => +k.slice(k.lastIndexOf("-") + 1);
  const items = Object.values(state.issues)
    .filter((i) => i.type !== "subtask")
    .filter((i) => !f.type.length || f.type.includes(i.type))
    .filter((i) => !f.status.length || f.status.includes(i.status))
    .filter((i) => !f.assignee.length || f.assignee.includes(i.assignee ?? "none"))
    .filter((i) => !q || i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q) || i.labels.some((l) => l.includes(q)))
    .sort((a, b) => {
      const x = col.val(a);
      const y = col.val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir || num(b.key) - num(a.key);
    });
  const sprintName = (id?: string | null) => state.sprints.find((s) => s.id === id)?.name;
  const none = <span className="sub">None</span>;
  const fb = (field: "type" | "status" | "assignee", label: string) => (
    <button
      className={`filter-btn${f[field].length ? " active" : ""}`}
      aria-haspopup="menu"
      aria-expanded={pop?.id === `list:${field}`}
      onClick={(e) => openPop(e.currentTarget, <FilterMenu field={field} />, { id: `list:${field}` })}
    >
      {label}
      {f[field].length ? <span className="n">{f[field].length}</span> : null}
      <I.ChevD />
    </button>
  );
  const jqlBox = (
    <div className="jql-box" role="textbox" aria-label="JQL query" aria-readonly="true">
      <I.CheckCircle />
      <span><Jql f={f} cols={cols} /></span>
    </div>
  );
  const sort = (c: string) =>
    setList((l) => ({ ...l, sort: l.sort.col === c ? { col: c, dir: l.sort.dir === "asc" ? "desc" : "asc" } : { col: c, dir: c === "updated" || c === "points" ? "desc" : "asc" } }));

  return (
    <div className="page">
      <Crumbs extra="Issues" />
      <div className="title-row">
        <h1>Issues</h1>
        <button className="btn" onClick={() => jira.ui.copyLink(jira.seed.project.key)}><I.Share />Share</button>
        <button className="btn" onClick={() => jira.ui.emit({ type: "action", kind: "list", label: "Export" })}>Export</button>
      </div>
      <div className="jql">
        {f.jql ? (
          jqlBox
        ) : (
          <>
            <label className="fsearch" style={{ width: 240 }}>
              <input type="text" placeholder="Search issues" aria-label="Search issues" value={f.text} onChange={(e) => setList((l) => ({ ...l, text: e.target.value }))} />
              <I.Search />
            </label>
            {fb("type", "Type")}
            {fb("status", "Status")}
            {fb("assignee", "Assignee")}
            {f.type.length || f.status.length || f.assignee.length || f.text ? (
              <button className="btn subtle" onClick={() => setList((l) => ({ ...l, type: [], status: [], assignee: [], text: "" }))}>Clear filters</button>
            ) : null}
          </>
        )}
        <div className="grow" />
        <button className={`btn ${f.jql ? "selected" : "subtle"}`} aria-pressed={f.jql} onClick={() => setList((l) => ({ ...l, jql: !l.jql }))}>{f.jql ? "Basic" : "JQL"}</button>
      </div>
      {f.jql ? null : <div className="jql">{jqlBox}</div>}
      <div className="table-wrap">
        <table className="issues">
          <thead>
            <tr>
              {cols.map((c) => {
                const on = f.sort.col === c.id;
                return (
                  <th key={c.id} className={on ? "sorted" : undefined} aria-sort={on ? (f.sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button onClick={() => sort(c.id)}>
                      {c.label}
                      {on && f.sort.dir === "asc" ? <I.SortUp /> : <I.SortDown />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((i) => (
                <tr key={i.key} data-key={i.key} tabIndex={0} onClick={() => jira.ui.openIssue(i.key)}>
                  <td><I.TypeIcon type={i.type} /></td>
                  <td><span className={`k${jira.statuses.find((s) => s.id === i.status)?.tone === "done" ? " done" : ""}`}>{i.key}</span></td>
                  <td className="sum"><span>{i.summary}</span></td>
                  <td><Lozenge status={i.status} /></td>
                  <td><span className="cell-flex"><Avatar id={i.assignee} size={24} /><span>{jira.pname(i.assignee)}</span></span></td>
                  <td><span className="cell-flex"><I.PriorityIcon priority={i.priority} /><span>{I.PRIORITY_NAMES[i.priority]}</span></span></td>
                  <td>
                    {i.type !== "epic" && i.epic && state.issues[i.epic] ? (
                      <span className="cell-flex"><I.TypeIcon type="epic" /><span>{state.issues[i.epic].summary}</span></span>
                    ) : none}
                  </td>
                  <td>{sprintName(i.sprint) ?? sprintName(i.doneSprint) ?? none}</td>
                  <td>{i.points ?? none}</td>
                  <td><span className="sub">{rel(i.updated, jira.now())}</span></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", height: 120, color: "var(--subtle)" }}>No issues were found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="list-count">{items.length} issue{items.length === 1 ? "" : "s"}</div>
    </div>
  );
}
