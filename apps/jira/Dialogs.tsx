import { useEffect, useRef, useState, type ReactNode } from "react";
import { ProjectMark, useUI } from "./context";
import { isoDay } from "./format";
import * as I from "./icons";
import type { IssueType, Priority } from "./types";
import { activeSprint, DAY, inSprint } from "./use-jira";

// Jira's dialogs: Create issue, Start or edit a sprint, Complete sprint, a
// confirmation, and the keyboard shortcuts.

function Dialog({ className = "", children }: { className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    const f = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>("input.text, select.text, textarea.text") ?? el?.querySelector<HTMLElement>(".dlg-foot .btn.primary, .dlg-foot .btn.danger");
    f?.focus();
  }, []);
  return (
    <div ref={box} className={`dialog ${className}`} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}

export function ConfirmDialog({ title, body, ok, run }: { title: string; body: string; ok: string; run: () => void }) {
  const { closeDialog } = useUI();
  return (
    <Dialog className="sm">
      <div className="dlg-head"><h2><I.Warn className="warn-ic" />{title}</h2></div>
      <div className="dlg-body"><p>{body}</p></div>
      <div className="dlg-foot">
        <span className="spacer" />
        <button className="btn subtle" onClick={closeDialog}>Cancel</button>
        <button className="btn danger" onClick={() => (closeDialog(), run())}>{ok}</button>
      </div>
    </Dialog>
  );
}

export function ShortcutsDialog() {
  const { closeDialog } = useUI();
  const row = (d: string, ...k: string[]) => (
    <tr key={d}>
      <td>{d}</td>
      <td>{k.map((x) => <span key={x} className="kbd">{x}</span>)}</td>
    </tr>
  );
  return (
    <Dialog className="md">
      <div className="dlg-head"><h2>Keyboard shortcuts</h2><button className="icon-btn" aria-label="Close" onClick={closeDialog}><I.Close /></button></div>
      <div className="dlg-body">
        <div className="sc-h">Global</div>
        <table className="shortcuts"><tbody>{row("Create issue", "c")}{row("Quick search", "/")}{row("Open shortcut help", "?")}{row("Toggle sidebar", "[")}{row("Close dialog or issue", "Esc")}</tbody></table>
        <div className="sc-h">Board and backlog</div>
        <table className="shortcuts"><tbody>{row("Next card", "j")}{row("Previous card", "k")}{row("Open focused card", "Enter")}</tbody></table>
        <div className="sc-h">Issue</div>
        <table className="shortcuts"><tbody>{row("Assign to me", "i")}{row("Comment", "m")}{row("Edit summary", "e")}</tbody></table>
      </div>
      <div className="dlg-foot"><span className="spacer" /><button className="btn primary" onClick={closeDialog}>Close</button></div>
    </Dialog>
  );
}

export function CompleteSprintDialog() {
  const { jira, closeDialog } = useUI();
  const { state } = jira;
  const sp = activeSprint(state);
  const future = state.sprints.filter((s) => s.state === "future");
  const [dest, setDest] = useState(future[0]?.id ?? "new");
  if (!sp) return null;
  const items = inSprint(state, sp.id).filter((i) => i.type !== "subtask");
  const doneId = jira.statuses[jira.statuses.length - 1];
  const done = items.filter((i) => i.status === doneId.id).length;
  const open = items.length - done;
  return (
    <Dialog className="md">
      <div className="dlg-head"><h2>Complete {sp.name}</h2></div>
      <div className="dlg-body">
        <p>This sprint contains <b>{done} completed issue{done === 1 ? "" : "s"}</b> and <b>{open} open issue{open === 1 ? "" : "s"}</b>.</p>
        <ul className="sum-list">
          <li>Completed issues include everything in the last column on the board, <b>{doneId.name}</b>.</li>
          <li>Open issues include everything from any other column on the board. Move these to a new sprint or the backlog.</li>
        </ul>
        {open ? (
          <div className="form-row" style={{ marginTop: 20 }}>
            <label className="field-label" htmlFor="jira-move-open">Move open issues to</label>
            <select className="text" id="jira-move-open" value={dest} onChange={(e) => setDest(e.target.value)}>
              {future.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              <option value="new">New sprint</option>
              <option value="none">Backlog</option>
            </select>
          </div>
        ) : null}
      </div>
      <div className="dlg-foot">
        <span className="spacer" />
        <button className="btn subtle" onClick={closeDialog}>Cancel</button>
        <button className="btn primary" onClick={() => (closeDialog(), jira.ui.completeSprint(dest === "none" ? null : dest))}>Complete sprint</button>
      </div>
    </Dialog>
  );
}

/** Start a future sprint, or edit the active one. */
export function SprintDialog({ sprintId }: { sprintId: string }) {
  const { jira, closeDialog } = useUI();
  const sp = jira.state.sprints.find((s) => s.id === sprintId);
  const editing = sp?.state === "active";
  const start0 = editing && sp?.start ? sp.start : jira.now();
  const [name, setName] = useState(sp?.name ?? "");
  const [start, setStart] = useState(isoDay(start0));
  const [end, setEnd] = useState(isoDay(editing && sp?.end ? sp.end : start0 + 13 * DAY));
  const [goal, setGoal] = useState(sp?.goal ?? "");
  const [bad, setBad] = useState<"name" | "end" | null>(null);
  if (!sp) return null;
  const n = inSprint(jira.state, sprintId).filter((i) => i.type !== "subtask").length;
  const submit = () => {
    if (!name.trim()) return setBad("name");
    const s = new Date(`${start}T09:00`).getTime();
    const e = new Date(`${end}T18:00`).getTime();
    if (!(e > s)) return setBad("end");
    closeDialog();
    jira.ui.startSprint(sprintId, { name: name.trim(), start: s, end: e, goal: goal.trim() });
  };
  return (
    <Dialog className="md">
      <div className="dlg-head"><h2>{editing ? `Edit sprint: ${sp.name}` : "Start Sprint"}</h2></div>
      <div className="dlg-body">
        <p style={{ marginBottom: 16 }}><b>{n} issue{n === 1 ? "" : "s"}</b> {editing ? "are" : "will be"} included in this sprint.</p>
        <p className="req-note">Required fields are marked with an asterisk <span className="req">*</span></p>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-sp-name">Sprint name<span className="req">*</span></label>
          <input className={`text${bad === "name" ? " invalid" : ""}`} id="jira-sp-name" value={name} maxLength={60} onChange={(e) => (setName(e.target.value), setBad(null))} />
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-sp-dur">Duration<span className="req">*</span></label>
          <select
            className="text w-half"
            id="jira-sp-dur"
            defaultValue="14"
            onChange={(e) => setEnd(isoDay(new Date(`${start}T09:00`).getTime() + (+e.target.value - 1) * DAY))}
          >
            <option value="7">1 week</option>
            <option value="14">2 weeks</option>
            <option value="21">3 weeks</option>
            <option value="28">4 weeks</option>
          </select>
        </div>
        <div className="form-row half">
          <div>
            <label className="field-label" htmlFor="jira-sp-start">Start date<span className="req">*</span></label>
            <input className="text" type="date" id="jira-sp-start" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="jira-sp-end">End date<span className="req">*</span></label>
            <input className={`text${bad === "end" ? " invalid" : ""}`} type="date" id="jira-sp-end" value={end} onChange={(e) => (setEnd(e.target.value), setBad(null))} />
          </div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-sp-goal">Sprint goal</label>
          <textarea className="text" id="jira-sp-goal" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
      </div>
      <div className="dlg-foot">
        <span className="spacer" />
        <button className="btn subtle" onClick={closeDialog}>Cancel</button>
        <button className="btn primary" onClick={submit}>{editing ? "Update" : "Start"}</button>
      </div>
    </Dialog>
  );
}

const TYPES: [IssueType, string][] = [["story", "Story"], ["task", "Task"], ["bug", "Bug"], ["epic", "Epic"]];
// "Create another" is remembered between openings, as in Jira.
let createAnother = false;

export function CreateDialog({ preset }: { preset: { type?: string; status?: string } }) {
  const { jira, closeDialog } = useUI();
  const { state, people, me, seed } = jira;
  const sp = activeSprint(state);
  const blank = {
    type: (preset.type as IssueType) ?? "story",
    status: preset.status ?? jira.statuses[0].id,
    summary: "",
    description: "",
    assignee: "",
    epic: "",
    priority: "medium" as Priority,
    labels: "",
    sprint: sp?.id ?? "",
    points: "",
  };
  const [f, setF] = useState(blank);
  const [another, setAnother] = useState(createAnother);
  const [bad, setBad] = useState(false);
  const summary = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof blank>) => setF((x) => ({ ...x, ...patch }));
  const submit = () => {
    const s = f.summary.trim();
    if (!s) return setBad(true), summary.current?.focus();
    jira.ui.create({
      type: f.type,
      summary: s,
      status: f.status,
      assignee: f.assignee || null,
      priority: f.priority,
      labels: f.labels.split(",").map((x) => x.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean),
      sprint: f.type === "epic" ? null : f.sprint || null,
      epic: f.type === "epic" ? null : f.epic || null,
      points: f.points === "" ? null : Math.max(0, Math.min(100, Math.round(+f.points))),
      description: f.description.trim()
        ? f.description.trim().split(/\n{2,}/).map((p) => `<p>${p.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!).replace(/\n/g, "<br>")}</p>`).join("")
        : "",
    });
    createAnother = another;
    if (another) {
      set({ summary: "", description: "", points: "" });
      summary.current?.focus();
    } else closeDialog();
  };
  const select = (id: string, value: string, opts: [string, string][], onChange: (v: string) => void, className = "text") => (
    <select className={className} id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  return (
    <Dialog className="create-dlg">
      <div className="dlg-head">
        <h2>Create issue</h2>
        <button className="icon-btn" aria-label="More" onClick={() => jira.ui.emit({ type: "action", kind: "create", label: "Import issues" })}><I.More /></button>
        <button className="icon-btn" aria-label="Close" onClick={closeDialog}><I.Close /></button>
      </div>
      <form className="dlg-body" noValidate onSubmit={(e) => (e.preventDefault(), submit())}>
        <p className="req-note">Required fields are marked with an asterisk <span className="req">*</span></p>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-project">Project<span className="req">*</span></label>
          <div className="sel-wrap w-half">
            <span className="sel-ic"><ProjectMark size={16} /></span>
            <select className="text with-ic" id="jira-c-project"><option>{seed.project.name} ({seed.project.key})</option></select>
          </div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-type">Issue type<span className="req">*</span></label>
          <div className="sel-wrap w-half">
            <span className="sel-ic"><I.TypeIcon type={f.type} /></span>
            {select("jira-c-type", f.type, TYPES, (v) => set({ type: v as IssueType }), "text with-ic")}
          </div>
          <div className="field-help"><a onClick={() => jira.ui.emit({ type: "action", kind: "create", label: "Learn about issue types" })}>Learn about issue types</a></div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-status">Status</label>
          <div className="w-half">{select("jira-c-status", f.status, jira.statuses.map((s) => [s.id, s.name]), (v) => set({ status: v }))}</div>
          <div className="field-help">This is the issue's initial status upon creation</div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-summary">Summary<span className="req">*</span></label>
          <input
            ref={summary}
            className={`text${bad ? " invalid" : ""}`}
            id="jira-c-summary"
            maxLength={255}
            autoComplete="off"
            data-autofocus
            aria-invalid={bad || undefined}
            value={f.summary}
            onChange={(e) => (set({ summary: e.target.value }), e.target.value.trim() && setBad(false))}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          />
          {bad ? <div className="field-err"><I.ErrIc /><span>Summary is required</span></div> : null}
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-desc">Description</label>
          <div className="fake-editor">
            <div className="ed-toolbar" aria-hidden="true">
              <span className="tb-btn txt">Normal text<I.ChevD /></span>
              <span className="tb-sep" />
              <span className="tb-btn"><I.Bold /></span>
              <span className="tb-btn"><I.Italic /></span>
              <span className="tb-sep" />
              <span className="tb-btn"><I.Ul /></span>
              <span className="tb-btn"><I.Ol /></span>
              <span className="tb-sep" />
              <span className="tb-btn"><I.Link /></span>
              <span className="tb-btn"><I.CodeI /></span>
              <span className="tb-btn"><I.At /></span>
            </div>
            <textarea id="jira-c-desc" placeholder="Describe the work, expected result and any links" value={f.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-assignee">Assignee</label>
          <div className="w-half">
            {select("jira-c-assignee", f.assignee, [["", "Unassigned"], ...Object.values(people).map((p): [string, string] => [p.id, p.name + (p.id === me ? " (you)" : "")])], (v) => set({ assignee: v }))}
          </div>
          <a className="assign-me" onClick={() => set({ assignee: me })}>Assign to me</a>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-parent">Parent</label>
          <div className="w-half">
            {select("jira-c-parent", f.epic, [["", "None"], ...state.epics.filter((k) => state.issues[k]).map((k): [string, string] => [k, `${k} ${state.issues[k].summary}`])], (v) => set({ epic: v }))}
          </div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-priority">Priority</label>
          <div className="sel-wrap w-half">
            <span className="sel-ic"><I.PriorityIcon priority={f.priority} /></span>
            {select("jira-c-priority", f.priority, I.PRIORITY_ORDER.map((p) => [p, I.PRIORITY_NAMES[p]]), (v) => set({ priority: v as Priority }), "text with-ic")}
          </div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-labels">Labels</label>
          <input className="text" id="jira-c-labels" placeholder="backend, checkout" list="jira-label-list" autoComplete="off" value={f.labels} onChange={(e) => set({ labels: e.target.value })} />
          <datalist id="jira-label-list">{state.labels.map((l) => <option key={l} value={l} />)}</datalist>
          <div className="field-help">Separate labels with commas</div>
        </div>
        <div className="form-row">
          <label className="field-label" htmlFor="jira-c-sprint">Sprint</label>
          <div className="w-half">
            {select("jira-c-sprint", f.sprint, [["", "None (backlog)"], ...state.sprints.filter((s) => s.state !== "closed").map((s): [string, string] => [s.id, s.name + (s.state === "active" ? " (active)" : "")])], (v) => set({ sprint: v }))}
          </div>
        </div>
        <div className="form-row" style={{ marginBottom: 4 }}>
          <label className="field-label" htmlFor="jira-c-points">Story point estimate</label>
          <input className="text" id="jira-c-points" type="number" min={0} max={100} step={1} inputMode="numeric" style={{ maxWidth: 120 }} value={f.points} onChange={(e) => set({ points: e.target.value })} />
        </div>
      </form>
      <div className="dlg-foot">
        <label className="check"><input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} />Create another</label>
        <span className="spacer" />
        <button className="btn subtle" onClick={closeDialog}>Cancel</button>
        <button className="btn primary" onClick={submit}>Create</button>
      </div>
    </Dialog>
  );
}
