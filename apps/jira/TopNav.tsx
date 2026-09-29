import { useState, type ReactNode } from "react";
import { Avatar, Lozenge, MenuItem, ProjectMark, useUI, type ListFilters } from "./context";
import { ShortcutsDialog } from "./Dialogs";
import { Mentions, rel } from "./format";
import * as I from "./icons";
import { ordered } from "./use-jira";

// The top bar: the sidebar toggle, the app switcher, Jira's menus, Create,
// search, notifications, help, settings and the profile menu.

type MenuId = "yourwork" | "projects" | "filters" | "dashboards" | "teams" | "apps" | "more";

export function TopNav() {
  const ui = useUI();
  const { jira, openPop, pop } = ui;
  const { state } = jira;
  const unread = state.notifications.filter((n) => !n.read).length;
  const cur = state.view === "yourwork" ? "yourwork" : state.view === "list" ? "filters" : state.view === "reports" ? "dashboards" : "projects";
  const open = (id: string, content: ReactNode, o: { align?: "left" | "right"; cls?: string; focus?: boolean } = {}) => (e: React.MouseEvent<HTMLElement>) =>
    openPop(e.currentTarget, content, { id, ...o });
  const expanded = (id: string) => pop?.id === id;
  const menu = (id: MenuId, label: string) => (
    <button
      className={`menu-btn${cur === id ? " current" : ""}${id === "more" ? " more-btn" : ""}`}
      data-menu={id}
      aria-haspopup="menu"
      aria-expanded={expanded(`menu:${id}`)}
      onClick={open(`menu:${id}`, <NavMenu id={id} />, { cls: ["yourwork", "teams", "apps"].includes(id) ? "wide" : "" })}
    >
      {label}
      <I.ChevD />
    </button>
  );

  return (
    <header className="top">
      <button className="nav-ic" aria-label="Toggle sidebar" title="Toggle sidebar ([)" onClick={ui.toggleSidebar}><I.Sidebar /></button>
      <button className="nav-ic" aria-label="Switch apps" aria-expanded={expanded("apps")} onClick={open("apps", <AppSwitcher />, { cls: "wide" })}><I.Apps /></button>
      <a className="brand" href="#" aria-label="Jira home" onClick={(e) => (e.preventDefault(), jira.ui.navigate("board"))}>
        <I.JiraLogo />
        <span>Jira</span>
      </a>
      <nav className="menus" aria-label="Primary">
        {menu("yourwork", "Your work")}
        {menu("projects", "Projects")}
        {menu("filters", "Filters")}
        {menu("dashboards", "Dashboards")}
        {menu("teams", "Teams")}
        {menu("apps", "Apps")}
        {menu("more", "More")}
      </nav>
      <button className="btn primary create-btn" title="Create (c)" onClick={() => ui.create()}><I.Plus /><span>Create</span></button>
      <div className="grow" />
      <Search />
      <button className="nav-ic" aria-label={`Notifications, ${unread} unread`} aria-expanded={expanded("notifs")} onClick={open("notifs", <Notifications />, { cls: "notif-pop", align: "right" })}>
        <I.Bell />
        {unread ? <span className="badge">{unread}</span> : null}
      </button>
      <button className="nav-ic" data-act="help" aria-label="Help" aria-expanded={expanded("help")} onClick={open("help", <HelpMenu />, { align: "right" })}><I.Help /></button>
      <button className="nav-ic" data-act="settings" aria-label="Settings" aria-expanded={expanded("settings")} onClick={open("settings", <SettingsMenu />, { cls: "wide", align: "right" })}><I.Gear /></button>
      <button className="me" aria-label="Your profile and settings" aria-expanded={expanded("profile")} onClick={open("profile", <ProfileMenu />, { cls: "wide", align: "right" })}>
        <Avatar id={jira.me} size={24} />
      </button>
    </header>
  );
}

/** A menu row that only tells the episode it was pressed. */
function Act({ label, sub, icon, kind = "menu" }: { label: string; sub?: string; icon?: ReactNode; kind?: string }) {
  const { jira, closePop } = useUI();
  return <MenuItem label={label} sub={sub} icon={icon} onClick={() => (closePop(), jira.ui.emit({ type: "action", kind, label }))} />;
}

const starIcon = <I.StarF style={{ color: "#e2b203" }} />;

function NavMenu({ id }: { id: MenuId }) {
  const ui = useUI();
  const { jira, closePop, setList, openPop, pop } = ui;
  const { state, me, people, seed } = jira;
  const go = (view: Parameters<typeof jira.ui.navigate>[0]) => () => (closePop(), jira.ui.navigate(view));
  const openKey = (key: string) => () => (closePop(), jira.ui.openIssue(key));
  const listWith = (patch: Partial<ListFilters>) => () => {
    closePop();
    setList({ type: [], status: [], assignee: [], text: "", sort: { col: "key", dir: "desc" }, jql: false, ...patch });
    jira.ui.navigate("list");
  };
  const issueRow = (key: string, sub: string) => {
    const i = state.issues[key];
    return <MenuItem key={key} label={i.summary} sub={sub} icon={<I.TypeIcon type={i.type} />} onClick={openKey(key)} />;
  };
  const notDone = jira.statuses.slice(0, -1).map((s) => s.id);
  const project = `${seed.project.name} (${seed.project.key})`;

  if (id === "yourwork") {
    const mine = ordered(state).filter((i) => i.assignee === me && i.status !== jira.statuses[jira.statuses.length - 1].id).slice(0, 5);
    return (
      <>
        <div className="menu-h">Assigned to me</div>
        {mine.map((i) => issueRow(i.key, `${i.key} · ${seed.project.name}`))}
        <div className="mi-sep" />
        <div className="menu-h">Recent</div>
        {state.recent.slice(0, 3).filter((k) => state.issues[k]).map((k) => issueRow(k, k))}
        <div className="mi-sep" />
        <button className="mi-foot" onClick={go("yourwork")}>Go to Your Work page</button>
      </>
    );
  }
  if (id === "projects")
    return (
      <>
        <div className="menu-h">Recent</div>
        <MenuItem on label={project} sub={seed.project.kind ?? "Software project"} icon={<ProjectMark size={20} />} onClick={go("board")} />
        <div className="mi-sep" />
        <Act label="View all projects" />
        <Act label="Create project" />
      </>
    );
  if (id === "filters")
    return (
      <>
        <div className="menu-h">Starred</div>
        <MenuItem label="My open bugs" icon={starIcon} onClick={listWith({ type: ["bug"], assignee: [me], status: notDone })} />
        <MenuItem label={`${activeName(jira)} in review`} icon={starIcon} onClick={listWith({ status: [jira.statuses[jira.statuses.length - 2]?.id ?? ""] })} />
        <div className="menu-h">Recent</div>
        <MenuItem label="All issues" icon={<I.Filter />} onClick={listWith({})} />
        <MenuItem label="Assigned to me" icon={<I.Filter />} onClick={listWith({ assignee: [me] })} />
        <div className="mi-sep" />
        <MenuItem label="View all filters" onClick={listWith({})} />
        <MenuItem label="Advanced issue search" onClick={listWith({ jql: true })} />
      </>
    );
  if (id === "dashboards")
    return (
      <>
        <div className="menu-h">Starred</div>
        <MenuItem label="Engineering health" icon={starIcon} onClick={go("reports")} />
        <div className="menu-h">Recent</div>
        <MenuItem label="Default dashboard" icon={<I.Dashboard />} onClick={go("reports")} />
        <MenuItem label={`${activeName(jira)} burndown`} icon={<I.Reports />} onClick={go("reports")} />
        <div className="mi-sep" />
        <MenuItem label="View all dashboards" onClick={go("reports")} />
        <Act label="Create dashboard" />
      </>
    );
  if (id === "teams")
    return (
      <>
        <div className="menu-h">Your collaborators</div>
        {Object.values(people).filter((p) => p.id !== me).map((p) => (
          <MenuItem key={p.id} label={p.name} sub={p.role} icon={<Avatar id={p.id} size={24} />} onClick={listWith({ assignee: [p.id] })} />
        ))}
        <div className="mi-sep" />
        <Act label={`${seed.project.name} team`} icon={<I.People />} />
        <Act label="Search people and teams" />
      </>
    );
  if (id === "apps")
    return (
      <>
        <div className="menu-h">Installed</div>
        <MenuItem label="GitHub for Jira" sub="Branches, commits and pull requests" icon={<span className="logo-mono"><I.GitHubLogo /></span>} onClick={go("code")} />
        <Act label="Slack" sub={`Notifications for ${seed.project.name}`} icon={<I.SlackLogo />} kind="app" />
        <div className="mi-sep" />
        <Act label="Explore more apps" />
        <Act label="Manage your apps" />
      </>
    );
  const anchor = pop?.anchor;
  return (
    <>
      <MenuItem label="Your work" onClick={go("yourwork")} />
      <MenuItem label="Projects" onClick={go("board")} />
      <MenuItem label="Filters" onClick={go("list")} />
      <MenuItem label="Dashboards" onClick={go("reports")} />
      <MenuItem label="Teams" onClick={() => anchor && openPop(anchor, <NavMenu id="teams" />, { id: "menu:teams", cls: "wide" })} />
      <MenuItem label="Apps" onClick={go("code")} />
    </>
  );
}

const activeName = (jira: ReturnType<typeof useUI>["jira"]) => jira.state.sprints.find((s) => s.state === "active")?.name.replace(`${jira.seed.project.key} `, "") ?? "Sprint";

function AppSwitcher() {
  const { jira, closePop } = useUI();
  const other = [
    ["Confluence", "Docs and knowledge base", <span className="sw-logo logo-mono"><I.ConfluenceLogo /></span>],
    ["Bitbucket", "Git code management", <span className="sw-logo"><I.BitbucketLogo /></span>],
    ["Trello", "Visual project boards", <span className="sw-logo"><I.TrelloLogo /></span>],
    ["Loom", "Async video messages", <span className="sw-logo"><I.LoomLogo /></span>],
  ] as const;
  const app = (label: string) => () => (closePop(), jira.ui.emit({ type: "action", kind: "app", label }));
  return (
    <>
      <div className="menu-h">Switch to</div>
      <button className="sw-item current" onClick={() => (closePop(), jira.ui.navigate("board"))}>
        <span className="sw-logo"><I.JiraLogo /></span>
        <span><b>Jira</b><small>{jira.seed.site}.atlassian.net</small></span>
      </button>
      {other.map(([name, desc, logo]) => (
        <button key={name} className="sw-item" aria-label={name} onClick={app(name)}>
          {logo}
          <span><b>{name}</b><small>{desc}</small></span>
        </button>
      ))}
      <div className="mi-sep" />
      <button className="sw-item" onClick={app("Administration")}>
        <span className="sw-logo"><I.AtlassianLogo /></span>
        <span><b>Administration</b><small>Manage users and products</small></span>
      </button>
    </>
  );
}

function HelpMenu() {
  const { openDialog } = useUI();
  return (
    <>
      <div className="menu-h">Help</div>
      <Act label="Browse help articles" icon={<I.Book />} />
      <MenuItem label="Keyboard shortcuts" icon={<I.Keyboard />} kbd="?" onClick={() => openDialog(<ShortcutsDialog />)} />
      <Act label="What's new" icon={<I.Sparkle />} />
      <Act label="Give feedback about Jira" icon={<I.Chat />} />
    </>
  );
}

function SettingsMenu() {
  return (
    <>
      <div className="menu-h">Personal settings</div>
      <Act label="Personal Jira settings" sub="Email notifications, language, time zone" />
      <Act label="Atlassian account settings" sub="Manage your profile, security and privacy" />
      <div className="mi-sep" />
      <div className="menu-h">Jira settings</div>
      {["System", "Products", "Projects", "Issues", "Apps"].map((s) => <Act key={s} label={s} kind="settings" />)}
    </>
  );
}

function ProfileMenu() {
  const { jira, closePop } = useUI();
  const p = jira.people[jira.me];
  const dark = jira.state.theme === "dark";
  const theme = (t: "light" | "dark") => () => {
    jira.ui.setTheme(t);
    closePop();
    jira.ui.flag({ type: "success", title: `${t === "dark" ? "Dark" : "Light"} theme applied` });
  };
  return (
    <>
      <div className="prof-head">
        <Avatar id={jira.me} size={40} />
        <div><b>{p.name}</b><small>{p.email}</small></div>
      </div>
      <div className="mi-sep" />
      <Act label="Profile" icon={<I.Person />} />
      <Act label="Personal settings" icon={<I.Gear />} />
      <div className="mi-sep" />
      <div className="menu-h">Theme</div>
      <MenuItem role="menuitemradio" on={!dark} label="Light" icon={<I.Sun />} onClick={theme("light")}><span className={`radio-dot${!dark ? " on" : ""}`} /></MenuItem>
      <MenuItem role="menuitemradio" on={dark} label="Dark" icon={<I.Moon />} onClick={theme("dark")}><span className={`radio-dot${dark ? " on" : ""}`} /></MenuItem>
      <div className="mi-sep" />
      <Act label="Switch account" />
      <Act label="Log out" icon={<I.Logout />} />
    </>
  );
}

function Notifications() {
  const { jira, closePop } = useUI();
  const { state, people, me } = jira;
  const [tab, setTab] = useState<"direct" | "watching">("direct");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const now = jira.now();
  const list = state.notifications.filter((n) => n.tab === tab && (!onlyUnread || !n.read));
  const today = list.filter((n) => now - n.at < 86_400_000);
  const older = list.filter((n) => now - n.at >= 86_400_000);
  const unread = state.notifications.some((n) => !n.read);
  const readAll = <button className="link-btn" onClick={() => jira.ui.readNotification(null)}>Mark all as read</button>;
  const item = (n: (typeof list)[number]) => {
    const is = state.issues[n.key];
    return (
      <button key={n.id} className="np-item" onClick={() => (jira.ui.readNotification(n.id), closePop(), jira.ui.openIssue(n.key))}>
        <Avatar id={n.from} size={32} />
        <div className="np-t">
          <div className="np-line"><b>{jira.pname(n.from)}</b> {n.verb} {n.verb === "assigned you" ? "" : "an issue"}</div>
          <div className="np-time">{rel(n.at, now)}</div>
          {n.quote ? <div className="np-quote"><Mentions text={n.quote} people={people} me={me} /></div> : null}
          {n.change ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <Lozenge status={n.change[0]} />
              <I.MoveTo />
              <Lozenge status={n.change[1]} />
            </div>
          ) : null}
          {is ? (
            <div className="np-card">
              <I.TypeIcon type={is.type} />
              <span className="s">{is.summary}</span>
              <span className="k">{is.key}</span>
              <Lozenge status={is.status} />
            </div>
          ) : null}
        </div>
        <span className={`np-dot${n.read ? " read" : ""}`} title={n.read ? "" : "Unread"} />
      </button>
    );
  };
  return (
    <>
      <div className="np-head">
        <h2>Notifications</h2>
        <label className="np-toggle">
          Only show unread
          <button className={`toggle${onlyUnread ? " on" : ""}`} role="switch" aria-checked={onlyUnread} aria-label="Only show unread" onClick={() => setOnlyUnread(!onlyUnread)} />
        </label>
        <button className="icon-btn" aria-label="Notification settings" onClick={() => jira.ui.emit({ type: "action", kind: "menu", label: "Notification settings" })}><I.More /></button>
      </div>
      <div className="np-tabs" role="tablist">
        {(["direct", "watching"] as const).map((t) => (
          <button key={t} className={`tab${tab === t ? " on" : ""}`} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "direct" ? "Direct" : "Watching"}
          </button>
        ))}
      </div>
      <div className="np-body">
        {list.length ? (
          <>
            {today.length ? <div className="np-group">Today{unread ? readAll : null}</div> : null}
            {today.map(item)}
            {older.length ? <div className="np-group">Older{!today.length && unread ? readAll : null}</div> : null}
            {older.map(item)}
          </>
        ) : (
          <div className="np-empty">{onlyUnread ? "You've read all your notifications from the last 30 days." : "No notifications yet."}</div>
        )}
      </div>
    </>
  );
}

function Search() {
  const { jira, setList } = useUI();
  const { state, seed } = jira;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const query = q.trim().toLowerCase();
  const items = query
    ? Object.values(state.issues)
        .filter((i) => i.key.toLowerCase().includes(query) || i.summary.toLowerCase().includes(query))
        .sort((a, b) => +(b.key.toLowerCase() === query) - +(a.key.toLowerCase() === query) || b.updated - a.updated)
        .slice(0, 8)
    : state.recent.map((k) => state.issues[k]).filter(Boolean);
  const at = Math.min(sel, items.length);
  const hl = (s: string) => {
    const i = query ? s.toLowerCase().indexOf(query) : -1;
    return i < 0 ? s : <>{s.slice(0, i)}<mark>{s.slice(i, i + query.length)}</mark>{s.slice(i + query.length)}</>;
  };
  const done = (input: HTMLInputElement | null) => {
    setOpen(false);
    setQ("");
    input?.blur();
  };
  const all = (input: HTMLInputElement | null) => {
    const text = q.trim();
    done(input);
    setList({ type: [], status: [], assignee: [], text, sort: { col: "key", dir: "desc" }, jql: false });
    jira.ui.navigate("list");
  };
  const input = () => document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
  return (
    <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <span className="s-ic"><I.Search /></span>
      <input
        type="search"
        placeholder="Search"
        autoComplete="off"
        aria-label="Search Jira"
        role="combobox"
        aria-expanded={open}
        value={q}
        onFocus={() => (setOpen(true), setSel(0))}
        onChange={(e) => (setQ(e.target.value), setSel(0), setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") (e.preventDefault(), setSel(Math.min(items.length, at + 1)));
          else if (e.key === "ArrowUp") (e.preventDefault(), setSel(Math.max(0, at - 1)));
          else if (e.key === "Enter") {
            e.preventDefault();
            const it = items[at];
            if (it) (done(e.currentTarget), jira.ui.openIssue(it.key));
            else all(e.currentTarget);
          } else if (e.key === "Escape") (e.stopPropagation(), done(e.currentTarget));
        }}
      />
      {open ? (
        <div className="search-drop" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          <div className="sd-h">{query ? "Issues" : "Recently viewed"}</div>
          {items.length ? (
            items.map((i, n) => (
              <button key={i.key} className={`sd-item${n === at ? " active" : ""}`} role="option" aria-selected={n === at} onClick={() => (done(input()), jira.ui.openIssue(i.key))}>
                <I.TypeIcon type={i.type} />
                <span className="t"><b>{hl(i.summary)}</b><small>{hl(i.key)} · {seed.project.name}</small></span>
                <Lozenge status={i.status} />
              </button>
            ))
          ) : (
            <div className="sd-empty">No issues match "{q}"</div>
          )}
          {query ? null : (
            <>
              <div className="sd-h">Recent boards and projects</div>
              <button className="sd-item" onClick={() => (done(input()), jira.ui.navigate("board"))}>
                <I.Board />
                <span className="t"><b>{seed.project.board ?? `${seed.project.key} board`}</b><small>{seed.project.name}</small></span>
              </button>
              <button className="sd-item" onClick={() => (done(input()), jira.ui.navigate("backlog"))}>
                <ProjectMark size={16} />
                <span className="t"><b>{seed.project.name}</b><small>{seed.project.kind ?? "Software project"}</small></span>
              </button>
            </>
          )}
          <button className={`sd-foot${at === items.length && query ? " active" : ""}`} onClick={() => all(input())}>
            <I.Search />
            <span>{query ? `View all issues containing "${q.trim()}"` : "View all issues"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
