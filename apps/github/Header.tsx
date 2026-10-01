import type { ComponentType } from "react";
import { Avatar, useUI } from "./context";
import * as I from "./icons";

// The global header (mark, owner / repository, search, create, notifications
// and the signed-in person's menu with the theme switch) and the repository
// tabs under it. Pull requests and Actions open their pages; every control
// is reported as a "nav" event, so the rest can be answered or built.

const TABS: [ComponentType, string][] = [
  [I.Code, "Code"], [I.Issue, "Issues"], [I.Pull, "Pull requests"], [I.Play, "Actions"],
  [I.Table, "Projects"], [I.Shield, "Security"], [I.Graph, "Insights"], [I.Gear, "Settings"],
];

export function Header() {
  const { github, menu, setMenu } = useUI();
  const { state, seed, me, ui } = github;
  const on = state.view.page === "pulls" || state.view.page === "pull" ? "Pull requests" : "Actions";
  const count: Record<string, number | undefined> = { Issues: seed.repo.issues, "Pull requests": state.pulls.filter((p) => p.state === "open").length };
  const item = (label: string) => {
    setMenu(false);
    ui.nav(label);
  };

  return (
    <header className="gh-top">
      <div className="gh-bar">
        <button className="icon-btn" aria-label="Open navigation menu" onClick={() => ui.nav("Menu")}><I.Menu /></button>
        <button className="gh-logo" aria-label={`${seed.repo.owner}/${seed.repo.name}`} onClick={() => ui.nav("Pull requests")}><I.GitHubLogo className="gh-mark" /></button>
        <nav className="crumbs" aria-label="Repository">
          <button onClick={() => ui.nav("Organization")}>{seed.repo.owner}</button>
          <span className="sep">/</span>
          <button className="repo" onClick={() => ui.nav("Pull requests")}>{seed.repo.name}</button>
        </nav>
        <div className="grow" />
        <button className="gh-search" aria-label="Search or jump to" onClick={() => ui.nav("Search")}><I.Search /><span>Type <kbd>/</kbd> to search</span></button>
        <button className="icon-btn hide-sm" aria-label="Create new" onClick={() => ui.nav("New")}><I.Plus /></button>
        <button className="icon-btn notif" aria-label="Notifications" onClick={() => ui.nav("Notifications")}><I.Bell /><i /></button>
        <button className="me-btn" aria-label="Open user menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Avatar id={me} size="s32" /></button>
      </div>
      <nav className="repo-nav" aria-label="Repository tabs">
        {TABS.map(([Icon, name]) => (
          <button key={name} className={`tab${name === on ? " on" : ""}`} aria-current={name === on ? "page" : undefined} onClick={() => ui.nav(name)}>
            <span><Icon />{name}{count[name] != null ? <span className="counter">{count[name]}</span> : null}</span>
          </button>
        ))}
      </nav>
      {menu ? (
        <div className="me-pop" role="menu" aria-label="User menu">
          <div className="who"><Avatar id={me} size="s32" /><div><b>{me}</b><span>{github.people[me].name}</span></div></div>
          <hr />
          <button role="menuitem" onClick={() => item("Profile")}><I.Person />Your profile</button>
          <button role="menuitem" onClick={() => { setMenu(false); github.setTheme(state.theme === "dark" ? "light" : "dark"); }}>
            <I.Moon />{state.theme === "dark" ? "Light theme" : "Dark theme"}
          </button>
          <button role="menuitem" onClick={() => item("Sign out")}><I.SignOut />Sign out</button>
        </div>
      ) : null}
    </header>
  );
}
