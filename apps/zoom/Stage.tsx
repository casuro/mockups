import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Elapsed, focusId, MI, Sep, useSize, useUI, visibleIds, type Stroke } from "./context";
import * as I from "./icons";
import { openMoreMenu } from "./Toolbar";
import type { ZoomShare } from "./types";
import { FEEDBACK } from "./use-zoom";

// The middle of the meeting window: the video tiles in gallery, speaker or
// phone layout, someone's shared screen with the green bar, a whiteboard,
// captions, and your own screen share with its floating controls.

/** The biggest 16:9 tiles that fit `n` into W x H. */
function fit(n: number, W: number, H: number, gap = 6, ar = 16 / 9) {
  let best = { w: 0, h: 0, cols: 1 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    let w = (W - gap * (cols - 1)) / cols;
    let h = w / ar;
    if (h * rows + gap * (rows - 1) > H) {
      h = (H - gap * (rows - 1)) / rows;
      w = h * ar;
    }
    if (w > best.w) best = { w: Math.floor(w), h: Math.floor(h), cols };
  }
  return best;
}

/** A camera: the portrait full-height over a soft blurred copy of itself. */
function CamFeed({ src, blur }: { src: string; blur?: boolean }) {
  return (
    <div className="selfv">
      <img className="vbg blurred" src={src} alt="" />
      <img className={`vid fit${blur ? " cut" : ""}`} src={src} alt="" />
    </div>
  );
}

export function Tile({ id, cls = "" }: { id: string; cls?: string }) {
  const { zoom, prefs, openMenu } = useUI();
  const s = zoom.state;
  const p = zoom.people[id];
  if (!p) return null;
  const me = id === zoom.me;
  const muted = s.muted.includes(id) || (me && !s.audio);
  const fb = s.feedback[id];
  const rx = zoom.reactions[id];
  const pinned = s.pinned === id || s.spotlight === id;
  const face = s.video.includes(id) && p.photo ? (
    <CamFeed src={p.photo} blur={me && prefs.blur} />
  ) : s.security.hidePictures || (s.video.includes(id) && !p.photo) ? (
    <div className="nm-big">{p.name}</div>
  ) : p.photo ? (
    <img className="pp" src={p.photo} alt="" />
  ) : (
    <span className="pp ini" style={{ background: p.color }}>{p.initials}</span>
  );
  const speaking = zoom.speakingNow.includes(id) && !muted;
  return (
    <div className={`tile${me ? " me" : ""}${speaking ? " spk" : ""}${cls ? ` ${cls}` : ""}`}>
      {face}
      <div className="t-badges">
        {s.hands[id] ? <span title="Raised hand">✋</span> : null}
        {fb ? <span title={FEEDBACK[fb].label}>{FEEDBACK[fb].emoji}</span> : null}
        <span className="rx-slot">
          {rx ? <i key={rx.at} className="t-react" style={{ animationDelay: `-${Math.min(5000, Date.now() - rx.at)}ms` }}>{rx.emoji}</i> : null}
        </span>
      </div>
      <button className="t-more" aria-label={`More options for ${p.name}`} onClick={(e) => openMenu(e.currentTarget, `tile:${id}`, () => <TileMenu id={id} />, { align: "end" })}>
        <I.Dots />
      </button>
      {pinned ? <span className="t-pin"><I.Pin />{s.spotlight === id ? "Spotlight" : "Pinned"}</span> : null}
      <span className="t-name">
        {muted ? <span className="mm"><I.MicOff /></span> : <span className="lv"><I.MicLevel /></span>}
        <span>{p.name}</span>
      </span>
    </div>
  );
}

function TileMenu({ id }: { id: string }) {
  const { zoom, narrow } = useUI();
  const s = zoom.state;
  const act = zoom.ui.participant;
  const pin = s.pinned === id ? <MI label="Remove Pin" onClick={() => act("pin", id)} /> : <MI label="Pin" onClick={() => act("pin", id)} />;
  if (id === zoom.me)
    return (
      <>
        <MI label={s.hideSelf ? "Show Self View" : "Hide Self View"} onClick={zoom.ui.toggleHideSelf} />
        {pin}
      </>
    );
  const host = zoom.canManage;
  return (
    <>
      {pin}
      {host ? <MI label={s.spotlight === id ? "Remove Spotlight" : "Spotlight for Everyone"} onClick={() => act("spotlight", id)} /> : null}
      {host ? <MI label={s.muted.includes(id) ? "Ask to Unmute" : "Mute"} onClick={() => act(s.muted.includes(id) ? "ask-unmute" : "mute", id)} /> : null}
      {host ? <MI label={s.video.includes(id) ? "Stop Video" : "Ask to Start Video"} onClick={() => act(s.video.includes(id) ? "stop-video" : "ask-video", id)} /> : null}
      <MI label="Chat" onClick={() => zoom.ui.openChatWith(id, narrow)} />
      {host ? <><Sep /><MI label="Put in Waiting Room" onClick={() => act("to-waiting", id)} /></> : null}
    </>
  );
}

/** Self view first, then everyone else. */
const ordered = (vis: string[], me: string) => [...vis.filter((v) => v === me), ...vis.filter((v) => v !== me)];

function Gallery({ ids }: { ids: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const b = fit(ids.length, w - 12, h - 12);
  return (
    <div className="gallery" ref={box}>
      <div className="g-wrap" style={{ ["--tw" as string]: `${b.w}px`, ["--th" as string]: `${b.h}px`, width: b.cols * b.w + (b.cols - 1) * 6 }}>
        {ids.map((id) => <Tile key={id} id={id} />)}
      </div>
    </div>
  );
}

function Speaker({ ids }: { ids: string[] }) {
  const { zoom } = useUI();
  const main = focusId(zoom, ids);
  const rest = ids.filter((v) => v !== main);
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const b = fit(1, w - 12, h - 12);
  return (
    <div className="spkv">
      {rest.length ? <div className="strip">{rest.map((id) => <Tile key={id} id={id} />)}</div> : null}
      <div className="spk-main" ref={box} style={{ ["--tw" as string]: `${b.w}px`, ["--th" as string]: `${b.h}px` }}>
        <Tile id={main} />
      </div>
    </div>
  );
}

/** Phones: the speaker full screen with you in a corner, then pages of four to swipe through. */
function Phone({ ids }: { ids: string[] }) {
  const { zoom } = useUI();
  const main = focusId(zoom, ids);
  const [page, setPage] = useState(0);
  const pages: ReactNode[] = [
    <div className="pg" key="main">
      <Tile id={main} cls="full" />
      {main !== zoom.me && ids.includes(zoom.me) ? <div className="pip"><Tile id={zoom.me} /></div> : null}
    </div>,
  ];
  for (let i = 0; i < ids.length; i += 4)
    pages.push(<div className="pg grid" key={i}>{ids.slice(i, i + 4).map((id) => <Tile key={id} id={id} />)}</div>);
  return (
    <>
      <div className="pages" onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>{pages}</div>
      {pages.length > 1 ? <div className="page-dots">{pages.map((_, i) => <i key={i} className={i === page ? "on" : ""} />)}</div> : null}
    </>
  );
}

/** A 1280x800 screen scaled to fit `host`, the way a shared screen is shown. */
function ScreenFit({ children, overlay, full = false, fitIt = true }: { children: ReactNode; overlay?: ReactNode; full?: boolean; fitIt?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(host);
  const k = Math.min(w / 1280, h / 800) * (full ? 1 : 0.98);
  return (
    <div ref={host} className={full ? "scr-host" : `sv-screen${fitIt ? "" : " orig"}`}>
      <div className="scr-fit" style={fitIt && w ? { transform: `translate(-50%, -50%) scale(${k})` } : fitIt ? { visibility: "hidden" } : undefined}>
        {children}
      </div>
      {overlay}
    </div>
  );
}

function ScreenContent({ share }: { share: ZoomShare }) {
  const { renderScreen } = useUI();
  return <>{renderScreen?.(share) ?? <div className="scr-blank">{share.screen}</div>}</>;
}

/** Pen, stamps and eraser over a shared screen or a whiteboard, in screen pixels. */
function AnnoCanvas({ surface, drawing }: { surface: string; drawing: boolean }) {
  const { anno, strokes, inked, bumpInk } = useUI();
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<Extract<Stroke, { points: unknown }> | null>(null);

  const draw = () => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const s of strokes.current[surface] ?? []) {
      if ("stamp" in s) {
        ctx.font = "34px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.stamp, s.x, s.y);
        continue;
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.beginPath();
      s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.1, s.points[0].y);
      ctx.stroke();
    }
  };
  useEffect(draw);
  useEffect(draw, [inked]); // eslint-disable-line react-hooks/exhaustive-deps

  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * 1280) / r.width, y: ((e.clientY - r.top) * 800) / r.height };
  };
  return (
    <canvas
      ref={canvas}
      className={`anno${drawing ? " drawing" : ""}`}
      width={1280}
      height={800}
      onPointerDown={(e) => {
        const pt = at(e);
        const list = (strokes.current[surface] ??= []);
        if (anno.tool === "stamp") list.push({ stamp: "⭐", ...pt });
        else if (anno.tool === "eraser")
          strokes.current[surface] = list.filter((s) => ("stamp" in s ? Math.hypot(s.x - pt.x, s.y - pt.y) > 24 : !s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 16)));
        else {
          current.current = { color: anno.color, width: surface === "wb" ? 4 : 5, points: [pt] };
          list.push(current.current);
          e.currentTarget.setPointerCapture(e.pointerId);
          e.preventDefault();
        }
        bumpInk();
      }}
      onPointerMove={(e) => {
        if (!current.current) return;
        current.current.points.push(at(e));
        draw();
      }}
      onPointerUp={() => (current.current = null)}
    />
  );
}

const COLORS = ["#e02828", "#0b5cff", "#1e9c4a", "#f5a623", "#111111"];

function useAnnoTools(surface: string) {
  const { anno, setAnno, strokes, bumpInk, zoom } = useUI();
  return {
    tool: anno.tool,
    color: anno.color,
    pick: (tool: typeof anno.tool) => setAnno({ tool }),
    nextColor: () => setAnno({ color: COLORS[(COLORS.indexOf(anno.color) + 1) % COLORS.length] }),
    undo: () => {
      strokes.current[surface]?.pop();
      bumpInk();
    },
    clear: () => {
      strokes.current[surface] = [];
      bumpInk();
    },
    close: () => {
      zoom.ui.shareOption({ annotate: false });
      setAnno({ tool: "mouse" });
    },
  };
}

function AnnoBar({ surface, bottom = false }: { surface: string; bottom?: boolean }) {
  const { zoom } = useUI();
  const t = useAnnoTools(surface);
  const b = (tool: typeof t.tool, icon: ReactNode, label: string) => (
    <button className={t.tool === tool ? "on" : ""} onClick={() => t.pick(tool)}>{icon}{label}</button>
  );
  return (
    <div className={`anno-bar${bottom ? " bottom" : ""}`}>
      {b("mouse", <I.Cursor />, "Mouse")}
      {b("draw", <I.Pen />, "Draw")}
      {b("stamp", <I.Star />, "Stamp")}
      {b("eraser", <I.Eraser />, "Eraser")}
      <button onClick={t.nextColor}><span className="sw" style={{ background: t.color }} />Format</button>
      <button onClick={t.undo}><I.Undo />Undo</button>
      <button onClick={t.clear}><I.Trash />Clear</button>
      <button onClick={() => zoom.toast("Annotations saved to Documents > Zoom")}><I.Download />Save</button>
      <button className="x" onClick={t.close}><I.Close />Close</button>
    </div>
  );
}

/** Someone else's screen, under the green "You are viewing" bar. */
function ShareView({ share, ids }: { share: ZoomShare; ids: string[] }) {
  const { zoom, narrow, openMenu, anno, setAnno } = useUI();
  const surface = `view:${share.by}`;
  const fitIt = share.fit !== false;
  const toggleAnnotate = () => {
    zoom.ui.shareOption({ annotate: !share.annotate });
    setAnno({ tool: share.annotate ? "mouse" : "draw" });
  };
  const options = () => (
    <>
      <MI label="Fit to Window" ck={fitIt} onClick={() => zoom.ui.shareOption({ fit: true })} />
      <MI label="Original Size" ck={!fitIt} onClick={() => zoom.ui.shareOption({ fit: false })} />
      <Sep />
      <MI label="Side-by-side Mode" ck={!!share.sideBySide} onClick={() => zoom.ui.shareOption({ sideBySide: !share.sideBySide })} />
      <Sep />
      <MI label={share.annotate ? "Stop Annotating" : "Annotate"} onClick={toggleAnnotate} />
    </>
  );
  const sbs = !!share.sideBySide && !narrow;
  return (
    <div className="sharev">
      <div className="viewbar">
        <div className="pill">
          <span>You are viewing {zoom.nameOf(share.by)}&apos;s screen</span>
          <button onClick={(e) => openMenu(e.currentTarget, "view-options", options)}>View Options <I.ChevDown /></button>
        </div>
      </div>
      <div className={`sv-body${sbs ? " sbs" : ""}`}>
        {narrow ? null : <div className={`sv-thumbs${sbs ? "" : " strip"}`}>{ids.map((id) => <Tile key={id} id={id} />)}</div>}
        <ScreenFit fitIt={fitIt} overlay={share.annotate ? <AnnoBar surface={surface} /> : null}>
          <ScreenContent share={share} />
          <AnnoCanvas surface={surface} drawing={!!share.annotate && anno.tool !== "mouse"} />
        </ScreenFit>
      </div>
    </div>
  );
}

/** Your whiteboard, shared with the meeting. */
function WhiteboardView({ share, ids }: { share: ZoomShare; ids: string[] }) {
  const { zoom, narrow, strokes } = useUI();
  const t = useAnnoTools("wb");
  const notes = share.notes ?? [];
  const rail = (tool: typeof t.tool, icon: ReactNode, label: string) => (
    <button className={t.tool === tool ? "on" : ""} title={label} aria-label={label} onClick={() => t.pick(tool)}>{icon}</button>
  );
  return (
    <div className="sharev">
      <div className="viewbar">
        <div className="pill">
          <span>You are sharing a whiteboard</span>
          <button onClick={zoom.ui.stopShare}>Stop Share</button>
        </div>
      </div>
      <div className="sv-body">
        {narrow ? null : <div className="sv-thumbs strip">{ids.map((id) => <Tile key={id} id={id} />)}</div>}
        <ScreenFit>
          <div className="fx wb">
            {notes.map((n, i) => (
              <div key={i} className="sticky" style={{ left: n.x, top: n.y, background: n.color ?? "#fff3a8", transform: `rotate(${n.tilt ?? 0}deg)` }}>
                <b>{n.by}</b>{n.text}
              </div>
            ))}
            {!notes.length && !strokes.current.wb?.length ? (
              <div className="wb-hint">Draw, add sticky notes, or brainstorm together.<br />Everyone in the meeting can see this whiteboard.</div>
            ) : null}
          </div>
          <AnnoCanvas surface="wb" drawing={t.tool !== "mouse"} />
          <div className="wb-top"><I.Whiteboard />{share.title || "Untitled whiteboard"}</div>
          <div className="wb-rail">
            {rail("mouse", <I.Cursor />, "Select")}
            {rail("draw", <I.Pen />, "Pen")}
            <button title="Sticky note" aria-label="Sticky note" onClick={zoom.ui.addSticky}><I.Sticky /></button>
            {rail("stamp", <I.Star />, "Stamp")}
            {rail("eraser", <I.Eraser />, "Eraser")}
            <button title="Color" aria-label="Color" onClick={t.nextColor}><span className="sw" style={{ background: t.color }} /></button>
            <button title="Undo" aria-label="Undo" onClick={t.undo}><I.Undo /></button>
            <button title="Clear" aria-label="Clear" onClick={t.clear}><I.Trash /></button>
          </div>
        </ScreenFit>
      </div>
    </div>
  );
}

function Captions() {
  const { zoom } = useUI();
  const c = zoom.caption;
  return (
    <div className="captions">
      {c && zoom.state.people.includes(c.id) ? (
        <><b>{zoom.nameOf(c.id)}:</b>{c.text}</>
      ) : (
        <span style={{ color: "#bbb" }}>Captions are on. Waiting for someone to speak...</span>
      )}
    </div>
  );
}

export function Stage() {
  const { zoom, narrow, setAnno } = useUI();
  const s = zoom.state;
  const ids = ordered(visibleIds(zoom), zoom.me);
  const share = s.share;
  // A whiteboard opens with the pen; closing a share puts the mouse back.
  const kind = share ? `${share.by}:${share.kind}` : "";
  useLayoutEffect(() => {
    setAnno({ tool: share?.kind === "whiteboard" ? "draw" : "mouse" });
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  let body: ReactNode;
  if (share && share.by !== zoom.me) body = <ShareView share={share} ids={ids} />;
  else if (share?.kind === "whiteboard") body = <WhiteboardView share={share} ids={ids} />;
  else if (narrow) body = <Phone ids={ids} />;
  else if (s.view === "speaker") body = <Speaker ids={ids} />;
  else body = <Gallery ids={ids} />;
  return (
    <div className="stage">
      {body}
      {s.captions ? <Captions /> : null}
    </div>
  );
}

/** Your own screen share: the screen with a green frame, the floating controls and the speaker's video. */
export function MyShare() {
  const ui = useUI();
  const { zoom, openModal, anno, setAnno } = ui;
  const s = zoom.state;
  const share = s.share;
  if (!share || share.by !== zoom.me || share.kind !== "screen") return null;
  const muted = s.muted.includes(zoom.me) || !s.audio;
  const video = s.video.includes(zoom.me);
  const focus = focusId(zoom, visibleIds(zoom));
  const b = (label: string, icon: ReactNode, onClick: (el: HTMLElement) => void, cls = "") => (
    <button className={`tbtn${cls ? ` ${cls}` : ""}`} onClick={(e) => onClick(e.currentTarget)}>
      <span className="ico">{icon}</span>
      <span className="lbl">{label}</span>
    </button>
  );
  return (
    <div className="myshare">
      <ScreenFit full>
        <ScreenContent share={share} />
        <AnnoCanvas surface="me" drawing={!!share.annotate && anno.tool !== "mouse"} />
        {share.paused ? <div className="paused-veil">Screen sharing paused</div> : null}
      </ScreenFit>
      <div className="frame" />
      <div className="sc-ctl">
        <div className={`sc-pill${share.paused ? " paused" : ""}`}>
          <span className="id">Meeting ID: {zoom.seed.meeting.id}</span>
          <span className="dot" />
          <span>{share.paused ? "Your screen sharing is paused" : "You are screen sharing"}</span>
          <button className="sc-stop" onClick={zoom.ui.stopShare}>Stop Share</button>
        </div>
        <div className="sc-bar">
          {b(muted ? "Unmute" : "Mute", muted ? <span className="off"><I.MicOff /></span> : <I.Mic />, zoom.ui.toggleMic)}
          {b(video ? "Stop Video" : "Start Video", video ? <I.Video /> : <span className="off"><I.VideoOff /></span>, zoom.ui.toggleVideo)}
          {b("Participants", <><I.People /><span className="cnt">{s.people.length}</span></>, () => zoom.ui.togglePanel("participants", ui.narrow))}
          {b("New Share", <span className="share-ico"><I.ArrowUp /></span>, () => openModal({ type: "share" }))}
          {b(share.paused ? "Resume Share" : "Pause Share", share.paused ? <I.Play /> : <I.Pause />, zoom.ui.pauseShare)}
          {b("Annotate", <I.Pen />, () => {
            zoom.ui.shareOption({ annotate: !share.annotate });
            setAnno({ tool: share.annotate ? "mouse" : "draw" });
          }, share.annotate ? "on" : "")}
          {b("Chat", <><I.Chat />{s.unread ? <span className="badge">{s.unread}</span> : null}</>, () => zoom.ui.togglePanel("chat", ui.narrow))}
          {b("More", <I.Dots />, (el) => openMoreMenu(ui, el, true))}
        </div>
      </div>
      {share.annotate ? <AnnoBar surface="me" bottom /> : null}
      <div className="sc-float">
        <div className="fh"><span>{zoom.nameOf(focus)}</span><span><Elapsed from={s.startedAt} /></span></div>
        <Tile id={focus} />
      </div>
    </div>
  );
}
