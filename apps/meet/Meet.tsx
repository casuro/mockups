import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bar, ReactBar } from "./Bar";
import { Avatar, MeetContext, useUI, type DialogKind, type MeetUI, type MenuRequest, type Stroke } from "./context";
import { Dialogs } from "./Dialogs";
import * as I from "./icons";
import { Panel } from "./Panels";
import { Stage } from "./Stage";
import type { MeetCall, Snack as SnackData } from "./use-meet";
import "./meet.css";

// Google Meet's in-call screen, as in apps/meet.html. Give it a call from
// useMeet(); it fills the box it is put in (give that box a height), whether
// that is the whole screen or one pane of it, and narrows to Meet's phone
// layout when the box is narrow.

export interface MeetProps {
  meet: MeetCall;
  /**
   * Draws what someone is presenting, at 1280 x 720 (it is scaled to fit the
   * stage): a slide, a design file, a document. A plain placeholder when it is
   * left out or returns nothing.
   */
  renderScreen?: (presenter: string) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Meet({ meet, renderScreen, className, style }: MeetProps) {
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(false);
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [settingsTab, setSettingsTab] = useState<"audio" | "video" | "general">("audio");
  const [reactOpen, setReactOpen] = useState(false);
  const strokes = useRef<Stroke[]>([]);
  const { state } = meet;

  // Phone layout by the kit's own width, not the window's.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => setPhone(el.clientWidth < 760);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Leaving (and rejoining) closes whatever was open; a new call starts a blank whiteboard.
  useEffect(() => {
    setMenu(null);
    setDialog(null);
    setReactOpen(false);
    if (state.view === "call") strokes.current = [];
  }, [state.view]);

  const openMenu = useCallback((m: MenuRequest) => setMenu((cur) => (cur?.anchor === m.anchor ? null : m)), []);
  const closeMenu = useCallback(() => setMenu(null), []);
  const openDialog = useCallback((kind: DialogKind | null, tab?: "audio" | "video" | "general") => {
    setMenu(null);
    setDialog(kind);
    if (tab) setSettingsTab(tab);
  }, []);
  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) return void document.exitFullscreen();
      const p = root.current?.requestFullscreen?.();
      if (!p) return meet.ui.snack("Full screen isn't available in this browser");
      p.catch(() => meet.ui.snack("Full screen isn't available here. Use your browser's full screen mode instead."));
    } catch {
      meet.ui.snack("Full screen isn't available here. Use your browser's full screen mode instead.");
    }
  }, [meet.ui]);

  // Meet's shortcuts: ⌘D mic, ⌘E camera, Ctrl+⌘H hand, Ctrl+Alt+C chat, Ctrl+Alt+P people, C captions, Esc closes the top-most thing.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const s = meet.state;
    const typing = (e.target as HTMLElement | null)?.closest?.("input, textarea, select");
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    const call = s.view === "call";
    if (call && mod && !e.altKey && !e.shiftKey && k === "d") return e.preventDefault(), meet.ui.setMic(!s.mic);
    if (call && mod && !e.altKey && !e.shiftKey && k === "e") return e.preventDefault(), meet.ui.setCamera(!s.camera);
    if (call && k === "h" && e.ctrlKey && (e.metaKey || e.altKey)) return e.preventDefault(), meet.ui.toggleHand();
    if (call && e.ctrlKey && e.altKey && k === "c") return e.preventDefault(), s.panel !== "chat" && meet.ui.openPanel("chat");
    if (call && e.ctrlKey && e.altKey && k === "p") return e.preventDefault(), s.panel !== "people" && meet.ui.openPanel("people");
    if (call && !typing && !mod && !e.altKey && k === "c") return meet.ui.toggleCaptions();
    if (e.key === "Escape") {
      if (menu) return setMenu(null);
      if (dialog) return setDialog(null);
      if (reactOpen) return setReactOpen(false);
      if (call && s.activity) return meet.ui.openActivity(null);
      if (call && s.panel) return meet.ui.openPanel(null);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: MeetUI = {
    meet,
    root,
    phone,
    renderScreen,
    openMenu,
    closeMenu,
    dialog,
    settingsTab,
    openDialog,
    reactOpen,
    setReactOpen,
    strokes,
    toggleFullscreen,
  };

  return (
    <MeetContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-meet${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onPointerDown={(e) => {
          const t = e.target as HTMLElement;
          if (menu && !t.closest(".menu") && !menu.anchor.contains(t)) setMenu(null);
          if (reactOpen && !t.closest(".reactbar, [data-react-toggle]")) setReactOpen(false);
        }}
      >
        {state.view === "call" ? (
          <div className="call">
            <div className="c-main">
              <Stage />
              <Panel />
            </div>
            <ReactBar />
            <ChatNotif />
            <Bar />
          </div>
        ) : (
          <LeftScreen />
        )}
        <Dialogs />
        {menu ? <Menu menu={menu} /> : null}
        <Snacks />
        <Tooltip />
      </div>
    </MeetContext.Provider>
  );
}

function Menu({ menu }: { menu: MenuRequest }) {
  const { root, closeMenu } = useUI();
  const el = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const box = root.current?.getBoundingClientRect();
    const m = el.current;
    if (!box || !m) return;
    const r = menu.anchor.getBoundingClientRect();
    const mw = m.offsetWidth;
    const mh = m.offsetHeight;
    const x = r.left - box.left;
    const y = r.top - box.top;
    let left = menu.align === "right" ? x + r.width - mw : menu.align === "center" ? x + r.width / 2 - mw / 2 : x;
    left = Math.max(8, Math.min(left, box.width - mw - 8));
    let top = menu.up ? y - mh - 8 : y + r.height + 4;
    if (top + mh > box.height - 8) top = Math.max(8, y - mh - 8);
    if (top < 8) top = 8;
    setPos({ left, top });
  }, [menu, root]);
  return (
    <div className="menu" role="menu" ref={el} style={pos ? pos : { visibility: "hidden", left: 0, top: 0 }}>
      {menu.items.map((it, i) =>
        it === "-" ? (
          <div key={i} className="msep" />
        ) : "head" in it ? (
          <div key={i} className="mh">{it.head}</div>
        ) : (
          <button
            key={i}
            className="mi"
            role="menuitem"
            onClick={() => {
              closeMenu();
              it.run();
            }}
          >
            {it.icon ?? null}
            <span className="grow">{it.label}{it.sub ? <small>{it.sub}</small> : null}</span>
            {it.check ? <span className="ck"><I.Check /></span> : null}
          </button>
        )
      )}
    </div>
  );
}

function Snack({ snack }: { snack: SnackData }) {
  const { meet } = useUI();
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 4500);
    const t2 = setTimeout(() => meet.ui.dismiss(snack.id), 4720);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [meet.ui, snack.id]);
  return (
    <div className={`snack${out ? " out" : ""}`} role="status">
      {snack.who ? <Avatar id={snack.who} size={28} /> : null}
      <span className="txt">{snack.text}</span>
      {snack.action ? (
        <button
          className="act"
          onClick={() => {
            snack.action!.run();
            meet.ui.dismiss(snack.id);
          }}
        >
          {snack.action.label}
        </button>
      ) : null}
    </div>
  );
}

function Snacks() {
  const { meet } = useUI();
  return (
    <div className="snacks" aria-live="polite">
      {meet.snacks.map((s) => <Snack key={s.id} snack={s} />)}
    </div>
  );
}

/** A preview of a chat message that arrives while the chat is closed. */
function ChatNotif() {
  const { meet } = useUI();
  const n = meet.notif;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!n) return setShown(false);
    setShown(true);
    const t = setTimeout(() => setShown(false), 6000);
    return () => clearTimeout(t);
  }, [n]);
  if (!n || !shown || meet.state.panel === "chat") return null;
  return (
    <div className="chat-notif" role="status" onClick={() => meet.ui.openPanel("chat")}>
      <Avatar id={n.from} size={32} />
      <div style={{ minWidth: 0 }}>
        <b>{meet.people[n.from]?.name ?? n.from}</b>
        <p>{n.text}</p>
      </div>
    </div>
  );
}

const RATINGS = ["Very bad", "Poor", "Okay", "Good", "Excellent"];

function LeftScreen() {
  const { meet } = useUI();
  const rejoin = useRef<HTMLButtonElement>(null);
  const { rating } = meet.state;
  useEffect(() => rejoin.current?.focus(), []);
  return (
    <div className="left-ov">
      <div className="left-card" role="dialog" aria-label="You left the meeting">
        <h1>You left the meeting</h1>
        <div className="sub">{meet.seed.meeting.title}</div>
        <div className="btns"><button className="btn filled" ref={rejoin} onClick={() => meet.ui.rejoin()}>Rejoin</button></div>
        <div className="rate">
          <h3>How was the audio and video?</h3>
          <div className="stars" role="radiogroup" aria-label="Call quality">
            {RATINGS.map((l, i) => (
              <button key={l} className={i < rating ? "on" : ""} role="radio" aria-checked={rating === i + 1} aria-label={l} data-tip={l} onClick={() => meet.ui.rate(i + 1)}>
                <I.Star />
              </button>
            ))}
          </div>
          {rating ? (
            <div className="thanks">Thanks for letting us know. Rated &quot;{RATINGS[rating - 1]}&quot;.</div>
          ) : (
            <div className="scale"><span>Very bad</span><span>Excellent</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Meet's dark tooltip on anything with a `data-tip`, after a short hover. */
function Tooltip() {
  const { root } = useUI();
  const [tip, setTip] = useState<{ text: string; left: number; top: number; anchor: HTMLElement } | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const place = useRef<{ anchor: HTMLElement; text: string } | null>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hide = () => {
      clearTimeout(timer);
      place.current = null;
      setTip(null);
    };
    const over = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (!t) return hide();
      if (place.current?.anchor === t) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!t.isConnected || host.querySelector(".menu")) return;
        place.current = { anchor: t, text: t.dataset.tip ?? "" };
        setTip({ text: t.dataset.tip ?? "", left: -9999, top: -9999, anchor: t });
      }, 450);
    };
    const out = (e: MouseEvent) => {
      const from = (e.target as HTMLElement).closest("[data-tip]");
      const to = (e.relatedTarget as HTMLElement | null)?.closest?.("[data-tip]");
      if (from && from !== to) hide();
    };
    host.addEventListener("mouseover", over);
    host.addEventListener("mouseout", out);
    host.addEventListener("pointerdown", hide);
    const gone = setInterval(() => place.current && !place.current.anchor.isConnected && hide(), 300);
    return () => {
      clearTimeout(timer);
      clearInterval(gone);
      host.removeEventListener("mouseover", over);
      host.removeEventListener("mouseout", out);
      host.removeEventListener("pointerdown", hide);
    };
  }, [root]);

  // Measure, then sit above the anchor in the lower half of the app and below it in the upper half.
  useLayoutEffect(() => {
    if (!tip || tip.left !== -9999) return;
    const box = root.current?.getBoundingClientRect();
    const t = el.current;
    if (!box || !t) return;
    const r = tip.anchor.getBoundingClientRect();
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    const above = r.top - box.top > box.height / 2;
    setTip({
      ...tip,
      left: Math.max(8, Math.min(r.left - box.left + r.width / 2 - w / 2, box.width - w - 8)),
      top: above ? r.top - box.top - h - 8 : r.bottom - box.top + 8,
    });
  }, [tip, root]);

  return (
    <div ref={el} className={`tip${tip && tip.left !== -9999 ? " show" : ""}`} role="tooltip" style={tip ? { left: tip.left, top: tip.top } : undefined}>
      {tip?.text ?? ""}
    </div>
  );
}
