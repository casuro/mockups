import { useCallback, useMemo, useRef, useState } from "react";
import { completeRow, idOf, newUuid } from "./format";
import type {
  SupabaseColumn,
  SupabaseEvent,
  SupabaseFilter,
  SupabaseResult,
  SupabaseRow,
  SupabaseSeed,
  SupabaseSort,
  SupabaseState,
  SupabaseTableState,
  TableRef,
} from "./types";

// The project behind <Supabase>: its state, what the world does to it
// (rows arrive or change, a query's result comes back) and what the
// signed-in person does (insert, edit, delete, filter, run SQL). Every change
// goes through `update`, which keeps a ref in step with React state, so calls
// made between renders (timers, awaited results) see what the last one wrote.
// Every function it returns is stable across renders.

export interface SupabaseOptions {
  /** A state saved from `supabase.state`, to pick up where it was left. */
  restore?: SupabaseState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: SupabaseEvent) => void;
}

/** Where the SQL editor can go: a view, a table ("users" or "auth.users"), or a snippet by id. */
export type OpenTarget = { view: "table" | "sql" } | { table: TableRef } | { snippet: string };

const keyOf = (t: SupabaseTableState) => `${t.schema}.${t.name}`;

function initialState(seed: SupabaseSeed): SupabaseState {
  const tables: SupabaseState["tables"] = {};
  for (const schema of seed.schemas)
    for (const t of schema.tables)
      tables[`${schema.name}.${t.name}`] = {
        schema: schema.name,
        name: t.name,
        columns: t.columns,
        rows: t.rows ?? [],
        rls: t.rls !== false,
        policies: t.policies ?? 0,
        indexes: t.indexes ?? [],
      };
  const first = seed.schemas[0]?.name ?? "public";
  const resolve = (ref: string) => (ref.includes(".") ? ref : `${first}.${ref}`);
  const tabs = (seed.open?.tables ?? Object.keys(tables).slice(0, 1)).map(resolve).filter((k) => tables[k]);
  const snippets = (seed.snippets ?? []).map((s) => ({ ...s }));
  const sqlTabs = (seed.open?.snippets ?? snippets.slice(0, 1).map((s) => s.id)).filter((id) => snippets.some((s) => s.id === id));
  return {
    version: 1,
    view: seed.open?.view ?? "table",
    schema: tabs[0] ? tables[tabs[0]].schema : first,
    tables,
    table: tabs[0] ?? null,
    tabs,
    snippets,
    snippet: sqlTabs[0] ?? null,
    sqlTabs,
    results: {},
    running: null,
    filters: {},
    sorts: {},
    page: {},
    mode: {},
    theme: seed.theme ?? "light",
  };
}

// Rows can be many thousands, so a change copies everything except the row
// lists, which are shared. Every change below replaces a table's `rows` with a
// new array (and a changed row with a new object) instead of editing it in place.
function copy(s: SupabaseState): SupabaseState {
  const { tables, ...rest } = s;
  const next = structuredClone(rest) as SupabaseState;
  next.tables = {};
  for (const [k, t] of Object.entries(tables)) {
    const { rows, ...meta } = t;
    next.tables[k] = { ...structuredClone(meta), rows };
  }
  return next;
}

export function useSupabase(seed: SupabaseSeed, options: SupabaseOptions = {}) {
  const [state, setState] = useState<SupabaseState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const [notices, setNotices] = useState<{ id: number; text: string }[]>([]);
  const noticeSeq = useRef(0);
  const pageSize = seed.pageSize ?? 100;

  const update = useCallback((fn: (draft: SupabaseState) => void) => {
    const next = copy(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: SupabaseEvent) => opts.current.onEvent?.(event), []);

  /** "users" or "auth.users" to the state key "public.users" (the first schema when none is named). */
  const resolve = useCallback((table: TableRef) => {
    const tables = ref.current.tables;
    if (tables[table]) return table;
    const key = `${seedRef.current.schemas[0]?.name ?? "public"}.${table}`;
    if (tables[key]) return key;
    const found = Object.values(tables).find((t) => t.name === table);
    if (found) return keyOf(found);
    throw new Error(`Supabase: no table "${table}"`);
  }, []);

  const at = (t: SupabaseTableState) => ({ schema: t.schema, table: t.name });

  // ---------- What the world does ----------

  /** A notice at the bottom right. */
  const toast = useCallback((text: string) => {
    const id = ++noticeSeq.current;
    setNotices((list) => [...list, { id, text }].slice(-3));
  }, []);

  /** Adds a row at the top of the table (defaults fill missing columns). Returns its id. */
  const insertRow = useCallback(
    (table: TableRef, row: SupabaseRow) => {
      const key = resolve(table);
      let id = "";
      update((s) => {
        const t = s.tables[key];
        const full = completeRow(t, row);
        id = idOf(t, full);
        t.rows = [full, ...t.rows];
      });
      return id;
    },
    [update, resolve]
  );

  /** Changes some columns of the row whose primary key is `id`. */
  const updateRow = useCallback(
    (table: TableRef, id: string, patch: SupabaseRow) => {
      const key = resolve(table);
      update((s) => {
        const t = s.tables[key];
        t.rows = t.rows.map((r) => (idOf(t, r) === id ? { ...r, ...patch } : r));
      });
    },
    [update, resolve]
  );

  /** Removes rows by primary key. */
  const deleteRows = useCallback(
    (table: TableRef, ids: string[]) => {
      const key = resolve(table);
      const gone = new Set(ids);
      update((s) => {
        const t = s.tables[key];
        t.rows = t.rows.filter((r) => !gone.has(idOf(t, r)));
      });
    },
    [update, resolve]
  );

  /** Replaces every row of the table. */
  const setRows = useCallback(
    (table: TableRef, rows: SupabaseRow[]) => {
      const key = resolve(table);
      update((s) => void (s.tables[key].rows = [...rows]));
    },
    [update, resolve]
  );

  /** Turns Row Level Security on or off (the banner and the toolbar button follow), with a new policy count if given. */
  const setRls = useCallback(
    (table: TableRef, enabled: boolean, policies?: number) => {
      const key = resolve(table);
      update((s) => {
        s.tables[key].rls = enabled;
        if (policies !== undefined) s.tables[key].policies = policies;
      });
    },
    [update, resolve]
  );

  /** A query's outcome under the SQL editor: rows, a message ("Success. No rows returned") or an error. Ends the Run spinner. */
  const setResult = useCallback(
    (snippet: string, result: SupabaseResult) =>
      void update((s) => {
        s.results[snippet] = result;
        if (s.running === snippet) s.running = null;
      }),
    [update]
  );

  /** Shows a view, a table (opening its tab), or a snippet. */
  const open = useCallback(
    (target: OpenTarget) => {
      const key = "table" in target ? resolve(target.table) : null;
      if ("snippet" in target && !ref.current.snippets.some((x) => x.id === target.snippet)) throw new Error(`Supabase: no snippet "${target.snippet}"`);
      update((s) => {
        if ("view" in target) s.view = target.view;
        if (key) {
          if (!s.tabs.includes(key)) s.tabs.push(key);
          s.table = key;
          s.schema = s.tables[key].schema;
          s.view = "table";
        }
        if ("snippet" in target) {
          if (!s.sqlTabs.includes(target.snippet)) s.sqlTabs.push(target.snippet);
          s.snippet = target.snippet;
          s.view = "sql";
        }
      });
    },
    [update, resolve]
  );

  // ---------- What the signed-in person does (wired by <Supabase>) ----------

  const selectTable = useCallback(
    (key: string) => {
      const t = ref.current.tables[key];
      if (!t) return;
      update((s) => {
        if (!s.tabs.includes(key)) s.tabs.push(key);
        s.table = key;
        s.view = "table";
      });
      emit({ type: "select-table", ...at(t) });
    },
    [update, emit]
  );

  const closeTab = useCallback(
    (key: string) =>
      void update((s) => {
        s.tabs = s.tabs.filter((k) => k !== key);
        if (s.table === key) s.table = s.tabs[s.tabs.length - 1] ?? null;
      }),
    [update]
  );

  const setSchema = useCallback((name: string) => void update((s) => void (s.schema = name)), [update]);

  const openView = useCallback(
    (view: "table" | "sql") => {
      update((s) => void (s.view = view));
      emit({ type: "open-view", view });
    },
    [update, emit]
  );

  const openSnippet = useCallback(
    (id: string) => {
      update((s) => {
        if (!s.sqlTabs.includes(id)) s.sqlTabs.push(id);
        s.snippet = id;
        s.view = "sql";
      });
      emit({ type: "open-snippet", snippet: id });
    },
    [update, emit]
  );

  const closeSnippet = useCallback(
    (id: string) =>
      void update((s) => {
        s.sqlTabs = s.sqlTabs.filter((x) => x !== id);
        if (s.snippet === id) s.snippet = s.sqlTabs[s.sqlTabs.length - 1] ?? null;
      }),
    [update]
  );

  const newSnippet = useCallback(() => {
    const id = `q-${newUuid().slice(0, 8)}`;
    update((s) => {
      const n = s.snippets.filter((x) => x.name.startsWith("Untitled query")).length;
      s.snippets.unshift({ id, name: n ? `Untitled query ${n + 1}` : "Untitled query", sql: "" });
      s.sqlTabs.push(id);
      s.snippet = id;
      s.view = "sql";
    });
    emit({ type: "new-snippet", snippet: id });
    return id;
  }, [update, emit]);

  const editSql = useCallback(
    (id: string, sql: string) =>
      void update((s) => {
        const snip = s.snippets.find((x) => x.id === id);
        if (snip) snip.sql = sql;
      }),
    [update]
  );

  const run = useCallback(
    (id: string) => {
      const snip = ref.current.snippets.find((x) => x.id === id);
      if (!snip) return;
      update((s) => {
        s.running = id;
        delete s.results[id];
      });
      emit({ type: "run-sql", snippet: id, sql: snip.sql });
    },
    [update, emit]
  );

  const setFilters = useCallback(
    (key: string, filters: SupabaseFilter[]) => {
      update((s) => {
        s.filters[key] = filters;
        s.page[key] = 1;
      });
      emit({ type: "filter", ...at(ref.current.tables[key]), filters });
    },
    [update, emit]
  );

  const setSorts = useCallback(
    (key: string, sorts: SupabaseSort[]) => {
      update((s) => {
        s.sorts[key] = sorts;
        s.page[key] = 1;
      });
      emit({ type: "sort", ...at(ref.current.tables[key]), sorts });
    },
    [update, emit]
  );

  const setPage = useCallback((key: string, page: number) => void update((s) => void (s.page[key] = page)), [update]);
  const setMode = useCallback((key: string, mode: "data" | "definition") => void update((s) => void (s.mode[key] = mode)), [update]);

  /** A row saved from the side panel: already typed, defaults filled. */
  const insert = useCallback(
    (key: string, row: SupabaseRow) => {
      const t = ref.current.tables[key];
      const id = idOf(t, row);
      update((s) => {
        s.tables[key].rows = [row, ...s.tables[key].rows];
        s.page[key] = 1;
      });
      emit({ type: "insert", ...at(t), id, row });
      return id;
    },
    [update, emit]
  );

  const edit = useCallback(
    (key: string, id: string, patch: SupabaseRow) => {
      const t = ref.current.tables[key];
      let row: SupabaseRow = {};
      update((s) => {
        const tt = s.tables[key];
        tt.rows = tt.rows.map((r) => (idOf(tt, r) === id ? (row = { ...r, ...patch }) : r));
      });
      emit({ type: "update", ...at(t), id, patch, row });
    },
    [update, emit]
  );

  const remove = useCallback(
    (key: string, ids: string[]) => {
      const t = ref.current.tables[key];
      const gone = new Set(ids);
      const rows = t.rows.filter((r) => gone.has(idOf(t, r)));
      update((s) => {
        const tt = s.tables[key];
        tt.rows = tt.rows.filter((r) => !gone.has(idOf(tt, r)));
      });
      emit({ type: "delete", ...at(t), ids, rows });
    },
    [update, emit]
  );

  const addColumn = useCallback(
    (key: string, column: SupabaseColumn, value: SupabaseRow[string]) => {
      const t = ref.current.tables[key];
      update((s) => {
        const tt = s.tables[key];
        tt.columns.push(column);
        tt.rows = tt.rows.map((r) => ({ ...r, [column.name]: value }));
      });
      emit({ type: "add-column", ...at(t), column });
    },
    [update, emit]
  );

  const enableRls = useCallback(
    (key: string) => {
      update((s) => void (s.tables[key].rls = true));
      emit({ type: "enable-rls", ...at(ref.current.tables[key]) });
    },
    [update, emit]
  );

  const refresh = useCallback((key: string) => emit({ type: "refresh", ...at(ref.current.tables[key]) }), [emit]);
  const nav = useCallback((item: string) => emit({ type: "nav", item }), [emit]);
  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);
  const dismiss = useCallback((id: number) => setNotices((list) => list.filter((n) => n.id !== id)), []);

  const ui = useMemo(
    () => ({
      selectTable, closeTab, setSchema, openView, openSnippet, closeSnippet, newSnippet, editSql, run,
      setFilters, setSorts, setPage, setMode, insert, edit, remove, addColumn, enableRls, refresh, nav, setTheme, dismiss, emit,
    }),
    [selectTable, closeTab, setSchema, openView, openSnippet, closeSnippet, newSnippet, editSql, run, setFilters, setSorts, setPage, setMode, insert, edit, remove, addColumn, enableRls, refresh, nav, setTheme, dismiss, emit]
  );

  return {
    seed,
    /** Save this and pass it back as `restore`. */
    state,
    notices,
    pageSize,
    /** The table on screen, or null. */
    table: state.table ? state.tables[state.table] ?? null : null,
    /** The snippet on screen, or null. */
    snippet: state.snippets.find((s) => s.id === state.snippet) ?? null,
    // The world
    insertRow,
    updateRow,
    deleteRows,
    setRows,
    setRls,
    setResult,
    open,
    toast,
    // The signed-in person (wired by <Supabase>)
    ui,
  };
}

export type SupabaseApp = ReturnType<typeof useSupabase>;
