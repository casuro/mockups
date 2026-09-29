import { useRef } from "react";
import { ChatGPT, useChatGPT, type ChatGPTAnswerInput, type ChatGPTApp, type ChatGPTChatInput, type ChatGPTGpt, type ChatGPTMessageInput, type ChatGPTSeed, type ChatGPTTool, type RespondOptions, type StatusStep } from "../apps/chatgpt";
import { FACES } from "./faces";

// apps/chatgpt.html's workspace and demo script, driving the React version:
// the same GPTs, projects and chat history, and the mockup's keyword-routed
// canned answers streamed back through chatgpt.respond(). None of this is in
// the kit: it only draws what it is given.

/* ---------- Canned content ---------- */
const TXT: Record<string, string> = {};
TXT.sql = `Backfilling ~40M rows in a single \`UPDATE\` will hold row locks for a long time, bloat the table, and spike replication lag. Batch it by primary key range so every transaction stays small and restartable.

### 1. Add the column (instant, no rewrite)

\`\`\`sql
ALTER TABLE workspace_events
  ADD COLUMN region_id smallint;
\`\`\`

### 2. Backfill in keyset batches

\`\`\`sql
-- Run as a procedure so each batch commits on its own (Postgres 11+)
CREATE OR REPLACE PROCEDURE backfill_region_id(batch_size int DEFAULT 10000)
LANGUAGE plpgsql AS $$
DECLARE
  last_id bigint := 0;
  max_id  bigint;
  rows    int;
BEGIN
  SELECT max(id) INTO max_id FROM workspace_events;

  WHILE last_id < max_id LOOP
    UPDATE workspace_events e
       SET region_id = w.region_id
      FROM workspaces w
     WHERE w.id = e.workspace_id
       AND e.id > last_id
       AND e.id <= last_id + batch_size
       AND e.region_id IS NULL;

    GET DIAGNOSTICS rows = ROW_COUNT;
    RAISE NOTICE 'batch ending % updated % rows', last_id + batch_size, rows;

    last_id := last_id + batch_size;
    COMMIT;
    PERFORM pg_sleep(0.05); -- give replicas room to breathe
  END LOOP;
END $$;

CALL backfill_region_id(10000);
\`\`\`

### 3. Enforce it once the data is there

\`\`\`sql
ALTER TABLE workspace_events
  ADD CONSTRAINT workspace_events_region_id_not_null
  CHECK (region_id IS NOT NULL) NOT VALID;

ALTER TABLE workspace_events
  VALIDATE CONSTRAINT workspace_events_region_id_not_null;
\`\`\`

**A few tips**

- Set \`lock_timeout = '2s'\` in the session so a stuck batch fails fast instead of queueing behind autovacuum.
- Watch \`pg_stat_replication\` while it runs. If \`replay_lag\` climbs past a few seconds, raise the sleep or shrink the batch.
- Because every batch filters on \`region_id IS NULL\`, you can stop and rerun the procedure at any time. It picks up where it left off.`;

TXT.table = `Here's the September latency breakdown compared with August, sorted by p99:

| Endpoint | Requests | p50 | p95 | p99 | vs Aug (p99) |
|---|---|---|---|---|---|
| \`POST /v2/sync\` | 18.4M | 88 ms | 410 ms | 1,240 ms | +38% |
| \`GET /v2/workspaces/:id\` | 42.1M | 41 ms | 180 ms | 520 ms | +12% |
| \`POST /v2/events\` | 96.7M | 12 ms | 64 ms | 210 ms | -4% |
| \`GET /v2/search\` | 7.9M | 120 ms | 300 ms | 480 ms | -18% |
| \`GET /v2/me\` | 51.3M | 9 ms | 22 ms | 61 ms | 0% |

### What stands out

1. **\`/v2/sync\` is the outlier.** The p99 jump lines up with the Sept 12 deploy that turned on conflict resolution for shared docs. The p50 barely moved, so this is a long tail, not a general slowdown.
2. **Workspace reads regressed slightly** after the permissions change. Worth checking whether the new \`workspace_members\` join is hitting the index.
3. **Search got faster** thanks to the query cache Marcus shipped. That is the only endpoint that improved at every percentile.

### Suggested next steps

- Add a per-tenant breakdown for \`/v2/sync\` to see if a handful of very large workspaces explain the tail.
- Run \`EXPLAIN (ANALYZE, BUFFERS)\` on the workspace read path with a large workspace ID.
- Set an SLO alert at p99 > 800 ms for sync so the next regression pages someone.`;

TXT.email = `Here's a draft that confirms the timeline and keeps it short:

**Subject:** Re: Onboarding v4 launch timing

Hi Hana,

Thanks for pulling the research readout together so quickly. The findings on the empty-state drop-off were really useful.

On timing: we're on track to ship the new checklist to 10% of new workspaces on **Oct 14**, with the full rollout the following week if activation holds. The one open item is the invite step. Dev is finishing the SSO edge case and expects to wrap it by Thursday.

Could you share the interview clips for the "first project" moment? Lena wants to use two of them in the launch post.

Thanks,
Naman

---

Want me to make it more formal, or add a line about the metrics we'll track during the 10% rollout?`;

TXT.emailLatency = `Here's a short, calm version that gives Hana the facts and the plan:

**Subject:** Sync latency regression: what we know

Hi Hana,

Quick heads up on the \`/v2/sync\` latency regression. Since the Sept 12 deploy, p99 is up about 38% (1.24s), while p50 is basically unchanged. So most requests are fine, but the slowest ones are noticeably slower.

The likely cause is the new conflict resolution for shared docs on very large workspaces. Dev is adding a per-tenant breakdown today, and we'll have a fix or a rollback decision by Thursday.

No action needed from research, but I'll flag it if it affects the onboarding study sessions.

Thanks,
Naman

---

Want me to add the chart link or make it more detailed for the platform channel?`;

TXT.summary = `## Q4 roadmap at a glance

**Theme:** make Casuro the default place a team starts a project, not just where they finish it.

### Top priorities
1. **Onboarding v4** (Lena, Hana): new checklist, template gallery, and a guided first project. Goal: lift 7-day activation from 31% to 40%.
2. **Platform migration** (Dev, Marcus): Postgres 16 upgrade and the new event pipeline. Zero-downtime cutover planned for mid-November.
3. **Shared workspaces GA** (Sofia): permissions model, audit log, and admin controls for larger teams.

### Key dates
- **Oct 14:** Onboarding v4 at 10% of new signups
- **Nov 12:** Database cutover window
- **Dec 3:** Shared workspaces GA and pricing update

### Risks
- The migration and shared workspaces both touch the permissions tables. A slip in one pushes the other.
- Only one designer is staffed across onboarding and the admin console.

### Asks
- Approve a contractor for design support through December.
- Decide by Oct 10 whether audit log export ships in GA or fast-follows.`;

TXT.brainstorm = `Here are some directions for the onboarding copy, grouped by tone:

### Warm and encouraging
1. **"Let's get your first project off the ground."** Friendly, action-first, and sets up the checklist.
2. **"You're three steps from a workspace your team will actually use."** Concrete and a little playful.
3. **"Start small. We'll help with the rest."** Lowers the pressure for hesitant admins.

### Direct and practical
4. **"Invite your team, pick a template, ship something."** Mirrors the checklist exactly.
5. **"Set up in 5 minutes. Keep using it for years."** Speaks to time-to-value.

### Playful
6. **"Blank pages are overrated."** Pairs well with the template gallery.
7. **"Your team's new favorite tab."** Short enough for the browser title experiment.

### Microcopy for the checklist
- Step 1: *Name your workspace* -> "What should we call this place?"
- Step 2: *Invite teammates* -> "Work is better with company"
- Step 3: *Start from a template* -> "Borrow a head start"

If you tell me which tone Lena prefers, I can tighten the top three into final headline and subhead pairs.`;

TXT.code = `A practical pattern that accepts real-world addresses without trying to implement the full RFC 5322 grammar:

\`\`\`javascript
// Pragmatic email check: one @, no spaces, a dot in the domain, 2+ char TLD
const EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/;

export function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (email.length > 254) return false; // max length per RFC 5321
  return EMAIL_RE.test(email);
}
\`\`\`

**How it behaves**

| Input | Result | Why |
|---|---|---|
| \`naman@casuro.com\` | valid | standard address |
| \`hana.kim+beta@casuro.co\` | valid | plus tags are allowed |
| \`dev@casuro\` | invalid | no dot in the domain |
| \`lena @casuro.com\` | invalid | contains a space |

A few notes:

- Regex only tells you an address *looks* plausible. The only real check is sending a confirmation link.
- Keep validation identical on the client and server. Export this function from a shared package instead of copying the regex.
- If you need internationalized domains, normalize with \`domainToASCII\` before testing.`;

TXT.research = `# Real-time collaboration: build vs. buy

I reviewed Casuro's internal docs, the sync service design notes, and public engineering write-ups on collaborative editing. Here is a synthesis.

## Executive summary
Casuro should **keep building on the existing CRDT sync layer** rather than adopting a hosted collaboration service. The largest remaining cost is conflict resolution for structured data (tables, checklists), which a vendor would not solve for us either.

## Findings

### 1. Performance headroom
- Current sync p50 is 88 ms with a long p99 tail driven by large shared documents.
- Snapshotting documents above 2 MB would remove most of that tail.

### 2. Cost
| Option | Year 1 cost | Ongoing | Lock-in |
|---|---|---|---|
| Extend in-house CRDT | 2 engineers x 2 quarters | Low | None |
| Hosted collaboration service | License + integration | Grows with usage | High |

### 3. Risks
- Presence and cursors are the most visible features and the easiest to get wrong under packet loss.
- Offline edits merging after long gaps need explicit UX, not just correct math.

## Recommendation
1. Invest one quarter in snapshotting and compaction.
2. Ship presence v2 behind a flag to the Casuro team first.
3. Revisit in Q2 with real usage data.

*Sources: Casuro sync design doc, incident reviews INC-212 and INC-219, latency dashboards (September).*`;

TXT.search = `Here's what I found:

**Casuro status and releases**
- The latest release notes list **v4.2** as generally available, with the new template gallery and faster workspace search.
- The status page shows **no open incidents**. The last one was a 14-minute sync delay on Sept 22, resolved the same day.

**Recommended reading**
1. The *Getting started with shared workspaces* guide covers permissions and the new admin console.
2. The engineering blog post on moving to the new event pipeline explains why sync latency improved in October.

Want me to pull out anything specific, like the exact changelog items for v4.2?`;

TXT.review = `Thanks, here's a review against the Casuro engineering checklist.

### Must fix
1. **Unbounded query in \`listMembers\`.** The new code loads every member before filtering. For large workspaces this is thousands of rows per request. Push the filter into SQL and paginate.
2. **Swallowed error.** The \`catch\` block logs and returns \`[]\`, so callers can't tell "no members" from "database down". Rethrow as \`ServiceUnavailableError\`.

### Should fix
- Rename \`data\` to \`members\` so the intent is obvious at the call site.
- The migration adds an index without \`CONCURRENTLY\`. On \`workspace_members\` that will lock writes for several seconds.

\`\`\`sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  workspace_members_workspace_id_role_idx
  ON workspace_members (workspace_id, role);
\`\`\`

### Nice to have
- Add a test for a workspace with zero members and one for a removed member.

Overall the direction is good. Once the two must-fix items are addressed this is ready to merge.`;

TXT.brand = `Here's a version in the Casuro voice, plus two alternatives:

**Recommended**
> Everything your team needs to start a project, in one place. Invite people, pick a template, and get moving.

**Shorter**
> Start together. Finish faster.

**Warmer**
> Good work starts with the right people in the room. Bring them in and we'll handle the setup.

**What changed**
- Dropped "leverage" and "seamless". They read as filler in our guide.
- Led with the benefit, then the action.
- Kept sentences under 15 words so it scans on mobile.`;

const defaultText = (p: string) => `Good question. Here's how I'd think about **${p.replace(/[*_`#>|]/g, "").slice(0, 80)}${p.length > 80 ? "..." : ""}**:

1. **Start with the goal.** Write down what "done" looks like in one sentence. It keeps the rest of the work focused.
2. **List the constraints.** Time, people, and anything that can't change. Most decisions get easier once these are explicit.
3. **Pick the smallest next step.** Something you can finish today that makes the next step obvious.

If you share a bit more context, like who it's for and when it's due, I can turn this into a concrete plan or a draft.`;

const INTROS: (string | null)[] = [
  null,
  "Here's another take, a little more concise.\n\n",
  "Sure, trying again with a slightly different angle.\n\n",
];

const FOLLOWUPS: Record<string, string[]> = {
  sql: ["Make the backfill resumable from a checkpoint table", "Estimate how long 40M rows will take", "How do I monitor replication lag while it runs?"],
  table: ["Break down /v2/sync latency by workspace size", "Draft an SLO proposal from this data", "Turn this into a chart"],
  emailLatency: ["Make it more detailed for #platform", "Add a timeline of the regression", "Make it shorter"],
  email: ["Make it more formal", "Add the metrics we'll track", "Shorten it to three sentences"],
  summary: ["Turn this into a one-slide update", "What are the biggest dependencies?", "Draft the Oct 10 decision memo"],
  brainstorm: ["Tighten the top three into headline + subhead", "Write the empty-state copy too", "Which option fits a mobile screen best?"],
  code: ["Add unit tests for this function", "Support internationalized domains", "Write the same check in Python"],
  research: ["Summarize this for leadership in five bullets", "What would the snapshotting work involve?", "List open questions for the team"],
  search: ["Show the full v4.2 changelog", "What changed in the event pipeline?"],
  review: ["Rewrite listMembers with pagination", "Suggest a test plan for this change"],
  brand: ["Make it even shorter", "Write matching button copy"],
  image: ["Make it a wide banner", "Try a night-time version", "Use a flatter, more minimal style"],
  default: ["Give me a concrete example", "Turn this into a checklist", "What are the common pitfalls?"],
};

const THOUGHTS: Record<string, string[]> = {
  sql: ["The user wants to backfill a new column on a very large table without locking it or overwhelming replicas.", "Keyset batching with a commit per batch is safer than OFFSET or one big UPDATE. A NOT VALID constraint lets us enforce NOT NULL without a long scan under lock."],
  table: ["Comparing September against August by percentile. The sync endpoint's p99 moved much more than p50, which points to a tail problem rather than a general regression."],
  research: ["Scoping the question: build vs. buy for real-time collaboration.", "Pulling internal design notes, incident reviews, and latency dashboards, then comparing cost, risk, and lock-in."],
  default: ["Breaking the request into a goal, constraints, and a first step so the answer is actionable."],
};

const SOURCES = [
  { name: "Casuro Docs", host: "docs.casuro.com", color: "#1e6fd9" },
  { name: "Casuro Status", host: "status.casuro.com", color: "#12a37f" },
  { name: "Casuro Engineering Blog", host: "casuro.com/blog", color: "#e8603c" },
];

// Keyword router: picks a canned response for a prompt.
function route(prompt: string, tool: string | null, gpt: string | null) {
  const p = prompt.toLowerCase();
  if (tool === "image" || /\b(image|draw|illustrat\w*|logo|picture|poster|artwork|wallpaper|sketch)\b/.test(p)) return { kind: "image" };
  if (tool === "research") return { kind: "research" };
  if (gpt === "reviewer") return { kind: "review" };
  if (gpt === "brand") return { kind: "brand" };
  // Explicit intents win over topic keywords ("brainstorm ... analytics" is a brainstorm)
  if (/\b(brainstorm|ideas?)\b/.test(p)) return { kind: "brainstorm" };
  if (/\b(email|draft|reply|respond|message to|write to|letter)\b/.test(p)) return { kind: /latency|regression|incident|outage|slow/.test(p) ? "emailLatency" : "email" };
  if (/\b(summar\w*|tl;?dr|recap|key points)\b/.test(p)) return { kind: "summary" };
  if (/\b(sql|postgres\w*|migrations?|backfill|query|index|database|schema)\b/.test(p)) return { kind: "sql" };
  if (/\b(regex|code|function|javascript|typescript|python|bug|script|api|refactor|tests?)\b/.test(p)) return { kind: "code" };
  if (/\b(table|data|analy\w*|compare|latency|metrics?|csv|numbers|chart|report)\b/.test(p)) return { kind: "table" };
  if (/\broadmap\b/.test(p)) return { kind: "summary" };
  if (/\b(names?|taglines?|suggest\w*|copy|headlines?)\b/.test(p)) return { kind: "brainstorm" };
  if (tool === "search") return { kind: "search" };
  return { kind: "default" };
}

const TITLES: Record<string, string> = { emailLatency: "Latency update email", sql: "Batched Postgres backfill", table: "Latency analysis", email: "Draft reply email", summary: "Roadmap summary", brainstorm: "Copy ideas", code: "Email validation regex", research: "Collaboration build vs buy", search: "Casuro release news", review: "Code review feedback", brand: "Brand voice rewrite" };
const textFor = (kind: string, prompt: string) => (kind === "default" ? defaultText(prompt) : (TXT[kind] ?? ""));

/* ---------- Generated artwork (deterministic SVG, as a picture URL) ---------- */
let artN = 0;
function rng(seed: number) {
  // mulberry32 on a scrambled seed so neighbouring seeds look different
  let a = (Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function art(seed: number) {
  const r = rng(seed), id = "art" + (++artN);
  const palettes = [["#0f766e", "#14b8a6", "#fda4af", "#fb7185", "#fff1e6"], ["#1e3a8a", "#6366f1", "#f9a8d4", "#fbbf24", "#fef3c7"], ["#134e4a", "#2dd4bf", "#fecaca", "#f97316", "#ecfeff"]];
  const [deep, mid, soft, hot, light] = palettes[seed % palettes.length];
  const sunX = 140 + r() * 120, sunY = 150 + r() * 40;
  const ridge = (base: number, amp: number, n: number) => { let d = `M0 ${base}`; for (let i = 0; i <= n; i++) { const x = (400 / n) * i, y = base - amp * (0.4 + r() * 0.6) * (i % 2 ? 1 : 0.45); d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; } return d + " L400 400 L0 400 Z"; };
  const stars = Array.from({ length: 14 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 120).toFixed(0)}" r="${(0.8 + r() * 1.6).toFixed(1)}" fill="${light}" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`).join("");
  const birds = Array.from({ length: 3 }, (_, i) => { const x = 250 + i * 22 + r() * 10, y = 90 + r() * 30; return `<path d="M${x} ${y} q5 -5 10 0 q5 -5 10 0" stroke="${deep}" stroke-width="2" fill="none" stroke-linecap="round"/>`; }).join("");
  return `<svg class="art" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mid}"/><stop offset=".55" stop-color="${soft}"/><stop offset="1" stop-color="${hot}"/></linearGradient>
    <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${light}"/><stop offset=".6" stop-color="${light}" stop-opacity=".9"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hot}" stop-opacity=".9"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>
    <rect width="400" height="400" fill="url(#${id}s)"/>${stars}
    <circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="92" fill="url(#${id}g)" opacity=".55"/><circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="46" fill="${light}"/>
    ${birds}
    <path d="${ridge(250, 110, 7)}" fill="${mid}" opacity=".75"/>
    <path d="${ridge(290, 90, 9)}" fill="${deep}" opacity=".85"/>
    <rect y="318" width="400" height="82" fill="url(#${id}w)"/>
    <path d="M0 330 Q100 322 200 330 T400 330" stroke="${light}" stroke-opacity=".35" stroke-width="2" fill="none"/>
    <path d="M40 352 Q140 344 240 352 T440 352" stroke="${light}" stroke-opacity=".2" stroke-width="2" fill="none"/>
    <polygon points="${(sunX - 30).toFixed(0)},318 ${(sunX + 30).toFixed(0)},318 ${(sunX + 8).toFixed(0)},392 ${(sunX - 8).toFixed(0)},392" fill="${light}" opacity=".18"/></svg>`;
}

const artUrl = (seed: number) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(art(seed).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))}`;

/* ---------- The workspace ---------- */
const PEOPLE = {
  naman: { name: "Naman Shukla", photo: FACES.naman },
  hana: { name: "Hana Kim", photo: FACES.hana },
  marcus: { name: "Marcus Chen", photo: FACES.marcus },
  sofia: { name: "Sofia Alvarez", photo: FACES.sofia },
  dev: { name: "Dev Patel", photo: FACES.dev },
  lena: { name: "Lena Okafor", photo: FACES.lena },
};

const GPTS: ChatGPTGpt[] = [
  { id: "reviewer", name: "Casuro Code Reviewer", author: PEOPLE.dev, color: "#1e6fd9", glyph: "code", pinned: true,
    description: "Reviews diffs against Casuro engineering standards: naming, error handling, tests, and migration safety.",
    starters: ["Review this pull request diff", "Is this migration safe to run online?", "Suggest tests for this function", "Explain our error handling conventions"] },
  { id: "brand", name: "Brand Voice", author: PEOPLE.lena, color: "#e8603c", glyph: "pen", pinned: true,
    description: "Rewrites copy in the Casuro voice: warm, direct, and jargon-free. Trained on the v4 brand guide.",
    starters: ["Rewrite this headline in our voice", "Make this error message friendlier", "Draft a changelog entry", "Check this email for tone"] },
  { id: "metrics", name: "Metrics Explorer", author: PEOPLE.marcus, color: "#12a37f", glyph: "chart", pinned: true,
    description: "Knows the Casuro warehouse schema. Ask for SQL, metric definitions, or a quick read on a dashboard.",
    starters: ["Weekly active workspaces by plan", "Define activation for v4", "Why did p95 latency spike Tuesday?", "Write SQL for 30-day retention"] },
  { id: "support", name: "Support Macro Writer", author: PEOPLE.sofia, color: "#8b5cf6", glyph: "headset",
    description: "Turns a messy ticket thread into a clear, empathetic reply and a reusable macro.",
    starters: ["Turn this ticket into a macro", "Reply to a billing question", "Apologize for yesterday's outage", "Summarize this thread"] },
  { id: "interview", name: "Interview Kit", author: PEOPLE.hana, color: "#d97706", glyph: "checklist",
    description: "Builds structured interview loops, scorecards, and debrief notes for Casuro roles.",
    starters: ["Create a loop for a senior backend role", "Write a take-home prompt", "Draft a scorecard", "Summarize my interview notes"] },
];

/** A canned answer of a kind, as the kit takes it. */
function answer(kind: string, opts: { text?: string; thought?: number; model?: string; image?: number; prompt?: string } = {}): ChatGPTAnswerInput {
  return {
    text: opts.text ?? textFor(kind, opts.prompt ?? ""),
    model: opts.model ?? "auto",
    followups: FOLLOWUPS[kind],
    ...(opts.thought ? { thought: { seconds: opts.thought, notes: THOUGHTS[kind] ?? THOUGHTS.default } } : {}),
    ...(opts.image !== undefined ? { image: { src: artUrl(opts.image), alt: "Generated illustration" } } : {}),
  };
}
const U = (text: string, files?: { name: string; type: string }[]): ChatGPTMessageInput => ({ role: "user", text, files });
const A = (kind: string, opts: Parameters<typeof answer>[1] = {}): ChatGPTMessageInput => ({ role: "assistant", ...answer(kind, opts) });

// The regex chat has two versions of its answer, to show the version switcher.
const REGEX: ChatGPTMessageInput = {
  role: "assistant",
  v: 1,
  versions: [
    answer("code", { text: `The simplest regex that works well in practice:

\`\`\`javascript
const isValidEmail = (s) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);
\`\`\`

It checks for exactly one \`@\`, no spaces, and a dot in the domain. Anything stricter tends to reject valid addresses, so pair it with a confirmation email.` }),
    answer("code"),
  ],
};

const NOW = Date.now(), H = 3600e3, D = 24 * H;

const CHATS: ChatGPTChatInput[] = [
  { id: "c-backfill", title: "Batching a Postgres backfill", at: NOW - 1.2 * H, messages: [
    U("I need to backfill region_id on workspace_events (about 40M rows) from the workspaces table. How do I do this in Postgres without locking the table or wrecking replication?"),
    A("sql", { thought: 9, model: "thinking" }) ] },
  { id: "c-hana", title: "Draft reply to Hana", at: NOW - 3.5 * H, messages: [
    U("Help me draft a reply to Hana. She asked when onboarding v4 is launching and whether she can share research clips. We ship to 10% on Oct 14, Dev is finishing the SSO edge case by Thursday, and Lena wants two clips for the launch post."),
    A("email") ] },
  { id: "c-latency", title: "Latency report analysis", at: NOW - 1 * D - 2 * H, messages: [
    U("Here's the September latency export. Compare it with August and tell me what stands out.", [{ name: "latency-sept-2026.csv", type: "csv" }]),
    A("table") ] },
  { id: "c-regex", title: "Regex for email validation", at: NOW - 1 * D - 6 * H, messages: [
    U("Give me a regex for email validation in JavaScript that won't reject real addresses"),
    REGEX ] },
  { id: "c-copy", title: "Onboarding copy ideas", at: NOW - 3 * D, messages: [
    U("Brainstorm headline ideas for the new onboarding checklist. Audience is workspace admins setting up Casuro for the first time."),
    A("brainstorm") ] },
  { id: "c-art", title: "Launch illustration concepts", at: NOW - 4 * D, messages: [
    U("Create an illustration for the Casuro v4 launch blog post: a friendly geometric landscape at sunrise, in teal and coral"),
    A("image", { text: "", image: 6 }),
    U("Love it. Can you try a version with a deeper blue sky?"),
    A("image", { text: "", image: 10 }) ] },
  { id: "c-q4", title: "Q4 roadmap summary", at: NOW - 6 * D, messages: [
    U("Summarize the Q4 roadmap doc into something I can paste into the leadership update.", [{ name: "Q4-roadmap-v3.pdf", type: "pdf" }]),
    A("summary") ] },
  { id: "c-standup", title: "Standup notes template", at: NOW - 12 * D, messages: [
    U("Make me a lightweight standup notes template for the platform team"),
    A("default", { text: `Here's a template that fits in a single Slack message:

**Yesterday**
- What shipped or moved forward

**Today**
- The one thing that matters most

**Blockers**
- Anything waiting on another person (tag them)

**Heads up**
- Deploys, on-call handoffs, or risky migrations

Keep each section to one or two bullets. If a blocker needs discussion, take it to a thread so standup stays under ten minutes.` }) ] },
  { id: "c-crdt", title: "Explain CRDTs simply", at: NOW - 19 * D, messages: [
    U("Explain CRDTs like I'm new to distributed systems"),
    A("default", { text: `Imagine you and a teammate each have a copy of the same shopping list, and you both edit it on a plane with no Wi-Fi. When you land, the lists need to merge without anyone choosing a winner.

A **CRDT** (conflict-free replicated data type) is a data structure designed so that:

1. **Every copy can be edited independently**, even offline.
2. **Merging is automatic** and always produces the same result, no matter the order the edits arrive in.
3. **No central server has to referee.**

The trick is that each edit carries enough information (like a unique ID and a logical timestamp) that merges are just math. Adding "milk" twice from two devices is recognized as the same kind of change, and a deletion and an insert at the same spot resolve the same way everywhere.

That's why Casuro's shared docs keep working offline: every device holds a CRDT, and sync just exchanges edits.` }) ] },
  { id: "c-offsite", title: "Offsite agenda ideas", at: NOW - 25 * D, archived: true, messages: [
    U("Ideas for a two-day team offsite agenda"), A("brainstorm") ] },
  { id: "c-welcome", title: "Welcome email sequence", at: NOW - 2 * D, project: "p-onb", messages: [
    U("Draft a 3-email welcome sequence for new workspace admins"), A("email", { text: `Here's a three-part sequence, spaced over the first week:

**Email 1 (day 0): "Your workspace is ready"**
Welcome them, link straight to the checklist, and promise it takes five minutes.

**Email 2 (day 2): "Bring your team in"**
Show the invite flow and the "first shared project" template. One button, nothing else.

**Email 3 (day 6): "Here's what your team built"**
Summarize their activity and suggest one next step based on what they haven't tried yet.

Want me to write the full copy for each?` }) ] },
  { id: "c-activation", title: "Activation metric definitions", at: NOW - 5 * D, project: "p-onb", messages: [
    U("How should we define activation for onboarding v4?"), A("default", { text: `A good activation definition is **observable, early, and predictive of retention**. For v4 I'd propose:

> A workspace is **activated** when at least **two members** have **edited the same project** within **24 hours** of creation.

- **Two members** captures the collaborative value, not just solo setup.
- **Same project** filters out people poking around separately.
- **24 hours** keeps it tied to onboarding, not later behavior.

Validate it by checking that activated workspaces retain at a meaningfully higher rate at day 30 than non-activated ones.` }) ] },
  { id: "c-runbook", title: "Cutover runbook checklist", at: NOW - 1 * D - 9 * H, project: "p-mig", messages: [
    U("Write a checklist for the Postgres 16 cutover night"), A("default", { text: `**T-24h**
- Freeze schema changes and confirm the replica is caught up
- Announce the window in #platform and on the status page

**T-1h**
- Snapshot the primary, verify the backup restores
- Scale down background workers

**Cutover**
1. Put the API in read-only mode
2. Wait for replication lag to hit zero
3. Promote the PG16 replica and swap the connection string
4. Run smoke tests: sign in, open a workspace, sync an edit

**Rollback trigger**
- Error rate above 2% for 5 minutes, or any failed smoke test

**After**
- Re-enable workers, lift read-only, post the all-clear` }) ] },
  { id: "c-kafka", title: "Event pipeline consumer lag", at: NOW - 8 * D, project: "p-mig", messages: [
    U("Why would consumer lag spike every night around 2am?"), A("default", { text: `A nightly spike at a fixed time usually means **something scheduled is competing for the same resources**. The usual suspects:

1. **Batch jobs** like the nightly analytics export producing a burst of events.
2. **Compaction or retention cleanup** on the brokers slowing reads.
3. **Consumer rebalances** triggered by a deploy or autoscaling event at the same time.

Check the producer rate for that window first. If it jumps, spread the batch job out or give it its own topic.` }) ] },
];

export const CHATGPT_DEMO: ChatGPTSeed = {
  me: { name: PEOPLE.naman.name, email: "naman@casuro.com", photo: PEOPLE.naman.photo },
  workspace: "Casuro workspace",
  plan: "Team",
  gpts: GPTS,
  projects: [
    { id: "p-onb", name: "Onboarding v4", open: true },
    { id: "p-mig", name: "Platform migration" },
  ],
  chats: CHATS,
  recentFiles: [
    { name: "Q4-roadmap-v3.pdf", type: "pdf", when: "Edited yesterday" },
    { name: "latency-sept-2026.csv", type: "csv", when: "Uploaded 2 days ago" },
    { name: "onboarding-checklist-flow.png", type: "png", when: "Shared by Lena Okafor" },
    { name: "pg16-migration-plan.docx", type: "docx", when: "Shared by Dev Patel" },
    { name: "brand-voice-guide.md", type: "md", when: "Shared by Lena Okafor" },
  ],
};

const TOASTS: Record<string, string> = {
  library: "Library isn't part of this preview",
  explore: "Explore GPTs isn't part of this preview",
  "new-project": "New project isn't part of this preview",
  report: "Thanks, your report was submitted",
  "code-edit": "Canvas isn't part of this preview",
  Workspace: "You're in the Casuro workspace",
  "Help center": "Help center opened in a new tab",
  "Release notes": "Release notes opened in a new tab",
  "Terms & policies": "Terms & policies opened in a new tab",
  "Log out": "Logged out of Casuro workspace (preview)",
};

export function ChatGPTPreview() {
  const ref = useRef<ChatGPTApp | null>(null);

  // The mockup's demo: route the prompt to a canned answer and stream it back.
  const reply = (chatId: string, prompt: string, tool: ChatGPTTool | null, model: string, gpt: string | null, change: { intro?: string | null; concise?: boolean } = {}) => {
    const kind = route(prompt, tool, gpt).kind;
    const thinking = model === "thinking" || model === "pro" || (model === "auto" && (kind === "sql" || kind === "research"));
    let text = kind === "image" ? "" : textFor(kind, prompt);
    if (change.intro) text = change.intro + text;
    if (change.concise) text = text.split("\n\n").slice(0, 3).join("\n\n");
    let status: StatusStep[] | undefined;
    if (kind === "image") status = undefined;
    else if (tool === "research") status = [{ text: "Researching", ms: 1100, sub: "Reading 12 sources" }, { text: "Researching", ms: 1100, sub: "Comparing options" }, { text: "Thinking", ms: 900 }];
    else if (tool === "search" || kind === "search") status = [{ text: "Searching the web", ms: 1500 }];
    else if (thinking) status = [{ text: "Thinking", ms: 1700 }];
    const waited = (status ?? []).reduce((n, s) => n + (s.ms ?? 0), 0);
    const options: RespondOptions = {
      status,
      followups: FOLLOWUPS[kind],
      title: TITLES[kind],
      ...(thinking || tool === "research" ? { thought: { seconds: Math.round(waited / 1000) + (tool === "research" ? 180 : 4), notes: THOUGHTS[kind] ?? THOUGHTS.default } } : {}),
      ...(tool === "search" || kind === "search" ? { sources: SOURCES } : {}),
      ...(kind === "image" ? { image: { src: artUrl(Math.floor(Math.random() * 1e6)), alt: "Generated illustration" } } : {}),
    };
    void ref.current!.respond(chatId, text, options);
  };

  const chatgpt = useChatGPT(CHATGPT_DEMO, {
    onEvent(event) {
      const s = ref.current!;
      const chat = (id: string) => s.state.chats.find((c) => c.id === id);
      if (event.type === "prompt") reply(event.chatId, event.text, event.tool, event.model, event.gpt);
      if (event.type === "edit") reply(event.chatId, event.text, null, event.model, chat(event.chatId)?.gpt ?? null);
      if (event.type === "regenerate") {
        const m = chat(event.chatId)?.messages.find((x) => x.id === event.messageId);
        const before = (m?.versions.length ?? 1) - 1;
        const intro = event.mode === "concise" ? "Short version:\n\n" : event.mode === "details" ? "Here's a more detailed version.\n\n" : event.mode === "again" ? INTROS[1 + (before % 2)] : null;
        reply(event.chatId, event.prompt, event.mode === "search" ? "search" : null, event.model, chat(event.chatId)?.gpt ?? null, { intro, concise: event.mode === "concise" });
      }
      if (event.type === "dictate") {
        const phrase = "Can you summarize the key risks in the platform migration plan and who owns each one?";
        const now = s.composer.text;
        s.draft((now ? now.replace(/\s*$/, " ") : "") + phrase);
      }
      if (event.type === "action") {
        const text = event.kind === "source" ? `Opened ${event.label}` : TOASTS[event.kind] ?? (event.label ? TOASTS[event.label] : undefined);
        if (text) s.toast(text);
      }
    },
  });
  ref.current = chatgpt;

  return <ChatGPT chatgpt={chatgpt} />;
}
