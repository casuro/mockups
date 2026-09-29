import { useRef } from "react";
import { Supabase, useSupabase, type SupabaseApp, type SupabaseColumn, type SupabaseResult, type SupabaseRow, type SupabaseSeed, type SupabaseTableSeed } from "../apps/supabase";
import { FACES } from "./faces";

// apps/supabase.html's project and demo, driving the React version: the
// same casuro-core tables made by the same seeded generator, the same saved
// queries, and the same canned answers when you press Run (the kit has no SQL
// engine: Run emits `run-sql` and this file answers with `setResult`).

// ---------- A seeded generator, so ids and numbers never change ----------

function prng(str: string) {
  let h = 2166136261 >>> 0;
  for (const c of str) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type R = () => number;
const pick = <T,>(r: R, list: T[]) => list[Math.floor(r() * list.length)];
const int = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
function uuid(r: R) {
  const n = (k: number) => Array.from({ length: k }, () => Math.floor(r() * 16).toString(16)).join("");
  return `${n(8)}-${n(4)}-4${n(3)}-${"89ab"[Math.floor(r() * 4)]}${n(3)}-${n(12)}`;
}
const tsz = (ms: number) => {
  const s = new Date(ms).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 23)}+00`;
};
const MIN = 60e3;
const HR = 60 * MIN;
const DAY = 24 * HR;
const NOW = Date.now();

// ---------- casuro-core's public schema ----------
// Migration #912 added assessment_spaces.owner_id and is backfilling it from
// the legacy space_owner column; RLS on the table waits for that (CAS-924).

const FIRST = ["Ava", "Liam", "Maya", "Noah", "Zara", "Ethan", "Priya", "Owen", "Leila", "Jonas", "Mei", "Tariq", "Elena", "Kofi", "Ines", "Ravi", "Sana", "Theo", "Yuki", "Mateo", "Amara", "Felix", "Nadia", "Omar", "Clara", "Diego", "Hugo", "Isla", "Kenji", "Lucia"];
const LAST = ["Moreau", "Okoye", "Lindqvist", "Tanaka", "Haddad", "Novak", "Ferreira", "Brennan", "Castillo", "Ibrahim", "Varga", "Nakamura", "Quinn", "Sato", "Delgado", "Achebe", "Rossi", "Kowalski", "Mbeki", "Larsen"];
const ORGS: [string, string, string][] = [
  ["Casuro", "casuro", "enterprise"], ["Northwind Labs", "northwind-labs", "team"], ["Brightline Health", "brightline", "pro"], ["Kestrel Robotics", "kestrel", "team"],
  ["Harbor & Pine", "harbor-pine", "pro"], ["Lumen Freight", "lumen-freight", "free"], ["Quillfield", "quillfield", "pro"], ["Orbital Parcel", "orbital-parcel", "team"],
  ["Tessellate AI", "tessellate", "enterprise"], ["Fernway Bank", "fernway", "enterprise"], ["Cobalt Studio", "cobalt-studio", "free"], ["Meridian Care", "meridian-care", "pro"],
];
const TEAM: [string, string, string][] = [["Naman Shukla", "naman", "owner"], ["Hana Kim", "hana", "admin"], ["Marcus Chen", "marcus", "admin"], ["Sofia Alvarez", "sofia", "member"], ["Dev Patel", "dev", "admin"], ["Lena Okafor", "lena", "member"]];
const ROLES = ["Backend Engineer", "Frontend Engineer", "Support Lead", "Data Analyst", "Product Designer", "Site Reliability Engineer", "Account Executive", "Engineering Manager", "QA Engineer", "Solutions Architect"];
const KINDS = ["Take-home", "Live pairing", "Incident drill", "System design", "Customer escalation", "Code review"];
const COUNTS = { assessment_spaces: 1284, audit_logs: 4210, candidates: 3912, organizations: 12, submissions: 8406, users: 48 };

const C = (name: string, type: string, o: Partial<SupabaseColumn> = {}): SupabaseColumn => ({ name, type, ...o });

function organizations() {
  const r = prng("organizations");
  return ORGS.map(([name, slug, plan], i) => ({ id: uuid(r), name, slug, plan, seats: plan === "free" ? 3 : plan === "pro" ? int(r, 5, 25) : int(r, 30, 400), created_at: tsz(NOW - (900 - i * 60) * DAY + int(r, 0, DAY)) }));
}
function users(orgs: SupabaseRow[]) {
  const r = prng("users");
  const out: SupabaseRow[] = TEAM.map(([full_name, h, role], i) => ({ id: uuid(r), email: `${h}@casuro.com`, full_name, role, organization_id: orgs[0].id, is_admin: role !== "member", last_sign_in_at: tsz(NOW - int(r, 5, 600) * MIN), created_at: tsz(NOW - (700 - i * 20) * DAY) }));
  for (let i = out.length; i < COUNTS.users; i++) {
    const f = pick(r, FIRST), l = pick(r, LAST), org = orgs[1 + (i % (orgs.length - 1))];
    out.push({
      id: uuid(r), email: `${f[0].toLowerCase()}.${l.toLowerCase()}@${String(org.slug).replace(/-/g, "")}.com`, full_name: r() < 0.08 ? null : `${f} ${l}`, role: pick(r, ["member", "member", "recruiter", "admin"]),
      organization_id: org.id, is_admin: r() < 0.2, last_sign_in_at: r() < 0.1 ? null : tsz(NOW - int(r, 1, 30 * 24 * 60) * MIN), created_at: tsz(NOW - int(r, 20, 600) * DAY),
    });
  }
  return out;
}
function assessmentSpaces(people: SupabaseRow[]) {
  const r = prng("assessment_spaces");
  const assessments = Array.from({ length: 40 }, () => uuid(r));
  const out: SupabaseRow[] = [];
  for (let i = 0; i < COUNTS.assessment_spaces; i++) {
    const owner = people[i % 9 === 0 ? int(r, 0, 5) : int(r, 6, people.length - 1)], legacy = r() < 0.17;
    out.push({
      id: uuid(r), name: `${pick(r, ROLES)} - ${pick(r, KINDS)}`, assessment_id: pick(r, assessments), space_id: r() < 0.03 ? null : 1000 + i * 7 + int(r, 0, 6),
      owner_id: legacy ? null : owner.id, space_owner: owner.email, is_archived: r() < 0.12,
      settings: { time_limit: pick(r, [45, 60, 90, 120]), proctoring: r() < 0.6, language: pick(r, ["ts", "py", "go", "sql", "any"]) },
      created_at: tsz(NOW - (COUNTS.assessment_spaces - i) * 9.5 * HR - int(r, 0, HR)),
    });
  }
  return out;
}
function candidates(orgs: SupabaseRow[]) {
  const r = prng("candidates");
  const out: SupabaseRow[] = [];
  for (let i = 0; i < COUNTS.candidates; i++) {
    const f = pick(r, FIRST), l = pick(r, LAST), stage = pick(r, ["applied", "screen", "assessment", "assessment", "onsite", "offer", "rejected"]);
    out.push({ id: uuid(r), full_name: `${f} ${l}`, email: `${f.toLowerCase()}.${l.toLowerCase()}${int(r, 1, 99)}@example.com`, organization_id: orgs[1 + int(r, 0, orgs.length - 2)].id, stage, score: stage === "applied" || stage === "screen" ? null : int(r, 38, 98), created_at: tsz(NOW - (COUNTS.candidates - i) * 3.1 * HR) });
  }
  return out;
}
function submissions(cands: SupabaseRow[], spaces: SupabaseRow[]) {
  const r = prng("submissions");
  const out: SupabaseRow[] = [];
  for (let i = 0; i < COUNTS.submissions; i++) {
    const status = pick(r, ["graded", "graded", "graded", "submitted", "in_progress"]), total = pick(r, [12, 16, 20]), passed = int(r, Math.floor(total / 3), total);
    out.push({
      id: uuid(r), candidate_id: pick(r, cands).id, assessment_space_id: pick(r, spaces).id, status, score: status === "graded" ? Math.round((passed / total) * 100) : null,
      payload: { language: pick(r, ["ts", "py", "go", "sql"]), tests_passed: passed, tests_total: total }, submitted_at: status === "in_progress" ? null : tsz(NOW - (COUNTS.submissions - i) * 1.4 * HR - int(r, 0, HR)),
    });
  }
  return out;
}
function auditLogs(people: SupabaseRow[]) {
  const r = prng("audit_logs");
  const out: SupabaseRow[] = [];
  for (let i = 0; i < COUNTS.audit_logs; i++) {
    const action = pick(r, ["space.create", "space.archive", "candidate.invite", "submission.grade", "owner.backfill", "owner.backfill", "policy.update", "user.sign_in"]);
    const metadata: SupabaseRow = action === "owner.backfill" ? { batch: 1 + Math.floor(i / 12), rows: 5000, pr: 912 } : action === "user.sign_in" ? { provider: pick(r, ["email", "google", "sso"]) } : { source: pick(r, ["dashboard", "api"]) };
    out.push({ id: 10000 + i, actor_id: action === "owner.backfill" ? null : pick(r, people).id, action, target: action === "user.sign_in" ? null : `${action.split(".")[0]}/${uuid(r).slice(0, 8)}`, metadata, created_at: tsz(NOW - (COUNTS.audit_logs - i) * 37 * MIN) });
  }
  return out;
}

const ORG_ROWS = organizations();
const USER_ROWS = users(ORG_ROWS);
const SPACE_ROWS = assessmentSpaces(USER_ROWS);
const CANDIDATE_ROWS = candidates(ORG_ROWS);

const TABLES: SupabaseTableSeed[] = [
  { name: "assessment_spaces", rls: false, rows: SPACE_ROWS, columns: [
    C("id", "uuid", { primaryKey: true, default: "gen_random_uuid()" }), C("name", "text"), C("assessment_id", "uuid"), C("space_id", "int8", { nullable: true }),
    C("owner_id", "uuid", { nullable: true, references: "users.id" }), C("space_owner", "text", { nullable: true }), C("is_archived", "bool", { default: "false" }),
    C("settings", "jsonb", { default: "'{}'::jsonb" }), C("created_at", "timestamptz", { default: "now()" })] },
  { name: "audit_logs", policies: 1, rows: auditLogs(USER_ROWS), columns: [
    C("id", "int8", { primaryKey: true, identity: true }), C("actor_id", "uuid", { nullable: true, references: "users.id" }), C("action", "text"), C("target", "text", { nullable: true }),
    C("metadata", "jsonb", { default: "'{}'::jsonb" }), C("created_at", "timestamptz", { default: "now()" })] },
  { name: "candidates", policies: 3, rows: CANDIDATE_ROWS, columns: [
    C("id", "uuid", { primaryKey: true, default: "gen_random_uuid()" }), C("full_name", "text"), C("email", "text"), C("organization_id", "uuid", { references: "organizations.id" }),
    C("stage", "text", { default: "'applied'::text" }), C("score", "int8", { nullable: true }), C("created_at", "timestamptz", { default: "now()" })] },
  { name: "organizations", policies: 2, rows: ORG_ROWS, columns: [
    C("id", "uuid", { primaryKey: true, default: "gen_random_uuid()" }), C("name", "text"), C("slug", "text"), C("plan", "text", { default: "'free'::text" }),
    C("seats", "int8", { default: "5" }), C("created_at", "timestamptz", { default: "now()" })] },
  { name: "submissions", policies: 4, rows: submissions(CANDIDATE_ROWS, SPACE_ROWS), columns: [
    C("id", "uuid", { primaryKey: true, default: "gen_random_uuid()" }), C("candidate_id", "uuid", { references: "candidates.id" }), C("assessment_space_id", "uuid", { references: "assessment_spaces.id" }),
    C("status", "text", { default: "'in_progress'::text" }), C("score", "int8", { nullable: true }), C("payload", "jsonb", { default: "'{}'::jsonb" }), C("submitted_at", "timestamptz", { nullable: true })] },
  { name: "users", policies: 2, rows: USER_ROWS, columns: [
    C("id", "uuid", { primaryKey: true }), C("email", "text"), C("full_name", "text", { nullable: true }), C("role", "text", { default: "'member'::text" }),
    C("organization_id", "uuid", { references: "organizations.id" }), C("is_admin", "bool", { default: "false" }), C("last_sign_in_at", "timestamptz", { nullable: true }), C("created_at", "timestamptz", { default: "now()" })] },
];

const SNIPPETS = [
  { id: "backfill", name: "Owner backfill progress", sql:
`-- #912: how many assessment_spaces still have no owner?
select
  count(*) filter (where owner_id is null) as missing_owner,
  count(*) as total,
  round(100.0 * count(*) filter (where owner_id is not null) / count(*), 1) as pct_done
from public.assessment_spaces;` },
  { id: "per-owner", name: "Spaces per owner", sql:
`select u.full_name, u.email, count(s.id) as spaces
from public.assessment_spaces s
join public.users u on u.id = s.owner_id
group by u.id
order by spaces desc
limit 10;` },
  { id: "owner-index", name: "Index on owner_id", sql:
`create index concurrently if not exists assessment_spaces_owner_id_idx
  on public.assessment_spaces (owner_id);` },
  { id: "owner-rls", name: "Owner-scoped RLS (CAS-924)", sql:
`alter table public.assessment_spaces enable row level security;

create policy "Owners can read their spaces"
  on public.assessment_spaces for select
  to authenticated
  using ((select auth.uid()) = owner_id);` },
  { id: "recent", name: "Recent graded submissions", sql:
`select id, status, score, submitted_at
from public.submissions
where status = 'graded'
order by submitted_at desc
limit 20;` },
];
const ORIGINAL = Object.fromEntries(SNIPPETS.map((s) => [s.id, s.sql]));

export const SUPABASE_DEMO: SupabaseSeed = {
  organization: { name: "Casuro", plan: "Pro" },
  project: { name: "casuro-core", ref: "kqzvbndfrhxmyetwlpso", region: "us-east-1", branch: "main" },
  user: { name: "Naman Shukla", email: "naman@casuro.com", photo: FACES.naman },
  schemas: [{ name: "public", tables: TABLES }, { name: "auth", tables: [] }, { name: "storage", tables: [] }],
  snippets: SNIPPETS,
  open: { view: "table", tables: ["assessment_spaces", "users"], snippets: ["backfill", "owner-rls"] },
};

// ---------- Run: canned answers from the rows on screen ----------

function answer(app: SupabaseApp, id: string, text: string): SupabaseResult {
  const rows = (name: string) => app.state.tables[`public.${name}`]?.rows ?? [];
  const sql = text.replace(/--.*$/gm, "").trim();
  if (!sql) return { error: "ERROR:  42601: syntax error at end of input" };
  if (text === ORIGINAL[id]) {
    if (id === "backfill") {
      const all = rows("assessment_spaces"), missing = all.filter((r) => r.owner_id === null).length;
      return { columns: [{ name: "missing_owner", type: "int8" }, { name: "total", type: "int8" }, { name: "pct_done", type: "numeric" }], rows: [{ missing_owner: missing, total: all.length, pct_done: (Math.round((1000 * (all.length - missing)) / all.length) / 10).toFixed(1) }] };
    }
    if (id === "per-owner") {
      const n: Record<string, number> = {};
      for (const s of rows("assessment_spaces")) if (s.owner_id) n[String(s.owner_id)] = (n[String(s.owner_id)] ?? 0) + 1;
      const list = rows("users").filter((u) => n[String(u.id)]).map((u) => ({ full_name: u.full_name, email: u.email, spaces: n[String(u.id)] })).sort((a, b) => b.spaces - a.spaces).slice(0, 10);
      return { columns: [{ name: "full_name", type: "text" }, { name: "email", type: "text" }, { name: "spaces", type: "int8" }], rows: list };
    }
    if (id === "owner-rls") app.setRls("assessment_spaces", true, 1);
    if (id === "recent") {
      const list = rows("submissions").filter((s) => s.status === "graded").sort((a, b) => (String(a.submitted_at) < String(b.submitted_at) ? 1 : -1)).slice(0, 20).map(({ id: sid, status, score, submitted_at }) => ({ id: sid, status, score, submitted_at }));
      return { columns: [{ name: "id", type: "uuid" }, { name: "status", type: "text" }, { name: "score", type: "int8" }, { name: "submitted_at", type: "timestamptz" }], rows: list };
    }
  }
  const m = sql.match(/^select\s+\*\s+from\s+(?:public\.)?"?(\w+)"?(?:\s+limit\s+(\d+))?\s*;?$/i);
  if (m) {
    const t = app.state.tables[`public.${m[1]}`];
    if (!t) return { error: `ERROR:  42P01: relation "${m[1]}" does not exist\nLINE 1: ${sql.split("\n")[0]}` };
    return { columns: t.columns.map((c) => ({ name: c.name, type: c.type })), rows: t.rows.slice(0, Math.min(Number(m[2] ?? 100), 100)) };
  }
  if (/^(create|alter|drop|insert|update|delete|grant|revoke|comment|truncate|vacuum|analyze|call|begin|commit|set)\b/i.test(sql)) return { message: "Success. No rows returned" };
  if (/^select\b/i.test(sql)) {
    const rel = sql.match(/\bfrom\s+(?:public\.)?"?(\w+)/i);
    if (rel && !app.state.tables[`public.${rel[1]}`]) return { error: `ERROR:  42P01: relation "${rel[1]}" does not exist` };
    return { columns: [{ name: "?column?", type: "int4" }], rows: [{ "?column?": 1 }] };
  }
  return { error: `ERROR:  42601: syntax error at or near "${sql.split(/\s+/)[0]}"\nLINE 1: ${sql.split("\n")[0]}\n        ^` };
}

export function SupabasePreview() {
  const ref = useRef<SupabaseApp | null>(null);
  const supabase = useSupabase(SUPABASE_DEMO, {
    onEvent(event) {
      const app = ref.current!;
      if (event.type === "run-sql") setTimeout(() => app.setResult(event.snippet, answer(ref.current!, event.snippet, event.sql)), 350);
      if (event.type === "nav") app.toast(`${event.item} isn't part of this mockup`);
    },
  });
  ref.current = supabase;
  return <Supabase supabase={supabase} />;
}
