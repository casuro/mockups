import { useEffect, useLayoutEffect, useRef } from "react";
import { Avatar, IconButton, useUI } from "./context";
import { Body, FileIcon, fullDate, listDate, timeRange } from "./format";
import * as I from "./icons";
import { useSnippet } from "./MailList";
import type { GmailMail, GmailMessage } from "./types";

// An open conversation: its toolbar, subject and labels, the messages
// (earlier ones collapsed to a line), attachments, an invitation with its
// RSVP, and the inline reply.

export function Thread({ mail: m, list, inPane = false }: { mail: GmailMail; list: GmailMail[]; inPane?: boolean }) {
  const { gmail } = useUI();
  const { state, ui } = gmail;
  const scroll = useRef<HTMLDivElement>(null);
  const idx = list.findIndex((x) => x.id === m.id);
  const replying = state.reply?.mail === m.id;
  const people = new Set(m.messages.flatMap((x) => [x.from, ...x.to]));

  // Another conversation starts at the top; starting a reply, or a message landing, goes to the bottom.
  const count = m.messages.length;
  const prev = useRef({ id: m.id, replying, count });
  useLayoutEffect(() => {
    const p = prev.current;
    prev.current = { id: m.id, replying, count };
    const el = scroll.current;
    if (!el) return;
    if (p.id !== m.id) el.scrollTop = 0;
    else if ((replying && !p.replying) || count > p.count) el.scrollTop = el.scrollHeight;
  }, [m.id, replying, count]);

  const tags = [...(m.folder === "inbox" ? ["Inbox"] : []), ...m.labels];
  return (
    <>
      <div className="toolbar">
        {inPane ? null : (
          <IconButton tip={`Back to ${state.view.query ? "Search results" : "Inbox"}`} onClick={ui.close}><I.Back /></IconButton>
        )}
        <IconButton tip="Archive" onClick={() => ui.act("archive", [m.id])}><I.Archive /></IconButton>
        <IconButton tip="Report spam" onClick={() => ui.act("spam", [m.id])}><I.Spam /></IconButton>
        <IconButton tip="Delete" onClick={() => ui.act("delete", [m.id])}><I.Trash /></IconButton>
        <span className="sep" />
        <IconButton tip="Mark as unread" onClick={() => ui.act("unread", [m.id])}><I.Unread /></IconButton>
        <IconButton className="icon-btn hide-m" tip="Snooze" onClick={() => ui.act("snooze", [m.id])}><I.Snooze /></IconButton>
        <IconButton className="icon-btn hide-m" tip="Add to Tasks" onClick={() => ui.act("task", [m.id])}><I.Task /></IconButton>
        <span className="sep" />
        <IconButton className="icon-btn hide-m" tip="Move to" onClick={() => gmail.toast("Move to…")}><I.MoveTo /></IconButton>
        <IconButton className="icon-btn hide-m" tip="Labels" onClick={() => gmail.toast("Labels")}><I.Label /></IconButton>
        <IconButton tip="More" onClick={() => gmail.toast("More")}><I.More /></IconButton>
        <span className="grow" />
        {idx >= 0 && !inPane ? (
          <>
            <span className="range">{`${idx + 1} of ${list.length}`}</span>
            <IconButton className="icon-btn sm" tip="Newer" disabled={idx === 0} style={idx === 0 ? { opacity: 0.4 } : undefined} onClick={() => gmail.open(list[idx - 1].id)}>
              <I.ChevronLeft />
            </IconButton>
            <IconButton className="icon-btn sm" tip="Older" disabled={idx === list.length - 1} style={idx === list.length - 1 ? { opacity: 0.4 } : undefined} onClick={() => gmail.open(list[idx + 1].id)}>
              <I.ChevronRight />
            </IconButton>
          </>
        ) : null}
      </div>
      <div className="scroll" ref={scroll}>
        <div className="thread">
          <div className="th-head">
            <h1>{m.subject}</h1>
            {tags.map((l) => {
              const color = state.labels[l];
              return (
                <span key={l} className={`tag${color ? " colored" : ""}`} style={color ? { background: color } : undefined}>
                  {l.split("/").pop()}
                  <button aria-label="Remove label" onClick={() => ui.removeLabel(m.id, l)}><I.Close /></button>
                </span>
              );
            })}
            <span className="grow" />
            <IconButton className="icon-btn hide-m" tip="Print all" onClick={() => gmail.toast("Print all")}><I.Print /></IconButton>
            <IconButton className="icon-btn hide-m" tip="In new window" onClick={() => gmail.toast("Opened in new window")}><I.NewWindow /></IconButton>
          </div>
          {m.messages.map((x, i) => (
            <Message key={x.id} mail={m} message={x} first={i === 0} expanded={i === m.messages.length - 1 || state.expanded.includes(x.id)} />
          ))}
          {replying ? (
            <ReplyBox mail={m} />
          ) : (
            <div className="reply-actions">
              <button className="pill-btn" onClick={() => ui.startReply(m.id)}><I.Reply />Reply</button>
              {people.size > 2 ? <button className="pill-btn" onClick={() => ui.startReply(m.id)}><I.ReplyAll />Reply all</button> : null}
              <button className="pill-btn" onClick={() => ui.forward(m.id)}><I.Forward />Forward</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Message({ mail: m, message: x, first, expanded }: { mail: GmailMail; message: GmailMessage; first: boolean; expanded: boolean }) {
  const { gmail, renderCustom } = useUI();
  const { ui, me } = gmail;
  const snippet = useSnippet();
  const from = gmail.person(x.from);
  if (!expanded)
    return (
      <div className="msg collapsed" role="button" tabIndex={0} onClick={() => ui.expand(x.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), ui.expand(x.id))}>
        <Avatar id={x.from} />
        <div className="mh">
          <span className="who" style={{ minWidth: 0 }}>
            <b>{from.name}</b>
            <span className="snip" style={{ display: "block" }}>{snippet(x).slice(0, 140)}</span>
          </span>
          <span className="when">{listDate(x.at)}</span>
        </div>
      </div>
    );
  const sig = x.signed ? from.signature : undefined;
  return (
    <div className="msg">
      <Avatar id={x.from} />
      <div style={{ minWidth: 0 }}>
        <div className="mh">
          <span className="who">
            <b>{from.name}</b>
            <span className="em">&lt;{from.email}&gt;</span>
            <span className="to">
              {`to ${x.to.map((t) => (t === me ? "me" : gmail.person(t).name.split(" ")[0])).join(", ")} `}
              <I.ChevronDown style={{ width: 14, height: 14, verticalAlign: -3 }} />
            </span>
          </span>
          <span className="when">{fullDate(x.at)}</span>
          <span className="acts">
            <IconButton tip={m.starred ? "Starred" : "Not starred"} style={{ color: m.starred ? "var(--star)" : undefined }} onClick={() => ui.toggleStar(m.id)}>
              {m.starred ? <I.StarFilled /> : <I.Star />}
            </IconButton>
            <IconButton tip="Add reaction" onClick={() => gmail.toast("Add reaction")}><I.Emoji /></IconButton>
            <IconButton tip="Reply" onClick={() => ui.startReply(m.id)}><I.Reply /></IconButton>
            <IconButton tip="More" onClick={() => gmail.toast("More")}><I.More /></IconButton>
          </span>
        </div>
        <div className="mbody">
          <Body text={x.body} />
          {sig ? (
            <div className="sig">
              --
              {sig.split("\n").map((l, i) => <span key={i}><br />{l}</span>)}
            </div>
          ) : null}
          {m.invite && first ? <Invite mail={m} /> : null}
          {x.custom && renderCustom ? renderCustom(x) : null}
          {x.attachments.length ? (
            <div className="atts">
              <h4>{x.attachments.length} attachment{x.attachments.length > 1 ? "s" : ""}</h4>
              <div className="grid">
                {x.attachments.map((a) => (
                  <button key={a} className="attcard" onClick={() => ui.attachment(m.id, a)}>
                    <span className="sheet">
                      <i className="h" /><i /><i /><i style={{ width: "80%" }} /><i /><i style={{ width: "60%" }} />
                    </span>
                    <span className="name">
                      <FileIcon name={a} />
                      <span>{a}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Invite({ mail: m }: { mail: GmailMail }) {
  const { gmail } = useUI();
  const inv = m.invite!;
  const d = new Date(inv.start);
  const first = m.messages[0];
  const organizer = gmail.person(inv.organizer ?? first.from);
  const guests = inv.guests ?? new Set([first.from, ...first.to]).size;
  return (
    <div className="invite">
      <div className="cal">
        <div className="m">{d.toLocaleDateString([], { month: "short" })}</div>
        <div className="d">{d.getDate()}</div>
      </div>
      <div>
        <h3>{inv.title}</h3>
        <small>{`${d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} · ${timeRange(inv.start, inv.end)}`}</small>
        <small>{`Organizer: ${organizer.name} · ${guests} guests`}</small>
        {inv.meet !== false ? (
          <a className="meet" href="#" onClick={(e) => (e.preventDefault(), gmail.toast("Joining Google Meet…"))}>
            <I.MeetLogo />
            Join with Google Meet
          </a>
        ) : null}
        <div className="rsvp">
          <span>Going?</span>
          {(["yes", "no", "maybe"] as const).map((r) => (
            <button key={r} className={inv.rsvp === r ? "on" : ""} aria-pressed={inv.rsvp === r} onClick={() => gmail.ui.rsvp(m.id, r)}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReplyBox({ mail: m }: { mail: GmailMail }) {
  const { gmail } = useUI();
  const { ui, state } = gmail;
  const text = useRef<HTMLTextAreaElement>(null);
  const to = ui.replyTo(m);
  useEffect(() => text.current?.focus({ preventScroll: true }), []);
  return (
    <div className="reply-box">
      <div className="rb-to">
        <I.Reply />
        <I.ChevronDown style={{ width: 14, height: 14 }} />
        <span className="rchip">
          <Avatar id={to} />
          {gmail.person(to).name}
        </span>
      </div>
      <textarea
        ref={text}
        aria-label="Reply"
        value={state.reply?.text ?? ""}
        onChange={(e) => ui.setReplyText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") ui.sendReply();
        }}
      />
      <div className="send-bar">
        <span className="send">
          <button onClick={ui.sendReply}>Send</button>
          <span className="more"><I.ChevronDown /></span>
        </span>
        <IconButton className="icon-btn sm" tip="Formatting options"><I.Format /></IconButton>
        <IconButton className="icon-btn sm" tip="Attach files"><I.Attach /></IconButton>
        <IconButton className="icon-btn sm" tip="Insert link"><I.Link /></IconButton>
        <IconButton className="icon-btn sm" tip="Insert emoji"><I.Emoji /></IconButton>
        <IconButton className="icon-btn sm hide-m" tip="Insert photo"><I.Image /></IconButton>
        <span className="grow" />
        <IconButton className="icon-btn sm" tip="Discard draft" onClick={ui.cancelReply}><I.Trash /></IconButton>
      </div>
    </div>
  );
}
