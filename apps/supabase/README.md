# Supabase (React)

`apps/supabase.html` as React components: Supabase Studio's Table Editor
(and a small SQL Editor), the same look, pixel for pixel, with the sample
data swapped for props. Like a shadcn component, you copy the folder into
your project and it is yours: use it as it is, or change any file for what
your screen needs.

```bash
cp -r apps/supabase src/apps/supabase
```

It needs only React 19. The styles are plain CSS scoped to `.kit-supabase`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included), and it uses the system fonts, so nothing loads from the
network.

## Use

```tsx
import { Supabase, useSupabase, type SupabaseSeed } from "./apps/supabase";

const seed: SupabaseSeed = {
  organization: { name: "Northwind", plan: "Pro" },
  project: { name: "northwind-app", ref: "abcdefghijklmnopqrst", region: "eu-west-1" },
  user: { name: "Sam Rivera", email: "sam@northwind.test" },
  schemas: [
    {
      name: "public",
      tables: [
        {
          name: "orders",
          rls: false,
          columns: [
            { name: "id", type: "int8", primaryKey: true, identity: true },
            { name: "customer", type: "text" },
            { name: "total", type: "numeric" },
            { name: "paid", type: "bool", default: "false" },
            { name: "created_at", type: "timestamptz", default: "now()" },
          ],
          rows: [
            { id: 1, customer: "Ada", total: 42.5, paid: true, created_at: "2026-09-01 10:00:00.000+00" },
            { id: 2, customer: "Lin", total: 18, paid: false, created_at: "2026-09-02 12:30:00.000+00" },
          ],
        },
      ],
    },
  ],
  snippets: [{ id: "unpaid", name: "Unpaid orders", sql: "select * from orders where paid = false;" }],
};

function Studio() {
  const supabase = useSupabase(seed, {
    onEvent(event) {
      if (event.type === "run-sql") supabase.setResult(event.snippet, { message: "Success. No rows returned" });
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Supabase supabase={supabase} />
    </div>
  );
}
```

`<Supabase>` fills the box it is in, so give that box a height. Under 760px
of width (of the box, not the window) the rail and the table list become
drawers and the row editor goes full screen.

## The data

`types.ts` has the full shape, commented. In short:

- `organization`, `project` (name, ref, region, branch) and `user` fill the
  top bar and the account menu. `user.photo` is a picture URL; initials otherwise.
- `schemas`, each with `tables`. A table has `columns` (name, Postgres type,
  `primaryKey`, `nullable`, `default`, `identity`, `references`) and `rows`
  (column name to value; timestamps are text). `rls: false` shows the
  warning banner; `policies` is the count on the RLS button.
- A row's id is its primary key value as text.
- `snippets` are the SQL Editor's saved queries. `open` says which tables and
  snippets start open as tabs, and which view shows.

## Driving it

`useSupabase` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `supabase.insertRow(table, row)` | A row appears at the top of the table (defaults fill missing columns). Returns its id. |
| `supabase.updateRow(table, id, patch)` | Some columns of a row change. |
| `supabase.deleteRows(table, ids)` | Rows go away. |
| `supabase.setRows(table, rows)` | Every row of the table is replaced. |
| `supabase.setRls(table, enabled, policies?)` | RLS turns on or off; the banner and button follow. |
| `supabase.setResult(snippetId, result)` | A query's rows, message or error appears under the editor. |
| `supabase.open(target)` | Show `{ view }`, `{ table }` or `{ snippet }`. |
| `supabase.toast(text)` | A notice at the bottom right. |

`table` is a name (`"orders"`, in the first schema) or `"schema.name"`.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "select-table", schema, table }` | They open a table. |
| `{ type: "insert", schema, table, id, row }` | They save a new row. |
| `{ type: "update", schema, table, id, patch, row }` | They save a row they edited. |
| `{ type: "delete", schema, table, ids, rows }` | They confirm deleting the ticked rows. |
| `{ type: "add-column", schema, table, column }` | They add a column. |
| `{ type: "filter" \| "sort", schema, table, filters \| sorts }` | They apply filters or sorts. |
| `{ type: "enable-rls" \| "refresh", schema, table }` | They enable RLS, or press Refresh. |
| `{ type: "run-sql", snippet, sql }` | They press Run (or Cmd+Enter). Answer with `setResult`. |
| `{ type: "open-snippet" \| "new-snippet", snippet }` | They open or start a query. |
| `{ type: "open-view", view }` | They switch between the Table and SQL editors. |
| `{ type: "nav", item }` | Anything the kit only shows: another page, Feedback, Export... |

`supabase.state` is everything that changed, as plain JSON: save it, and
pass it back as `useSupabase(seed, { restore })` to pick up where they left off.

## API reference

Everything below is what the kit's source defines; nothing else exists.

### Imports

```ts
import {
  Supabase, useSupabase,
  type SupabaseProps, type SupabaseApp, type SupabaseOptions, type OpenTarget,
  type SupabaseSeed, type SupabaseState, type SupabaseEvent, type SupabaseRow, type SupabaseResult,
} from "./apps/supabase";
// The brand mark is not re-exported by index.ts (for a desktop launcher, say):
import { SupabaseLogo } from "./apps/supabase/icons";
```

`index.ts` also re-exports every other type in `types.ts` (`SupabaseColumn`, `SupabaseColumnType`, `SupabaseValue`, `SupabaseJson`, `SupabaseIndex`, `SupabaseTableSeed`, `SupabaseSchemaSeed`, `SupabaseSnippet`, `SupabaseFilter`, `SupabaseSort`, `SupabaseTableState`, `TableRef`, `TableAt`).

### The hook

```ts
function useSupabase(seed: SupabaseSeed, options?: SupabaseOptions): SupabaseApp;

interface SupabaseOptions {
  restore?: SupabaseState | null;             // a saved `supabase.state`; read on the first render only
  onEvent?: (event: SupabaseEvent) => void;   // everything the signed-in person does
}
```

A `restore` whose `version` is not `1` is ignored and the seed is used.

### The seed

```ts
interface SupabaseSeed {
  organization: { name: string; plan?: string };                 // required
  project: { name: string; ref?: string; region?: string; branch?: string; production?: boolean };   // required; branch "main", production true by default
  user: { name: string; email: string; photo?: string };         // required
  schemas: { name: string; tables: SupabaseTableSeed[] }[];      // required; the first is listed at the start
  snippets?: { id: string; name: string; sql: string }[];
  open?: { view?: "table" | "sql"; tables?: TableRef[]; snippets?: string[] };   // first table / snippet by default
  pageSize?: number;                                             // rows per page, default 100
  theme?: "light" | "dark";
}

interface SupabaseTableSeed {
  name: string;                     // required
  columns: SupabaseColumn[];        // required
  rows?: SupabaseRow[];
  rls?: boolean;                    // default true
  policies?: number;                // default 0
  indexes?: { name: string; column: string }[];   // shown in the Definition view
}

interface SupabaseColumn {
  name: string;                     // required
  type: SupabaseColumnType;         // required: "uuid" | "text" | "int2" | "int4" | "int8" | "float8" | "numeric"
                                    //   | "bool" | "json" | "jsonb" | "date" | "timestamptz" | any other string (edited as text)
  primaryKey?: boolean;             // the row id; the first column when none is marked
  nullable?: boolean;               // default false
  default?: string;                 // as Postgres writes it: "gen_random_uuid()", "now()", "false", "5", "'x'::text", "'{}'::jsonb"
  identity?: boolean;               // new rows count up from the largest value
  references?: string;              // "users.id"
}

type SupabaseRow = Record<string, SupabaseValue>;   // SupabaseValue: string | number | boolean | null | JSON
type TableRef = string;                             // "orders" (first schema) or "public.orders"
```

### What the world can do

All of these are stable across renders, so they are safe to call from timers and `onEvent`.

```ts
supabase.insertRow(table: TableRef, row: SupabaseRow): string          // returns the new row's id
supabase.updateRow(table: TableRef, id: string, patch: SupabaseRow): void
supabase.deleteRows(table: TableRef, ids: string[]): void
supabase.setRows(table: TableRef, rows: SupabaseRow[]): void
supabase.setRls(table: TableRef, enabled: boolean, policies?: number): void
supabase.setResult(snippet: string, result: SupabaseResult): void      // also ends the Run spinner
supabase.open(target: OpenTarget): void
supabase.toast(text: string): void

type SupabaseResult =
  | { columns: (string | { name: string; type?: string })[]; rows: SupabaseRow[] }   // an empty rows list reads "Success. No rows returned"
  | { message: string }
  | { error: string };
type OpenTarget = { view: "table" | "sql" } | { table: TableRef } | { snippet: string };
```

A table name that matches no table, or a snippet id that matches no snippet, throws. Read-only fields: `supabase.state` (below), `supabase.seed`, `supabase.notices`, `supabase.pageSize`, `supabase.table` (the `SupabaseTableState` on screen, or null) and `supabase.snippet` (the snippet on screen, or null). `supabase.ui` holds what `<Supabase>` calls for the signed-in person; a world does not need it.

```ts
interface SupabaseTableState {     // supabase.table, and each of supabase.state.tables
  schema: string;                  // "public"
  name: string;                    // "orders"
  columns: SupabaseColumn[];       // with any added in the Table Editor
  rows: SupabaseRow[];             // every row (an insert goes on top); not filtered, sorted or paged
  rls: boolean;
  policies: number;
  indexes: { name: string; column: string }[];
}
```

### Events

```ts
type TableAt = { schema: string; table: string };   // table is the plain name
type SupabaseEvent =
  | ({ type: "select-table" } & TableAt)
  | ({ type: "insert"; id: string; row: SupabaseRow } & TableAt)
  | ({ type: "update"; id: string; patch: SupabaseRow; row: SupabaseRow } & TableAt)
  | ({ type: "delete"; ids: string[]; rows: SupabaseRow[] } & TableAt)
  | ({ type: "add-column"; column: SupabaseColumn } & TableAt)
  | ({ type: "filter"; filters: SupabaseFilter[] } & TableAt)   // { column, op: "=" | "<>" | ">" | "<" | ">=" | "<=" | "~~" | "~~*" | "is", value }
  | ({ type: "sort"; sorts: SupabaseSort[] } & TableAt)         // { column, ascending }
  | ({ type: "enable-rls" } & TableAt)
  | ({ type: "refresh" } & TableAt)
  | { type: "run-sql"; snippet: string; sql: string }
  | { type: "open-snippet"; snippet: string }
  | { type: "new-snippet"; snippet: string }
  | { type: "open-view"; view: "table" | "sql" }
  | { type: "nav"; item: string };
```

The world's calls fire no events.

### State

`supabase.state` is a `SupabaseState`: plain JSON (`version: 1`, `view`, `schema`, `tables` keyed `"schema.name"` with their columns and rows, `table` and `tabs`, `snippets`, `snippet` and `sqlTabs`, `results`, `running`, and per table `filters`, `sorts`, `page`, `mode`, plus `theme`). It is a new object after every change. Save it, and pass it back as `useSupabase(seed, { restore })`; `restore` is read only when the hook first mounts, so load the saved state before rendering the component that calls `useSupabase`.

### The component

```ts
interface SupabaseProps {
  supabase: SupabaseApp;     // required: from useSupabase
  className?: string;
  style?: CSSProperties;
}
```

`<Supabase>` fills its parent, so the parent needs a height (`100vh`, or a flex child with `min-height: 0`). Under 760px of width it uses the phone layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Supabase, useSupabase, type SupabaseSeed, type SupabaseState } from "./apps/supabase";

const seed: SupabaseSeed = {
  organization: { name: "Northwind", plan: "Pro" },
  project: { name: "northwind-app", ref: "abcdefghijklmnopqrst" },
  user: { name: "Sam Rivera", email: "sam@northwind.test" },
  schemas: [{ name: "public", tables: [{
    name: "orders",
    rls: false,
    columns: [
      { name: "id", type: "int8", primaryKey: true, identity: true },
      { name: "customer", type: "text" },
      { name: "paid", type: "bool", default: "false" },
    ],
    rows: [{ id: 1, customer: "Ada", paid: true }, { id: 2, customer: "Lin", paid: false }],
  }] }],
  snippets: [{ id: "unpaid", name: "Unpaid orders", sql: "select * from orders where paid = false;" }],
};

export default function Episode() {
  // `restore` is read once, on mount: load the saved state before rendering the app.
  const [saved, setSaved] = useState<SupabaseState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<SupabaseState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Studio saved={saved} />;
}

function Studio({ saved }: { saved: SupabaseState | null }) {
  const supabase = useSupabase(seed, {
    restore: saved,
    async onEvent(event) {
      if (event.type === "enable-rls") void casuro.track.decision({ summary: `Enabled RLS on ${event.schema}.${event.table}` });
      if (event.type === "delete") void casuro.track.decision({ summary: `Deleted ${event.ids.length} rows from ${event.table}` });
      if (event.type === "run-sql") {
        void casuro.track.document({ action: "run_sql", title: event.snippet, text: event.sql });
        // No database here: a canned answer for the unpaid query, a model's guess for anything else.
        if (/where paid = false/i.test(event.sql)) {
          supabase.setResult(event.snippet, { columns: ["id", "customer", "paid"], rows: [{ id: 2, customer: "Lin", paid: false }] });
          return;
        }
        const reply = await casuro.llm([
          { role: "system", content: "You are Postgres. Reply with one line: the psql status or error for this statement." },
          { role: "user", content: event.sql },
        ]);
        supabase.setResult(event.snippet, /^error/i.test(reply) ? { error: reply } : { message: reply });
      }
    },
  });

  // One timed beat: a new order arrives 20 seconds in (only on a fresh start).
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      supabase.insertRow("orders", { customer: "Kofi", paid: false });
      supabase.toast("1 new row in orders");
    }, 20_000);
    return () => clearTimeout(t);
  }, [saved, supabase.insertRow, supabase.toast]);

  // Save every change.
  useEffect(() => void casuro.store.set(supabase.state), [supabase.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Supabase supabase={supabase} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Supabase.tsx` | The layout, the popover, tooltips, toasts, keyboard shortcuts. |
| `TopBar.tsx` | The top bar (breadcrumb, Connect, search, account menu) and the rail. |
| `TableEditor.tsx` | The table list, tabs, toolbar, RLS banner, grid, filter and sort, pager, Definition view. |
| `Panels.tsx` | The row and column side panels, the confirm dialogs, Connect and the search palette. |
| `SqlEditor.tsx` | The snippet list, the editor and the results. |
| `use-supabase.ts` | The state and what changes it. |
| `format.tsx` | Cell values, defaults, field parsing, filters, SQL highlighting and the table definition. |
| `context.tsx`, `icons.tsx`, `types.ts` | Shared parts, the icons and the Supabase mark, the data's shape. |
| `supabase.css` | The look, from the mockup. |

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=supabase` next to `/apps/supabase.html`: the same project and
demo, drawn by the React version.
