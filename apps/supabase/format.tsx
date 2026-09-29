import type { ReactNode } from "react";
import type { SupabaseColumn, SupabaseFilter, SupabaseRow, SupabaseSort, SupabaseTableState, SupabaseValue } from "./types";

// Values, defaults, filters and SQL text, as Studio shows them.

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const fmtN = (n: number) => n.toLocaleString("en-US");

/** A timestamptz the way Postgres prints it: "2026-09-21 09:14:02.118+00". */
export const tsz = (ms: number) => {
  const s = new Date(ms).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 23)}+00`;
};

const NUMERIC = new Set(["int2", "int4", "int8", "float4", "float8", "numeric"]);
const JSONISH = new Set(["json", "jsonb"]);
export const isNumeric = (type: string) => NUMERIC.has(type);
export const isJson = (type: string) => JSONISH.has(type);

/** A random v4 uuid (crypto.randomUUID needs a secure context; this does not). */
export function newUuid() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The primary key column's name (the first column when none is marked). */
export const pkOf = (t: { columns: SupabaseColumn[] }) => t.columns.find((c) => c.primaryKey)?.name ?? t.columns[0]?.name ?? "id";
/** A row's id: its primary key value as text. */
export const idOf = (t: { columns: SupabaseColumn[] }, row: SupabaseRow) => String(row[pkOf(t)]);

/** Column widths in the grid, by name and type. */
const WIDTH: Record<string, number> = { uuid: 300, text: 200, int2: 100, int4: 100, int8: 110, float8: 120, numeric: 110, bool: 110, json: 300, jsonb: 300, date: 140, timestamptz: 240 };
export const colWidth = (c: { name: string; type?: string }) =>
  c.name === "name" || c.name === "email" || c.name === "full_name" ? 240 : WIDTH[c.type ?? ""] ?? 180;

/** A grid cell: NULL greyed out, booleans in capitals, JSON on one line. */
export function Cell({ value }: { value: SupabaseValue | undefined }) {
  if (value === null || value === undefined) return <span className="null">NULL</span>;
  if (typeof value === "boolean") return <span className="v-bool">{String(value)}</span>;
  if (typeof value === "object") return <>{JSON.stringify(value)}</>;
  return <>{String(value)}</>;
}

/** The value a column's default gives a new row, or undefined when it has none. */
export function defaultValue(c: SupabaseColumn, rows: SupabaseRow[]): SupabaseValue | undefined {
  if (c.identity) return rows.reduce((m, r) => Math.max(m, Number(r[c.name]) || 0), 0) + 1;
  const d = c.default?.trim();
  if (!d) return undefined;
  if (/^(gen_random_uuid|uuid_generate_v4)\(\)$/.test(d)) return newUuid();
  if (/^now\(\)$|^current_timestamp$/i.test(d)) return tsz(Date.now());
  if (d === "true" || d === "false") return d === "true";
  const quoted = d.match(/^'(.*)'::(\w+)$/s);
  if (quoted) {
    if (isJson(quoted[2])) {
      try {
        return JSON.parse(quoted[1]) as SupabaseValue;
      } catch {
        return quoted[1];
      }
    }
    return quoted[1];
  }
  return isNaN(Number(d)) ? d : Number(d);
}

/** What a field shows for a value when the row editor opens. */
export function fieldText(c: SupabaseColumn, v: SupabaseValue | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" || isJson(c.type)) return JSON.stringify(v, null, 2);
  return String(v);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A field's text as the column's type, or why it is not one. `isNew` fills defaults for empty fields. */
export function parseField(c: SupabaseColumn, raw: string, rows: SupabaseRow[], isNew: boolean): { value: SupabaseValue } | { error: string } {
  const s = raw.trim();
  if (s === "") {
    if (isNew) {
      const d = defaultValue(c, rows);
      if (d !== undefined) return { value: d };
    }
    if (c.nullable) return { value: null };
    if (!isNew && (c.type === "text" || c.type === "varchar")) return { value: "" };
    return { error: "This field is required" };
  }
  if (c.type === "bool") return { value: s === "null" ? null : s === "true" };
  if (isNumeric(c.type)) {
    const whole = c.type.startsWith("int");
    return (whole ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/).test(s) ? { value: Number(s) } : { error: whole ? "Must be a whole number" : "Must be a number" };
  }
  if (isJson(c.type)) {
    try {
      return { value: JSON.parse(s) as SupabaseValue };
    } catch {
      return { error: "Invalid JSON" };
    }
  }
  if (c.type === "uuid") return UUID.test(s) ? { value: s.toLowerCase() } : { error: "Invalid uuid" };
  if (c.type === "timestamptz") {
    const ms = Date.parse(s.replace(" ", "T").replace(/\+00$/, "Z"));
    return isNaN(ms) ? { error: "Invalid timestamp" } : { value: tsz(ms) };
  }
  return { value: raw };
}

/** Fills a row the world inserts: defaults for missing columns, null for the rest. */
export function completeRow(t: SupabaseTableState, row: SupabaseRow): SupabaseRow {
  const out: SupabaseRow = {};
  for (const c of t.columns) {
    if (row[c.name] !== undefined) out[c.name] = row[c.name];
    else out[c.name] = defaultValue(c, t.rows) ?? null;
  }
  for (const [k, v] of Object.entries(row)) if (!(k in out)) out[k] = v;
  return out;
}

export const OPERATORS: [SupabaseFilter["op"], string][] = [
  ["=", "equals"], ["<>", "not equal"], [">", "greater than"], ["<", "less than"], [">=", "greater than or equal"],
  ["<=", "less than or equal"], ["~~", "like"], ["~~*", "ilike"], ["is", "is"],
];

function matches(row: SupabaseRow, f: SupabaseFilter, col: SupabaseColumn | undefined) {
  const v = row[f.column];
  const val = f.value.trim();
  if (f.op === "is") {
    const k = val.toLowerCase();
    return k === "not null" ? v !== null && v !== undefined : k === "true" ? v === true : k === "false" ? v === false : v === null || v === undefined;
  }
  if (v === null || v === undefined) return false;
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (f.op === "~~" || f.op === "~~*") {
    const re = new RegExp(`^${val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`, f.op === "~~*" ? "i" : "");
    return re.test(s);
  }
  const num = !!col && isNumeric(col.type);
  const a = num ? Number(s) : s;
  const b = num ? Number(val) : val;
  switch (f.op) {
    case "=": return a === b;
    case "<>": return a !== b;
    case ">": return a > b;
    case "<": return a < b;
    case ">=": return a >= b;
    case "<=": return a <= b;
  }
  return true;
}

/** The table's rows after its filters and sorts. */
export function viewRows(t: SupabaseTableState, filters: SupabaseFilter[] = [], sorts: SupabaseSort[] = []) {
  const cols = Object.fromEntries(t.columns.map((c) => [c.name, c]));
  let list = filters.length ? t.rows.filter((r) => filters.every((f) => matches(r, f, cols[f.column]))) : t.rows;
  if (sorts.length)
    list = [...list].sort((x, y) => {
      for (const s of sorts) {
        const a = x[s.column] ?? null;
        const b = y[s.column] ?? null;
        if (a === b) continue;
        if (a === null) return 1;
        if (b === null) return -1;
        const c = typeof a === "object" ? JSON.stringify(a).localeCompare(JSON.stringify(b)) : a < b ? -1 : 1;
        return s.ascending ? c : -c;
      }
      return 0;
    });
  return list;
}

// ---------- SQL ----------

const KW = new Set(
  ("select from where and or not null is as on join left right inner outer full cross group by order desc asc limit offset create table index if exists " +
    "concurrently alter enable disable row level security policy policies for to using with check insert into values update set delete returning primary " +
    "key foreign references constraint default true false filter begin commit rollback drop tablespace generated identity unique case when then else end " +
    "in like ilike distinct having union all authenticated anon public bigint text uuid boolean jsonb json timestamp time zone numeric integer smallint " +
    "grant revoke cascade procedure function language returns call view materialized").split(" ")
);

/** SQL with Studio's editor colors, as spans. */
export function highlight(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /--[^\n]*|'(?:[^']|'')*'?|"[^"\n]*"?|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b/g;
  let last = 0;
  let k = 0;
  for (const m of src.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(src.slice(last, i));
    const w = m[0];
    let cls = "";
    if (w.startsWith("--")) cls = "t-com";
    else if (w[0] === "'") cls = "t-str";
    else if (w[0] === '"') cls = "";
    else if (/\d/.test(w[0])) cls = "t-num";
    else if (KW.has(w.toLowerCase())) cls = "t-kw";
    else if (/^\s*\(/.test(src.slice(i + w.length))) cls = "t-fn";
    out.push(cls ? <span key={k++} className={cls}>{w}</span> : w);
    last = i + w.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

const PG: Record<string, string> = { int2: "smallint", int4: "integer", int8: "bigint", float8: "double precision", bool: "boolean", timestamptz: "timestamp with time zone" };

/** The table's `create table` statement, for the Definition view. */
export function ddl(t: SupabaseTableState) {
  const lines = t.columns.map((c) => {
    const type = PG[c.type] ?? c.type;
    if (c.identity) return `  ${c.name} ${type} generated by default as identity not null`;
    const def = c.default ? ` default ${c.default.replace(/\(\)$/, " ()")}` : "";
    return `  ${c.name} ${type}${c.nullable ? "" : " not null"}${def}`;
  });
  lines.push(`  constraint ${t.name}_pkey primary key (${pkOf(t)})`);
  for (const c of t.columns)
    if (c.references) {
      const [rt, rc] = c.references.split(".");
      lines.push(`  constraint ${t.name}_${c.name}_fkey foreign key (${c.name}) references ${rt} (${rc ?? "id"})`);
    }
  let s = `create table ${t.schema}.${t.name} (\n${lines.join(",\n")}\n) TABLESPACE pg_default;`;
  for (const ix of t.indexes) s += `\n\ncreate index if not exists ${ix.name} on ${t.schema}.${t.name} using btree (${ix.column}) TABLESPACE pg_default;`;
  return s;
}
