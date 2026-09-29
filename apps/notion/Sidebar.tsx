import { Fragment, type CSSProperties, type ReactNode } from "react";
import { PageIcon, Pop, titleOf, useUI, type Box } from "./context";
import * as I from "./icons";

// The sidebar: the workspace switcher and its menu, Search, Home and
// Inbox, then Favorites, Teamspaces and Private, each a tree of pages
// with carets.

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const depth = (d: number) => ({ "--d": d }) as CSSProperties;

function Row({ icon, label, badge, onClick }: { icon: ReactNode; label: string; badge?: number; onClick: () => void }) {
  return (
    <div className="sb-row" role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <span className="ic">{icon}</span>
      <span className="lbl">{label}</span>
      {badge ? <span className="sb-badge">{badge}</span> : null}
    </div>
  );
}

function Section({ label, acts, children }: { label: string; acts?: ReactNode; children: ReactNode }) {
  return (
    <div className="sb-sec">
      <div className="sb-sec-h">
        <span className="lbl">{label}</span>
        <span className="acts">{acts}</span>
      </div>
      {children}
    </div>
  );
}

function Mini({ label, icon, id }: { label: string; icon: ReactNode; id?: string }) {
  const { notion } = useUI();
  return (
    <button className="sb-mini" aria-label={label} onClick={(e) => { e.stopPropagation(); notion.ui.action(label, id); }}>
      {icon}
    </button>
  );
}

/** Pages under `ids`, each with its caret; `ctx` keeps a page's caret separate in each section. */
function Tree({ ids, d, ctx }: { ids: string[]; d: number; ctx: string }) {
  const { notion } = useUI();
  const { state } = notion;
  return (
    <>
      {ids.map((id) => {
        const p = state.pages[id];
        if (!p) return null;
        const key = `${ctx}:${id}`;
        const open = state.expanded.includes(key);
        const kids = p.database ? [] : state.order.filter((x) => state.pages[x].parent === id);
        return (
          <Fragment key={key}>
            <div className={`sb-row sb-page${state.current === id ? " active" : ""}`} style={depth(d)} role="button" tabIndex={0} onClick={() => notion.ui.go(id)}>
              <span className="pic">
                <span className="emo"><PageIcon id={id} /></span>
                <button className={`caret${open ? " open" : ""}`} aria-label={open ? "Collapse" : "Expand"} onClick={(e) => { e.stopPropagation(); notion.ui.expand(key); }}>
                  <I.ChevRight />
                </button>
              </span>
              <span className="lbl">{titleOf(p)}</span>
              <span className="acts">
                <Mini label="Page options" icon={<I.More />} id={id} />
                <Mini label="Add a page inside" icon={<I.Plus />} id={id} />
              </span>
            </div>
            {open ? (
              p.database ? (
                <div className="sb-row sb-page" style={depth(d + 1)} role="button" tabIndex={0} onClick={() => notion.ui.go(id)}>
                  <span className="pic"><span className="emo"><I.Table /></span></span>
                  <span className="lbl">Table</span>
                </div>
              ) : kids.length ? (
                <Tree ids={kids} d={d + 1} ctx={ctx} />
              ) : (
                <div className="sb-empty" style={depth(d + 1)}>No pages inside</div>
              )
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

export function Sidebar({ onToggle }: { onToggle: () => void }) {
  const { notion, openPop } = useUI();
  const { seed, state, teamspaces } = notion;
  const ws = seed.workspace;
  const roots = (parent: string) => state.order.filter((id) => state.pages[id].parent === parent);
  const plus = <Mini label="New page" icon={<I.Plus />} />;
  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sb-top">
        <div className="ws-switch" data-pop="workspace" role="button" tabIndex={0} onClick={(e) => openPop("workspace", e.currentTarget)}>
          <span className="ws-ic">{ws.initial ?? ws.name.charAt(0).toUpperCase()}</span>
          <span className="ws-name">{ws.name}</span>
          <span className="chev"><I.ChevDown /></span>
        </div>
        <button className="sb-iconbtn collapse" aria-label="Close sidebar" onClick={onToggle}><I.DblLeft /></button>
        <button className="sb-iconbtn" aria-label="New page" onClick={() => notion.ui.action("New page")}><I.Compose /></button>
      </div>
      <div className="sb-scroll">
        <Row icon={<I.Search />} label="Search" onClick={() => notion.ui.action("Search")} />
        <Row icon={<I.Home />} label="Home" onClick={() => notion.ui.action("Home")} />
        <Row icon={<I.Inbox />} label="Inbox" badge={seed.inbox} onClick={() => notion.ui.action("Inbox")} />
        {state.favorites.length ? (
          <Section label="Favorites">
            <Tree ids={state.favorites} d={0} ctx="fav" />
          </Section>
        ) : null}
        {teamspaces.length ? (
          <Section label="Teamspaces">
            {teamspaces.map((t) => (
              <Fragment key={t.id}>
                <div className="sb-row sb-page" style={depth(0)} role="button" tabIndex={0} onClick={() => notion.ui.expand(t.id)}>
                  <span className="ts-ic" style={{ background: `var(--b-${t.color ?? "gray"})` }}>{t.icon}</span>
                  <span className="lbl">{t.name}</span>
                  <span className="acts">{plus}</span>
                </div>
                {state.expanded.includes(t.id) ? <Tree ids={roots(t.id)} d={1} ctx="tp" /> : null}
              </Fragment>
            ))}
          </Section>
        ) : null}
        <Section label="Private" acts={plus}>
          <Tree ids={roots("private")} d={0} ctx="pv" />
        </Section>
      </div>
    </aside>
  );
}

export function WorkspaceMenu({ anchor }: { anchor: Box }) {
  const { notion, closePop } = useUI();
  const { seed, state, people, me } = notion;
  const ws = seed.workspace;
  const pick = (fn: () => void) => () => {
    closePop();
    fn();
  };
  const item = (label: string, icon: ReactNode, onClick: () => void, chk = false) => (
    <button className="mi" aria-label={label} onClick={pick(onClick)}>
      <span className="ic">{icon}</span>
      <span className="lbl">{label}</span>
      {chk ? <span className="chk"><I.Check /></span> : null}
    </button>
  );
  return (
    <Pop anchor={anchor} width={280} label="Workspace">
      <div className="mh">{people[me].email || people[me].name}</div>
      <div className="ws-card">
        <span className="ws-ic lg">{ws.initial ?? ws.name.charAt(0).toUpperCase()}</span>
        <div>
          <div className="n">{ws.name}</div>
          {ws.plan ? <div className="d">{ws.plan}</div> : null}
        </div>
      </div>
      <div className="msep" />
      <div className="mh">Appearance<span className="r">{IS_MAC ? "⌘⇧L" : "Ctrl+Shift+L"}</span></div>
      {item("Light", <I.Sun />, () => notion.ui.setTheme("light"), state.theme === "light")}
      {item("Dark", <I.Moon />, () => notion.ui.setTheme("dark"), state.theme === "dark")}
      <div className="msep" />
      {item("Get the desktop app", <span className="nlogo"><I.NotionLogo /></span>, () => notion.ui.action("Get the desktop app"))}
      {item("Log out", <I.Logout />, () => notion.ui.action("Log out"))}
    </Pop>
  );
}
