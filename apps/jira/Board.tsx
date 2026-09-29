import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar, EpicChip, MenuItem, matches, useUI, type BoardFilters } from "./context";
import { CompleteSprintDialog, SprintDialog } from "./Dialogs";
import { fmtShort } from "./format";
import * as I from "./icons";
import type { JiraIssue } from "./types";
import { activeSprint, childrenOf, inSprint, type JiraProject } from "./use-jira";

// The sprint board: the page head, the filter bar (shared with the
// backlog), columns of cards by status, swimlanes, the card menu and the
// "Create issue" box at the foot of a column.

export function Crumbs({ extra }: { extra?: string }) {
  const { jira } = useUI();
  return (
    <nav className="crumbs" aria-label="Breadcrumbs">
      <a onClick={() => jira.ui.navigate("yourwork")}>Projects</a>
      <span>/</span>
      <a onClick={() => jira.ui.navigate("board")}>{jira.seed.project.name}</a>
      {extra ? (
        <>
          <span>/</span>
          <span>{extra}</span>
        </>
      ) : null}
    </nav>
  );
}

export function Toolbar({ scope }: { scope: "board" | "backlog" }) {
  const ui = useUI();
  const { jira, filters: f, setFilters, openPop, pop } = ui;
  const set = (patch: Partial<BoardFilters>) => setFilters((x) => ({ ...x, ...patch }));
  const q = scope === "backlog" ? f.backlogQuery : f.boardQuery;
  const toggle = (id: string) => set({ assignees: f.assignees.includes(id) ? f.assignees.filter((x) => x !== id) : [...f.assignees, id] });
  const chip = (id: string | null, title: string) => {
    const on = f.assignees.includes(id ?? "none");
    return (
      <button key={id ?? "none"} className={`av-chip${on ? " on" : ""}`} aria-pressed={on} title={title} onClick={() => toggle(id ?? "none")}>
        <Avatar id={id} size={32} />
      </button>
    );
  };
  const filtered = f.assignees.length || f.mine || f.recent || q;
  const groups = { none: "None", assignee: "Assignee", epic: "Epic" } as const;
  return (
    <div className="toolbar">
      <label className="fsearch">
        <input
          type="text"
          placeholder={`Search ${scope}`}
          aria-label={`Search ${scope}`}
          value={q}
          onChange={(e) => set(scope === "backlog" ? { backlogQuery: e.target.value } : { boardQuery: e.target.value })}
        />
        <I.Search />
      </label>
      <div className="avs" role="group" aria-label="Filter by assignee">
        {Object.values(jira.people).map((p) => chip(p.id, p.name))}
        {chip(null, "Unassigned")}
      </div>
      <button className="icon-btn" aria-label="Add people" title="Add people" onClick={() => jira.ui.emit({ type: "action", kind: "board", label: "Add people" })}><I.UserPlus /></button>
      <span className="tb-sep" />
      <button className={`btn ${f.mine ? "selected" : "subtle"}`} aria-pressed={f.mine} onClick={() => set({ mine: !f.mine })}>Only my issues</button>
      <button className={`btn ${f.recent ? "selected" : "subtle"}`} aria-pressed={f.recent} onClick={() => set({ recent: !f.recent })}>Recently updated</button>
      {filtered ? <button className="btn subtle" onClick={() => set({ assignees: [], mine: false, recent: false, boardQuery: "", backlogQuery: "" })}>Clear filters</button> : null}
      <div className="grow" />
      {scope === "board" ? (
        <>
          <div className="groupby">
            <span className="lbl">Group by</span>
            <button
              className="btn"
              aria-haspopup="menu"
              aria-expanded={pop?.id === "groupby"}
              onClick={(e) =>
                openPop(
                  e.currentTarget,
                  <GroupByMenu />,
                  { id: "groupby", align: "right" }
                )
              }
            >
              {groups[f.groupBy]}
              <I.ChevD />
            </button>
          </div>
          <button className="btn subtle insights-btn" onClick={() => jira.ui.emit({ type: "action", kind: "board", label: "Insights" })}><I.Insights /><span>Insights</span></button>
        </>
      ) : null}
    </div>
  );
}

function GroupByMenu() {
  const { filters, setFilters, closePop } = useUI();
  const groups = { none: "None", assignee: "Assignee", epic: "Epic" } as const;
  return (
    <>
      {(Object.keys(groups) as (keyof typeof groups)[]).map((g) => (
        <MenuItem key={g} role="menuitemradio" on={filters.groupBy === g} label={groups[g]} onClick={() => (setFilters((x) => ({ ...x, groupBy: g })), closePop())}>
          {filters.groupBy === g ? <span className="tick"><I.Check /></span> : null}
        </MenuItem>
      ))}
    </>
  );
}

export const focusItem = (root: HTMLElement | null, key: string) =>
  requestAnimationFrame(() => root?.querySelector<HTMLElement>(`[data-dnd][data-key="${key}"]`)?.focus({ preventScroll: false }));

export function CardMenu({ issueKey }: { issueKey: string }) {
  const { jira, closePop, confirm, root } = useUI();
  const { state, me } = jira;
  const is = state.issues[issueKey];
  if (!is) return null;
  const sp = activeSprint(state);
  const column = () => inSprint(state, is.sprint ?? "").filter((i) => i.status === is.status && i.key !== is.key && i.type !== "subtask");
  const run = (fn: () => void) => () => {
    closePop();
    fn();
    focusItem(root.current, issueKey);
  };
  return (
    <>
      <div className="menu-h">Move to</div>
      {jira.statuses.map((s) => (
        <MenuItem key={s.id} label={s.name} disabled={is.status === s.id} onClick={run(() => jira.ui.setStatus(issueKey, s.id))} />
      ))}
      <MenuItem label="Top of column" onClick={run(() => jira.ui.rank(issueKey, column()[0]?.key ?? null, null))} />
      <MenuItem label="Bottom of column" onClick={run(() => jira.ui.rank(issueKey, null, column().at(-1)?.key ?? null))} />
      <div className="mi-sep" />
      <MenuItem label={is.flagged ? "Remove flag" : "Add flag"} icon={<I.FlagO />} onClick={run(() => jira.ui.toggleFlag(issueKey))} />
      <MenuItem label="Assign to me" icon={<I.Person />} disabled={is.assignee === me} onClick={run(() => jira.ui.assign(issueKey, me, true))} />
      <MenuItem label="Copy link" icon={<I.Link />} onClick={run(() => jira.ui.copyLink(issueKey))} />
      <MenuItem
        label={sp && is.sprint === sp.id ? "Move to backlog" : "Move to active sprint"}
        icon={<I.MoveTo />}
        disabled={!sp}
        onClick={run(() => {
          const to = sp && is.sprint === sp.id ? null : sp!.id;
          jira.ui.setField(issueKey, "sprint", to);
          jira.ui.flag({ type: "success", title: to ? `${issueKey} moved to ${sp!.name}` : `${issueKey} moved to the backlog` });
        })}
      />
      <div className="mi-sep" />
      <MenuItem label="Delete" icon={<I.Trash />} danger onClick={() => (closePop(), confirmDelete(jira, confirm, issueKey))} />
    </>
  );
}

export function confirmDelete(jira: JiraProject, confirm: ReturnType<typeof useUI>["confirm"], key: string) {
  confirm({
    title: `Delete ${key}?`,
    body: "You're about to permanently delete this issue, its comments and attachments, and all of its data. If you're not sure, you can resolve or close this issue instead.",
    ok: "Delete",
    run: () => jira.ui.deleteIssue(key),
  });
}

function Card({ issue: i }: { issue: JiraIssue }) {
  const { jira, openPop, pop, drag, dragStart, justDragged } = useUI();
  const kids = childrenOf(jira.state, i);
  const done = jira.statuses[jira.statuses.length - 1].id;
  const doneKids = kids.filter((k) => k.status === done).length;
  const menuId = `card:${i.key}`;
  return (
    <div
      className={`card${i.flagged ? " flagged" : ""}${drag?.key === i.key ? " dragging" : ""}`}
      tabIndex={0}
      data-dnd="card"
      data-key={i.key}
      role="button"
      aria-label={`${i.key} ${i.summary}`}
      onPointerDown={(e) => dragStart(e, i.key, "card")}
      onClick={() => !justDragged() && jira.ui.openIssue(i.key)}
    >
      <div className="card-sum">{i.summary}</div>
      <button
        className="card-menu-btn"
        aria-label={`Card actions for ${i.key}`}
        aria-haspopup="menu"
        aria-expanded={pop?.id === menuId}
        onClick={(e) => (e.stopPropagation(), openPop(e.currentTarget, <CardMenu issueKey={i.key} />, { id: menuId, align: "right" }))}
      >
        <I.More />
      </button>
      {i.epic ? <div className="card-epic"><EpicChip epic={i.epic} /></div> : null}
      <div className="card-foot">
        <span className="card-key"><I.TypeIcon type={i.type} /><span className="k">{i.key}</span></span>
        <span className="card-meta">
          {i.flagged ? <span className="flag-ic" title="Flagged"><I.Flag /></span> : null}
          {kids.length ? <span className="subprog" title={`${doneKids} of ${kids.length} subtasks done`}><I.Child />{doneKids}/{kids.length}</span> : null}
          {i.points != null ? <span className="pts" title="Story point estimate">{i.points}</span> : null}
          <I.PriorityIcon priority={i.priority} />
          <Avatar id={i.assignee} size={24} />
        </span>
      </div>
    </div>
  );
}

/** The "Create issue" box: a card on the board, a row in the backlog. */
export function InlineCreate({ row }: { row?: boolean }) {
  const { jira, filters, setFilters, openPop, pop } = useUI();
  const input = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [text, setText] = useState("");
  const ic = filters.inline!;
  useEffect(() => input.current?.focus(), [ic.type]);
  const close = () => setFilters((f) => ({ ...f, inline: null }));
  const submit = () => {
    const summary = text.trim();
    if (!summary) return close();
    const [kind, val] = [ic.where.slice(0, ic.where.indexOf(":")), ic.where.slice(ic.where.indexOf(":") + 1)];
    const o: Parameters<typeof jira.ui.create>[0] = { type: ic.type, summary };
    if (kind === "status") {
      o.status = val;
      o.sprint = activeSprint(jira.state)?.id ?? null;
      const [lk, lv] = ic.lane ? ic.lane.split(":") : [];
      if (lk === "assignee") o.assignee = lv === "none" ? null : lv;
      if (lk === "epic") o.epic = lv === "none" ? null : lv;
    } else o.sprint = val === "none" ? null : val;
    jira.ui.create(o, {}, "short");
    setText("");
    input.current?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) (e.preventDefault(), submit());
    if (e.key === "Escape") (e.stopPropagation(), close());
  };
  const typeSel = (
    <button
      className="type-sel"
      aria-label={`Issue type: ${I.TYPE_NAMES[ic.type]}`}
      aria-expanded={pop?.id === "inline-type"}
      onClick={(e) =>
        openPop(
          e.currentTarget,
          <>
            {(["story", "task", "bug"] as const).map((t) => (
              <InlineType key={t} type={t} />
            ))}
          </>,
          { id: "inline-type" }
        )
      }
    >
      <I.TypeIcon type={ic.type} />
      <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
    </button>
  );
  if (row)
    return (
      <div className="inline-row">
        {typeSel}
        <input ref={input} placeholder="What needs to be done?" aria-label="Summary of new issue" maxLength={255} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
        <button className="btn primary sm" onClick={submit}>Create</button>
      </div>
    );
  return (
    <div className="inline-card">
      <textarea ref={input} placeholder="What needs to be done?" aria-label="Summary of new issue" maxLength={255} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
      <div className="ic-row">
        {typeSel}
        <span className="ic-hint">Enter to create</span>
        <button className="btn primary sm" onClick={submit}>Create</button>
      </div>
    </div>
  );
}

function InlineType({ type }: { type: "story" | "task" | "bug" }) {
  const { filters, setFilters, closePop } = useUI();
  return (
    <MenuItem
      label={I.TYPE_NAMES[type]}
      icon={<I.TypeIcon type={type} />}
      on={filters.inline?.type === type}
      onClick={() => (closePop(), setFilters((f) => (f.inline ? { ...f, inline: { ...f.inline, type } } : f)))}
    />
  );
}

/** Items in a drop zone, with the placeholder where a drag would land. */
export function DropItems({ zone, keys, render, kind }: { zone: string; keys: string[]; render: (key: string) => ReactNode; kind: "card" | "row" }) {
  const { drag } = useUI();
  const ph = <div key="drop-ph" className={`drop-ph ${kind}`} style={{ height: drag?.height }} />;
  const here = drag && drag.zone === zone;
  const out: ReactNode[] = [];
  for (const k of keys) {
    if (here && drag.before === k) out.push(ph);
    out.push(render(k));
  }
  if (here && !drag.before) out.push(ph);
  return <>{out}</>;
}

interface Lane {
  id: string;
  head: ReactNode;
  items: JiraIssue[];
}

function lanesFor(jira: JiraProject, groupBy: BoardFilters["groupBy"], items: JiraIssue[]): Lane[] {
  const { people, state, me } = jira;
  if (groupBy === "assignee") {
    const ids = [...Object.keys(people).filter((id) => items.some((i) => i.assignee === id)), ...(items.some((i) => !i.assignee) ? ["none"] : [])];
    if (ids.includes(me)) ids.splice(ids.indexOf(me), 1), ids.unshift(me);
    return ids.map((id) => ({
      id: `assignee:${id}`,
      head: <><Avatar id={id === "none" ? null : id} size={24} /><b>{id === "none" ? "Unassigned" : people[id].name}</b></>,
      items: items.filter((i) => (i.assignee ?? "none") === id),
    }));
  }
  if (groupBy === "epic") {
    const ids = [...state.epics.filter((e) => items.some((i) => i.epic === e)), ...(items.some((i) => !i.epic) ? ["none"] : [])];
    return ids.map((id) => ({
      id: `epic:${id}`,
      head: id === "none" ? <b>Issues without epic</b> : <><I.TypeIcon type="epic" /><b>{state.issues[id].summary}</b><span className="sub">{id}</span></>,
      items: items.filter((i) => (i.epic ?? "none") === id),
    }));
  }
  return [{ id: "", head: null, items }];
}

export function Board() {
  const ui = useUI();
  const { jira, filters, setFilters, openPop, pop, openDialog } = ui;
  const { state, statuses } = jira;
  const sp = activeSprint(state);
  const board = jira.seed.project.board ?? `${jira.seed.project.key} board`;
  if (!sp)
    return (
      <div className="page">
        <Crumbs />
        <div className="title-row"><h1>{board}</h1></div>
        <div className="board-empty">
          <I.Board style={{ width: 48, height: 48, margin: "0 auto", color: "var(--subtlest)" }} />
          <h2>Get started in the backlog</h2>
          <p>Plan and start a sprint to see issues here.</p>
          <button className="btn primary" onClick={() => jira.ui.navigate("backlog")}>Go to backlog</button>
        </div>
      </div>
    );

  const all = inSprint(state, sp.id).filter((i) => i.type !== "subtask");
  const items = all.filter((i) => matches(ui, i, "board"));
  const lanes = lanesFor(jira, filters.groupBy, items);
  const lanesMode = filters.groupBy !== "none";
  const over = (id: string) => {
    const limit = statuses.find((s) => s.id === id)?.limit;
    return !!limit && all.filter((i) => i.status === id).length > limit;
  };
  const daysLeft = Math.max(0, Math.ceil(((sp.end ?? jira.now()) - jira.now()) / 86_400_000));
  const filtered = filters.assignees.length || filters.mine || filters.recent || filters.boardQuery;
  const toggleLane = (id: string) =>
    setFilters((f) => ({ ...f, closedLanes: f.closedLanes.includes(id) ? f.closedLanes.filter((x) => x !== id) : [...f.closedLanes, id] }));

  return (
    <div className="page fill">
      <Crumbs />
      <div className="title-row">
        <h1>{sp.name}</h1>
        <button className="icon-btn" aria-label="Star board" title={state.starred ? "Remove from starred" : "Add to starred"} style={{ color: state.starred ? "#e2b203" : undefined }} onClick={jira.ui.toggleStar}>
          {state.starred ? <I.StarF /> : <I.Star />}
        </button>
        <span className="days" title={sp.start && sp.end ? `${fmtShort(sp.start)} - ${fmtShort(sp.end)}` : undefined}><I.Clock />{daysLeft} days remaining</span>
        <button className="btn" onClick={() => openDialog(<CompleteSprintDialog />)}>Complete sprint</button>
        <button
          className="icon-btn"
          aria-label="More board actions"
          aria-haspopup="menu"
          aria-expanded={pop?.id === "board-more"}
          onClick={(e) =>
            openPop(
              e.currentTarget,
              <>
                <MenuItem label="Edit sprint" onClick={() => openDialog(<SprintDialog sprintId={sp.id} />)} />
                <MenuItem label="Manage custom filters" onClick={() => (ui.closePop(), jira.ui.emit({ type: "action", kind: "board", label: "Manage custom filters" }))} />
                <MenuItem label="Configure board" onClick={() => (ui.closePop(), jira.ui.emit({ type: "action", kind: "board", label: "Configure board" }))} />
              </>,
              { id: "board-more", align: "right" }
            )
          }
        >
          <I.More />
        </button>
      </div>
      {sp.goal ? <div className="goal"><b>Sprint goal:</b> {sp.goal}</div> : null}
      <Toolbar scope="board" />
      <div className="board-scroll">
        <div className={`board${lanesMode ? " lanes" : ""}`} style={{ "--cols": statuses.length } as CSSProperties}>
          {statuses.map((s) => (
            <div key={s.id} className={`col-head${over(s.id) ? " over" : ""}`}>
              <span>{s.name}</span>
              <span className="cnt">{items.filter((i) => i.status === s.id).length}</span>
              {s.tone === "done" ? <I.Check className="done-ic" /> : null}
              {s.limit ? <span className="wip" title={over(s.id) ? "Maximum issues exceeded" : "Column limit"}>Max: {s.limit}</span> : null}
            </div>
          ))}
          {lanes.map((ln, li) => {
            const closed = filters.closedLanes.includes(ln.id);
            return [
              lanesMode ? (
                <div key={`lane:${ln.id}`} className={`lane-head${closed ? " closed" : ""}`}>
                  <button className="tg" aria-expanded={!closed} aria-label="Toggle swimlane" onClick={() => toggleLane(ln.id)}><I.ChevD /></button>
                  {ln.head}
                  <span className="sub">({ln.items.length} issue{ln.items.length === 1 ? "" : "s"})</span>
                </div>
              ) : null,
              ...(closed
                ? []
                : statuses.map((s, si) => {
                    const zone = `status:${s.id}|${ln.id}`;
                    const inline = filters.inline?.where === `status:${s.id}` && filters.inline.lane === ln.id;
                    const cellItems = ln.items.filter((i) => i.status === s.id);
                    return (
                      <div
                        key={zone}
                        className={`cell${li === lanes.length - 1 ? " last" : ""}${si === 0 ? " first" : ""}${over(s.id) ? " over-wip" : ""}${ui.drag?.zone === zone && ui.drag.kind === "card" ? " drop-target" : ""}`}
                        data-drop-kind="card"
                        data-zone={zone}
                        aria-label={s.name}
                      >
                        <DropItems zone={zone} kind="card" keys={cellItems.map((i) => i.key)} render={(k) => <Card key={k} issue={state.issues[k]} />} />
                        <div className="cell-end">
                          {inline ? (
                            <InlineCreate />
                          ) : (
                            <button className="cell-create" onClick={() => setFilters((f) => ({ ...f, inline: { where: `status:${s.id}`, lane: ln.id, type: "story" } }))}>
                              <I.Plus />
                              Create issue
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })),
            ];
          })}
          {!items.length && filtered ? (
            <div className="no-match">
              No issues match your filters.{" "}
              <a onClick={() => setFilters((f) => ({ ...f, assignees: [], mine: false, recent: false, boardQuery: "", backlogQuery: "" }))}>Clear filters</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
