import { useState, type ReactNode, type RefObject } from "react";
import { Avatar, useUI } from "./context";
import * as I from "./icons";
import { keyOf } from "./use-slack";

// The frame around the conversation: the top bar with search, the
// workspace rail, and the sidebar of channels, DMs and apps.

export function TopBar({ search }: { search: RefObject<HTMLInputElement | null> }) {
  const { slack, toggleSide } = useUI();
  const { seed, people, state } = slack;
  const find = (raw: string) => {
    const q = raw.trim().replace(/^[#@]/, "").toLowerCase();
    const channel = q && seed.channels.find((c) => c.id.includes(q));
    const person = q && Object.values(people).find((p) => p.name.toLowerCase().includes(q));
    if (channel) slack.open({ channel: channel.id });
    else if (person) slack.open({ dm: person.id });
    else slack.toast(`No results for "${raw.trim()}"`);
  };
  return (
    <header className="topbar">
      <div className="tb-left">
        <button className="icon-btn menu-btn" aria-label="Open sidebar" style={{ color: "#fff" }} onClick={toggleSide}>
          <I.Menu />
        </button>
        <span className="slack-logo" title="Slack" aria-label="Slack">
          <I.SlackLogo />
        </span>
        <div className="nav">
          <button aria-label="Back"><I.Back /></button>
          <button aria-label="Forward"><I.Forward /></button>
          <button aria-label="History"><I.History /></button>
        </div>
      </div>
      <label className="search">
        <I.Search strokeWidth={1.8} />
        <input
          ref={search}
          placeholder={`Search ${seed.workspace.name}`}
          aria-label={`Search ${seed.workspace.name}`}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            find(e.currentTarget.value);
            e.currentTarget.value = "";
            e.currentTarget.blur();
          }}
        />
      </label>
      <div className="right">
        <button className="help" aria-label="Toggle theme" onClick={() => slack.ui.setTheme(state.theme === "dark" ? "light" : "dark")}>
          <I.Moon />
        </button>
        <button className="help" aria-label="Help"><I.Help /></button>
      </div>
    </header>
  );
}

export function Rail() {
  const { slack } = useUI();
  const { workspace } = slack.seed;
  return (
    <nav className="rail" aria-label="Workspaces">
      <button className="ws current" title={workspace.name}>
        {workspace.initial ?? workspace.name.charAt(0).toUpperCase()}
      </button>
      <div className="rail-nav">
        <button className="rail-btn active"><span className="ico"><I.Home /></span>Home</button>
        <button className="rail-btn"><span className="ico"><I.Bubble /></span>DMs</button>
        <button className="rail-btn"><span className="ico"><I.Bell /></span>Activity</button>
        <button className="rail-btn"><span className="ico"><I.Dots /></span>More</button>
      </div>
      <div className="spacer" />
      <div className="me">
        <span><Avatar id={slack.me} /></span>
        <span className="presence" />
      </div>
    </nav>
  );
}

function Section({ title, children, after }: { title: string; children: ReactNode; after?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`section${collapsed ? " collapsed" : ""}`}>
      <button className="sec-title" onClick={() => setCollapsed(!collapsed)}>
        <I.Caret />
        {title}
      </button>
      <div className="sec-items">{children}</div>
      {after}
    </div>
  );
}

export function Sidebar() {
  const { slack } = useUI();
  const { seed, people, state, me } = slack;
  const current = state.current;
  const conv = (key: string) => state.conversations[key];
  const dmIds = [
    me,
    ...Object.keys(state.conversations)
      .filter((k) => k.startsWith("dm:"))
      .map((k) => k.slice(3))
      .filter((id) => id !== me && people[id] && !people[id].bot),
  ];
  const apps = seed.apps ?? Object.values(people).filter((p) => p.bot).map((p) => p.id);

  return (
    <aside className="sidebar" aria-label={`${seed.workspace.name} sidebar`}>
      <div className="side-head">
        <h1>
          {seed.workspace.name} <I.Caret style={{ width: 12, height: 12 }} />
        </h1>
        <button className="compose" aria-label="New message"><I.Pencil /></button>
      </div>
      <div className="side-scroll">
        <button className="item"><I.Bubble /><span className="lbl">Threads</span></button>
        <button className="item"><I.At /><span className="lbl">Mentions &amp; reactions</span></button>
        <button className="item">
          <I.Bookmark />
          <span className="lbl">Later</span>
          {seed.later ? <span className="badge" style={{ background: "rgba(255,255,255,.2)" }}>{seed.later}</span> : null}
        </button>

        <Section title="Channels" after={<button className="item add-row"><span className="plus">+</span><span className="lbl">Add channels</span></button>}>
          {seed.channels.map((c) => {
            const key = keyOf({ channel: c.id });
            const active = current === key;
            const cs = conv(key);
            const unread = !!cs?.unread && !active;
            return (
              <button
                key={key}
                className={`item${active ? " active" : ""}${unread ? " unread" : ""}`}
                style={c.muted ? { opacity: 0.55 } : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => slack.open({ channel: c.id })}
              >
                <span className="hash">#</span>
                <span className="lbl">{c.id}</span>
                {state.huddles[key] ? <span className="hud" title="Huddle in progress"><I.Headphones /></span> : null}
                {unread && cs.mentions ? <span className="badge">{cs.mentions}</span> : null}
              </button>
            );
          })}
        </Section>

        <Section title="Direct messages" after={<button className="item add-row"><span className="plus">+</span><span className="lbl">Add coworkers</span></button>}>
          {dmIds.map((id) => {
            const p = people[id];
            const key = keyOf({ dm: id });
            const active = current === key;
            const cs = conv(key);
            const unread = !!cs?.unread && !active;
            return (
              <button
                key={key}
                className={`item${active ? " active" : ""}${unread ? " unread" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => slack.open({ dm: id })}
              >
                <span className="dm-av">
                  <Avatar id={id} />
                  <span className={`dot${p.online ? " on" : ""}`} />
                </span>
                <span className="lbl">
                  {p.name}
                  {id === me ? <> <span style={{ opacity: 0.6, fontWeight: 400 }}>you</span></> : null}
                </span>
                {state.huddles[key] ? (
                  <span className="hud" title="Huddle in progress"><I.Headphones /></span>
                ) : p.status ? (
                  <span style={{ fontSize: 13 }}>{p.status}</span>
                ) : null}
                {unread ? <span className="badge">{cs.unread}</span> : null}
              </button>
            );
          })}
        </Section>

        {apps.length ? (
          <Section title="Apps">
            {apps.filter((id) => people[id]).map((id) => {
              const p = people[id];
              const key = keyOf({ dm: id });
              const active = current === key;
              const unread = !!conv(key)?.unread && !active;
              return (
                <button
                  key={key}
                  className={`item${active ? " active" : ""}${unread ? " unread" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => slack.open({ dm: id })}
                >
                  <span className="dm-av">
                    {p.photo ? <Avatar id={id} /> : <span className="av" style={{ background: p.color, fontSize: 11 }}>{p.initials}</span>}
                  </span>
                  <span className="lbl">{p.name}</span>
                  {unread ? <span className="badge">{conv(key).unread}</span> : null}
                </button>
              );
            })}
          </Section>
        ) : null}
      </div>
    </aside>
  );
}
