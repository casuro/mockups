import { useRef } from "react";
import { Confluence, useConfluence, type ConfluenceBlock, type ConfluencePageSeed, type ConfluenceReaction, type ConfluenceSeed, type ConfluenceSpace } from "../apps/confluence";
import { FACES } from "./faces";

// apps/confluence.html's space, driving the React version: the same
// people, page tree and pages, and the page's author answering a comment.

const REACTIONS = (): ConfluenceReaction[] => [
  { emoji: "👍", count: 4 },
  { emoji: "🎉", count: 2 },
];

// A page nobody has written yet, as the mockup draws one.
const stub = (id: string, title: string, children?: ConfluencePageSeed[]): ConfluencePageSeed => ({
  id,
  title,
  author: "marcus",
  updated: "Aug 30, 2026",
  readTime: "1 min read",
  reactions: REACTIONS(),
  blocks: [{ type: "paragraph", text: "This page has not been written yet. @marcus is drafting it this sprint." }],
  children,
});

const PG: ConfluenceBlock[] = [
  { type: "panel", tone: "info", text: "These guidelines apply to every schema change on *orders-db* and *billing-db*. Owner: @dev. Status: {status:Approved|green}" },
  { type: "heading", text: "Why this exists" },
  { type: "paragraph", text: "Last quarter two migrations held an `ACCESS EXCLUSIVE` lock on `orders` for more than 40 seconds and paged on-call. This page captures how we ship schema changes safely without downtime." },
  { type: "paragraph", text: "Current rollout is tracked in {jira:CAS-912}" },
  { type: "heading", text: "Rules" },
  {
    type: "list",
    ordered: true,
    items: [
      "Every migration sets `lock_timeout` to 2s and is safe to retry.",
      "Create indexes with `CONCURRENTLY`, always in their own migration.",
      "Add columns as nullable first, backfill in batches, then add constraints with `NOT VALID`.",
      "Never rename or drop a column in the same deploy that stops reading it.",
    ],
  },
  { type: "panel", tone: "warning", text: "Do not run migrations between 09:00 and 11:00 UTC. That window overlaps the Acme Logistics batch import and peak checkout traffic." },
  { type: "heading", text: "Operation reference" },
  {
    type: "table",
    head: ["Operation", "Lock", "Safe online?", "Notes"],
    rows: [
      ["Add nullable column", "ACCESS EXCLUSIVE (brief)", "{status:Yes|green}", "No table rewrite on PG 11+"],
      ["Add column with volatile default", "ACCESS EXCLUSIVE", "{status:No}", "Rewrites the table"],
      ["Create index", "SHARE", "{status:Use concurrently|yellow}", "Blocks writes without CONCURRENTLY"],
      ["Add foreign key", "SHARE ROW EXCLUSIVE", "{status:Two steps|yellow}", "NOT VALID, then VALIDATE"],
      ["Drop column", "ACCESS EXCLUSIVE (brief)", "{status:Yes|green}", "Only after code stops reading it"],
    ],
  },
  { type: "heading", text: "Example migration" },
  {
    type: "code",
    language: "sql",
    code: `-- 2026_09_24_add_region_code.sql
SET lock_timeout = '2s';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS region_code text;
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_region_code_idx
  ON orders (region_code);
ALTER TABLE orders ADD CONSTRAINT orders_region_code_len
  CHECK (char_length(region_code) <= 8) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_region_code_len;`,
  },
  { type: "panel", tone: "note", text: "Dry runs use the nightly staging snapshot. Ask @lena for access if you cannot see the *db-snapshots* job." },
  { type: "heading", text: "Rollout checklist" },
  {
    type: "tasks",
    items: [
      { text: "Add lock_timeout to every migration file", done: true },
      { text: "Backfill script for orders.region_code", done: true },
      { text: "Dry-run on staging snapshot" },
      { text: "Update on-call runbook with rollback steps" },
    ],
  },
  { type: "panel", tone: "success", text: "Reviewed by @hana and @naman on Sep 23, 2026." },
];

export const CONFLUENCE_DEMO: ConfluenceSeed = {
  space: { name: "Engineering", site: "Casuro" },
  me: "naman",
  notifications: 3,
  people: {
    naman: { name: "Naman Shukla", photo: FACES.naman },
    hana: { name: "Hana Kim", photo: FACES.hana },
    marcus: { name: "Marcus Chen", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", photo: FACES.sofia },
    dev: { name: "Dev Patel", photo: FACES.dev },
    lena: { name: "Lena Okafor", photo: FACES.lena },
  },
  issues: {
    "CAS-912": { summary: "Zero-downtime migration tooling", status: "In Review", color: "blue" },
    "CAS-874": { summary: "Onboarding v4 funnel", status: "Done", color: "green" },
  },
  open: "pg",
  expanded: ["runbooks", "overview-arch", "arch-adr"],
  pages: [
    stub("overview-arch", "Architecture", [
      stub("arch-services", "Service map"),
      stub("arch-adr", "Decision records", [
        {
          id: "onboarding",
          title: "Onboarding v4 decisions",
          author: "sofia",
          updated: "Sep 10, 2026",
          readTime: "3 min read",
          likes: ["naman", "hana"],
          reactions: REACTIONS(),
          comments: [{ from: "naman", at: "Sep 11, 2026", text: "Agree on dropping the product tour. Let's revisit after two weeks of data." }],
          blocks: [
            { type: "panel", tone: "info", text: "Status: {status:Decided|green} Driver: @sofia Approver: @naman" },
            { type: "heading", text: "Context" },
            { type: "paragraph", text: "Activation on the v3 flow dropped to 41% after we added workspace setup. v4 moves setup after the first successful sync." },
            { type: "heading", text: "Decisions" },
            { type: "list", items: ["Defer workspace setup until after first sync.", "Replace the product tour with inline hints.", "Track activation in {jira:CAS-874}"] },
            { type: "heading", text: "Follow-ups" },
            { type: "tasks", items: [{ text: "Ship new invite flow behind flag", done: true }, { text: "Remove legacy welcome email" }] },
          ],
        },
      ]),
    ]),
    stub("runbooks", "Runbooks", [
      {
        id: "oncall",
        title: "On-call runbook",
        author: "lena",
        updated: "Sep 18, 2026",
        readTime: "4 min read",
        likes: ["dev"],
        reactions: REACTIONS(),
        comments: [{ from: "hana", at: "Sep 19, 2026", text: "Thanks Lena, the escalation table is much clearer now." }],
        blocks: [
          { type: "panel", tone: "warning", text: "If customer checkout is failing, declare a SEV-1 immediately and page @marcus." },
          { type: "heading", text: "First five minutes" },
          { type: "tasks", items: [{ text: "Acknowledge the page within 5 minutes" }, { text: "Post in #incidents with the alert link" }, { text: "Check the Datadog service dashboard" }] },
          { type: "heading", text: "Escalation" },
          {
            type: "table",
            head: ["Severity", "Response", "Escalate to"],
            rows: [
              ["{status:SEV-1}", "Immediately", "@marcus"],
              ["{status:SEV-2|yellow}", "30 minutes", "@dev"],
              ["{status:SEV-3|blue}", "Next business day", "Team channel"],
            ],
          },
          { type: "paragraph", text: "Database incidents follow the [[pg]] rollback section." },
        ],
      },
      stub("incident", "Incident response"),
    ]),
    {
      id: "pg",
      title: "Postgres migration guidelines",
      author: "dev",
      updated: "Sep 24, 2026",
      readTime: "6 min read",
      likes: ["hana", "marcus", "lena"],
      reactions: REACTIONS(),
      comments: [
        { from: "marcus", at: "Sep 24, 2026", text: "Can we make the 2s lock_timeout a CI lint instead of a convention? Happy to pair on it." },
        { from: "sofia", at: "Sep 25, 2026", text: "+1. Also worth linking the staging snapshot job so people know where to dry-run." },
        { from: "dev", at: "Sep 25, 2026", text: "Added the snapshot link under Dry runs. Lint is tracked in CAS-918." },
      ],
      blocks: PG,
    },
    stub("release", "Release process"),
  ],
};

const REPLIES = ["Good point, I'll fold that in.", "Thanks! Updated the page.", "Agreed. Let's pick this up in Thursday's sync.", "Makes sense to me 👍"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function ConfluencePreview() {
  const ref = useRef<ConfluenceSpace | null>(null);
  const confluence = useConfluence(CONFLUENCE_DEMO, {
    onEvent(event) {
      const c = ref.current!;
      if (event.type === "comment") {
        // The page's author answers, a little later.
        const author = c.state.pages[event.pageId].author;
        const from = author !== c.me ? author : "marcus";
        setTimeout(() => c.addComment(event.pageId, from, `@${c.me} ${pick(REPLIES)}`), 2500);
      }
      if (event.type === "action" && event.kind === "share") c.toast("Page link copied");
      if (event.type === "action" && event.kind === "jira" && event.id) c.toast(`Opening ${event.id} in Jira...`);
    },
  });
  ref.current = confluence;
  return <Confluence confluence={confluence} />;
}
