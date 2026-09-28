import { useEffect, useState, type ReactNode } from "react";
import { Avatar, useUI } from "./context";
import { clock, clockTime } from "./format";
import * as I from "./icons";
import type { SlackHuddleState, SlackMessage } from "./types";
import { minutes, whereOf } from "./use-slack";

// Huddles: the card announcing one in a conversation, the pill in the
// header, the mini dock while you are in one, and the full window.

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word === "person" ? "people" : `${word}s`}`;

/** A clock that ticks every second: "4:05" since `from`, or "5 minutes" in words. */
function Elapsed({ from, words = false }: { from: number; words?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{words ? minutes(now - from) : clock(now - from)}</>;
}

export function HuddleCard({ message: m }: { message: SlackMessage }) {
  const { slack, seen, setHuddleWindow } = useUI();
  const key = m.huddle!;
  const h = slack.state.huddles[key];
  const live = !!h && h.messageId === m.id;
  const joined = live && slack.state.inHuddle === key;
  const fresh = !seen.has(m.id);
  useEffect(() => void seen.add(m.id), [seen, m.id]);
  const who = slack.people[m.from];
  return (
    <div className={`msg${fresh ? " new-msg" : ""}`} data-id={m.id}>
      <Avatar id={m.from} />
      <div>
        <div className="meta">
          <span className="name">{who?.name ?? m.from}</span>
          <span className="time">{clockTime(m.at)}</span>
        </div>
        <div className={`huddle-card${live ? " live" : ""}`}>
          <div className="hc-ic"><I.Headphones /></div>
          <div className="hc-body">
            <b>{live ? (m.from === slack.me ? "You started a huddle" : "A huddle is happening") : "The huddle ended"}</b>
            <small>
              {live ? (
                <>{plural(h.people.length, "person")} · started <span><Elapsed from={h.startedAt} words /></span> ago</>
              ) : (
                `Lasted ${m.ended ?? "a few minutes"}`
              )}
            </small>
          </div>
          {live ? (
            <>
              <span className="stack">{h.people.slice(0, 4).map((p) => <Avatar key={p} id={p} />)}</span>
              {joined ? (
                <button className="hc-join joined" onClick={() => setHuddleWindow(true)}>Open</button>
              ) : (
                <button className="hc-join" onClick={() => slack.ui.joinHuddle(key)}>Join</button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function HuddleSlot() {
  const { slack, setHuddleWindow } = useUI();
  const key = slack.state.current;
  const h = slack.state.huddles[key];
  if (h && slack.state.inHuddle === key)
    return (
      <button className="huddle-pill in" title="Open huddle" aria-label="Open huddle" onClick={() => setHuddleWindow(true)}>
        <I.Headphones />
        <span><Elapsed from={h.startedAt} /></span>
      </button>
    );
  if (h)
    return (
      <button className="huddle-pill live" title="Join huddle" onClick={() => slack.ui.joinHuddle(key)}>
        <I.Headphones />
        <span className="stack">{h.people.slice(0, 3).map((p) => <Avatar key={p} id={p} />)}</span>
        Join
      </button>
    );
  return (
    <button className="huddle-pill" title="Start a huddle" aria-label="Start a huddle" onClick={() => slack.ui.joinHuddle(key)}>
      <I.Headphones />
    </button>
  );
}

function Controls({ h, cls }: { h: SlackHuddleState; cls: string }) {
  const { slack, openPicker } = useUI();
  const me = slack.me;
  const muted = h.muted.includes(me);
  const video = h.video.includes(me);
  const sharing = h.sharing?.by === me;
  return (
    <>
      <button className={`${cls}${muted ? " off" : ""}`} title={`${muted ? "Unmute" : "Mute"} (⌘⇧Space)`} aria-label={muted ? "Unmute" : "Mute"} onClick={() => slack.ui.huddleControl("mic")}>
        {muted ? <I.MicOff /> : <I.Mic />}
      </button>
      <button className={`${cls}${video ? " on" : ""}`} title={`Turn video ${video ? "off" : "on"}`} aria-label={`Turn video ${video ? "off" : "on"}`} onClick={() => slack.ui.huddleControl("cam")}>
        {video ? <I.Cam /> : <I.CamOff />}
      </button>
      <button className={`${cls}${sharing ? " on" : ""}`} title={sharing ? "Stop sharing" : "Share screen"} aria-label={sharing ? "Stop sharing" : "Share screen"} onClick={() => slack.ui.huddleControl("share")}>
        <I.Screen />
      </button>
      <button className={cls} title="Send a reaction" aria-label="Send a reaction" onClick={(e) => openPicker(e.currentTarget, { kind: "huddle" })}>
        <I.Smile />
      </button>
    </>
  );
}

export function Dock() {
  const { slack, setHuddleWindow } = useUI();
  const key = slack.state.inHuddle;
  const h = key ? slack.state.huddles[key] : null;
  if (!key || !h) return null;
  return (
    <div className="dock" data-huddle-host="dock">
      <div className="hd-top">
        <span className="hd-live"><I.Headphones /></span>
        <button className="hd-name" onClick={() => slack.open(whereOf(key))}>{slack.label(key)}</button>
        <span className="hd-timer"><Elapsed from={h.startedAt} /></span>
        <button className="icon-btn" title="Open huddle window" aria-label="Open huddle window" onClick={() => setHuddleWindow(true)}><I.Expand /></button>
      </div>
      <div className="hd-people">
        {h.people.map((p) => (
          <span key={p} className={`hd-p${slack.speaking.includes(p) ? " speaking" : ""}`} title={p === slack.me ? "You" : slack.people[p]?.name}>
            <Avatar id={p} />
            {h.muted.includes(p) ? <i className="mute-dot"><I.MicOff /></i> : null}
          </span>
        ))}
      </div>
      {h.sharing ? (
        <button className="hd-share" onClick={() => setHuddleWindow(true)}>
          <I.Screen />
          {h.sharing.by === slack.me ? "You are" : `${slack.people[h.sharing.by]?.name.split(" ")[0]} is`} sharing a screen
        </button>
      ) : null}
      <div className="hd-ctrls">
        <Controls h={h} cls="hc" />
        <span className="grow" />
        <button className="hc-leave" onClick={() => slack.ui.leaveHuddle()}>Leave</button>
      </div>
    </div>
  );
}

function SharedScreen({ h }: { h: SlackHuddleState }) {
  const { slack } = useUI();
  const sharing = h.sharing!;
  if (sharing.by === slack.me)
    return (
      <div className="myshare">
        <div className="big"><I.Screen /></div>
        <b>You&apos;re sharing your screen</b>
        <small>Everyone in the huddle can see it</small>
        <button onClick={() => slack.ui.huddleControl("share")}>Stop sharing</button>
      </div>
    );
  const by = slack.people[sharing.by];
  const frame = (label: string, body: ReactNode, selected = false) => (
    <div className={`frame${selected ? " sel" : ""}`}>
      <span className="label">{label}</span>
      {body}
      <div className="btn" />
    </div>
  );
  return (
    <>
      <div className="screen">
        <div className="scr-bar"><span className="dots"><i /><i /><i /></span><span>{sharing.title}</span></div>
        <div className="scr-canvas">
          {frame("1 · Welcome", <><div className="ill" /><div className="l h" /><div className="l" /><div className="l s" /></>)}
          {frame("2 · Your team", <><div className="ill b" /><div className="l h" /><div className="l" /><div className="l" /><div className="l s" /></>)}
          {frame("3 · Permissions", <><div className="ill c" /><div className="l h" /><div className="tog"><i /><div className="l" /></div><div className="tog"><i /><div className="l" /></div><div className="tog"><i /><div className="l" /></div><div className="tog"><i /><div className="l s" /></div></>, true)}
          <div className="cursor">
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 2l12 7.5-5.2 1.3L8.4 16z" fill={by?.color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            <span style={{ background: by?.color }}>{by?.name.split(" ")[0]}</span>
          </div>
        </div>
      </div>
      <div className="tile-name"><I.Screen />{by?.name}&apos;s screen</div>
    </>
  );
}

export function HuddleWindow() {
  const { slack, huddleWindow, setHuddleWindow } = useUI();
  const key = slack.state.inHuddle;
  const h = key ? slack.state.huddles[key] : null;
  if (!key || !h || !huddleWindow) return null;
  const n = h.people.length;
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  return (
    <div className="hwin-backdrop" onClick={(e) => e.target === e.currentTarget && setHuddleWindow(false)}>
      <div className="hwin" role="dialog" aria-label="Huddle">
        <div className="hw-head">
          <span className="hd-live"><I.Headphones /></span>
          <b>{slack.label(key)}</b>
          <span className="sub"><span><Elapsed from={h.startedAt} /></span> · {plural(n, "person")}</span>
          <span className="grow" />
          <button className="hw-btn" title="Copy huddle link" aria-label="Copy huddle link" onClick={() => slack.toast("Huddle link copied")}><I.LinkRounded /></button>
          <button className="hw-btn" title="Minimize (Esc)" aria-label="Minimize huddle" onClick={() => setHuddleWindow(false)}><I.Minimize /></button>
        </div>
        <div className={`hw-stage${h.sharing ? " sharing" : ""}`} data-huddle-host="window">
          {h.sharing ? <div className="tile share"><SharedScreen h={h} /></div> : null}
          <div className="tiles" style={{ ["--cols" as string]: cols, ["--rows" as string]: Math.max(n, 3) }}>
            {h.people.map((p) => {
              const person = slack.people[p];
              const video = h.video.includes(p) && person?.photo;
              return (
                <div key={p} className={`tile${slack.speaking.includes(p) ? " speaking" : ""}`} style={{ ["--c" as string]: person?.color }}>
                  {video ? (
                    <img className="feed" src={person.photo} alt="" style={p === slack.me ? { scale: "-1 1" } : undefined} />
                  ) : (
                    <div className="tile-av"><Avatar id={p} /></div>
                  )}
                  <div className="tile-name">
                    {h.muted.includes(p) ? <span className="m"><I.MicOff /></span> : null}
                    {p === slack.me ? "You" : person?.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="hw-ctrls">
          <Controls h={h} cls="hwc" />
          <button className="hwc" title="More" aria-label="More huddle options" onClick={() => slack.toast("More huddle options")}><I.MoreH /></button>
          <button className="hw-leave" onClick={() => slack.ui.leaveHuddle()}>Leave</button>
        </div>
      </div>
    </div>
  );
}
