import { Avatar, EpicChip, Lozenge, MenuItem, matches, useUI } from "./context";
import { Crumbs, DropItems, InlineCreate, Toolbar } from "./Board";
import { CompleteSprintDialog, SprintDialog } from "./Dialogs";
import { fmtShort } from "./format";
import * as I from "./icons";
import type { JiraIssue, JiraSprint } from "./types";
import { activeSprint, inSprint, ordered } from "./use-jira";

// The backlog: the active and future sprints, then the backlog itself.
// Rows drag between them; each section has its point totals and a
// "Create issue" row.

const Chev = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 10l5 5 5-5" />
  </svg>
);

function Row({ issue: i }: { issue: JiraIssue }) {
  const { jira, drag, dragStart, justDragged } = useUI();
  const done = jira.statuses.find((s) => s.id === i.status)?.tone === "done";
  return (
    <div
      className={`bl-row${i.flagged ? " flagged" : ""}${drag?.key === i.key ? " dragging" : ""}`}
      tabIndex={0}
      data-dnd="row"
      data-key={i.key}
      role="button"
      aria-label={`${i.key} ${i.summary}`}
      onPointerDown={(e) => dragStart(e, i.key, "row")}
      onClick={() => !justDragged() && jira.ui.openIssue(i.key)}
    >
      <I.TypeIcon type={i.type} />
      <span className={`k${done ? " done" : ""}`}>{i.key}</span>
      <span className="sum">{i.summary}</span>
      <span className="r">
        {i.flagged ? <span className="flag-ic" title="Flagged"><I.Flag /></span> : null}
        {i.epic ? <EpicChip epic={i.epic} /> : null}
        <span className="st"><Lozenge status={i.status} /></span>
        <span className={`pts${i.points == null ? " empty" : ""}`} title="Story point estimate">{i.points ?? "-"}</span>
        <I.PriorityIcon priority={i.priority} />
        <Avatar id={i.assignee} size={24} />
      </span>
    </div>
  );
}

function Totals({ items }: { items: JiraIssue[] }) {
  const { statuses } = useUI().jira;
  const tone = (i: JiraIssue) => statuses.find((s) => s.id === i.status)?.tone ?? "todo";
  const sum = (t: "todo" | "prog" | "done") =>
    items.filter((i) => (t === "prog" ? ["inprogress", "review"].includes(tone(i)) : tone(i) === t)).reduce((a, i) => a + (i.points ?? 0), 0);
  return (
    <span className="bl-totals">
      <span className="pts p-todo" title={`To Do: ${sum("todo")} story points`}>{sum("todo")}</span>
      <span className="pts p-prog" title={`In Progress: ${sum("prog")} story points`}>{sum("prog")}</span>
      <span className="pts p-done" title={`Done: ${sum("done")} story points`}>{sum("done")}</span>
    </span>
  );
}

function Section({ sprint, all, head, goal, empty, className = "" }: { sprint: string; all: JiraIssue[]; head: React.ReactNode; goal?: string; empty: string; className?: string }) {
  const ui = useUI();
  const { filters, setFilters, drag } = ui;
  const id = sprint === "none" ? "backlog" : sprint;
  const closed = filters.closedSections.includes(id);
  const items = all.filter((i) => matches(ui, i, "backlog"));
  const zone = `sprint:${sprint}|`;
  const dropping = drag?.zone === zone;
  const where = `sprint:${sprint}`;
  return (
    <section className={`bl-sec ${className}${closed ? " closed" : ""}`} aria-label={id}>
      {head}
      {goal ? <div className="bl-goal">{goal}</div> : null}
      <div className={`bl-list${items.length || dropping ? "" : " empty"}`} data-drop-kind="row" data-zone={zone}>
        {items.length || dropping ? (
          <DropItems zone={zone} kind="row" keys={items.map((i) => i.key)} render={(k) => <Row key={k} issue={ui.jira.state.issues[k]} />} />
        ) : all.length ? "No issues match your filters" : empty}
      </div>
      {filters.inline?.where === where ? (
        <InlineCreate row />
      ) : (
        <button className="bl-create" onClick={() => setFilters((f) => ({ ...f, inline: { where, lane: "", type: "story" } }))}>
          <I.Plus />
          Create issue
        </button>
      )}
    </section>
  );
}

function Toggle({ id, children }: { id: string; children: React.ReactNode }) {
  const { filters, setFilters } = useUI();
  const closed = filters.closedSections.includes(id);
  return (
    <button
      className="bl-toggle"
      aria-expanded={!closed}
      onClick={() => setFilters((f) => ({ ...f, closedSections: closed ? f.closedSections.filter((x) => x !== id) : [...f.closedSections, id] }))}
    >
      <Chev />
      {children}
    </button>
  );
}

function SprintSection({ sp }: { sp: JiraSprint }) {
  const ui = useUI();
  const { jira, openDialog, openPop, pop, closePop, confirm } = ui;
  const { state } = jira;
  const all = inSprint(state, sp.id).filter((i) => i.type !== "subtask");
  const hasActive = !!activeSprint(state);
  const firstFuture = state.sprints.find((s) => s.state === "future");
  const menuId = `sprint-more:${sp.id}`;
  const head = (
    <div className="bl-head">
      <Toggle id={sp.id}>
        <b>{sp.name}</b>
        <span className="sub">{sp.start && sp.end ? `${fmtShort(sp.start)} - ${fmtShort(sp.end)}` : "Add dates"}</span>
        <span className="sub">({all.length} issue{all.length === 1 ? "" : "s"})</span>
      </Toggle>
      <span className="spacer" />
      <Totals items={all} />
      {sp.state === "active" ? (
        <button className="btn" onClick={() => openDialog(<CompleteSprintDialog />)}>Complete sprint</button>
      ) : (
        <button
          className={`btn${!hasActive && sp === firstFuture ? " primary" : ""}`}
          disabled={hasActive}
          title={hasActive ? "Only one sprint can be active at a time. Complete the active sprint first." : undefined}
          onClick={() => openDialog(<SprintDialog sprintId={sp.id} />)}
        >
          Start sprint
        </button>
      )}
      <button
        className="icon-btn"
        aria-label="Sprint actions"
        aria-haspopup="menu"
        aria-expanded={pop?.id === menuId}
        onClick={(e) =>
          openPop(
            e.currentTarget,
            <>
              <MenuItem label="Edit sprint" disabled={sp.state !== "active" && hasActive} onClick={() => openDialog(<SprintDialog sprintId={sp.id} />)} />
              <MenuItem
                label="Delete sprint"
                danger
                disabled={sp.state === "active"}
                onClick={() => (closePop(), confirm({ title: `Delete ${sp.name}?`, body: "Issues in this sprint will be moved to the backlog.", ok: "Delete", run: () => jira.ui.deleteSprint(sp.id) }))}
              />
            </>,
            { id: menuId, align: "right" }
          )
        }
      >
        <I.More />
      </button>
    </div>
  );
  return <Section sprint={sp.id} all={all} head={head} goal={sp.goal} empty="Plan a sprint by dragging issues here from the backlog." />;
}

export function Backlog() {
  const { jira } = useUI();
  const { state } = jira;
  const all = ordered(state).filter((i) => !i.sprint && !i.archived && i.type !== "subtask");
  const head = (
    <div className="bl-head">
      <Toggle id="backlog">
        <b>Backlog</b>
        <span className="sub">({all.length} issue{all.length === 1 ? "" : "s"})</span>
      </Toggle>
      <span className="spacer" />
      <Totals items={all} />
      <button className="btn" onClick={jira.ui.createSprint}>Create sprint</button>
    </div>
  );
  return (
    <div className="page">
      <Crumbs />
      <div className="title-row">
        <h1>Backlog</h1>
        <button className="icon-btn" aria-label="Backlog settings" onClick={() => jira.ui.emit({ type: "action", kind: "backlog", label: "Backlog settings" })}><I.More /></button>
      </div>
      <Toolbar scope="backlog" />
      {state.sprints.filter((s) => s.state !== "closed").map((sp) => <SprintSection key={sp.id} sp={sp} />)}
      <Section sprint="none" all={all} head={head} empty="Your backlog is empty." className="backlog" />
    </div>
  );
}
