import { Avatar, useUI, type Filter } from "./context";
import { duration, listTime } from "./format";
import * as I from "./icons";
import type { WhatsAppMessage } from "./types";

// The left of the screen: the rail of sections, and the chat list with its
// search, filter chips and a row per chat.

export function Rail() {
  const { whatsapp, press } = useUI();
  const unread = Object.values(whatsapp.state.chats).filter((c) => c.unread).length;
  const btn = (label: string, Icon: typeof I.Status) => (
    <button className="rbtn" title={label} aria-label={label} onClick={() => press(label)}>
      <Icon />
    </button>
  );
  return (
    <nav className="rail" aria-label="Sections">
      <button className="rbtn on" title="Chats" aria-label="Chats" aria-current="page">
        <I.Chats />
        {unread ? <span className="badge">{unread}</span> : null}
      </button>
      {btn("Status", I.Status)}
      {btn("Channels", I.Channels)}
      {btn("Communities", I.Communities)}
      <div className="sp" />
      <div className="rsep" />
      {btn("Settings", I.Settings)}
      <button className="rbtn" title="Profile" aria-label="Profile" onClick={() => press("Profile")}>
        <Avatar person={whatsapp.me} className="me" />
      </button>
    </nav>
  );
}

const FILTERS: Filter[] = ["All", "Unread", "Favorites", "Groups"];

export function ChatList() {
  const { whatsapp, filter, setFilter, query, setQuery, setConvOpen, press } = useUI();
  const { state } = whatsapp;
  const q = query.trim().toLowerCase();
  const ids = state.order.filter((id) => {
    const c = state.chats[id];
    const info = whatsapp.chat(id);
    const pass =
      filter === "All" || (filter === "Unread" && c.unread) || (filter === "Groups" && info.group) || (filter === "Favorites" && c.pinned);
    return pass && (!q || info.name.toLowerCase().includes(q));
  });
  return (
    <section className="side" aria-label="Chats">
      <header className="side-head">
        <h1>Chats</h1>
        <button className="ibtn" title="New chat" aria-label="New chat" onClick={() => press("New chat")}><I.NewChat /></button>
        <button className="ibtn" title="Menu" aria-label="Menu" onClick={() => press("Menu")}><I.Menu /></button>
      </header>
      <label className="search">
        <I.Search />
        <input placeholder="Search or start a new chat" aria-label="Search or start a new chat" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="chips" role="group" aria-label="Filter chats">
        {FILTERS.map((f) => (
          <button key={f} className={`chip${filter === f ? " on" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="list">
        {ids.length ? (
          ids.map((id) => <Row key={id} id={id} onOpen={() => { whatsapp.open(id); setConvOpen(true); }} />)
        ) : (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No chats found</p>
        )}
      </div>
    </section>
  );
}

function Row({ id, onOpen }: { id: string; onOpen: () => void }) {
  const { whatsapp } = useUI();
  const { state } = whatsapp;
  const c = state.chats[id];
  const info = whatsapp.chat(id);
  const last = c.messages[c.messages.length - 1];
  const on = state.open === id;
  return (
    <div
      className={`row${on ? " on" : ""}${c.unread ? " unread" : ""}`}
      role="button"
      tabIndex={0}
      aria-current={on ? "true" : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <Avatar chat={id} />
      <div className="mid">
        <div className="l1">
          <span className="name">{info.name}</span>
          {last ? <span className="time">{listTime(last.at)}</span> : null}
        </div>
        <div className="l2">
          <Preview id={id} last={last} />
          {c.muted ? <I.Muted aria-label="Muted" /> : null}
          {c.pinned ? <I.Pin aria-label="Pinned" /> : null}
          {c.unread ? <span className="badge">{c.unread}</span> : null}
        </div>
      </div>
    </div>
  );
}

/** What a message says in one line: its text, or what it is. */
export function summary(m: WhatsAppMessage) {
  if (m.voice) return `🎤 Voice message (${duration(m.voice.seconds)})`;
  if (m.document) return `📄 ${m.document.name}`;
  if (m.image) return `📷 ${m.text || "Photo"}`;
  return m.text;
}

function Preview({ id, last }: { id: string; last?: WhatsAppMessage }) {
  const { whatsapp } = useUI();
  const c = whatsapp.state.chats[id];
  const info = whatsapp.chat(id);
  const typist = c.typing ? whatsapp.people[c.typing] : null;
  if (typist)
    return (
      <div className="prev typing"><span>{`${info.group ? `${typist.first} is ` : ""}typing...`}</span></div>
    );
  if (!last) return <div className="prev" />;
  const mine = last.from === whatsapp.me;
  return (
    <div className="prev">
      {mine ? <I.Tick ticks={last.ticks} /> : info.group ? <span className="nm">{`${whatsapp.people[last.from]?.first ?? last.from}:\u00a0`}</span> : null}
      <span>{summary(last)}</span>
    </div>
  );
}
