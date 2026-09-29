import type { ComponentType, SVGProps } from "react";
import { MenuItem, UserAvatar, useUI } from "./context";
import * as I from "./icons";

// Studio's top bar (org / project / branch, Connect, search, account) and
// the product rail on the left, which widens on hover and is a drawer on a phone.

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
export const NAV: [string, string, Icon][][] = [
  [["home", "Project overview", I.Home], ["table", "Table Editor", I.Table], ["sql", "SQL Editor", I.Sql]],
  [["database", "Database", I.Database], ["auth", "Authentication", I.Auth], ["storage", "Storage", I.Storage], ["functions", "Edge Functions", I.Functions], ["realtime", "Realtime", I.Realtime]],
  [["advisors", "Advisors", I.Advisors], ["logs", "Logs", I.Logs], ["docs", "API Docs", I.Docs]],
];
export const SETTINGS: [string, string, Icon] = ["settings", "Project Settings", I.Settings];

/** A rail item or the logo: the two editors switch views, anything else is reported as `nav`. */
export function useNavigate() {
  const { app, setRailOpen, closePop } = useUI();
  return (key: string, label: string) => {
    closePop();
    setRailOpen(false);
    if (key === "table" || key === "sql") app.ui.openView(key);
    else app.ui.nav(label);
  };
}

export function TopBar() {
  const { app, openPop, closePop, setOverlay, setRailOpen, mod } = useUI();
  const { organization: org, project, user } = app.seed;
  const branch = project.branch ?? "main";
  const go = useNavigate();
  const soon = (item: string) => () => {
    closePop();
    app.ui.nav(item);
  };

  const crumbMenu = (k: "org" | "project" | "branch") => () => (
    <div className="m-list">
      {k === "org" ? (
        <>
          <div className="m-head">Organizations</div>
          <MenuItem label={org.name} sub={org.plan ? `${org.plan} plan` : undefined} on onClick={closePop} />
          <div className="m-sep" />
          <MenuItem label="All organizations" onClick={soon("All organizations")} />
        </>
      ) : k === "project" ? (
        <>
          <div className="m-head">Projects</div>
          <MenuItem label={project.name} sub={[project.region, org.plan].filter(Boolean).join(" · ") || undefined} on onClick={closePop} />
          <div className="m-sep" />
          <MenuItem icon={<I.Plus />} label="New project" onClick={soon("New project")} />
        </>
      ) : (
        <>
          <div className="m-head">Branches</div>
          <MenuItem label={branch} sub={project.production !== false ? "Production" : undefined} on onClick={closePop} />
          <div className="m-sep" />
          <MenuItem icon={<I.Branch />} label="Manage branches" onClick={soon("Manage branches")} />
        </>
      )}
    </div>
  );

  const userMenu = () => (
    <>
      <div className="um-head">
        <UserAvatar />
        <div>
          <b>{user.name}</b>
          <span>{user.email}</span>
        </div>
      </div>
      <div className="um-theme">
        <h6>Theme</h6>
        <div className="seg" role="radiogroup" aria-label="Theme">
          {(["light", "dark"] as const).map((th) => (
            <button key={th} className={app.state.theme === th ? "on" : ""} role="radio" aria-checked={app.state.theme === th} onClick={() => app.ui.setTheme(th)}>
              {th === "light" ? <I.Sun /> : <I.Moon />}
              {th === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>
      <div className="m-list">
        <MenuItem icon={<I.User />} label="Account preferences" onClick={soon("Account preferences")} />
        <MenuItem icon={<I.Advisors />} label="Feature previews" onClick={soon("Feature previews")} />
        <div className="m-sep" />
        <MenuItem icon={<I.Logout />} label="Log out" onClick={soon("Log out")} />
      </div>
    </>
  );

  return (
    <header className="top">
      <button className="icon-btn mb-only" aria-label="Open navigation" onClick={() => setRailOpen(true)}><I.Menu /></button>
      <button className="top-logo" aria-label="Project overview" data-tip="Project overview" onClick={() => go("home", "Project overview")}><I.SupabaseLogo /></button>
      <button className="crumb dt-only" aria-label={`Organization: ${org.name}`} onClick={(e) => openPop(e.currentTarget, crumbMenu("org"))}>
        <span className="org-av">{org.name.charAt(0)}</span>
        {org.name}
        {org.plan ? <span className="badge">{org.plan}</span> : null}
        <I.UpDown />
      </button>
      <span className="dt-only"><I.Slash /></span>
      <button className="crumb" aria-label={`Project: ${project.name}`} onClick={(e) => openPop(e.currentTarget, crumbMenu("project"))}>
        {project.name}
        <I.UpDown />
      </button>
      <span className="dt-only"><I.Slash /></span>
      <button className="crumb dt-only" aria-label={`Branch: ${branch}`} onClick={(e) => openPop(e.currentTarget, crumbMenu("branch"))}>
        <I.Branch />
        {branch}
        {project.production !== false ? <span className="badge warn">Production</span> : null}
        <I.UpDown />
      </button>
      <button className="btn dt-only" style={{ marginLeft: 6 }} onClick={() => setOverlay({ kind: "connect" })}><I.Plug />Connect</button>
      <div className="top-sp" />
      <button className="btn dt-only" onClick={soon("Feedback")}>Feedback</button>
      <button className="search-btn dt-only" aria-label="Search" onClick={() => setOverlay({ kind: "palette" })}>
        <I.Search />
        <span className="sl">Search...</span>
        <span className="kbd">{mod}</span>
        <span className="kbd">K</span>
      </button>
      <button className="icon-btn mb-only" aria-label="Search" onClick={() => setOverlay({ kind: "palette" })}><I.Search /></button>
      <button className="icon-btn dt-only" aria-label="Help" data-tip="Help" onClick={soon("Help")}><I.Help /></button>
      <button className="icon-btn dt-only" aria-label="Notifications" data-tip="Notifications" onClick={soon("Notifications")}><I.Inbox /></button>
      <button className="top-av" aria-label={`Account: ${user.name}`} onClick={(e) => openPop(e.currentTarget, userMenu, { align: "end" })}><UserAvatar /></button>
    </header>
  );
}

export function Rail() {
  const { app, railOpen, setRailOpen } = useUI();
  const { project, organization: org } = app.seed;
  const go = useNavigate();
  const view = app.state.view;
  const Item = ([key, label, Icon]: [string, string, Icon]) => {
    const on = key === view;
    return (
      <button key={key} className={`rail-item${on ? " on" : ""}`} aria-label={label} aria-current={on ? "page" : undefined} onClick={() => go(key, label)}>
        <Icon />
        <span className="lbl">{label}</span>
      </button>
    );
  };
  return (
    <nav className={`rail${railOpen ? " open" : ""}`} aria-label="Project navigation">
      <div className="drawer-scrim" onClick={() => setRailOpen(false)} />
      <div className="rail-nav">
        <div className="rail-drawer-head">
          <I.SupabaseLogo />
          <div>
            <b style={{ fontWeight: 500 }}>{project.name}</b>
            <span>{org.name} · {project.branch ?? "main"}</span>
          </div>
        </div>
        {NAV.map((group, i) => (
          <div key={i} style={{ display: "contents" }}>
            {i ? <div className="rail-sep" /> : null}
            <div className="rail-group">{group.map(Item)}</div>
          </div>
        ))}
        <div className="rail-group rail-bottom">{Item(SETTINGS)}</div>
      </div>
    </nav>
  );
}
