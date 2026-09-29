import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { useUI, type Overlay } from "./context";
import { clamp, fieldText, idOf, isJson, isNumeric, parseField } from "./format";
import * as I from "./icons";
import { NAV, SETTINGS, useNavigate } from "./TopBar";
import type { SupabaseColumn, SupabaseRow, SupabaseValue } from "./types";

// What covers the app: Studio's side panel (a row, a new column), the
// confirm dialogs, Connect, and the search palette.

export function Overlays() {
  const { overlay } = useUI();
  if (!overlay) return null;
  switch (overlay.kind) {
    case "row": return <RowPanel key={`${overlay.table}:${overlay.id}`} table={overlay.table} id={overlay.id} />;
    case "column": return <ColumnPanel table={overlay.table} />;
    case "delete": return <DeleteDialog o={overlay} />;
    case "rls": return <RlsDialog table={overlay.table} />;
    case "connect": return <ConnectDialog />;
    case "palette": return <Palette />;
  }
}

function useFocusFirst(ref: RefObject<HTMLElement | null>, selector: string) {
  useEffect(() => {
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }), 30);
    return () => clearTimeout(t);
  }, [ref, selector]);
}

function Panel({ title, label, children, onSave }: { title: ReactNode; label: string; children: ReactNode; onSave: () => void }) {
  const { setOverlay } = useUI();
  const ref = useRef<HTMLElement>(null);
  useFocusFirst(ref, "form input:not([disabled]), form textarea:not([disabled]), form select:not([disabled])");
  const close = () => setOverlay(null);
  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="panel" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        <div className="panel-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close panel" onClick={close}><I.X /></button>
        </div>
        <form
          className="panel-body"
          noValidate
          onSubmit={(e) => { e.preventDefault(); onSave(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); onSave(); }
          }}
        >
          {children}
        </form>
        <div className="panel-foot">
          <button className="btn lg" onClick={close}>Cancel</button>
          <button className="btn primary lg" onClick={onSave}>Save</button>
        </div>
      </aside>
    </>
  );
}

function Field({ label, type, hint, error, htmlFor, children }: { label: string; type?: string; hint?: string; error?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="f-lbl">
        <label htmlFor={htmlFor}>{label}</label>
        {type ? <span className="ft">{type}</span> : null}
      </div>
      <div className="f-in">
        {children}
        {hint ? <span className="f-hint">{hint}</span> : null}
        {error ? <span className="f-err">{error}</span> : null}
      </div>
    </div>
  );
}

function RowPanel({ table, id }: { table: string; id: string | null }) {
  const { app, setOverlay, setFlash } = useUI();
  const t = app.state.tables[table];
  const row = id == null ? null : t?.rows.find((r) => idOf(t, r) === id) ?? null;
  const isNew = !row;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries((t?.columns ?? []).map((c) => [c.name, row ? fieldText(c, row[c.name]) : ""])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!t) return null;
  const set = (name: string, v: string) => setValues((x) => ({ ...x, [name]: v }));

  const save = () => {
    const out: SupabaseRow = {};
    const errs: Record<string, string> = {};
    for (const c of t.columns) {
      if (!isNew && c.primaryKey) continue;
      const p = parseField(c, values[c.name] ?? "", t.rows, isNew);
      if ("error" in p) errs[c.name] = p.error;
      else out[c.name] = p.value;
    }
    if (isNew && !errs[pkName(t.columns)] && t.rows.some((r) => idOf(t, r) === idOf(t, out))) errs[pkName(t.columns)] = "A row with this primary key already exists";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (isNew) {
      const newId = app.ui.insert(table, out);
      setFlash(newId);
      app.toast(`Successfully added a row to ${t.name}`);
    } else {
      app.ui.edit(table, id!, out);
      setFlash(id);
      app.toast("Successfully updated row");
    }
    setOverlay(null);
  };

  return (
    <Panel title={<>{isNew ? "Add new row to" : "Update row from"} <code>{t.name}</code></>} label={`${isNew ? "Add new row to" : "Update row from"} ${t.name}`} onSave={save}>
      <div className="p-sec">
        {t.columns.map((c) => (
          <RowField key={c.name} c={c} value={values[c.name] ?? ""} original={row ? row[c.name] : undefined} isNew={isNew} error={errors[c.name]} onChange={(v) => set(c.name, v)} />
        ))}
      </div>
    </Panel>
  );
}

const pkName = (cols: SupabaseColumn[]) => cols.find((c) => c.primaryKey)?.name ?? cols[0]?.name ?? "";

function RowField({ c, value, original, isNew, error, onChange }: { c: SupabaseColumn; value: string; original: SupabaseValue | undefined; isNew: boolean; error?: string; onChange: (v: string) => void }) {
  const id = useId();
  const disabled = !isNew && !!c.primaryKey;
  const defHint = isNew && c.default ? `Default: ${c.default}` : isNew && c.identity ? "Generated by default as identity" : c.nullable ? "NULL" : "";
  const hint = c.primaryKey && !isNew ? "Primary key" : c.references ? `References ${c.references}` : c.type === "timestamptz" ? "Format: YYYY-MM-DD HH:MM:SS+00" : undefined;
  const cls = `input mono${error ? " err" : ""}`;
  let input: ReactNode;
  if (c.type === "bool") {
    const cur = value === "" && !isNew && original === null ? "null" : value;
    input = (
      <select className={`input${error ? " err" : ""}`} id={id} value={cur} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {isNew ? <option value="">{c.default ? `Default: ${c.default}` : "Select a value"}</option> : null}
        <option value="true">TRUE</option>
        <option value="false">FALSE</option>
        {c.nullable ? <option value="null">NULL</option> : null}
      </select>
    );
  } else if (isJson(c.type)) {
    const lines = value ? value.split("\n").length : 3;
    input = <textarea className={cls} id={id} rows={clamp(lines, 3, 10)} placeholder={defHint || "{}"} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  } else {
    const ph = defHint || (c.type === "uuid" ? "uuid" : isNumeric(c.type) ? "0" : c.type === "timestamptz" ? "YYYY-MM-DD HH:MM:SS+00" : "");
    input = <input className={cls} id={id} inputMode={isNumeric(c.type) ? "numeric" : undefined} placeholder={ph} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
  return <Field label={c.name} type={c.type} hint={hint} error={error} htmlFor={id}>{input}</Field>;
}

const TYPES = ["text", "int8", "bool", "uuid", "jsonb", "timestamptz"];

function ColumnPanel({ table }: { table: string }) {
  const { app, setOverlay } = useUI();
  const t = app.state.tables[table];
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [def, setDef] = useState("");
  const [nullable, setNullable] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; def?: string }>({});
  const uid = useId();
  if (!t) return null;

  const save = () => {
    const n = name.trim();
    const d = def.trim();
    if (!/^[a-z_][a-z0-9_]*$/.test(n)) return setErrors({ name: n ? "Use lowercase letters, digits and underscores" : "Please provide a name for your column" });
    if (t.columns.some((c) => c.name === n)) return setErrors({ name: `A column named ${n} already exists` });
    const column: SupabaseColumn = { name: n, type, nullable };
    let value: SupabaseValue = null;
    if (d) {
      const p = parseField({ ...column, nullable: true }, d, t.rows, false);
      if ("error" in p) return setErrors({ def: p.error });
      value = p.value;
      column.default = type === "text" ? `'${d}'::text` : type === "jsonb" ? `'${JSON.stringify(value)}'::jsonb` : d;
    }
    if (!nullable && value === null) return setErrors({ def: "A column that is not nullable needs a default value for existing rows" });
    app.ui.addColumn(table, column, value);
    app.toast(`Successfully created column "${n}"`);
    setOverlay(null);
  };

  return (
    <Panel title={<>Add new column to <code>{t.name}</code></>} label={`Add new column to ${t.name}`} onSave={save}>
      <div className="p-sec">
        <h3>General</h3>
        <Field label="Name" htmlFor={`${uid}-name`} hint="Recommended to use lowercase and underscores" error={errors.name}>
          <input className={`input mono${errors.name ? " err" : ""}`} id={`${uid}-name`} placeholder="column_name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      <div className="p-sec">
        <h3>Data Type</h3>
        <Field label="Type" htmlFor={`${uid}-type`}>
          <select className="input" id={`${uid}-type`} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Default Value" htmlFor={`${uid}-def`} hint="Used for existing rows and when a new row leaves it empty" error={errors.def}>
          <input className={`input mono${errors.def ? " err" : ""}`} id={`${uid}-def`} placeholder="NULL" value={def} onChange={(e) => setDef(e.target.value)} />
        </Field>
      </div>
      <div className="p-sec" style={{ borderBottom: 0 }}>
        <h3>Constraints</h3>
        <label className="f-check"><input type="checkbox" className="cbx" checked={nullable} onChange={(e) => setNullable(e.target.checked)} />Is Nullable</label>
      </div>
    </Panel>
  );
}

function Dialog({ title, children, foot, wide }: { title: string; children: ReactNode; foot: ReactNode; wide?: boolean }) {
  const { setOverlay } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  useFocusFirst(ref, ".dlg-foot .btn:last-child");
  return (
    <div className="dlg-wrap" onClick={(e) => e.target === e.currentTarget && setOverlay(null)}>
      <div className={`dlg${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="dlg-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close dialog" onClick={() => setOverlay(null)}><I.X /></button>
        </div>
        <div className="dlg-body">{children}</div>
        <div className="dlg-foot">{foot}</div>
      </div>
    </div>
  );
}

function DeleteDialog({ o }: { o: Extract<Overlay, { kind: "delete" }> }) {
  const { app, setOverlay, setSelected } = useUI();
  const t = app.state.tables[o.table];
  const n = o.ids.length;
  const rows = `${n} row${n === 1 ? "" : "s"}`;
  return (
    <Dialog
      title="Confirm to delete the selected rows"
      foot={
        <>
          <button className="btn lg" onClick={() => setOverlay(null)}>Cancel</button>
          <button className="btn danger lg" onClick={() => { app.ui.remove(o.table, o.ids); setSelected(new Set()); setOverlay(null); app.toast(`Successfully deleted ${rows}`); }}>Delete</button>
        </>
      }
    >
      <p>Are you sure you want to delete the selected {rows} from <code className="mono">{t?.name}</code>? This action cannot be undone.</p>
    </Dialog>
  );
}

function RlsDialog({ table }: { table: string }) {
  const { app, setOverlay } = useUI();
  const t = app.state.tables[table];
  if (!t) return null;
  return (
    <Dialog
      title="Enable Row Level Security"
      foot={
        <>
          <button className="btn lg" onClick={() => setOverlay(null)}>Cancel</button>
          <button className="btn primary lg" onClick={() => { app.ui.enableRls(table); setOverlay(null); app.toast(`Row Level Security enabled on ${t.name}`); }}>Enable RLS</button>
        </>
      }
    >
      <p>Once RLS is on, no rows in <code className="mono">{t.schema}.{t.name}</code> can be read through the API until you add policies.</p>
      <p>Queries from the Table Editor and the SQL Editor are not affected.</p>
    </Dialog>
  );
}

function ConnectDialog() {
  const { app, setOverlay } = useUI();
  const { project } = app.seed;
  const ref = project.ref ?? "your-project-ref";
  const rows: [string, string, string][] = [
    ["Direct connection", `postgresql://postgres:[YOUR-PASSWORD]@db.${ref}.supabase.co:5432/postgres`, "Copy connection string"],
    ["Project URL", `https://${ref}.supabase.co`, "Copy project URL"],
  ];
  const copy = (v: string) => {
    void navigator.clipboard?.writeText(v).catch(() => {});
    app.toast("Copied to clipboard");
  };
  return (
    <Dialog title="Connect to your project" wide foot={<button className="btn lg" onClick={() => setOverlay(null)}>Close</button>}>
      <p>Use a connection string to reach <b className="hint-t">{project.name}</b> from your app or a database client.</p>
      {rows.map(([label, value, aria]) => (
        <div className="conn" key={label}>
          <label>{label}</label>
          <div className="conn-row">
            <code>{value}</code>
            <button className="btn" aria-label={aria} onClick={() => copy(value)}><I.Copy />Copy</button>
          </div>
        </div>
      ))}
    </Dialog>
  );
}

function Palette() {
  const { app, setOverlay } = useUI();
  const go = useNavigate();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    list.current?.querySelector(".act")?.scrollIntoView({ block: "nearest" });
  }, [idx, q]);

  // A table named like one in another schema shows its schema too.
  const tables = Object.entries(app.state.tables);
  const shared = (name: string) => tables.filter(([, t]) => t.name === name).length > 1;
  const items = [
    ...tables.map(([key, t]) => ({ key: `t:${key}`, group: "Tables", label: shared(t.name) ? `${t.schema}.${t.name}` : t.name, Icon: I.Table, act: () => app.ui.selectTable(key) })),
    ...app.state.snippets.map((s) => ({ key: `s:${s.id}`, group: "SQL snippets", label: s.name, Icon: I.File, act: () => app.ui.openSnippet(s.id) })),
    ...[...NAV.flat(), SETTINGS].map(([k, label, Icon]) => ({ key: `n:${k}`, group: "Navigate", label, Icon, act: () => go(k, label) })),
  ].filter((it) => it.label.toLowerCase().includes(q.trim().toLowerCase()));
  const cur = clamp(idx, 0, Math.max(0, items.length - 1));
  const pick = (i: number) => {
    const it = items[i];
    if (!it) return;
    setOverlay(null);
    it.act();
  };

  let group = "";
  return (
    <div className="palette" onClick={(e) => e.target === e.currentTarget && setOverlay(null)}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Search">
        <div className="pal-in">
          <I.Search />
          <input
            ref={input}
            placeholder="Search tables, queries and pages..."
            aria-label="Search tables, queries and pages"
            autoComplete="off"
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((cur + 1) % Math.max(1, items.length)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((cur - 1 + items.length) % Math.max(1, items.length)); }
              if (e.key === "Enter") { e.preventDefault(); pick(cur); }
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="pal-list" role="listbox" aria-label="Results" ref={list}>
          {items.length ? (
            items.map((it, i) => {
              const head = it.group !== group ? (group = it.group) : null;
              return (
                <div key={it.key} style={{ display: "contents" }}>
                  {head ? <div className="m-head">{head}</div> : null}
                  <button className={`mi${i === cur ? " act" : ""}`} role="option" aria-selected={i === cur} onClick={() => pick(i)}>
                    <it.Icon />
                    <span className="mt">{it.label}</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="ms-empty">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
