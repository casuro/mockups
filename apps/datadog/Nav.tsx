import type { ComponentType, SVGProps } from "react";
import { Avatar, useUI } from "./context";
import * as I from "./icons";

// The left navigation, the phone top bar, and the user menu.

type Item = { label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; active?: boolean; badge?: boolean } | "-";

const NAV: Item[] = [
  { label: "Search", icon: I.Search },
  { label: "Watchdog", icon: I.Watchdog },
  "-",
  { label: "Service Mgmt", icon: I.Siren },
  { label: "Infrastructure", icon: I.Server },
  { label: "APM", icon: I.Apm },
  { label: "Digital Experience", icon: I.Dx },
  { label: "Logs", icon: I.Logs },
  { label: "Metrics", icon: I.Metrics },
  { label: "Dashboards", icon: I.Dash, active: true },
  { label: "Monitors", icon: I.Monitors, badge: true },
  { label: "Security", icon: I.Shield },
  "-",
  { label: "Integrations", icon: I.Puzzle },
];

export function Nav({ onNavigate }: { onNavigate: () => void }) {
  const { app, openPop } = useUI();
  const me = app.people[app.me];
  const alerting = app.view.alerting;
  const collapsed = app.state.navCollapsed;
  const go = (item: string) => {
    onNavigate();
    app.ui.emit({ type: "nav", item });
  };
  const link = (n: Exclude<Item, "-">) => (
    <div className="nav-item" key={n.label}>
      <button className={`nav-link${n.active ? " active" : ""}`} data-tip={n.label} data-tip-nav="1" aria-current={n.active ? "page" : undefined} onClick={() => go(n.label)}>
        <n.icon />
        <span className="lbl">{n.label}</span>
        {n.badge && alerting ? <span className="badge" aria-label={`${alerting} alerting`}>{alerting}</span> : null}
      </button>
    </div>
  );

  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-top">
        <span className="nav-logo"><I.DatadogLogo /></span>
        <div className="nav-org">
          <b>{app.seed.org.name}</b>
          <span>{app.seed.org.host ?? "app.datadoghq.com"}</span>
        </div>
      </div>
      <div className="nav-scroll">{NAV.map((n, i) => (n === "-" ? <div key={i} className="nav-sep" /> : link(n)))}</div>
      <div className="nav-bottom">
        {link({ label: "Help", icon: I.Help })}
        {link({ label: "Org Settings", icon: I.Gear })}
        <div className="nav-item">
          <button className="nav-link" data-tip={me.name} data-tip-nav="1" onClick={(e) => openPop(e.currentTarget, () => <UserMenu onNavigate={go} />, narrow(e.currentTarget) ? { align: "end" } : { side: "right" })}>
            <Avatar id={app.me} tip={false} />
            <span className="lbl">{me.name}</span>
          </button>
        </div>
        <div className="nav-item">
          <button className="nav-link nav-collapse" data-tip={collapsed ? "Expand navigation" : "Collapse navigation"} data-tip-nav="1" onClick={app.ui.collapseNav}>
            <I.Collapse />
            <span className="lbl">{collapsed ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

/** At phone width the nav is a drawer, and the user menu opens under its button instead of beside it. */
const narrow = (el: HTMLElement) => (el.closest(".kit-datadog")?.clientWidth ?? 1000) < 760;

export function MobileBar({ onMenu }: { onMenu: () => void }) {
  const { app, openPop } = useUI();
  const d = app.seed.dashboard;
  return (
    <div className="mobile-bar">
      <button className="icon-btn" aria-label="Open navigation" onClick={onMenu}><I.Menu /></button>
      <div className="ttl"><I.DatadogLogo /><span>{d.shortTitle ?? d.title}</span></div>
      <button className="icon-btn" aria-label="Search" onClick={() => app.ui.emit({ type: "nav", item: "Search" })}><I.Search /></button>
      <button className="icon-btn" aria-label="Account" onClick={(e) => openPop(e.currentTarget, () => <UserMenu onNavigate={(item) => app.ui.emit({ type: "nav", item })} />, { align: "end" })}>
        <Avatar id={app.me} tip={false} />
      </button>
    </div>
  );
}

function UserMenu({ onNavigate }: { onNavigate: (item: string) => void }) {
  const { app, closePop } = useUI();
  const me = app.people[app.me];
  const org = app.seed.org;
  const th = app.state.theme;
  return (
    <div className="um">
      <div className="um-head">
        <Avatar id={app.me} className="av lg" tip={false} />
        <div>
          <b>{me.name}</b>
          {me.email ? <span>{me.email}</span> : null}
        </div>
      </div>
      <div className="um-org">
        <span className="org-badge">{org.name.charAt(0).toUpperCase()}</span>
        <div>
          <b>{org.name}</b>
          <span>{org.host ?? "app.datadoghq.com"}{org.site ? ` - ${org.site}` : ""}</span>
        </div>
      </div>
      <div className="um-theme">
        <h6>Theme</h6>
        <div className="seg" role="radiogroup" aria-label="Theme">
          <button className={th === "light" ? "on" : ""} role="radio" aria-checked={th === "light"} onClick={() => app.ui.pickTheme("light")}><I.Sun />Light</button>
          <button className={th === "dark" ? "on" : ""} role="radio" aria-checked={th === "dark"} onClick={() => app.ui.pickTheme("dark")}><I.Moon />Dark</button>
        </div>
      </div>
      <div className="menu" role="menu">
        {(
          [
            ["Personal Settings", I.User],
            ["Organization Settings", I.Gear],
          ] as const
        ).map(([label, Icon]) => (
          <button key={label} className="mi" role="menuitem" onClick={() => { closePop(); onNavigate(label); }}>
            <Icon /><span>{label}</span>
          </button>
        ))}
        <div className="sep" />
        <button className="mi" role="menuitem" onClick={() => { closePop(); app.ui.emit({ type: "logout" }); }}>
          <I.Logout /><span>Log out</span>
        </button>
      </div>
    </div>
  );
}
