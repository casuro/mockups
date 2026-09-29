import { useState, type ReactNode, type RefObject } from "react";
import { Avatar, ChatAvatar, PresenceDot, useUI } from "./context";
import { clockTime, dayLabel, dayStart, plain } from "./format";
import * as I from "./icons";
import type { TeamsActivityItem, TeamsView } from "./types";
import { keyOf, type Chat } from "./use-teams";

// The frame around the content: the title bar with search, the app bar on
// the left (the bottom bar on a phone), and the list pane of each view.

export function TitleBar({ search }: { search: RefObject<HTMLInputElement | null> }) {
  const { teams } = useUI();
  const me = teams.people[teams.me];
  const find = (raw: string) => {
    const q = raw.trim().toLowerCase();
    if (!q) return;
    const chat = teams.chats.find((c) => c.name.toLowerCase().includes(q));
    const channel = teams.teams.flatMap((t) => t.channels.map((c) => ({ team: t.id, c }))).find((x) => x.c.name.toLowerCase().includes(q));
    if (chat) teams.open({ chat: chat.id });
    else if (channel) teams.open({ team: channel.team, channel: channel.c.id });
    else teams.toast(`No results for "${q}"`);
  };
  return (
    <header className="titlebar">
      <div className="tb-left">
        <span className="logo" title="Microsoft Teams" aria-label="Microsoft Teams"><I.TeamsLogo /></span>
        <span className="nav-arrows">
          <button className="tb-btn" aria-label="Back"><I.Back /></button>
          <button className="tb-btn" aria-label="Forward"><I.Forward /></button>
        </span>
      </div>
      <label className="search">
        <I.Search />
        <input
          ref={search}
          placeholder="Search (⌘E)"
          aria-label="Search"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !e.currentTarget.value.trim()) return;
            find(e.currentTarget.value);
            e.currentTarget.value = "";
            e.currentTarget.blur();
          }}
        />
      </label>
      <div className="tb-right">
        <button className="tb-btn" aria-label="Toggle theme" title="Toggle theme" onClick={() => teams.ui.setTheme(teams.state.theme === "dark" ? "light" : "dark")}>
          <I.Moon />
        </button>
        <button className="tb-btn" aria-label="Settings and more" onClick={() => teams.toast("Settings")}><I.More /></button>
        <button className="me-btn" aria-label="Your profile" onClick={() => teams.toast(`${me.name} · ${me.note}`)}>
          <span className="avw">
            <Avatar id={teams.me} />
            <PresenceDot id={teams.me} style={{ borderColor: "var(--frame)" }} />
          </span>
        </button>
      </div>
    </header>
  );
}

const APP_BAR: [TeamsView, string, () => ReactNode][] = [
  ["activity", "Activity", () => <I.Activity />],
  ["chat", "Chat", () => <I.Chat />],
  ["teams", "Teams", () => <I.Teams />],
  ["calendar", "Calendar", () => <I.Calendar />],
  ["calls", "Calls", () => <I.Calls />],
  ["onedrive", "OneDrive", () => <I.OneDrive />],
];

export function AppBar() {
  const { teams } = useUI();
  const { state } = teams;
  const counts: Partial<Record<TeamsView, number>> = {
    activity: state.feed.filter((a) => a.unread).length,
    chat: teams.chats.filter((c) => state.conversations[c.key]?.unread && !(state.view === "chat" && state.chat === c.key)).length,
  };
  return (
    <nav className="appbar" aria-label="Apps">
      {APP_BAR.map(([id, label, icon]) => (
        <button
          key={id}
          className={`app-btn${state.view === id ? " active" : ""}${id === "onedrive" ? " extra" : ""}`}
          aria-current={state.view === id ? "page" : undefined}
          onClick={() => teams.show(id)}
        >
          {counts[id] ? <span className="count">{counts[id]}</span> : null}
          {icon()}
          <span>{label}</span>
        </button>
      ))}
      <span className="spacer" />
      <button className={`app-btn${state.view === "apps" ? " active" : ""}`} aria-current={state.view === "apps" ? "page" : undefined} onClick={() => teams.show("apps")}>
        <I.Apps />
        <span>Apps</span>
      </button>
    </nav>
  );
}

function Head({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="lp-head">
      <h1>{title}</h1>
      {children}
    </div>
  );
}

function HeadButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button className="tb-btn" title={label} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <button className={`lp-sec${collapsed ? " collapsed" : ""}`} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
        <I.Chev />
        {title}
      </button>
      <div hidden={collapsed}>{children}</div>
    </>
  );
}

export function ListPane() {
  const { teams } = useUI();
  const view = teams.state.view;
  return (
    <aside className="listpane" aria-label={view}>
      {view === "chat" ? <ChatList /> : view === "teams" ? <TeamList /> : view === "activity" ? <ActivityList /> : view === "calendar" ? <CalendarList /> : view === "calls" ? <CallList /> : <SimpleList view={view} />}
    </aside>
  );
}

function lastLine(chat: Chat, teams: ReturnType<typeof useUI>["teams"]) {
  const m = teams.state.conversations[chat.key]?.messages.at(-1);
  if (!m) return { prev: "", time: "" };
  if (m.call) return { prev: { missed: "Missed call", live: "Call in progress", noanswer: "No answer", ended: "Call ended" }[m.call.kind], time: clockTime(m.at) };
  const who = m.from === teams.me ? "You: " : chat.kind === "group" ? `${teams.people[m.from]?.name.split(" ")[0] ?? m.from}: ` : "";
  return { prev: who + (plain(m.text) || "Sent a file"), time: clockTime(m.at) };
}

function ChatList() {
  const { teams } = useUI();
  const { state } = teams;
  const row = (c: Chat) => {
    const { prev, time } = lastLine(c, teams);
    const active = state.chat === c.key;
    const unread = !!state.conversations[c.key]?.unread && !active;
    return (
      <button key={c.key} className={`row${active ? " active" : ""}${unread ? " unread" : ""}`} aria-current={active ? "page" : undefined} onClick={() => teams.open({ chat: c.id })}>
        <ChatAvatar chat={c} />
        <span className="body">
          <span className="top">
            <span className="name">{c.name}</span>
            {state.meetings[c.key] ? <span className="live" title="Call in progress"><I.Video /></span> : <span className="time">{time}</span>}
          </span>
          <span className="prev">{prev}</span>
        </span>
      </button>
    );
  };
  const pinned = teams.chats.filter((c) => c.pinned);
  return (
    <>
      <Head title="Chat">
        <HeadButton label="Filter" onClick={() => teams.toast("Filter: Unread, Chats, Meetings")}><I.Filter /></HeadButton>
        <HeadButton label="Meet now" onClick={() => teams.ui.startMeeting(null, { video: true })}><I.Video /></HeadButton>
        <HeadButton label="New chat" onClick={() => teams.toast("New chat")}><I.Pencil /></HeadButton>
      </Head>
      <div className="lp-scroll">
        {pinned.length ? <Section title="Pinned">{pinned.map(row)}</Section> : null}
        <Section title="Recent">{teams.chats.filter((c) => !c.pinned).map(row)}</Section>
      </div>
    </>
  );
}

function TeamList() {
  const { teams } = useUI();
  const { state } = teams;
  const [collapsed, setCollapsed] = useState<string[]>([]);
  return (
    <>
      <Head title="Teams">
        <HeadButton label="Filter" onClick={() => teams.toast("Filter teams and channels")}><I.Filter /></HeadButton>
        <HeadButton label="Create or join a team" onClick={() => teams.toast("Create or join a team")}><I.Plus /></HeadButton>
      </Head>
      <div className="lp-scroll">
        {teams.teams.map((t) => {
          const closed = collapsed.includes(t.id);
          return (
            <div key={t.id} className={`team${closed ? " collapsed" : ""}`}>
              <button className="team-row" aria-expanded={!closed} onClick={() => setCollapsed(closed ? collapsed.filter((x) => x !== t.id) : [...collapsed, t.id])}>
                <span className="chev"><I.Chev /></span>
                <span className="team-av" style={{ background: t.color }}>{t.initials}</span>
                <span style={{ flex: 1 }}>{t.name}</span>
              </button>
              <div className="channels">
                {t.channels.map((c) => {
                  const active = state.channel === c.key;
                  const conv = state.conversations[c.key];
                  return (
                    <button
                      key={c.key}
                      className={`ch-row${active ? " active" : ""}${conv?.unread && !active ? " unread" : ""}`}
                      aria-current={active ? "page" : undefined}
                      onClick={() => teams.open({ team: t.id, channel: c.id })}
                    >
                      <span className="name">{c.name}</span>
                      {state.meetings[c.key] ? <span className="live" title="Meeting in progress"><I.Video /></span> : null}
                      {conv?.mentions && !active ? <span className="mention-b" title="You were mentioned">@</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const ACT_COLOR = { mention: "#c4314b", chat: "#5b5fc7", meeting: "#5b5fc7", like: "#e3a21a", reply: "#038387" };
const ACT_GLYPH = { mention: "@", chat: "💬", meeting: "▶", like: "❤", reply: "↩" };

function activityTime(a: TeamsActivityItem, live: boolean) {
  if (a.type === "meeting" && live) return "Live";
  if (a.at === null) return "Earlier";
  return dayStart(a.at) === dayStart(Date.now()) ? clockTime(a.at) : dayLabel(a.at);
}

function ActivityList() {
  const { teams } = useUI();
  return (
    <>
      <Head title="Activity">
        <HeadButton label="Filter" onClick={() => teams.toast("Filter: Unread, Mentions, Replies, Reactions")}><I.Filter /></HeadButton>
      </Head>
      <div className="lp-scroll">
        {teams.state.feed.map((a) => (
          <button key={a.id} className={`act${a.unread ? " unread" : ""}${teams.state.activity === a.id ? " active" : ""}`} onClick={() => teams.ui.pickActivity(a.id)}>
            <Avatar id={a.from} />
            <span className="badge-ic" style={{ background: ACT_COLOR[a.type] }}>{ACT_GLYPH[a.type]}</span>
            <span className="body">
              <span className="l1">
                <span>{a.where}</span>
                <span className="t">{activityTime(a, !!a.go && !!teams.state.meetings[keyOf(a.go)])}</span>
              </span>
              <span className="l2">{a.text}</span>
              <span className="l3">{a.preview}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function MiniMonth() {
  const today = new Date();
  const y = today.getFullYear();
  const mo = today.getMonth();
  const start = (new Date(y, mo, 1).getDay() + 6) % 7;
  const days = new Date(y, mo + 1, 0).getDate();
  return (
    <div className="mini-month">
      <div className="mm-title">{today.toLocaleDateString([], { month: "long", year: "numeric" })}</div>
      <div className="mm-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`h${i}`} className="mm-wd">{d}</span>)}
        {Array.from({ length: start }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => (
          <span key={i} className={`mm-day${i + 1 === today.getDate() ? " today" : ""}`}>{i + 1}</span>
        ))}
      </div>
    </div>
  );
}

function CalendarList() {
  const { teams } = useUI();
  const calendars = teams.seed.calendars ?? [{ name: "Calendar" }];
  return (
    <>
      <Head title="Calendar" />
      <div className="lp-scroll">
        <MiniMonth />
        <Section title="My calendars">
          {calendars.map((c) => (
            <div key={c.name} className="row" style={{ cursor: "default" }}>
              <span className="cal-swatch" style={{ background: c.color ?? "var(--brand)" }} />
              <span className="body">{c.name}</span>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

function CallList() {
  const { teams } = useUI();
  const ids = teams.seed.speedDial ?? [];
  return (
    <>
      <Head title="Calls" />
      <div className="lp-scroll">
        <Section title="Speed dial">
          {ids.filter((id) => teams.people[id]).map((id) => (
            <div key={id} className="row">
              <span className="avw"><Avatar id={id} /><PresenceDot id={id} /></span>
              <span className="body">
                <span className="top"><span className="name">{teams.people[id].name}</span></span>
                <span className="prev">{teams.people[id].note}</span>
              </span>
              <CallButtons id={id} />
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

/** Video and audio call buttons for a person. */
export function CallButtons({ id }: { id: string }) {
  const { teams } = useUI();
  return (
    <>
      <button className="tb-btn" title="Video call" aria-label={`Video call ${teams.people[id]?.name}`} onClick={() => teams.ui.startMeeting({ chat: id }, { video: true })}><I.Video /></button>
      <button className="tb-btn" title="Audio call" aria-label={`Audio call ${teams.people[id]?.name}`} onClick={() => teams.ui.startMeeting({ chat: id })}><I.Calls /></button>
    </>
  );
}

const SIMPLE: Partial<Record<TeamsView, [string, string[]]>> = {
  onedrive: ["OneDrive", ["My files", "Shared", "Recent", "Favorites"]],
  apps: ["Apps", ["Discover", "Built for your org", "Manage your apps"]],
};

function SimpleList({ view }: { view: TeamsView }) {
  const { teams } = useUI();
  const [title, rows] = SIMPLE[view] ?? ["", []];
  return (
    <>
      <Head title={title} />
      <div className="lp-scroll">
        {rows.map((r, i) => (
          <button key={r} className={`row${i === 0 ? " active" : ""}`} onClick={() => teams.toast(r)}>
            <span className="body">{r}</span>
          </button>
        ))}
      </div>
    </>
  );
}
