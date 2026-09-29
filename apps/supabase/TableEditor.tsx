import { useEffect, useRef, useState } from "react";
import { MenuItem, useUI } from "./context";
import { Cell, OPERATORS, clamp, colWidth, ddl, fmtN, idOf, viewRows } from "./format";
import * as I from "./icons";
import { Code } from "./SqlEditor";
import type { SupabaseFilter, SupabaseSort, SupabaseTableState } from "./types";

// The Table Editor: the table list, the open tables' tabs, the toolbar, the
// RLS banner, the grid (or the table's definition) and the pager.

export function TableList() {
  const { app, listOpen, setListOpen, openPop, closePop } = useUI();
  const [q, setQ] = useState("");
  const { state } = app;
  const tables = Object.entries(state.tables).filter(([, t]) => t.schema === state.schema && t.name.includes(q.trim().toLowerCase()));
  const schemas = app.seed.schemas.map((s) => s.name);
  return (
    <aside className={`menu-side${listOpen ? " open" : ""}`} aria-label="Tables">
      <div className="ms-head">
        <h1>Table Editor</h1>
        <button className="icon-btn mb-only" aria-label="Close table list" onClick={() => setListOpen(false)}><I.X /></button>
      </div>
      <div className="ms-tools">
        <button
          className="schema-btn"
          aria-label={`Schema: ${state.schema}`}
          onClick={(e) =>
            openPop(e.currentTarget, () => (
              <div className="m-list">
                <div className="m-head">Schemas</div>
                {schemas.map((s) => (
                  <MenuItem key={s} label={s} on={s === app.state.schema} onClick={() => { app.ui.setSchema(s); closePop(); }} />
                ))}
              </div>
            ))
          }
        >
          <span className="k">schema</span>
          <b>{state.schema}</b>
          <I.UpDown />
        </button>
        <button className="btn new-btn" onClick={() => app.ui.nav("New table")}><I.Plus />New table</button>
        <div className="ms-search">
          <I.Search />
          <input className="input" placeholder="Search tables..." aria-label="Search tables" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="ms-list" role="list">
        <div className="ms-label">Tables <span>({tables.length})</span></div>
        {tables.map(([key, t]) => (
          <button
            key={key}
            className={`ms-item${key === state.table ? " on" : ""}`}
            role="listitem"
            aria-label={`${t.name}${t.rls ? "" : " (RLS disabled)"}`}
            aria-current={key === state.table ? "true" : undefined}
            onClick={() => { app.ui.selectTable(key); setListOpen(false); }}
          >
            <I.Table />
            <span className="n">{t.name}</span>
            {t.rls ? null : <span className="rls-off" data-tip="RLS disabled"><I.Unlock /></span>}
          </button>
        ))}
        {tables.length ? null : <div className="ms-empty">{q ? `No tables match "${q}"` : "No tables in this schema"}</div>}
      </div>
    </aside>
  );
}

export function TableTabs() {
  const { app, setSelected } = useUI();
  const { state } = app;
  return (
    <div className="tabs" role="tablist" aria-label="Open tables">
      {state.tabs.map((key) => {
        const name = state.tables[key]?.name ?? key;
        return (
          <div key={key} className={`tab${key === state.table ? " on" : ""}`}>
            <button className="tab-open" role="tab" aria-selected={key === state.table} aria-label={name} onClick={() => { if (key !== state.table) setSelected(new Set()); app.ui.selectTable(key); }}>
              <I.Table />
              <span className="tl">{name}</span>
            </button>
            <button className="x" aria-label={`Close ${name}`} onClick={() => app.ui.closeTab(key)}><I.X /></button>
          </div>
        );
      })}
    </div>
  );
}

export function TableView() {
  const { app, selected, setSelected, openPop, closePop, setOverlay, setListOpen, flash, setFlash } = useUI();
  const t = app.table;
  const key = app.state.table ?? "";
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // A row highlights once after it was added or saved.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 1700);
    return () => clearTimeout(id);
  }, [flash, setFlash]);
  // Another table: nothing ticked, back to the top.
  useEffect(() => {
    setSelected(new Set());
    gridRef.current?.scrollTo(0, 0);
  }, [key, setSelected]);

  if (!t)
    return (
      <>
        <TableTabs />
        <div className="res-hint"><div><b className="hint-t">Select a table</b><br />Pick a table from the list to see its rows.</div></div>
      </>
    );

  const { state, pageSize } = app;
  const filters = state.filters[key] ?? [];
  const sorts = state.sorts[key] ?? [];
  const mode = state.mode[key] ?? "data";
  const list = viewRows(t, filters, sorts);
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = clamp(state.page[key] ?? 1, 1, pages);
  const slice = list.slice((page - 1) * pageSize, page * pageSize);
  const ids = slice.map((r) => idOf(t, r));
  const exists = new Set(t.rows.map((r) => idOf(t, r)));
  const sel = [...selected].filter((id) => exists.has(id));
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
  const someOn = ids.some((id) => selected.has(id));
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const rule = (n: number, w: string) => `${w} by ${plural(n, "rule")}`;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
    setSelected(next);
  };
  const refresh = () => {
    setLoading(true);
    app.ui.refresh(key);
    setTimeout(() => setLoading(false), 450);
  };

  const listBtn = (
    <button className="btn mb-only" aria-label={`Tables: ${t.name}`} onClick={() => setListOpen(true)}>
      <I.Table />
      {t.name}
      <I.ChevronDown />
    </button>
  );

  return (
    <>
      <TableTabs />
      <div className="toolbar">
        {sel.length ? (
          <>
            {listBtn}
            <div className="sel-count">
              <button className="icon-btn" aria-label="Clear selection" style={{ width: 24, height: 24 }} onClick={() => setSelected(new Set())}><I.X /></button>
              {plural(sel.length, "row")} selected
            </div>
            <button className="btn danger-outline" onClick={() => setOverlay({ kind: "delete", table: key, ids: sel })}><I.Trash />Delete {plural(sel.length, "row")}</button>
            <button className="btn" onClick={() => app.ui.nav("Export")}><I.Download />Export</button>
          </>
        ) : (
          <>
            {listBtn}
            <button className={`btn${filters.length ? " on" : ""}`} aria-label={filters.length ? rule(filters.length, "Filtered") : "Filter"} onClick={(e) => openPop(e.currentTarget, () => <FilterPop table={t} tableKey={key} />, { className: "fp" })}>
              <I.Filter />
              <span className="lbl-hide">{filters.length ? rule(filters.length, "Filtered") : "Filter"}</span>
            </button>
            <button className={`btn${sorts.length ? " on" : ""}`} aria-label={sorts.length ? rule(sorts.length, "Sorted") : "Sort"} onClick={(e) => openPop(e.currentTarget, () => <SortPop table={t} tableKey={key} />, { className: "fp" })}>
              <I.Sort />
              <span className="lbl-hide">{sorts.length ? rule(sorts.length, "Sorted") : "Sort"}</span>
            </button>
            <div className="sep" />
            <button
              className="btn primary"
              aria-haspopup="menu"
              onClick={(e) =>
                openPop(e.currentTarget, () => (
                  <div className="m-list" style={{ width: 280 }}>
                    <MenuItem icon={<I.Rows />} label="Insert row" sub={`Insert a new row into ${t.name}`} onClick={() => { closePop(); setOverlay({ kind: "row", table: key, id: null }); }} />
                    <MenuItem icon={<I.Cols />} label="Insert column" sub={`Insert a new column into ${t.name}`} onClick={() => { closePop(); setOverlay({ kind: "column", table: key }); }} />
                    <div className="m-sep" />
                    <MenuItem icon={<I.Upload />} label="Import data from CSV" sub="Insert new rows from a CSV" onClick={() => { closePop(); app.ui.nav("Import data from CSV"); }} />
                  </div>
                ))
              }
            >
              <I.Plus />Insert<I.ChevronDown />
            </button>
          </>
        )}
        <div className="sp" />
        <button className="btn" aria-label="Refresh" onClick={refresh}><I.Refresh /><span className="lbl-hide">Refresh</span></button>
        {t.rls ? (
          <button className="btn rls-btn" aria-label={`${t.policies} RLS policies`} onClick={() => app.ui.nav("RLS policies")}>
            <I.Shield /><span className="lbl-hide">RLS policies</span><span className="cnt">{t.policies}</span>
          </button>
        ) : (
          <button className="btn rls-btn off" onClick={() => setOverlay({ kind: "rls", table: key })}><I.Unlock />RLS disabled</button>
        )}
      </div>
      {t.rls ? null : (
        <div className="banner" role="alert">
          <I.Warn />
          <div className="bt">
            <b>Row Level Security is disabled on this table</b>
            <p>Anyone with your project's anon key can read, modify, or delete rows in <code>{t.schema}.{t.name}</code>. Enable RLS and add policies to control access.</p>
          </div>
          <div className="ba">
            <button className="btn" onClick={() => app.ui.nav("RLS docs")}>Learn more</button>
            <button className="btn primary" onClick={() => setOverlay({ kind: "rls", table: key })}>Enable RLS</button>
          </div>
        </div>
      )}
      {mode === "definition" ? (
        <div className="code" style={{ borderTop: t.rls ? 0 : "1px solid var(--border)", marginTop: t.rls ? 0 : 10 }} aria-label={`Definition of ${t.name}`}>
          <Code src={ddl(t)} />
        </div>
      ) : (
        <div className={`grid-wrap${t.rls ? " flush" : ""}${loading ? " loading" : ""}`} ref={gridRef}>
          <table className="grid" aria-label={`Rows of ${t.name}`} aria-rowcount={total}>
            <colgroup>
              <col style={{ width: 64 }} />
              {t.columns.map((c) => <col key={c.name} style={{ width: colWidth(c) }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="ck" scope="col">
                  <div className="ck-in">
                    <input type="checkbox" className="cbx" aria-label="Select all rows on this page" checked={allOn} ref={(el) => { if (el) el.indeterminate = someOn && !allOn; }} onChange={toggleAll} />
                  </div>
                </th>
                {t.columns.map((c) => {
                  const s = sorts.find((x) => x.column === c.name);
                  return (
                    <th key={c.name} scope="col" style={{ width: colWidth(c) }}>
                      <div className="th-in">
                        {c.primaryKey ? <I.Key className="i key" /> : null}
                        <span className="cn">{c.name}</span>
                        <span className="ct">{c.type}</span>
                        <span className="sp" />
                        {s ? (s.ascending ? <I.ArrowUp className="i th-sort" /> : <I.ArrowDown className="i th-sort" />) : null}
                        <button
                          className="th-menu"
                          aria-label={`Column menu: ${c.name}`}
                          aria-expanded="false"
                          onClick={(e) =>
                            openPop(e.currentTarget, () => (
                              <div className="m-list">
                                <MenuItem icon={<I.ArrowUp />} label="Sort ascending" onClick={() => { app.ui.setSorts(key, [{ column: c.name, ascending: true }]); closePop(); }} />
                                <MenuItem icon={<I.ArrowDown />} label="Sort descending" onClick={() => { app.ui.setSorts(key, [{ column: c.name, ascending: false }]); closePop(); }} />
                                <div className="m-sep" />
                                <MenuItem icon={<I.Copy />} label="Copy name" onClick={() => { void navigator.clipboard?.writeText(c.name).catch(() => {}); closePop(); app.toast("Copied to clipboard"); }} />
                              </div>
                            ), { align: "end" })
                          }
                        >
                          <I.ChevronDown />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => {
                const id = ids[i];
                const n = (page - 1) * pageSize + i + 1;
                const open = () => setOverlay({ kind: "row", table: key, id });
                return (
                  <tr key={id} className={`${selected.has(id) ? "sel" : ""}${flash === id ? " flash" : ""}`}>
                    <td className="ck">
                      <div className="ck-in">
                        <input type="checkbox" className="cbx" aria-label={`Select row ${n}`} checked={selected.has(id)} onChange={() => toggle(id)} />
                        <button className="exp" aria-label={`Expand row ${n}`} onClick={open}><I.Expand /></button>
                      </div>
                    </td>
                    {t.columns.map((c) => (
                      <td key={c.name} onClick={open}><Cell value={r[c.name]} /></td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total ? null : filters.length ? (
            <div className="grid-empty">
              <b>No rows found</b>No rows match the filters on this table.<br />
              <button className="btn" style={{ marginTop: 12 }} onClick={() => app.ui.setFilters(key, [])}>Remove filters</button>
            </div>
          ) : (
            <div className="grid-empty"><b>This table is empty</b>Add rows with Insert.</div>
          )}
        </div>
      )}
      <div className="foot">
        <button className="icon-btn" aria-label="Previous page" disabled={page <= 1 || mode !== "data"} onClick={() => { app.ui.setPage(key, page - 1); gridRef.current?.scrollTo(0, 0); }}><I.ChevronLeft /></button>
        <button className="icon-btn" aria-label="Next page" disabled={page >= pages || mode !== "data"} onClick={() => { app.ui.setPage(key, page + 1); gridRef.current?.scrollTo(0, 0); }}><I.ChevronRight /></button>
        <span>{fmtN(total ? (page - 1) * pageSize + 1 : 0)} - {fmtN(Math.min(page * pageSize, total))} of {fmtN(total)} rows</span>
        <span className="sp" />
        <div className="seg" role="radiogroup" aria-label="View">
          {(["data", "definition"] as const).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} role="radio" aria-checked={mode === m} onClick={() => app.ui.setMode(key, m)}>
              {m === "data" ? "Data" : "Definition"}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/** Filter rules, edited as a draft and applied with the button. */
function FilterPop({ table, tableKey }: { table: SupabaseTableState; tableKey: string }) {
  const { app, closePop } = useUI();
  const first = table.columns[0]?.name ?? "";
  const [draft, setDraft] = useState<SupabaseFilter[]>(() => {
    const cur = app.state.filters[tableKey] ?? [];
    return cur.length ? structuredClone(cur) : [{ column: first, op: "=", value: "" }];
  });
  const set = (i: number, patch: Partial<SupabaseFilter>) => setDraft((d) => d.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <>
      <div className="fp-rows">
        {draft.length ? (
          draft.map((f, i) => (
            <div className="fp-row" key={i}>
              <select className="input" aria-label="Column" value={f.column} onChange={(e) => set(i, { column: e.target.value })}>
                {table.columns.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
              <select className="input mono" aria-label="Operator" value={f.op} onChange={(e) => set(i, { op: e.target.value as SupabaseFilter["op"] })}>
                {OPERATORS.map(([o, l]) => <option key={o} value={o} title={l}>{o}</option>)}
              </select>
              <input className="input mono" aria-label="Value" placeholder={f.op === "is" ? "null, not null, true, false" : "Enter a value"} value={f.value} onChange={(e) => set(i, { value: e.target.value })} />
              <button className="icon-btn" aria-label="Remove filter" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}><I.X /></button>
            </div>
          ))
        ) : (
          <div className="fp-empty">No filters applied to this view</div>
        )}
      </div>
      <div className="fp-foot">
        <button className="btn ghost" onClick={() => setDraft((d) => [...d, { column: first, op: "=", value: "" }])}><I.Plus />Add filter</button>
        <button className="btn primary" onClick={() => { app.ui.setFilters(tableKey, draft.filter((f) => f.op === "is" || f.value.trim() !== "")); closePop(); }}>Apply filter</button>
      </div>
    </>
  );
}

function SortPop({ table, tableKey }: { table: SupabaseTableState; tableKey: string }) {
  const { app, closePop } = useUI();
  const [draft, setDraft] = useState<SupabaseSort[]>(() => structuredClone(app.state.sorts[tableKey] ?? []));
  const used = new Set(draft.map((s) => s.column));
  return (
    <>
      <div className="fp-rows">
        {draft.length ? (
          draft.map((s, i) => (
            <div className="fp-row s" key={s.column}>
              <span className="mono" style={{ fontSize: 12 }}>{s.column}</span>
              <label className="asc">
                <input type="checkbox" className="cbx" checked={s.ascending} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, ascending: e.target.checked } : x)))} />
                ascending
              </label>
              <button className="icon-btn" aria-label="Remove sort" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}><I.X /></button>
            </div>
          ))
        ) : (
          <div className="fp-empty">No sorts applied to this view</div>
        )}
      </div>
      <div className="fp-foot">
        <select className="input" aria-label="Pick a column to sort by" style={{ width: "auto", height: 26, fontSize: 12 }} value="" onChange={(e) => e.target.value && setDraft((d) => [...d, { column: e.target.value, ascending: true }])}>
          <option value="">Pick a column to sort by</option>
          {table.columns.filter((c) => !used.has(c.name)).map((c) => <option key={c.name}>{c.name}</option>)}
        </select>
        <button className="btn primary" onClick={() => { app.ui.setSorts(tableKey, draft); closePop(); }}>Apply sorting</button>
      </div>
    </>
  );
}
