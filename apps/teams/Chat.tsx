import { useEffect, type ReactNode } from "react";
import { BackButton, Composer, MeetButton, ScrollToEnd, Tabs } from "./Composer";
import { Avatar, AvatarPresence, useUI } from "./context";
import { clockTime, dayLabel, dayStart, Text } from "./format";
import * as I from "./icons";
import type { TeamsFile, TeamsMessage } from "./types";

// A chat: its header with the call buttons, the messages as bubbles (yours
// on the right), call lines, and the composer. Also the pieces channel
// posts share: the hover bar of quick reactions, reactions, a file.

const QUICK = ["👍", "❤️", "😆", "😮", "😢"];

export function HoverBar({ id }: { id: string }) {
  const { openPicker, react } = useUI();
  return (
    <div className="hoverbar">
      {QUICK.map((e) => (
        <button key={e} title="React" aria-label={`React with ${e}`} onClick={() => react(id, e)}>{e}</button>
      ))}
      <button title="More reactions" aria-label="More reactions" onClick={(e) => openPicker(e.currentTarget, { kind: "message", id })}><I.Emoji /></button>
    </div>
  );
}

export function Reactions({ message: m }: { message: TeamsMessage }) {
  const { popped, react } = useUI();
  if (!m.reactions.length) return null;
  return (
    <div className="reacts">
      {m.reactions.map((r) => (
        <button
          key={r.emoji}
          className={`react${r.mine ? " mine" : ""}${popped === `${m.id}:${r.emoji}` ? " pop" : ""}`}
          aria-label={`${r.emoji} ${r.count}`}
          aria-pressed={!!r.mine}
          onClick={() => react(m.id, r.emoji)}
        >
          <span className="e">{r.emoji}</span>
          {r.count}
        </button>
      ))}
    </div>
  );
}

export function FileCard({ file }: { file?: TeamsFile }) {
  const { teams } = useUI();
  if (!file) return null;
  return (
    <div className="attach" role="button" tabIndex={0} onClick={() => teams.ui.emit({ type: "action", kind: "file", label: file.name })}>
      <span className="fi" style={{ background: file.color ?? "#5b5fc7" }}>{file.ext ?? "FILE"}</span>
      <span><b>{file.name}</b><small>{file.meta}</small></span>
    </div>
  );
}

/** Slides in the first time it is drawn, not when the list is drawn again. */
export function useFresh(id: string) {
  const { seen } = useUI();
  const fresh = !seen.has(id);
  useEffect(() => void seen.add(id), [seen, id]);
  return fresh;
}

export function ChatView({ id }: { id: string }) {
  const { teams } = useUI();
  const chat = teams.chatOf(id);
  const conv = teams.state.conversations[id];
  if (!chat || !conv) return null;
  const other = chat.kind === "dm" && chat.with ? teams.people[chat.with] : null;
  const last = conv.messages.at(-1);
  return (
    <>
      <div className="c-head">
        <BackButton />
        <div className="c-title">
          {other ? (
            <>
              <AvatarPresence id={other.id} />
              <span style={{ minWidth: 0 }}>
                <b style={{ display: "block" }}>{other.name}</b>
                <small>{other.note}</small>
              </span>
            </>
          ) : (
            <>
              <span className="group-av"><Avatar id={chat.others[0]} /><Avatar id={chat.others[1] ?? chat.others[0]} /></span>
              <b>{chat.name}</b>
            </>
          )}
        </div>
        <Tabs names={["Chat", "Shared"]} />
        <span className="grow" />
        <MeetButton id={id} />
        {teams.state.meetings[id] ? null : (
          <span className="split">
            <button className="hbtn" title="Video call" aria-label="Video call" onClick={() => teams.ui.startMeeting({ chat: chat.id }, { video: true })}><I.Video /></button>
            <button className="hbtn" title="Audio call" aria-label="Audio call" onClick={() => teams.ui.startMeeting({ chat: chat.id })}><I.Calls /></button>
          </span>
        )}
        {chat.kind === "group" ? (
          <button className="people-btn" aria-label={`${chat.others.length + 1} participants`} onClick={() => teams.toast(`${chat.others.length + 1} participants`)}>
            <I.People />
            {chat.others.length + 1}
          </button>
        ) : null}
      </div>
      <ScrollToEnd watch={`${conv.messages.length}:${last?.id}:${last?.call?.kind}:${teams.typing?.key ?? ""}`} label={`Messages with ${chat.name}`}>
        <div className="conv">
          <ChatMessages messages={conv.messages} />
        </div>
      </ScrollToEnd>
      <Composer />
    </>
  );
}

function ChatMessages({ messages }: { messages: TeamsMessage[] }) {
  const { teams } = useUI();
  const lastMine = messages.filter((m) => m.from === teams.me && !m.call).at(-1)?.id;
  const out: ReactNode[] = [];
  let prev: TeamsMessage | null = null;
  let day = -1;
  for (const m of messages) {
    if (dayStart(m.at) !== day) {
      day = dayStart(m.at);
      out.push(<div key={`d${m.id}`} className="day">{dayLabel(m.at)}</div>);
      prev = null;
    }
    if (m.call) {
      out.push(<CallLine key={m.id} message={m} />);
      prev = null;
      continue;
    }
    out.push(<Bubble key={m.id} message={m} cont={prev?.from === m.from} seen={m.id === lastMine} />);
    prev = m;
  }
  return <>{out}</>;
}

function CallLine({ message: m }: { message: TeamsMessage }) {
  const { teams } = useUI();
  const call = m.call!;
  const time = clockTime(m.at);
  if (call.kind === "missed")
    return <div className="sys missed"><span><I.Missed />Missed call from {teams.people[m.from]?.name ?? m.from} · {time}</span></div>;
  if (call.kind === "noanswer") return <div className="sys missed"><span><I.Missed />No answer · {time}</span></div>;
  if (call.kind === "live") return <div className="sys"><span><I.Calls />Call started {time}</span></div>;
  return <div className="sys"><span><I.Calls />Call ended {call.duration} · {time}</span></div>;
}

function Bubble({ message: m, cont, seen }: { message: TeamsMessage; cont: boolean; seen: boolean }) {
  const { teams, fmt, renderCustom } = useUI();
  const fresh = useFresh(m.id);
  const mine = m.from === teams.me;
  return (
    <div className={`m${mine ? " mine" : ""}${cont ? " cont" : ""}${m.mentioned ? " mentioned" : ""}${fresh ? " fresh" : ""}`} data-id={m.id}>
      {mine ? null : cont ? <span className="gut" /> : <Avatar id={m.from} />}
      <div className="m-col">
        {cont ? null : (
          <div className="m-meta">
            {mine ? null : <b>{teams.people[m.from]?.name ?? m.from}</b>}
            <span>{clockTime(m.at)}</span>
          </div>
        )}
        <div className="bubble">
          <HoverBar id={m.id} />
          {m.text ? <Text text={m.text} ctx={fmt} /> : null}
          <FileCard file={m.file} />
          {m.custom && renderCustom ? renderCustom(m) : null}
        </div>
        <Reactions message={m} />
        {mine && seen ? <div className="seen"><I.Eye />Seen</div> : null}
      </div>
    </div>
  );
}
