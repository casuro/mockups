import { useEffect, useState } from "react";
import { Avatar, useUI } from "./context";
import { ago } from "./format";
import * as I from "./icons";
import { currentView } from "./Sidebar";
import type { IntercomConversationState, IntercomState } from "./types";

// The middle column: the selected view's name, the status and sort pills,
// and a row per conversation with its channel, last message, unread dot,
// and Priority and SLA tags.

const STATUSES: IntercomState["status"][] = ["Open", "Snoozed", "Closed", "All"];
const SORTS: IntercomState["sort"][] = ["Newest", "Oldest", "Waiting longest", "Priority"];

export function ConversationList() {
  const { intercom, openMenu, setDrawer } = useUI();
  const { state, seed } = intercom;
  const view = currentView(seed, state.view);
  const ids = view?.conversations ? state.order.filter((id) => view.conversations!.includes(id)) : state.order;
  const rows = ids.map((id) => state.conversations[id]).filter(Boolean);

  // "2m" becomes "3m" without anything else changing.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="list" aria-label="Conversations">
      <div className="list-head">
        <div className="t">
          <button className="icon-btn m-only" aria-label="Menu" onClick={() => setDrawer(true)}><I.Menu /></button>
          <h2>{view?.label ?? "Inbox"}</h2>
          <button className="icon-btn" aria-label="New conversation" onClick={() => intercom.ui.emit({ type: "action", label: "New conversation" })}>
            <I.Plus />
          </button>
        </div>
        <div className="filters">
          <button
            className="pill"
            onClick={(e) =>
              openMenu(e.currentTarget, STATUSES.map((v) => ({ key: v, label: v, checked: state.status === v, onPick: () => intercom.ui.setFilter({ status: v }) })))
            }
          >
            {state.status === "Open" ? `${rows.length} ` : ""}
            {state.status} <I.Down />
          </button>
          <button
            className="pill"
            onClick={(e) =>
              openMenu(e.currentTarget, SORTS.map((v) => ({ key: v, label: v, checked: state.sort === v, onPick: () => intercom.ui.setFilter({ sort: v }) })))
            }
          >
            {state.sort} <I.Down />
          </button>
        </div>
      </div>
      <div className="rows">
        {rows.map((c) => (
          <Row key={c.id} c={c} on={c.id === state.current} />
        ))}
      </div>
    </section>
  );
}

function Row({ c, on }: { c: IntercomConversationState; on: boolean }) {
  const { intercom, showConv } = useUI();
  const { customers, teammates, me } = intercom;
  const customer = customers[c.customer];
  const last = [...c.messages].reverse().find((m) => m.kind !== "event");
  const who = !last
    ? ""
    : last.kind === "reply"
      ? last.by === me
        ? "You: "
        : `${teammates[last.by ?? ""]?.name.split(" ")[0] ?? "Teammate"}: `
      : last.kind === "note"
        ? "Note: "
        : last.kind === "fin"
          ? "Fin: "
          : "";
  const open = () => {
    intercom.open(c.id);
    showConv(true);
  };
  return (
    <div
      className={`row${on ? " on" : ""}${c.unread ? " unread" : ""}`}
      role="button"
      tabIndex={0}
      aria-current={on ? "true" : undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <Avatar person={customer} />
      <div className="body">
        <div className="l1">
          <span className="name">{customer?.name ?? c.customer}</span>
          <span className="co">{customer?.company}</span>
          <span className="time">{last ? ago(last.at) : ""}</span>
        </div>
        <div className="prev">
          <span className="chan">{c.channel === "chat" ? <I.Chat /> : <I.Mail />}</span>
          <span className="txt">{last ? who + last.text : c.subject}</span>
          {c.unread ? <i className="udot" /> : null}
        </div>
        {c.sla || c.priority ? (
          <div className="l3">
            {c.priority ? <span className="tag pri"><I.Flag /> Priority</span> : null}
            {c.sla ? <span className={`tag sla${c.slaBreached ? " breach" : ""}`}><I.Clock /> {c.sla}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
