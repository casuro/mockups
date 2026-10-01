import { Branch, useUI } from "./context";
import { ago, dur } from "./format";
import * as I from "./icons";
import type { GitHubRun } from "./types";
import { shownRuns } from "./use-github";

// Actions: the workflows on the left, and the runs of the one picked (or of
// all of them), newest first, each with its status, what triggered it, its
// branch, when it ran and how long it took.

export const RUN_TEXT = { success: "Success", failure: "Failure", in_progress: "In progress", queued: "Queued", cancelled: "Cancelled" };
const trigger = (r: GitHubRun) =>
  r.event === "pull_request" ? `Pull request #${r.pr} by ${r.actor}` : r.event === "push" ? `Commit ${r.sha} pushed by ${r.actor}` : "Scheduled";

export function Actions() {
  const { github } = useUI();
  const { state, seed, ui } = github;
  const wf = state.view.workflow;
  const name = (id: string) => seed.workflows.find((w) => w.id === id)?.name ?? id;
  const runs = shownRuns(state);
  const item = (id: string, label: string) => (
    <button key={id} className={`side-item${wf === id ? " on" : ""}`} aria-current={wf === id ? "true" : undefined} onClick={() => ui.go({ page: "actions", workflow: id })}>
      {id === "all" ? null : <I.Workflow />}
      <span>{label}</span>
    </button>
  );
  return (
    <div className="split">
      <aside className="side" aria-label="Workflows">
        <h2>Actions</h2>
        {item("all", "All workflows")}
        {seed.workflows.map((w) => item(w.id, w.name))}
      </aside>
      <div className="act-main">
        <h1>{wf === "all" ? "All workflows" : name(wf)}</h1>
        <div className="box">
          <div className="box-h"><b>{runs.length} workflow run{runs.length === 1 ? "" : "s"}</b></div>
          <div>
            {runs.map((r) => {
              const go = () => ui.go({ page: "run", run: r.id });
              return (
                <div key={r.id} className="run-row" role="link" tabIndex={0} aria-label={`${name(r.workflow)} #${r.id}: ${r.title}, ${RUN_TEXT[r.status]}`} onClick={go} onKeyDown={(e) => e.key === "Enter" && go()}>
                  <I.StatusIcon status={r.status} />
                  <span className="t"><b>{r.title}</b><span><b>{name(r.workflow)}</b> #{r.id}: {trigger(r)}</span></span>
                  <span className="br"><Branch name={r.branch} /></span>
                  <span className="when">
                    <span><I.Calendar />{ago(r.created)}</span>
                    <span><I.Timer />{r.secs != null ? dur(r.secs) : RUN_TEXT[r.status]}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
