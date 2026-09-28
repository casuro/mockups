import { useEffect } from "react";
import { Avatar, useUI } from "./context";
import { clockTime, dayLabel, dayStart, Mrkdwn } from "./format";
import { HuddleCard } from "./Huddle";
import * as I from "./icons";
import type { SlackMessage } from "./types";

// A conversation's messages: day dividers, the red "New" line, and each
// message with its hover bar, attachments, reactions and thread summary.

export function MessageList({ messages, newFrom, inThread = false }: { messages: SlackMessage[]; newFrom?: string | null; inThread?: boolean }) {
  let prev: SlackMessage | null = null;
  return (
    <>
      {messages.map((m) => {
        const before = prev;
        prev = m;
        const newDay = !inThread && (!before || dayStart(before.at) !== dayStart(m.at));
        return (
          <MessageGroup key={m.id} message={m} prev={newDay ? null : before} newDay={newDay} isNew={!inThread && m.id === newFrom} inThread={inThread} />
        );
      })}
    </>
  );
}

function MessageGroup({ message, prev, newDay, isNew, inThread }: { message: SlackMessage; prev: SlackMessage | null; newDay: boolean; isNew: boolean; inThread: boolean }) {
  return (
    <>
      {newDay ? <div className="divider"><span>{dayLabel(message.at)}</span></div> : null}
      {isNew ? <div className="divider new"><em>New</em></div> : null}
      {message.huddle ? <HuddleCard message={message} /> : <Message message={message} prev={isNew ? null : prev} inThread={inThread} />}
    </>
  );
}

export function Message({ message: m, prev, inThread = false }: { message: SlackMessage; prev: SlackMessage | null; inThread?: boolean }) {
  const ui = useUI();
  const { slack, seen, fmt } = ui;
  const p = slack.people[m.from] ?? { name: m.from, bot: false, status: undefined };
  const fresh = !seen.has(m.id);
  useEffect(() => void seen.add(m.id), [seen, m.id]);
  const cont =
    !!prev && !prev.huddle && prev.from === m.from && !m.card && !p.bot && m.at - prev.at < 10 * 60000 && dayStart(m.at) === dayStart(prev.at);

  return (
    <div className={`msg${cont ? " cont" : ""}${m.mentioned ? " mentioned" : ""}${fresh ? " new-msg" : ""}`} data-id={m.id}>
      <HoverBar id={m.id} inThread={inThread} />
      {cont ? <div className="gutter-time">{clockTime(m.at).replace(/ [AP]M/, "")}</div> : <Avatar id={m.from} />}
      <div>
        {cont ? null : (
          <div className="meta">
            <span className="name">{p.name}</span>
            {p.bot ? <span className="app-tag">App</span> : null}
            {p.status ? <span className="status-emoji">{p.status}</span> : null}
            <span className="time">{clockTime(m.at)}</span>
          </div>
        )}
        {m.text ? <div className="text"><Mrkdwn text={m.text} ctx={fmt} /></div> : null}
        <Extras message={m} />
        <Reactions message={m} />
        {!inThread && m.replies.length ? <ThreadSummary message={m} /> : null}
      </div>
    </div>
  );
}

function HoverBar({ id, inThread }: { id: string; inThread: boolean }) {
  const { slack, openPicker, react } = useUI();
  return (
    <div className="hover-bar">
      <button title="Completed" aria-label="React with a check mark" onClick={() => react(id, "✅")}>✅</button>
      <button title="Taking a look" aria-label="React with eyes" onClick={() => react(id, "👀")}>👀</button>
      <button title="Nice" aria-label="React with raised hands" onClick={() => react(id, "🙌")}>🙌</button>
      <span className="sep" />
      <button title="Add reaction" aria-label="Add reaction" onClick={(e) => openPicker(e.currentTarget, { kind: "message", id })}>😀</button>
      {inThread ? null : (
        <button title="Reply in thread" aria-label="Reply in thread" onClick={() => slack.ui.openThread(id)}><I.Bubble /></button>
      )}
      <button title="Save for later" aria-label="Save for later" onClick={() => slack.toast("Saved for later")}><I.Bookmark /></button>
      <button title="More" aria-label="More actions"><I.MoreV /></button>
    </div>
  );
}

function Extras({ message: m }: { message: SlackMessage }) {
  const { slack, fmt, grown, renderCustom } = useUI();
  const grow = !!m.chart && !grown.has(m.id);
  useEffect(() => void (m.chart && grown.add(m.id)), [grown, m.id, m.chart]);
  const max = m.chart ? Math.max(...m.chart) : 1;
  return (
    <>
      {m.card ? (
        <div className="bot-card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}><Mrkdwn text={m.card.title} ctx={fmt} /></div>
          {(m.card.rows ?? []).map(([label, value, tone]) => (
            <div className="row" key={label}>
              <span>{label}</span>
              {tone === "ok" ? <span className="ok">● {value}</span> : tone === "bad" ? <span style={{ color: "var(--red)", fontWeight: 700 }}>● {value}</span> : <span>{value}</span>}
            </div>
          ))}
          {m.card.buttons?.length ? (
            <div className="btns">
              {m.card.buttons.map((b, i) => (
                <button key={b} className={i ? "" : "primary"} onClick={() => slack.ui.emit({ type: "action", kind: "card", label: b, id: m.id })}>{b}</button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {m.chart ? (
        <div className={`chart${grow ? " grow" : ""}`} role="img" aria-label="Chart">
          {m.chart.map((v, i) => <div key={i} style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 40}ms` }} />)}
        </div>
      ) : null}
      {m.file ? (
        <div className="attach">
          <div className="fi" style={{ background: m.file.color ?? "#1264a3" }}>{m.file.ext ?? "FILE"}</div>
          <div><b>{m.file.name}</b><small>{m.file.meta}</small></div>
        </div>
      ) : null}
      {m.link ? (
        <div className="unfurl">
          <div className="site"><i style={{ background: m.link.color ?? "#1d1c1d" }}>{m.link.site.charAt(0)}</i><b>{m.link.site}</b></div>
          <a href="#" onClick={(e) => { e.preventDefault(); slack.ui.emit({ type: "action", kind: "link", label: m.link!.title, id: m.id }); }}>{m.link.title}</a>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{m.link.body}</p>
        </div>
      ) : null}
      {m.custom && renderCustom ? renderCustom(m) : null}
    </>
  );
}

function Reactions({ message: m }: { message: SlackMessage }) {
  const { popped, openPicker, react } = useUI();
  if (!m.reactions.length) return null;
  return (
    <div className="reactions">
      {m.reactions.map((r) => (
        <button
          key={r.emoji}
          className={`react${r.mine ? " mine" : ""}${popped === `${m.id}:${r.emoji}` ? " pop" : ""}`}
          aria-label={`${r.emoji} ${r.count}`}
          onClick={() => react(m.id, r.emoji)}
        >
          <span className="e">{r.emoji}</span>
          {r.count}
        </button>
      ))}
      <button className="react add" aria-label="Add reaction" onClick={(e) => openPicker(e.currentTarget, { kind: "message", id: m.id })}>
        😀<sup style={{ fontSize: 9 }}>+</sup>
      </button>
    </div>
  );
}

function ThreadSummary({ message: m }: { message: SlackMessage }) {
  const { slack } = useUI();
  const who = [...new Set(m.replies.map((r) => r.from))].slice(0, 3);
  const last = m.replies[m.replies.length - 1];
  const day = dayLabel(last.at);
  return (
    <button className="replies" onClick={() => slack.ui.openThread(m.id)}>
      <span className="stack">{who.map((w) => <Avatar key={w} id={w} />)}</span>
      <b>{m.replies.length} {m.replies.length === 1 ? "reply" : "replies"}</b>
      <span className="last">Last reply {day === "Today" || day === "Yesterday" ? day.toLowerCase() : `on ${day}`} at {clockTime(last.at)}</span>
      <span className="view">View thread ›</span>
    </button>
  );
}
