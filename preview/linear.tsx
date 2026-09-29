import { useRef } from "react";
import { Linear, useLinear, type LinearIssueInput, type LinearSeed, type LinearWorkspace, type Priority } from "../apps/linear";
import { FACES } from "./faces";

// apps/linear.html's workspace driving the React version: the same people,
// teams, projects and issues, plus a little demo behaviour: a teammate
// answers your comments, and New issue files one for you.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Midnight `days` from today, so "Sep 18" stays ten days back whatever today is. */
function day(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() + days * DAY;
}
const ago = (ms: number) => Date.now() - ms;

const PROJECT_NAMES = { spaces: "Assessment Spaces", checkout: "Checkout Reliability", obs: "Latency Observability", onb: "Onboarding v4" };

// id, status, priority, title, assignee, labels, project, due (days from today), created (days from today)
type Row = [string, string, Priority, string, string, string[], keyof typeof PROJECT_NAMES, number | null, number];
const ROWS: Row[] = [
  ["PLA-912", "progress", 1, "Backfill assessment_spaces for legacy workspaces", "naman", ["Data", "Migration"], "spaces", 4, -10],
  ["PLA-915", "progress", 1, "Checkout retry storm when payment provider returns 503", "marcus", ["Bug"], "checkout", 2, -4],
  ["PLA-908", "progress", 2, "p99 latency dashboard for API gateway", "dev", ["Observability"], "obs", 8, -13],
  ["PLA-921", "progress", 2, "Onboarding v4: permissions step UI", "hana", ["Feature", "Design"], "onb", 11, -7],
  ["PLA-924", "todo", 2, "Add jittered exponential backoff to checkout client", "marcus", ["Improvement"], "checkout", 5, -3],
  ["PLA-918", "todo", 3, "Validate assessment_spaces row counts after backfill", "sofia", ["Data"], "spaces", 9, -9],
  ["PLA-926", "todo", 3, "Onboarding v4: role presets for the permissions step", "lena", ["Feature"], "onb", 16, -3],
  ["PLA-927", "todo", 3, "Alert when gateway p99 stays above 800ms for 5 minutes", "dev", ["Observability"], "obs", null, -2],
  ["PLA-929", "todo", 4, "Runbook: mitigating a checkout retry storm", "naman", ["Docs"], "checkout", null, -2],
  ["PLA-936", "backlog", 3, "Idempotency keys for the checkout webhook handler", "", ["Improvement"], "checkout", null, -6],
  ["PLA-938", "backlog", 4, "Flaky test: assessment_spaces migration spec times out on CI", "sofia", ["Bug"], "spaces", null, -1],
  ["PLA-931", "backlog", 4, "Drop deprecated spaces_v1 table after backfill", "", ["Migration"], "spaces", null, -8],
  ["PLA-935", "backlog", 4, "Onboarding v4: copy review for permissions step", "hana", ["Design", "Docs"], "onb", null, -5],
  ["PLA-933", "backlog", 0, "Per-tenant latency breakdown on the gateway dashboard", "", ["Observability"], "obs", null, -4],
  ["PLA-897", "done", 2, "Circuit breaker for payment provider client", "marcus", ["Improvement"], "checkout", null, -20],
  ["PLA-899", "done", 3, "Schema and indexes for assessment_spaces table", "naman", ["Data"], "spaces", null, -19],
  ["PLA-902", "done", 3, "Instrument gateway with OpenTelemetry histograms", "dev", ["Observability"], "obs", null, -17],
  ["PLA-905", "done", 3, "Onboarding v4 permissions step: wireframes", "hana", ["Design"], "onb", null, -18],
];

const ev = (from: string, text: string, at: number) => ({ kind: "event" as const, from, text, at });
const cm = (from: string, text: string, at: number) => ({ kind: "comment" as const, from, text, at });

const DETAILS: Record<string, Pick<LinearIssueInput, "description" | "subIssues" | "activity">> = {
  "PLA-912": {
    description: `Legacy workspaces created before the spaces migration still read assessments from \`spaces_v1\`. We need to backfill \`assessment_spaces\` for every workspace so the new read path can go live behind the flag.

- Batch by workspace id, 500 workspaces per job
- Idempotent upserts keyed on \`(workspace_id, assessment_id)\`
- Throttle to keep replica lag under 2s

Dry run on staging finished in 41 minutes with zero conflicts.`,
    subIssues: ["PLA-918", "PLA-931", "PLA-938"],
    activity: [
      ev("naman", "created the issue", day(-10)),
      ev("naman", "moved from Todo to In Progress", day(-6)),
      cm("sofia", "Staging counts match to the row. I will script the prod validation queries so we can run them right after each batch.", ago(2 * DAY)),
      cm("naman", "Great. Kicking off batch 1 of 14 tonight during the low-traffic window.", ago(5 * HOUR)),
    ],
  },
  "PLA-915": {
    description: `When the payment provider returns \`503\`, every checkout client retries immediately with no backoff. On Sep 24 this turned a 90 second provider blip into a 12 minute incident with 40x normal request volume.

Short-term: cap retries at 3. Long-term: jittered backoff and a shared retry budget per region.`,
    subIssues: ["PLA-924", "PLA-929", "PLA-936"],
    activity: [
      ev("marcus", "created the issue", day(-4)),
      ev("naman", "set priority to Urgent", day(-4)),
      cm("dev", "Attached the gateway graphs. The spike lines up exactly with provider 503s, p99 went from 310ms to 4.8s.", day(-3)),
      cm("marcus", "Retry cap is behind a flag in review now. Backoff work is tracked in PLA-924.", ago(DAY)),
    ],
  },
  "PLA-908": {
    description: "Build a gateway dashboard with p50, p95 and p99 latency per route, backed by the new OpenTelemetry histograms. Should load in under 2s and support a 30 day range.",
    subIssues: ["PLA-927", "PLA-933", "PLA-902"],
    activity: [
      ev("dev", "created the issue", day(-13)),
      cm("lena", "Can we add a deploy marker overlay? Would make regressions obvious at a glance.", ago(3 * DAY)),
      cm("dev", "Yes, adding deploy annotations from the CI webhook.", ago(2 * DAY)),
    ],
  },
  "PLA-921": {
    description: "Implement the permissions step for onboarding v4. Admins choose what new members can see and do before inviting them. Follows the approved wireframes from PLA-905.",
    subIssues: ["PLA-926", "PLA-935", "PLA-905"],
    activity: [
      ev("hana", "created the issue", day(-7)),
      cm("naman", "Let us keep the default preset as Member so the step can be skipped in one click.", ago(2 * DAY)),
      cm("hana", "Agreed. Updated the Figma frames with the skip affordance.", ago(20 * HOUR)),
    ],
  },
};

export const LINEAR_DEMO: LinearSeed = {
  workspace: { name: "Casuro" },
  me: "naman",
  inbox: 4,
  people: {
    naman: { name: "Naman Shukla", photo: FACES.naman },
    hana: { name: "Hana Kim", photo: FACES.hana },
    marcus: { name: "Marcus Chen", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", photo: FACES.sofia },
    dev: { name: "Dev Patel", photo: FACES.dev },
    lena: { name: "Lena Okafor", photo: FACES.lena },
  },
  teams: [
    { id: "platform", name: "Platform", color: "#5e6ad2", key: "PLA" },
    { id: "design", name: "Design", color: "#f06ba8", key: "DES" },
  ],
  statuses: [
    { id: "progress", name: "In Progress", type: "started" },
    { id: "todo", name: "Todo", type: "unstarted" },
    { id: "backlog", name: "Backlog", type: "backlog" },
    { id: "done", name: "Done", type: "completed" },
  ],
  labels: {
    Bug: "#eb5757", Feature: "#bb87fc", Improvement: "#4ea7fc", Data: "#4cb782",
    Migration: "#f2994a", Observability: "#26b5ce", Design: "#f06ba8", Docs: "#95a2b3",
  },
  projects: {
    spaces: { name: PROJECT_NAMES.spaces, color: "#4cb782" },
    checkout: { name: PROJECT_NAMES.checkout, color: "#eb5757" },
    obs: { name: PROJECT_NAMES.obs, color: "#26b5ce" },
    onb: { name: PROJECT_NAMES.onb, color: "#bb87fc" },
  },
  cycles: { c42: { name: "Cycle 42", dates: "Sep 22 - Oct 5" } },
  issues: ROWS.map(([id, status, priority, title, assignee, labels, project, due, created]) => ({
    id, status, priority, title, labels, project, cycle: "c42",
    team: "platform",
    assignee: assignee || null,
    due: due == null ? null : day(due),
    created: day(created),
    description: `${title}. Part of the ${PROJECT_NAMES[project]} project for this cycle.`,
    ...DETAILS[id],
  })),
};

const REPLIES = ["Thanks, taking a look now.", "Makes sense to me 👍", "Good catch. I'll update the PR.", "Can we sync on this after standup?", "On it."];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function LinearPreview() {
  const ref = useRef<LinearWorkspace | null>(null);
  const linear = useLinear(LINEAR_DEMO, {
    onEvent(event) {
      const l = ref.current!;
      if (event.type === "comment") {
        // Whoever else is on the issue answers.
        const issue = l.issue(event.id);
        const others = [issue?.assignee, ...(issue?.activity.map((a) => a.from) ?? [])].filter((p): p is string => !!p && p !== l.me);
        const from = others[0] ?? pick(Object.keys(l.people).filter((p) => p !== l.me));
        setTimeout(() => {
          const now = ref.current!;
          now.comment(event.id, from, pick(REPLIES));
          if (now.state.open !== event.id) now.notify(`${now.people[from].name} replied on ${event.id}`);
        }, 2200);
      }
      if (event.type === "create") {
        const id = l.createIssue({ title: "New issue", team: event.team, status: event.status, assignee: l.me, creator: l.me, cycle: "c42" });
        l.open(id);
        l.toast(`Created ${id}`);
      }
      if (event.type === "status" && event.to === "done") l.toast(`${event.id} moved to Done`);
    },
  });
  ref.current = linear;
  return <Linear linear={linear} />;
}
