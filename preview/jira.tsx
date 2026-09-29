import { useRef } from "react";
import { Jira, useJira, type JiraEvent, type JiraProject, type JiraSeed } from "../apps/jira";
import { FACES } from "./faces";

// apps/jira.html's project and demo, driving the React version: the same
// people, sprints, epics and issues on the same day, the mockup's notices
// for the buttons it only pretends to have, and a teammate who answers when
// you @mention them in a comment.

const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;
const NOW = new Date(2026, 8, 28, 10, 30).getTime();
const at = (y: number, m: number, d: number, h = 9, mi = 0) => new Date(y, m, d, h, mi).getTime();
const ago = (ms: number) => NOW - ms;
const P = (...ps: string[]) => ps.map((p) => `<p>${p}</p>`).join("");

export const JIRA_DEMO: JiraSeed = {
  site: "casuro",
  project: { key: "CAS", name: "Casuro Platform", kind: "Software project", board: "CAS board" },
  me: "naman",
  now: NOW,
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", role: "Engineering Manager", photo: FACES.naman },
    hana: { name: "Hana Kim", email: "hana@casuro.com", role: "Product Designer", photo: FACES.hana },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", role: "Staff Engineer", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", role: "Platform Engineer", photo: FACES.sofia },
    dev: { name: "Dev Patel", email: "dev@casuro.com", role: "Backend Engineer", photo: FACES.dev },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", role: "Design Lead", photo: FACES.lena },
  },
  statuses: [
    { id: "todo", name: "To Do" },
    { id: "inprogress", name: "In Progress" },
    { id: "review", name: "In Review", limit: 3 },
    { id: "done", name: "Done" },
  ],
  sprints: [
    { id: "s41", name: "CAS Sprint 41", start: at(2026, 8, 7), end: at(2026, 8, 18, 18), state: "closed" },
    { id: "s42", name: "CAS Sprint 42", start: at(2026, 8, 21), end: at(2026, 9, 2, 18), state: "active", goal: "Ship the assessment spaces owner backfill and stop checkout retry storms." },
    { id: "s43", name: "CAS Sprint 43", start: at(2026, 9, 5), end: at(2026, 9, 16, 18), state: "future", goal: "Onboarding v4 steps 4 and 5, error budget panels on the deploy dashboard." },
  ],
  versions: [
    { id: "v2609", name: "Platform 2026.09", released: true, date: at(2026, 8, 18) },
    { id: "v2610", name: "Platform 2026.10", date: at(2026, 9, 9) },
    { id: "v2611", name: "Platform 2026.11", date: at(2026, 10, 13) },
  ],
  labels: ["backend", "migration", "checkout", "incident", "frontend", "onboarding", "observability", "flaky-test", "design", "api", "tech-debt"],
  recent: ["CAS-912", "CAS-915", "CAS-921", "CAS-930", "CAS-934", "CAS-922"],
  issues: [
    // Epics
    { key: "CAS-880", type: "epic", summary: "Assessment Spaces", color: "purple", status: "inprogress", assignee: "marcus", reporter: "naman", priority: "high", created: ago(40 * DAY), updated: ago(1 * DAY), fixVersions: ["v2610"], watchers: ["naman"],
      description: P("Let teams group assessments into spaces with an owner, shared permissions and archive support.", "<strong>Success metric:</strong> 60% of active teams create a second space within 30 days of launch.") },
    { key: "CAS-881", type: "epic", summary: "Checkout Reliability", color: "orange", status: "inprogress", assignee: "dev", reporter: "naman", priority: "highest", created: ago(30 * DAY), updated: ago(3 * HR), fixVersions: ["v2610"], watchers: ["naman"],
      description: P("Bring checkout error rate under 0.1% and remove retry storms against the payment provider.") },
    { key: "CAS-882", type: "epic", summary: "Onboarding v4", color: "lime", status: "inprogress", assignee: "hana", reporter: "naman", priority: "medium", created: ago(28 * DAY), updated: ago(5 * HR), fixVersions: ["v2611"], watchers: ["naman"],
      description: P("Rework the first-run experience into five short steps with clear permissions and integrations setup.") },
    { key: "CAS-883", type: "epic", summary: "Platform Observability", color: "blue", status: "todo", assignee: "sofia", reporter: "naman", priority: "medium", created: ago(21 * DAY), updated: ago(1 * DAY), fixVersions: ["v2611"], watchers: ["naman"],
      description: P("Latency, saturation and error budget visibility for every service on the deploy dashboard.") },

    // Active sprint
    { key: "CAS-912", type: "story", summary: "Backfill owner_id for assessment_spaces in batches", status: "inprogress", assignee: "marcus", reporter: "naman", priority: "high", points: 5, labels: ["backend", "migration"], sprint: "s42", epic: "CAS-880", fixVersions: ["v2610"], watchers: ["naman", "marcus", "sofia"], created: at(2026, 8, 21, 9, 14), updated: ago(1 * HR),
      description: `<h3>Context</h3><p>Every row in <code>assessment_spaces</code> needs an <code>owner_id</code> before we can enforce owner-scoped permissions (CAS-924). About 1.2M rows are missing it.</p><h3>Approach</h3><ul><li>Batched job, 5k rows per batch, ordered by primary key</li><li>Throttle between batches so replica lag stays under 10s</li><li>Dry-run mode that only logs counts</li></ul><h3>Acceptance criteria</h3><ol><li>No row in <code>assessment_spaces</code> has a null <code>owner_id</code></li><li>Replica lag never exceeds 30s during the run</li><li>Job is resumable from the last processed id</li></ol>`,
      dev: { branch: "CAS-912-backfill-owner-id", commits: 4, lastCommit: ago(2 * HR), pr: { num: 912, state: "open", title: "CAS-912 Batched owner_id backfill for assessment_spaces" } },
      links: [{ type: "blocks", key: "CAS-924" }],
      subtasks: [
        { key: "CAS-913", summary: "Write batched backfill job with 5k row chunks", status: "done", assignee: "marcus", reporter: "naman", priority: "high", created: at(2026, 8, 21, 9, 20), updated: ago(3 * DAY), watchers: ["naman"] },
        { key: "CAS-914", summary: "Add dry-run mode and progress logging", status: "inprogress", assignee: "marcus", reporter: "naman", priority: "medium", created: at(2026, 8, 21, 9, 22), updated: ago(5 * HR), watchers: ["naman"] },
        { key: "CAS-917", summary: "Run backfill on staging snapshot", status: "todo", assignee: "sofia", reporter: "naman", priority: "medium", created: at(2026, 8, 22, 11), updated: ago(2 * DAY), watchers: ["naman"] },
      ],
      comments: [
        { from: "marcus", at: ago(2 * DAY + 3 * HR), text: "Dry run on the staging snapshot finished: 1.2M rows, 5k per batch, about 14 minutes end to end. No lock waits over 40ms." },
        { from: "sofia", at: ago(1 * DAY + 2 * HR), text: "@Marcus Chen can we throttle to 2k during business hours? The replica lag alert fires at 30s and we were at 22s during the dry run." },
        { from: "marcus", at: ago(3 * HR), text: "Good call. Added a --batch-size flag and a 200ms sleep between batches. PR #912 is up for review." },
        { from: "naman", at: ago(1 * HR), text: "Thanks both. Let's run it Tuesday night after the deploy freeze lifts. @Sofia Alvarez can you be on call for it?" },
      ],
      history: [
        { by: "marcus", field: "Status", from: "To Do", to: "In Progress", at: ago(4 * DAY) },
        { by: "naman", field: "Sprint", from: "", to: "CAS Sprint 42", at: at(2026, 8, 21, 9, 30) },
      ],
      worklog: [
        { by: "marcus", minutes: 150, text: "Batch job and dry-run on staging snapshot", at: ago(2 * DAY) },
        { by: "marcus", minutes: 90, text: "Throttle flag after review", at: ago(4 * HR) },
      ] },
    { key: "CAS-915", type: "bug", summary: "Retry storm causes connection pool exhaustion", status: "inprogress", assignee: "dev", reporter: "sofia", priority: "highest", points: 8, labels: ["checkout", "incident", "backend"], sprint: "s42", epic: "CAS-881", flagged: true, fixVersions: ["v2610"], watchers: ["naman", "dev", "sofia", "marcus"], created: at(2026, 8, 22, 14, 41), updated: ago(40 * MIN),
      description: `<p>When the payment provider returns 503, every checkout worker retries immediately with no backoff. Each retry opens a new database connection and the pool (50 per pod) is exhausted within seconds.</p><h3>Steps to reproduce</h3><ol><li>Point staging at the provider sandbox with fault injection at 30% 503s</li><li>Run the checkout load test at 200 rps</li><li>Watch pgbouncer <code>cl_waiting</code> climb past 400</li></ol><h3>Expected</h3><p>Retries back off with jitter and never hold a connection while waiting.</p>`,
      dev: { branch: "CAS-915-retry-backoff", commits: 7, lastCommit: ago(50 * MIN), pr: { num: 918, state: "open", title: "CAS-915 Exponential backoff with jitter for payment retries" } },
      links: [{ type: "relates to", key: "CAS-927" }, { type: "is caused by", key: "CAS-916" }],
      subtasks: [
        { key: "CAS-920", summary: "Map every retry path in the checkout client", status: "done", assignee: "dev", reporter: "naman", priority: "high", created: ago(10 * DAY), updated: ago(4 * DAY), watchers: ["naman"] },
        { key: "CAS-923", summary: "Add exponential backoff with jitter", status: "inprogress", assignee: "dev", reporter: "naman", priority: "highest", created: ago(10 * DAY), updated: ago(1 * HR), watchers: ["naman"] },
      ],
      comments: [
        { from: "dev", at: ago(5 * DAY), text: "Reproduced locally: when the provider returns 503, every worker retries immediately and we open about 40 new connections per second." },
        { from: "sofia", at: ago(4 * DAY + 5 * HR), text: "Pool size is 50 per pod. The pgbouncer graphs confirm saturation at 14:02 and 14:37 on the incident day." },
        { from: "naman", at: ago(4 * DAY), text: "Flagging this as the top priority for the sprint. @Dev Patel ping me if you need another reviewer." },
        { from: "dev", at: ago(40 * MIN), text: "Backoff with jitter is in PR #918. Load test at 200 rps with 30% 503s now peaks at 31 connections. @Naman Shukla ready for review." },
      ],
      history: [
        { by: "naman", field: "Flagged", from: "", to: "Impediment", at: ago(4 * DAY) },
        { by: "dev", field: "Status", from: "To Do", to: "In Progress", at: ago(5 * DAY) },
      ],
      worklog: [
        { by: "dev", minutes: 240, text: "Reproduce with fault injection", at: ago(5 * DAY) },
        { by: "sofia", minutes: 60, text: "Pool metrics analysis", at: ago(4 * DAY) },
      ] },
    { key: "CAS-921", type: "story", summary: "Onboarding step 3: split permissions screen", status: "review", assignee: "hana", reporter: "lena", priority: "medium", points: 3, labels: ["frontend", "onboarding", "design"], sprint: "s42", epic: "CAS-882", fixVersions: ["v2611"], watchers: ["naman"], created: at(2026, 8, 21, 10, 5), updated: ago(3 * HR),
      description: P("Step 3 currently asks for role and per-space permissions on one screen and 41% of users drop off here.", "Split it into <strong>3a</strong> (pick a role) and <strong>3b</strong> (per-space permissions, prefilled from the role)."),
      dev: { branch: "CAS-921-split-permissions", commits: 5, lastCommit: ago(4 * HR), pr: { num: 915, state: "open", title: "CAS-921 Split onboarding permissions into two steps" } },
      subtasks: [{ key: "CAS-928", summary: "Design review with Lena", status: "done", assignee: "lena", reporter: "naman", priority: "medium", created: ago(10 * DAY), updated: ago(2 * DAY), watchers: ["naman"] }],
      comments: [
        { from: "hana", at: ago(1 * DAY + 4 * HR), text: "Uploaded the split screen mocks. Step 3a is role selection, 3b is per-space permissions prefilled from the role." },
        { from: "lena", at: ago(1 * DAY), text: "Looks great. Let's keep the illustration from step 2 so the flow feels continuous." },
      ],
      history: [{ by: "hana", field: "Status", from: "In Progress", to: "In Review", at: ago(3 * HR) }] },
    { key: "CAS-930", type: "task", summary: "Add p99 latency to deploy dashboard", status: "todo", assignee: "sofia", reporter: "naman", priority: "medium", points: 2, labels: ["observability"], sprint: "s42", epic: "CAS-883", watchers: ["naman"], created: at(2026, 8, 23, 16), updated: ago(15 * MIN),
      description: P("Add p50, p95 and p99 request latency per service to the deploy dashboard, with a marker for each deploy."),
      comments: [{ from: "sofia", at: ago(15 * MIN), text: "@Naman Shukla do we want p99 or p95 on the main panel? p99 is noisy for low-traffic services." }] },
    { key: "CAS-934", type: "bug", summary: "Flaky checkout retry test", status: "todo", assignee: "marcus", reporter: "dev", priority: "high", points: 2, labels: ["flaky-test", "checkout"], sprint: "s42", epic: "CAS-881", watchers: ["naman"], created: at(2026, 8, 24, 12), updated: ago(1 * DAY),
      description: P("<code>checkout_retry_spec</code> fails about 1 in 15 runs on CI. It sleeps on wall clock time while asserting backoff intervals."),
      comments: [{ from: "marcus", at: ago(1 * DAY), text: "Fails about 1 in 15 runs on CI. The test relies on wall clock time for the backoff; switching to a fake clock should fix it." }] },
    { key: "CAS-924", type: "story", summary: "Owner-scoped permissions for assessment spaces API", status: "todo", assignee: "marcus", reporter: "naman", priority: "high", points: 5, labels: ["api", "backend"], sprint: "s42", epic: "CAS-880", watchers: ["naman"], created: at(2026, 8, 21, 9, 40), updated: ago(2 * DAY),
      description: P("Once every space has an owner, only owners and admins can rename, archive or change sharing on a space."), links: [{ type: "is blocked by", key: "CAS-912" }] },
    { key: "CAS-926", type: "story", summary: "Empty state illustrations for assessment spaces", status: "review", assignee: "lena", reporter: "hana", priority: "low", points: 2, labels: ["design", "frontend"], sprint: "s42", epic: "CAS-880", watchers: ["naman"], created: at(2026, 8, 22, 10), updated: ago(6 * HR),
      description: P("Illustrations for no spaces yet, no assessments in a space, and archived spaces.") },
    { key: "CAS-927", type: "task", summary: "Add idempotency keys to checkout retries", status: "review", assignee: "dev", reporter: "marcus", priority: "high", points: 5, labels: ["checkout", "api"], sprint: "s42", epic: "CAS-881", watchers: ["naman"], created: at(2026, 8, 21, 15), updated: ago(5 * HR),
      description: P("Send an idempotency key with every charge request so a retried charge can never double bill."),
      dev: { branch: "CAS-927-idempotency-keys", commits: 3, lastCommit: ago(6 * HR), pr: { num: 916, state: "open", title: "CAS-927 Idempotency keys on charge requests" } },
      comments: [{ from: "marcus", at: ago(5 * HR), text: "Left a few comments on the PR. Mostly about key reuse across partial refunds." }],
      history: [{ by: "dev", field: "Status", from: "In Progress", to: "In Review", at: ago(5 * HR) }] },
    { key: "CAS-922", type: "bug", summary: "Onboarding progress bar resets on refresh", status: "inprogress", assignee: "naman", reporter: "hana", priority: "medium", points: 2, labels: ["frontend", "onboarding"], sprint: "s42", epic: "CAS-882", watchers: ["naman"], created: at(2026, 8, 23, 11), updated: ago(4 * HR),
      description: P("Complete step 2, refresh the page, and the progress bar shows step 1 again even though step 2 data is saved."),
      comments: [
        { from: "hana", at: ago(3 * DAY), text: "Repro: complete step 2, refresh, progress shows step 1 again. Happens in every browser I tried." },
        { from: "naman", at: ago(4 * HR), text: "Found it: the step index is read before the saved state loads. Fix is small, will pair with @Hana Kim to verify." },
      ] },
    { key: "CAS-925", type: "story", summary: "Assessment space settings page", status: "inprogress", assignee: "lena", reporter: "marcus", priority: "medium", points: 3, labels: ["frontend", "design"], sprint: "s42", epic: "CAS-880", watchers: ["naman"], created: at(2026, 8, 22, 9), updated: ago(1 * DAY),
      description: P("Settings page for a space: name, owner, default permissions and danger zone (archive).") },
    { key: "CAS-929", type: "task", summary: "Alert on queue depth above 10k for 5 minutes", status: "todo", assignee: "naman", reporter: "sofia", priority: "high", points: 3, labels: ["observability"], sprint: "s42", epic: "CAS-883", watchers: ["naman"], created: at(2026, 8, 24, 9), updated: ago(3 * DAY),
      description: P("Page the on-call engineer when any worker queue stays above 10k messages for 5 minutes.") },
    { key: "CAS-919", type: "task", summary: "Emit structured logs from payment worker", status: "done", assignee: "sofia", reporter: "dev", priority: "medium", points: 3, labels: ["observability", "backend"], sprint: "s42", epic: "CAS-883", watchers: ["naman"], created: at(2026, 8, 21, 11), updated: ago(2 * DAY),
      description: P("JSON logs with request id, provider latency and retry attempt so we can correlate with traces."),
      dev: { branch: "CAS-919-structured-logs", commits: 2, lastCommit: ago(3 * DAY), pr: { num: 910, state: "merged", title: "CAS-919 Structured logging in payment worker" } },
      history: [{ by: "sofia", field: "Status", from: "In Review", to: "Done", at: ago(2 * DAY) }] },
    { key: "CAS-918", type: "story", summary: "Onboarding step 2: invite teammates copy refresh", status: "done", assignee: "hana", reporter: "lena", priority: "low", points: 1, labels: ["onboarding"], sprint: "s42", epic: "CAS-882", watchers: ["naman"], created: at(2026, 8, 21, 13), updated: ago(3 * DAY),
      description: P("New copy for the invite step, reviewed with Lena.") },
    { key: "CAS-916", type: "task", summary: "Circuit breaker for payment provider client", status: "done", assignee: "dev", reporter: "marcus", priority: "high", points: 5, labels: ["checkout", "backend"], sprint: "s42", epic: "CAS-881", watchers: ["naman"], created: at(2026, 8, 21, 10), updated: ago(2 * DAY),
      description: P("Open the breaker after 20 consecutive failures, half-open after 30 seconds."),
      dev: { branch: "CAS-916-circuit-breaker", commits: 6, lastCommit: ago(3 * DAY), pr: { num: 905, state: "merged", title: "CAS-916 Circuit breaker around provider client" } },
      history: [{ by: "dev", field: "Status", from: "In Review", to: "Done", at: ago(2 * DAY) }] },

    // Next sprint
    { key: "CAS-931", type: "story", summary: "Onboarding step 4: connect workspace integrations", assignee: "hana", reporter: "lena", priority: "medium", points: 5, labels: ["onboarding", "frontend"], sprint: "s43", epic: "CAS-882", watchers: ["naman"], created: ago(6 * DAY), updated: ago(2 * DAY),
      description: P("Let new admins connect chat and calendar integrations during onboarding, with a skip option.") },
    { key: "CAS-935", type: "bug", summary: "Duplicate receipt emails after retried charge", assignee: "dev", reporter: "sofia", priority: "high", points: 3, labels: ["checkout"], sprint: "s43", epic: "CAS-881", watchers: ["naman"], created: ago(4 * DAY), updated: ago(1 * DAY),
      description: P("When a charge succeeds on retry, the receipt job runs twice and customers get two emails.") },
    { key: "CAS-936", type: "story", summary: "Assessment space archive and restore", assignee: "marcus", reporter: "naman", priority: "medium", points: 5, labels: ["backend", "api"], sprint: "s43", epic: "CAS-880", watchers: ["naman"], created: ago(5 * DAY), updated: ago(3 * DAY) },
    { key: "CAS-932", type: "task", summary: "Trace sampling config per service", assignee: "sofia", reporter: "sofia", priority: "low", points: 3, labels: ["observability"], sprint: "s43", epic: "CAS-883", watchers: ["naman"], created: ago(7 * DAY), updated: ago(4 * DAY) },
    { key: "CAS-937", type: "task", summary: "Deploy dashboard: error budget burn panel", assignee: "sofia", reporter: "naman", priority: "medium", points: 2, labels: ["observability"], sprint: "s43", epic: "CAS-883", watchers: ["naman"], created: ago(3 * DAY), updated: ago(3 * DAY) },

    // Backlog
    { key: "CAS-938", type: "story", summary: "Bulk move assessments between spaces", reporter: "hana", priority: "low", points: 8, epic: "CAS-880", watchers: ["naman"], created: ago(8 * DAY), updated: ago(8 * DAY) },
    { key: "CAS-942", type: "task", summary: "Runbook for connection pool saturation", assignee: "dev", reporter: "naman", priority: "medium", points: 2, labels: ["incident"], epic: "CAS-881", watchers: ["naman"], created: ago(2 * DAY), updated: ago(2 * DAY) },
    { key: "CAS-939", type: "task", summary: "Remove legacy onboarding v3 feature flags", assignee: "naman", reporter: "lena", priority: "lowest", points: 1, labels: ["tech-debt", "onboarding"], epic: "CAS-882", watchers: ["naman"], created: ago(9 * DAY), updated: ago(1 * DAY) },
    { key: "CAS-941", type: "story", summary: "Onboarding checklist in the help menu", assignee: "lena", reporter: "hana", priority: "low", points: 3, labels: ["onboarding", "design"], epic: "CAS-882", watchers: ["naman"], created: ago(6 * DAY), updated: ago(6 * DAY) },
    { key: "CAS-943", type: "task", summary: "Synthetic checks for checkout API", assignee: "sofia", reporter: "dev", priority: "medium", labels: ["observability", "checkout"], epic: "CAS-883", watchers: ["naman"], created: ago(5 * DAY), updated: ago(5 * DAY) },
    { key: "CAS-940", type: "bug", summary: "Timezone offset wrong in sprint report export", reporter: "marcus", priority: "low", points: 2, watchers: ["naman"], created: ago(12 * DAY), updated: ago(12 * DAY) },

    // Done in the previous sprint: only in the Issues list
    { key: "CAS-905", type: "story", summary: "Assessment spaces data model and migration", status: "done", assignee: "marcus", reporter: "naman", priority: "high", points: 5, epic: "CAS-880", sprint: "s41", archived: true, watchers: ["naman"], created: ago(25 * DAY), updated: ago(12 * DAY) },
    { key: "CAS-908", type: "task", summary: "Provider latency histogram in payment client", status: "done", assignee: "sofia", reporter: "naman", priority: "medium", points: 2, epic: "CAS-881", sprint: "s41", archived: true, watchers: ["naman"], created: ago(22 * DAY), updated: ago(11 * DAY) },
  ],
  notifications: [
    { from: "sofia", verb: "mentioned you on", key: "CAS-930", quote: "@Naman Shukla do we want p99 or p95 on the main panel? p99 is noisy for low-traffic services.", at: ago(15 * MIN) },
    { from: "dev", verb: "mentioned you on", key: "CAS-915", quote: "Backoff with jitter is in PR #918. Load test at 200 rps with 30% 503s now peaks at 31 connections.", at: ago(40 * MIN) },
    { from: "hana", verb: "changed the status of", key: "CAS-921", change: ["inprogress", "review"], at: ago(3 * HR), tab: "watching" },
    { from: "lena", verb: "assigned you", key: "CAS-939", at: ago(1 * DAY + 2 * HR), read: true },
    { from: "marcus", verb: "commented on", key: "CAS-912", quote: "Good call. Added a --batch-size flag and a 200ms sleep between batches.", at: ago(1 * DAY + 5 * HR), read: true, tab: "watching" },
    { from: "dev", verb: "changed the status of", key: "CAS-916", change: ["review", "done"], at: ago(2 * DAY), read: true, tab: "watching" },
  ],
};

// What the mockup says for the buttons it only pretends to have.
const NOTICES: Record<string, string | [string, string]> = {
  "Add people": "Invite people to Casuro Platform from Project settings > People.",
  Insights: "Sprint insights: 22 of 47 points done, on track to finish 2 days late at the current pace.",
  "Manage custom filters": "Custom filters: Only my issues, Recently updated.",
  "Configure board": "Board columns map to statuses To Do, In Progress, In Review, Done.",
  "Backlog settings": "Backlog settings: estimation uses story points, sub-tasks are hidden from the backlog.",
  Export: "Exported the issues to CSV (current fields).",
  Attach: "Attachments are disabled in this mockup.",
  Mention: "Type @ in comments to mention a teammate.",
  Image: "Attachments are disabled in this mockup.",
  Table: "Tables are disabled in this mockup.",
  Actions: "Automation: 3 rules run on this issue (auto-assign reviewer, sync PR status, notify on flag).",
  Configure: "Field configuration opens in project settings.",
  "View workflow": "Workflow: To Do, In Progress, In Review, Done. Any status can move to any other.",
  "View all projects": "3 projects on casuro.atlassian.net",
  "Create project": "Project creation is limited to Jira admins at Casuro.",
  "Create dashboard": "New dashboard created: Untitled dashboard",
  "Casuro Platform team": "Casuro Platform team: 6 members",
  "Search people and teams": "People directory is available at casuro.atlassian.net/people",
  Slack: "Slack notifications go to #casuro-platform",
  "Explore more apps": "The app marketplace is disabled in this mockup.",
  "Manage your apps": "2 apps installed on casuro.atlassian.net",
  Administration: "Atlassian Administration: 6 users, 2 products on Casuro.",
  "Browse help articles": "Help center: support.atlassian.com/jira-software-cloud",
  "What's new": "New: list view inline editing and timeline dependencies.",
  "Give feedback about Jira": "Thanks! Feedback goes to the Jira team.",
  "Personal Jira settings": "Time zone: America/Los_Angeles. Language: English (US).",
  "Atlassian account settings": "Account settings open id.atlassian.com for naman@casuro.com.",
  Profile: "Naman Shukla, Engineering Manager at Casuro",
  "Personal settings": "Personal settings saved.",
  "Switch account": "Only naman@casuro.com is signed in.",
  "Log out": ["Log out is disabled in this mockup", "You're still signed in as naman@casuro.com."],
  "Notification settings": "Notification settings: email for mentions and assignments, in-app for everything.",
  "Add shortcut": ["Shortcut added", "Casuro Engineering handbook was added to the sidebar."],
  "Project settings": ["Project settings", "Only project admins can change settings for Casuro Platform."],
  "Learn more": "Team-managed projects are configured by project admins, not Jira admins.",
  "Import issues": "Import issues from CSV from the Jira settings menu.",
  "Learn about issue types": "Stories are user-facing work, tasks are internal work, bugs are defects and epics group large bodies of work.",
};

const REPLIES = ["On it, I'll take a look this afternoon.", "Makes sense. I'll update the ticket once it's done.", "Good catch, thanks for flagging.", "Let's sync after standup on this."];

export function JiraPreview() {
  const ref = useRef<JiraProject | null>(null);
  const jira = useJira(JIRA_DEMO, {
    onEvent(event: JiraEvent) {
      const j = ref.current!;
      if (event.type === "action") {
        const is = event.key ? j.state.issues[event.key] : null;
        const d = is?.dev;
        if (event.kind === "dev" && d) {
          if (event.label === "branch") return j.toast("Branch", `${d.branch} in casuro/platform-api`);
          if (event.label === "commits") return j.toast(`${d.commits} commits`, `Latest on ${d.branch}`);
          if (d.pr) return j.toast(`PR #${d.pr.num}: ${d.pr.title}`, `${d.pr.state === "open" ? "Open, waiting on 1 review" : "Merged"} in casuro/platform-api.`);
        }
        if (event.kind === "settings") return j.toast(`${event.label} settings need Jira admin permission.`);
        const n = NOTICES[event.label] ?? (event.kind === "app" ? `${event.label} is not part of this mockup.` : null);
        if (Array.isArray(n)) j.toast(n[0], n[1]);
        else if (n) j.toast(n);
      }
      // Someone you @mention answers a little later.
      if (event.type === "comment" && event.action === "add") {
        const who = Object.entries(JIRA_DEMO.people).find(([id, p]) => id !== JIRA_DEMO.me && event.text.includes(`@${p.name}`))?.[0];
        if (who) setTimeout(() => j.comment(event.key, who, `@Naman Shukla ${REPLIES[Math.floor(Math.random() * REPLIES.length)]}`), 2500);
      }
    },
  });
  ref.current = jira;
  return <Jira jira={jira} />;
}
