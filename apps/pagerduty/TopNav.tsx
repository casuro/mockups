import { Avatar, useUI } from "./context";
import { shift } from "./format";
import * as I from "./icons";

// The green top bar: the mark, the product nav (Incidents is the page; the
// rest report an action), search, help, and the signed-in person with their
// on-call chip and menu. On a phone the nav folds into a menu.

const NAV = ["Incidents", "Services", "People", "Analytics", "Automation"];

export function TopNav() {
  const { pagerduty, menu, setMenu, navOpen, setNavOpen } = useUI();
  const { state, people, me } = pagerduty;
  const person = people[me];
  const onCall = Object.values(state.policies).some((p) => p.levels[0] === me);
  const until = state.onCall.until;

  const go = (label: string) => {
    setNavOpen(false);
    if (label === "Incidents") pagerduty.ui.openIncident(null);
    else pagerduty.ui.action(label);
  };
  const item = (label: string) => {
    setMenu(null);
    pagerduty.ui.action(label);
  };
  const links = NAV.map((n) => (
    <button key={n} className={n === "Incidents" ? "on" : ""} aria-current={n === "Incidents" ? "page" : undefined} onClick={() => go(n)}>
      {n}
    </button>
  ));

  return (
    <header className="top">
      <button className="menu-btn" aria-label="Menu" aria-expanded={navOpen} onClick={() => { setMenu(null); setNavOpen(!navOpen); }}>
        <I.Menu />
      </button>
      <div className="brand"><I.PagerDutyLogo /><span>pagerduty</span></div>
      <nav className="nav" aria-label="Main">{links}</nav>
      <div className="grow" />
      <div className="top-right">
        <label className="search">
          <I.Search />
          <input placeholder="Search incidents" aria-label="Search incidents" value={state.query} onChange={(e) => pagerduty.ui.filter({ query: e.target.value })} />
        </label>
        <button className="top-btn help" aria-label="Help" onClick={() => pagerduty.ui.action("Help")}><I.Help /></button>
        <button
          className="me-btn"
          aria-label={`${person.name}${onCall ? ", on call now" : ""}`}
          aria-expanded={menu === "me"}
          onClick={() => { setNavOpen(false); setMenu(menu === "me" ? null : "me"); }}
        >
          {onCall ? <span className="oncall-chip"><i /><b>On-Call Now</b></span> : null}
          <Avatar id={me} />
        </button>
      </div>
      <div className={`mobile-nav${navOpen ? " open" : ""}`}>{links}</div>
      {menu === "me" ? (
        <div className="pop me-pop" role="menu" aria-label="Your account">
          <div className="pop-h">
            <b>{person.name}</b>
            {person.email ? <span>{person.email}</span> : null}
            {onCall ? (
              <>
                <br />
                <span className="oncall-chip"><i />{until ? `On call until ${shift(until)}` : "On call now"}</span>
              </>
            ) : null}
          </div>
          <button role="menuitem" onClick={() => item("My profile")}><I.User />My profile</button>
          <button role="menuitem" onClick={() => item("My on-call shifts")}><I.Calendar />My on-call shifts</button>
          <button role="menuitem" onClick={() => item("Notification rules")}><I.Bell />Notification rules</button>
          <button role="menuitem" onClick={() => { setMenu(null); pagerduty.setTheme(state.theme === "dark" ? "light" : "dark"); }}>
            <I.Moon />{state.theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button role="menuitem" onClick={() => item("Log out")}><I.LogOut />Log out</button>
        </div>
      ) : null}
    </header>
  );
}
