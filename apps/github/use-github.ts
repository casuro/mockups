import { useCallback, useMemo, useRef, useState } from "react";
import { initialsOf } from "./format";
import type {
  Conclusion,
  GitHubCheck,
  GitHubCheckRow,
  GitHubEvent,
  GitHubJob,
  GitHubJobInput,
  GitHubPull,
  GitHubPullInput,
  GitHubRun,
  GitHubRunInput,
  GitHubSeed,
  GitHubState,
  GitHubTimelineEntry,
  GitHubTimelineInput,
  GitHubView,
  Status,
} from "./types";

// The repository behind <GitHub>: its state, what the world does to it (a
// run starts, a step prints a line, a job ends, someone comments, approves
// or merges) and what the signed-in person does (open pages, comment,
// approve, merge, re-run). Every change goes through `update`, which keeps
// a ref in step with React state, so calls made between renders (timers,
// awaited replies) see what the last one wrote. Every function it returns
// is stable across renders. The kit runs no workflow by itself: a run moves
// only when the world moves it.

/** A person, as the parts draw them. */
export interface Person {
  /** Their username. */
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: string;
}

export interface GitHubOptions {
  /** A state saved from `github.state`, to pick up where it was left. */
  restore?: GitHubState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: GitHubEvent) => void;
}

// ---------- What the screen works out from the state ----------

/** Whether a run, job or step is over. */
export const ended = (s: Status) => s === "success" || s === "failure" || s === "cancelled";

/** One status for a set of jobs, checks or runs, or null for none. */
export function rollup(list: Status[]): Status | null {
  if (!list.length) return null;
  if (list.includes("failure")) return "failure";
  if (list.some((s) => !ended(s))) return list.every((s) => s === "queued") ? "queued" : "in_progress";
  return list.includes("cancelled") ? "cancelled" : "success";
}

/** A pull request's checks: the jobs of the latest run of each workflow on it, then its own `checks`. */
export function checksOf(state: GitHubState, seed: GitHubSeed, pull: GitHubPull): GitHubCheckRow[] {
  const rows: GitHubCheckRow[] = [];
  for (const wf of seed.workflows) {
    const run = state.runs.filter((r) => r.workflow === wf.id && r.pr === pull.number).sort((a, b) => b.created - a.created || b.id - a.id)[0];
    for (const j of run?.jobs ?? []) rows.push({ name: `${wf.name} / ${j.name}`, status: j.status, secs: j.secs, run: run.id, job: j.id });
  }
  return [...rows, ...pull.checks];
}

/** The status beside a commit: what the runs on that SHA say. */
export const commitStatus = (state: GitHubState, sha: string) => rollup(state.runs.filter((r) => r.sha === sha).map((r) => r.status));
export const approved = (pull: GitHubPull) => Object.values(pull.reviewers).includes("approved");
/** Open, approved, and every check green. */
export const mergeable = (state: GitHubState, seed: GitHubSeed, pull: GitHubPull) =>
  pull.state === "open" && approved(pull) && checksOf(state, seed, pull).every((c) => c.status === "success");

/** The runs the Actions list shows for its workflow filter, newest first. */
export const shownRuns = (state: GitHubState) =>
  state.runs.filter((r) => state.view.workflow === "all" || r.workflow === state.view.workflow).sort((a, b) => b.created - a.created || b.id - a.id);

/** The key of a step in `state.steps`. */
export const stepKey = (run: number, job: string, step: string) => `${run}/${job}/${step}`;

// ---------- The seed, filled in ----------

const PALETTE = ["#0969da", "#8250df", "#bf3989", "#1a7f37", "#9a6700", "#bc4c00", "#0550ae", "#6e7781"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const toTime = (at: number | string | undefined, fallback = Date.now()) => (typeof at === "number" ? at : at ? Date.parse(at) || fallback : fallback);

function normalizePeople(seed: GitHubSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people)) out[id] = { id, name: p.name, initials: p.initials ?? initialsOf(p.name), color: p.color ?? colorFor(id), photo: p.photo };
  if (!out[seed.me]) throw new Error(`GitHub: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

const makeEntry = (e: GitHubTimelineInput, id: string): GitHubTimelineEntry => ({ ...e, id, at: toTime(e.at) });

function makePull(input: GitHubPullInput, number: number, seed: GitHubSeed, nextId: () => string): GitHubPull {
  const at = toTime(input.at);
  const state = input.state ?? "open";
  return {
    number,
    title: input.title,
    author: input.author,
    branch: input.branch,
    base: input.base ?? seed.repo.branch ?? "main",
    state,
    at,
    mergedAt: state === "merged" ? toTime(input.mergedAt, at) : null,
    mergedBy: state === "merged" ? (input.mergedBy ?? input.author) : null,
    labels: [...(input.labels ?? [])],
    reviewers: { ...input.reviewers },
    body: input.body ?? "",
    timeline: (input.timeline ?? []).map((e) => makeEntry({ ...e, at: e.at ?? at }, nextId())),
    files: structuredClone(input.files ?? []),
    checks: structuredClone(input.checks ?? []),
  };
}

function makeJob(input: GitHubJobInput, created: number): GitHubJob {
  const status = input.status ?? "queued";
  const steps = (input.steps ?? []).map((s, i) => {
    const st = s.status ?? (status === "success" ? "success" : "queued");
    return { id: s.id ?? `s${i + 1}`, name: s.name, status: st, secs: s.secs ?? (ended(st) ? 0 : null), lines: [...(s.lines ?? [])] };
  });
  const secs = ended(status) ? (input.secs ?? steps.reduce((n, s) => n + (s.secs ?? 0), 0)) : null;
  const startedAt = status === "queued" ? null : toTime(input.startedAt, created);
  return { id: input.id, name: input.name ?? input.id, status, secs, startedAt, endedAt: secs == null ? null : toTime(input.endedAt, (startedAt ?? created) + secs * 1000), steps };
}

function makeRun(input: GitHubRunInput, id: number, seed: GitHubSeed): GitHubRun {
  if (!seed.workflows.some((w) => w.id === input.workflow)) throw new Error(`GitHub: there is no workflow "${input.workflow}"`);
  const created = toTime(input.at);
  const jobs = input.jobs.map((j) => makeJob(j, created));
  const status = rollup(jobs.map((j) => j.status)) ?? "queued";
  return {
    id,
    workflow: input.workflow,
    title: input.title,
    event: input.event ?? "push",
    branch: input.branch,
    sha: input.sha,
    actor: input.actor,
    pr: input.pr ?? null,
    created,
    status,
    secs: ended(status) ? (input.secs ?? Math.max(0, ...jobs.map((j) => j.secs ?? 0))) : null,
    attempt: 1,
    rerun: null,
    jobs,
  };
}

const nextPull = (list: { number?: number }[]) => list.reduce((n, p) => Math.max(n, p.number ?? 0), 0) + 1;
const nextRun = (list: { id?: number; workflow: string }[], workflow: string) => list.reduce((n, r) => (r.workflow === workflow ? Math.max(n, r.id ?? 0) : n), 0) + 1;

/** The page a view asks for; a run opens on the job asked for, else its failed job, else its first. Throws for what is not there. */
function toView(view: GitHubView | undefined, s: Pick<GitHubState, "pulls" | "runs">): GitHubState["view"] {
  const out: GitHubState["view"] = { page: "pulls", pull: null, tab: "conversation", run: null, job: null, workflow: "all" };
  if (view?.page === "pull") {
    if (!s.pulls.some((p) => p.number === view.pull)) throw new Error(`GitHub: there is no pull request #${view.pull}`);
    return { ...out, page: "pull", pull: view.pull, tab: view.tab ?? "conversation" };
  }
  if (view?.page === "run") {
    const run = s.runs.find((r) => r.id === view.run);
    if (!run) throw new Error(`GitHub: there is no run #${view.run}`);
    const job = view.job ? run.jobs.find((j) => j.id === view.job) : (run.jobs.find((j) => j.status === "failure") ?? run.jobs[0]);
    if (!job) throw new Error(`GitHub: run #${view.run} has no job "${view.job ?? ""}"`);
    return { ...out, page: "run", run: run.id, job: job.id, workflow: run.workflow };
  }
  if (view?.page === "actions") return { ...out, page: "actions", workflow: view.workflow ?? "all" };
  return out;
}

/** The view of the page on screen. */
export function viewOf(state: GitHubState): GitHubView {
  const v = state.view;
  if (v.page === "pull" && v.pull != null) return { page: "pull", pull: v.pull, tab: v.tab };
  if (v.page === "run" && v.run != null && v.job) return { page: "run", run: v.run, job: v.job };
  return v.page === "actions" ? { page: "actions", workflow: v.workflow } : { page: "pulls" };
}

function initialState(seed: GitHubSeed): GitHubState {
  let seq = 0;
  const pulls: GitHubPull[] = [];
  for (const p of seed.pulls) pulls.push(makePull(p, p.number ?? nextPull([...seed.pulls, ...pulls]), seed, () => `s${++seq}`));
  const runs: GitHubRun[] = [];
  for (const r of seed.runs) runs.push(makeRun(r, r.id ?? nextRun([...seed.runs, ...runs], r.workflow), seed));
  return { version: 1, pulls, runs, view: toView(seed.view, { pulls, runs }), pullFilter: "open", drafts: {}, steps: {}, theme: seed.theme ?? "light", seq };
}

const shortSha = () => Array.from({ length: 7 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

export function useGitHub(seed: GitHubSeed, options: GitHubOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<GitHubState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  // The seed is read through a ref, so the functions below stay the same
  // even when `seed` is a new object every render.
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);

  const update = useCallback((fn: (draft: GitHubState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: GitHubEvent) => opts.current.onEvent?.(event), []);
  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  // Looking things up in a draft of the state; each throws when there is none.
  const find = <T,>(list: T[], test: (x: T) => boolean, what: string) => {
    const x = list.find(test);
    if (!x) throw new Error(`GitHub: there is no ${what}`);
    return x;
  };
  const needPull = (s: GitHubState, number: number) => find(s.pulls, (p) => p.number === number, `pull request #${number}`);
  const needRun = (s: GitHubState, id: number) => find(s.runs, (r) => r.id === id, `run #${id}`);
  const needJob = (s: GitHubState, run: number, job: string) => find(needRun(s, run).jobs, (j) => j.id === job, `job "${job}" in run #${run}`);
  const needStep = (s: GitHubState, run: number, job: string, step: string) => find(needJob(s, run, job).steps, (x) => x.id === step, `step "${step}" in job "${job}" of run #${run}`);
  const log = (s: GitHubState, p: GitHubPull, e: GitHubTimelineInput) => {
    const entry = makeEntry(e, `t${++s.seq}`);
    p.timeline.push(entry);
    return entry.id;
  };
  /** A run follows its jobs: its status, and its duration once they are all over. */
  const settle = (run: GitHubRun, secs?: number) => {
    run.status = rollup(run.jobs.map((j) => j.status)) ?? "queued";
    run.secs = ended(run.status) ? (secs ?? Math.max(0, ...run.jobs.map((j) => j.secs ?? 0))) : null;
  };
  /** A job ends: the steps it had not finished end with it. */
  const endJob = (job: GitHubJob, status: Status, secs?: number) => {
    for (const st of job.steps) {
      if (ended(st.status)) continue;
      st.status = status;
      st.secs ??= 0;
    }
    Object.assign(job, { status, endedAt: Date.now(), secs: secs ?? job.steps.reduce((n, st) => n + (st.secs ?? 0), 0) });
  };
  const start = (job: GitHubJob) => {
    if (job.status === "queued") Object.assign(job, { status: "in_progress", startedAt: Date.now() });
  };

  // What both the world and the signed-in person can do, on a draft.
  const doApprove = (s: GitHubState, number: number, from: string) => {
    const p = needPull(s, number);
    p.reviewers[from] = "approved";
    return log(s, p, { type: "event", icon: "check", color: "green", by: from, text: "approved these changes" });
  };
  const doMerge = (s: GitHubState, number: number, by: string, sha: string) => {
    const p = needPull(s, number);
    Object.assign(p, { state: "merged", mergedAt: Date.now(), mergedBy: by });
    log(s, p, { type: "event", icon: "merge", color: "purple", by, text: `merged commit \`${sha}\` into \`${p.base}\`` });
  };

  // ---------- What the world does ----------

  /** A comment on a pull request, from a username. Returns the timeline entry's id. */
  const comment = useCallback(
    (pull: number, from: string, text: string) => {
      let id = "";
      const s = update((d) => void (id = log(d, needPull(d, pull), { type: "comment", by: from, text })));
      if (from !== me && !(s.view.page === "pull" && s.view.pull === pull)) toast(`${from} commented on #${pull}`);
      return id;
    },
    [update, me, toast]
  );

  /** Someone approves a pull request. Returns the timeline entry's id. */
  const approve = useCallback(
    (pull: number, from: string) => {
      let id = "";
      update((s) => void (id = doApprove(s, pull, from)));
      return id;
    },
    [update]
  );

  /** Someone merges an open pull request, whatever its checks say. Returns the merge commit's SHA. */
  const merge = useCallback(
    (pull: number, by = me, sha = shortSha()) => {
      update((s) => {
        if (needPull(s, pull).state === "open") doMerge(s, pull, by, sha);
      });
      return sha;
    },
    [update, me]
  );

  /** Replace a pull request's checks from outside this repository's workflows. */
  const setChecks = useCallback(
    (pull: number, checks: GitHubCheck[]) => void update((s) => void (needPull(s, pull).checks = structuredClone(checks))),
    [update]
  );

  /** A workflow run is triggered. Returns its number. */
  const startRun = useCallback(
    (input: GitHubRunInput) => {
      let id = 0;
      update((s) => {
        id = input.id ?? nextRun(s.runs, input.workflow);
        if (s.runs.some((r) => r.id === id)) throw new Error(`GitHub: run #${id} already exists`);
        s.runs.push(makeRun(input, id, seedRef.current));
      });
      return id;
    },
    [update]
  );

  /** A job starts ("in_progress") or ends; the run's status follows. `secs` is how long it took (the sum of its steps by default). */
  const setJobStatus = useCallback(
    (run: number, job: string, status: Status, o: { secs?: number } = {}) =>
      void update((s) => {
        const j = needJob(s, run, job);
        if (ended(status)) endJob(j, status, o.secs);
        else if (status === "in_progress") start(j);
        else Object.assign(j, { status, startedAt: null, endedAt: null, secs: null });
        settle(needRun(s, run));
      }),
    [update]
  );

  /** A step starts or ends. Starting one starts its job; `secs` is how long it took. */
  const setStepStatus = useCallback(
    (run: number, job: string, step: string, status: Status, o: { secs?: number } = {}) =>
      void update((s) => {
        const st = needStep(s, run, job, step);
        st.status = status;
        st.secs = ended(status) ? (o.secs ?? st.secs ?? 0) : null;
        if (status === "in_progress") start(needJob(s, run, job));
        settle(needRun(s, run));
      }),
    [update]
  );

  /** A step prints: one line or several. Printing to a queued step starts it. */
  const appendLog = useCallback(
    (run: number, job: string, step: string, lines: string | string[]) =>
      void update((s) => {
        const st = needStep(s, run, job, step);
        st.lines.push(...(Array.isArray(lines) ? lines : [lines]));
        if (st.status !== "queued") return;
        st.status = "in_progress";
        start(needJob(s, run, job));
        settle(needRun(s, run));
      }),
    [update]
  );

  /**
   * A run ends, and the jobs still going end with it as `conclusion`
   * ("success" by default). `secs` is its total duration (its longest job
   * by default).
   */
  const completeRun = useCallback(
    (run: number, conclusion: Conclusion = "success", o: { secs?: number } = {}) =>
      void update((s) => {
        const r = needRun(s, run);
        for (const j of r.jobs) if (!ended(j.status)) endJob(j, conclusion);
        settle(r, o.secs);
        r.status = conclusion;
      }),
    [update]
  );

  /** Show a page: the pull requests, one of them, Actions, or a run and a job's log. */
  const open = useCallback((view: GitHubView) => void update((s) => void (s.view = toView(view, s))), [update]);

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  // ---------- What the signed-in person does (wired by <GitHub>) ----------

  /** Open a page, and report it. */
  const go = useCallback(
    (view: GitHubView) => {
      const s = update((d) => void (d.view = toView(view, d)));
      emit({ type: "open", view: viewOf(s) });
    },
    [update, emit]
  );

  /** A repository tab or a header control: "Pull requests" and "Actions" open their page, every one is reported. */
  const nav = useCallback(
    (to: string) => {
      if (to === "Pull requests" || to === "Actions") update((s) => void (s.view = toView({ page: to === "Actions" ? "actions" : "pulls" }, s)));
      emit({ type: "nav", to });
    },
    [update, emit]
  );

  const setFilter = useCallback((filter: "open" | "closed") => void update((s) => void (s.pullFilter = filter)), [update]);
  const setDraft = useCallback((pull: number, text: string) => void update((s) => void (s.drafts[pull] = text)), [update]);

  /** Post the draft on the open pull request. Returns false when there is nothing to post. */
  const postComment = useCallback(() => {
    const pull = ref.current.view.pull;
    const text = (ref.current.drafts[pull ?? -1] ?? "").trim();
    if (pull == null || !text) {
      toast("Write a comment first");
      return false;
    }
    let id = "";
    update((s) => {
      id = log(s, needPull(s, pull), { type: "comment", by: me, text });
      s.drafts[pull] = "";
    });
    emit({ type: "comment", pull, text, id });
    return true;
  }, [update, me, toast, emit]);

  /** Approve the open pull request. */
  const approvePull = useCallback(() => {
    const pull = ref.current.view.pull;
    if (pull == null) return;
    let id = "";
    update((s) => void (id = doApprove(s, pull, me)));
    toast("You approved these changes");
    emit({ type: "approve", pull, id });
  }, [update, me, toast, emit]);

  /** Merge the open pull request, when its review and its checks allow it. */
  const mergePull = useCallback(() => {
    const s = ref.current;
    const p = s.pulls.find((x) => x.number === s.view.pull);
    if (!p || !mergeable(s, seedRef.current, p)) return;
    const sha = shortSha();
    update((d) => doMerge(d, p.number, me, sha));
    toast(`Pull request #${p.number} merged`);
    emit({ type: "merge", pull: p.number, title: `${p.title} (#${p.number})`, sha });
  }, [update, me, toast, emit]);

  /** Re-run the run on screen: a new attempt, every job queued again with an empty log. The world plays it. */
  const rerunOpen = useCallback(() => {
    const id = ref.current.view.run;
    const run = ref.current.runs.find((r) => r.id === id);
    if (!run || !ended(run.status)) return;
    update((s) => {
      const r = needRun(s, run.id);
      for (const j of r.jobs) {
        Object.assign(j, { status: "queued", secs: null, startedAt: null, endedAt: null });
        for (const st of j.steps) Object.assign(st, { status: "queued", secs: null, lines: [] });
      }
      Object.assign(r, { attempt: r.attempt + 1, rerun: { by: me, at: Date.now() } });
      settle(r);
    });
    toast("Re-running all jobs");
    emit({ type: "rerun", run: run.id, attempt: run.attempt + 1 });
  }, [update, me, toast, emit]);

  const toggleStep = useCallback((key: string, open: boolean) => void update((s) => void (s.steps[key] = open)), [update]);

  const ui = useMemo(
    () => ({ go, nav, setFilter, setDraft, postComment, approvePull, mergePull, rerunOpen, toggleStep }),
    [go, nav, setFilter, setDraft, postComment, approvePull, mergePull, rerunOpen, toggleStep]
  );

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    // The world
    comment,
    approve,
    merge,
    setChecks,
    startRun,
    setJobStatus,
    setStepStatus,
    appendLog,
    completeRun,
    open,
    toast,
    setTheme,
    // The signed-in person (wired by <GitHub>)
    ui,
  };
}

export type GitHubRepository = ReturnType<typeof useGitHub>;
