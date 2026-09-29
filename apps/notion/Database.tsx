import type { ReactNode } from "react";
import { Avatar, titleOf, useUI } from "./context";
import { fmtLong, isoDay } from "./format";
import * as I from "./icons";
import type { NotionPage, NotionProperty } from "./types";

// A database as its table view: the view tabs and tools, a column per
// property, a row per page whose parent is the database, and the count.
// Drawn as a page of its own, or inline in another page.

const WIDTH: Record<NotionProperty["type"], number> = { title: 300, status: 150, person: 180, date: 140, select: 120, multi: 230, text: 200 };
const TYPE_ICON: Record<NotionProperty["type"], ReactNode> = {
  title: <I.TitleProp />, status: <I.Status />, select: <I.Select />, multi: <I.Multi />, person: <I.Person />, date: <I.Calendar />, text: <I.TextProp />,
};

function Tag({ prop, name }: { prop: NotionProperty; name: string }) {
  const color = prop.options?.find((o) => o.name === name)?.color ?? "default";
  return prop.type === "status" ? (
    <span className={`tag st tg-${color}`}><i />{name}</span>
  ) : (
    <span className={`tag tg-${color}`}>{name}</span>
  );
}

function Cell({ row, prop, props }: { row: NotionPage; prop: NotionProperty; props: NotionProperty[] }) {
  const { notion } = useUI();
  const { people, ui } = notion;
  if (prop.type === "title")
    return (
      <div className="cell title" onClick={() => ui.action("Open row", row.id)}>
        <span className={`t${row.title ? "" : " empty"}`}>{titleOf(row, true)}</span>
        <button className="open-btn" onClick={(e) => { e.stopPropagation(); ui.action("Side peek", row.id); }}><I.Expand />OPEN</button>
      </div>
    );
  const v = row.properties?.[prop.id];
  const list = Array.isArray(v) ? v : v ? [v] : [];
  const one = typeof v === "string" ? v : list[0];
  let body: ReactNode = null;
  if ((prop.type === "status" || prop.type === "select") && one) body = <Tag prop={prop} name={one} />;
  else if (prop.type === "multi") body = <div className="tags">{list.map((n) => <Tag key={n} prop={prop} name={n} />)}</div>;
  else if (prop.type === "person")
    body = <div className="ppl">{list.filter((id) => people[id]).map((id) => <span key={id} className="person"><Avatar id={id} />{people[id].name}</span>)}</div>;
  else if (prop.type === "date" && one) {
    // Past due, unless its status is one marked done.
    const done = props.some((p) => p.type === "status" && p.options?.find((o) => o.name === row.properties?.[p.id])?.done);
    body = <span className={`date-t${one < isoDay(new Date()) && !done ? " over" : ""}`}>{fmtLong(one)}</span>;
  } else if (prop.type === "text") body = list.join(", ");
  const tags = prop.type === "multi" || prop.type === "status" || prop.type === "select";
  return <div className={`cell${tags ? " tags-cell" : ""}`}>{body}</div>;
}

export function Database({ id, inline = false }: { id: string; inline?: boolean }) {
  const { notion } = useUI();
  const { state, ui } = notion;
  const db = state.pages[id];
  if (!db?.database) return null;
  const props = db.database.properties;
  const rows = state.order.filter((x) => state.pages[x].parent === id).map((x) => state.pages[x]);
  const width = (p: NotionProperty) => p.width ?? WIDTH[p.type];
  const w = props.reduce((a, p) => a + width(p), 0);
  const act = (name: string) => () => ui.action(name, id);
  return (
    <div className="dbv">
      {inline ? (
        <div className="dbv-h" role="link" tabIndex={0} onClick={() => ui.go(id)}>
          <span>{db.icon}</span>
          <span>{titleOf(db)}</span>
        </div>
      ) : null}
      <div className="db-bar">
        <div className="db-tabs">
          <div className="db-tab on"><button><I.Table />Table</button></div>
          <div className="db-tab"><button onClick={act("Board view")}><I.Board />Board</button></div>
        </div>
        <div className="db-tools">
          <button className="tb-ibtn hide-phone" aria-label="Filter" onClick={act("Filter")}><I.Filter /></button>
          <button className="tb-ibtn hide-phone" aria-label="Sort" onClick={act("Sort")}><I.Sort /></button>
          <button className="tb-ibtn" aria-label="Search" onClick={act("Search")}><I.Search /></button>
          <div className="db-new">
            <button onClick={act("New database page")}>New</button>
            <button className="split" aria-label="Templates" onClick={act("Templates")}><I.ChevDown /></button>
          </div>
        </div>
      </div>
      <div className="db-scroll">
        <table className="dbt" style={{ width: w }}>
          <colgroup>{props.map((p) => <col key={p.id} style={{ width: width(p) }} />)}</colgroup>
          <thead>
            <tr>
              {props.map((p) => (
                <th key={p.id}><div className="th-in">{TYPE_ICON[p.type]}<span className="t">{p.name}</span></div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {props.map((p) => <td key={p.id}><Cell row={r} prop={p} props={props} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="db-add-row" style={{ minWidth: w }} role="button" tabIndex={0} onClick={act("New database page")}><I.Plus />New page</div>
        <div className="db-calc">Count<b>{rows.length}</b></div>
      </div>
    </div>
  );
}
