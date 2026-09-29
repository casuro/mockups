import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode, type RefObject } from "react";
import * as I from "./icons";
import type { DesktopWindow, Launcher, User } from "./types";
import type { WindowsDesktop } from "./use-windows";
import "./windows.css";

// A Windows 11 desktop that fills its box: Bloom wallpaper, a centered
// taskbar, Start with search, and windows that drag, resize, snap, minimize
// to the taskbar and hold any React content. Under 760px wide, Start is the
// home screen and windows open full screen.

export interface WindowsProps {
  desktop: WindowsDesktop;
  /** Apps in Start, in order. */
  apps?: Launcher[];
  /** App ids pinned to the taskbar. Default: every app. */
  pinned?: string[];
  user?: User;
  /** Draws a window that was opened without `content`. */
  renderWindow?: (win: DesktopWindow) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const DesktopContext = createContext<WindowsDesktop | null>(null);
/** The desktop, from inside a window's content: open more windows, toast, change the theme. */
export function useDesktop() {
  const d = useContext(DesktopContext);
  if (!d) throw new Error("useDesktop() must be used inside <Windows>");
  return d;
}

const TASKBAR = 48;

export function Windows({ desktop, apps = [], pinned, user = { name: "User" }, renderWindow, className, style }: WindowsProps) {
  const root = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<string | null>(null);
  const [asleep, setAsleep] = useState(false);
  const { windows, activeId, startOpen } = desktop;

  useLayoutEffect(() => {
    const el = root.current!;
    const measure = () => desktop.setBounds(el.clientWidth, el.clientHeight - TASKBAR);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [desktop.setBounds]);

  // A click inside a window's iframe never reaches the page: focus that window when focus moves into it.
  useEffect(() => {
    const onBlur = () =>
      setTimeout(() => {
        const win = document.activeElement?.closest<HTMLElement>("[data-kw-window]");
        if (!win || !root.current?.contains(win)) return;
        desktop.setStartOpen(false);
        desktop.focus(win.dataset.kwWindow!);
      });
    addEventListener("blur", onBlur);
    return () => removeEventListener("blur", onBlur);
  }, [desktop.setStartOpen, desktop.focus]);

  const launch = (app: Launcher) => {
    desktop.emit({ type: "launch", app: app.id });
    if (app.window) desktop.open({ id: app.id, title: app.name, icon: app.icon, app: app.id, ...app.window() });
    desktop.setStartOpen(false);
  };
  const byId = new Map(apps.map((a) => [a.id, a]));
  const bar = [...(pinned ?? apps.map((a) => a.id)).map((id) => byId.get(id)).filter((a): a is Launcher => !!a)];
  const extra = windows.filter((w) => !bar.some((a) => a.id === w.app));

  const taskbarClick = (appId: string, fallback?: Launcher) => {
    desktop.setStartOpen(false);
    const win = windows.filter((w) => w.app === appId).sort((a, b) => b.z - a.z)[0];
    if (!win) return fallback && launch(fallback);
    if (win.minimized) desktop.restore(win.id);
    else if (activeId === win.id) desktop.minimize(win.id);
    else desktop.focus(win.id);
  };

  const metaAlone = useRef(false);
  const onKeyDown = (e: KeyboardEvent) => {
    metaAlone.current = e.key === "Meta";
    if (e.ctrlKey && e.key === "Escape") desktop.setStartOpen(!startOpen);
    else if (e.key === "Escape") desktop.setStartOpen(false);
    else if ((e.altKey && e.key === "F4") || (e.ctrlKey && e.key.toLowerCase() === "w")) {
      if (!activeId) return;
      e.preventDefault();
      desktop.close(activeId);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Meta" && metaAlone.current) desktop.setStartOpen(!startOpen);
    metaAlone.current = false;
  };

  return (
    <DesktopContext.Provider value={desktop}>
      <div
        ref={root}
        className={["kit-windows", gesture && "kw-gesture", className].filter(Boolean).join(" ")}
        data-theme={desktop.theme}
        data-cursor={gesture ?? undefined}
        style={style}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerDown={(e) => {
          if (startOpen && !(e.target as Element).closest(".kw-start, .kw-start-btn")) desktop.setStartOpen(false);
        }}
      >
        <Bloom />
        <main className="kw-desktop">
          {windows.map((w) => (
            <Frame key={w.id} win={w} active={w.id === activeId} desktop={desktop} root={root} onGesture={setGesture}>
              {w.content ?? renderWindow?.(w)}
            </Frame>
          ))}
        </main>
        <nav className="kw-taskbar" aria-label="Taskbar">
          <div className="kw-tb-center">
            <button className={"kw-tb kw-start-btn" + (startOpen ? " open" : "")} aria-label="Start" onClick={() => desktop.setStartOpen(!startOpen)}>
              <I.StartLogo />
            </button>
            <button className="kw-tb kw-tb-search kw-start-btn" onClick={() => desktop.setStartOpen(true)}>
              <I.Search />
              <span>Search</span>
            </button>
            {bar.map((a) => (
              <TaskButton key={a.id} app={a.id} label={a.name} icon={a.icon} windows={windows} activeId={activeId} onClick={() => taskbarClick(a.id, a)} />
            ))}
            {extra.map((w) => (
              <TaskButton key={w.id} app={w.app} label={w.title} icon={w.icon} windows={windows} activeId={activeId} onClick={() => taskbarClick(w.app)} />
            ))}
          </div>
          <div className="kw-tray">
            <span className="kw-tray-btn" aria-label="Network, volume and battery">
              <I.Wifi />
              <I.Volume />
              <I.Battery />
            </span>
            <Clock />
          </div>
        </nav>
        <Start
          open={startOpen}
          apps={apps}
          user={user}
          onLaunch={launch}
          onSearch={(query) => desktop.emit({ type: "search", query })}
          onPower={() => {
            desktop.setStartOpen(false);
            desktop.emit({ type: "power" });
            setAsleep(true);
          }}
        />
        <div className="kw-toasts">
          {desktop.toasts.map((t) => (
            <button key={t.id} className="kw-toast" onClick={() => { desktop.emit({ type: "toast-click", id: t.id }); desktop.dismissToast(t.id); }}>
              <span className="kw-toast-h">{t.icon}{t.app ?? "Windows"}</span>
              <b>{t.title}</b>
              {t.body && <small>{t.body}</small>}
            </button>
          ))}
        </div>
        {asleep && <button className="kw-sleep" onClick={() => setAsleep(false)}>Click anywhere to wake</button>}
      </div>
    </DesktopContext.Provider>
  );
}

function TaskButton({ app, label, icon, windows, activeId, onClick }: { app: string; label: string; icon: ReactNode; windows: DesktopWindow[]; activeId: string | null; onClick: () => void }) {
  const mine = windows.filter((w) => w.app === app);
  const active = mine.some((w) => w.id === activeId && !w.minimized);
  return (
    <button className={"kw-tb" + (mine.length ? " running" : "") + (active ? " active" : "")} data-kw-app={app} aria-label={label} title={label} onClick={onClick}>
      {icon}
      <span className="kw-ind" />
    </button>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="kw-tray-btn kw-clock">
      <span>{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
      <span>{now.toLocaleDateString("en-US")}</span>
    </span>
  );
}

function Start({ open, apps, user, onLaunch, onSearch, onPower }: { open: boolean; apps: Launcher[]; user: User; onLaunch: (a: Launcher) => void; onSearch: (q: string) => void; onPower: () => void }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);
  const query = q.trim().toLowerCase();
  const list = apps.filter((a) => a.name.toLowerCase().includes(query));
  const initials = user.initials ?? user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <section className={"kw-flyout kw-start" + (open ? " open" : "")} aria-label="Start" aria-hidden={!open}>
      <label className="kw-search">
        <I.Search />
        <input
          ref={input}
          value={q}
          placeholder="Search for apps, settings, and documents"
          onChange={(e) => {
            setQ(e.target.value);
            onSearch(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && list[0] && onLaunch(list[0])}
        />
      </label>
      <div className="kw-sect">{query ? "Best match" : "Pinned"}</div>
      <div className="kw-grid">
        {list.map((a, i) => (
          <button key={a.id} className={"kw-tile kw-btn" + (query && i === 0 ? " hit" : "")} onClick={() => onLaunch(a)}>
            {a.icon}
            <span>{a.name}</span>
          </button>
        ))}
        {!list.length && <p className="kw-empty">No results for "{q.trim()}"</p>}
      </div>
      <footer className="kw-start-foot">
        <span className="kw-user">
          <span className="kw-avatar">{user.photo ? <img src={user.photo} alt="" /> : initials}</span>
          {user.name}
        </span>
        <button className="kw-power kw-btn" aria-label="Sleep" title="Sleep" onClick={onPower}>
          <I.Power />
        </button>
      </footer>
    </section>
  );
}

/** A window: title bar with caption buttons, drag, resize from edges and corners, minimize to its taskbar button. */
function Frame({ win, active, desktop, root, onGesture, children }: { win: DesktopWindow; active: boolean; desktop: WindowsDesktop; root: RefObject<HTMLDivElement | null>; onGesture: (g: string | null) => void; children: ReactNode }) {
  const el = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(win.minimized);
  const [animating, setAnimating] = useState(false);
  const was = useRef(win.minimized);

  // Fly to and from the taskbar button on minimize and restore
  useLayoutEffect(() => {
    if (was.current === win.minimized) return;
    was.current = win.minimized;
    const frame = el.current!, btn = root.current?.querySelector(`[data-kw-app="${CSS.escape(win.app)}"]`);
    if (!win.minimized) setHidden(false);
    if (!btn) return setHidden(win.minimized);
    const r = frame.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const keys = [{ transform: "none", opacity: 1 }, { transform: `translate(${b.left + b.width / 2 - r.left - r.width / 2}px, ${b.top - r.top - r.height / 2}px) scale(.12)`, opacity: 0 }];
    const anim = frame.animate(win.minimized ? keys : keys.reverse(), { duration: 240, easing: win.minimized ? "cubic-bezier(.5, 0, .9, .6)" : "cubic-bezier(.1, .9, .2, 1)" });
    if (win.minimized) anim.onfinish = () => setHidden(true);
  }, [win.minimized, win.app, root]);

  const toggleMax = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 240);
    desktop.toggleMaximize(win.id);
  };

  const track = (e: RPointerEvent, cursor: string, move: (dx: number, dy: number, ev: PointerEvent) => void, done?: (ev: PointerEvent) => void) => {
    const target = e.currentTarget as HTMLElement, sx = e.clientX, sy = e.clientY;
    target.setPointerCapture(e.pointerId);
    onGesture(cursor);
    const mv = (ev: PointerEvent) => move(ev.clientX - sx, ev.clientY - sy, ev);
    const up = (ev: PointerEvent) => {
      target.removeEventListener("pointermove", mv);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      onGesture(null);
      done?.(ev);
    };
    target.addEventListener("pointermove", mv);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const drag = (e: RPointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest(".kw-cap")) return;
    const box = root.current!.getBoundingClientRect();
    let ox = win.x, oy = win.y, moved = false;
    track(e, "move", (dx, dy) => {
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved && win.maximized) {
        // Pull a maximized window down: it restores under the pointer, keeping the grab point
        ox = Math.round(e.clientX - box.left - win.width * ((e.clientX - box.left) / box.width));
        oy = 0;
      }
      moved = true;
      desktop.place(win.id, {
        maximized: false,
        x: Math.min(Math.max(ox + dx, 96 - win.width), box.width - 96),
        y: Math.min(Math.max(oy + dy, 0), box.height - TASKBAR - 40),
      });
    }, (ev) => {
      if (moved && ev.clientY - box.top <= 2) toggleMax();
    });
  };

  const resize = (dir: string) => (e: RPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const r = { x: win.x, y: win.y, w: win.width, h: win.height }, MW = 360, MH = 240;
    const maxH = root.current!.clientHeight - TASKBAR - r.y;
    track(e, dir, (dx, dy) => {
      let { x, y, w, h } = r;
      if (dir.includes("e")) w = Math.max(MW, r.w + dx);
      if (dir.includes("s")) h = Math.max(MH, Math.min(r.h + dy, maxH));
      if (dir.includes("w")) { w = Math.max(MW, r.w - dx); x = r.x + r.w - w; }
      if (dir.includes("n")) { h = Math.max(MH, r.h - Math.max(dy, -r.y)); y = r.y + r.h - h; }
      desktop.place(win.id, { x, y, width: w, height: h });
    });
  };

  const cls = ["kw-win", active && "active", win.maximized && "max", hidden && "minimized", animating && "anim"].filter(Boolean).join(" ");
  return (
    <section
      ref={el}
      className={cls}
      data-kw-window={win.id}
      aria-label={win.title}
      style={win.maximized ? { zIndex: win.z } : { zIndex: win.z, left: win.x, top: win.y, width: win.width, height: win.height }}
      onPointerDownCapture={() => !active && desktop.focus(win.id)}
    >
      <header className="kw-titlebar" onPointerDown={drag} onDoubleClick={(e) => !(e.target as Element).closest(".kw-cap") && toggleMax()}>
        <span className="kw-t-ic">{win.icon}</span>
        <span className="kw-t-name">{win.title}</span>
        <button className="kw-cap" aria-label="Minimize" onClick={() => desktop.minimize(win.id)}><I.Minimize /></button>
        <button className="kw-cap" aria-label={win.maximized ? "Restore down" : "Maximize"} onClick={toggleMax}>{win.maximized ? <I.RestoreDown /> : <I.Maximize />}</button>
        <button className="kw-cap close" aria-label="Close" onClick={() => desktop.close(win.id)}><I.Close /></button>
      </header>
      <div className="kw-content">{children}</div>
      {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => <div key={d} className={"kw-rz kw-rz-" + d} onPointerDown={resize(d)} />)}
    </section>
  );
}

/** Windows 11 "Bloom": layered translucent petals around one point, drawn for the current theme. */
function Bloom() {
  const k = "kw" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const petal = (a: number, L: number, W: number, g: string) => (
    <g key={g + a} transform={`translate(1010 560) rotate(${a})`} filter={`url(#${k}sh)`}>
      <path fill={`url(#${k}${g})`} fillOpacity=".86" d={`M0 0C${L * .18} ${-W * 1.15} ${L * .72} ${-W * 1.35} ${L * .96} ${-W * .45}Q${L * 1.04} ${-W * .05} ${L * .9} ${W * .3}C${L * .66} ${W * .8} ${L * .22} ${W * .62} 0 0z`} />
      <path fill={`url(#${k}fold)`} d={`M0 0C${L * .18} ${-W * 1.15} ${L * .72} ${-W * 1.35} ${L * .96} ${-W * .45}C${L * .7} ${-W * .55} ${L * .3} ${-W * .35} 0 0z`} />
    </g>
  );
  const stops = (id: string, c: string[]) => (
    <linearGradient id={k + id} x1="0" y1="0" x2="1" y2=".3">
      {c.map((s, i) => <stop key={i} offset={i / 2} className={`kw-${id}${i}`} stopColor={s} />)}
    </linearGradient>
  );
  return (
    <svg className="kw-wallpaper" aria-hidden="true" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={k + "bg"} cx="52%" cy="52%" r="70%">
          {[0, .55, 1].map((o, i) => <stop key={o} offset={o} className={`kw-bg${i}`} />)}
        </radialGradient>
        {stops("o", ["#0b46b8", "#2d86ea", "#a9d6ff"])}
        {stops("i", ["#1a56cc", "#4a9ef2", "#cfe8ff"])}
        <linearGradient id={k + "fold"} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="kw-fold" stopOpacity="0" />
          <stop offset="1" className="kw-fold" stopOpacity=".5" />
        </linearGradient>
        <radialGradient id={k + "core"}>
          <stop offset="0" stopColor="#f2f9ff" />
          <stop offset="1" stopColor="#f2f9ff" stopOpacity="0" />
        </radialGradient>
        <filter id={k + "sh"} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
          <feOffset dy="6" />
          <feComponentTransfer><feFuncA type="linear" slope=".16" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="1920" height="1080" fill={`url(#${k}bg)`} />
      {[-200, -150, -100, -48, 2, 52, 104, 156].map((a, i) => petal(a, 640 - (i % 2) * 60, 150, "o"))}
      {[-175, -122, -72, -22, 28, 80, 132].map((a, i) => petal(a, 420 - (i % 2) * 40, 112, "i"))}
      {[-160, -88, -16, 56, 128].map((a) => petal(a, 220, 66, "i"))}
      <circle cx="1010" cy="560" r="90" fill={`url(#${k}core)`} />
    </svg>
  );
}
