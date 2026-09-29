import { useEffect, useState, type MouseEvent } from "react";
import { Avatar, IconButton, useUI, type PopKind } from "./context";
import * as I from "./icons";
import type { GmailDensity } from "./types";

// The top bar (menu, logo, search, settings, apps, account) and what opens
// from it: the Google apps grid, the account card, Quick settings.

export function Header() {
  const { gmail, root, pop, openPop, closePop, setDrawer, quickSettings, setQuickSettings } = useUI();
  const { state, ui } = gmail;
  const [query, setQuery] = useState(state.view.query);
  useEffect(() => setQuery(state.view.query), [state.view.query]);
  const search = () => ui.show({ query: query.trim(), label: null });
  const toggle = (e: MouseEvent<HTMLButtonElement>, p: PopKind) => (pop?.kind === p.kind ? closePop() : openPop(e.currentTarget, p));

  return (
    <header className="top">
      <div className="brand">
        <IconButton
          tip="Main menu"
          onClick={() => ((root.current?.offsetWidth ?? 1000) <= 760 ? setDrawer(true) : ui.set("navCollapsed", !state.navCollapsed))}
        >
          <I.Menu />
        </IconButton>
        <span className="logo" aria-label="Gmail">
          <I.GmailLogo />
          <span className="word">Gmail</span>
        </span>
      </div>
      <label className="searchbox">
        <IconButton label="Search" onClick={(e) => (e.preventDefault(), search())}>
          <I.Search />
        </IconButton>
        <input
          placeholder="Search mail"
          aria-label="Search mail"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
            if (e.key === "Escape") {
              setQuery("");
              e.currentTarget.blur();
            }
          }}
        />
        {query ? (
          <IconButton label="Clear search" onClick={(e) => (e.preventDefault(), setQuery(""), ui.show({ query: "", hasAttachment: false }))}>
            <I.Close />
          </IconButton>
        ) : null}
        <IconButton className="icon-btn hide-m" tip="Show search options" onClick={(e) => (e.preventDefault(), gmail.toast("Advanced search: From, To, Subject, Has the words, Size, Date within"))}>
          <I.Tune />
        </IconButton>
      </label>
      <span className="grow" />
      <IconButton className="icon-btn hide-m" tip="Support" onClick={() => gmail.toast("Help center opened in a new tab")}>
        <I.Help />
      </IconButton>
      <IconButton className="icon-btn hide-m" tip="Settings" onClick={() => setQuickSettings(!quickSettings)}>
        <I.Gear />
      </IconButton>
      <IconButton className="icon-btn hide-m" tip="Google apps" data-pop-anchor onClick={(e) => toggle(e, { kind: "apps" })}>
        <I.Apps />
      </IconButton>
      <button className="me" aria-label="Google Account" data-pop-anchor onClick={(e) => toggle(e, { kind: "account" })}>
        <Avatar id={gmail.me} />
      </button>
    </header>
  );
}

const APPS = [
  ["Drive", I.DriveLogo],
  ["Gmail", I.GmailLogo],
  ["Calendar", I.CalendarLogo],
  ["Meet", I.MeetLogo],
  ["Chat", I.ChatLogo],
  ["Keep", I.KeepLogo],
  ["Tasks", I.TasksLogo],
] as const;

export function AppsMenu() {
  const { gmail, closePop } = useUI();
  const pick = (name: string) => {
    closePop();
    gmail.toast(name);
  };
  return (
    <>
      <button onClick={() => pick("Account")}>
        <Avatar id={gmail.me} style={{ width: 40, height: 40 }} />
        <span>Account</span>
      </button>
      {APPS.map(([name, Logo]) => (
        <button key={name} onClick={() => pick(name)}>
          <Logo />
          <span>{name}</span>
        </button>
      ))}
    </>
  );
}

export function AccountCard() {
  const { gmail, closePop } = useUI();
  const me = gmail.person(gmail.me);
  return (
    <>
      <div className="em">{me.email}</div>
      <Avatar id={gmail.me} className="av photo" />
      <div className="hi">{`Hi, ${me.name.split(" ")[0]}!`}</div>
      <button className="manage" onClick={() => (closePop(), gmail.toast("Manage your Google Account"))}>
        Manage your Google Account
      </button>
      <p className="managed">{`Managed by ${gmail.seed.domain ?? me.email.split("@")[1]}`}</p>
    </>
  );
}

const DENSITY: [GmailDensity, string, number, number][] = [
  ["default", "Default", 4, 3],
  ["comfortable", "Comfortable", 3, 5],
  ["compact", "Compact", 5, 2],
];

export function QuickSettings() {
  const { gmail, setQuickSettings } = useUI();
  const { state, ui } = gmail;
  return (
    <div className="qs">
      <div className="qs-head">
        Quick settings
        <IconButton label="Close" onClick={() => setQuickSettings(false)}>
          <I.Close />
        </IconButton>
      </div>
      <button className="all" onClick={() => gmail.toast("All settings")}>See all settings</button>
      <h4>Density</h4>
      {DENSITY.map(([id, label, lines, gap]) => (
        <button key={id} className={`radio${state.density === id ? " on" : ""}`} onClick={() => ui.set("density", id)}>
          <span className="dot" />
          {label}
          <span className="mini" style={{ gap }}>
            {Array.from({ length: lines }, (_, i) => <i key={i} />)}
          </span>
        </button>
      ))}
      <h4>Theme</h4>
      <div className="themes">
        {(["light", "dark"] as const).map((t) => (
          <button key={t} className={`theme-card ${t}${state.theme === t ? " on" : ""}`} onClick={() => ui.set("theme", t)}>
            {t === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </div>
      <h4>Inbox type</h4>
      <button className="radio on"><span className="dot" />Default</button>
      <button className="radio" onClick={() => gmail.toast("Important first")}><span className="dot" />Important first</button>
      <button className="radio" onClick={() => gmail.toast("Unread first")}><span className="dot" />Unread first</button>
      <h4>Reading pane</h4>
      {(["none", "right"] as const).map((p) => (
        <button key={p} className={`radio${state.pane === p ? " on" : ""}`} onClick={() => ui.set("pane", p)}>
          <span className="dot" />
          {p === "none" ? "No split" : "Right of inbox"}
        </button>
      ))}
    </div>
  );
}
