import { useState, type ReactNode } from "react";
import { FileCard, HoverBar, Reactions, useFresh } from "./Chat";
import { BackButton, Composer, MeetButton, ScrollToEnd, Tabs } from "./Composer";
import { Avatar, Elapsed, useUI } from "./context";
import { clockTime, dayLabel, dayStart, plural, Text } from "./format";
import * as I from "./icons";
import type { TeamsMessage } from "./types";

// A team's channel: its header with Meet, the posts as cards with their
// replies (the last two showing, the rest behind a toggle) and a Reply box,
// the card of a meeting started there, and the composer for a new post.

export function ChannelView({ id }: { id: string }) {
  const { teams } = useUI();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [replying, setReplying] = useState<string | null>(null);
  const found = teams.channelOf(id);
  const conv = teams.state.conversations[id];
  if (!found || !conv) return null;
  const { team, channel } = found;
  const last = conv.messages.at(-1);
  const replies = conv.messages.reduce((n, m) => n + m.replies.length, 0);

  const out: ReactNode[] = [];
  let day = -1;
  for (const m of conv.messages) {
    if (dayStart(m.at) !== day) {
      day = dayStart(m.at);
      out.push(<div key={`d${m.id}`} className="day">{dayLabel(m.at)}</div>);
    }
    if (m.id === conv.newFrom) out.push(<div key="new" className="day new">New</div>);
    out.push(
      m.call ? (
        <MeetCard key={m.id} message={m} />
      ) : (
        <Post
          key={m.id}
          post={m}
          expanded={expanded.includes(m.id)}
          expand={() => setExpanded([...expanded, m.id])}
          replying={replying === m.id}
          setReplying={(on) => setReplying(on ? m.id : null)}
        />
      )
    );
  }

  return (
    <>
      <div className="c-head">
        <BackButton />
        <div className="c-title">
          <span className="team-av" style={{ background: team.color, width: 32, height: 32 }}>{team.initials}</span>
          <span style={{ minWidth: 0 }}>
            <b style={{ display: "block" }}>{channel.name}</b>
            <small>{team.name}</small>
          </span>
        </div>
        <Tabs names={["Posts", "Files"]} />
        <span className="grow" />
        <MeetButton id={id} />
        {teams.state.meetings[id] ? null : (
          <span className="split">
            <button className="hbtn" onClick={() => teams.ui.startMeeting({ team: team.id, channel: channel.id })}>
              <I.Video />
              <span className="lbl">Meet</span>
            </button>
            <button className="hbtn" aria-label="Schedule a meeting" onClick={() => teams.toast("Schedule a meeting")}><I.Chev /></button>
          </span>
        )}
        <button className="people-btn" aria-label={`${team.members.length} members`} onClick={() => teams.toast(`${team.members.length} members`)}>
          <I.People />
          {team.members.length}
        </button>
        <button className="hbtn icon" aria-label="Channel info" onClick={() => teams.toast("Channel info")}><I.Info /></button>
      </div>
      <ScrollToEnd watch={`${conv.messages.length}:${replies}:${last?.id}:${last?.call?.kind}:${teams.typing?.key ?? ""}`} label={`Posts in ${channel.name}`}>
        <div className="conv">{out}</div>
      </ScrollToEnd>
      <Composer post />
    </>
  );
}

function Post({ post: p, expanded, expand, replying, setReplying }: { post: TeamsMessage; expanded: boolean; expand: () => void; replying: boolean; setReplying: (on: boolean) => void }) {
  const { teams, fmt, renderCustom } = useUI();
  const fresh = useFresh(p.id);
  const shown = expanded ? p.replies : p.replies.slice(-2);
  const hidden = p.replies.slice(0, p.replies.length - shown.length);
  const name = (id: string) => teams.people[id]?.name ?? id;
  return (
    <div className={`post${p.mentioned ? " mentioned" : ""}${fresh ? " fresh" : ""}`} data-id={p.id}>
      <div className="post-main">
        <Avatar id={p.from} />
        <div className="m-col">
          <div className="m-meta"><b className="who">{name(p.from)}</b><span>{clockTime(p.at)}</span></div>
          {p.subject ? <h3>{p.subject}</h3> : null}
          {p.text ? <div className="body"><Text text={p.text} ctx={fmt} /></div> : null}
          <FileCard file={p.file} />
          {p.custom && renderCustom ? renderCustom(p) : null}
          <Reactions message={p} />
        </div>
        <HoverBar id={p.id} />
      </div>
      {p.replies.length ? (
        <div className="replies">
          {hidden.length ? (
            <button className="rep-toggle" onClick={expand}>
              <I.Chev />
              {plural(hidden.length, "more reply").replace("replys", "replies")} from {[...new Set(hidden.map((r) => name(r.from).split(" ")[0]))].join(", ")}
            </button>
          ) : null}
          {shown.map((r) => <Reply key={r.id} reply={r} />)}
        </div>
      ) : null}
      <div className="rep-box">
        {replying ? (
          <input
            placeholder="Reply"
            aria-label="Reply"
            autoComplete="off"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setReplying(false);
              }
              const text = e.currentTarget.value.trim();
              if (e.key !== "Enter" || !text) return;
              teams.ui.reply(p.id, text);
              expand();
              setReplying(false);
            }}
          />
        ) : (
          <button className="reply-link" onClick={() => setReplying(true)}><I.Reply />Reply</button>
        )}
      </div>
    </div>
  );
}

function Reply({ reply: r }: { reply: TeamsMessage }) {
  const { teams, fmt } = useUI();
  const fresh = useFresh(r.id);
  return (
    <div className={`rep${fresh ? " fresh" : ""}`} data-id={r.id}>
      <Avatar id={r.from} />
      <div className="m-col" style={{ maxWidth: "none" }}>
        <div className="m-meta"><b className="who">{teams.people[r.from]?.name ?? r.from}</b><span>{clockTime(r.at)}</span></div>
        <div><Text text={r.text} ctx={fmt} /></div>
        <Reactions message={r} />
      </div>
    </div>
  );
}

function MeetCard({ message: m }: { message: TeamsMessage }) {
  const { teams, openPrejoin, setCallView } = useUI();
  const call = m.call!;
  const h = call.kind === "live" && call.meeting ? teams.state.meetings[call.meeting] : null;
  if (!h)
    return (
      <div className="meet-card ended">
        <div className="strip"><I.Video />Meeting ended</div>
        <div className="inner"><div className="info"><b>{call.title ?? "Meeting"}</b><small>Lasted {call.duration}</small></div></div>
      </div>
    );
  const joined = teams.state.inCall === h.id;
  return (
    <div className="meet-card">
      <div className="strip"><I.Video />Meeting started</div>
      <div className="inner">
        <div className="info">
          <b>{h.title}</b>
          <small><Elapsed from={h.startedAt} /> · {plural(h.people.length, "person")}</small>
        </div>
        <span className="stack">{h.people.slice(0, 5).map((p) => <Avatar key={p} id={p} />)}</span>
        {joined ? (
          <button className="btn-secondary" onClick={() => setCallView("full")}>Return to meeting</button>
        ) : (
          <button className="btn-primary" onClick={() => openPrejoin(h.id)}><I.Video />Join</button>
        )}
      </div>
    </div>
  );
}
