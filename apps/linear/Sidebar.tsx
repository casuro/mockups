import type { ReactNode } from "react";
import { useUI } from "./context";
import * as I from "./icons";

// The sidebar: the workspace, Inbox and My issues, the workspace's
// Projects and Views, and each team with its Issues, Cycles, Projects and
// Views.

function Nav({ to, icon, label, sub, extra }: { to: string; icon: ReactNode; label: string; sub?: boolean; extra?: ReactNode }) {
  const { linear } = useUI();
  const on = linear.state.nav === to;
  return (
    <button className={`nav${sub ? " sub" : ""}${on ? " on" : ""}`} aria-current={on ? "page" : undefined} onClick={() => linear.ui.navigate(to)}>
      {icon}
      <span>{label}</span>
      {extra}
    </button>
  );
}

export function Sidebar() {
  const { linear, openCommand } = useUI();
  const { seed, state, teams } = linear;
  return (
    <aside className="sb" aria-label={`${seed.workspace.name} sidebar`}>
      <div className="sb-top">
        <button className="ws" aria-label={`${seed.workspace.name} workspace`}>
          <span className="ws-av">{seed.workspace.initial ?? seed.workspace.name.charAt(0).toUpperCase()}</span>
          <span>{seed.workspace.name}</span>
          <I.Chev />
        </button>
        <button className="icon-btn" title="Search (Cmd K)" aria-label="Search" onClick={openCommand}>
          <I.Search />
        </button>
        <button className="icon-btn boxed" title="New issue" aria-label="New issue" onClick={() => linear.ui.create()}>
          <I.Edit />
        </button>
      </div>
      <Nav to="inbox" icon={<I.Inbox />} label="Inbox" extra={state.inbox ? <span className="count">{state.inbox}</span> : null} />
      <Nav to="mine" icon={<I.Mine />} label="My issues" />
      <button className="sb-sec">Workspace</button>
      <Nav to="projects" icon={<I.Projects />} label="Projects" />
      <Nav to="views" icon={<I.Views />} label="Views" />
      <button className="sb-sec">
        Your teams <I.Caret />
      </button>
      {teams.map((t) => {
        const open = state.expanded.includes(t.id);
        return (
          <div key={t.id} className={open ? undefined : "collapsed"}>
            <button className="team" aria-expanded={open} onClick={() => linear.ui.toggleTeam(t.id)}>
              <span className="team-ic" style={{ background: t.color }}>{t.letter}</span>
              {t.name}
              <I.Caret />
            </button>
            {open ? (
              <>
                <Nav sub to={`${t.id}:issues`} icon={<I.Issues />} label="Issues" />
                <Nav sub to={`${t.id}:cycles`} icon={<I.Cycles />} label="Cycles" />
                <Nav sub to={`${t.id}:projects`} icon={<I.Projects />} label="Projects" />
                <Nav sub to={`${t.id}:views`} icon={<I.Views />} label="Views" />
              </>
            ) : null}
          </div>
        );
      })}
      <div className="sb-foot">
        <I.Help />
        <span>Help and support</span>
        <span className="logo" title="Linear"><I.LinearLogo /></span>
      </div>
    </aside>
  );
}
