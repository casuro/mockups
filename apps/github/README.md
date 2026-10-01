# GitHub (React)

`apps/github.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy
the folder into your project and it is yours: use it as it is, or change
any file for what your screen needs.

```bash
cp -r apps/github src/apps/github
```

It needs only React 19. The styles are plain CSS scoped to `.kit-github`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). It uses the system font, and the GitHub mark and the
icons are inline SVG, so nothing loads from the network.

It is a repository's **Pull requests** (the list, and a pull request's
conversation, checks, Approve, Merge and Files changed) and **Actions**
(the runs, and a run's jobs with the job log). The other tabs and header
controls are there and report that they were pressed.

## Use

```tsx
import { GitHub, useGitHub, type GitHubSeed } from "./apps/github";

const seed: GitHubSeed = {
  repo: { owner: "northwind", name: "api", labels: { bug: "#d73a4a" } },
  me: "sam",
  people: { sam: { name: "Sam Rivera" }, priya: { name: "Priya Shah" } },
  pulls: [
    {
      number: 12, title: "Fix the date parser", author: "priya", branch: "priya/date-parser", labels: ["bug"],
      reviewers: { sam: "requested" }, body: "Parses `2026-01-05` as a local date.\n\n- adds a test\n- no API change",
      timeline: [{ type: "commit", by: "priya", sha: "4be1c02", text: "fix: parse dates as local" }],
      files: [{ path: "src/date.ts", diff: "@@ -3,3 +3,3 @@ export function parse(s: string) {\n   const [y, m, d] = s.split(\"-\").map(Number);\n-  return new Date(s);\n+  return new Date(y, m - 1, d);\n }" }],
    },
  ],
  workflows: [{ id: "ci", name: "CI" }],
  runs: [
    {
      id: 300, workflow: "ci", title: "fix: parse dates as local", event: "pull_request", branch: "priya/date-parser", sha: "4be1c02", actor: "priya", pr: 12,
      jobs: [{ id: "test", status: "success", steps: [{ name: "Run tests", secs: 21, lines: ["\x1b[32m✓\x1b[0m 48 tests passed"] }] }],
    },
  ],
  view: { page: "pull", pull: 12 },
};

function Repository() {
  const github = useGitHub(seed, {
    onEvent(event) {
      if (event.type === "merge") {
        // The person merged the pull request: record it, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <GitHub github={github} />
    </div>
  );
}
```

`<GitHub>` fills the box it is in, so give that box a height. Under 1011px
wide a pull request's reviewers and labels move under its conversation,
and under 760px it switches to the phone layout (the workflows and a run's
jobs become a row of chips over the list or the log), whatever the window
size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`, by username. `me` is the signed-in person. `photo` is a picture
  URL, otherwise initials on `color`.
- `repo`: `owner`, `name`, the default `branch`, the `issues` count on its
  tab, and `labels` (name to color).
- `pulls`, each with `title`, `author`, `branch`, `state` (open, merged),
  `labels`, `reviewers` (requested, commented, approved), a Markdown `body`,
  a `timeline`, `files` (unified diffs) and `checks` from outside this
  repository's workflows.
- A timeline entry is a `comment`, a `commit` (`sha` and its message in
  `text`) or an `event` (one line, with an `icon` and a `color`). In `text`,
  `` `code` ``, `**bold**` and `@mentions` are drawn; a comment also takes
  paragraphs and `- ` lists.
- `workflows` (`id`, `name`) and `runs`. A run has `workflow`, `title`,
  `event` (pull_request, push, schedule), `branch`, `sha`, `actor`, an
  optional `pr`, and `jobs`; a job has `steps`; a step has `status`, `secs`
  and its log `lines`. A run's status follows its jobs.
- A run with `pr` is that pull request's checks: each job of the latest run
  of each workflow is a check named "<workflow> / <job>", with a "Details"
  link to its log.
- A log line is what a runner writes. ANSI colors are drawn: 31 red, 32
  green, 33 yellow, 34 blue, 36 cyan, 90 gray, 1 bold, 41 and 46 red and
  cyan backgrounds, 0 resets.
- `view`: the page on screen at the start.

## Driving it

`useGitHub` returns the repository. The kit runs no workflow by itself: a
run moves only when the world moves it.

| Call | What happens |
| --- | --- |
| `github.startRun(run)` | A workflow run is triggered. Returns its number. Its jobs are queued unless they say otherwise. |
| `github.setStepStatus(run, job, step, status, { secs })` | A step starts ("in_progress", which starts its job) or ends. |
| `github.appendLog(run, job, step, lines)` | The step prints one line or several. Printing to a queued step starts it. |
| `github.setJobStatus(run, job, status, { secs })` | A job starts or ends; its unfinished steps end with it, and the run's status follows. |
| `github.completeRun(run, conclusion, { secs })` | The run ends as success, failure or cancelled, and so do the jobs still going. |
| `github.setChecks(pull, checks)` | Replace the pull request's checks from outside the workflows. |
| `github.comment(pull, from, text)` | A comment from `from`. A toast when someone else writes on a pull request that is not on screen. Returns its id. |
| `github.approve(pull, from)` | `from` approves the pull request. Returns the timeline entry's id. |
| `github.merge(pull, by, sha)` | Someone merges it, whatever its checks say. Returns the merge commit's SHA. |
| `github.open(view)` | Show a page: `{ page: "pulls" }`, `{ page: "pull", pull, tab }`, `{ page: "actions", workflow }`, `{ page: "run", run, job }`. |
| `github.toast(text)` | A notice at the bottom. |
| `github.setTheme("dark")` | GitHub's dark colors. The job log is dark in both. |

Every function is stable across renders. None of them fires an event:
events are only what the signed-in person does.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "nav", to }` | They press a repository tab or a header control, by name: "Pull requests", "Actions", "Code", "Issues", "Search", "Notifications"... The first two open their page; answer the rest with a toast, or build them. |
| `{ type: "open", view }` | They open a pull request or one of its tabs, a workflow's runs, a run or a job's log. |
| `{ type: "comment", pull, text, id }` | They post a comment. |
| `{ type: "approve", pull, id }` | They press Approve. |
| `{ type: "merge", pull, title, sha }` | They press Merge pull request. |
| `{ type: "rerun", run, attempt }` | They press Re-run jobs: every job is queued again with an empty log. Play the run again. |

`github.state` is everything that changed, as plain JSON (pull requests,
runs and their logs, the page on screen, unsent comments): save it, and
pass it back as `useGitHub(seed, { restore })` to pick up where they left
off.

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-github.ts` and
`GitHub.tsx`. You should not need to open them.

### Imports

```ts
import {
  GitHub, useGitHub,
  type GitHubProps, type GitHubRepository, type GitHubOptions, type Person,
  type GitHubSeed, type GitHubState, type GitHubEvent, type GitHubView, type GitHubRunInput, type GitHubPullInput,
} from "./apps/github";
// The brand mark is not re-exported by index.ts (for a desktop launcher, say):
import { GitHubLogo } from "./apps/github/icons";
// Or the launcher logo and its Dock tile (see the repo README):
import { AppLogo, appTile } from "./apps/github/icons";
```

`GitHubLogo` takes the color of the text around it and fills the box it is
put in; pass `fill` for another color. `AppLogo` is the white mark, and
`appTile` is `"#24292f"`, the dark tile behind it.

`index.ts` also re-exports every other type in `types.ts` (`GitHubPerson`, `GitHubRepo`, `GitHubPull`, `GitHubTimelineInput`, `GitHubTimelineEntry`, `TimelineIcon`, `GitHubDiffFile`, `GitHubCheck`, `GitHubCheckRow`, `GitHubWorkflow`, `GitHubRun`, `GitHubJob`, `GitHubJobInput`, `GitHubStep`, `GitHubStepInput`, `Status`, `Conclusion`, `ReviewerState`, `PullTab`, `RunEvent`).

### The hook

```ts
function useGitHub(seed: GitHubSeed, options?: GitHubOptions): GitHubRepository;

interface GitHubOptions {
  restore?: GitHubState | null;            // a saved `github.state`; read on the first render only
  onEvent?: (event: GitHubEvent) => void;  // everything the signed-in person does
}
```

It throws if `seed.me` is not a key of `seed.people`, if a run's `workflow`
is not one of `seed.workflows`, or if `seed.view` names a pull request, a
run or a job that is not there. A `restore` whose `version` is not `1` is
ignored and the seed is used.

### The seed

```ts
type Status = "queued" | "in_progress" | "success" | "failure" | "cancelled";
type Conclusion = "success" | "failure" | "cancelled";
type ReviewerState = "requested" | "commented" | "approved";
type PullTab = "conversation" | "files";
type RunEvent = "pull_request" | "push" | "schedule";

interface GitHubSeed {
  repo: GitHubRepo;                                   // required
  me: string;                                         // required: the signed-in person's username
  people: Record<string, GitHubPerson>;               // required, by username
  pulls: GitHubPullInput[];                           // required, in the order the list shows them
  workflows: GitHubWorkflow[];                        // required: { id, name }
  runs: GitHubRunInput[];                             // required, any order (the list shows newest first)
  view?: GitHubView;                                  // default { page: "pulls" }
  theme?: "light" | "dark";
}

interface GitHubRepo {
  owner: string;                                      // required
  name: string;                                       // required
  branch?: string;                                    // the default branch; "main" by default
  issues?: number;                                    // the count on the Issues tab
  labels?: Record<string, string>;                    // label colors by name; unknown labels are gray
}

interface GitHubPerson { name: string; photo?: string; initials?: string; color?: string }

interface GitHubPullInput {
  title: string;                                      // required
  author: string;                                     // required: a username
  branch: string;                                     // required: the branch it merges from
  number?: number;                                    // one more than the highest by default
  base?: string;                                      // default: repo.branch
  state?: "open" | "merged";                          // default "open"
  at?: number | string;                               // opened; ms or a date string; now by default
  mergedAt?: number | string;
  mergedBy?: string;                                  // default: the author
  labels?: string[];
  reviewers?: Record<string, ReviewerState>;
  body?: string;                                      // Markdown
  timeline?: GitHubTimelineInput[];                   // oldest first
  files?: GitHubDiffFile[];                           // { path, diff }: a unified diff
  checks?: GitHubCheck[];                             // { name, status, text? } from outside the workflows
}

type TimelineIcon = "eye" | "check" | "merge" | "commit" | "comment" | "sync" | "x";

interface GitHubTimelineInput {
  type: "comment" | "commit" | "event";               // required
  by: string;                                         // required: a username
  text: string;                                       // required: the comment, the commit message, the event's line
  at?: number | string;                               // default: when the pull request was opened (now for a new entry)
  sha?: string;                                       // a commit's SHA; the runs on it show as its status
  icon?: TimelineIcon;                                // an event's icon; "commit" by default
  color?: "green" | "purple";                         // the color of an event's dot
}

interface GitHubRunInput {
  workflow: string;                                   // required: a workflow id
  title: string;                                      // required
  branch: string;                                     // required
  sha: string;                                        // required: the short SHA
  actor: string;                                      // required: a username
  jobs: GitHubJobInput[];                             // required
  id?: number;                                        // one more than the workflow's highest by default
  event?: RunEvent;                                   // default "push"
  pr?: number;                                        // its jobs become that pull request's checks
  at?: number | string;                               // triggered; now by default
  secs?: number;                                      // total duration once ended; its longest job by default
}

interface GitHubJobInput {
  id: string;                                         // required, unique in its run
  name?: string;                                      // default: its id
  status?: Status;                                    // default "queued"
  secs?: number;                                      // default: the sum of its steps
  startedAt?: number | string;                        // default: when the run was triggered
  endedAt?: number | string;                          // default: startedAt + secs
  steps?: GitHubStepInput[];
}

interface GitHubStepInput {
  name: string;                                       // required
  id?: string;                                        // "s1", "s2"... by default
  status?: Status;                                    // default: "success" in a job that succeeded, else "queued"
  secs?: number;
  lines?: string[];                                   // its log
}
```

### What the hook makes of it

`github.people` and `github.state` hold these, with every default filled
in:

```ts
interface Person { id: string; name: string; initials: string; color: string; photo?: string }

interface GitHubPull {
  number: number; title: string; author: string; branch: string; base: string;
  state: "open" | "merged";
  at: number; mergedAt: number | null; mergedBy: string | null;
  labels: string[];
  reviewers: Record<string, ReviewerState>;
  body: string;
  timeline: GitHubTimelineEntry[];                    // a GitHubTimelineInput with `id: string` and `at: number`
  files: GitHubDiffFile[];
  checks: GitHubCheck[];
}

interface GitHubRun {
  id: number; workflow: string; title: string; event: RunEvent; branch: string; sha: string; actor: string;
  pr: number | null;
  created: number;                                    // when it was triggered, in ms
  status: Status;                                     // follows its jobs
  secs: number | null;                                // null until it ends
  attempt: number;                                    // 1, then one more with every re-run
  rerun: { by: string; at: number } | null;           // who re-ran it last, and when
  jobs: GitHubJob[];
}

interface GitHubJob {
  id: string; name: string; status: Status;
  secs: number | null; startedAt: number | null; endedAt: number | null;
  steps: GitHubStep[];
}

interface GitHubStep { id: string; name: string; status: Status; secs: number | null; lines: string[] }
```

A run is "queued" while all its jobs are, "in_progress" while any is
unfinished, then "failure" if a job failed, "cancelled" if one was
cancelled, and "success" otherwise.

### What the world can do

All of these are stable across renders, so they are safe to call from
timers and `onEvent`. Each throws when the pull request, run, job or step
it names is not there.

```ts
github.startRun(input: GitHubRunInput): number
  // Adds the run and returns its number. Throws if the number is taken or the workflow is unknown.
github.setStepStatus(run: number, job: string, step: string, status: Status, o?: { secs?: number }): void
  // "in_progress" also starts the job. An ended step keeps `secs` (0 when never given).
github.appendLog(run: number, job: string, step: string, lines: string | string[]): void
  // Printing to a queued step starts it, and its job.
github.setJobStatus(run: number, job: string, status: Status, o?: { secs?: number }): void
  // Ending a job ends its unfinished steps with the same status; `secs` defaults to the sum of its steps.
github.completeRun(run: number, conclusion?: Conclusion, o?: { secs?: number }): void
  // Ends the jobs still going as `conclusion` ("success" by default) and sets the run to it.
github.setChecks(pull: number, checks: GitHubCheck[]): void
  // Shown after the workflow checks: { name, status, text? }.
github.comment(pull: number, from: string, text: string): string     // returns the timeline entry's id
github.approve(pull: number, from: string): string                   // sets reviewers[from] to "approved"; returns the entry's id
github.merge(pull: number, by?: string, sha?: string): string
  // `by` is `me` by default, `sha` a random one. Does nothing to a pull request that is not open. Returns the SHA.
github.open(view: GitHubView): void
  // A run opens on the job asked for, else its failed job, else its first.
github.toast(text: string): void
github.setTheme(theme: "light" | "dark"): void
```

A pull request's Merge button is enabled when it is open, someone approved
it, and every check (the workflow jobs and its own `checks`) is a success.
Approve shows until someone has approved, unless `me` is the author.

Read-only fields: `github.state` (below), `github.seed`, `github.me`, `github.people` (`Record<string, Person>`), `github.notice` (the last toast). `github.ui` holds what `<GitHub>` calls for the signed-in person (`go`, `nav`, `setFilter`, `setDraft`, `postComment`, `approvePull`, `mergePull`, `rerunOpen`, `toggleStep`); a world does not need it.

### Events

```ts
type GitHubView =
  | { page: "pulls" }
  | { page: "pull"; pull: number; tab?: PullTab }
  | { page: "actions"; workflow?: string }             // a workflow id, or "all"
  | { page: "run"; run: number; job?: string };

type GitHubEvent =
  | { type: "nav"; to: string }
  | { type: "open"; view: GitHubView }
  | { type: "comment"; pull: number; text: string; id: string }   // id = the timeline entry
  | { type: "approve"; pull: number; id: string }
  | { type: "merge"; pull: number; title: string; sha: string }   // title = "<pull request title> (#<number>)"
  | { type: "rerun"; run: number; attempt: number };              // the new attempt's number
```

`nav`'s `to` is one of the tabs ("Code", "Issues", "Pull requests",
"Actions", "Projects", "Security", "Insights", "Settings") or header
controls ("Menu", "Organization", "Search", "New", "Notifications",
"Profile", "Sign out"). `open` carries the page as it is shown: a pull
request with its `tab`, Actions with its `workflow`, a run with its `job`.
`merge` and `rerun` fire only when the button did something: Merge is
disabled until the pull request can merge, Re-run jobs while the run is
going.

### State

`github.state` is a `GitHubState`: plain JSON (`version: 1`, `pulls`,
`runs`, `view` - the page on screen -, `pullFilter`, `drafts` - unsent
comments by pull request number -, `steps` - log steps opened or closed by
hand -, `theme`, `seq`). It is a new object after every change. Save it and
pass it back as `useGitHub(seed, { restore })`; `restore` is read only when
the hook first mounts, so load the saved state before rendering the
component that calls `useGitHub`. A run saved while it was going is still
going when restored: play the rest of it, or end it with `completeRun`.

### The component

```ts
interface GitHubProps {
  github: GitHubRepository;             // required: from useGitHub
  className?: string;
  style?: CSSProperties;
}
```

`<GitHub>` fills its parent, so the parent needs a height (`100vh`, or a
flex child with `min-height: 0`). Esc closes the user menu, and so does a
press anywhere else. In the log, a step is open when it failed or is
running, and the log follows new lines while the reader is at the bottom.

### Wiring it in an episode

```tsx
import { useEffect, useRef, useState } from "react";
import { casuro } from "@/lib/casuro";
import { GitHub, useGitHub, type GitHubJobInput, type GitHubRepository, type GitHubSeed, type GitHubState } from "./apps/github";

const seed: GitHubSeed = {
  repo: { owner: "northwind", name: "api" },
  me: "sam",
  people: { sam: { name: "Sam Rivera" }, priya: { name: "Priya Shah" } },
  pulls: [
    {
      number: 12, title: "Fix the date parser", author: "priya", branch: "priya/date-parser", reviewers: { sam: "requested" },
      body: "Parses `2026-01-05` as a local date.",
      timeline: [{ type: "commit", by: "priya", sha: "4be1c02", text: "fix: parse dates as local" }],
    },
  ],
  workflows: [{ id: "ci", name: "CI" }],
  runs: [],
  view: { page: "pull", pull: 12 },
};

// The CI job, and what each of its steps prints: [step id, seconds it takes, lines].
const JOB: GitHubJobInput = {
  id: "test",
  steps: [{ id: "setup", name: "Set up job" }, { id: "install", name: "Install dependencies" }, { id: "tests", name: "Run tests" }],
};
const SCRIPT: [string, number, string[]][] = [
  ["setup", 2, ["Runner Image: ubuntu-24.04"]],
  ["install", 14, ["Run npm ci", "added 312 packages in 14s"]],
  ["tests", 21, ["Run npm test", "\x1b[32m✓\x1b[0m src/date.test.ts (12 tests)"]],
];

/** Plays the job on a run, a line every 400ms; `fail` makes the tests fail. Returns how to stop it. */
function play(github: GitHubRepository, run: number, fail: boolean) {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let at = 0;
  const later = (fn: () => void) => timers.push(setTimeout(fn, (at += 400)));
  for (const [step, secs, lines] of SCRIPT) {
    const failed = fail && step === "tests";
    later(() => github.setStepStatus(run, "test", step, "in_progress"));
    for (const line of lines) later(() => github.appendLog(run, "test", step, line));
    if (failed) later(() => github.appendLog(run, "test", step, "\x1b[31mError: expected 5 January, got 4 January\x1b[0m"));
    later(() => github.setStepStatus(run, "test", step, failed ? "failure" : "success", { secs }));
  }
  later(() => github.completeRun(run, fail ? "failure" : "success"));
  return () => timers.forEach(clearTimeout);
}

export function GitHubScene() {
  const [saved, setSaved] = useState<GitHubState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ github?: GitHubState }>().then((s) => setSaved(s?.github ?? null));
  }, []);
  if (saved === undefined) return null;          // wait: restore is read on mount only
  return <Repository restore={saved} />;
}

function Repository({ restore }: { restore: GitHubState | null }) {
  const stop = useRef(() => {});
  const github = useGitHub(seed, {
    restore,
    async onEvent(event) {
      if (event.type === "rerun") {
        // The tests pass the second time.
        void casuro.track.decision({ summary: `Re-ran CI run #${event.run}` });
        stop.current();
        stop.current = play(github, event.run, false);
      }
      if (event.type === "approve") void casuro.track.decision({ summary: `Approved pull request #${event.pull}` });
      if (event.type === "merge") {
        // The push to main runs CI again.
        void casuro.track.decision({ summary: `Merged pull request #${event.pull}` });
        const run = github.startRun({ workflow: "ci", title: event.title, event: "push", branch: "main", sha: event.sha, actor: github.me, jobs: [JOB] });
        stop.current = play(github, run, false);
      }
      if (event.type === "comment") {
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: `#${event.pull}`, text: event.text });
        const reply = await casuro.llm(
          [
            { role: "system", content: "You are Priya Shah, the author of this pull request, answering a review comment in one or two sentences." },
            { role: "user", content: event.text },
          ],
          { persona: "Priya Shah" },
        );
        github.comment(event.pull, "priya", reply);
        void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: `#${event.pull}`, text: reply });
      }
    },
  });

  // CI starts on the pull request five seconds in, and fails (once: a restored state already has the run).
  useEffect(() => {
    if (github.state.runs.some((r) => r.id === 301)) return;
    const t = setTimeout(() => {
      github.startRun({ id: 301, workflow: "ci", title: "fix: parse dates as local", event: "pull_request", branch: "priya/date-parser", sha: "4be1c02", actor: "priya", pr: 12, jobs: [JOB] });
      stop.current = play(github, 301, true);
    }, 5_000);
    return () => {
      clearTimeout(t);
      stop.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save everything that changed.
  useEffect(() => {
    void casuro.store.set({ github: github.state });
  }, [github.state]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <GitHub github={github} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `GitHub.tsx` | The layout, the page on screen, the toast, closing the user menu, the clock that keeps "5 minutes ago" moving. |
| `Header.tsx` | The global header (mark, owner / repository, search, create, notifications, the user menu with the theme switch) and the repository tabs. |
| `Pulls.tsx` | The pull request list: Open and Closed, a row per pull request. |
| `Pull.tsx` | A pull request: the conversation, the merge box with its checks, Approve and Merge, the comment box, reviewers and labels, Files changed. |
| `Actions.tsx` | The workflows and the list of runs. |
| `Run.tsx` | A run: its header with Re-run jobs, its jobs, and the job log. |
| `context.tsx` | Shared screen state and the small parts: avatar, label, branch name. |
| `use-github.ts` | The state and what changes it. |
| `format.tsx` | Times ("5 hours ago", "1m 12s"), the Markdown of comments, diffs as rows, ANSI colors. |
| `icons.tsx` | The icons, the status icons and the GitHub mark. |
| `github.css` | The look, from the mockup. |

For anything the kit does not have (the Code tab, a review with inline
comments, artifacts, a deployment gate), listen for the `nav` event or add
a part: the files are yours to edit.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=github` next to `/apps/github.html`: the same repository,
drawn by the React version. A CI run on #912 streams as the page opens and
a CodeQL run starts five seconds later; follow "Details" from the merge
box into a job's log, approve, and merge once the checks are green. Re-run
jobs on the failed run #4819 plays it again, and the flaky test passes.
