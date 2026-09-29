import { useEffect, useRef, useState } from "react";
import { ClaudeCode, useClaudeCode, type ClaudeCodeApp, type ClaudeCodeSeed, type Hunk, type ItemInput, type Lang, type SessionState } from "../apps/claude-code";
import * as IC from "../apps/claude-code/icons";
import { FACES } from "./faces";

// apps/claude-code.html's sessions and demo script, driving the React
// version: the same seeded sessions (one done, one waiting on a permission
// prompt, one running, one waiting on a plan, one with a PR), and the same
// scripted runs per repository, played through the kit's world calls
// (append, updateItem, askPermission, proposePlan, setStatus, terminal).

const H = (oldStart: number, newStart: number, lines: string): Hunk => ({ oldStart, newStart, lines });

interface Scenario {
  thought: string;
  intro: string;
  todos: string[];
  grep: { pattern: string; path: string; matches: { f: string; n: number; t: string }[] };
  read: { path: string; start: number; lang: Lang; lines: string[] };
  edit: { path: string; lang: Lang; hunks: Hunk[] };
  testEdit: { path: string; lang: Lang; hunks: Hunk[] };
  testCmd: string;
  follow: { path: string; lang: Lang; hunks: Hunk[] };
  fail: string;
  explain: string;
  fix: { path: string; lang: Lang; hunks: Hunk[] };
  pass: string;
  summary: (prompt: string) => string;
}

// ---------- The mockup's file contents, diffs and command output, verbatim ----------

const MIG_OLD = [
  "-- 0142: backfill space_id on assessment_spaces",
  "BEGIN;",
  "",
  "UPDATE assessment_spaces AS s",
  "SET space_id = a.space_id",
  "FROM assessments AS a",
  "WHERE s.assessment_id = a.id",
  "  AND s.space_id IS NULL;",
  "",
  "COMMIT;",
];
const MIG_HUNK = H(1, 1, `
 -- 0142: backfill space_id on assessment_spaces
-BEGIN;
-
-UPDATE assessment_spaces AS s
-SET space_id = a.space_id
-FROM assessments AS a
-WHERE s.assessment_id = a.id
-  AND s.space_id IS NULL;
-
-COMMIT;
+-- Runs in batches of 5000 so the table is never locked for long, and is safe to re-run.
+CREATE INDEX CONCURRENTLY IF NOT EXISTS assessment_spaces_space_id_null_idx
+  ON assessment_spaces (id) WHERE space_id IS NULL;
+
+CREATE OR REPLACE PROCEDURE backfill_assessment_spaces(batch_size int DEFAULT 5000)
+LANGUAGE plpgsql AS $$
+DECLARE
+  updated int;
+BEGIN
+  LOOP
+    UPDATE assessment_spaces AS s
+    SET space_id = a.space_id
+    FROM assessments AS a
+    WHERE s.assessment_id = a.id
+      AND s.id IN (
+        SELECT id FROM assessment_spaces
+        WHERE space_id IS NULL
+        ORDER BY id
+        LIMIT batch_size
+        FOR UPDATE SKIP LOCKED
+      );
+    GET DIAGNOSTICS updated = ROW_COUNT;
+    EXIT WHEN updated = 0;
+    RAISE NOTICE 'backfilled % rows', updated;
+    COMMIT;
+  END LOOP;
+END $$;
+
+CALL backfill_assessment_spaces(5000);
`);
const JOB_HUNK = H(1, 1, `
 import { db } from "../db";
 import { logger } from "../logger";

-export async function backfillAssessmentSpaces() {
-  await db.query(
-    "UPDATE assessment_spaces AS s SET space_id = a.space_id FROM assessments AS a WHERE s.assessment_id = a.id AND s.space_id IS NULL"
-  );
-  logger.info("assessment_spaces backfill complete");
+const DEFAULT_BATCH_SIZE = 5_000;
+const BATCH_SQL = "UPDATE assessment_spaces AS s SET space_id = a.space_id FROM assessments AS a WHERE s.assessment_id = a.id AND s.id IN (SELECT id FROM assessment_spaces WHERE space_id IS NULL ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED)";
+
+export async function backfillAssessmentSpaces({ batchSize = DEFAULT_BATCH_SIZE } = {}) {
+  let total = 0;
+  for (;;) {
+    const { rowCount } = await db.query(BATCH_SQL, [batchSize]);
+    if (!rowCount) break;
+    total += rowCount;
+    logger.info({ total }, "assessment_spaces backfill progress");
+  }
+  logger.info({ total }, "assessment_spaces backfill complete");
+  return total;
 }
`);
const JOBTEST_HUNK = H(0, 1, `
+import { describe, it, expect, beforeEach } from "vitest";
+import { seedAssessments, db } from "../helpers/db";
+import { backfillAssessmentSpaces } from "../../src/jobs/backfillAssessmentSpaces";
+
+describe("backfillAssessmentSpaces", () => {
+  beforeEach(() => seedAssessments({ count: 12_000, withSpace: false }));
+
+  it("fills every row across multiple batches", async () => {
+    const total = await backfillAssessmentSpaces({ batchSize: 5_000 });
+    expect(total).toBe(12_000);
+    const { rows } = await db.query("SELECT count(*) FROM assessment_spaces WHERE space_id IS NULL");
+    expect(Number(rows[0].count)).toBe(0);
+  });
+
+  it("is resumable after a partial run", async () => {
+    await db.query("UPDATE assessment_spaces SET space_id = 1 WHERE id <= 7000");
+    expect(await backfillAssessmentSpaces({ batchSize: 5_000 })).toBe(5_000);
+  });
+});
`);
const OUT_BACKFILL = `
> @casuro/core@2.14.0 test
> vitest run backfill

 RUN  v2.1.4 /Users/naman/casuro/core

 ✓ test/jobs/backfillAssessmentSpaces.test.ts (2 tests) 1843ms
   ✓ backfillAssessmentSpaces > fills every row across multiple batches 1204ms
   ✓ backfillAssessmentSpaces > is resumable after a partial run 612ms
 ✓ test/migrations/0142.test.ts (1 test) 388ms

 Test Files  2 passed (2)
      Tests  3 passed (3)
   Start at  10:42:17
   Duration  2.61s`;

const RETRY_EDIT = H(18, 18, `
 export function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
-  const { attempts = 3, baseDelayMs = 200 } = opts;
+  const { attempts = 3, baseDelayMs = 200, sleep = defaultSleep, random = Math.random } = opts;
   return (async () => {
     for (let i = 0; i < attempts; i++) {
       try {
         return await fn();
       } catch (err) {
         if (i === attempts - 1 || !isRetryable(err)) throw err;
-        const jitter = Math.random() * baseDelayMs;
-        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i + jitter));
+        const jitter = random() * baseDelayMs;
+        await sleep(baseDelayMs * 2 ** i + jitter);
       }
     }
     throw new Error("unreachable");
`);
const RETRY_TEST_EDIT = H(9, 9, `
 describe("checkout retry", () => {
-  it("retries a 503 from the payment provider", async () => {
+  it("retries a 503 from the payment provider", async () => {
+    const sleep = vi.fn().mockResolvedValue(undefined);
     const charge = vi.fn()
       .mockRejectedValueOnce(providerError(503))
       .mockResolvedValueOnce({ id: "ch_123" });
-    const result = await withRetry(charge);
-    await new Promise((r) => setTimeout(r, 450));
+    const result = await withRetry(charge, { sleep, random: () => 0.5 });
     expect(result.id).toBe("ch_123");
     expect(charge).toHaveBeenCalledTimes(2);
+    expect(sleep).toHaveBeenCalledWith(300);
   });
`);
const RETRY_READ = [
  'import { describe, it, expect, vi } from "vitest";',
  'import { withRetry } from "../../src/billing/retry";',
  'import { providerError } from "../helpers/payments";',
  "",
  "// Flaky on CI: ~1 in 10 runs times out when the jittered delay",
  "// lands close to the 450ms wait below.",
  "",
  "",
  'describe("checkout retry", () => {',
  '  it("retries a 503 from the payment provider", async () => {',
  "    const charge = vi.fn()",
  "      .mockRejectedValueOnce(providerError(503))",
  '      .mockResolvedValueOnce({ id: "ch_123" });',
  "    const result = await withRetry(charge);",
  "    await new Promise((r) => setTimeout(r, 450));",
  '    expect(result.id).toBe("ch_123");',
  "    expect(charge).toHaveBeenCalledTimes(2);",
  "  });",
];
const OUT_REPEAT = `
> @casuro/core@2.14.0 test
> vitest run checkout --repeat 20

 RUN  v2.1.4 /Users/naman/casuro/core

 ✓ test/billing/checkout.retry.test.ts (4 tests | 20 repeats) 214ms
 ✓ test/billing/checkout.test.ts (11 tests | 20 repeats) 1320ms

 Test Files  2 passed (2)
      Tests  300 passed (300)
   Start at  10:15:02
   Duration  1.94s`;

const TOKENS_READ = [
  ":root {",
  "  --color-bg: #faf9f5;",
  "  --color-surface: #ffffff;",
  "  --color-text: #141413;",
  "  --color-muted: #5e5d59;",
  "  --color-border: #e8e6dc;",
  "  --color-accent: #d97757;",
  "}",
];
const TOKENS_HUNK = H(1, 1, `
 :root {
+  color-scheme: light;
   --color-bg: #faf9f5;
   --color-surface: #ffffff;
   --color-text: #141413;
   --color-muted: #5e5d59;
   --color-border: #e8e6dc;
   --color-accent: #d97757;
 }
+
+:root[data-theme="dark"] {
+  color-scheme: dark;
+  --color-bg: #262624;
+  --color-surface: #30302e;
+  --color-text: #faf9f5;
+  --color-muted: #c3c1b7;
+  --color-border: #3b3a37;
+  --color-accent: #d97757;
+}
`);
const TOGGLE_HUNK = H(0, 1, `
+import { useEffect, useState } from "react";
+
+type Theme = "light" | "dark";
+
+export function ThemeToggle() {
+  const [theme, setTheme] = useState<Theme>("light");
+
+  useEffect(() => {
+    document.documentElement.dataset.theme = theme;
+  }, [theme]);
+
+  return (
+    <button
+      className="theme-toggle"
+      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
+      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
+    />
+  );
+}
`);
const OUT_WWW_BUILD = `
> @casuro/www@1.8.2 build
> astro build

 building client (vite)
 ✓ 214 modules transformed.
 dist/_astro/index.7c1f2a.css   18.42 kB | gzip: 4.91 kB
 dist/_astro/ThemeToggle.b83e10.js  1.07 kB | gzip: 0.61 kB
 ✓ Completed in 3.12s.
 ✓ 14 page(s) built in 5.48s`;

const FANOUT_READ = [
  'import { db } from "../db";',
  'import { sendEmail, sendPush, sendInApp } from "./channels";',
  "",
  "export async function fanOut(event: NotificationEvent) {",
  "  const recipients = await db.recipientsFor(event);",
  "  // Runs inline in the request path: a 2k-member space means",
  "  // 6k sequential channel calls before the API responds.",
  "  for (const r of recipients) {",
  "    await sendEmail(r, event);",
  "    await sendPush(r, event);",
  "    await sendInApp(r, event);",
  "  }",
  "}",
];
const PLAN_MD = `### Plan: move notification fan-out to a queue

**Goal:** the API responds as soon as the event is recorded; delivery happens in workers with retries.

1. **Add a \`notifications\` queue** in \`src/queue/index.ts\` using the existing BullMQ connection, with 5 retries and exponential backoff.
2. **Producer:** change \`fanOut()\` to enqueue one job per recipient batch (500 recipients each) instead of sending inline.
3. **Worker:** new \`src/workers/notifications.ts\` that sends email, push and in-app in parallel per recipient, with idempotency keys so retries never double-send.
4. **Metrics:** emit \`notifications.enqueued\` / \`notifications.delivered\` counters and a dead-letter alert.
5. **Tests:** unit tests for batching and idempotency, plus an integration test with a fake queue.

**Out of scope:** changing channel providers or notification preferences.

Files: \`src/notifications/fanout.ts\`, \`src/queue/index.ts\`, \`src/workers/notifications.ts\` (new), \`test/notifications/*.test.ts\``;

const PW_HUNK = H(22, 22, `
   test("opens a channel from the sidebar", async ({ page }) => {
-    await page.click("text=design-reviews");
-    await expect(page.locator(".channel-title")).toHaveText("design-reviews");
+    await page.getByRole("button", { name: "design-reviews" }).click();
+    await expect(page.getByRole("heading", { level: 1 })).toHaveText("design-reviews");
   });
`);
const OUT_PW = `
Running 18 tests using 4 workers

  18 passed (9.4s)

To open last HTML report run:

  npx playwright show-report`;

const PRICING_HUNK = H(1, 0, `
-import PricingTable from "../components/legacy/PricingTable.astro";
-import Layout from "../layouts/Base.astro";
-
-<Layout title="Pricing">
-  <PricingTable plans={legacyPlans} />
-</Layout>
`);

/* ---------- Live-run scenarios (one per repo) ---------- */
const SCEN: Record<string, Scenario> = {
  "casuro/core": {
    thought: "The request touches the exports API. I should find where CSV exports are built, check how large responses are streamed today, then add the change with a test. Existing tests for exports live under test/api.",
    intro: "I'll start by finding where exports are built and how they're tested.",
    todos: ["Explore the exports endpoint and its tests", "Implement the change in src/api/exports.ts", "Add test coverage", "Run the test suite and fix failures"],
    grep: { pattern: "exportCsv", path: "src/", matches: [
      { f: "src/api/exports.ts", n: 14, t: "export async function exportCsv(req: Request, res: Response) {" },
      { f: "src/api/exports.ts", n: 31, t: "  return exportCsv(req, res);" },
      { f: "src/api/routes.ts", n: 58, t: 'router.get("/spaces/:id/export.csv", exportCsv);' },
      { f: "test/api/exports.test.ts", n: 7, t: 'import { exportCsv } from "../../src/api/exports";' },
    ] },
    read: { path: "src/api/exports.ts", start: 12, lang: "ts", lines: [
      "const PAGE_SIZE = 1000;",
      "",
      "export async function exportCsv(req: Request, res: Response) {",
      "  const rows = await db.assessments.findMany({ where: { spaceId: req.params.id } });",
      '  res.setHeader("Content-Type", "text/csv");',
      "  res.send(toCsv(rows));",
      "}",
    ] },
    edit: { path: "src/api/exports.ts", lang: "ts", hunks: [H(14, 14, `
 export async function exportCsv(req: Request, res: Response) {
-  const rows = await db.assessments.findMany({ where: { spaceId: req.params.id } });
   res.setHeader("Content-Type", "text/csv");
-  res.send(toCsv(rows));
+  res.write(CSV_HEADER);
+  for await (const page of db.assessments.paginate({ where: { spaceId: req.params.id }, pageSize: PAGE_SIZE })) {
+    res.write(toCsvRows(page));
+  }
+  res.end();
 }
`)] },
    testEdit: { path: "test/api/exports.test.ts", lang: "ts", hunks: [H(21, 21, `
   });
+
+  it("streams large exports page by page", async () => {
+    await seedAssessments({ spaceId: "sp_1", count: 2_500 });
+    const res = await request(app).get("/spaces/sp_1/export.csv");
+    expect(res.text.split("\\n")).toHaveLength(2_502);
+  });
 });
`)] },
    testCmd: "npm test -- exports",
    follow: { path: "src/api/exports.ts", lang: "ts", hunks: [H(16, 16, `
   res.setHeader("Content-Type", "text/csv");
+  res.setHeader("Content-Disposition", \`attachment; filename="space-\${req.params.id}.csv"\`);
   res.write(CSV_HEADER);
`)] },
    fail: `
> @casuro/core@2.14.0 test
> vitest run exports

 RUN  v2.1.4 /Users/naman/casuro/core

 ✕ test/api/exports.test.ts (4 tests | 1 failed) 912ms
   ✕ exports > streams large exports page by page
     → expected [ 'id,score,submitted_at', …(2500) ] to have a length of 2502 but got 2501

 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Duration  1.48s`,
    explain: "One failure: the stream ends without a trailing newline, so the row count is off by one. `toCsvRows` joins rows but doesn't terminate the last one. I'll fix that.",
    fix: { path: "src/api/exports.ts", lang: "ts", hunks: [H(40, 43, `
 function toCsvRows(rows: Assessment[]): string {
-  return rows.map(toCsvLine).join("\\n");
+  return rows.map((r) => toCsvLine(r) + "\\n").join("");
 }
`)] },
    pass: `
> @casuro/core@2.14.0 test
> vitest run exports

 RUN  v2.1.4 /Users/naman/casuro/core

 ✓ test/api/exports.test.ts (4 tests) 874ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  1.39s`,
    summary: (p) => `Done. Here's what I changed for "${p}":

- **\`src/api/exports.ts\`**: exports now stream page by page (1,000 rows per page) instead of loading every row into memory, and each CSV row ends with a newline.
- **\`test/api/exports.test.ts\`**: new test that seeds 2,500 rows and checks the streamed output.

All 4 export tests pass. Want me to open a PR?`,
  },
  "casuro/mockups": {
    thought: "The Slack mockup is a single HTML file with a state object and render functions. I need to find the channel header, add a huddle button, then a floating huddle window that reuses the PHOTOS avatars. The Playwright spec for Slack should get a test for the new button.",
    intro: "Let me look at how the channel header is rendered in the Slack mockup.",
    todos: ["Find the channel header render function", "Add huddle button and floating huddle window", "Add a Playwright test for the huddle", "Run the Slack tests and fix failures"],
    grep: { pattern: "renderChannelHeader", path: "apps/", matches: [
      { f: "apps/slack.html", n: 1412, t: "function renderChannelHeader(ch) {" },
      { f: "apps/slack.html", n: 1873, t: "  renderChannelHeader(state.channel);" },
      { f: "tests/slack.spec.ts", n: 31, t: "  // renderChannelHeader shows member count and topic" },
    ] },
    read: { path: "apps/slack.html", start: 1412, lang: "ts", lines: [
      "function renderChannelHeader(ch) {",
      "  return `<header class=\"ch-head\">",
      "    <h1># ${esc(ch.name)}</h1>",
      "    <button class=\"members\" data-act=\"members\">${ch.members.length}</button>",
      "  </header>`;",
      "}",
    ] },
    edit: { path: "apps/slack.html", lang: "ts", hunks: [H(1415, 1415, `
     <button class="members" data-act="members">\${ch.members.length}</button>
+    <button class="huddle-btn" data-act="startHuddle" data-tip="Start huddle">\${IC.headphones}</button>
   </header>\`;
 }
+
+function renderHuddle() {
+  if (!state.huddle) return "";
+  const people = state.huddle.people.map((p) => \`<img class="hd-av" src="\${PHOTOS[p]}" alt="">\`).join("");
+  return \`<div class="huddle" role="dialog" aria-label="Huddle in #\${esc(state.channel.name)}">
+    <div class="hd-people">\${people}</div>
+    <button data-act="toggleMute">\${state.huddle.muted ? IC.micOff : IC.mic}</button>
+    <button class="leave" data-act="leaveHuddle">Leave</button>
+  </div>\`;
+}
`)] },
    testEdit: { path: "tests/slack.spec.ts", lang: "ts", hunks: [H(48, 48, `
   });
+
+  test("starts and leaves a huddle", async ({ page }) => {
+    await page.getByRole("button", { name: "Start huddle" }).click();
+    await expect(page.getByRole("dialog", { name: /Huddle in/ })).toBeVisible();
+    await page.getByRole("button", { name: "Leave" }).click();
+    await expect(page.getByRole("dialog", { name: /Huddle in/ })).toBeHidden();
+  });
 });
`)] },
    testCmd: "npx playwright test slack",
    follow: { path: "apps/slack.html", lang: "ts", hunks: [H(1990, 1990, `
   if (e.key === "Escape" && state.thread) return closeThread();
+  if (mod && e.shiftKey && e.key.toLowerCase() === "h") return toggleHuddle();
`)] },
    fail: `
Running 19 tests using 4 workers

  ✘  1 [chromium] › tests/slack.spec.ts:50:3 › starts and leaves a huddle (5.2s)

  1) tests/slack.spec.ts:50:3 › starts and leaves a huddle

    Error: locator.click: Timeout 5000ms exceeded.
    waiting for getByRole('button', { name: 'Start huddle' })

  1 failed
  18 passed (14.8s)`,
    explain: "The new button has a `data-tip` tooltip but no accessible name, so `getByRole` can't find it. I'll add an `aria-label`.",
    fix: { path: "apps/slack.html", lang: "ts", hunks: [H(1416, 1416, `
-    <button class="huddle-btn" data-act="startHuddle" data-tip="Start huddle">\${IC.headphones}</button>
+    <button class="huddle-btn" data-act="startHuddle" data-tip="Start huddle" aria-label="Start huddle">\${IC.headphones}</button>
`)] },
    pass: `
Running 19 tests using 4 workers

  19 passed (10.1s)

To open last HTML report run:

  npx playwright show-report`,
    summary: () => `Done. The huddle UI is in:

- **Channel header** has a headphones button that starts a huddle (with an \`aria-label\` so it's accessible and testable).
- **Floating huddle window** shows participant avatars from \`PHOTOS\`, a mute toggle and a Leave button.
- **\`tests/slack.spec.ts\`** covers starting and leaving a huddle.

All 19 Slack tests pass. Open the Preview pane to try it.`,
  },
  "casuro/www": {
    thought: "This is the Astro marketing site. Design tokens live in src/styles/tokens.css and components read them through CSS variables. I'll check the header component, make the change, then run the build and the component tests.",
    intro: "I'll check the design tokens and the header component first.",
    todos: ["Review tokens.css and Header.astro", "Implement the change", "Update component tests", "Run tests and build"],
    grep: { pattern: "--color-accent", path: "src/", matches: [
      { f: "src/styles/tokens.css", n: 7, t: "  --color-accent: #d97757;" },
      { f: "src/components/Header.astro", n: 41, t: "  background: var(--color-accent);" },
      { f: "src/components/Button.astro", n: 18, t: "  border-color: var(--color-accent);" },
    ] },
    read: { path: "src/components/Header.astro", start: 36, lang: "css", lines: [
      ".cta {",
      "  padding: 8px 14px;",
      "  border-radius: 9px;",
      "  color: #fff;",
      "  background: var(--color-accent);",
      "  transition: transform .2s;",
      "}",
    ] },
    edit: { path: "src/components/Header.astro", lang: "css", hunks: [H(36, 36, `
 .cta {
   padding: 8px 14px;
   border-radius: 9px;
   color: #fff;
   background: var(--color-accent);
   transition: transform .2s;
 }
+.cta:hover { background: var(--color-accent-hover); }
+@media (prefers-reduced-motion: reduce) {
+  .cta { transition: none; }
+}
`)] },
    testEdit: { path: "src/components/Header.test.ts", lang: "ts", hunks: [H(12, 12, `
   });
+
+  it("uses the hover token for the CTA", async () => {
+    const css = await readComponentCss("Header");
+    expect(css).toContain("var(--color-accent-hover)");
+  });
 });
`)] },
    testCmd: "npm run test",
    follow: { path: "src/components/Header.astro", lang: "css", hunks: [H(12, 12, `
   <nav class="links">
-    <a href="/pricing">Pricing</a>
+    <a href="/pricing" aria-current={Astro.url.pathname === "/pricing" ? "page" : undefined}>Pricing</a>
   </nav>
`)] },
    fail: `
> @casuro/www@1.8.2 test
> vitest run

 ✕ src/components/Header.test.ts (3 tests | 1 failed)
   ✕ Header > uses the hover token for the CTA
     → CSS variable --color-accent-hover is not defined in tokens.css

 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 22 passed (23)`,
    explain: "The test checks that every variable a component uses is defined. `--color-accent-hover` isn't defined in `tokens.css` yet, so I'll add it there.",
    fix: { path: "src/styles/tokens.css", lang: "css", hunks: [H(7, 7, `
   --color-accent: #d97757;
+  --color-accent-hover: #c6613f;
 }
`)] },
    pass: `
> @casuro/www@1.8.2 test
> vitest run

 ✓ src/components/Header.test.ts (3 tests)
 ✓ src/components/Button.test.ts (5 tests)

 Test Files  7 passed (7)
      Tests  23 passed (23)`,
    summary: (p) => `Done. Changes for "${p}":

- **\`Header.astro\`**: CTA hover state uses a new \`--color-accent-hover\` token and respects \`prefers-reduced-motion\`.
- **\`tokens.css\`**: added \`--color-accent-hover\` (\`#c6613f\`).
- **\`Header.test.ts\`**: guards the new token.

All 23 tests pass. The Preview pane shows the updated header on localhost:3000.`,
  },
};

// ---------- The seeded sessions ----------

const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.now();
const CHECKS = [{ name: "build", duration: "1m 12s" }, { name: "test (vitest)", duration: "2m 48s" }, { name: "lint", duration: "38s" }];

const search = (g: Scenario["grep"]): ItemInput => ({ type: "search", pattern: g.pattern, path: g.path, matches: g.matches.map((m) => ({ file: m.f, line: m.n, text: m.t })) });
const grep = (pattern: string, path: string, matches: [string, number, string][]) => search({ pattern, path, matches: matches.map(([f, n, t]) => ({ f, n, t })) });

export const CLAUDE_CODE_DEMO: ClaudeCodeSeed = {
  me: { name: "Naman Shukla", email: "naman@casuro.com", plan: "Max plan", photo: FACES.naman },
  people: {
    hana: { name: "Hana Kim", photo: FACES.hana },
    marcus: { name: "Marcus Chen", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", photo: FACES.sofia },
    dev: { name: "Dev Patel", photo: FACES.dev },
    lena: { name: "Lena Okafor", photo: FACES.lena },
  },
  repos: {
    "casuro/core": { branches: ["main", "naman/batch-backfill", "naman/fix-checkout-flake", "release/2.14"], path: "~/casuro/core", previewUrl: "localhost:3000/admin/jobs" },
    "casuro/mockups": { branches: ["main", "naman/slack-huddle", "naman/playwright-1.49"], path: "~/casuro/mockups", previewUrl: "localhost:5173/apps/slack.html" },
    "casuro/www": { branches: ["main", "naman/dark-tokens", "sofia/pricing-v3"], path: "~/casuro/www", previewUrl: "localhost:3000/" },
  },
  examples: [
    { repo: "casuro/core", text: "Find why the nightly invoice job is slow and propose a fix" },
    { repo: "casuro/www", text: "Add a reduced-motion variant for the hero animation" },
    { repo: "casuro/mockups", text: "Add a thread reply panel to the Slack mockup" },
    { repo: "casuro/core", text: "Write tests for the assessment scoring edge cases" },
  ],
  defaults: { reviewers: ["hana", "dev"] },
  terminalBanner: `Last login: ${new Date(NOW - 3 * HOUR).toDateString()} on ttys004 · type "help" for demo commands`,
  open: "s1",
  sessions: [
    {
      id: "s3", title: "Add huddle UI to Slack mockup", repo: "casuro/mockups", branch: "naman/slack-huddle", env: "cloud", mode: "auto", status: "running", at: NOW - 2 * MIN, context: 9,
      items: [{ type: "user", text: "Add a huddle UI to the Slack mockup: a headphones button in the channel header that opens a floating huddle window with participant avatars, mute and leave." }],
    },
    {
      id: "s2", title: "Fix flaky checkout retry test", repo: "casuro/core", branch: "naman/fix-checkout-flake", mode: "ask", status: "input", at: NOW - 12 * MIN, context: 27,
      items: [
        { type: "user", text: "checkout.retry.test.ts fails about 1 in 10 runs on CI. Find out why and fix it properly, no sleeps." },
        { type: "thinking", text: "A 1-in-10 failure with retries smells like real timers plus random jitter. If the delay plus jitter is close to a fixed wait in the test, the assertion races the retry.", seconds: 4 },
        { id: "s2todo", type: "todo", todos: [
          { text: "Reproduce and find the source of flakiness", status: "done" },
          { text: "Make retry timing injectable", status: "done" },
          { text: "Rewrite the test with a fake sleep", status: "done" },
          { text: "Run the checkout tests 20 times", status: "active" },
        ] },
        { type: "read", path: "test/billing/checkout.retry.test.ts", start: 1, lang: "ts", lines: RETRY_READ },
        grep("setTimeout", "src/billing/", [["src/billing/retry.ts", 27, "        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i + jitter));"]]),
        { type: "text", text: "Found it. The retry waits `200ms + random(0..200ms)` of real time, and the test sleeps a fixed **450ms** before asserting. When jitter is above ~250ms the assertion runs before the retry finishes. I'll make `sleep` and `random` injectable so the test is deterministic." },
        { type: "permission", request: { kind: "edit", path: "src/billing/retry.ts", hunks: [RETRY_EDIT], lang: "ts" }, answer: "once" },
        { type: "edit", path: "src/billing/retry.ts", lang: "ts", hunks: [RETRY_EDIT] },
        { type: "permission", request: { kind: "edit", path: "test/billing/checkout.retry.test.ts", hunks: [RETRY_TEST_EDIT], lang: "ts" }, answer: "once" },
        { type: "edit", path: "test/billing/checkout.retry.test.ts", lang: "ts", hunks: [RETRY_TEST_EDIT] },
        { id: "s2perm", type: "permission", request: { kind: "bash", command: "npm test -- checkout --repeat 20", why: "Runs the checkout test files 20 times in a row to confirm the flake is gone." } },
      ],
    },
    {
      id: "s1", title: "Batch the assessment_spaces backfill", repo: "casuro/core", branch: "naman/batch-backfill", mode: "auto", status: "done", at: NOW - 40 * MIN, context: 42,
      terminal: [{ command: "npm test -- backfill", output: OUT_BACKFILL }],
      items: [
        { type: "user", text: "The assessment_spaces backfill in migration 0142 locks the table for minutes on prod-size data. Batch it in chunks of 5k rows and make sure it's resumable if it dies halfway." },
        { type: "thinking", text: "The migration does one big UPDATE inside a transaction, so every row lock is held until COMMIT. I need a loop that commits per batch. A procedure (not a DO block) can COMMIT between batches. A partial index on rows still missing space_id keeps each batch lookup cheap, and SKIP LOCKED lets it coexist with live writes. The job runner has the same query, so it needs the same batching.", seconds: 6 },
        { type: "text", text: "I'll look at the current migration and every place that runs this backfill first." },
        { type: "todo", todos: [
          { text: "Inspect migration 0142 and the backfill job", status: "done" },
          { text: "Rewrite the backfill as a batched, resumable procedure", status: "done" },
          { text: "Apply the same batching in the job runner", status: "done" },
          { text: "Add tests for multi-batch and resumed runs", status: "done" },
          { text: "Run the backfill test suite", status: "done" },
        ] },
        grep("assessment_spaces", "src/ db/ test/", [
          ["db/migrations/0142_backfill_assessment_spaces.sql", 4, "UPDATE assessment_spaces AS s"],
          ["src/jobs/backfillAssessmentSpaces.ts", 6, '    "UPDATE assessment_spaces AS s SET space_id = a.space_id FROM assessments AS a ..."'],
          ["src/models/assessmentSpace.ts", 12, '  tableName: "assessment_spaces",'],
          ["test/migrations/0142.test.ts", 9, '  const { rows } = await db.query("SELECT * FROM assessment_spaces");'],
        ]),
        { type: "read", path: "db/migrations/0142_backfill_assessment_spaces.sql", start: 1, lang: "sql", lines: MIG_OLD, open: true },
        { type: "task", agent: "Explore", description: "Find every caller of backfillAssessmentSpaces", seconds: 14, steps: [
          { kind: "search", text: '"backfillAssessmentSpaces" in src/ scripts/' },
          { kind: "read", text: "src/jobs/index.ts" },
          { kind: "read", text: "scripts/run-backfill.ts" },
          { kind: "search", text: '"assessment_spaces" in src/api/' },
        ], result: "Called from **2 places**: the job registry in `src/jobs/index.ts` and the manual `scripts/run-backfill.ts`. No request path reads `space_id` before the backfill completes, so batching is safe." },
        { type: "edit", path: "db/migrations/0142_backfill_assessment_spaces.sql", lang: "sql", hunks: [MIG_HUNK], open: true },
        { type: "edit", path: "src/jobs/backfillAssessmentSpaces.ts", lang: "ts", hunks: [JOB_HUNK] },
        { type: "edit", path: "test/jobs/backfillAssessmentSpaces.test.ts", lang: "ts", hunks: [JOBTEST_HUNK] },
        { type: "bash", command: "npm test -- backfill", output: OUT_BACKFILL, exit: 0, seconds: 2.6 },
        { type: "text", text: `Done. The backfill now runs in batches of 5,000 rows and is safe to re-run.

### What changed
- **\`0142_backfill_assessment_spaces.sql\`**: replaced the single \`UPDATE\` with a \`backfill_assessment_spaces\` procedure that commits after every batch and uses \`FOR UPDATE SKIP LOCKED\`, plus a partial index on rows still missing \`space_id\`.
- **\`backfillAssessmentSpaces.ts\`**: the job runner uses the same batching and returns the total rows updated.
- **New tests** cover multi-batch runs and resuming after a partial run.

To run it by hand against staging:
\`\`\`bash
psql "$STAGING_DATABASE_URL" -c "CALL backfill_assessment_spaces(5000);"
\`\`\`
All 3 tests pass. On a prod-size copy (4.2M rows) each batch holds its locks for about 180ms.` },
      ],
    },
    {
      id: "s5", title: "Move notification fan-out to a queue", repo: "casuro/core", branch: "naman/notifications-queue", env: "cloud", mode: "plan", status: "input", at: NOW - 3 * HOUR, context: 18,
      items: [
        { type: "user", text: "Notification fan-out runs inline in the request path and big spaces time out. Plan moving it to our queue. Don't change anything yet." },
        { type: "thinking", text: "Plan mode: research only. Look at fanOut(), the existing queue setup and how channels send.", seconds: 5 },
        grep("fanOut\\(", "src/", [
          ["src/notifications/fanout.ts", 4, "export async function fanOut(event: NotificationEvent) {"],
          ["src/api/comments.ts", 88, '  await fanOut({ type: "comment.created", spaceId, actorId });'],
          ["src/api/assessments.ts", 142, '  await fanOut({ type: "assessment.submitted", spaceId, actorId });'],
        ]),
        { type: "read", path: "src/notifications/fanout.ts", start: 1, lang: "ts", lines: FANOUT_READ },
        { type: "task", agent: "Explore", description: "Check the existing queue infrastructure", seconds: 11, steps: [
          { kind: "search", text: '"new Queue(" in src/' },
          { kind: "read", text: "src/queue/index.ts" },
          { kind: "read", text: "src/workers/emailDigest.ts" },
        ], result: "BullMQ is already set up in `src/queue/index.ts` (Redis connection shared with `emailDigest`). Workers run in the `worker` process via `npm run worker`." },
        { id: "s5plan", type: "plan", text: PLAN_MD },
      ],
    },
    {
      id: "s4", title: "Dark mode tokens for www", repo: "casuro/www", branch: "naman/dark-tokens", model: "sonnet", mode: "auto", status: "done", at: NOW - 26 * HOUR, context: 31,
      terminal: [{ command: "npm run build", output: OUT_WWW_BUILD }],
      items: [
        { type: "user", text: "Add dark mode tokens to www. Light stays the default, dark is opt-in via a toggle in the header." },
        { type: "thinking", text: "Tokens are plain CSS variables on :root. A data-theme attribute keeps light as the default without following the OS setting.", seconds: 3 },
        { type: "read", path: "src/styles/tokens.css", start: 1, lang: "css", lines: TOKENS_READ },
        { type: "edit", path: "src/styles/tokens.css", lang: "css", hunks: [TOKENS_HUNK] },
        { type: "edit", path: "src/components/ThemeToggle.tsx", lang: "ts", hunks: [TOGGLE_HUNK] },
        { type: "bash", command: "npm run build", output: OUT_WWW_BUILD, exit: 0, seconds: 5.5 },
        { type: "text", text: "Dark tokens are in `tokens.css` under `:root[data-theme=\"dark\"]`, and a new `ThemeToggle` switches the attribute. Light remains the default. The build passes." },
        { type: "pr", number: 482, title: "Add dark mode tokens and theme toggle", base: "main", head: "naman/dark-tokens", reviewers: ["sofia", "lena"], draft: false, checks: CHECKS.map((c) => ({ ...c, done: true })) },
      ],
    },
    {
      id: "s6", title: "Bump Playwright and fix selectors", repo: "casuro/mockups", branch: "naman/playwright-1.49", model: "sonnet", mode: "auto", status: "done", at: NOW - 3 * DAY, context: 22,
      terminal: [{ command: "npx playwright test", output: OUT_PW }],
      items: [
        { type: "user", text: "Bump @playwright/test to 1.49 and fix whatever breaks." },
        { type: "bash", command: "npm i -D @playwright/test@1.49.0", output: "\nadded 2 packages, changed 3 packages, and audited 214 packages in 4s\n\nfound 0 vulnerabilities", exit: 0, seconds: 4.1 },
        { type: "edit", path: "tests/slack.spec.ts", lang: "ts", hunks: [PW_HUNK] },
        { type: "bash", command: "npx playwright test", output: OUT_PW, exit: 0, seconds: 9.4 },
        { type: "text", text: "Upgraded to 1.49. One test used a `text=` selector that now matches two elements; I switched it to `getByRole`. All 18 tests pass." },
      ],
    },
    {
      id: "s7", title: "Remove legacy pricing page", repo: "casuro/www", branch: "naman/remove-legacy-pricing", model: "sonnet", mode: "auto", status: "done", archived: true, at: NOW - 5 * DAY, context: 12,
      items: [
        { type: "user", text: "Delete the legacy pricing page, it's been redirected for months." },
        { type: "edit", path: "src/pages/pricing-legacy.astro", lang: "css", hunks: [PRICING_HUNK], deleted: true },
        { type: "text", text: "Removed `src/pages/pricing-legacy.astro`. The redirect in `vercel.json` still sends `/pricing-legacy` to `/pricing`." },
      ],
    },
  ],
};

// ---------- The simulated agent ----------

const CANCEL = Symbol("cancel");
const THINK_VERBS = ["Pondering", "Percolating", "Clauding", "Noodling", "Simmering"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const baseName = (p: string) => p.split("/").pop() ?? p;
const commandKey = (c: string) => {
  const w = c.split(/\s+/);
  return w.slice(0, w[1] === "run" ? 3 : 2).join(" ");
};

interface Run {
  sid: string;
  started: number;
  tokens: number;
  cancelled: boolean;
  timers: Set<{ t: ReturnType<typeof setTimeout>; reject: (e: unknown) => void }>;
}

/** Plays the mockup's scripted runs on a Claude Code app, through its world calls only. */
function createAgent(cc: () => ClaudeCodeApp) {
  const runs = new Map<string, Run>();
  const allowed = new Map<string, Set<string>>([["s3", new Set(["npx playwright"])]]);
  const allowEdits = new Set<string>();
  const session = (sid: string) => cc().snapshot().sessions.find((s) => s.id === sid) as SessionState;

  const sleep = (R: Run, ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (R.cancelled) return reject(CANCEL);
      const k = { t: setTimeout(() => (R.timers.delete(k), resolve()), ms), reject };
      R.timers.add(k);
    });
  const verb = (R: Run, v: string) => cc().setStatus(R.sid, "running", { verb: v, tokens: R.tokens });
  const bump = (R: Run, tokens: number, context = 0) => {
    R.tokens += tokens;
    cc().setStatus(R.sid, "running", { tokens: R.tokens });
    if (context) cc().updateSession(R.sid, { context: Math.min(96, session(R.sid).context + context) });
  };
  const begin = (sid: string): Run => {
    const R: Run = { sid, started: Date.now(), tokens: 0, cancelled: false, timers: new Set() };
    runs.set(sid, R);
    cc().setStatus(sid, "running", { verb: "Thinking", tokens: 0 });
    return R;
  };
  const end = (R: Run, status: "done" | "idle" = "done") => {
    if (runs.get(R.sid) !== R) return;
    runs.delete(R.sid);
    cc().setStatus(R.sid, status);
  };
  const stop = (sid: string) => {
    const R = runs.get(sid);
    if (!R) return;
    R.cancelled = true;
    R.timers.forEach((k) => (clearTimeout(k.t), k.reject(CANCEL)));
    runs.delete(sid);
  };
  const guard = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      if (e !== CANCEL) throw e;
    }
  };

  async function think(R: Run, text: string) {
    verb(R, pick(THINK_VERBS));
    const id = cc().append(R.sid, { type: "thinking", text, live: true, verb: "Thinking" });
    const t0 = Date.now();
    await sleep(R, 1600 + Math.random() * 800);
    bump(R, 900, 2);
    cc().updateItem(id, { live: false, seconds: Math.max(2, Math.round((Date.now() - t0) / 1000) + 1) });
  }
  async function say(R: Run, text: string) {
    verb(R, "Writing");
    const id = cc().append(R.sid, { type: "text", text: "", streaming: true });
    const words = text.split(/(\s+)/);
    let shown = "";
    for (let i = 0; i < words.length; ) {
      const n = 3 + Math.floor(Math.random() * 4);
      shown += words.slice(i, i + n).join("");
      i += n;
      cc().updateItem(id, { text: shown });
      R.tokens += 12;
      await sleep(R, 32 + Math.random() * 30);
    }
    cc().updateItem(id, { text, streaming: false });
    bump(R, 0, 1);
  }
  async function tool(R: Run, item: ItemInput, ms: number, v: string) {
    verb(R, v);
    const id = cc().append(R.sid, { ...item, running: true });
    await sleep(R, ms);
    cc().updateItem(id, { running: false });
    bump(R, 1400, 2);
    await sleep(R, 250);
  }
  const setTodo = (id: string, idx: number) =>
    cc().updateItem(id, (it) => {
      if (it.type === "todo") it.todos.forEach((x, i) => (x.status = i < idx ? "done" : i === idx ? "active" : "pending"));
    });
  const answered = <A,>(a: A | "cancel"): A => {
    if (a === "cancel") throw CANCEL;
    return a;
  };

  async function edit(R: Run, e: { path: string; lang: Lang; hunks: Hunk[] }) {
    if (session(R.sid).mode === "ask" && !allowEdits.has(R.sid)) {
      verb(R, "Waiting");
      const a = answered(await cc().askPermission(R.sid, { kind: "edit", path: e.path, hunks: e.hunks, lang: e.lang }));
      if (a === "deny") return false;
      if (a === "always") allowEdits.add(R.sid);
    }
    verb(R, "Editing");
    const id = cc().append(R.sid, { type: "edit", path: e.path, lang: e.lang, hunks: e.hunks, open: true, running: true });
    await sleep(R, 700 + Math.random() * 500);
    cc().updateItem(id, { running: false });
    bump(R, 1400, 2);
    await sleep(R, 250 + 900);
    cc().updateItem(id, { open: false });
    return true;
  }
  async function bash(R: Run, command: string, output: string, exit: number, why = "Runs the relevant tests to check the change.", preApproved = false) {
    const key = commandKey(command);
    const allow = allowed.get(R.sid) ?? new Set();
    if (!preApproved && !allow.has(key)) {
      verb(R, "Waiting");
      const a = answered(await cc().askPermission(R.sid, { kind: "bash", command, why }));
      if (a === "deny") return false;
      if (a === "always") allowed.set(R.sid, allow.add(key));
    }
    verb(R, "Running");
    const id = cc().append(R.sid, { type: "bash", command, output: "", running: true, open: true });
    const t0 = Date.now();
    await sleep(R, 500);
    let out = "";
    for (const l of output.replace(/^\n/, "").split("\n")) {
      out += "\n" + l;
      cc().updateItem(id, { output: out });
      await sleep(R, l.trim() ? 70 + Math.random() * 110 : 40);
    }
    cc().updateItem(id, { running: false, exit, seconds: +((Date.now() - t0) / 1000).toFixed(1), output });
    bump(R, 1100, 2);
    cc().terminal(R.sid, { command, output });
    await sleep(R, 300);
    if (exit === 0) cc().updateItem(id, { open: false });
    return true;
  }
  async function denied(R: Run) {
    await say(R, "Okay, I won't do that. Tell me how you'd like to proceed, or adjust the permission mode below.");
    end(R, "idle");
  }

  /** A full run for a first prompt, tailored to the session's repo. */
  const scenario = (sid: string, prompt: string) =>
    guard(async () => {
      const sc = SCEN[session(sid).repo];
      const R = begin(sid);
      const short = prompt.length > 60 ? prompt.slice(0, 57).trim() + "..." : prompt;
      await sleep(R, 300);
      await think(R, sc.thought);
      await say(R, sc.intro);
      const todo = cc().append(sid, { type: "todo", todos: sc.todos.map((text, i) => ({ text, status: i === 0 ? "active" : "pending" })) });
      await sleep(R, 400);
      await tool(R, search(sc.grep), 900, "Searching");
      await tool(R, { type: "read", ...sc.read }, 800, "Reading");
      if (session(sid).mode === "plan") {
        verb(R, "Planning");
        const plan = `### Plan\n\n${sc.todos.slice(1).map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nFiles: \`${sc.edit.path}\`, \`${sc.testEdit.path}\``;
        const a = answered(await cc().proposePlan(sid, plan));
        if (a === "keep") {
          await say(R, "Sure. What would you like me to change about the plan?");
          return end(R, "idle");
        }
      }
      setTodo(todo, 1);
      if (!(await edit(R, sc.edit))) return denied(R);
      setTodo(todo, 2);
      if (!(await edit(R, sc.testEdit))) return denied(R);
      setTodo(todo, 3);
      if (!(await bash(R, sc.testCmd, sc.fail, 1))) return denied(R);
      await say(R, sc.explain);
      if (!(await edit(R, sc.fix))) return denied(R);
      if (!(await bash(R, sc.testCmd, sc.pass, 0))) return denied(R);
      setTodo(todo, 4);
      await sleep(R, 300);
      await say(R, sc.summary(short));
      end(R);
    });

  /** A follow-up in a session that already has changes: a shorter, focused run. */
  const followup = (sid: string, prompt: string) =>
    guard(async () => {
      const sc = SCEN[session(sid).repo];
      const R = begin(sid);
      const short = prompt.length > 60 ? prompt.slice(0, 57).trim() + "..." : prompt;
      await sleep(R, 300);
      await think(R, `Small follow-up on top of the existing changes. Touch ${sc.follow.path}, then re-run ${sc.testCmd}.`);
      await say(R, `Got it. I'll update \`${baseName(sc.follow.path)}\` and re-run the tests.`);
      if (!(await edit(R, sc.follow))) return denied(R);
      if (!(await bash(R, sc.testCmd, sc.pass, 0))) return denied(R);
      await say(R, `Done. \`${sc.follow.path}\` is updated for "${short}", and the tests still pass.`);
      end(R);
    });

  /** The seeded sessions paused on a prompt carry on once it is answered. */
  const resume: Record<string, (answer: string) => Promise<void>> = {
    s2perm: (a) =>
      guard(async () => {
        const R = begin("s2");
        if (a === "deny") return denied(R);
        if (a === "always") allowed.set("s2", (allowed.get("s2") ?? new Set()).add("npm test"));
        await bash(R, "npm test -- checkout --repeat 20", OUT_REPEAT, 0, "", true);
        setTodo("s2todo", 4);
        await say(R, "300 of 300 passed across 20 repeats, so the flake is gone. The retry helper now takes `sleep` and `random` options (defaulting to the real ones), and the test asserts the exact backoff instead of waiting on the clock.");
        end(R);
      }),
    s5plan: (a) =>
      guard(async () => {
        const R = begin("s5");
        if (a === "keep") {
          await say(R, "Sure. What would you like to change? For example I could keep in-app notifications synchronous and only queue email and push.");
          return end(R, "idle");
        }
        await say(R, "Plan approved. Starting with the queue and producer.");
        const todo = cc().append("s5", { type: "todo", todos: ["Add notifications queue", "Enqueue batches from fanOut()", "Add the notifications worker", "Tests"].map((text, i) => ({ text, status: i ? "pending" : "active" })) });
        await edit(R, { path: "src/queue/index.ts", lang: "ts", hunks: [H(8, 8, `
 export const emailDigestQueue = new Queue("email-digest", { connection });
+export const notificationsQueue = new Queue("notifications", {
+  connection,
+  defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 1_000 } },
+});
`)] });
        setTodo(todo, 1);
        await edit(R, { path: "src/notifications/fanout.ts", lang: "ts", hunks: [H(4, 4, `
 export async function fanOut(event: NotificationEvent) {
   const recipients = await db.recipientsFor(event);
-  for (const r of recipients) {
-    await sendEmail(r, event);
-    await sendPush(r, event);
-    await sendInApp(r, event);
-  }
+  const batches = chunk(recipients.map((r) => r.id), 500);
+  await notificationsQueue.addBulk(
+    batches.map((ids, i) => ({ name: event.type, data: { event, ids }, opts: { jobId: \`\${event.id}:\${i}\` } }))
+  );
 }
`)] });
        setTodo(todo, 3);
        await bash(R, "npm test -- notifications", `
> @casuro/core@2.14.0 test
> vitest run notifications

 ✓ test/notifications/fanout.test.ts (3 tests) 214ms
 ✓ test/notifications/worker.test.ts (4 tests) 388ms

 Test Files  2 passed (2)
      Tests  7 passed (7)`, 0, "Runs the notification tests.");
        setTodo(todo, 4);
        await say(R, "Fan-out now enqueues batches of 500 recipients with idempotent job ids, and the API returns immediately. All 7 notification tests pass.");
        end(R);
      }),
  };

  const prompt = (sid: string, text: string) => {
    const hasEdits = session(sid).items.some((i) => i.type === "edit");
    return hasEdits ? followup(sid, text) : scenario(sid, text);
  };

  return { prompt, scenario, resume, stop };
}

// ---------- The demo terminal ----------

const RED = "\u001b[31m";

function termRun(s: SessionState, command: string): string {
  const c = command.trim();
  const dir = s.repo.split("/").pop();
  const repo = CLAUDE_CODE_DEMO.repos[s.repo];
  const statsOf = (hunks: Hunk[]) => {
    let a = 0;
    let d = 0;
    for (const h of hunks) for (const l of h.lines.split("\n")) (l[0] === "+" ? a++ : l[0] === "-" ? d++ : 0);
    return { a, d };
  };
  if (c === "help") return "Demo commands: git status, git diff --stat, git log --oneline, git branch, ls, pwd, npm test, whoami, node -v, date, echo, clear";
  if (c === "pwd") return s.env === "cloud" ? `/workspace/${dir}` : `/Users/naman/casuro/${dir}`;
  if (c === "whoami") return "naman";
  if (c === "node -v" || c === "node --version") return "v22.11.0";
  if (c === "date") return new Date().toString();
  if (/^echo\b/.test(c)) return c.replace(/^echo\s*/, "").replace(/^["']|["']$/g, "");
  if (c === "ls" || c === "ls -la" || c === "ls -l")
    return ({
      "casuro/core": "README.md  db  docker-compose.yml  node_modules  package.json  scripts  src  test  tsconfig.json  vitest.config.ts",
      "casuro/mockups": "README.md  apps  index.html  node_modules  package.json  playwright.config.ts  tests",
      "casuro/www": "README.md  astro.config.mjs  node_modules  package.json  public  src  tsconfig.json  vercel.json",
    } as Record<string, string>)[s.repo];
  if (c === "git status") {
    const mod = s.changes.filter((x) => x.status !== "A");
    const add = s.changes.filter((x) => x.status === "A");
    if (!s.changes.length) return `On branch ${s.branch}\nnothing to commit, working tree clean`;
    return (
      `On branch ${s.branch}\n` +
      (mod.length ? `Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n${mod.map((x) => `${RED}\t${x.status === "D" ? "deleted: " : "modified:"}   ${x.path}`).join("\n")}\n` : "") +
      (add.length ? `\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n${add.map((x) => `${RED}\t${x.path}`).join("\n")}\n` : "")
    );
  }
  if (c === "git diff --stat")
    return s.changes.length
      ? s.changes.map((x) => {
          const t = statsOf(x.hunks);
          return ` ${x.path.padEnd(52)} | ${String(t.a + t.d).padStart(3)} ${"+".repeat(Math.min(t.a, 24))}${"-".repeat(Math.min(t.d, 12))}`;
        }).join("\n") + `\n ${s.changes.length} files changed`
      : "";
  if (c === "git log --oneline" || c === "git log")
    return ({
      "casuro/core": `9f3c2e1 (HEAD -> ${s.branch}, origin/main) Bump vitest to 2.1.4\n41b0d7a Add assessment_spaces table\nc2e98f0 Score calibration per space\n7aa1d33 Split billing retry helpers`,
      "casuro/mockups": `39ab98f (HEAD -> ${s.branch}) Gmail mockup: drop the Mail/Chat/Meet rail\n02b1548 Gmail mockup: rebuild the sidebar\nc53c781 Add Microsoft Teams UI mockup`,
      "casuro/www": `e81f0aa (HEAD -> ${s.branch}) Customers page copy\n5c3d912 Astro 5 upgrade\n0b7e4c1 Pricing v2`,
    } as Record<string, string>)[s.repo];
  if (c === "git branch") {
    const list = repo.branches ?? [];
    return list.concat(list.includes(s.branch) ? [] : [s.branch]).map((b) => (b === s.branch ? "* " : "  ") + b).join("\n");
  }
  if (/^(npm (run )?test|npx vitest|npx playwright test)/.test(c)) return s.id === "s1" ? OUT_BACKFILL : s.id === "s2" ? OUT_REPEAT : SCEN[s.repo].pass;
  if (/^npm run build/.test(c)) return OUT_WWW_BUILD;
  if (/^(cd|git (add|commit|push|pull|checkout|fetch))\b/.test(c)) return `This demo terminal is read-only. Ask Claude to run "${c}" instead.`;
  return `zsh: command not found: ${c.split(/\s+/)[0]}\nThis is a demo terminal. Type "help" to see the commands it knows.`;
}

// ---------- The app in the Preview pane ----------

const PAGE_CSS = `
.site { font-family: var(--sans); color: #1c1b19; font-size: 14px; }
.site.dk { background: #171614; color: #f2f0ea; }
.site-nav { display: flex; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid rgba(0, 0, 0, .08); }
.site.dk .site-nav { border-color: rgba(255, 255, 255, .1); }
.site-logo { display: flex; align-items: center; gap: 8px; font-weight: 700; letter-spacing: -.2px; }
.site-logo i { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg, #d97757, #b85535); display: block; }
.site-nav .lk { font-size: 13px; opacity: .7; }
.site-nav .sp { flex: 1; }
.site-nav .cta { font-size: 13px; font-weight: 600; background: #1c1b19; color: #fff; padding: 6px 12px; border-radius: 7px; }
.site.dk .site-nav .cta { background: #f2f0ea; color: #171614; }
.site-hero { padding: 40px 24px 28px; text-align: center; }
.site-hero .eyebrow { display: inline-block; font-size: 12px; font-weight: 600; color: #b85535; background: rgba(217, 119, 87, .12); padding: 3px 10px; border-radius: 12px; margin-bottom: 14px; }
.site-hero h1 { font-family: var(--serif); font-weight: 400; font-size: 34px; line-height: 40px; letter-spacing: -.5px; max-width: 480px; margin: 0 auto 12px; }
.site-hero p { opacity: .7; max-width: 420px; margin: 0 auto 18px; line-height: 21px; }
.site-hero .row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.site-hero .b1 { background: #d97757; color: #fff; padding: 9px 16px; border-radius: 9px; font-weight: 600; font-size: 13px; }
.site-hero .b2 { border: 1px solid rgba(0, 0, 0, .15); padding: 9px 16px; border-radius: 9px; font-weight: 600; font-size: 13px; }
.site.dk .site-hero .b2 { border-color: rgba(255, 255, 255, .2); }
.site-feats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; padding: 8px 20px 28px; }
.site-feat { border: 1px solid rgba(0, 0, 0, .08); border-radius: 12px; padding: 14px; background: #faf9f5; }
.site.dk .site-feat { background: #22211e; border-color: rgba(255, 255, 255, .08); }
.site-feat .ic { width: 28px; height: 28px; border-radius: 8px; background: rgba(217, 119, 87, .15); margin-bottom: 10px; display: grid; place-items: center; color: #c6613f; }
.site-feat .ic svg { width: 15px; height: 15px; }
.site-feat b { display: block; font-size: 13.5px; margin-bottom: 4px; }
.site-feat span { font-size: 12.5px; opacity: .65; line-height: 18px; display: block; }
.site-foot { padding: 14px 20px; font-size: 12px; opacity: .55; border-top: 1px solid rgba(0, 0, 0, .08); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.site.dk .site-foot { border-color: rgba(255, 255, 255, .1); }
.adm { display: flex; min-height: 420px; font-size: 13px; }
.adm-side { width: 150px; background: #f5f4ed; border-right: 1px solid #e8e6dc; padding: 12px 8px; flex: none; }
.adm-side .it { padding: 6px 8px; border-radius: 6px; color: #5e5d59; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.adm-side .it.on { background: #fff; color: #141413; font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, .06); }
.adm-main { flex: 1; padding: 18px; min-width: 0; }
.adm-main h2 { font-size: 17px; margin-bottom: 4px; font-weight: 600; }
.adm-main .sub { color: #5e5d59; margin-bottom: 14px; font-size: 12.5px; }
.adm-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-bottom: 14px; }
.adm-kpi { border: 1px solid #e8e6dc; border-radius: 10px; padding: 10px; }
.adm-kpi span { font-size: 11.5px; color: #5e5d59; display: block; }
.adm-kpi b { font-size: 18px; display: block; margin-top: 2px; font-variant-numeric: tabular-nums; }
.adm-bar { height: 8px; border-radius: 4px; background: #efede3; overflow: hidden; margin: 4px 0 14px; }
.adm-bar i { display: block; height: 100%; background: #d97757; border-radius: 4px; }
.adm-tw { overflow-x: auto; }
.adm-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.adm-tbl th { text-align: left; font-weight: 600; color: #5e5d59; padding: 6px 8px; border-bottom: 1px solid #e8e6dc; }
.adm-tbl td { padding: 7px 8px; border-bottom: 1px solid #f0eee6; white-space: nowrap; font-variant-numeric: tabular-nums; }
.adm-tbl .ok { color: #3f7d4e; font-weight: 600; }
.adm-tbl .run { color: #b7791f; font-weight: 600; }
.hd { background: #1a1d21; color: #e8e8e8; min-height: 420px; display: flex; flex-direction: column; font-size: 13px; }
.hd-top { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, .08); }
.hd-top b { flex: 1; }
.hd-top .live { font-size: 11px; font-weight: 700; background: #2bac76; color: #fff; padding: 1px 7px; border-radius: 10px; }
.hd-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; padding: 16px; align-content: start; }
.hd-tile { aspect-ratio: 4 / 3; border-radius: 12px; background: #2c2f33; display: grid; place-items: center; position: relative; }
.hd-tile.talk { box-shadow: 0 0 0 2px #2bac76; }
.hd-tile img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
.hd-tile span { position: absolute; left: 8px; bottom: 6px; font-size: 11.5px; background: rgba(0, 0, 0, .45); padding: 1px 6px; border-radius: 5px; }
.hd-bar { display: flex; justify-content: center; gap: 10px; padding: 12px; border-top: 1px solid rgba(255, 255, 255, .08); }
.hd-bar i { width: 36px; height: 36px; border-radius: 50%; background: #2c2f33; display: grid; place-items: center; }
.hd-bar i svg { width: 16px; height: 16px; color: #e8e8e8; }
.hd-bar i.leave { background: #e01e5a; width: 64px; border-radius: 18px; }
@container (max-width: 520px) { .adm-side { display: none; } .adm-main { padding: 14px; } .site-nav .lk { display: none; } .site-nav button.lk { display: grid; } }
`;

const NAMES: Record<string, string> = { naman: "You", hana: "Hana", sofia: "Sofia", lena: "Lena" };

function PreviewPage({ s }: { s: SessionState }) {
  const [dark, setDark] = useState(false);
  let page;
  if (s.repo === "casuro/www") {
    const dk = s.id === "s4" && dark;
    page = (
      <div className={`site${dk ? " dk" : ""}`}>
        <div className="site-nav">
          <span className="site-logo"><i />Casuro</span>
          <span className="lk">Product</span>
          <span className="lk">Customers</span>
          <span className="lk">Pricing</span>
          <span className="sp" />
          {s.id === "s4" ? <button className="lk" style={{ opacity: 1 }} aria-label="Toggle site theme" onClick={() => setDark(!dark)}>{dk ? <IC.Sun /> : <IC.Moon />}</button> : null}
          <span className="cta">Book a demo</span>
        </div>
        <div className="site-hero">
          <span className="eyebrow">New · Assessment spaces</span>
          <h1>Assessments your whole team can trust</h1>
          <p>Casuro turns scattered reviews into one calm workspace, with scoring, comments and reports in a single place.</p>
          <div className="row"><span className="b1">Start free trial</span><span className="b2">See how it works</span></div>
        </div>
        <div className="site-feats">
          <div className="site-feat"><span className="ic"><IC.Layers /></span><b>Spaces</b><span>Group assessments by team, client or quarter.</span></div>
          <div className="site-feat"><span className="ic"><IC.Gauge /></span><b>Scoring</b><span>Weighted rubrics with calibration built in.</span></div>
          <div className="site-feat"><span className="ic"><IC.Bell /></span><b>Nudges</b><span>Reminders that respect everyone's time.</span></div>
        </div>
        <div className="site-foot"><span>© 2026 Casuro, Inc.</span><span>Privacy · Terms · Status</span></div>
      </div>
    );
  } else if (s.repo === "casuro/mockups") {
    page = (
      <div className="hd">
        <div className="hd-top"><IC.Headphones /><b># design-reviews huddle</b><span className="live">LIVE 04:12</span></div>
        <div className="hd-grid">
          {(["naman", "hana", "sofia", "lena"] as const).map((p, i) => (
            <div key={p} className={`hd-tile${i === 1 ? " talk" : ""}`}>
              <img className="avatar" src={FACES[p]} width={56} height={56} alt="" />
              <span>{NAMES[p]}</span>
            </div>
          ))}
        </div>
        <div className="hd-bar"><i><IC.Mic /></i><i><IC.Video /></i><i><IC.Monitor /></i><i className="leave"><IC.PhoneOff /></i></div>
      </div>
    );
  } else {
    const done = s.id === "s1";
    page = (
      <div className="adm">
        <div className="adm-side">
          {["Overview", "Jobs", "Migrations", "Spaces", "Settings"].map((x) => <div key={x} className={`it${x === "Jobs" ? " on" : ""}`}>{x}</div>)}
        </div>
        <div className="adm-main">
          <h2>assessment_spaces backfill</h2>
          <div className="sub">Migration 0142 · batches of 5,000 · staging</div>
          <div className="adm-kpis">
            <div className="adm-kpi"><span>Rows updated</span><b>{done ? "4,213,880" : "2,696,882"}</b></div>
            <div className="adm-kpi"><span>Batches</span><b>{done ? "843" : "540"}</b></div>
            <div className="adm-kpi"><span>Avg lock</span><b>182ms</b></div>
          </div>
          <div className="adm-bar"><i style={{ width: `${done ? 100 : 64}%` }} /></div>
          <div className="adm-tw">
            <table className="adm-tbl">
              <thead><tr><th>Batch</th><th>Rows</th><th>Lock</th><th>Status</th></tr></thead>
              <tbody>
                {[843, 842, 841, 840, 839].map((b, i) => (
                  <tr key={b}>
                    <td>#{done ? b : b - 303}</td>
                    <td>{i === 0 && done ? "3,880" : "5,000"}</td>
                    <td>{170 + i * 7}ms</td>
                    <td className={!done && i === 0 ? "run" : "ok"}>{!done && i === 0 ? "Running" : "Done"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <style>{PAGE_CSS}</style>
      {page}
    </>
  );
}

// ---------- The preview ----------

export function ClaudeCodePreview() {
  const ref = useRef<ClaudeCodeApp | null>(null);
  const agent = useRef<ReturnType<typeof createAgent> | null>(null);
  agent.current ??= createAgent(() => ref.current!);

  const claudeCode = useClaudeCode(CLAUDE_CODE_DEMO, {
    onEvent(event) {
      const cc = ref.current!;
      const a = agent.current!;
      switch (event.type) {
        case "prompt":
          return void setTimeout(() => void a.prompt(event.sessionId, event.text), 0);
        case "permission":
        case "plan":
          // Prompts the script awaits resolve by themselves; the seeded ones carry on here.
          return void a.resume[event.id]?.(event.answer);
        case "stop":
          return a.stop(event.sessionId);
        case "attach":
          return cc.attach(event.kind === "file" ? "ci-failure.log" : "screenshot-2026-09-28.png");
        case "terminal": {
          const s = cc.snapshot().sessions.find((x) => x.id === event.sessionId)!;
          return cc.terminal(event.sessionId, { output: termRun(s, event.command) });
        }
        case "createPr": {
          const checks = (done: number) => CHECKS.map((c, i) => ({ ...c, done: i < done }));
          cc.updateItem(event.id, { checks: checks(0) });
          [1800, 3200, 4300].forEach((ms, i) =>
            setTimeout(() => {
              cc.updateItem(event.id, { checks: checks(i + 1) });
              if (i === 2) cc.toast(`All checks passed on #${event.number}`);
            }, ms)
          );
          return;
        }
        case "action": {
          const s = event.sessionId ? cc.snapshot().sessions.find((x) => x.id === event.sessionId) : null;
          const pr = s ? [...s.items].reverse().find((i) => i.type === "pr") : null;
          if (event.label === "View PR") return cc.toast(`Opening github.com/${s?.repo}/pull/${pr && pr.type === "pr" ? pr.number : ""} (mockup)`, { icon: "ext" });
          if (event.label === "Help & support") return cc.toast("Help center opens in your browser (mockup)", { icon: "help" });
          if (event.label === "Log out") return cc.toast("Logged out of naman@casuro.com (mockup)", { icon: "logout" });
          return;
        }
        case "preview":
          if (event.action === "open") cc.toast("Opening localhost in your browser (mockup)", { icon: "ext" });
          return;
      }
    },
  });
  ref.current = claudeCode;

  // Session s3 is mid-run when the app opens.
  useEffect(() => {
    const t = setTimeout(() => {
      const s3 = ref.current!.snapshot().sessions.find((s) => s.id === "s3");
      const first = s3?.items[0];
      if (first?.type === "user" && s3!.items.length === 1) void agent.current!.scenario("s3", first.text);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  return <ClaudeCode claudeCode={claudeCode} renderPreview={(s) => <PreviewPage s={s} />} />;
}
