import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Avatar, Stack, useUI, type MenuItem } from "./context";
import * as I from "./icons";
import type { MeetRoom } from "./types";

// The call's stage: camera feeds and tiles, the four layouts (and pinning),
// a presentation with the strip of people beside it, the whiteboard,
// captions, floating reactions and the recording chips.

export const SCENES = [
  { id: "office", name: "Office", css: "linear-gradient(180deg, transparent 58%, #8c6a4a 58%), linear-gradient(90deg, #efe4d4 0 62%, #cfe3f2 62% 88%, #efe4d4 88%)" },
  { id: "beach", name: "Beach", css: "linear-gradient(180deg, #8fd3f4 0%, #d4f0fa 44%, #3aa7c9 44%, #2a8fb0 62%, #f2d8a7 62%, #e8c98f 100%)" },
  { id: "mountains", name: "Mountains", css: "linear-gradient(155deg, transparent 58%, #35574a 58%), linear-gradient(210deg, transparent 52%, #5c8374 52%), linear-gradient(180deg, #f9c58d, #f7a6c5)" },
  { id: "night", name: "Night sky", css: "radial-gradient(circle at 18% 22%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 72% 18%, #fff 0 1px, transparent 2px), radial-gradient(circle at 44% 38%, #fff 0 1px, transparent 2px), radial-gradient(circle at 86% 46%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 30% 64%, #fff 0 1px, transparent 2px), radial-gradient(circle at 62% 80%, #fff 0 1px, transparent 2px), radial-gradient(circle at 80% 20%, #fff7cf 0 18px, transparent 19px), linear-gradient(#0b1026, #2b3a67)" },
  { id: "forest", name: "Forest", css: "linear-gradient(100deg, transparent 20%, rgba(34,70,40,.55) 20% 24%, transparent 24% 70%, rgba(34,70,40,.55) 70% 75%, transparent 75%), linear-gradient(180deg, #d9efd4, #86b882 65%, #3f6b3f)" },
  { id: "bokeh", name: "Bokeh", css: "radial-gradient(circle at 20% 30%, rgba(255,179,193,.9) 0 11%, transparent 12%), radial-gradient(circle at 76% 62%, rgba(160,196,255,.9) 0 15%, transparent 16%), radial-gradient(circle at 58% 20%, rgba(255,236,179,.9) 0 8%, transparent 9%), linear-gradient(135deg, #ffd6a5, #bdb2ff)" },
  { id: "studio", name: "Studio", css: "radial-gradient(ellipse at 50% 38%, #7a7a7a, #1f1f1f 75%)" },
  { id: "brand", name: "Brand", css: "radial-gradient(circle at 85% 15%, rgba(255,255,255,.18) 0 22%, transparent 23%), linear-gradient(135deg, #0b57d0, #5b3fd0)" },
  { id: "library", name: "Library", css: "repeating-linear-gradient(90deg, #7b3f2a 0 14px, #2f5d8a 14px 26px, #c9a227 26px 34px, #3f6b3f 34px 48px, #5c2a50 48px 58px), linear-gradient(#000, #000)" },
];
export const FILTERS = [
  { id: "none", name: "None", css: "none" },
  { id: "warm", name: "Warm", css: "sepia(.25) saturate(1.35) hue-rotate(-8deg)" },
  { id: "cool", name: "Cool", css: "saturate(.9) hue-rotate(14deg) brightness(1.04)" },
  { id: "mono", name: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "vivid", name: "Vivid", css: "saturate(1.6) contrast(1.06)" },
  { id: "vintage", name: "Vintage", css: "sepia(.55) contrast(.92) brightness(1.05)" },
];

/** The room behind a face: the photos are tight head crops, so each feed is a soft cut-out over a drawn room. */
function roomCSS({ wall: [w1, w2], side, kind }: MeetRoom) {
  const L = side === "left";
  const at = (l: string, r: string) => (L ? l : r);
  const books = "#b5533c 0 5%, #3d6e9e 5% 9%, #d9a63a 9% 12%, #5b7f4a 12% 16.5%, #7a4b6d 16.5% 20%, #c9c1b3 20% 22%, #2f4f6f 22% 26%, #a0522d 26% 29%";
  const plant = `radial-gradient(ellipse closest-side, #5d8a4e 0 80%, #4a7340 81% 96%, transparent 100%) ${at("93%", "7%")} 60% / 11% 20% no-repeat, linear-gradient(#b0714f, #8f5a3e) ${at("90.7%", "9.3%")} 72.5% / 6% 9% no-repeat`;
  const wall = `linear-gradient(180deg, ${w1}, ${w2})`;
  if (kind === "window")
    return [
      `repeating-linear-gradient(90deg, ${books}) ${at("90%", "10%")} 30% / 17% 13% no-repeat`,
      `linear-gradient(#7b5d43, #7b5d43) ${at("90.6%", "9.4%")} 44.5% / 19% 2.5% no-repeat`,
      plant,
      `linear-gradient(180deg, #eef6fd, #cfe3f2) ${at("7%", "93%")} 16% / 19% 44% no-repeat`,
      `linear-gradient(#f6f3ee, #f6f3ee) ${at("6.2%", "93.8%")} 14% / 20.6% 48% no-repeat`,
      wall,
    ].join(", ");
  if (kind === "art")
    return [
      `linear-gradient(135deg, #f4b183, #e06666 45%, #6fa8dc) ${at("12%", "88%")} 22% / 15% 24% no-repeat`,
      `linear-gradient(#3b3b3b, #3b3b3b) ${at("11.6%", "88.4%")} 20.6% / 16.6% 27% no-repeat`,
      `linear-gradient(#f3e3c3, #e2c48f) ${at("91%", "9%")} 40% / 9% 11% no-repeat`,
      `linear-gradient(#4a4a4a, #4a4a4a) ${at("90.1%", "9.9%")} 72% / .8% 30% no-repeat`,
      `linear-gradient(#4a4a4a, #4a4a4a) ${at("90.6%", "9.4%")} 90% / 6% 1.6% no-repeat`,
      wall,
    ].join(", ");
  return [
    `repeating-linear-gradient(180deg, transparent 0 16%, #6b4f3a 16% 19%) ${at("6%", "94%")} 30% / 22% 78% no-repeat`,
    `repeating-linear-gradient(90deg, ${books}) ${at("6%", "94%")} 30% / 22% 78% no-repeat`,
    `linear-gradient(#6b4f3a, #6b4f3a) ${at("5.4%", "94.6%")} 30% / 23.6% 82% no-repeat`,
    plant,
    wall,
  ].join(", ");
}

/** Someone's camera: their face over their room. Yours is mirrored and wears your background and filter. */
export function Feed({ id, background, filter }: { id: string; background?: string; filter?: string }) {
  const { meet } = useUI();
  const p = meet.people[id];
  const self = id === meet.me;
  const bg = self ? (background ?? meet.state.background) : "none";
  const fcss = self ? (FILTERS.find((f) => f.id === (filter ?? meet.state.filter))?.css ?? "none") : "none";
  const back = bg === "none" || bg === "slight" || bg === "blur" ? roomCSS(p.room) : (SCENES.find((s) => s.id === bg)?.css ?? roomCSS(p.room));
  const blur = bg === "blur" ? 18 : bg === "slight" ? 7 : 0;
  const bdFilter = [blur ? `blur(${blur}px)` : "", fcss === "none" ? "" : fcss].join(" ").trim();
  return (
    <div className={`feed${self ? " mirror" : ""}`}>
      <div className="bd" style={{ background: back, filter: bdFilter || undefined }} />
      <img className="fg" src={p.photo} alt="" style={fcss === "none" ? undefined : { filter: fcss }} />
    </div>
  );
}

/** Observes an element's size. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function Tile({ id, small, className = "", style }: { id: string; small?: boolean; className?: string; style?: CSSProperties }) {
  const { meet, openMenu } = useUI();
  const { state, me, people } = meet;
  const self = id === me;
  const video = (self ? state.camera : state.video.includes(id)) && !!people[id]?.photo;
  const muted = self ? !state.mic : state.muted.includes(id);
  const hand = state.hands.indexOf(id);
  const pinned = state.pinned === id;
  const first = people[id]?.first ?? id;

  const menu = (anchor: HTMLElement) => {
    const items: MenuItem[] = [{ icon: <I.Pin />, label: pinned ? "Unpin" : "Pin to the main screen", run: () => meet.ui.pin(id, false) }];
    if (!self && !state.muted.includes(id)) items.push({ icon: <I.MicOff />, label: `Mute ${first}`, run: () => meet.ui.mute(id) });
    if (!self && hand >= 0) items.push({ icon: <I.Hand />, label: "Lower hand", run: () => meet.ui.lowerHand(id) });
    if (self) items.push({ icon: <I.Sparkle />, label: "Apply visual effects", run: () => meet.ui.openPanel("effects") });
    if (!self) items.push("-", { icon: <I.RemoveCircle />, label: "Remove from the call", run: () => meet.ui.remove(id) });
    openMenu({ anchor, items, align: "right" });
  };

  return (
    <div className={`tile${small ? " small" : ""}${pinned ? " pinned" : ""}${meet.speakers.includes(id) ? " speaking" : ""}${className ? ` ${className}` : ""}`} style={style}>
      {video ? <Feed id={id} /> : <div className="noav"><Avatar id={id} size={96} /></div>}
      {hand >= 0 ? <span className="t-hand"><I.Hand />{state.hands.length > 1 ? hand + 1 : ""}</span> : null}
      {muted ? <span className="t-audio muted" aria-label="Muted"><I.MicOff /></span> : <span className="t-audio live"><I.Bars /></span>}
      <span className="t-name">{self ? "You" : people[id]?.name}</span>
      <div className="t-hover">
        <button className="pin" data-tip={pinned ? "Unpin" : `Pin ${self ? "yourself" : first}`} aria-label={pinned ? "Unpin" : `Pin ${self ? "yourself" : first}`} onClick={() => meet.ui.pin(id)}><I.Pin /></button>
        <button data-tip={`More options for ${self ? "you" : first}`} aria-label={`More options for ${self ? "you" : first}`} onClick={(e) => menu(e.currentTarget)}><I.More /></button>
      </div>
    </div>
  );
}

/** Tiles in the largest 16:9 grid that fits (a phone stacks them in one or two columns). */
function Grid({ ids, inSide }: { ids: string[]; inSide?: boolean }) {
  const { phone } = useUI();
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const n = ids.length;
  const gap = 8;
  let best = { w: 0, h: 0 };
  if (phone && !inSide) {
    const cols = n <= 3 ? 1 : 2;
    const rows = Math.ceil(n / cols);
    best = { w: (W - gap * (cols - 1)) / cols, h: (H - gap * (rows - 1)) / rows };
  } else
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const w = Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows) * 16 / 9);
      if (w > best.w) best = { w, h: (w * 9) / 16 };
    }
  const vars = { "--tw": `${Math.floor(best.w)}px`, "--th": `${Math.floor(best.h)}px` } as CSSProperties;
  return (
    <div className="grid" ref={ref} style={vars}>
      {ids.map((id) => <Tile key={id} id={id} />)}
    </div>
  );
}

/** The column (or, when narrow, row) of small tiles beside the main view; what does not fit becomes "N others". */
function Strip({ ids, narrow }: { ids: string[]; narrow: boolean }) {
  const { meet } = useUI();
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const fit = w ? Math.max(2, Math.floor((h + 8) / ((w * 9) / 16 + 8))) : Infinity;
  const overflow = !narrow && ids.length > fit;
  const shown = overflow ? ids.slice(0, fit - 1) : ids;
  const rest = overflow ? ids.slice(fit - 1) : [];
  return (
    <div className="strip" ref={ref}>
      <div className="strip-fit">
        {shown.map((id) => <Tile key={id} id={id} small />)}
        {rest.length ? (
          <div className="tile small more-tile" role="button" tabIndex={0} aria-label={`${rest.length} more people`} onClick={() => meet.ui.openPanel("people")} onKeyDown={(e) => e.key === "Enter" && meet.ui.openPanel("people")}>
            <div>
              <Stack ids={rest} max={2} size={36} />
              <b>{rest.length} other{rest.length > 1 ? "s" : ""}</b>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Pip() {
  const { meet } = useUI();
  return (
    <div className="pip">
      <Tile id={meet.me} small style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

/** Someone else's screen, drawn by `renderScreen` at 1280 x 720 and scaled to fit, letterboxed. */
function Screen({ presenter }: { presenter: string }) {
  const { meet, renderScreen } = useUI();
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const s = Math.min(w / 1280, h / 720) || 0;
  const name = meet.people[presenter]?.name ?? presenter;
  return (
    <div className="pres-wrap" ref={ref}>
      <div className="screen-box" aria-label="Shared screen" style={{ transform: `scale(${s})`, left: (w - 1280 * s) / 2, top: (h - 720 * s) / 2 }}>
        {renderScreen?.(presenter) ?? <div className="pres-default"><I.Present />{name}&apos;s screen</div>}
      </div>
      <span className="pres-label"><I.Present />{name} (Presenting)</span>
    </div>
  );
}

const BOARD_COLORS = ["#1a73e8", "#d93025", "#188038", "#f9ab00", "#202124"];

function Whiteboard() {
  const { meet, strokes } = useUI();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [hint, setHint] = useState(() => !strokes.current.length);
  const current = useRef<(typeof strokes.current)[number] | null>(null);

  const draw = () => {
    const cv = canvas.current;
    const x = cv?.getContext("2d");
    if (!cv || !x) return;
    const W = cv.width;
    const H = cv.height;
    const dpr = devicePixelRatio || 1;
    x.clearRect(0, 0, W, H);
    x.lineCap = x.lineJoin = "round";
    for (const s of strokes.current) {
      x.strokeStyle = s.color;
      x.lineWidth = s.width * dpr;
      x.beginPath();
      s.points.forEach(([a, b], i) => (i ? x.lineTo(a * W, b * H) : x.moveTo(a * W, b * H)));
      if (s.points.length === 1) x.lineTo(s.points[0][0] * W + 0.1, s.points[0][1] * H);
      x.stroke();
    }
  };

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = devicePixelRatio || 1;
      if (!r.width) return;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pt = (e: PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  return (
    <div className="pres-wrap">
      <div className="board">
        <div className="dots-bg" />
        <canvas
          ref={canvas}
          aria-label="Whiteboard drawing area"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            current.current = { color: tool === "eraser" ? "#ffffff" : color, width: tool === "eraser" ? 24 : 3, points: [pt(e)] };
            strokes.current.push(current.current);
            setHint(false);
            draw();
          }}
          onPointerMove={(e) => {
            if (!current.current) return;
            current.current.points.push(pt(e));
            draw();
          }}
          onPointerUp={() => {
            // A finished stroke is reported: what is drawn cannot be read off the canvas.
            if (current.current) meet.ui.emit({ type: "draw", tool, strokes: strokes.current.length });
            current.current = null;
          }}
          onPointerCancel={() => (current.current = null)}
        />
        {hint ? <div className="board-hint">Draw anywhere</div> : null}
        <div className="board-head">
          Whiteboard
          <button onClick={() => { strokes.current.length = 0; draw(); }}>Clear</button>
          <button onClick={() => meet.ui.stopPresenting(true)}>Close</button>
        </div>
        <div className="board-tools">
          <button className={tool === "pen" ? "on" : ""} aria-label="Pen" onClick={() => setTool("pen")}><I.Draw /></button>
          <button className={tool === "eraser" ? "on" : ""} aria-label="Eraser" onClick={() => setTool("eraser")}><I.Eraser /></button>
          {BOARD_COLORS.map((c) => (
            <button key={c} className={tool === "pen" && color === c ? "on" : ""} aria-label={`Color ${c}`} onClick={() => { setTool("pen"); setColor(c); }}>
              <span className="sw" style={{ background: c }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Presentation() {
  const { meet } = useUI();
  const { presenter, sharing } = meet.state;
  if (!presenter) return null;
  if (presenter === meet.me && sharing === "whiteboard") return <Whiteboard />;
  if (presenter === meet.me)
    return (
      <div className="pres-wrap">
        <div className="you-pres">
          <div className="big"><I.Present /></div>
          <h3>You are presenting to everyone</h3>
          <p>Everyone in the call can see your entire screen. Be mindful of notifications and other windows.</p>
          <button className="stop-btn" onClick={() => meet.ui.stopPresenting()}><I.StopPresent />Stop presenting</button>
        </div>
      </div>
    );
  return <Screen presenter={presenter} />;
}

/** Captions, typed out word by word like Meet's. */
function Captions() {
  const { meet } = useUI();
  const cap = meet.captionLine;
  const [text, setText] = useState("");
  const [who, setWho] = useState<string | null>(null);
  const queue = useRef<string[]>([]);
  const seen = useRef(cap?.n ?? 0);

  useEffect(() => {
    if (!cap || cap.n === seen.current) return;
    seen.current = cap.n;
    if (cap.who !== who) {
      setWho(cap.who);
      setText("");
      queue.current = [];
    }
    queue.current.push(...cap.text.split(/\s+/).filter(Boolean));
  }, [cap, who]);

  useEffect(() => {
    const t = setInterval(() => {
      const word = queue.current.shift();
      if (!word) return;
      setText((s) => {
        const next = s ? `${s} ${word}` : word;
        return next.length > 260 ? next.slice(-200).replace(/^\S*\s/, "") : next;
      });
    }, 170);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="captions">
      {who ? (
        <>
          <Avatar id={who} size={32} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="cap-name">{meet.people[who]?.name ?? who}</div>
            <div className="cap-box"><span className="cap-text">{text}</span></div>
          </div>
        </>
      ) : (
        <span className="cap-empty">Captions are on. They&apos;ll appear here when someone speaks.</span>
      )}
    </div>
  );
}

function FloatingReaction({ emoji, from }: { emoji: string; from: string }) {
  const { meet } = useUI();
  const [left] = useState(() => 12 + Math.random() * 110);
  return (
    <div className="fl-r" style={{ left }}>
      <span className="e">{emoji}</span>
      <span className="n">{from === meet.me ? "You" : (meet.people[from]?.name ?? from)}</span>
    </div>
  );
}

export function Stage() {
  const { meet, phone } = useUI();
  const { state, me } = meet;
  const [ref, { w }] = useSize<HTMLDivElement>();
  const narrow = phone || (w > 0 && w < 720);

  let all = [me, ...state.inCall];
  if (state.hideNoVideo) all = all.filter((p) => p === me || state.video.includes(p) || state.hands.includes(p));
  const everyone = [me, ...state.inCall];
  const pinned = state.pinned && everyone.includes(state.pinned) ? state.pinned : null;
  const others = all.filter((p) => p !== me);
  const lead = pinned ?? (meet.dominant && others.includes(meet.dominant) ? meet.dominant : others[0]);

  let body: ReactNode;
  const side = (main: ReactNode, strip: string[] | null) => (
    <div className={`lay-side${narrow ? " narrow" : ""}`}>
      <div className="main">{main}</div>
      {strip ? <Strip ids={strip} narrow={narrow} /> : null}
    </div>
  );
  if (state.presenter) {
    body = state.layout === "spotlight" ? <>{side(<Presentation />, null)}<Pip /></> : side(<Presentation />, all);
  } else {
    let layout = state.layout;
    if (pinned && layout !== "sidebar") layout = "spotlight";
    if (layout === "auto") layout = all.length === 2 ? "spotlight" : "tiled";
    if (layout === "spotlight" && lead) body = <><Grid ids={[lead]} />{lead !== me ? <Pip /> : null}</>;
    else if (layout === "sidebar" && lead) body = side(<Grid ids={[lead]} inSide />, all.filter((p) => p !== lead));
    else body = <Grid ids={all} />;
  }

  return (
    <div className={`stage${state.captions ? " cap-on" : ""}`} ref={ref}>
      <div className="stage-inner">
        {body}
        {state.recording || state.transcript ? (
          <div className="chips">
            {state.recording ? <span className="chip-rec">REC</span> : null}
            {state.transcript ? <span className="chip-rec tr">Transcript</span> : null}
          </div>
        ) : null}
        {state.presenter === me && state.sharing !== "whiteboard" ? (
          <div className="banner">
            <I.Present style={{ width: 18, height: 18, color: "#8ab4f8" }} />
            You are presenting
            <button className="stop-btn" onClick={() => meet.ui.stopPresenting()}>Stop presenting</button>
          </div>
        ) : null}
      </div>
      <div className="floats">
        {meet.floats.map((f) => <FloatingReaction key={f.id} emoji={f.emoji} from={f.from} />)}
      </div>
      {state.captions ? <Captions /> : null}
    </div>
  );
}
