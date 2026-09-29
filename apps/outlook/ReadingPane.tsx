import { useEffect, useRef, useState, type ReactNode } from "react";
import { Compose } from "./Compose";
import { Avatar, useUI } from "./context";
import { bodyHtml, bodyText, fmtDay, fmtMD, fmtSize, fmtTime, fullTime, hourLabel, listTime, plural } from "./format";
import * as I from "./icons";
import { openCategoryMenu, openMoveMenu } from "./Header";
import { CategoryChip, useThreadMenu } from "./MessageList";
import type { OutlookAttachment, OutlookConversation, OutlookMessage, RsvpResponse } from "./types";

// The reading pane: the open conversation (its messages, attachments and
// meeting invite), the reply being written under it, a new message, the
// actions for several checked conversations, or "Select an item to read".

export function previewAttachment(ui: ReturnType<typeof useUI>, conversation: string, a: OutlookAttachment) {
  const { outlook } = ui;
  outlook.ui.emit({ type: "attachment", id: conversation, name: a.name, action: "open" });
  outlook.ui.showDialog({
    title: a.name,
    ok: "Download",
    cancel: "Close",
    onOk: () => {
      outlook.toast(`Downloading ${a.name}`);
      outlook.ui.emit({ type: "attachment", id: conversation, name: a.name, action: "download" });
    },
    body: (
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, padding: 16, border: "1px solid var(--stroke)", borderRadius: 8 }}>
        <I.FileIcon name={a.name} style={{ width: 48, height: 48 }} />
        <div>
          <b style={{ display: "block" }}>{a.name}</b>
          <span style={{ color: "var(--text-3)", fontSize: 13 }}>{a.size ? fmtSize(a.size) : ""} · Preview isn't available here</span>
        </div>
      </div>
    ),
  });
}

function Attachments({ c, m }: { c: OutlookConversation; m: OutlookMessage }) {
  const ui = useUI();
  const { outlook, menu } = ui;
  const atts = m.attachments;
  const total = atts.reduce((a, x) => a + x.size, 0);
  const download = (label: string) => {
    outlook.toast(`Downloading ${label}`);
    atts.forEach((a) => outlook.ui.emit({ type: "attachment", id: c.id, name: a.name, action: "download" }));
  };
  return (
    <>
      <div className="atts">
        {atts.map((a, i) => (
          <div key={i} className="attcard" role="button" tabIndex={0} onClick={() => previewAttachment(ui, c.id, a)}>
            <I.FileIcon name={a.name} />
            <span className="t"><b>{a.name}</b><small>{fmtSize(a.size)}</small></span>
            <button
              className="ib"
              aria-label={`More actions for ${a.name}`}
              onClick={(e) => {
                e.stopPropagation();
                menu(e.currentTarget, [
                  { label: "Preview", icon: <I.Eye />, run: () => previewAttachment(ui, c.id, a) },
                  { label: "Download", icon: <I.Download />, run: () => { outlook.toast(`Downloading ${a.name}`); outlook.ui.emit({ type: "attachment", id: c.id, name: a.name, action: "download" }); } },
                  { label: "Save to OneDrive", icon: <I.Folder />, run: () => outlook.toast(`Saved ${a.name} to OneDrive`) },
                ], { align: "right" });
              }}
            >
              <I.ChevD style={{ width: 16, height: 16 }} />
            </button>
          </div>
        ))}
      </div>
      <div className="attsum">
        <span>{`${plural(atts.length, "attachment")} (${fmtSize(total)})`}</span>
        <button className="link" onClick={() => download(atts.length > 1 ? "all attachments as a .zip" : atts[0].name)}>{atts.length > 1 ? "Download all" : "Download"}</button>
        <button className="link" onClick={() => outlook.toast(`Saved ${plural(atts.length, "file")} to OneDrive > Email attachments`)}>Save all to OneDrive</button>
      </div>
    </>
  );
}

const H = 3_600_000;
const hoursOf = (t: number) => new Date(t).getHours() + new Date(t).getMinutes() / 60;

function Invite({ c }: { c: OutlookConversation }) {
  const { outlook } = useUI();
  const inv = c.invite!;
  const { start: s, end: e } = inv;
  // A four-hour window around the meeting, 44px an hour.
  const startH = Math.max(0, Math.min(20, Math.floor(hoursOf(s)) - 2));
  const endH = startH + 4;
  const px = 44;
  const others = inv.busy.filter((b) => new Date(b.start).toDateString() === new Date(s).toDateString() && hoursOf(b.end) > startH && hoursOf(b.start) < endH);
  const conflict = others.find((b) => b.start < e && b.end > s);
  const pos = (a: number, b: number) => ({ top: (Math.max(a, startH) - startH) * px + 1, height: (Math.min(b, endH) - Math.max(a, startH)) * px - 3 });
  const organizer = outlook.person(inv.organizer).name;
  const r = inv.response;
  const labels: Record<RsvpResponse, string> = { accept: "accepted", tentative: "tentatively accepted", decline: "declined" };
  const day = new Date(s);
  day.setHours(0, 0, 0, 0);
  const btn = (resp: RsvpResponse, label: string, cls: string, icon: ReactNode) => (
    <button className={`btn ${cls}${r === resp ? " chosen" : ""}`} aria-pressed={r === resp} onClick={() => outlook.ui.rsvp(c.id, resp)}>
      {icon}
      {label}
    </button>
  );
  return (
    <div className="invite">
      <div className="inv-top">
        <div className="calico"><i>{new Date(s).toLocaleDateString("en-US", { month: "short" })}</i><b>{new Date(s).getDate()}</b></div>
        <div style={{ minWidth: 0 }}>
          <h3>{inv.title}</h3>
          <div className="ln"><I.Clock /><span>{`${fmtDay(s)} ${fmtMD(s)}/${new Date(s).getFullYear()} ${fmtTime(s)} - ${fmtTime(e)}`}</span></div>
          <div className="ln">
            <I.Video />
            <a href="#" onClick={(ev) => { ev.preventDefault(); outlook.toast(`Joining ${inv.title} in ${inv.location}`); }}>{inv.location}</a>
          </div>
          <div className="ln"><I.Person /><span>{`Organizer: ${organizer} · ${plural(inv.attendees, "attendee")}`}</span></div>
        </div>
      </div>
      {r ? (
        <div className={`inv-status ${r === "decline" ? "warn" : "ok"}`}>
          {r === "decline" ? <I.Close /> : <I.Check />}
          <span>{`You ${labels[r]} this meeting. A response was sent to ${organizer}.`}</span>
        </div>
      ) : (
        <div className={`inv-status ${conflict ? "warn" : "ok"}`}>
          {conflict ? <I.Info /> : <I.Check />}
          <span>{`${conflict ? `Conflicts with ${conflict.title}` : "No conflicts"}${!conflict && others.length ? `. Adjacent to ${others[0].title}` : ""}`}</span>
        </div>
      )}
      <div className="rsvp">
        {btn("accept", "Accept", "acc", <I.Check />)}
        {btn("tentative", "Tentative", "ten", <I.Help />)}
        {btn("decline", "Decline", "dec", <I.Close />)}
        <button className="btn subtle" onClick={() => outlook.toast(`Propose new time: pick a slot and ${organizer} will get your proposal.`)}><I.Clock />Propose new time</button>
      </div>
      <div className="dayhead">{new Date(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      <div className="dayview">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="hr" style={{ top: i * px }}>{hourLabel(day.getTime() + (startH + i) * H)}</div>
        ))}
        {others.map((b, i) => (
          <div key={i} className="ev other" style={pos(hoursOf(b.start), hoursOf(b.end))}>{b.title}<small>{hourLabel(b.start)}</small></div>
        ))}
        {r === "decline" ? null : (
          <div className={`ev this${r === "accept" ? "" : " tent"}`} style={pos(hoursOf(s), hoursOf(e))}>{inv.title}<small>{`${fmtTime(s)} - ${fmtTime(e)}`}</small></div>
        )}
      </div>
    </div>
  );
}

function MessageCard({ c, m, last, expanded, expand }: { c: OutlookConversation; m: OutlookMessage; last: boolean; expanded: boolean; expand: () => void }) {
  const ui = useUI();
  const { outlook, renderCustom } = ui;
  const threadMenu = useThreadMenu();
  const [liked, setLiked] = useState(false);
  const p = outlook.person(m.from);
  const names = (ids: string[]) => ids.map((id) => outlook.person(id).name).join("; ");
  const composingHere = outlook.state.compose?.conversation === c.id;

  if (!last && !expanded)
    return (
      <div className="mcard collapsed" role="button" tabIndex={0} aria-label={`Expand message from ${p.name}`} onClick={expand} onKeyDown={(e) => e.key === "Enter" && expand()}>
        <div className="mh">
          <Avatar id={m.from} />
          <div className="who"><div className="nm">{p.name}</div><div className="prev">{bodyText(m).slice(0, 180)}</div></div>
          <span className="when">{listTime(m.at)}</span>
        </div>
      </div>
    );

  return (
    <div className="mcard">
      <div className="mh">
        <Avatar id={m.from} size="s40" />
        <div className="who">
          <div className="nm">{p.name}<span className="em">{`<${p.email}>`}</span></div>
          <div className="rcp">{`To: ${names(m.to)}${m.cc.length ? `; Cc: ${names(m.cc)}` : ""}`}</div>
        </div>
        <div className="side">
          <div className="acts">
            <button className={`ib sm opt${liked ? " liked" : ""}`} data-tip={liked ? "Remove like" : "Like"} aria-label="Like" aria-pressed={liked} onClick={() => setLiked(!liked)}>
              {liked ? <I.LikeF /> : <I.Like />}
            </button>
            <button className="ib sm" data-tip="Reply" aria-label="Reply" onClick={() => outlook.ui.respond("reply", c.id)}><I.Reply /></button>
            <button className="ib sm opt" data-tip="Reply all" aria-label="Reply all" onClick={() => outlook.ui.respond("replyAll", c.id)}><I.ReplyAll /></button>
            <button className="ib sm opt" data-tip="Forward" aria-label="Forward" onClick={() => outlook.ui.respond("forward", c.id)}><I.Forward /></button>
            <button className="ib sm tip-l" data-tip="More actions" aria-label="More actions" onClick={(e) => threadMenu(e.currentTarget, c, "right")}><I.More /></button>
          </div>
          <span className="when">{fullTime(m.at)}</span>
        </div>
      </div>
      {c.importance === "high" && last ? <div className="impbar"><I.Important />This message was sent with High importance.</div> : null}
      {m.attachments.length ? <Attachments c={c} m={m} /> : null}
      {c.invite && c.messages[0].id === m.id ? <Invite c={c} /> : null}
      <div
        className="mbody"
        onClick={(e) => {
          const a = (e.target as HTMLElement).closest("a");
          if (!a) return;
          e.preventDefault();
          outlook.toast(a.dataset.toast ?? `Opening ${a.getAttribute("href") && a.getAttribute("href") !== "#" ? a.getAttribute("href") : a.textContent} in a new tab`);
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: bodyHtml(m) }} />
        {m.custom && renderCustom ? renderCustom(m) : null}
      </div>
      {last && !composingHere && !["drafts", "notes"].includes(c.folder) ? (
        <div className="rfoot">
          <button className="btn" onClick={() => outlook.ui.respond("reply", c.id)}><I.Reply />Reply</button>
          <button className="btn" onClick={() => outlook.ui.respond("replyAll", c.id)}><I.ReplyAll />Reply all</button>
          <button className="btn" onClick={() => outlook.ui.respond("forward", c.id)}><I.Forward />Forward</button>
        </div>
      ) : null}
    </div>
  );
}

function BackBar({ c }: { c?: OutlookConversation }) {
  const { outlook } = useUI();
  const threadMenu = useThreadMenu();
  if (!c)
    return (
      <div className="backbar">
        <button className="ib" aria-label="Back" onClick={() => outlook.ui.closeConversation()}><I.Back /></button>
      </div>
    );
  const ids = [c.id];
  return (
    <div className="backbar">
      <button className="ib" aria-label="Back to message list" onClick={() => outlook.ui.closeConversation()}><I.Back /></button>
      <span className="grow" />
      <button className="ib" aria-label="Archive" onClick={() => outlook.ui.archive(ids)}><I.Archive /></button>
      <button className="ib" aria-label="Delete" onClick={() => outlook.ui.remove(ids)}><I.Trash /></button>
      <button className="ib" aria-label={c.flagged ? "Unflag" : "Flag"} style={c.flagged ? { color: "var(--flag)" } : undefined} onClick={() => outlook.ui.flag(ids)}>
        {c.flagged ? <I.FlagF /> : <I.Flag />}
      </button>
      <button className="ib" aria-label="Mark as unread" onClick={() => outlook.ui.markRead(ids, false)}><I.Mail /></button>
      <button className="ib" aria-label="More actions" onClick={(e) => threadMenu(e.currentTarget, c, "right")}><I.More /></button>
    </div>
  );
}

export function ReadingPane() {
  const ui = useUI();
  const { outlook, targets } = ui;
  const { state } = outlook;
  const threadMenu = useThreadMenu();
  const scroller = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const c = state.open ? state.conversations.find((x) => x.id === state.open) : undefined;
  const compose = state.compose;

  // A newly opened conversation starts at the top.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [state.open]);

  let content;
  if (compose?.kind === "new") {
    content = (
      <div className="rwrap cwrap">
        <BackBar />
        <Compose />
      </div>
    );
  } else if (state.selected.length > 1 || (state.selected.length === 1 && state.selectMode)) {
    content = (
      <div className="multi">
        <I.EmptyArt />
        <div><b style={{ fontSize: 16 }}>{`${plural(state.selected.length, "item")} selected`}</b></div>
        <div className="acts">
          <button className="btn" onClick={() => outlook.ui.remove(targets)}><I.Trash />Delete</button>
          <button className="btn" onClick={() => outlook.ui.archive(targets)}><I.Archive />Archive</button>
          <button className="btn" onClick={(e) => openMoveMenu(ui, e.currentTarget, targets)}><I.MoveTo />Move to</button>
          <button className="btn" onClick={() => outlook.ui.markRead(targets)}><I.Read />Read / Unread</button>
          <button className="btn" onClick={() => outlook.ui.flag(targets)}><I.Flag />Flag</button>
          <button className="btn" onClick={(e) => openCategoryMenu(ui, e.currentTarget, targets)}><I.Tag />Categorize</button>
        </div>
        <button className="link" onClick={() => outlook.ui.setSelection([], false)}>Cancel selection</button>
      </div>
    );
  } else if (!c) {
    content = (
      <div className="reading-empty">
        <I.EmptyArt />
        <b>Select an item to read</b>
        <span className="sub">Nothing is selected</span>
      </div>
    );
  } else {
    content = (
      <div className="rwrap">
        <BackBar c={c} />
        <div className="rhead">
          <div className="grow" style={{ minWidth: 0 }}>
            <h2>{c.subject || "(No subject)"}</h2>
            <div className="cats">{c.categories.map((n) => <CategoryChip key={n} name={n} />)}</div>
          </div>
          <button className="ib tip-l" data-tip="More actions" aria-label="More actions" onClick={(e) => threadMenu(e.currentTarget, c, "right")}><I.More /></button>
        </div>
        <div>
          {c.messages.map((m, i) => (
            <MessageCard
              key={m.id}
              c={c}
              m={m}
              last={i === c.messages.length - 1}
              expanded={expanded.has(m.id)}
              expand={() => setExpanded((s) => new Set(s).add(m.id))}
            />
          ))}
        </div>
        {compose && compose.conversation === c.id ? <Compose /> : null}
      </div>
    );
  }

  return (
    <section className="reading" ref={scroller} aria-label="Reading pane">
      {content}
    </section>
  );
}
