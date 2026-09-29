import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Elapsed, MH, MI, Sep, useSize, useUI, ZoomContext, type AnnoTool, type MenuOptions, type Modal, type Stroke, type ZoomUI } from "./context";
import { copy, Dialog, linkOf } from "./Dialogs";
import * as I from "./icons";
import { Side } from "./Panels";
import { MyShare, Stage } from "./Stage";
import { EndButton, Toolbar } from "./Toolbar";
import type { ZoomShare } from "./types";
import type { ZoomMeetingApi } from "./use-zoom";
import "./zoom.css";

// Zoom's meeting window, as in apps/zoom.html. Give it a meeting from
// useZoom(); it fills the box it is put in (give that box a height),
// whether that is the whole screen or one pane of it, and switches to
// Zoom's phone layout when the box is narrow.

export interface ZoomProps {
  zoom: ZoomMeetingApi;
  /** Draws a shared screen's content (1280x800, scaled to fit): what `share.screen` shows. */
  renderScreen?: (share: ZoomShare) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface OpenMenu extends MenuOptions {
  key: string;
  anchor: HTMLElement;
  render: () => ReactNode;
}

export function Zoom({ zoom, renderScreen, className, style }: ZoomProps) {
  const root = useRef<HTMLDivElement>(null);
  const { w } = useSize(root);
  const narrow = w > 0 && w < 760;
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const justClosed = useRef<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [draft, setDraft] = useState("");
  const [prefs, setPrefsState] = useState({ mic: 0, speaker: 0, camera: 0, blur: false });
  const [anno, setAnnoState] = useState<{ tool: AnnoTool; color: string }>({ tool: "mouse", color: "#e02828" });
  const strokes = useRef<Record<string, Stroke[]>>({});
  const [inked, setInked] = useState(0);
  const overflow = useRef(new Set<string>());
  const [fullscreen, setFullscreen] = useState(false);
  const s = zoom.state;

  const openMenu = useCallback((anchor: HTMLElement, key: string, render: () => ReactNode, options: MenuOptions = {}) => {
    if (justClosed.current === key) {
      justClosed.current = null;
      return;
    }
    setMenu((m) => (m?.key === key ? null : { key, anchor, render, ...options }));
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) void root.current?.requestFullscreen().catch(() => zoom.toast("Full screen isn't available here"));
      else void document.exitFullscreen();
    } catch {
      zoom.toast("Full screen isn't available here");
    }
  }, [zoom]);
  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // A resize, or leaving the meeting, closes any open menu.
  useEffect(() => setMenu(null), [w, s.phase]);

  // Zoom's shortcuts: ⌘⇧A mute, ⌘⇧V video, ⌘⇧S share, ⌘⇧H chat, ⌘U participants, ⌥Y hand, hold Space to talk, Esc.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  const ptt = useRef(false);
  keys.current = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    const inField = (e.target as HTMLElement).closest?.("input, textarea, select");
    if (e.key === "Escape") {
      if (menu) setMenu(null);
      else if (modal) setModal(null);
      else if (s.share?.annotate) zoom.ui.shareOption({ annotate: false });
      else if (s.panels.participants || s.panels.chat || s.panels.apps) zoom.ui.closePanels();
      else if (s.notice) zoom.ui.dismissNotice();
      return;
    }
    if (s.phase !== "meeting" || modal) return;
    const code = e.code;
    const act = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    if (mod && e.shiftKey && code === "KeyA") act(zoom.ui.toggleMic);
    else if (mod && e.shiftKey && code === "KeyV") act(zoom.ui.toggleVideo);
    else if (mod && e.shiftKey && code === "KeyS") act(() => (s.share?.by === zoom.me ? zoom.ui.stopShare() : setModal({ type: "share" })));
    else if (mod && e.shiftKey && code === "KeyH") act(() => zoom.ui.togglePanel("chat", narrow));
    else if (mod && !e.shiftKey && code === "KeyU") act(() => zoom.ui.togglePanel("participants", narrow));
    else if (e.altKey && !mod && code === "KeyY") act(zoom.ui.toggleHand);
    else if (e.key === " " && !inField && !e.repeat && s.audio && s.muted.includes(zoom.me)) {
      e.preventDefault();
      ptt.current = true;
      zoom.mute(zoom.me, false);
    }
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current(e);
    const up = (e: KeyboardEvent) => {
      if (e.key === " " && ptt.current) {
        ptt.current = false;
        zoom.mute(zoom.me, true);
      }
    };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
  }, [zoom.mute, zoom.me]); // eslint-disable-line react-hooks/exhaustive-deps

  const ui: ZoomUI = {
    zoom,
    root,
    narrow,
    renderScreen,
    openMenu,
    closeMenu,
    menuKey: menu?.key ?? null,
    openModal: setModal,
    closeModal: () => setModal(null),
    draft,
    setDraft,
    prefs,
    setPrefs: (patch) => setPrefsState((p) => ({ ...p, ...patch })),
    anno,
    setAnno: (patch) => setAnnoState((a) => ({ ...a, ...patch })),
    strokes,
    inked,
    bumpInk: () => setInked((n) => n + 1),
    overflow,
    fullscreen,
    toggleFullscreen,
  };

  const selfShare = s.share?.by === zoom.me && s.share.kind === "screen";
  return (
    <ZoomContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-zoom${className ? ` ${className}` : ""}`}
        style={style}
        data-theme="dark"
        onPointerDownCapture={(e) => {
          if (!menu) return;
          const t = e.target as HTMLElement;
          if (t.closest(".menu")) return;
          justClosed.current = menu.anchor.contains(t) ? menu.key : null;
          setMenu(null);
        }}
      >
        {s.phase === "meeting" ? (
          <div className={`call${selfShare ? " selfshare" : ""}`}>
            <TopBar />
            <div className="c-body">
              <Stage />
              <Side />
              <WaitingNotice />
            </div>
            <Toolbar />
            <MyShare />
          </div>
        ) : (
          <Ended />
        )}
        {modal ? <Dialog modal={modal} /> : null}
        {menu ? <Menu menu={menu} /> : null}
        <Toast />
      </div>
    </ZoomContext.Provider>
  );
}

/** A popover placed against its button, inside the kit's box. */
function Menu({ menu }: { menu: OpenMenu }) {
  const { root } = useUI();
  const el = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const box = root.current?.getBoundingClientRect();
    const m = el.current;
    if (!box || !m) return;
    const r = menu.anchor.getBoundingClientRect();
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    const { place = "bottom", align = "center" } = menu;
    let left = align === "start" ? r.left : align === "end" ? r.right - w : r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left - box.left, box.width - w - 8));
    let top = place === "top" ? r.top - h - 8 : r.bottom + 6;
    if (place === "top" && top - box.top < 8) top = r.bottom + 6;
    if (place === "bottom" && top + h > box.bottom - 8) top = Math.max(box.top + 8, r.top - h - 6);
    setPos({ left, top: top - box.top });
  }, [menu, root]);
  return (
    <div ref={el} className="menu" style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}>
      {menu.render()}
    </div>
  );
}

function TopBar() {
  const { zoom, openMenu, fullscreen, toggleFullscreen } = useUI();
  const s = zoom.state;
  const m = zoom.seed.meeting;
  const r = s.recording;
  const info = () => (
    <div className="minfo">
      <h3>{m.title}</h3>
      <dl>
        <dt>Meeting ID</dt><dd>{m.id}</dd>
        <dt>Host</dt><dd>{zoom.nameOf(zoom.state.host)}</dd>
        <dt>Passcode</dt><dd>{m.passcode || "None"}</dd>
        <dt>Invite Link</dt>
        <dd>
          <span className="lnk">{linkOf(zoom)}</span><br />
          <button className="copy" onClick={() => copy(zoom, linkOf(zoom), "Invite link copied to clipboard")}><I.Copy />Copy Link</button>
        </dd>
        <dt>Encryption</dt>
        <dd><span className="enc"><I.ShieldCheck />Enabled</span><span className="enc-note">This meeting is encrypted end to end in transit.</span></dd>
      </dl>
    </div>
  );
  const view = () => {
    const st = zoom.state;
    return (
      <>
        <MH>Layout</MH>
        <MI label="Speaker" ck={st.view === "speaker"} onClick={() => zoom.ui.setView("speaker")} />
        <MI label="Gallery" ck={st.view === "gallery"} onClick={() => zoom.ui.setView("gallery")} />
        <Sep />
        <MI label={st.hideSelf ? "Show Self View" : "Hide Self View"} onClick={zoom.ui.toggleHideSelf} />
        <MI label={st.hideNonVideo ? "Show Non-video Participants" : "Hide Non-video Participants"} onClick={zoom.ui.toggleHideNonVideo} />
        <Sep />
        <MI label={fullscreen ? "Exit Full Screen" : "Enter Full Screen"} onClick={toggleFullscreen} />
      </>
    );
  };
  return (
    <div className="c-top">
      <button className="ctb shield" title="Meeting information" aria-label="Meeting information" onClick={(e) => openMenu(e.currentTarget, "minfo", info, { align: "start" })}>
        <I.ShieldCheck />
      </button>
      {r ? (
        <span className={`rec-ind${r.paused ? " paused" : ""}`}>
          {r.kind === "cloud" ? <I.Cloud className="cl" /> : null}
          <span className="rd" />
          <span className="lbl">{r.paused ? "Recording Paused" : "Recording..."}</span>
          <button title={r.paused ? "Resume recording" : "Pause recording"} aria-label={r.paused ? "Resume recording" : "Pause recording"} onClick={() => zoom.ui.record("pause")}>
            {r.paused ? <I.Play /> : <I.Pause />}
          </button>
          <button title="Stop recording" aria-label="Stop recording" onClick={() => zoom.ui.record("stop")}><I.Stop /></button>
        </span>
      ) : null}
      <span className="grow" />
      <div className="c-title">
        <b>{m.title}</b>
        <span className="timer"><Elapsed from={s.startedAt} /></span>
      </div>
      <button className="ctb view-btn" aria-label="View" onClick={(e) => openMenu(e.currentTarget, "view", view, { align: "end" })}>
        <I.Grid /><span className="lbl">View</span>
      </button>
      <button className="ctb fs-btn" title={fullscreen ? "Exit full screen" : "Enter full screen"} aria-label="Full screen" onClick={toggleFullscreen}>
        {fullscreen ? <I.ExitFullscreen /> : <I.Fullscreen />}
      </button>
      <EndButton top />
    </div>
  );
}

function WaitingNotice() {
  const { zoom, narrow } = useUI();
  const id = zoom.state.notice;
  if (!id || !zoom.state.waiting.includes(id)) return null;
  return (
    <div className="c-notice" role="alert">
      <button className="icon-btn x" aria-label="Dismiss" onClick={zoom.ui.dismissNotice}><I.Close /></button>
      <p><b>{zoom.nameOf(id)}</b> has entered the waiting room for this meeting.</p>
      <div className="acts">
        <button
          className="pbtn"
          onClick={() => {
            zoom.ui.dismissNotice();
            if (!zoom.state.panels.participants) zoom.ui.togglePanel("participants", narrow);
          }}
        >
          See waiting room
        </button>
        <button className="pbtn blue" onClick={() => zoom.ui.admit(id)}>Admit</button>
      </div>
    </div>
  );
}

function Ended() {
  const { zoom } = useUI();
  const m = zoom.seed.meeting;
  const ended = zoom.state.phase === "ended";
  return (
    <div className="ended">
      <div className="ended-card">
        <div className="wr-logo"><I.ZoomLogo /></div>
        <h1>{ended ? "This meeting has been ended by the host" : "You left the meeting"}</h1>
        <p>{`${m.title}  ·  Meeting ID ${m.id}`}</p>
        <div className="acts">
          <button className="btn btn-primary" onClick={zoom.ui.rejoin}>{ended ? "Start again" : "Rejoin"}</button>
        </div>
      </div>
    </div>
  );
}

function Toast() {
  const { zoom } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!zoom.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(t);
  }, [zoom.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {zoom.notice?.text ?? ""}
    </div>
  );
}
