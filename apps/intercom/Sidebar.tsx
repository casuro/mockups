import type { ReactNode } from "react";
import { Avatar, useUI } from "./context";
import * as I from "./icons";
import type { IntercomInbox } from "./types";

// The frame on the left: the app rail (Inbox, Fin, Knowledge, Reports...)
// and the inbox sidebar with its views, team inboxes and saved views.

const RAIL: [string, ReactNode][] = [
  ["Inbox", <I.Inbox />],
  ["Fin AI Agent", <I.Fin />],
  ["Knowledge", <I.Book />],
  ["Reports", <I.Chart />],
  ["Outbound", <I.Send />],
  ["Contacts", <I.Users />],
];

export function Rail() {
  const { intercom } = useUI();
  const { state, teammates, me } = intercom;
  const unread = state.order.filter((id) => state.conversations[id]?.unread).length;
  const action = (label: string) => intercom.ui.emit({ type: "action", label });
  return (
    <nav className="rail" aria-label="Intercom">
      <div className="logo" title="Intercom"><I.Logo /></div>
      {RAIL.map(([label, icon], i) => (
        <button key={label} className={`rail-btn${i === 0 ? " on" : ""}`} title={label} aria-label={label} onClick={() => i && action(label)}>
          {icon}
          {i === 0 && unread ? <span className="badge">{unread}</span> : null}
        </button>
      ))}
      <div className="spacer" />
      <button className="rail-btn" title="Settings" aria-label="Settings" onClick={() => action("Settings")}><I.Gear /></button>
      <button
        className={`me${state.away ? " away" : ""}`}
        title={state.away ? "Away - click to set active" : "Active - click to set away"}
        onClick={intercom.ui.toggleAway}
      >
        <Avatar person={teammates[me]} />
        <span className="dot" />
      </button>
    </nav>
  );
}

export function Side() {
  const { intercom, setDrawer } = useUI();
  const { seed, state } = intercom;
  const item = (v: IntercomInbox) => (
    <button
      key={v.id}
      className={`nav-item${state.view === v.id ? " on" : ""}`}
      aria-current={state.view === v.id ? "page" : undefined}
      onClick={() => {
        intercom.ui.setView(v.id);
        setDrawer(false);
      }}
    >
      <span className="emo">{v.icon}</span>
      <span className="lbl">{v.label}</span>
      <span className="cnt">{v.count ?? (v.conversations ?? state.order).length}</span>
    </button>
  );
  return (
    <aside className="side" aria-label="Inbox">
      <h1>
        Inbox
        <button aria-label="Search" onClick={() => intercom.ui.emit({ type: "action", label: "Search" })}><I.Search /></button>
      </h1>
      <div className="nav">{seed.inboxes.map(item)}</div>
      {seed.teamInboxes?.length ? (
        <>
          <div className="sec">Team inboxes</div>
          <div className="nav">{seed.teamInboxes.map(item)}</div>
        </>
      ) : null}
      {seed.views ? (
        <>
          <div className="sec">
            Views
            <button className="icon-btn" style={{ width: 22, height: 22 }} aria-label="New view" onClick={() => intercom.ui.emit({ type: "action", label: "New view" })}>
              <I.Plus />
            </button>
          </div>
          <div className="nav">{seed.views.map(item)}</div>
        </>
      ) : null}
    </aside>
  );
}

/** The sidebar item that is selected, from any of the three groups. */
export function currentView(seed: { inboxes: IntercomInbox[]; teamInboxes?: IntercomInbox[]; views?: IntercomInbox[] }, id: string) {
  return [...seed.inboxes, ...(seed.teamInboxes ?? []), ...(seed.views ?? [])].find((v) => v.id === id);
}
