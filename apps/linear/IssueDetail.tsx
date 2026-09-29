import { useState } from "react";
import { Avatar, useUI } from "./context";
import { Description, ago, shortDate } from "./format";
import * as I from "./icons";
import { LabelPill, StatusButton } from "./IssueList";
import type { LinearActivity, LinearIssue } from "./types";
import { PRIORITIES } from "./use-linear";

// An open issue: the breadcrumb with previous/next, then its title,
// description, sub-issues, activity and comment box, and the properties
// panel on the right.

export function DetailHeader({ issue }: { issue: LinearIssue }) {
  const { linear } = useUI();
  const team = linear.teams.find((t) => t.id === issue.team) ?? linear.teams[0];
  const list = linear.visible();
  const idx = list.findIndex((i) => i.id === issue.id);
  return (
    <>
      <div className="crumb">
        <button className="icon-btn" title="Back" aria-label="Back to issues" onClick={() => linear.open(null)}>
          <I.Back />
        </button>
        <span className="team-ic" style={{ background: team.color }}>{team.letter}</span>
        <span>{team.name}</span>
        <span className="sep">&rsaquo;</span>
        <b>{issue.id}</b>
      </div>
      <div className="hdr-right">
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>
          {idx + 1} / {list.length}
        </span>
        <button className="icon-btn" title="Previous" aria-label="Previous issue" onClick={() => linear.ui.step(-1)}>
          <I.Up />
        </button>
        <button className="icon-btn" title="Next" aria-label="Next issue" onClick={() => linear.ui.step(1)}>
          <I.Down />
        </button>
        <button className="icon-btn" aria-label="More"><I.More /></button>
      </div>
    </>
  );
}

function Entry({ entry }: { entry: LinearActivity }) {
  const { linear, renderCustom } = useUI();
  const name = linear.people[entry.from]?.name ?? entry.from;
  if (entry.custom && renderCustom) return <>{renderCustom(entry)}</>;
  if (entry.kind === "event")
    return (
      <div className="act-item">
        <span className="act-ic"><Avatar id={entry.from} size={16} /></span>
        <b>{name}</b> {entry.text} <span>&middot; {ago(entry.at)}</span>
      </div>
    );
  return (
    <div className="cmt">
      <div className="cmt-h">
        <Avatar id={entry.from} />
        <b>{name}</b>
        <span>{ago(entry.at)}</span>
      </div>
      <div className="cmt-b">{entry.text}</div>
    </div>
  );
}

function Composer({ issue }: { issue: LinearIssue }) {
  const { linear } = useUI();
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    linear.ui.postComment(issue.id, text.trim());
    setText("");
  };
  return (
    <div className="composer">
      <textarea
        placeholder="Leave a comment..."
        aria-label="Leave a comment"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
      />
      <button className="btn-pri" onClick={send}>Comment</button>
    </div>
  );
}

function Properties({ issue }: { issue: LinearIssue }) {
  const { linear, openMenu } = useUI();
  const { seed, statuses, people } = linear;
  const status = statuses.find((s) => s.id === issue.status) ?? statuses[0];
  const project = issue.project ? seed.projects?.[issue.project] : undefined;
  const cycle = issue.cycle ? seed.cycles?.[issue.cycle] : undefined;
  return (
    <aside className="props" aria-label="Properties">
      <div className="props-h">Properties</div>
      <button className="prop" data-menu="" onClick={(e) => openMenu(e.currentTarget, "status", issue.id)}>
        <span className="k">Status</span>
        <span className="v"><I.StatusIcon status={status} />{status.name}</span>
      </button>
      <button className="prop" data-menu="" onClick={(e) => openMenu(e.currentTarget, "priority", issue.id)}>
        <span className="k">Priority</span>
        <span className="v"><I.PriorityIcon priority={issue.priority} />{PRIORITIES[issue.priority]}</span>
      </button>
      <button className="prop" data-menu="" onClick={(e) => openMenu(e.currentTarget, "assignee", issue.id)}>
        <span className="k">Assignee</span>
        <span className="v">
          <Avatar id={issue.assignee} />
          {issue.assignee ? <span>{people[issue.assignee]?.name ?? issue.assignee}</span> : <span style={{ color: "var(--text-3)" }}>Unassigned</span>}
        </span>
      </button>
      {issue.labels.length ? (
        <>
          <div className="props-h">Labels</div>
          <div className="prop"><span className="v">{issue.labels.map((l) => <LabelPill key={l} name={l} />)}</span></div>
        </>
      ) : null}
      {cycle ? (
        <>
          <div className="props-h">Cycle</div>
          <button className="prop">
            <I.Cycles stroke="var(--accent)" />
            <span>{cycle.name}</span>
            {cycle.dates ? <span style={{ color: "var(--text-3)", fontWeight: 450 }}>{cycle.dates}</span> : null}
          </button>
        </>
      ) : null}
      {project ? (
        <>
          <div className="props-h">Project</div>
          <button className="prop">
            <I.Projects stroke={project.color ?? "currentColor"} />
            <span>{project.name}</span>
          </button>
        </>
      ) : null}
      {issue.due != null ? (
        <>
          <div className="props-h">Due date</div>
          <button className="prop"><I.Cal /><span>{shortDate(issue.due, true)}</span></button>
        </>
      ) : null}
    </aside>
  );
}

export function IssueDetail({ issue }: { issue: LinearIssue }) {
  const { linear } = useUI();
  const { statuses } = linear;
  const subs = issue.subIssues.map((id) => linear.state.issues.find((i) => i.id === id)).filter((i): i is LinearIssue => !!i);
  const done = subs.filter((s) => statuses.find((st) => st.id === s.status)?.type === "completed").length;
  return (
    <div className="detail">
      <div className="d-body">
        <div className="d-inner">
          <h1 className="d-title">{issue.title}</h1>
          <div className="d-desc"><Description text={issue.description} /></div>
          {subs.length ? (
            <div className="d-sec">
              <div className="d-sec-h">Sub-issues <span className="n">{done}/{subs.length}</span></div>
              <div className="subs">
                {subs.map((s) => (
                  <div key={s.id} className="row" onClick={() => linear.open(s.id)}>
                    <span className="pri" title={PRIORITIES[s.priority]}><I.PriorityIcon priority={s.priority} /></span>
                    <span className="iid">{s.id}</span>
                    <StatusButton issue={s} />
                    <span className="ttl">{s.title}</span>
                    <Avatar id={s.assignee} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="d-sec">
            <div className="d-sec-h">Activity</div>
            <div className="act">
              {issue.activity.map((a) => <Entry key={a.id} entry={a} />)}
            </div>
            <Composer issue={issue} />
          </div>
        </div>
      </div>
      <Properties issue={issue} />
    </div>
  );
}
