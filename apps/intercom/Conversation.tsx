import { Fragment, useLayoutEffect, useRef, type ReactNode } from "react";
import { Composer } from "./Composer";
import { Avatar, useUI } from "./context";
import { dayLabel, dayStart, EventText, messageTime } from "./format";
import * as I from "./icons";
import type { IntercomConversationState, IntercomMessage } from "./types";

// The open conversation: its header (assign, snooze, close), the thread of
// customer, teammate, Fin and internal-note bubbles with event lines
// between them, and the composer.

const SNOOZE = ["Later today", "Tomorrow", "Monday", "Next week"];

export function Conversation() {
  const { intercom } = useUI();
  const c = intercom.state.conversations[intercom.state.current];
  if (!c) return <main className="conv" />;
  return (
    <main className="conv" aria-label={`Conversation with ${intercom.customers[c.customer]?.name ?? c.customer}`}>
      <Header c={c} />
      <Thread c={c} />
      <Composer c={c} />
    </main>
  );
}

function Header({ c }: { c: IntercomConversationState }) {
  const { intercom, openMenu, showConv, setSheet } = useUI();
  const { teammates, me } = intercom;
  const assignee = teammates[c.assignee];
  return (
    <div className="conv-head">
      <button className="icon-btn back" aria-label="Back" onClick={() => showConv(false)}><I.Back /></button>
      <h3>{intercom.customers[c.customer]?.name ?? c.customer}</h3>
      <button className="icon-btn" aria-label="More" onClick={() => intercom.ui.emit({ type: "action", label: "More", conversation: c.id })}><I.More /></button>
      <button
        className="btn"
        aria-label={`Assigned to ${assignee?.name ?? c.assignee}`}
        onClick={(e) =>
          openMenu(
            e.currentTarget,
            Object.values(teammates).map((t) => ({
              key: t.id,
              label: <><Avatar person={t} size="sm" /> {t.name}{t.id === me ? " (you)" : ""}</>,
              onPick: () => intercom.ui.assignTo(t.id),
            })),
            "Assign to"
          )
        }
      >
        <Avatar person={assignee} size="sm" /> <span className="nm">{assignee?.name.split(" ")[0] ?? c.assignee}</span> <I.Down />
      </button>
      <button
        className="icon-btn"
        aria-label="Snooze"
        title="Snooze"
        onClick={(e) => openMenu(e.currentTarget, SNOOZE.map((t) => ({ key: t, label: t, onPick: () => intercom.ui.snooze(t) })), "Snooze until")}
      >
        <I.Snooze />
      </button>
      <button className="btn dark" title="Close" onClick={intercom.ui.close}><I.Check /> <span className="lb">Close</span></button>
      <button className="icon-btn info-btn" aria-label="Details" title="Details" onClick={() => setSheet(true)}><I.Info /></button>
    </div>
  );
}

function Thread({ c }: { c: IntercomConversationState }) {
  const { intercom } = useUI();
  const typing = intercom.typing === c.id;
  const last = c.messages[c.messages.length - 1];
  let prevDay = -1;
  return (
    <ScrollToEnd reset={c.id} watch={`${c.id}:${c.messages.length}:${last?.id}:${typing}`}>
      {c.messages.map((m) => {
        const day = dayStart(m.at);
        const divider = day !== prevDay ? <div className="day">{dayLabel(m.at)}</div> : null;
        prevDay = day;
        return (
          <Fragment key={m.id}>
            {divider}
            <Message m={m} c={c} />
          </Fragment>
        );
      })}
      {typing ? (
        <div className="msg in typing" aria-label={`${intercom.customers[c.customer]?.name ?? "The customer"} is typing`}>
          <Avatar person={intercom.customers[c.customer]} />
          <div><div className="bubble"><span className="dots"><span /><span /><span /></span></div></div>
        </div>
      ) : null}
    </ScrollToEnd>
  );
}

function Message({ m, c }: { m: IntercomMessage; c: IntercomConversationState }) {
  const { intercom, renderCustom } = useUI();
  const custom = m.custom && renderCustom ? renderCustom(m) : null;
  const body = (meta: ReactNode) => (
    <div>
      {m.text ? <div className="bubble">{m.text}</div> : null}
      {custom}
      <div className="meta">{meta}</div>
    </div>
  );
  if (m.kind === "event") return <div className="event"><EventText text={m.text} /></div>;
  const time = messageTime(m.at);
  if (m.kind === "customer") {
    const customer = intercom.customers[c.customer];
    return (
      <div className="msg in">
        <Avatar person={customer} />
        {body(`${(customer?.name ?? c.customer).split(" ")[0]} · ${time}`)}
      </div>
    );
  }
  if (m.kind === "fin")
    return (
      <div className="msg out fin">
        <span className="fin-av"><I.Fin /></span>
        {body(<><span className="ai-badge">AI</span> Fin AI Agent · {time}</>)}
      </div>
    );
  const note = m.kind === "note";
  const by = intercom.teammates[m.by ?? ""];
  return (
    <div className={`msg out${note ? " note" : ""}`}>
      <Avatar person={by} />
      {body(
        <>
          {note ? "Internal note · " : ""}
          {by?.name ?? m.by} · {time}
          {m.seen ? <> · <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><I.Seen /> Seen</span></> : null}
        </>
      )}
    </div>
  );
}

/**
 * The thread's scroller: it follows new messages to the end unless the
 * reader has scrolled up, and jumps to the end on another conversation.
 */
function ScrollToEnd({ watch, reset, children }: { watch: string; reset: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
    pinned.current = true;
  }, [reset]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [watch]);
  return (
    <div
      ref={ref}
      className="thread"
      role="log"
      aria-label="Messages"
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      {children}
    </div>
  );
}
