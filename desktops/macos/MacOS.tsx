import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import * as I from "./icons";
import type { DockItem, MacWindow } from "./types";
import type { MacOSDesktop } from "./use-macos";
import "./macos.css";

// A macOS desktop, as in desktops/macos.html: wallpaper, menu bar, Dock and
// windows that hold any React content. Give it a desktop from useMacOS(); it
// fills the box it is put in (give that box a height).

export interface MacOSProps {
  mac: MacOSDesktop;
  /** The Dock's apps, left to right. Trash is added at the end. */
  dock?: DockItem[];
  /** Draws a window's content when the window was opened without `content`. */
  renderWindow?: (win: MacWindow) => ReactNode;
  /** The menu bar's name when no window is focused (default "Finder"). */
  idleApp?: string;
  /** Called when the Trash in the Dock is clicked. */
  onTrash?: () => void;
  className?: string;
  style?: CSSProperties;
}

type MenuItem = { label: string; keys?: string; run?: () => void; checked?: boolean } | "-";

export function MacOS({ mac, dock = [], renderWindow, idleApp = "Finder", onTrash, className, style }: MacOSProps) {
  const { state } = mac;
  const [menu, setMenuState] = useState<{ id: string; left: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const focused = state.windows.find((w) => w.id === state.focused && !w.minimized) ?? null;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  // A click anywhere outside the menu bar closes an open menu.
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => { if (!(e.target as Element).closest?.(".menubar, .menu")) setMenuState(null); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [menu]);

  const openMenu = (id: string | null, el?: HTMLElement) => setMenuState(id && el ? { id, left: el.offsetLeft } : null);
  const act = (label: string, run?: () => void) => () => { setMenuState(null); mac.emit({ type: "menu", item: label }); run?.(); };
  const close = (id: string) => { mac.close(id); mac.emit({ type: "close", id }); };
  const minimize = (id: string) => { mac.minimize(id); mac.emit({ type: "minimize", id }); };
  const maximize = (w: MacWindow) => { mac.toggleMaximize(w.id); mac.emit({ type: "maximize", id: w.id, maximized: !w.maximized }); };
  const theme = () => { const t = state.theme === "dark" ? "light" : "dark"; mac.setTheme(t); mac.emit({ type: "theme", theme: t }); };

  const menus: Record<string, MenuItem[]> = {
    apple: [
      { label: "About This Mac", run: () => mac.toast("MacBook Pro", "Apple M4 Pro, 24 GB, macOS Tahoe 26.0") },
      "-",
      { label: "Dark Mode", run: theme, checked: state.theme === "dark" },
      "-",
      { label: "Lock Screen", keys: "⌃⌘Q" },
    ],
    app: focused
      ? [{ label: `Hide ${focused.app}`, keys: "⌘H", run: () => minimize(focused.id) }, "-", { label: `Quit ${focused.app}`, keys: "⌘Q", run: () => close(focused.id) }]
      : [{ label: `About ${idleApp}` }],
    window: [
      ...(focused ? [{ label: "Minimize", keys: "⌘M", run: () => minimize(focused.id) }, { label: "Zoom", run: () => maximize(focused) }, "-" as const] : []),
      ...state.windows.map((w) => ({ label: w.title, checked: w.id === focused?.id, run: () => { mac.restore(w.id); mac.emit({ type: "restore", id: w.id }); } })),
    ],
  };

  const onKey = (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || !focused) return;
    if (e.key === "w") { e.preventDefault(); close(focused.id); }
    if (e.key === "m") { e.preventDefault(); minimize(focused.id); }
  };

  const openDock = (item: DockItem) => {
    const mine = state.windows.filter((w) => w.dockId === item.id).sort((a, b) => b.z - a.z)[0];
    mac.emit({ type: "dock", id: item.id });
    if (mine) mac.restore(mine.id);
    else item.onOpen?.();
  };

  return (
    <div className={["kit-macos", busy && "busy", className].filter(Boolean).join(" ")} style={style} data-theme={state.theme} tabIndex={-1} onKeyDown={onKey}>
      <div className="wall" aria-hidden="true"><i /><i /><i /></div>

      <header className="menubar">
        <div>
          {[["apple", <I.Apple key="a" />], ["app", focused?.app ?? idleApp], ["window", "Window"]].map(([id, label]) => (
            <button key={id as string} className={`mb ${id}${menu?.id === id ? " open" : ""}`} aria-label={id === "apple" ? "Apple menu" : undefined}
              onClick={(e) => openMenu(menu?.id === id ? null : (id as string), e.currentTarget)} onPointerEnter={(e) => menu && openMenu(id as string, e.currentTarget)}>
              {label}
            </button>
          ))}
        </div>
        <div>
          <span className="mb">87%<I.Battery /></span>
          <span className="mb"><I.Wifi /></span>
          <button className="mb" aria-label="Dark Mode" onClick={theme}><I.ControlCenter /></button>
          <span className="mb clock">
            {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "")}&nbsp;&nbsp;
            {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      </header>
      {menu && (
        <div className="menu" role="menu" style={{ left: menu.left }}>
          {menus[menu.id].map((m, i) => m === "-" ? <hr key={i} /> : (
            <button key={i} role="menuitem" className={`it${m.run ? "" : " dis"}${m.checked ? " chk" : ""}`} onClick={m.run ? act(m.label, m.run) : undefined}>
              <span>{m.label}</span>{m.keys && <span className="k">{m.keys}</span>}
            </button>
          ))}
        </div>
      )}

      <main className="windows">
        {state.windows.map((w) => (
          <Window key={w.id} win={w} focused={w.id === focused?.id} mac={mac} setBusy={setBusy} onClose={() => close(w.id)} onMinimize={() => minimize(w.id)} onMaximize={() => maximize(w)}>
            {w.content ?? renderWindow?.(w)}
          </Window>
        ))}
      </main>

      <div className="dock-wrap">
        <nav className="dock" aria-label="Dock">
          {dock.map((d) => (
            <button key={d.id} className={`ditem${state.windows.some((w) => w.dockId === d.id) ? " running" : ""}`} aria-label={d.name} onClick={() => openDock(d)}>
              {d.icon}<span className="tip">{d.name}</span><span className="dot" />
            </button>
          ))}
          <span className="dsep" />
          <button className="ditem" aria-label="Trash" onClick={() => { mac.emit({ type: "dock", id: "trash" }); onTrash?.(); }}>
            <I.AppIcon name="trash" bare /><span className="tip">Trash</span>
          </button>
        </nav>
      </div>

      <div className="toasts">
        {state.toasts.map((t) => (
          <button key={t.id} className="toast" onClick={() => mac.dismissToast(t.id)}>
            <span className="ti"><I.Apple /></span><span><b>{t.title}</b>{t.body && <span>{t.body}</span>}</span><span className="now">now</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface WindowProps {
  win: MacWindow;
  focused: boolean;
  mac: MacOSDesktop;
  setBusy: (busy: boolean) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  children: ReactNode;
}

// Follows the pointer from a press on `el` until release; content stops taking pointer events meanwhile (iframes).
function track(e: ReactPointerEvent, setBusy: (b: boolean) => void, move: (dx: number, dy: number) => void, done: () => void) {
  if (e.button !== 0) return;
  e.preventDefault();
  const sx = e.clientX, sy = e.clientY;
  setBusy(true);
  const onMove = (ev: PointerEvent) => move(ev.clientX - sx, ev.clientY - sy);
  const onUp = () => { setBusy(false); removeEventListener("pointermove", onMove); removeEventListener("pointerup", onUp); done(); };
  addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
}

function Window({ win, focused, mac, setBusy, onClose, onMinimize, onMaximize, children }: WindowProps) {
  const last = useRef({ x: win.x, y: win.y, width: win.width, height: win.height });
  const drag = (e: ReactPointerEvent) => {
    if ((e.target as Element).closest("button") || win.maximized) return;
    const { x, y } = win;
    track(e, setBusy, (dx, dy) => { last.current = { ...last.current, x: x + dx, y: Math.max(0, y + dy) }; mac.moveTo(win.id, x + dx, Math.max(0, y + dy)); },
      () => mac.emit({ type: "move", id: win.id, x: last.current.x, y: last.current.y }));
  };
  const resize = (dir: string) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    const { width, height } = win;
    track(e, setBusy, (dx, dy) => {
      const w = dir.includes("e") ? Math.max(320, width + dx) : width, h = dir.includes("s") ? Math.max(200, height + dy) : height;
      last.current = { ...last.current, width: w, height: h };
      mac.resizeTo(win.id, w, h);
    }, () => mac.emit({ type: "resize", id: win.id, width: last.current.width, height: last.current.height }));
  };
  return (
    <section className={`win${focused ? " focused" : ""}${win.maximized ? " max" : ""}${win.minimized ? " min" : ""}`} aria-label={win.title}
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }}
      onPointerDownCapture={() => { if (!focused) { mac.focus(win.id); mac.emit({ type: "focus", id: win.id }); } }}>
      <div className="tbar" onPointerDown={drag} onDoubleClick={(e) => { if (!(e.target as Element).closest("button")) onMaximize(); }}>
        <div className="lights">
          <button className="cl" aria-label="Close" onClick={onClose}><I.Close /></button>
          <button className="mn" aria-label="Minimize" onClick={onMinimize}><I.Minimize /></button>
          <button className="zm" aria-label="Zoom" onClick={onMaximize}><I.Zoom /></button>
        </div>
        <span className="tt">{win.title}</span>
      </div>
      <div className="wbody">{children}</div>
      {["e", "s", "se"].map((d) => <div key={d} className={`rz ${d}`} onPointerDown={resize(d)} />)}
    </section>
  );
}
