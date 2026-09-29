import { useState, type KeyboardEvent } from "react";
import { useUI } from "./context";
import { Cell, colWidth, fmtN, highlight } from "./format";
import * as I from "./icons";

// The SQL Editor: the snippet list, the editor (a textarea over highlighted
// text) and the results pane. Running a query only emits `run-sql`; the
// world answers with `setResult`.

/** Line numbers and highlighted SQL, read-only (the table's definition). */
export function Code({ src }: { src: string }) {
  return (
    <>
      <div className="gut">{src.split("\n").map((_, i) => i + 1).join("\n")}</div>
      <pre>{highlight(src)}</pre>
    </>
  );
}

export function SnippetList() {
  const { app, listOpen, setListOpen } = useUI();
  const [q, setQ] = useState("");
  const { state } = app;
  const list = state.snippets.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <aside className={`menu-side${listOpen ? " open" : ""}`} aria-label="Queries">
      <div className="ms-head">
        <h1>SQL Editor</h1>
        <button className="icon-btn mb-only" aria-label="Close query list" onClick={() => setListOpen(false)}><I.X /></button>
      </div>
      <div className="ms-tools">
        <button className="btn new-btn" onClick={() => { app.ui.newSnippet(); setListOpen(false); }}><I.Plus />New query</button>
        <div className="ms-search">
          <I.Search />
          <input className="input" placeholder="Search queries..." aria-label="Search queries" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="ms-list" role="list">
        <div className="ms-label">Private <span>({list.length})</span></div>
        {list.map((s) => (
          <button
            key={s.id}
            className={`ms-item${s.id === state.snippet ? " on" : ""}`}
            role="listitem"
            aria-label={s.name}
            aria-current={s.id === state.snippet ? "true" : undefined}
            onClick={() => { app.ui.openSnippet(s.id); setListOpen(false); }}
          >
            <I.File />
            <span className="n">{s.name}</span>
          </button>
        ))}
        {list.length ? null : <div className="ms-empty">{q ? `No queries match "${q}"` : "No saved queries"}</div>}
        <div className="ms-label" style={{ marginTop: 8 }}>Community</div>
        <button className="ms-item" role="listitem" onClick={() => app.ui.nav("Templates")}><I.Docs /><span className="n">Templates</span></button>
        <button className="ms-item" role="listitem" onClick={() => app.ui.nav("Quickstarts")}><I.Play /><span className="n">Quickstarts</span></button>
      </div>
    </aside>
  );
}

export function SqlView() {
  const { app, setListOpen, mod } = useUI();
  const { state } = app;
  const s = app.snippet;
  const tabs = (
    <div className="tabs" role="tablist" aria-label="Open queries">
      {state.sqlTabs.map((id) => {
        const snip = state.snippets.find((x) => x.id === id);
        if (!snip) return null;
        return (
          <div key={id} className={`tab${id === state.snippet ? " on" : ""}`}>
            <button className="tab-open" role="tab" aria-selected={id === state.snippet} aria-label={snip.name} onClick={() => app.ui.openSnippet(id)}>
              <I.File />
              <span className="tl">{snip.name}</span>
            </button>
            <button className="x" aria-label={`Close ${snip.name}`} onClick={() => app.ui.closeSnippet(id)}><I.X /></button>
          </div>
        );
      })}
    </div>
  );
  if (!s)
    return (
      <>
        {tabs}
        <div className="res-hint"><div><b className="hint-t">No query open</b><br />Pick a query from the list, or start a new one.</div></div>
      </>
    );

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    app.ui.editSql(s.id, value.slice(0, a) + "  " + value.slice(b));
    requestAnimationFrame(() => ta.setSelectionRange(a + 2, a + 2));
  };

  return (
    <>
      {tabs}
      <div className="toolbar mb-bar">
        <button className="btn" aria-label={`Queries: ${s.name}`} onClick={() => setListOpen(true)}><I.File />{s.name}<I.ChevronDown /></button>
      </div>
      <div className="sql-area">
        <div className="gut">{s.sql.split("\n").map((_, i) => i + 1).join("\n")}</div>
        <div className="sql-ed">
          <pre>{highlight(s.sql)}{s.sql.endsWith("\n") || !s.sql ? " " : null}</pre>
          <textarea
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label={`SQL for ${s.name}`}
            placeholder="Write your SQL here..."
            value={s.sql}
            onChange={(e) => app.ui.editSql(s.id, e.target.value)}
            onKeyDown={onKey}
          />
        </div>
      </div>
      <section className="results" aria-label="Results">
        <div className="res-head">
          <button className="res-tab on" aria-pressed="true">Results</button>
          <button className="res-tab" onClick={() => app.ui.nav("Explain")}>Explain</button>
          <button className="res-tab" onClick={() => app.ui.nav("Chart")}>Chart</button>
          <span className="sp" />
          <span className="res-meta">Source <span className="badge">Primary database</span> Role <span className="badge">postgres</span></span>
          <button className="btn primary" aria-label="Run query" onClick={() => app.ui.run(s.id)}>Run <kbd>{mod} ↵</kbd></button>
        </div>
        <Result id={s.id} />
      </section>
    </>
  );
}

function Result({ id }: { id: string }) {
  const { app } = useUI();
  const r = app.state.results[id];
  let body;
  let foot = "";
  if (app.state.running === id)
    body = <div className="res-hint"><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="spin" />Running...</div></div>;
  else if (!r) body = <div className="res-hint">Click Run to execute your query.</div>;
  else if ("error" in r) body = <div className="res-msg err" role="alert">{r.error}</div>;
  else if ("message" in r) body = <div className="res-msg">{r.message}</div>;
  else {
    const cols = r.columns.map((c) => (typeof c === "string" ? { name: c, type: undefined } : c));
    foot = `${fmtN(r.rows.length)} row${r.rows.length === 1 ? "" : "s"}`;
    body = r.rows.length ? (
      <table className="grid res" aria-label="Query results">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.name} scope="col" style={{ width: colWidth(c) }}>
                <div className="th-in"><span className="cn">{c.name}</span><span className="ct">{c.type ?? ""}</span></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.rows.map((row, i) => (
            <tr key={i}>{cols.map((c) => <td key={c.name}><Cell value={row[c.name]} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="res-msg">Success. No rows returned</div>
    );
  }
  return (
    <>
      <div className="res-body">{body}</div>
      <div className="res-foot">{foot}</div>
    </>
  );
}
