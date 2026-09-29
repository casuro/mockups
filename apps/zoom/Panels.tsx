import { useLayoutEffect, useRef, useState } from "react";
import { Avatar, MH, MI, Sep, timeOf, useUI } from "./context";
import * as I from "./icons";
import { inviteOrWarn } from "./Toolbar";
import { FEEDBACK } from "./use-zoom";

// The side panels: Participants (with the waiting room), Meeting Chat (with
// the recipient picker) and Apps. Participants and Chat stack when both are
// open; on a phone one fills the screen.

export function Side() {
  const { zoom } = useUI();
  const p = zoom.state.panels;
  if (!p.participants && !p.chat && !p.apps) return null;
  return (
    <aside className="c-side">
      {p.participants ? <Participants /> : null}
      {p.chat ? <Chat /> : null}
      {p.apps ? <Apps /> : null}
    </aside>
  );
}

function Participants() {
  const ui = useUI();
  const { zoom, openMenu, menuKey, openModal } = ui;
  const s = zoom.state;
  const [q, setQ] = useState("");
  const host = zoom.canManage;
  const rank = (x: string) => (x === zoom.me ? 0 : x === s.host ? 1 : 2);
  const ids = s.people
    .slice()
    .sort((a, b) => {
      const ha = s.hands[a];
      const hb = s.hands[b];
      if (ha && hb) return ha - hb;
      if (ha) return -1;
      if (hb) return 1;
      return rank(a) - rank(b) || zoom.nameOf(a).localeCompare(zoom.nameOf(b));
    })
    .filter((id) => zoom.nameOf(id).toLowerCase().includes(q.trim().toLowerCase()));
  const role = (id: string) => {
    const r = [id === s.host ? "Host" : "", id === zoom.me ? "me" : ""].filter(Boolean);
    return r.length ? `(${r.join(", ")})` : "";
  };

  const row = (id: string) => {
    const me = id === zoom.me;
    const muted = s.muted.includes(id) || (me && !s.audio);
    const video = s.video.includes(id);
    const fb = s.feedback[id];
    const primary = me ? (
      <button className="pbtn" onClick={zoom.ui.toggleMic}>{muted ? "Unmute" : "Mute"}</button>
    ) : !host ? null : s.hands[id] ? (
      <button className="pbtn" onClick={() => zoom.ui.participant("lower-hand", id)}>Lower Hand</button>
    ) : (
      <button className="pbtn" onClick={() => zoom.ui.participant(muted ? "ask-unmute" : "mute", id)}>{muted ? "Ask to Unmute" : "Mute"}</button>
    );
    return (
      <div key={id} className={`prow${menuKey === `prow:${id}` ? " menu-open" : ""}`}>
        <Avatar id={id} />
        <span className="nm">{zoom.nameOf(id)} <small>{role(id)}</small></span>
        <span className="st">
          {s.hands[id] ? <span className="hand" title="Raised hand">✋</span> : null}
          {fb ? <span className="hand">{FEEDBACK[fb].emoji}</span> : null}
          {muted ? <span className="off" title="Muted"><I.MicOff /></span> : <I.Mic />}
          {video ? <I.Video /> : <span className="off" title="Video off"><I.VideoOff /></span>}
        </span>
        <span className="hov">
          {primary}
          <button className="pbtn" onClick={(e) => openMenu(e.currentTarget, `prow:${id}`, () => <RowMenu id={id} />, { align: "end" })}>More <I.ChevDown /></button>
        </span>
      </div>
    );
  };

  return (
    <section className="panel" aria-label="Participants">
      <div className="p-head">
        <b>Participants ({s.people.length})</b>
        <button className="icon-btn" aria-label="Close participants" onClick={() => zoom.ui.closePanels("participants")}><I.Close /></button>
      </div>
      <label className="p-search">
        <I.Search />
        <input placeholder="Find a participant" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="p-scroll">
        {host && s.waiting.length ? (
          <>
            <div className="p-sec"><span>Waiting Room ({s.waiting.length})</span><button onClick={zoom.ui.admitAll}>Admit all</button></div>
            {s.waiting.map((id) => (
              <div key={id} className="prow wr">
                <Avatar id={id} />
                <span className="nm">{zoom.nameOf(id)}</span>
                <span className="hov">
                  <button className="pbtn blue" onClick={() => zoom.ui.admit(id)}>Admit</button>
                  <button className="pbtn" onClick={() => zoom.ui.deny(id)}>Remove</button>
                </span>
              </div>
            ))}
            <div className="p-sec"><span>In the Meeting ({s.people.length})</span></div>
          </>
        ) : null}
        {ids.length ? ids.map(row) : <div className="mc-sys">No participants match &quot;{q.trim()}&quot;</div>}
      </div>
      <div className="p-foot">
        <button className="pbtn" onClick={() => inviteOrWarn(ui, openModal)}>Invite</button>
        {host ? (
          <button
            className="pbtn"
            onClick={() => openModal({ type: "confirm", title: "Mute all current and new participants", body: "Everyone except hosts and co-hosts will be muted.", ok: "Yes", cancel: "No", checkbox: "Allow participants to unmute themselves", onOk: zoom.ui.muteAll })}
          >
            Mute All
          </button>
        ) : null}
        <button className="pbtn sq" aria-label="More participant options" onClick={(e) => openMenu(e.currentTarget, "pmore", () => <PanelMenu />, { place: "top", align: "end" })}><I.Dots /></button>
      </div>
    </section>
  );
}

function RowMenu({ id }: { id: string }) {
  const { zoom, narrow, openModal } = useUI();
  const s = zoom.state;
  const act = zoom.ui.participant;
  if (id === zoom.me) return <MI label={s.hideSelf ? "Show Self View" : "Hide Self View"} onClick={zoom.ui.toggleHideSelf} />;
  const host = zoom.canManage;
  const name = zoom.nameOf(id);
  return (
    <>
      <MI label="Chat" onClick={() => zoom.ui.openChatWith(id, narrow)} />
      {host ? <MI label={s.video.includes(id) ? "Stop Video" : "Ask to Start Video"} onClick={() => act(s.video.includes(id) ? "stop-video" : "ask-video", id)} /> : null}
      <MI label={s.pinned === id ? "Remove Pin" : "Pin"} onClick={() => act("pin", id)} />
      {host ? (
        <>
          <Sep />
          <MI label="Put in Waiting Room" onClick={() => act("to-waiting", id)} />
          <Sep />
          <MI label="Remove" danger onClick={() => openModal({ type: "confirm", title: `Remove ${name}?`, body: "They won't be able to rejoin this meeting.", ok: "Remove", danger: true, onOk: () => act("remove", id) })} />
        </>
      ) : null}
    </>
  );
}

function PanelMenu() {
  const { zoom } = useUI();
  const s = zoom.state.security;
  const t = zoom.ui.security;
  return (
    <>
      {zoom.canManage ? (
        <>
          <MH>Allow participants to</MH>
          <MI label="Unmute Themselves" ck={s.unmute} onClick={() => t("unmute")} />
          <MI label="Rename Themselves" ck={s.rename} onClick={() => t("rename")} />
          <MI label="Start Video" ck={s.video} onClick={() => t("video")} />
          <Sep />
          <MI label="Enable Waiting Room" ck={s.waitingRoom} onClick={() => t("waitingRoom")} />
          <MI label="Lock Meeting" ck={s.locked} onClick={() => t("locked")} />
          <Sep />
        </>
      ) : null}
      <MI label="Play sound when someone joins or leaves" ck={zoom.state.sounds} onClick={zoom.ui.toggleSounds} />
    </>
  );
}

function Chat() {
  const { zoom, openMenu, closeMenu, draft, setDraft, narrow } = useUI();
  const s = zoom.state;
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const toName = s.chatTo === "everyone" ? "Everyone" : zoom.nameOf(s.chatTo);
  const dm = s.chatTo !== "everyone";

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [s.chat.length]);
  // Opening the chat (or picking who to write to) puts the cursor in the box, except on phones.
  useLayoutEffect(() => {
    if (!narrow) input.current?.focus({ preventScroll: true });
  }, [s.chatTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (!s.security.chat && !zoom.canManage) return zoom.toast("The host has disabled chat");
    atBottom.current = true;
    zoom.ui.sendChat(text);
    setDraft("");
  };
  const to = (m: { to: string }) => (m.to === "everyone" ? "Everyone" : m.to === zoom.me ? "Me" : zoom.nameOf(m.to));

  return (
    <section className="panel" aria-label="Meeting chat">
      <div className="p-head">
        <b>Meeting Chat</b>
        <button className="icon-btn" aria-label="Close chat" onClick={() => zoom.ui.closePanels("chat")}><I.Close /></button>
      </div>
      <div className="p-scroll mchat" ref={scroller} onScroll={(e) => (atBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 40)}>
        {s.chat.length ? (
          s.chat.map((m) =>
            m.system ? (
              <div key={m.id} className="mc-sys">{m.text}</div>
            ) : (
              <div key={m.id} className={`mc${m.from === zoom.me ? " mine" : ""}`}>
                <Avatar id={m.from} />
                <div className="col">
                  <div className="h">
                    <b>{m.from === zoom.me ? "Me" : zoom.nameOf(m.from)}</b>
                    <span>to {to(m)}</span>
                    {m.to !== "everyone" ? <span className="dm">(Direct Message)</span> : null}
                    <time>{timeOf(m.at)}</time>
                  </div>
                  <div className="bd">
                    {m.file ? (
                      <div className="mc-file"><span className="fi">{(m.file.name.split(".").pop() ?? "FILE").toUpperCase().slice(0, 4)}</span><span>{m.file.name}<small>{m.file.size ?? ""}</small></span></div>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              </div>
            )
          )
        ) : (
          <div className="mc-sys" style={{ marginTop: 24 }}>Messages addressed to &quot;Everyone&quot; will also appear in the meeting chat for everyone who joins.</div>
        )}
      </div>
      <div className="comp">
        <div className="comp-to">
          To:{" "}
          <button
            className={`to-btn${dm ? " dm" : ""}`}
            onClick={(e) =>
              openMenu(e.currentTarget, "chat-to", () => (
                <>
                  <MI label="Everyone" ck={zoom.state.chatTo === "everyone"} onClick={() => zoom.ui.setChatTo("everyone")} />
                  <Sep />
                  <MH>Direct message</MH>
                  {zoom.state.people.filter((p) => p !== zoom.me).map((p) => (
                    <MI key={p} label={zoom.nameOf(p)} ck={zoom.state.chatTo === p} onClick={() => zoom.ui.setChatTo(p)} />
                  ))}
                </>
              ), { place: "top", align: "start" })
            }
          >
            <span>{toName}</span><I.ChevDown />
          </button>
          {dm ? <span className="dmt">(Direct Message)</span> : null}
        </div>
        <textarea
          ref={input}
          placeholder="Type message here ..."
          aria-label="Chat message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="comp-tools">
          <button
            className="icon-btn"
            title="Emoji"
            aria-label="Emoji"
            onClick={(e) =>
              openMenu(e.currentTarget, "chat-emoji", () => (
                <div className="rx-emo pad">
                  {["😀", "👍", "🎉", "❤️", "😂", "🙏", "👀", "✅"].map((em) => (
                    <button key={em} aria-label={em} onClick={() => { closeMenu(); setDraft(draft + em); input.current?.focus(); }}>{em}</button>
                  ))}
                </div>
              ), { place: "top", align: "start" })
            }
          >
            <I.SmileS />
          </button>
          <button className="icon-btn" title="Send a file" aria-label="Send a file" onClick={() => zoom.ui.emit({ type: "attach", to: s.chatTo })}><I.File /></button>
          <span className="grow" />
          <button className="icon-btn send" aria-label="Send" disabled={!draft.trim()} onClick={send}><I.Send /></button>
        </div>
      </div>
    </section>
  );
}

function Apps() {
  const { zoom } = useUI();
  return (
    <section className="panel" aria-label="Apps">
      <div className="p-head">
        <b>Apps</b>
        <button className="icon-btn" aria-label="Close apps" onClick={() => zoom.ui.closePanels("apps")}><I.Close /></button>
      </div>
      <div className="p-scroll">
        <div className="p-sec"><span>Added apps</span></div>
        {(zoom.seed.apps ?? []).map((a) => {
          const Icon = I.APP_ICONS[a.icon ?? "apps"];
          return (
            <button key={a.name} className="app-row" onClick={() => zoom.ui.openApp(a.name)}>
              <span className="ai" style={{ background: a.color ?? "#0b5cff" }}><Icon /></span>
              <span><b>{a.name}</b><small>{a.description}</small></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
