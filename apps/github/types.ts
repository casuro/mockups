// The GitHub app's data. A `GitHubSeed` is the repository as it opens: who
// is in it, its pull requests, its workflows and their runs. `GitHubState`
// is what changes while someone uses it; it is plain JSON, so it can be
// saved and handed back to `useGitHub` to pick up where they left off.

/** Where a run, a job, a step or a check stands. The last three are final. */
export type Status = "queued" | "in_progress" | "success" | "failure" | "cancelled";
/** How a run ends. */
export type Conclusion = "success" | "failure" | "cancelled";
/** A reviewer's standing on a pull request. */
export type ReviewerState = "requested" | "commented" | "approved";
export type PullTab = "conversation" | "files";
export type RunEvent = "pull_request" | "push" | "schedule";

/** People are keyed by their username ("octo"), which is how GitHub shows them. */
export interface GitHubPerson {
  name: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's initials by default. */
  initials?: string;
  color?: string;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  /** The default branch, which pull requests merge into unless they say otherwise. Default "main". */
  branch?: string;
  /** The count on the Issues tab. */
  issues?: number;
  /** Label colors by name ("bug": "#d73a4a"). Unknown labels are gray. */
  labels?: Record<string, string>;
}

/** One file of a pull request's "Files changed". */
export interface GitHubDiffFile {
  path: string;
  /** A unified diff: "@@ -12,10 +12,16 @@ heading" lines, then lines that start with "+", "-" or a space. */
  diff: string;
}

export type TimelineIcon = "eye" | "check" | "merge" | "commit" | "comment" | "sync" | "x";

export interface GitHubTimelineInput {
  /** A comment box, a commit line, or a one-line event ("requested a review from **sam**"). */
  type: "comment" | "commit" | "event";
  /** Who did it (a username). */
  by: string;
  /** A timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** A comment's Markdown, a commit's message, or an event's line (`code` and **bold** are drawn). */
  text: string;
  /** A commit's short SHA; the runs on that SHA show as its status. */
  sha?: string;
  /** For an event: its icon ("commit" by default) and the color of its dot. */
  icon?: TimelineIcon;
  color?: "green" | "purple";
}

export interface GitHubTimelineEntry extends Omit<GitHubTimelineInput, "at"> {
  id: string;
  at: number;
}

/** A check that does not come from one of this repository's workflow runs (another CI, a bot). */
export interface GitHubCheck {
  /** "Vercel", "codecov/patch". */
  name: string;
  status: Status;
  /** The line after the name: "Deployment has completed". */
  text?: string;
}

/** A check as the merge box lists it: one of the above, or a job of the latest run of a workflow on the pull request. */
export interface GitHubCheckRow extends GitHubCheck {
  secs?: number | null;
  /** Where "Details" goes: the run and the job. */
  run?: number;
  job?: string;
}

export interface GitHubPullInput {
  /** The pull request number; one more than the highest so far when left out. */
  number?: number;
  title: string;
  /** A username. */
  author: string;
  /** The branch it merges from. */
  branch: string;
  /** The branch it merges into; the repository's default branch when left out. */
  base?: string;
  /** Default "open". */
  state?: "open" | "merged";
  /** When it was opened. A timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  mergedAt?: number | string;
  mergedBy?: string;
  labels?: string[];
  /** By username: "requested" until they review. */
  reviewers?: Record<string, ReviewerState>;
  /** The description, in Markdown. */
  body?: string;
  /** What happened after it was opened, oldest first. */
  timeline?: GitHubTimelineInput[];
  files?: GitHubDiffFile[];
  /** Checks from outside this repository's workflows. Its workflow runs become checks by themselves. */
  checks?: GitHubCheck[];
}

export interface GitHubPull {
  number: number;
  title: string;
  author: string;
  branch: string;
  base: string;
  state: "open" | "merged";
  at: number;
  mergedAt: number | null;
  mergedBy: string | null;
  labels: string[];
  reviewers: Record<string, ReviewerState>;
  body: string;
  timeline: GitHubTimelineEntry[];
  files: GitHubDiffFile[];
  checks: GitHubCheck[];
}

export interface GitHubWorkflow {
  id: string;
  /** "CI". A check on a pull request is "<workflow name> / <job name>". */
  name: string;
}

export interface GitHubStepInput {
  /** Unique in its job; "s1", "s2"... when left out. */
  id?: string;
  name: string;
  /** Default: "success" in a job that succeeded, else "queued". */
  status?: Status;
  /** How long it took, in seconds. */
  secs?: number;
  /** Its log, as a runner writes it: ANSI colors are drawn ("\x1b[32m✓\x1b[0m passed"). */
  lines?: string[];
}

export interface GitHubStep {
  id: string;
  name: string;
  status: Status;
  secs: number | null;
  lines: string[];
}

export interface GitHubJobInput {
  /** Unique in its run: "build". */
  id: string;
  /** Default: its id. */
  name?: string;
  /** Default "queued". */
  status?: Status;
  /** How long it took, in seconds; the sum of its steps by default. */
  secs?: number;
  /** Timestamps in ms, or date strings. Worked out from the run when left out. */
  startedAt?: number | string;
  endedAt?: number | string;
  steps?: GitHubStepInput[];
}

export interface GitHubJob {
  id: string;
  name: string;
  status: Status;
  secs: number | null;
  startedAt: number | null;
  endedAt: number | null;
  steps: GitHubStep[];
}

export interface GitHubRunInput {
  /** The run number; one more than the workflow's highest so far when left out. */
  id?: number;
  /** A workflow id. */
  workflow: string;
  /** The commit message or pull request title it ran for. */
  title: string;
  /** Default "push". */
  event?: RunEvent;
  branch: string;
  /** The short SHA it ran on. */
  sha: string;
  /** Who triggered it (a username). */
  actor: string;
  /** The pull request it ran for: its jobs are that pull request's checks. */
  pr?: number;
  /** When it was triggered. A timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** Total duration in seconds, for a run that ended; its longest job by default. */
  secs?: number;
  jobs: GitHubJobInput[];
}

export interface GitHubRun {
  id: number;
  workflow: string;
  title: string;
  event: RunEvent;
  branch: string;
  sha: string;
  actor: string;
  pr: number | null;
  /** When it was triggered. */
  created: number;
  /** Follows its jobs: in progress while one is unfinished, then how it ended. */
  status: Status;
  secs: number | null;
  /** 1, then one more with every re-run. */
  attempt: number;
  /** Who re-ran it last and when, or null on the first attempt. */
  rerun: { by: string; at: number } | null;
  jobs: GitHubJob[];
}

/** A page of the app, for `seed.view`, `github.open(view)` and the "open" event. */
export type GitHubView =
  | { page: "pulls" }
  | { page: "pull"; pull: number; tab?: PullTab }
  | { page: "actions"; workflow?: string }
  | { page: "run"; run: number; job?: string };

export interface GitHubSeed {
  repo: GitHubRepo;
  /** The signed-in person's username. */
  me: string;
  /** By username. */
  people: Record<string, GitHubPerson>;
  /** In the order the list shows them. */
  pulls: GitHubPullInput[];
  workflows: GitHubWorkflow[];
  /** In any order: the list shows the newest first. */
  runs: GitHubRunInput[];
  /** The page it opens on. Default: the pull request list. */
  view?: GitHubView;
  theme?: "light" | "dark";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface GitHubState {
  version: 1;
  pulls: GitHubPull[];
  runs: GitHubRun[];
  /** The page on screen. `workflow` is the runs list's filter: a workflow id, or "all". */
  view: { page: GitHubView["page"]; pull: number | null; tab: PullTab; run: number | null; job: string | null; workflow: string };
  /** The pull request list's Open / Closed tab. */
  pullFilter: "open" | "closed";
  /** Unsent comments, by pull request number. */
  drafts: Record<string, string>;
  /** Log steps opened or closed by hand, as "<run>/<job>/<step>". The rest are open when failed or running. */
  steps: Record<string, boolean>;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type GitHubEvent =
  /** They pressed a repository tab or a header control, by its name: "Pull requests", "Actions", "Code", "Search"... */
  | { type: "nav"; to: string }
  /** They opened a page: a pull request or one of its tabs, a workflow's runs, a run, a job's log. */
  | { type: "open"; view: GitHubView }
  | { type: "comment"; pull: number; text: string; id: string }
  | { type: "approve"; pull: number; id: string }
  | { type: "merge"; pull: number; title: string; sha: string }
  | { type: "rerun"; run: number; attempt: number };
