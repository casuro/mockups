import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Composer } from "./Composer";
import { Avatar, Badge, useUI } from "./context";
import { when } from "./format";
import * as I from "./icons";
import type { ZendeskMessage, ZendeskTicket } from "./types";

// The middle of a ticket: its subject, the public replies and internal
// notes, oldest first, and the composer under them.

export function Conversation({ ticket: t }: { ticket: ZendeskTicket }) {
  const { zendesk } = useUI();
  const last = t.messages[t.messages.length - 1];
  return (
    <section className="convo" aria-label="Conversation">
      <div className="convo-head">
        <h1>{t.subject}</h1>
        <Badge status={t.status} wide />
        <span className="meta">{`#${t.id}`}</span>
      </div>
      <ScrollToEnd reset={String(t.id)} watch={`${t.messages.length}:${last?.id ?? ""}`} force={last?.from === zendesk.me}>
        {t.messages.map((m) => <Message key={m.id} message={m} ticket={t} />)}
      </ScrollToEnd>
      <Composer ticket={t} />
    </section>
  );
}

function Message({ message: m, ticket }: { message: ZendeskMessage; ticket: ZendeskTicket }) {
  const { zendesk, renderCustom } = useUI();
  const from = zendesk.people[m.from];
  const agent = !!from?.agent;
  const Channel = I.CHANNEL[m.channel] ?? I.Web;
  return (
    <article className={`msg${m.note ? " note" : ""}`}>
      <Avatar id={m.from} size="lg" />
      <div className="body-col">
        <div className="hd">
          <span className="nm">{from?.name ?? m.from}</span>
          {m.note ? <span className="role">Internal note</span> : agent ? <span className="role">Agent</span> : null}
          <span className="ts"><Channel />{when(m.at)}</span>
        </div>
        {m.note ? null : <div className="to">{`to ${agent ? (zendesk.people[ticket.requester]?.name ?? "") : zendesk.seed.account.name}`}</div>}
        {m.text ? <div className="txt">{m.text}</div> : null}
        {m.attachment ? <div className="attach"><I.Ticket />{m.attachment}</div> : null}
        {m.custom && renderCustom ? renderCustom(m) : null}
      </div>
    </article>
  );
}

/**
 * The message stream. It jumps to the end when a ticket opens (`reset`) and
 * when a message lands (`watch`), unless the agent has scrolled up to read
 * (their own messages, `force`, always jump).
 */
function ScrollToEnd({ watch, reset, force, children }: { watch: string; reset: string; force: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
    pinned.current = true;
  }, [reset]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && (pinned.current || force)) el.scrollTop = el.scrollHeight;
  }, [watch]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      ref={ref}
      className="stream"
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
