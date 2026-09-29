import { Badge, useUI } from "./context";
import * as I from "./icons";
import { matches } from "./use-zendesk";

// The frame around the work: the product rail, the top bar with a tab per
// open ticket, and the views panel with its counts.

const RAIL = [
  ["home", "Home", I.Home],
  ["views", "Views", I.Views],
  ["customers", "Customers", I.Customers],
  ["orgs", "Organizations", I.Orgs],
  ["reporting", "Reporting", I.Reporting],
] as const;

export function Rail() {
  const { zendesk } = useUI();
  return (
    <nav className="rail" aria-label="Products">
      <div className="brand"><I.ZendeskLogo /></div>
      {RAIL.map(([key, label, Icon]) => (
        <button
          key={key}
          className={`rail-btn${key === "views" ? " on" : ""}`}
          data-tip={label}
          aria-label={label}
          onClick={() => (key === "views" ? zendesk.open(null) : zendesk.ui.action(label))}
        >
          <Icon />
        </button>
      ))}
      <div className="spacer" />
      <button className="rail-btn" data-tip="Admin" aria-label="Admin" onClick={() => zendesk.ui.action("Admin")}>
        <I.Admin />
      </button>
    </nav>
  );
}

export function TopBar() {
  const { zendesk, drawer, setDrawer } = useUI();
  const { state, people, me } = zendesk;
  const self = people[me];
  return (
    <header className="topbar">
      <button className="menu-btn" aria-label="Menu" onClick={() => setDrawer(!drawer)}><I.Menu /></button>
      <div className="tabs" role="tablist">
        {state.tabs.map((id) => {
          const t = state.tickets.find((x) => x.id === id);
          if (!t) return null;
          return (
            <div
              key={id}
              className={`tab${state.active === id ? " on" : ""}`}
              role="tab"
              aria-selected={state.active === id}
              tabIndex={0}
              onClick={() => zendesk.ui.openTicket(id)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  zendesk.ui.openTicket(id);
                }
              }}
            >
              <Badge status={t.status} />
              <span className="t-txt">{t.subject}</span>
              <button
                className="x"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  zendesk.ui.closeTab(id);
                }}
              >
                <I.X />
              </button>
            </div>
          );
        })}
        <button className="add-tab" aria-label="Add" onClick={() => zendesk.open(null)}><I.Plus /></button>
      </div>
      <div className="top-right">
        <label className="search"><I.Search /><input placeholder="Search" aria-label="Search" /></label>
        <button className="icon-btn" aria-label="Products" onClick={() => zendesk.ui.action("Products")}><I.Apps /></button>
        <button className="icon-btn" aria-label="Notifications" onClick={() => zendesk.ui.action("Notifications")}><I.Bell /></button>
        <button className="icon-btn" aria-label="Help" onClick={() => zendesk.ui.action("Help")}><I.Help /></button>
        <span className="me" title={self.name} style={self.photo ? undefined : { background: self.color }}>
          {self.photo ? <img src={self.photo} alt={self.name} /> : self.initials}
        </span>
      </div>
    </header>
  );
}

export function ViewsPanel() {
  const { zendesk, setDrawer } = useUI();
  const { state, views, me } = zendesk;
  return (
    <aside className="views" aria-label="Views">
      <h2>Views</h2>
      {views.map((v) => (
        <button
          key={v.id}
          className={`view-item${state.view === v.id && state.active == null ? " on" : ""}`}
          onClick={() => {
            setDrawer(false);
            zendesk.ui.pickView(v.id);
          }}
        >
          <span>{v.name}</span>
          <span className="n">{state.tickets.filter((t) => matches(t, v.filter, me)).length}</span>
        </button>
      ))}
      <div className="sep" />
      <a
        className="link"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          zendesk.ui.action("Manage views");
        }}
      >
        Manage views
      </a>
    </aside>
  );
}
