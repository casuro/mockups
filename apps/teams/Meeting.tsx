import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Avatar, Elapsed, useUI } from "./context";
import { plural } from "./format";
import * as I from "./icons";
import type { TeamsMeetingState } from "./types";

// Meetings: the pre-join screen, the meeting window (the gallery, a shared
// screen, raised hands, reactions, the chat and participants panels) and
// the compact window it shrinks to in the corner.

type Audio = "computer" | "phone" | "room" | "none";

export function Prejoin({ id, close }: { id: string; close: () => void }) {
  const { teams } = useUI();
  const [cam, setCam] = useState(false);
  const [mic, setMic] = useState(true);
  const [audio, setAudio] = useState<Audio>("computer");
  const h = teams.state.meetings[id];
  if (!h) return null;
  const me = teams.people[teams.me];
  const option = (value: Audio, icon: ReactNode, title: string, sub?: string) => (
    <button
      className={`pj-opt${audio === value ? " sel" : ""}`}
      aria-pressed={audio === value}
      onClick={() => {
        setAudio(value);
        if (value === "none") setMic(false);
      }}
    >
      {icon}
      <span><b>{title}</b>{sub ? <small>{sub}</small> : null}</span>
    </button>
  );
  return (
    <div className="prejoin" role="dialog" aria-label={`Join ${h.title}`}>
      <div className="pj">
        <h2>{h.title}</h2>
        <p className="sub">{teams.label(id)} · {plural(h.people.length, "person")} in the meeting</p>
        <div className="pj-grid">
          <div className="pj-card">
            <div className="pj-video">
              {cam && me.photo ? <img className="feed" src={me.photo} alt="" /> : <Avatar id={teams.me} className="av big-av" />}
              <span className="cap">{cam ? "Your camera" : "Your camera is off"}</span>
            </div>
            <div className="pj-ctrls">
              <span className="sw">{cam ? <I.Video /> : <I.VideoOff />}<button className={`toggle${cam ? " on" : ""}`} role="switch" aria-checked={cam} aria-label="Camera" onClick={() => setCam(!cam)} /></span>
              <span className="sw">{mic ? <I.Mic /> : <I.MicOff />}<button className={`toggle${mic ? " on" : ""}`} role="switch" aria-checked={mic} aria-label="Microphone" onClick={() => setMic(!mic)} /></span>
              <button className="bg" onClick={() => teams.toast("Background filters")}><I.Blur />Background filters</button>
            </div>
          </div>
          <div className="pj-card pj-audio">
            {option("computer", <I.Speaker />, "Computer audio", "MacBook Pro Microphone")}
            {option("phone", <I.PhoneAudio />, "Phone audio")}
            {option("room", <I.Room />, "Room audio")}
            {option("none", <I.NoAudio />, "Don't use audio")}
          </div>
        </div>
        <div className="pj-foot">
          <button className="btn-secondary" onClick={close}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => {
              close();
              teams.ui.joinMeeting(id, { video: cam, muted: !mic || audio === "none" });
            }}
          >
            Join now
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reactions floating up over the stage (or the compact window), as they are sent. */
function Floats() {
  const { teams } = useUI();
  const [items, setItems] = useState<{ n: number; emoji: string; who: string; left: number }[]>([]);
  const last = useRef(teams.reaction?.n ?? 0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const r = teams.reaction;
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (!r || r.n === last.current) return;
    last.current = r.n;
    const who = r.from === teams.me ? "You" : (teams.people[r.from]?.name.split(" ")[0] ?? r.from);
    setItems((list) => [...list, { n: r.n, emoji: r.emoji, who, left: 12 + Math.random() * 70 }]);
    const t = setTimeout(() => {
      timers.current.delete(t);
      setItems((list) => list.filter((x) => x.n !== r.n));
    }, 3100);
    timers.current.add(t);
  }, [r, teams.me, teams.people]);
  return (
    <>
      {items.map((x) => (
        <div key={x.n} className="float-r" style={{ left: `${x.left}%` }}>
          <span className="e">{x.emoji}</span>
          <span className="n">{x.who}</span>
        </div>
      ))}
    </>
  );
}

function Tile({ h, id, ringing = false }: { h: TeamsMeetingState; id: string; ringing?: boolean }) {
  const { teams } = useUI();
  const p = teams.people[id];
  const video = !ringing && h.video.includes(id) && p?.photo;
  return (
    <div className={`tile${ringing ? " ringing" : ""}${teams.speaking.includes(id) ? " speaking" : ""}`}>
      {video ? <img className="feed" src={p.photo} alt="" style={id === teams.me ? { scale: "-1 1" } : undefined} /> : <Avatar id={id} className="av big-av" />}
      {ringing ? <span className="status">Calling...</span> : null}
      {h.hands.includes(id) ? <span className="hand">✋</span> : null}
      <span className="label">
        {h.muted.includes(id) && !ringing ? <I.MicOff /> : null}
        {id === teams.me ? "You" : (p?.name ?? id)}
      </span>
    </div>
  );
}

function Screen({ h }: { h: TeamsMeetingState }) {
  const { teams, renderScreen } = useUI();
  const sharing = h.sharing!;
  if (sharing.by === teams.me)
    return (
      <div className="myshare">
        <div className="bigic"><I.Share /></div>
        <b>You&apos;re presenting</b>
        <small>Everyone in the meeting can see your screen</small>
      </div>
    );
  const by = teams.people[sharing.by];
  const frame = (label: string, body: ReactNode, selected = false) => (
    <div className={`frame${selected ? " sel" : ""}`}>
      <span className="flabel">{label}</span>
      {body}
      <div className="fbtn" />
    </div>
  );
  const toggle = <div className="tog"><i /><div className="l" /></div>;
  return (
    <>
      {renderScreen ? (
        renderScreen(h)
      ) : (
        <div className="screen">
          <div className="scr-bar"><span className="dots"><i /><i /><i /></span><span>{sharing.title}</span></div>
          <div className="scr-canvas">
            {frame("1 · Welcome", <><div className="ill" /><div className="l h" /><div className="l" /><div className="l s" /></>)}
            {frame("2 · Your team", <><div className="ill b" /><div className="l h" /><div className="l" /><div className="l" /><div className="l s" /></>)}
            {frame("3 · Permissions", <><div className="ill c" /><div className="l h" />{toggle}{toggle}{toggle}{toggle}</>, true)}
            <div className="cursor">
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 2l12 7.5-5.2 1.3L8.4 16z" fill={by?.color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></svg>
              <span style={{ background: by?.color }}>{by?.name.split(" ")[0]}</span>
            </div>
          </div>
        </div>
      )}
      <div className="label" style={{ left: 10, bottom: 10 }}><I.Share style={{ color: "#fff" }} />{by?.name ?? sharing.by} is presenting</div>
    </>
  );
}

function MeetingButton({ label, onClick, on, off, opt, children }: { label: string; onClick: (e: MouseEvent<HTMLButtonElement>) => void; on?: boolean; off?: boolean; opt?: boolean; children: ReactNode }) {
  return (
    <button className={`mb${on ? " on" : ""}${off ? " off" : ""}${opt ? " opt" : ""}`} title={label} aria-label={label} onClick={onClick}>
      {children}
      <span className="lbl">{label}</span>
    </button>
  );
}

export function MeetingWindow() {
  const { teams, panel, setPanel, setCallView, root, reactPop, setReactPop } = useUI();
  const id = teams.state.inCall;
  const h = id ? teams.state.meetings[id] : null;
  if (!h) return null;
  const me = teams.me;
  const n = h.people.length + h.ringing.length;
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const muted = h.muted.includes(me);
  const cam = h.video.includes(me);
  const hand = h.hands.includes(me);
  const presenting = h.sharing?.by === me;
  const toggle = (p: "chat" | "people") => setPanel(panel === p ? null : p);
  return (
    <div className="mtg" role="dialog" aria-label={h.title}>
      <div className="mtg-top">
        <div className="ttl">
          <span className="timer"><Elapsed from={h.startedAt} /></span>
          <span className="shield"><I.Shield /></span>
          <b>{h.title}</b>
        </div>
        <div className="tbar">
          <MeetingButton label="Chat" on={panel === "chat"} onClick={() => toggle("chat")}><I.Chat /></MeetingButton>
          <MeetingButton label="People" on={panel === "people"} onClick={() => toggle("people")}><I.People /></MeetingButton>
          <MeetingButton label={hand ? "Lower" : "Raise"} on={hand} onClick={() => teams.ui.meetingControl("hand")}><I.Hand /></MeetingButton>
          <span data-react-button style={{ display: "contents" }}>
            <MeetingButton
              label="React"
              onClick={(e) => {
                if (reactPop) return setReactPop(null);
                const box = root.current!.getBoundingClientRect();
                const r = e.currentTarget.getBoundingClientRect();
                setReactPop({ left: r.left - box.left + r.width / 2, top: r.bottom - box.top + 6 });
              }}
            >
              <I.Smile />
            </MeetingButton>
          </span>
          <MeetingButton label="View" opt onClick={() => teams.toast("Gallery · Speaker · Together mode")}><I.View /></MeetingButton>
          <MeetingButton label="More" opt onClick={() => teams.toast("Record, transcribe, live captions and more")}><I.More /></MeetingButton>
          <span className="sep" />
          <MeetingButton label="Camera" off={!cam} onClick={() => teams.ui.meetingControl("cam")}>{cam ? <I.Video /> : <I.VideoOff />}</MeetingButton>
          <MeetingButton label="Mic" off={muted} onClick={() => teams.ui.meetingControl("mic")}>{muted ? <I.MicOff /> : <I.Mic />}</MeetingButton>
          <MeetingButton label={presenting ? "Stop" : "Share"} on={presenting} onClick={() => teams.ui.meetingControl("share")}><I.Share /></MeetingButton>
          <MeetingButton label="Minimize" opt onClick={() => setCallView("mini")}><I.Minimize /></MeetingButton>
          <button className="leave" onClick={() => teams.ui.leaveMeeting()}><I.Leave /><span className="lbl">Leave</span></button>
        </div>
      </div>
      <div className={`mtg-body${panel ? " panel-open" : ""}`}>
        <div className={`stage${h.sharing ? " sharing" : ""}`}>
          {presenting ? (
            <div className="sharebar">You&apos;re presenting<button onClick={() => teams.ui.meetingControl("share")}>Stop presenting</button></div>
          ) : null}
          {h.sharing ? <div className="tile share"><Screen h={h} /></div> : null}
          <div className="gallery" style={{ ["--cols" as string]: cols, ["--rows" as string]: Math.max(n, 3) }}>
            {h.people.map((p) => <Tile key={p} h={h} id={p} />)}
            {h.ringing.map((p) => <Tile key={p} h={h} id={p} ringing />)}
          </div>
          <Floats />
        </div>
        {panel === "chat" ? <ChatPanel h={h} /> : panel === "people" ? <PeoplePanel h={h} /> : null}
      </div>
    </div>
  );
}

function ChatPanel({ h }: { h: TeamsMeetingState }) {
  const { teams, setPanel } = useUI();
  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [h.chat.length]);
  return (
    <aside className="mtg-panel" aria-label="Meeting chat">
      <div className="mp-head">Meeting chat<span className="grow" /><button className="x" aria-label="Close" onClick={() => setPanel(null)}><I.Close /></button></div>
      <div className="mp-scroll" ref={scroll}>
        {h.chat.length ? (
          h.chat.map((m, i) => (
            <div key={i} className={`mc-msg${m.from === teams.me ? " mine" : ""}`}>
              <div className="h">{m.from === teams.me ? null : <b>{teams.people[m.from]?.name ?? m.from}</b>}</div>
              <div className="t">{m.text}</div>
            </div>
          ))
        ) : (
          <p className="mp-empty">Messages sent here are shared with everyone in the meeting.</p>
        )}
      </div>
      <div className="mp-comp">
        <input
          placeholder="Type a message"
          aria-label="Type a meeting message"
          autoComplete="off"
          autoFocus
          onKeyDown={(e) => {
            const text = e.currentTarget.value.trim();
            if (e.key !== "Enter" || !text) return;
            teams.ui.meetingChat(text);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </aside>
  );
}

function PeoplePanel({ h }: { h: TeamsMeetingState }) {
  const { teams, setPanel } = useUI();
  const row = (p: string) => (
    <div key={p} className="mp-person">
      <Avatar id={p} />
      <span className="n">
        {teams.people[p]?.name ?? p}{p === teams.me ? " (You)" : ""}
        <small>{p === h.organizer ? "Organizer" : teams.people[p]?.title}</small>
      </span>
      <span className="ic">
        {h.hands.includes(p) ? "✋" : null}
        {h.video.includes(p) ? <I.Video /> : null}
        {h.muted.includes(p) ? <span className="muted"><I.MicOff /></span> : <I.Mic />}
      </span>
    </div>
  );
  const hands = h.people.filter((p) => h.hands.includes(p));
  return (
    <aside className="mtg-panel" aria-label="Participants">
      <div className="mp-head">Participants<span className="grow" /><button className="x" aria-label="Close" onClick={() => setPanel(null)}><I.Close /></button></div>
      <div className="mp-scroll">
        {hands.length ? <><div className="mp-sec">Raised hands ({hands.length})</div>{hands.map(row)}</> : null}
        <div className="mp-sec">In this meeting ({h.people.length})</div>
        {h.people.map(row)}
        {h.ringing.length ? (
          <>
            <div className="mp-sec">Calling ({h.ringing.length})</div>
            {h.ringing.map((p) => (
              <div key={p} className="mp-person"><Avatar id={p} /><span className="n">{teams.people[p]?.name ?? p}<small>Ringing...</small></span></div>
            ))}
          </>
        ) : null}
      </div>
    </aside>
  );
}

export function ReactPop({ left, top }: { left: number; top: number }) {
  const { teams, root, setReactPop } = useUI();
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const pop = el.current;
    const width = root.current?.clientWidth ?? 0;
    if (pop) pop.style.left = `${Math.max(8, Math.min(left - pop.offsetWidth / 2, width - pop.offsetWidth - 8))}px`;
  }, [left, root]);
  const id = teams.state.inCall;
  const raised = !!id && !!teams.state.meetings[id]?.hands.includes(teams.me);
  return (
    <div className="react-pop" ref={el} style={{ top, zIndex: 50 }}>
      {["👍", "❤️", "👏", "😆", "😮"].map((e) => (
        <button key={e} aria-label={`Send ${e}`} onClick={() => { teams.ui.sendReaction(e); setReactPop(null); }}>{e}</button>
      ))}
      <span className="sep" />
      <button className="raise" onClick={() => { teams.ui.meetingControl("hand"); setReactPop(null); }}><span>✋</span>{raised ? "Lower" : "Raise"}</button>
    </div>
  );
}

export function MiniWindow() {
  const { teams, setCallView } = useUI();
  const id = teams.state.inCall;
  const h = id ? teams.state.meetings[id] : null;
  if (!h) return null;
  const me = teams.me;
  const focus =
    h.sharing && h.sharing.by !== me ? h.sharing.by : (teams.speaking.find((p) => p !== me && h.people.includes(p)) ?? h.people.find((p) => p !== me) ?? me);
  const cam = h.video.includes(me);
  const muted = h.muted.includes(me);
  return (
    <div className="mini" role="dialog" aria-label={`${h.title}, minimized`}>
      <Tile h={h} id={focus} />
      <Floats />
      <div className="mini-bar">
        <span className="info"><b>{h.title}</b><span><Elapsed from={h.startedAt} /></span></span>
        <button className={`mb${cam ? "" : " off"}`} title="Camera" aria-label="Camera" onClick={() => teams.ui.meetingControl("cam")}>{cam ? <I.Video /> : <I.VideoOff />}</button>
        <button className={`mb${muted ? " off" : ""}`} title="Mic" aria-label="Mic" onClick={() => teams.ui.meetingControl("mic")}>{muted ? <I.MicOff /> : <I.Mic />}</button>
        <button className="mb" title="Return to meeting" aria-label="Return to meeting" onClick={() => setCallView("full")}><I.Expand /></button>
        <button className="leave" title="Leave" aria-label="Leave" onClick={() => teams.ui.leaveMeeting()}><I.Leave /></button>
      </div>
    </div>
  );
}
