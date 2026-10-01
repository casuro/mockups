import { useEffect, useRef } from "react";
import { GitHub, useGitHub, type GitHubJobInput, type GitHubPullInput, type GitHubRepository, type GitHubRunInput, type GitHubSeed } from "../apps/github";
import { FACES } from "./faces";

// apps/github.html's casuro/core repository, driving the React version: the
// same people, pull requests, workflows and runs (PR #912's migration, the
// flaky checkout retry test, deploy #1482), the mockup's notices for the
// controls it has no page for, and the runner. The kit runs no workflow by
// itself, so the runner here plays each job's script through the world
// calls: a CI run on #912 is streaming when the page opens, a CodeQL run
// starts five seconds later, Re-run jobs plays a run again (the flaky test
// passes the second time), and merging starts CI on main.

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const T0 = Date.now();

// ---------- What each job prints ----------

/** One step of a job: its name, the seconds it takes on a runner, its log lines, whether it fails. */
type Script = [name: string, secs: number, lines: string[], fail?: boolean];
interface Ctx { job: string; sha: string; ref: string; message: string }
// Log lines carry ANSI colors, the way a runner writes them.
const A = (n: number, s: string) => `\x1b[${n}m${s}\x1b[0m`;
const [green, red, yellow, cyan, gray, blue, bold] = [32, 31, 33, 36, 90, 34, 1].map((n) => (s: string) => A(n, s));
const L = (s: string) => s.split("\n");
// One step of a job: [name, seconds it takes on a runner, its log lines, whether it fails].
const S: Record<string, (c: Ctx, shard?: number, fail?: boolean) => Script> = {
  setup: c => ["Set up job", 2, L(`Current runner version: '2.319.1'
Runner Image: ubuntu-24.04 (20260922.1.0)
Secret source: Actions
Prepare workflow directory
Download action repository 'actions/checkout@v4'
Download action repository 'actions/setup-node@v4'
Complete job name: ${c.job}`)],
  checkout: c => ["Checkout", 1, L(`${blue("Run actions/checkout@v4")}
Syncing repository: casuro/core
${blue(`/usr/bin/git fetch --no-tags --prune --depth=1 origin ${c.sha}`)}
From https://github.com/casuro/core
 * [new ref]         ${c.sha} -> ${c.ref}
HEAD is now at ${c.sha} ${c.message}`)],
  node: () => ["Setup Node", 3, L(`${blue("Run actions/setup-node@v4")}
Found in cache @ /opt/hostedtoolcache/node/22.9.0/x64
node: v22.9.0
npm: 10.8.3
Cache restored from key: node-cache-Linux-x64-npm-5f1e9a7c20d4`)],
  install: () => ["Install dependencies", 14, L(`${blue("Run npm ci")}
${yellow("npm warn")} deprecated inflight@1.0.6: This module is not supported, and leaks memory.

added 812 packages, and audited 813 packages in 14s
found ${green("0")} vulnerabilities`)],
  migrate: () => ["Run migrations", 4, L(`${blue("Run npm run db:migrate")}
Connecting to postgres://postgres:***@localhost:5432/core_test
  ${gray("applied")} 0139_add_space_settings.sql ${gray("(41ms)")}
  ${gray("applied")} 0140_checkout_idempotency_keys.sql ${gray("(63ms)")}
  ${gray("applied")} 0141_create_assessment_spaces.sql ${gray("(118ms)")}
${green("✓")} 141 migrations applied`)],
  lint: () => ["Run lint", 21, L(`${blue("Run npm run lint")}

> @casuro/core@2.14.0 lint
> eslint . && tsc --noEmit

/home/runner/work/core/core/src/billing/retry.ts
  31:42  ${yellow("warning")}  Unexpected any. Specify a different type  ${gray("@typescript-eslint/no-explicit-any")}

${yellow("✖ 1 problem (0 errors, 1 warning)")}`)],
  tests: (_c, shard, fail) => {
    const head = L(`${blue(`Run npm test -- --shard=${shard}/2`)}

> @casuro/core@2.14.0 test
> vitest run --shard=${shard}/2

${A(46, " RUN ")} ${cyan("v2.1.3")} ${gray("/home/runner/work/core/core")}
`);
    const files = shard === 1
      ? L(` ${green("✓")} test/api/assessments.test.ts ${gray("(18 tests)")} 2104ms
 ${green("✓")} test/api/spaces.test.ts ${gray("(14 tests)")} 1688ms
 ${green("✓")} test/api/auth.test.ts ${gray("(9 tests)")} 611ms
 ${green("✓")} test/models/space.test.ts ${gray("(7 tests)")} 302ms
 ${green("✓")} test/jobs/reminders.test.ts ${gray("(5 tests)")} 954ms`)
      : L(` ${green("✓")} test/jobs/backfillAssessmentSpaceOwners.test.ts ${gray("(3 tests)")} 1843ms
 ${green("✓")} test/migrations/0141.test.ts ${gray("(1 test)")} 388ms
 ${green("✓")} test/billing/invoices.test.ts ${gray("(12 tests)")} 742ms
 ${green("✓")} test/billing/checkout.test.ts ${gray("(11 tests)")} 1320ms`);
    if (!fail) return ["Run tests", shard === 1 ? 41 : 48, [...head, ...files, ...(shard === 2 ? [` ${green("✓")} test/billing/checkout.retry.test.ts ${gray("(4 tests)")} 214ms`] : []), ...L(`
${gray(" Test Files ")} ${bold(green("5 passed"))} ${gray("(5)")}
${gray("      Tests ")} ${bold(green(shard === 1 ? "53 passed" : "31 passed"))} ${gray(shard === 1 ? "(53)" : "(31)")}
${gray("   Duration ")} ${shard === 1 ? "7.48s" : "6.12s"}`)]];
    return ["Run tests", 52, [...head, ...files, ...L(` ${red("❯")} test/billing/checkout.retry.test.ts ${gray("(4 tests | ")}${red("1 failed")}${gray(")")} 5236ms
   ${green("✓")} checkout retry ${gray(">")} does not retry a 400
   ${green("✓")} checkout retry ${gray(">")} gives up after 3 attempts
   ${red("×")} checkout retry ${gray(">")} retries a 503 from the payment provider ${red("5003ms")}
     ${red("→ Test timed out in 5000ms.")}
   ${green("✓")} checkout retry ${gray(">")} backs off with jitter

${A(41, " FAIL ")} test/billing/checkout.retry.test.ts ${gray(">")} checkout retry ${gray(">")} retries a 503 from the payment provider
${bold(red("Error: Test timed out in 5000ms."))}
 ${cyan("❯")} test/billing/checkout.retry.test.ts:${yellow("12")}:${yellow("3")}
    ${gray("11|")} describe("checkout retry", () => {
    ${gray("12|")}   it("retries a 503 from the payment provider", async () => {
    ${gray("  |")}   ${red("^")}
    ${gray("13|")}     const charge = vi.fn()

${gray(" Test Files ")} ${bold(red("1 failed"))} ${gray("|")} ${bold(green("4 passed"))} ${gray("(5)")}
${gray("      Tests ")} ${bold(red("1 failed"))} ${gray("|")} ${bold(green("30 passed"))} ${gray("(31)")}
${gray("   Duration ")} 11.04s

${bold(red("Error: Process completed with exit code 1."))}`)], true];
  },
  build: () => ["Build", 18, L(`${blue("Run npm run build")}

> @casuro/core@2.14.0 build
> tsc -p tsconfig.build.json

dist/ ${gray("214 files, 1.8 MB")}
${green("✓")} built in 16.4s`)],
  docker: c => ["Build and push image", 146, L(`${blue(`Run docker buildx build --push -t registry.casuro.dev/api-gateway:${c.sha} .`)}
#1 [deps 1/2] COPY package.json package-lock.json ./
#1 DONE 0.1s
#2 [deps 2/2] RUN npm ci --omit=dev
#2 DONE 38.4s
#3 [build] RUN npm run build
#3 DONE 21.7s
#4 exporting to image
#4 DONE 44.9s
${green("✓")} pushed registry.casuro.dev/api-gateway:${c.sha}`)],
  production: c => ["Deploy api-gateway to production", 34, L(`${blue("Run ./scripts/deploy.sh production")}
Deploying api-gateway@${c.sha} to ${bold("production")}
  canary 1/12 pods ready
  ${gray("canary error rate")} 0.02% ${gray("(threshold 1%)")}
  rollout 12/12 pods ready
${green("✓")} api-gateway ${c.sha} is live in production`)],
  smoke: () => ["Smoke test", 9, L(`${blue("Run npm run smoke -- --env production")}
 ${green("✓")} GET /healthz ${gray("200 in 41ms")}
 ${green("✓")} POST /api/v1/checkout ${gray("(dry run) 200 in 118ms")}
${green("2 checks passed")}`)],
  scan: () => ["Perform CodeQL Analysis", 69, L(`${blue("Run github/codeql-action/analyze@v3")}
Extracting 412 TypeScript files
Running queries: 214 queries in javascript-security-extended
${green("✓")} No new alerts in code changed by this pull request`)],
  post: () => ["Post steps", 0, L(`Post job cleanup.
Cache hit occurred on the primary key node-cache-Linux-x64-npm-5f1e9a7c20d4, not saving cache.`)],
  done: () => ["Complete job", 0, ["Cleaning up orphan processes"]],
};

// The jobs of each workflow, and the steps each runs.
const START = ["setup", "checkout", "node", "install"];
const JOBS: Record<string, { name: string; steps: string[]; shard?: number }> = {
  lint: { name: "lint", steps: [...START, "lint", "post", "done"] },
  test1: { name: "test (shard 1/2)", steps: [...START, "migrate", "tests", "post", "done"], shard: 1 },
  test2: { name: "test (shard 2/2)", steps: [...START, "migrate", "tests", "post", "done"], shard: 2 },
  build: { name: "build", steps: [...START, "build", "post", "done"] },
  deploy: { name: "deploy", steps: ["setup", "checkout", "docker", "production", "smoke", "done"] },
  analyze: { name: "Analyze (javascript-typescript)", steps: ["setup", "checkout", "scan", "done"] },
};
const WF_JOBS: Record<string, string[]> = { ci: ["lint", "test1", "test2", "build"], deploy: ["deploy"], codeql: ["analyze"] };
// The job that fails on a run's first attempt: the flaky checkout retry test.
const FAILS: Record<number, string> = { 4819: "test2" };

interface RunSpec { id?: number; workflow: string; title: string; sha: string; branch: string; pr?: number | null }
/** What a job prints, step by step. */
function script(run: RunSpec, job: string, fail: boolean): Script[] {
  const j = JOBS[job];
  const c = { job: j.name, sha: run.sha, message: run.title, ref: run.pr ? `pull/${run.pr}/merge` : `origin/${run.branch}` };
  return j.steps.map((k) => S[k](c, j.shard, fail));
}
/** A run's jobs: queued with their steps named, or (`done`) as they stand once the scripts have played out. */
function jobs(run: RunSpec, done: boolean): GitHubJobInput[] {
  return WF_JOBS[run.workflow].map((id) => {
    const steps = script(run, id, FAILS[run.id ?? 0] === id);
    if (!done) return { id, name: JOBS[id].name, steps: steps.map(([name]) => ({ name })) };
    const failed = steps.some(([, , , fail]) => fail);
    return { id, name: JOBS[id].name, status: failed ? "failure" : "success", steps: steps.map(([name, secs, lines, fail]) => ({ name, secs, lines, status: fail ? "failure" : "success" })) };
  });
}

// ---------- The repository ----------

const pull = { event: "pull_request", branch: "dev/assessment-spaces", actor: "dev", pr: 912 } as const;
const push = { event: "push", branch: "main", actor: "marcus" } as const;
const run = (spec: Omit<GitHubRunInput, "jobs">, done = true): GitHubRunInput => ({ ...spec, jobs: jobs(spec, done) });
const RUNS: GitHubRunInput[] = [
  run({ id: 4821, workflow: "ci", title: "test: cover a resumed backfill", sha: "c41d9e7", ...pull, at: T0 - 28 * SEC }, false),
  run({ id: 732, workflow: "codeql", title: "test: cover a resumed backfill", sha: "c41d9e7", ...pull, at: T0 - 28 * SEC }, false),
  run({ id: 1482, workflow: "deploy", title: "fix: retry idempotent requests (#905)", sha: "a3f9e1c", ...push, at: T0 - 3 * HOUR - 6 * MIN }),
  run({ id: 4820, workflow: "ci", title: "fix: retry idempotent requests (#905)", sha: "a3f9e1c", ...push, at: T0 - 3 * HOUR - 10 * MIN }),
  run({ id: 4819, workflow: "ci", title: "fix(jobs): batch the backfill in chunks of 5k", sha: "8be2a04", ...pull, at: T0 - 5 * HOUR - 5 * MIN }),
  run({ id: 731, workflow: "codeql", title: "Nightly scan", event: "schedule", branch: "main", sha: "5ac27d1", actor: "hana", at: T0 - 9 * HOUR }),
  run({ id: 4818, workflow: "ci", title: "fix(checkout): make retry timing injectable", event: "pull_request", branch: "naman/fix-checkout-flake", sha: "b60c1f8", actor: "naman", pr: 915, at: T0 - 20 * HOUR }),
];
// A run cancelled before its jobs started.
const cancelled = run({ id: 4817, workflow: "ci", title: "chore(deps): bump vitest to 2.1.4", event: "pull_request", branch: "lena/bump-vitest", sha: "0d94e77", actor: "lena", pr: 910, at: T0 - 28 * HOUR, secs: 31 }, false);
RUNS.push({ ...cancelled, jobs: cancelled.jobs.map((j) => ({ ...j, status: "cancelled", secs: 0 })) });
// When the runner picks up the runs that are queued as the page opens.
const STARTS: Record<number, number> = { 4821: T0, 732: T0 + 5 * SEC };

const PULLS: GitHubPullInput[] = [
  {
    number: 912, title: "feat(db): add assessment_spaces with backfill", author: "dev", branch: "dev/assessment-spaces", at: T0 - 26 * HOUR,
    labels: ["database", "migration"], reviewers: { naman: "requested", hana: "commented" },
    body: "Adds the `assessment_spaces` table and backfills `owner_id` from the legacy `space_owner` column (CAS-912).\n\n- `0141_create_assessment_spaces.sql` creates the table and its index\n- The backfill runs as a job, in batches, so it can be stopped and picked up again\n- RLS on the table waits until the backfill reports zero rows without an owner\n\nRollout: run the job Tuesday night, after the deploy freeze lifts.",
    timeline: [
      { type: "commit", by: "dev", sha: "8be2a04", text: "fix(jobs): batch the backfill in chunks of 5k", at: T0 - 5 * HOUR },
      { type: "comment", by: "hana", at: T0 - 4 * HOUR, text: "Batching looks right to me. I would like @naman to look at the lock on `spaces` before this goes in." },
      { type: "comment", by: "marcus", at: T0 - 40 * MIN, text: "The red X on `test (shard 2/2)` is the checkout retry flake again (CAS-934), not this change. A re-run should clear it." },
      { type: "commit", by: "dev", sha: "c41d9e7", text: "test: cover a resumed backfill", at: T0 - 30 * SEC },
      { type: "event", icon: "eye", by: "dev", text: "requested a review from **naman**", at: T0 - 28 * SEC },
    ],
    files: [{ path: "src/models/space.ts", diff: `@@ -12,10 +12,16 @@ export class Space extends Model {
   static tableName = "spaces";
 
   id!: number;
   name!: string;
-  // The member who owns the space.
-  space_owner!: number;
+  /**
+   * @deprecated Owners live on assessment_spaces.owner_id since migration 0141.
+   * Kept until the backfill has run everywhere; remove in CAS-921.
+   */
+  space_owner!: number | null;
   created_at!: Date;
 
-  static relations = { assessments: hasMany("assessments") };
+  static relations = {
+    assessments: hasMany("assessments"),
+    assessmentSpaces: hasMany("assessment_spaces"),
+  };
 }` }],
  },
  {
    number: 915, title: "fix(checkout): make retry timing injectable", author: "naman", branch: "naman/fix-checkout-flake", at: T0 - 20 * HOUR,
    labels: ["flaky-test", "checkout"], reviewers: { marcus: "requested" },
    body: "`checkout.retry.test.ts` fails about 1 run in 10 on CI: the jittered delay can land close to the test's fixed 450ms wait (CAS-934).\n\n`withRetry` now takes `sleep` and `random`, and the test passes fakes for both.",
  },
  {
    number: 910, title: "chore(deps): bump vitest to 2.1.4", author: "lena", branch: "lena/bump-vitest", at: T0 - 28 * HOUR,
    labels: ["dependencies"], body: "Picks up the sharding fix in vitest 2.1.4. No config changes.",
  },
  {
    number: 905, title: "fix: retry idempotent requests", author: "marcus", state: "merged", branch: "marcus/retry-idempotent", at: T0 - 2 * DAY, mergedAt: T0 - 3 * HOUR - 12 * MIN,
    labels: ["checkout"], reviewers: { naman: "approved" }, body: "Retries idempotent requests to the payment provider on 502, 503 and 504, with jittered backoff.",
    timeline: [
      { type: "event", icon: "check", color: "green", by: "naman", text: "approved these changes", at: T0 - 4 * HOUR },
      { type: "event", icon: "merge", color: "purple", by: "marcus", text: "merged commit `a3f9e1c` into `main`", at: T0 - 3 * HOUR - 12 * MIN },
    ],
  },
  {
    number: 898, title: "ci: split tests into two shards", author: "hana", state: "merged", branch: "hana/shard-tests", at: T0 - 4 * DAY, mergedAt: T0 - 3 * DAY,
    labels: ["ci"], reviewers: { dev: "approved" }, body: "Runs the test job as a 2-way matrix. CI drops from about 3 minutes to 1m 12s.",
  },
];

export const GITHUB_DEMO: GitHubSeed = {
  repo: {
    owner: "casuro", name: "core", issues: 14,
    labels: { database: "#bfd4f2", migration: "#d4c5f9", "flaky-test": "#fbca04", checkout: "#f9d0c4", dependencies: "#0366d6", ci: "#c2e0c6" },
  },
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", photo: FACES.naman },
    hana: { name: "Hana Kim", photo: FACES.hana },
    marcus: { name: "Marcus Chen", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", photo: FACES.sofia },
    dev: { name: "Dev Patel", photo: FACES.dev },
    lena: { name: "Lena Okafor", photo: FACES.lena },
  },
  pulls: PULLS,
  workflows: [{ id: "ci", name: "CI" }, { id: "deploy", name: "Deploy to production" }, { id: "codeql", name: "CodeQL" }],
  runs: RUNS,
  view: { page: "pull", pull: 912 },
};

// The mockup's notices for the controls it has no page for.
const NOTICES: Record<string, string> = {
  Menu: "Navigation menu",
  Organization: "The casuro organization",
  Search: "Search is not part of this demo",
  New: "Create new: repository, issue, pull request",
  Notifications: "You have 3 unread notifications",
  Profile: "Your profile",
  "Sign out": "Signed out (demo)",
};

// ---------- The runner ----------

// A runner's seconds pass SPEED times faster on screen, so a 1m 12s run streams in about 45s.
const SPEED = 1.6;
const TICK = 200;
/** Where a job's script stands: the step it is on, when that step started, the lines it has printed. */
interface Cursor { at: number; t: number; n: number; failed: boolean }

export function GitHubPreview() {
  const ref = useRef<GitHubRepository | null>(null);
  const cursors = useRef(new Map<string, Cursor>());
  const starts = useRef({ ...STARTS });
  const github = useGitHub(GITHUB_DEMO, {
    onEvent(event) {
      const gh = ref.current!;
      if (event.type === "nav" && event.to !== "Pull requests" && event.to !== "Actions") gh.toast(NOTICES[event.to] ?? `${event.to} is not part of this demo`);
      // The push to main starts CI, two seconds later.
      if (event.type === "merge") {
        const id = gh.startRun({ workflow: "ci", title: event.title, event: "push", branch: "main", sha: event.sha, actor: gh.me, jobs: jobs({ workflow: "ci", title: event.title, sha: event.sha, branch: "main" }, false) });
        starts.current[id] = Date.now() + 2 * SEC;
      }
    },
  });
  ref.current = github;

  // Every tick, each unfinished run prints a little more. A re-run is a new attempt, so its jobs play from the top.
  useEffect(() => {
    const t = setInterval(() => {
      const gh = ref.current!;
      const now = Date.now();
      for (const r of gh.state.runs) {
        // It plays the runs it was told to start, and re-runs.
        const at = starts.current[r.id] ?? (r.attempt > 1 ? 0 : null);
        if (at == null || now < at || r.status === "success" || r.status === "failure" || r.status === "cancelled") continue;
        for (const job of r.jobs) {
          const key = `${r.id}/${r.attempt}/${job.id}`;
          const steps = script(r, job.id, r.attempt === 1 && FAILS[r.id] === job.id);
          let c = cursors.current.get(key);
          if (!c) {
            cursors.current.set(key, (c = { at: 0, t: now, n: 0, failed: false }));
            gh.setStepStatus(r.id, job.id, job.steps[0].id, "in_progress");
            continue;
          }
          if (c.at >= steps.length) continue;
          const [, secs, lines, fail] = steps[c.at];
          const step = job.steps[c.at].id;
          const done = Math.min(1, (now - c.t) / Math.max(300, (secs * 1000) / SPEED));
          const n = Math.floor(done * lines.length);
          if (n > c.n) gh.appendLog(r.id, job.id, step, lines.slice(c.n, n));
          c.n = n;
          if (done < 1) continue;
          gh.setStepStatus(r.id, job.id, step, fail ? "failure" : "success", { secs });
          Object.assign(c, { at: c.at + 1, t: now, n: 0, failed: c.failed || !!fail });
          if (c.at < steps.length) gh.setStepStatus(r.id, job.id, job.steps[c.at].id, "in_progress");
          else gh.setJobStatus(r.id, job.id, c.failed ? "failure" : "success");
        }
      }
    }, TICK);
    return () => clearInterval(t);
  }, []);

  return <GitHub github={github} />;
}
