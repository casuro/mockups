import { useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { Avatar, Badge, useUI } from "./context";
import { Conversation } from "./Conversation";
import { Customer } from "./Customer";
import { cap } from "./format";
import * as I from "./icons";
import type { TicketField, ZendeskTicket } from "./types";

// A ticket on screen: its properties on the left, the conversation and
// composer in the middle, the customer on the right.

export function TicketView({ ticket }: { ticket: ZendeskTicket }) {
  return (
    <div className="ticket">
      <Properties ticket={ticket} />
      <Conversation ticket={ticket} />
      <Customer ticket={ticket} />
    </div>
  );
}

const TYPES = ["question", "incident", "problem", "task"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const STATUSES = ["new", "open", "pending", "solved"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Properties({ ticket: t }: { ticket: ZendeskTicket }) {
  const { zendesk, propsOpen, setPropsOpen } = useUI();
  const { people, seed, me } = zendesk;
  const [tag, setTag] = useState("");
  const change = (field: TicketField) => (e: ChangeEvent<HTMLSelectElement>) => zendesk.ui.changeField(field, e.target.value || null);
  const pick = (field: TicketField, options: string[], value: string, style?: CSSProperties) => (
    <select className="select" aria-label={cap(field)} value={value} onChange={change(field)} style={style}>
      {options.map((o) => <option key={o} value={o}>{cap(o)}</option>)}
    </select>
  );
  const addTag = () => {
    if (tag.trim()) zendesk.ui.setTag(tag, true);
    setTag("");
  };
  return (
    <aside className={`props${propsOpen ? " open" : ""}`} aria-label="Ticket properties">
      <button className="props-toggle" onClick={() => setPropsOpen(!propsOpen)}>
        Ticket properties<I.ChevronDown />
      </button>
      <div className="props-body">
        <Field label="Requester">
          <button className="select" onClick={() => zendesk.ui.action("Change requester")}>
            <Avatar id={t.requester} size="sm" />{people[t.requester]?.name}
          </button>
        </Field>
        <Field label="Assignee">
          <select className="select" aria-label="Assignee" value={t.assignee ?? ""} onChange={change("assignee")}>
            <option value="">-</option>
            {Object.entries(seed.agents).map(([id, a]) => (
              <option key={id} value={id}>{`${a.group ?? "Support"} / ${a.name}`}</option>
            ))}
          </select>
        </Field>
        <Field label="Followers">
          <div className="followers">
            {t.followers.map((f) => (
              <span key={f} className="who"><Avatar id={f} size="sm" title={people[f]?.name} /></span>
            ))}
            <button className="link-btn" onClick={zendesk.ui.toggleFollow}>{t.followers.includes(me) ? "Unfollow" : "Follow"}</button>
          </div>
        </Field>
        <Field label="Tags">
          <div className="chips">
            {t.tags.map((g) => (
              <span key={g} className="chip">
                {g}
                <button aria-label={`Remove tag ${g}`} onClick={() => zendesk.ui.setTag(g, false)}><I.X /></button>
              </span>
            ))}
            <input
              aria-label="Add tag"
              value={tag}
              onChange={(e) => setTag(e.target.value.replace(",", ""))}
              onBlur={addTag}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addTag();
                } else if (e.key === "Backspace" && !tag && t.tags.length) zendesk.ui.setTag(t.tags[t.tags.length - 1], false);
              }}
            />
          </div>
        </Field>
        <div className="field-row">
          <Field label="Type">{pick("type", TYPES, t.type)}</Field>
          <Field label="Priority">{pick("priority", PRIORITIES, t.priority)}</Field>
        </div>
        <Field label="Status">
          <div className="select status-sel">
            <Badge status={t.status} />
            {pick("status", STATUSES, t.status, { border: 0, flex: 1, minHeight: 34 })}
          </div>
        </Field>
      </div>
    </aside>
  );
}
