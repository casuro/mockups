import { useLayoutEffect, useRef } from "react";
import { RUN_TEXT } from "./Actions";
import { Avatar, Branch, useUI } from "./context";
import { ago, Ansi, dur } from "./format";
import * as I from "./icons";
import type { GitHubJob, GitHubRun } from "./types";
import { ended, stepKey } from "./use-github";

// A run: its header (status, title, who triggered it, commit, branch,
// duration, Re-run jobs), its jobs on the left, and the log of the job
// picked: dark in both themes, a row per step with its status and duration,
// and under an open step its numbered lines with their colors.

export function Run() {
  const { github } = useUI();
  const { state, seed, ui } = github;
  const run = state.runs.find((r) => r.id === state.view.run);
  const job = run?.jobs.find((j) => j.id === state.view.job);
  if (!run || !job) return null;
  return (
    <>
      <div className="run-head">
        <button className="crumb" onClick={() => ui.go({ page: "actions", workflow: run.workflow })}>
          <I.Left />{seed.workflows.find((w) => w.id === run.workflow)?.name ?? run.workflow}
        </button>
        <div className="row">
          <h1><I.StatusIcon status={run.status} large /><span>{run.title} <span>#{run.id}</span></span></h1>
          <button className="btn" disabled={!ended(run.status)} onClick={ui.rerunOpen}><I.Sync />Re-run jobs</button>
        </div>
        <div className="meta">
          <Avatar id={run.actor} />
          <b>{run.actor}</b>
          <span>{run.rerun ? `re-run by ${run.rerun.by} ${ago(run.rerun.at)}` : `${run.event === "push" ? "pushed" : "triggered"} ${ago(run.created)}`}</span>
          <span className="sha">{run.sha}</span>
          <Branch name={run.branch} />
          <span><I.Timer /> {run.secs != null ? dur(run.secs) : RUN_TEXT[run.status]}</span>
          {run.attempt > 1 ? <span className="pill">Attempt #{run.attempt}</span> : null}
        </div>
      </div>
      <div className="split">
        <aside className="side" aria-label="Jobs">
          <h3>Jobs</h3>
          {run.jobs.map((j) => (
            <button key={j.id} className={`side-item${j.id === job.id ? " on" : ""}`} aria-label={`${j.name}, ${I.STATUS_LABEL[j.status]}`} aria-current={j.id === job.id ? "true" : undefined} onClick={() => ui.go({ page: "run", run: run.id, job: j.id })}>
              <I.StatusIcon status={j.status} />
              <span>{j.name}</span>
            </button>
          ))}
        </aside>
        <div className="job-main">
          <Log key={`${job.id}/${run.attempt}`} run={run} job={job} />
        </div>
      </div>
    </>
  );
}

function jobSub(job: GitHubJob) {
  const took = dur(job.secs ?? 0);
  if (job.status === "success") return `succeeded ${ago(job.endedAt ?? 0)} in ${took}`;
  if (job.status === "failure") return `failed ${ago(job.endedAt ?? 0)} in ${took}`;
  return job.status === "in_progress" ? `Started ${ago(job.startedAt ?? 0)}` : job.status === "queued" ? "Queued: waiting for a runner" : "Cancelled";
}

function Log({ run, job }: { run: GitHubRun; job: GitHubJob }) {
  const { github } = useUI();
  const body = useRef<HTMLDivElement>(null);
  // Whether the reader is at the bottom of the log, and so follows it.
  const stick = useRef(true);
  const lines = job.steps.reduce((n, s) => n + s.lines.length, 0);

  // A job opens where the reader wants to be: at the end of the failed step, or of a log that is still streaming.
  useLayoutEffect(() => {
    const el = body.current!;
    const f = el.querySelector<HTMLElement>(".step.failure");
    el.scrollTop = f ? Math.max(f.offsetTop, f.offsetTop + f.offsetHeight - el.clientHeight + 8) : el.scrollHeight;
  }, []);
  useLayoutEffect(() => {
    const el = body.current!;
    if (stick.current && job.status === "in_progress") el.scrollTop = el.scrollHeight;
  }, [lines, job.status]);

  return (
    <section className="log" aria-label={`Log of ${job.name}`}>
      <header className="log-h"><h2>{job.name}</h2><p>{jobSub(job)}</p></header>
      <div className="log-body" ref={body} tabIndex={0} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}>
        {job.status === "cancelled" && !job.steps.some((s) => s.lines.length) ? (
          <div className="log-empty">This job was cancelled before it started.</div>
        ) : (
          job.steps.map((step) => {
            const key = stepKey(run.id, job.id, step.id);
            // A step is open when it failed or is running, unless the reader chose otherwise.
            const open = github.state.steps[key] ?? (step.status === "failure" || step.status === "in_progress");
            return (
              <div key={step.id} className={`step ${step.status}${open ? " open" : ""}`}>
                <button className="step-h" aria-expanded={open} onClick={() => github.ui.toggleStep(key, !open)}>
                  <I.Chev /><I.StatusIcon status={step.status} /><span className="grow">{step.name}</span><span className="d">{step.secs != null ? dur(step.secs) : ""}</span>
                </button>
                {open ? (
                  <div className="lines">
                    {step.lines.length ? step.lines.map((l, n) => (
                      <div key={n} className="ln"><span className="no">{n + 1}</span><span className="tx"><Ansi text={l} /></span></div>
                    )) : <div className="log-empty">{step.status === "queued" ? "This step has not started yet." : "Waiting for output..."}</div>}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
