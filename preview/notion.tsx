import { useEffect, useRef } from "react";
import { Notion, useNotion, type NotionBlockInput, type NotionPageSeed, type NotionSeed, type NotionWorkspace } from "../apps/notion";
import { FACES } from "./faces";

// apps/notion.html's workspace, driving the React version: the same
// people, teamspaces, pages, blocks and roadmap database. Like the mockup,
// what the kit only draws answers with "... is not available in this
// mockup". The workspace is on `window.notion` to try the world calls from
// the console: notion.setPresence(["hana"]), notion.appendBlocks(...).

/** An ISO date `n` days from today. */
function D(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const ago = (min: number) => Date.now() - min * 60_000;

const text = (t: string, children?: NotionBlockInput[]): NotionBlockInput => ({ type: "text", text: t, children });
const h1 = (t: string): NotionBlockInput => ({ type: "h1", text: t });
const h2 = (t: string): NotionBlockInput => ({ type: "h2", text: t });
const h3 = (t: string): NotionBlockInput => ({ type: "h3", text: t });
const bullet = (t: string, children?: NotionBlockInput[]): NotionBlockInput => ({ type: "bullet", text: t, children });
const num = (t: string): NotionBlockInput => ({ type: "number", text: t });
const todo = (t: string, checked = false): NotionBlockInput => ({ type: "todo", text: t, checked });
const toggle = (t: string, open: boolean, children: NotionBlockInput[]): NotionBlockInput => ({ type: "toggle", text: t, open, children });

const ROWS: [string, string, string[], number, string, string[]][] = [
  ["Migrate billing service to Postgres 16", "In progress", ["marcus"], 6, "High", ["Backend", "Infra"]],
  ["Onboarding v4 signup flow", "In review", ["lena", "hana"], 12, "High", ["Frontend", "Design"]],
  ["SAML SSO for Business plan", "Not started", ["dev"], 24, "High", ["Security", "Backend"]],
  ["Offline mode for mobile editor", "Not started", ["sofia"], 41, "Medium", ["Mobile"]],
  ["Rate limiter for public API", "In progress", ["dev"], 3, "Medium", ["Backend"]],
  ["Design tokens v2", "Done", ["hana"], -9, "Medium", ["Design", "Frontend"]],
  ["On-call rotation tooling", "Done", ["marcus"], -15, "Low", ["Infra"]],
  ["Search indexing latency under 200ms", "In progress", ["naman"], 9, "High", ["Data", "Backend"]],
  ["Audit log export", "Blocked", ["sofia"], -1, "Medium", ["Security"]],
  ["Dark mode for the web app", "In review", ["hana"], 4, "Low", ["Frontend", "Design"]],
  ["Kubernetes cost dashboard", "Not started", ["naman"], 33, "Low", ["Infra", "Data"]],
  ["Webhook retry queue", "Not started", ["dev"], 17, "Medium", ["Backend"]],
];

const pages: NotionPageSeed[] = [
  {
    id: "wiki", title: "Engineering Wiki", icon: "📘", cover: "blueprint", coverY: 40, parent: "eng", by: "marcus", edited: ago(55), presence: ["marcus"],
    share: [{ person: "naman", access: "Full access" }, { person: "marcus", access: "Full access" }],
    blocks: [
      { type: "callout", icon: "👋", background: "blue", text: "Welcome to the Casuro engineering wiki. Start with the guides below, and ask in **#eng-help** if anything looks out of date." },
      h2("Guides"),
      bullet("Local setup: clone the monorepo, then run `make dev`"),
      bullet("Code review: two approvals for anything that touches billing or auth"),
      bullet("Releases ship every weekday at 11:00 from `main`"),
      h2("Architecture"),
      { type: "image", caption: "Request path: edge, API gateway, services and workers", sketch: { boxes: [["Edge", "CDN + WAF"], ["api-gateway", "Go"], ["Services", "billing, search"], ["Web app", "TypeScript"], ["Workers", "queues, cron"], ["Postgres 16", "primary + replicas"]] } },
      h2("Services"),
      { type: "table", header: true, rows: [["Service", "Owner", "Runtime"], ["api-gateway", "@marcus", "Go 1.23"], ["billing", "@sofia", "Go + Postgres 16"], ["search-indexer", "@naman", "Rust"], ["web", "@hana", "TypeScript"]] },
      h2("Current work"),
      { type: "database", database: "roadmap" },
      h2("On-call"),
      text("Primary on-call rotates every Monday. This week: @marcus, secondary: @dev."),
      toggle("SEV1: customer-facing outage", false, [num("Page the secondary and open an incident channel"), num("Post a status update within 15 minutes"), num("Write the postmortem within 3 business days")]),
      toggle("SEV2: degraded performance", false, [text("Acknowledge within 30 minutes and fix during business hours.")]),
      { type: "bookmark", title: "Casuro status", description: "Live uptime and incident history for the Casuro API, web app and background workers.", url: "https://status.casuro.com", icon: "C" },
    ],
  },
  {
    id: "roadmap", title: "Engineering Roadmap", icon: "🗺️", parent: "eng", full: true, by: "sofia", edited: ago(12), presence: ["dev", "sofia"],
    share: [{ person: "naman", access: "Full access" }, { person: "sofia", access: "Full access" }],
    database: {
      properties: [
        { id: "name", name: "Name", type: "title", width: 300 },
        { id: "status", name: "Status", type: "status", width: 150, options: [{ name: "Not started", color: "default" }, { name: "In progress", color: "blue" }, { name: "In review", color: "purple" }, { name: "Done", color: "green", done: true }, { name: "Blocked", color: "red" }] },
        { id: "owner", name: "Assignee", type: "person", width: 180 },
        { id: "due", name: "Due", type: "date", width: 140 },
        { id: "prio", name: "Priority", type: "select", width: 120, options: [{ name: "High", color: "red" }, { name: "Medium", color: "yellow" }, { name: "Low", color: "green" }] },
        { id: "tags", name: "Tags", type: "multi", width: 230, options: [{ name: "Backend", color: "blue" }, { name: "Frontend", color: "purple" }, { name: "Infra", color: "brown" }, { name: "Design", color: "pink" }, { name: "Security", color: "red" }, { name: "Mobile", color: "orange" }, { name: "Data", color: "green" }] },
      ],
    },
  },
  ...ROWS.map(([title, status, owner, due, prio, tags], i): NotionPageSeed => ({
    id: `r${i + 1}`, title, parent: "roadmap", by: owner[0], edited: ago(30 + i * 97), properties: { status, owner, due: D(due), prio, tags },
  })),
  {
    id: "spec", title: "Onboarding v4 - Design Spec", icon: "📐", cover: "nebula", coverY: 45, parent: "design", by: "lena", edited: ago(5), presence: ["lena", "hana"],
    share: [{ person: "naman", access: "Full access" }, { person: "lena", access: "Full access" }, { person: "hana", access: "Can edit" }, { person: "marcus", access: "Can comment" }],
    blocks: [
      { type: "callout", icon: "📌", background: "yellow", text: `**Status:** In review. Owner @lena, reviewers @hana and @naman. Target handoff @${D(12)}.` },
      { type: "toc" },
      h1("Overview"),
      text("Onboarding v4 replaces the five-step signup wizard with a single adaptive flow. New workspaces reach their first shared page in [under two minutes](comment:th1), and teammates invited mid-flow land directly on the page they were invited to."),
      h2("Goals"),
      bullet("Cut time to first page from 6m 40s to **under 2 minutes**"),
      bullet("Raise day-7 activation for invited teammates from 38% to 50%"),
      bullet("Ship one flow for web, desktop and mobile", [bullet("Mobile uses the same steps with a [bottom-sheet layout](comment:th2)")]),
      h2("The new flow"),
      { type: "image", sketch: "phones", caption: "Signup, workspace setup and starter page (hi-fi frames, v3)" },
      num("Email or SSO sign-in (SSO is detected from the email domain)"),
      num("Workspace setup: name, icon and a *use case* picker"),
      num("Invite teammates, with suggestions from the same email domain"),
      num("Land on a starter page prefilled from the chosen use case"),
      { type: "callout", icon: "💡", text: "Keep every step skippable. Skipped steps come back as a checklist on the starter page instead of blocking the flow." },
      h2("Open questions"),
      toggle("Should we keep the use case picker on mobile?", true, [text("Leaning yes. The picker drives the starter template, and the bottom-sheet version tested well in the last round (7 of 8 participants completed it).")]),
      toggle("What happens to pending invites if setup is abandoned?", false, [text("Invites stay pending for 14 days. After that the workspace owner gets a reminder with a one-click resend.")]),
      toggle("Do we need a separate flow for Business plan SSO?", false, [text("@dev is checking whether SAML discovery can run before the email step.")]),
      h2("Launch checklist"),
      todo("Final frames for every breakpoint", true),
      todo("Copy review with @sofia", true),
      todo("Accessibility pass: focus order, contrast, screen reader labels"),
      todo("Engineering handoff with @marcus"),
      todo("Experiment setup: 50/50 split for new workspaces"),
      { type: "quote", text: "The best onboarding is the one people don't notice. They just end up working." },
      h2("Success metrics"),
      { type: "table", header: true, rows: [["Metric", "Baseline", "Target"], ["Time to first page", "6m 40s", "Under 2m"], ["Invite acceptance (7 days)", "41%", "55%"], ["Day-7 activation", "38%", "50%"]] },
      { type: "divider" },
      text(`[Last reviewed in design critique on @${D(-2)}. Engineering work is tracked in ](color:gray)[[roadmap]]`),
    ],
  },
  {
    id: "notes", title: "Naman's notes", icon: "🗒️", parent: "private", edited: ago(180), access: "Only you",
    blocks: [
      h2("This week"),
      todo("Review [[spec]]", true),
      todo("Sign off on the Postgres 16 migration plan with @marcus"),
      todo(`Prep Q4 planning numbers for @${D(2)}`),
      todo("1:1 with @dev about the rate limiter rollout"),
      h2("Ideas"),
      bullet("Weekly demo slot for the platform team"),
      bullet("Move search indexer alerts to the shared dashboard", [bullet("Ask @sofia whether billing wants the same")]),
      h3("Scratch"),
      text(""),
    ],
  },
];

export const NOTION_DEMO: NotionSeed = {
  workspace: { name: "Casuro", plan: "Business Plan · 6 members", domain: "casuro.com", url: "https://www.notion.so/casuro" },
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", photo: FACES.naman },
    hana: { name: "Hana Kim", email: "hana@casuro.com", photo: FACES.hana },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", photo: FACES.sofia },
    dev: { name: "Dev Patel", email: "dev@casuro.com", photo: FACES.dev },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", photo: FACES.lena },
  },
  teamspaces: [
    { id: "eng", name: "Engineering", icon: "🛠️", color: "blue" },
    { id: "design", name: "Design", icon: "🎨", color: "pink" },
  ],
  pages,
  favorites: ["spec", "roadmap"],
  open: "spec",
  inbox: 3,
};

// The mockup's answers for what it only draws.
const NOT_HERE: Record<string, string> = {
  "Open link": "Opening external links is not available in this mockup",
  "Open row": "Opening database pages is not available in this mockup",
  "Get the desktop app": "Desktop downloads are not available in this mockup",
  "Log out": "Logged out (mockup)",
  Publish: "Not available in this mockup",
  "Change access": "Not available in this mockup",
  "Change general access": "Not available in this mockup",
  "Learn about sharing": "Not available in this mockup",
};

export function NotionPreview() {
  const ref = useRef<NotionWorkspace | null>(null);
  const notion = useNotion(NOTION_DEMO, {
    onEvent(event) {
      const n = ref.current!;
      if (event.type === "action") n.toast(NOT_HERE[event.name] ?? `${event.name} is not available in this mockup`);
      // A highlight with comments shows the latest one; the mockup's own highlights have none.
      if (event.type === "comment" && !n.state.comments[event.thread]?.length) n.toast("Comment threads are not available in this mockup");
    },
  });
  ref.current = notion;
  useEffect(() => {
    (window as unknown as { notion: NotionWorkspace }).notion = notion;
  });
  return <Notion notion={notion} />;
}
