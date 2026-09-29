import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ALT, MH, MI, Sep, useUI, type ZoomUI } from "./context";
import * as I from "./icons";
import { FEEDBACK, type Feedback } from "./use-zoom";

// The bottom toolbar: Mute and Video with their device menus, the middle
// buttons (which drop into More, lowest priority first, when they do not
// fit), and End. Plus every menu those buttons open.

const MICS = ["Same as System (Built-in Microphone)", "Built-in Microphone", "USB Audio Device"];
const SPEAKERS = ["Same as System (Built-in Output)", "Built-in Output", "USB Headset"];
const CAMERAS = ["Built-in Camera", "USB Camera"];
const REACTIONS = ["👏", "👍", "❤️", "😂", "😮", "🎉"];

interface BarItem {
  k: string;
  /** Lower drops into More first; 90 and up never do. */
  pri: number;
  label: string;
  icon: ReactNode;
  /** The icon in the More menu, when it differs. */
  menuIcon?: ReactNode;
  extra?: ReactNode;
  cls?: string;
  on?: boolean;
  run: (anchor: HTMLElement) => void;
}

function barItems(ui: ZoomUI): BarItem[] {
  const { zoom, narrow, openMenu, openModal } = ui;
  const s = zoom.state;
  const mine = s.share?.by === zoom.me;
  const items: (BarItem | false)[] = [
    zoom.canManage && { k: "secu", pri: 5, label: "Security", icon: <I.Shield />, run: (a) => openMenu(a, "security", () => <SecurityMenu />, { place: "top" }) },
    { k: "parts", pri: 99, label: "Participants", icon: <I.People />, extra: <span className="cnt">{s.people.length}</span>, on: s.panels.participants, run: () => zoom.ui.togglePanel("participants", narrow) },
    { k: "chat", pri: 8, label: "Chat", icon: <I.Chat />, extra: s.unread ? <span className="badge">{s.unread}</span> : null, on: s.panels.chat, run: () => zoom.ui.togglePanel("chat", narrow) },
    {
      k: "share", pri: 98, label: mine ? "Stop Share" : "Share Screen", icon: <span className="share-ico"><I.ArrowUp /></span>, menuIcon: <I.ArrowUp />, cls: mine ? "sharing" : "",
      run: () => (mine ? zoom.ui.stopShare() : openModal({ type: "share" })),
    },
    {
      k: "rec", pri: 6, label: s.recording ? (s.recording.paused ? "Resume/Stop" : "Pause/Stop Recording") : "Record", icon: <span className="rec-ico" />, menuIcon: <I.RecordDot on={!!s.recording} />, cls: s.recording ? "rec-on" : "",
      run: (a) => openMenu(a, "record", () => <RecordMenu />, { place: "top" }),
    },
    { k: "cc", pri: 4, label: s.captions ? "Hide Captions" : "Show Captions", icon: <I.CC />, on: s.captions, run: zoom.ui.toggleCaptions },
    { k: "rx", pri: 7, label: "Reactions", icon: <I.Smile />, run: (a) => openMenu(a, "reactions", () => <ReactionsTray />, { place: "top" }) },
    !!zoom.seed.apps?.length && { k: "apps", pri: 2, label: "Apps", icon: <I.Apps />, on: s.panels.apps, run: () => zoom.ui.togglePanel("apps", narrow) },
    { k: "wb", pri: 1, label: "Whiteboards", icon: <I.Whiteboard />, run: (a) => openMenu(a, "whiteboards", () => <WhiteboardMenu />, { place: "top" }) },
  ];
  return items.filter((i): i is BarItem => !!i);
}

export function Toolbar() {
  const ui = useUI();
  const { zoom, overflow, openMenu } = ui;
  const s = zoom.state;
  const muted = s.muted.includes(zoom.me);
  const video = s.video.includes(zoom.me);
  const mid = useRef<HTMLDivElement>(null);
  const items = barItems(ui);

  // Drop the lowest-priority buttons into More until the rest fit.
  const fitBar = () => {
    const el = mid.current;
    if (!el) return;
    const tis = [...el.querySelectorAll<HTMLElement>(".ti[data-pri]")];
    tis.forEach((t) => (t.hidden = false));
    const order = tis.filter((t) => +t.dataset.pri! < 90).sort((a, b) => +a.dataset.pri! - +b.dataset.pri!);
    const hidden = new Set<string>();
    for (const t of order) {
      if (el.scrollWidth <= el.clientWidth + 1) break;
      t.hidden = true;
      hidden.add(t.dataset.k!);
    }
    overflow.current = hidden;
  };
  useLayoutEffect(fitBar);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => fitBar());
    if (mid.current) ro.observe(mid.current);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const micLabel = !s.audio ? "Join Audio" : muted ? "Unmute" : "Mute";
  return (
    <div className="c-bar">
      <div className="side l">
        <div className="ti split">
          <button className="tbtn" aria-label={micLabel} onClick={zoom.ui.toggleMic}>
            <span className="ico">{!s.audio ? <I.Headphones /> : muted ? <span className="off"><I.MicOff /></span> : <I.Mic />}</span>
            <span className="lbl">{micLabel}</span>
          </button>
          <button className="caret" aria-label="Audio settings" onClick={(e) => openMenu(e.currentTarget, "audio", () => <AudioMenu />, { place: "top", align: "start" })}><I.ChevUp /></button>
        </div>
        <div className="ti split">
          <button className="tbtn" aria-label={video ? "Stop Video" : "Start Video"} onClick={zoom.ui.toggleVideo}>
            <span className="ico">{video ? <I.Video /> : <span className="off"><I.VideoOff /></span>}</span>
            <span className="lbl">{video ? "Stop Video" : "Start Video"}</span>
          </button>
          <button className="caret" aria-label="Video settings" onClick={(e) => openMenu(e.currentTarget, "video", () => <VideoMenu />, { place: "top", align: "start" })}><I.ChevUp /></button>
        </div>
      </div>
      <div className="mid" ref={mid}>
        {items.map((i) => (
          <div key={i.k} className="ti" data-k={i.k} data-pri={i.pri}>
            <button className={`tbtn${i.cls ? ` ${i.cls}` : ""}${i.on ? " on" : ""}`} aria-label={i.label} onClick={(e) => i.run(e.currentTarget)}>
              <span className="ico">{i.icon}{i.extra}</span>
              <span className="lbl">{i.label}</span>
            </button>
          </div>
        ))}
        <div className="ti" data-k="more" data-pri={100}>
          <button className="tbtn" aria-label="More" onClick={(e) => openMoreMenu(ui, e.currentTarget)}>
            <span className="ico"><I.Dots /></span>
            <span className="lbl">More</span>
          </button>
        </div>
      </div>
      <div className="side r">
        <EndButton />
      </div>
    </div>
  );
}

export function EndButton({ top = false }: { top?: boolean }) {
  const { zoom, openMenu, narrow } = useUI();
  return (
    <button className={`end-btn${top ? " c-end-top" : ""}`} onClick={(e) => openMenu(e.currentTarget, "end", () => <EndMenu />, { place: narrow ? "bottom" : "top", align: "end" })}>
      {zoom.canManage ? "End" : "Leave"}
    </button>
  );
}

/** More: the toolbar buttons that did not fit (or that sharing hides), then Invite and self view. */
export function openMoreMenu(ui: ZoomUI, anchor: HTMLElement, sharing = false) {
  ui.openMenu(anchor, "more", () => <MoreMenu anchor={anchor} sharing={sharing} />, { place: "top", align: "end" });
}

function MoreMenu({ anchor, sharing }: { anchor: HTMLElement; sharing: boolean }) {
  const ui = useUI();
  const { zoom, openModal } = ui;
  const hidden = barItems(ui).filter((i) => ui.overflow.current.has(i.k) || (sharing && ["secu", "rec", "cc", "rx", "apps", "wb"].includes(i.k)));
  return (
    <>
      {hidden.map((i) => <MI key={i.k} label={i.label} icon={i.menuIcon ?? i.icon} onClick={() => i.run(anchor)} />)}
      {hidden.length ? <Sep /> : null}
      <MI label="Invite" icon={<I.PersonAdd />} onClick={() => inviteOrWarn(ui, openModal)} />
      <MI label={zoom.state.hideSelf ? "Show Self View" : "Hide Self View"} icon={<I.Bg />} onClick={zoom.ui.toggleHideSelf} />
    </>
  );
}

export function inviteOrWarn(ui: ZoomUI, openModal: ZoomUI["openModal"]) {
  if (ui.zoom.state.security.locked) ui.zoom.toast("This meeting is locked. Unlock it to invite people.");
  else openModal({ type: "invite" });
}

function AudioMenu() {
  const { zoom, prefs, setPrefs } = useUI();
  return (
    <>
      <MH>Select a Microphone</MH>
      {MICS.map((d, i) => <MI key={d} label={d} ck={prefs.mic === i} onClick={() => { setPrefs({ mic: i }); zoom.toast("Microphone changed"); }} />)}
      <Sep />
      <MH>Select a Speaker</MH>
      {SPEAKERS.map((d, i) => <MI key={d} label={d} ck={prefs.speaker === i} onClick={() => { setPrefs({ speaker: i }); zoom.toast("Speaker changed"); }} />)}
      <Sep />
      <MI label="Test Speaker & Microphone..." onClick={() => { zoom.ui.chime(true); zoom.toast("Playing a test sound. Can you hear it?"); }} />
      <MI label="Switch to Phone Audio..." onClick={() => zoom.toast(`Dial in and enter meeting ID ${zoom.seed.meeting.id} followed by #`)} />
      {zoom.state.audio ? <MI label="Leave Computer Audio" onClick={zoom.ui.leaveAudio} /> : null}
    </>
  );
}

function VideoMenu() {
  const { zoom, prefs, setPrefs } = useUI();
  return (
    <>
      <MH>Select a Camera</MH>
      {CAMERAS.map((d, i) => <MI key={d} label={d} ck={prefs.camera === i} onClick={() => { setPrefs({ camera: i }); zoom.toast("Camera changed"); }} />)}
      <Sep />
      <MI label="Blur My Background" ck={prefs.blur} onClick={() => setPrefs({ blur: !prefs.blur })} />
    </>
  );
}

function SecurityMenu() {
  const { zoom, openModal } = useUI();
  const s = zoom.state.security;
  const t = zoom.ui.security;
  return (
    <>
      <MI label="Lock Meeting" ck={s.locked} onClick={() => t("locked")} />
      <MI label="Enable Waiting Room" ck={s.waitingRoom} onClick={() => t("waitingRoom")} />
      <MI label="Hide Profile Pictures" ck={s.hidePictures} onClick={() => t("hidePictures")} />
      <Sep />
      <MH>Allow all participants to</MH>
      <MI label="Share Screen" ck={s.share} onClick={() => t("share")} />
      <MI label="Chat" ck={s.chat} onClick={() => t("chat")} />
      <MI label="Rename Themselves" ck={s.rename} onClick={() => t("rename")} />
      <MI label="Unmute Themselves" ck={s.unmute} onClick={() => t("unmute")} />
      <MI label="Start Video" ck={s.video} onClick={() => t("video")} />
      <Sep />
      <MI
        label="Suspend Participant Activities"
        danger
        onClick={() => openModal({ type: "confirm", title: "Suspend participant activities?", body: "Everyone's video, audio and screen sharing will stop, and the meeting will be locked.", ok: "Suspend", danger: true, onOk: zoom.ui.suspend })}
      />
    </>
  );
}

function RecordMenu() {
  const { zoom } = useUI();
  const r = zoom.state.recording;
  if (r)
    return (
      <>
        <MI label={r.paused ? "Resume Recording" : "Pause Recording"} icon={r.paused ? <I.Play /> : <I.Pause />} onClick={() => zoom.ui.record("pause")} />
        <MI label="Stop Recording" icon={<I.Stop />} onClick={() => zoom.ui.record("stop")} />
      </>
    );
  if (!zoom.canManage) return <MI label="Request permission to record" icon={<I.Info />} onClick={() => zoom.ui.record("ask")} />;
  return (
    <>
      <MI label="Record on this Computer" icon={<I.Computer />} onClick={() => zoom.ui.record("start", "local")} />
      <MI label="Record to the Cloud" icon={<I.Cloud />} onClick={() => zoom.ui.record("start", "cloud")} />
    </>
  );
}

function ReactionsTray() {
  const { zoom, closeMenu } = useUI();
  const hand = !!zoom.state.hands[zoom.me];
  const fb = zoom.state.feedback[zoom.me];
  const then = (fn: () => void) => () => { closeMenu(); fn(); };
  return (
    <div className="rx">
      <div className="rx-emo">
        {REACTIONS.map((e) => <button key={e} aria-label={`React ${e}`} onClick={then(() => zoom.ui.reactMine(e))}>{e}</button>)}
      </div>
      <button className={`rx-hand${hand ? " on" : ""}`} onClick={then(zoom.ui.toggleHand)}>
        <span>✋</span>{hand ? "Lower Hand" : "Raise Hand"}<kbd>{ALT}Y</kbd>
      </button>
      <div className="rx-fb">
        {(Object.keys(FEEDBACK) as Feedback[]).map((k) => (
          <button key={k} className={fb === k ? "on" : ""} onClick={then(() => zoom.ui.setFeedback(k))}>
            <span>{FEEDBACK[k].emoji}</span>{FEEDBACK[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WhiteboardMenu() {
  const { zoom } = useUI();
  const recent = zoom.seed.whiteboards ?? [];
  return (
    <>
      <MI label="New Whiteboard" icon={<I.Plus />} onClick={() => zoom.ui.startWhiteboard({ title: "Untitled whiteboard" })} />
      {recent.length ? (
        <>
          <Sep />
          <MH>Recent</MH>
          {recent.map((b) => <MI key={b.title} label={b.title} icon={<I.Whiteboard />} onClick={() => zoom.ui.startWhiteboard(b)} />)}
        </>
      ) : null}
    </>
  );
}

function EndMenu() {
  const { zoom, closeMenu } = useUI();
  const host = zoom.canManage;
  return (
    <div className="end-menu">
      {host ? <button className="btn btn-danger" onClick={() => { closeMenu(); zoom.ui.hangUp(true); }}>End meeting for all</button> : null}
      <button className={`btn ${host ? "m-sec" : "btn-danger"}`} onClick={() => { closeMenu(); zoom.ui.hangUp(false); }}>Leave meeting</button>
    </div>
  );
}
