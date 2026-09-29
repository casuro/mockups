import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import * as I from "./icons";
import type { LinuxApp, LinuxWindow } from "./types";
import type { LinuxDesktop } from "./use-linux";
import "./linux.css";

// An Ubuntu (GNOME 46) desktop, as in desktops/linux.html: top bar, Ubuntu
// Dock, app grid and windows that hold any React content. Give it a desktop
// from useLinux(); it fills the box it is put in (give that box a height),
// and under 760px wide it becomes an app grid whose apps open full screen.

export interface LinuxProps {
  linux: LinuxDesktop;
  /** The dock (apps with `dock !== false`) and the app grid (all of them). */
  apps?: LinuxApp[];
  /** Draws a window's content instead of `window.content`. */
  renderWindow?: (window: LinuxWindow) => ReactNode;
  /** Super opens the app grid, Escape closes it, Ctrl+W closes the focused window (default true). */
  keyboard?: boolean;
  className?: string;
  style?: CSSProperties;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Linux({ linux, apps = [], renderWindow, keyboard = true, className, style }: LinuxProps) {
  const { state } = linux;
  const [grid, setGrid] = useState(false);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toggles, setToggles] = useState({ wifi: true, bt: true });
  const area = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const now = useNow();
  useEffect(() => { if (grid) search.current?.focus(); }, [grid]);

  const showGrid = (on: boolean) => {
    setGrid(on);
    setQuery("");
    setMenu(false);
  };

  function launch(app: LinuxApp, fromDock = false) {
    showGrid(false);
    const w = state.windows.find((x) => x.id === app.id);
    if (w) {
      // The Ubuntu Dock: a click focuses the app's window, or minimizes it when already in front.
      if (fromDock && !w.minimized && state.focused === w.id) linux.minimize(w.id);
      else linux.focus(w.id);
      return;
    }
    linux.emit({ type: "launch", app: app.id });
    if (app.window) {
      const r = area.current?.getBoundingClientRect();
      const input = { title: app.name, icon: app.icon, ...app.window() };
      const width = Math.min(input.width ?? 720, (r?.width ?? 1200) - 48);
      const height = Math.min(input.height ?? 480, (r?.height ?? 800) - 32);
      const n = state.windows.length % 5;
      const x = input.x ?? Math.max(16, ((r?.width ?? 0) - width) / 2 - 60 + n * 32);
      const y = input.y ?? Math.max(12, ((r?.height ?? 0) - height) / 2 - 40 + n * 28);
      linux.open({ ...input, id: app.id, width, height, x, y });
    }
  }

  // Keyboard: Super alone toggles the app grid, as in GNOME.
  const keys = useRef({ grid, focused: state.focused, superOnly: false });
  keys.current.grid = grid;
  keys.current.focused = state.focused;
  const close = linux.close;
  useEffect(() => {
    if (!keyboard) return;
    const down = (e: KeyboardEvent) => {
      keys.current.superOnly = e.key === "Meta" || e.key === "OS";
      if (e.key === "Escape") { setGrid(false); setMenu(false); }
      const f = keys.current.focused;
      if (f && e.ctrlKey && e.key.toLowerCase() === "w") { e.preventDefault(); close(f); }
    };
    const up = (e: KeyboardEvent) => {
      if (keys.current.superOnly && (e.key === "Meta" || e.key === "OS")) { setGrid(!keys.current.grid); setQuery(""); }
      keys.current.superOnly = false;
    };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => { removeEventListener("keydown", down); removeEventListener("keyup", up); };
  }, [keyboard, close]);

  const q = query.trim().toLowerCase();
  const found = apps.filter((a) => a.name.toLowerCase().includes(q));
  const front = state.focused ? state.windows.find((w) => w.id === state.focused) : undefined;

  return (
    <div
      className={`kit-linux${grid ? " lx-grid-open" : ""}${dragging ? " lx-dragging" : ""}${className ? " " + className : ""}`}
      data-theme={state.dark ? "dark" : "light"}
      style={style}
      onPointerDown={(e) => { if (menu && !(e.target as Element).closest(".lx-qs, .lx-status")) setMenu(false); }}
    >
      <div className="lx-wall"><I.Wallpaper /></div>

      <header className="lx-panel">
        <button className="lx-pbtn lx-ws" aria-label="Activities" aria-pressed={grid} onClick={() => showGrid(!grid)}><i /><i /></button>
        <span className="lx-clock">{MONTHS[now.getMonth()]} {now.getDate()}&nbsp;&nbsp;{pad(now.getHours())}:{pad(now.getMinutes())}</span>
        <button className={`lx-pbtn lx-status${menu ? " lx-open" : ""}`} aria-label="System menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <I.Wifi /><I.Volume /><I.Battery /><I.Power />
        </button>
      </header>

      {menu && (
        <div className="lx-qs" role="dialog" aria-label="Quick Settings">
          <div className="lx-qs-top">
            <span className="lx-pct"><I.Battery />84 %</span>
            <button className="lx-round" aria-label="Lock" onClick={() => { setMenu(false); linux.toast("Lock", "Not available in this mockup."); }}><I.Lock /></button>
            <button className="lx-round" aria-label="Power Off" onClick={() => { setMenu(false); linux.toast("Power Off", "Not available in this mockup."); }}><I.Power /></button>
          </div>
          <label className="lx-slider"><I.Volume /><input type="range" defaultValue={62} aria-label="Volume" /></label>
          <div className="lx-toggles">
            <Toggle on={toggles.wifi} icon={<I.Wifi />} name="Wi-Fi" sub={toggles.wifi ? "Casuro HQ" : "Off"} onClick={() => setToggles({ ...toggles, wifi: !toggles.wifi })} />
            <Toggle on={toggles.bt} icon={<I.Bluetooth />} name="Bluetooth" sub={toggles.bt ? "On" : "Off"} onClick={() => setToggles({ ...toggles, bt: !toggles.bt })} />
            <Toggle on={state.dark} icon={<I.Moon />} name="Dark Style" sub={state.dark ? "On" : "Off"} onClick={() => linux.setDark(!state.dark)} />
          </div>
        </div>
      )}

      <nav className="lx-dock" aria-label="Dock">
        {apps.filter((a) => a.dock !== false).map((a) => {
          const w = state.windows.find((x) => x.id === a.id);
          return (
            <button key={a.id} className={`lx-dk${w ? " lx-run" : ""}${w && front?.id === a.id && !grid ? " lx-on" : ""}`} aria-label={a.name} onClick={() => launch(a, true)}>
              <span className="lx-ico">{a.icon}</span>
            </button>
          );
        })}
        <span className="lx-grow" />
        <button className={`lx-dk${grid ? " lx-on" : ""}`} aria-label="Show Apps" onClick={() => showGrid(!grid)}>
          <span className="lx-ico"><I.ShowApps /></span>
        </button>
      </nav>

      <div className="lx-grid" onClick={(e) => { if (e.target === e.currentTarget) showGrid(false); }}>
        <label className="lx-search">
          <I.Search />
          <input
            ref={search}
            value={query}
            placeholder="Type to search"
            aria-label="Search apps"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && found[0]) launch(found[0]); }}
          />
        </label>
        <div className="lx-apps">
          {found.map((a) => (
            <button key={a.id} className="lx-app" onClick={() => launch(a)}>
              <span className="lx-ico">{a.icon}</span>
              {a.name}
            </button>
          ))}
        </div>
        {!found.length && <p className="lx-none">No results found</p>}
      </div>

      <div className="lx-area" ref={area}>
        {state.windows.map((w) => (
          <Window key={w.id} w={w} linux={linux} focused={w.id === state.focused} area={area} onDrag={setDragging}>
            {renderWindow ? renderWindow(w) : w.content}
          </Window>
        ))}
      </div>

      {state.toast && (
        <div className="lx-toast" role="status" key={state.toast.id}>
          <b>{state.toast.title}</b>
          {state.toast.body && <p>{state.toast.body}</p>}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, icon, name, sub, onClick }: { on: boolean; icon: ReactNode; name: string; sub: string; onClick: () => void }) {
  return (
    <button className={`lx-toggle${on ? " lx-on" : ""}`} aria-pressed={on} onClick={onClick}>
      {icon}
      <span><b>{name}</b><small>{sub}</small></span>
    </button>
  );
}

// Inline: the kit's stylesheet stops at .lx-content, so what goes in a window keeps the page's styles.
const CONTENT: CSSProperties = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "auto" };

interface WindowProps {
  w: LinuxWindow;
  linux: LinuxDesktop;
  focused: boolean;
  area: RefObject<HTMLDivElement | null>;
  onDrag: (on: boolean) => void;
  children: ReactNode;
}

function Window({ w, linux, focused, area, onDrag, children }: WindowProps) {
  const drag = useRef<{ kind: string; sx: number; sy: number; x: number; y: number; w: number; h: number; moved: boolean } | null>(null);

  const start = (kind: string) => (e: ReactPointerEvent) => {
    if (e.button !== 0 || (kind === "move" && (e.target as Element).closest("button, input, a, textarea"))) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = area.current!.getBoundingClientRect();
    // A maximized window drags from its real box: the whole area
    const box = w.maximized ? { x: 0, y: 0, w: r.width, h: r.height } : { x: w.x, y: w.y, w: w.width, h: w.height };
    drag.current = { kind, sx: e.clientX, sy: e.clientY, ...box, moved: false };
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      onDrag(true);
      if (d.kind === "move" && w.maximized) {
        // Leave maximized under the pointer, keeping the grab point in proportion
        const r = area.current!.getBoundingClientRect();
        const gx = ((d.sx - r.left) / d.w) * w.width;
        d.x = d.sx - r.left - gx; d.w = w.width; d.h = w.height;
      }
    }
    const r = area.current!.getBoundingClientRect();
    if (d.kind === "move") linux.move(w.id, d.x + dx, Math.max(0, Math.min(d.y + dy, r.height - 46)));
    else linux.resize(w.id, d.kind.includes("e") ? Math.max(360, d.w + dx) : d.w, d.kind.includes("s") ? Math.max(220, d.h + dy) : d.h);
  };
  const end = () => {
    if (drag.current?.moved) onDrag(false);
    drag.current = null;
  };

  const box: CSSProperties = w.maximized ? { inset: 0, zIndex: w.z } : { left: w.x, top: w.y, width: w.width, height: w.height, zIndex: w.z };
  return (
    <section
      className={`lx-win${focused ? " lx-focused" : ""}${w.maximized ? " lx-max" : ""}`}
      style={box}
      hidden={w.minimized}
      aria-label={typeof w.title === "string" ? w.title : undefined}
      onPointerDownCapture={() => { if (!focused) linux.focus(w.id); }}
    >
      <header
        className="lx-hb"
        onPointerDown={start("move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={(e) => { if (!(e.target as Element).closest("button, input")) linux.toggleMaximize(w.id); }}
      >
        {w.headerStart}
        <span className="lx-title">{w.title}</span>
        <span className="lx-grow" />
        {w.headerEnd}
        <span className="lx-ctl">
          <button aria-label="Minimize" onClick={() => linux.minimize(w.id)}><I.Minimize /></button>
          <button aria-label={w.maximized ? "Restore" : "Maximize"} onClick={() => linux.toggleMaximize(w.id)}>{w.maximized ? <I.Restore /> : <I.Maximize />}</button>
          <button className="lx-x" aria-label="Close" onClick={() => linux.close(w.id)}><I.Close /></button>
        </span>
      </header>
      <div className="lx-body">
        <div className="lx-content" style={CONTENT}>{children}</div>
      </div>
      {["e", "s", "se"].map((d) => (
        <span key={d} className={`lx-rz lx-rz-${d}`} onPointerDown={start(d)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
      ))}
    </section>
  );
}
