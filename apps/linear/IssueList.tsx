import { Fragment, useEffect, useRef } from "react";
import { Avatar, useUI } from "./context";
import { dueSoon, shortDate } from "./format";
import * as I from "./icons";
import type { LinearIssue, LinearTab } from "./types";
import { PRIORITIES, inTab } from "./use-linear";

// The team's issues: the header with its tabs, and the list grouped by
// status, each group foldable, each row with its priority, id, status,
// title, labels, project, due date, assignee and creation date.

const TABS: [LinearTab, string][] = [
  ["all", "All issues"],
  ["active", "Active"],
  ["backlog", "Backlog"],
];

export function ListHeader() {
  const { linear } = useUI();
  const team = linear.teams.find((t) => t.id === linear.state.team) ?? linear.teams[0];
  return (
    <>
      <div className="hdr-title">
        <span className="team-ic" style={{ background: team.color }}>{team.letter}</span>
        {team.name}
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={linear.state.tab === k} className={`tab${linear.state.tab === k ? " on" : ""}`} onClick={() => linear.ui.setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="hdr-right">
        <button className="btn"><I.Filter /><span>Filter</span></button>
        <button className="btn"><I.Display /><span>Display</span></button>
      </div>
    </>
  );
}

export function LabelPill({ name }: { name: string }) {
  const color = useUI().linear.seed.labels?.[name] ?? "#999";
  return (
    <span className="lbl">
      <span className="dot" style={{ background: color }} />
      {name}
    </span>
  );
}

export function StatusButton({ issue }: { issue: LinearIssue }) {
  const { linear, openMenu } = useUI();
  const status = linear.statuses.find((s) => s.id === issue.status) ?? linear.statuses[0];
  return (
    <button
      className="st"
      data-menu=""
      title={status.name}
      aria-label={`Status: ${status.name}`}
      onClick={(e) => {
        e.stopPropagation();
        openMenu(e.currentTarget, "status", issue.id);
      }}
    >
      <I.StatusIcon status={status} />
    </button>
  );
}

function Row({ issue }: { issue: LinearIssue }) {
  const { linear } = useUI();
  const { seed, state } = linear;
  const project = issue.project ? seed.projects?.[issue.project] : undefined;
  const selected = state.selected === issue.id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <div ref={ref} className={`row${selected ? " sel" : ""}`} onClick={() => linear.open(issue.id)}>
      <span className="pri" title={PRIORITIES[issue.priority]}><I.PriorityIcon priority={issue.priority} /></span>
      <span className="iid">{issue.id}</span>
      <StatusButton issue={issue} />
      <span className="ttl">{issue.title}</span>
      <span className="meta">
        {issue.labels.map((l) => <LabelPill key={l} name={l} />)}
        {project ? (
          <span className="proj">
            <I.Projects stroke={project.color ?? "currentColor"} />
            <span>{project.name}</span>
          </span>
        ) : null}
        {issue.due != null ? (
          <span className={`due${dueSoon(issue.due) ? " soon" : ""}`}>
            <I.Cal />
            {shortDate(issue.due)}
          </span>
        ) : null}
        <Avatar id={issue.assignee} />
        <span className="created">{shortDate(issue.created)}</span>
      </span>
    </div>
  );
}

export function IssueList() {
  const { linear } = useUI();
  const { state, statuses } = linear;
  const groups = statuses
    .filter((s) => inTab(state.tab, s))
    .map((s) => ({ status: s, items: state.issues.filter((i) => i.team === state.team && i.status === s.id) }))
    .filter((g) => g.items.length);
  if (!groups.length) return <div className="empty">No issues</div>;
  return (
    <>
      {groups.map(({ status, items }) => {
        const folded = state.collapsed.includes(status.id);
        return (
          <Fragment key={status.id}>
            <div className={`grp${folded ? " collapsed" : ""}`} aria-expanded={!folded} onClick={() => linear.ui.toggleGroup(status.id)}>
              <I.Caret />
              <I.StatusIcon status={status} />
              <span>{status.name}</span>
              <span className="n">{items.length}</span>
              <button
                className="add icon-btn"
                title="New issue"
                aria-label={`New ${status.name} issue`}
                onClick={(e) => {
                  e.stopPropagation();
                  linear.ui.create(status.id);
                }}
              >
                <I.Plus />
              </button>
            </div>
            {folded ? null : items.map((i) => <Row key={i.id} issue={i} />)}
          </Fragment>
        );
      })}
    </>
  );
}
