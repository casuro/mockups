import { useState } from "react";
import { Avatar, useUI } from "./context";
import { localTime } from "./format";
import * as I from "./icons";
import type { IntercomConversationState } from "./types";

// The right-hand panel: Details (the customer, the conversation's
// attributes, their recent conversations) and Copilot (the suggested answer
// with its sources, and a box to ask it something).

export function Details() {
  const { intercom, setSheet } = useUI();
  const { tab } = intercom.state;
  const c = intercom.state.conversations[intercom.state.current];
  return (
    <aside className="details" aria-label="Conversation details">
      <div className="dtabs" role="tablist">
        <button className={`dtab${tab === "details" ? " on" : ""}`} role="tab" aria-selected={tab === "details"} onClick={() => intercom.ui.setTab("details")}>Details</button>
        <button className={`dtab${tab === "copilot" ? " on" : ""}`} role="tab" aria-selected={tab === "copilot"} onClick={() => intercom.ui.setTab("copilot")}>
          <span className="fin-grad"><I.Fin /></span>Copilot
        </button>
        <span className="sp" />
        <button className="icon-btn m-close" aria-label="Close details" onClick={() => setSheet(false)}><I.X /></button>
      </div>
      <div className="dbody">{c ? tab === "copilot" ? <Copilot c={c} /> : <About c={c} /> : null}</div>
    </aside>
  );
}

function About({ c }: { c: IntercomConversationState }) {
  const { intercom } = useUI();
  const customer = intercom.customers[c.customer];
  const assignee = intercom.teammates[c.assignee];
  const recent = customer?.recent ?? [];
  return (
    <>
      <div className="card">
        <div className="contact">
          <Avatar person={customer} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div className="n">{customer?.name ?? c.customer}</div>
            <div className="e">{customer?.email}</div>
          </div>
        </div>
        <dl className="kv">
          {customer?.company ? <><dt>Company</dt><dd>{customer.company}</dd></> : null}
          {customer?.location ? <><dt>Location</dt><dd>{customer.location}</dd></> : null}
          <dt>Local time</dt>
          <dd>{localTime(customer?.timezone)}</dd>
          {customer?.plan ? <><dt>Plan</dt><dd><span className="chip">{customer.plan}</span></dd></> : null}
        </dl>
      </div>
      <div className="card">
        <h4>Conversation attributes</h4>
        <dl className="kv">
          <dt>Assignee</dt>
          <dd><Avatar person={assignee} size="sm" /> {assignee?.name ?? c.assignee}</dd>
          <dt>Team</dt>
          <dd>{c.team ?? "None"}</dd>
          <dt>Priority</dt>
          <dd>{c.priority ? <span className="tag pri"><I.Flag /> Priority</span> : "Not set"}</dd>
          <dt>Channel</dt>
          <dd>{c.channel === "chat" ? <I.Chat /> : <I.Mail />} {c.channel === "chat" ? "Messenger" : "Email"}</dd>
          <dt>Tags</dt>
          <dd className="chips">{c.tags.map((t) => <span key={t} className="chip">{t}</span>)}</dd>
        </dl>
      </div>
      {recent.length ? (
        <div className="card">
          <h4>Recent conversations <span>{recent.length}</span></h4>
          {recent.map((r) => (
            <div key={r.subject + r.at} className="recent">
              <I.Chat />
              <span className="s">{r.subject}</span>
              <span className="st">{r.status ?? "Closed"}</span>
              <span className="d">{r.at}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function Copilot({ c }: { c: IntercomConversationState }) {
  const { intercom, setDraft, setSheet, composer } = useUI();
  const [question, setQuestion] = useState("");
  const s = c.copilot;
  const add = () => {
    if (!s) return;
    intercom.ui.setMode("reply");
    setDraft(s.answer);
    setSheet(false);
    composer.current?.focus();
    intercom.toast("Added to composer");
    intercom.ui.emit({ type: "insert", conversation: c.id, tool: "suggestion", text: s.answer });
  };
  return (
    <>
      {s ? (
        <div className="card">
          <div className="cop-q">Suggested answer for: {s.question ?? c.subject}</div>
          <div className="cop-a">{s.answer}</div>
          {s.sources?.length ? (
            <div className="cop-src">
              {s.sources.map((src) => (
                <a
                  key={src.title}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    intercom.ui.emit({ type: "copilot", conversation: c.id, action: "source", text: src.title });
                  }}
                >
                  {src.kind === "conversation" ? <I.Chat /> : <I.Book />} {src.title}
                </a>
              ))}
            </div>
          ) : null}
          <div className="cop-actions">
            <button className="btn dark" onClick={add}><I.Plus /> Add to composer</button>
            <button className="btn" onClick={() => intercom.ui.emit({ type: "copilot", conversation: c.id, action: "regenerate" })}>Regenerate</button>
          </div>
        </div>
      ) : null}
      <label className="cop-input">
        <span className="fin-grad"><I.Fin /></span>
        <input
          placeholder="Ask Copilot a question..."
          aria-label="Ask Copilot"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !question.trim()) return;
            intercom.ui.emit({ type: "copilot", conversation: c.id, action: "ask", text: question.trim() });
            setQuestion("");
          }}
        />
      </label>
    </>
  );
}
