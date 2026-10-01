# Windows 11 desktop (React)

`desktops/windows.html` as React components: Bloom wallpaper, a centered
taskbar, Start with search, and windows that drag, resize, snap to maximize,
minimize to the taskbar and hold **any React content**, so an app or another
kit can run inside a window. Copy the folder into your project and change
what you need. It needs only React 19; the styles are plain CSS scoped to
`.kit-windows`, and the scope stops at each window's content, so what runs in
a window keeps its own styles.

## Use

```tsx
import { Windows, useWindows, PLACEHOLDER_APPS, type Launcher } from "./desktops/windows";

const apps: Launcher[] = [
  ...PLACEHOLDER_APPS,
  { id: "slack", name: "Slack", icon: <SlackLogo />, window: () => ({ content: <MySlack />, width: 1100, height: 720 }) },
];

function Desktop() {
  const desktop = useWindows({
    onEvent(event) {
      if (event.type === "launch") { /* the person opened event.app */ }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Windows desktop={desktop} apps={apps} pinned={["explorer", "slack"]} user={{ name: "Sam Rivera" }} />
    </div>
  );
}
```

`<Windows>` fills the box it is in, so give that box a height. Under 760px
wide, Start becomes the home screen and windows open full screen.

## Props

- `desktop`: from `useWindows()`.
- `apps`: launchers for Start, `{ id, name, icon, window? }`. `window()`
  returns the window to open (`content`, `width`, `height`...). Without it, a
  click only sends a `launch` event and you open something yourself.
- `pinned`: app ids on the taskbar (default: all). Windows that belong to no
  pinned app get their own taskbar button.
- `user`: `{ name, photo?, initials? }` in Start.
- `renderWindow(win)`: draws windows opened without `content`.

## Driving it

| Call | What happens |
| --- | --- |
| `desktop.open({ id, title, icon, content, width, height })` | Opens a window, cascaded from the center; an open id is restored and focused instead. |
| `desktop.close(id)`, `focus(id)`, `minimize(id)`, `restore(id)`, `toggleMaximize(id)` | What the caption buttons and taskbar do. |
| `desktop.place(id, { x, y, width, height })` | Moves or sizes a window. |
| `desktop.toast({ title, body, app, icon, duration })` | A notification at the bottom right; returns its id. |
| `desktop.setTheme("dark")`, `setStartOpen(true)` | Theme and Start. |

Inside a window's content, `useDesktop()` returns the same object.
`onEvent` hears `launch`, `open`, `close`, `focus`, `minimize`, `restore`,
`maximize`, `unmaximize`, `start`, `search`, `theme`, `power` and
`toast-click`.

Keyboard, while focus is on the desktop: Win or Ctrl+Esc toggles Start, Esc
closes it, Alt+F4 or Ctrl+W closes the focused window.

## Files

- `Windows.tsx`: the desktop, taskbar, Start, window frames, wallpaper.
- `use-windows.ts`: the state and every action above.
- `apps.tsx`: File Explorer, Edge, Notepad, Terminal and Settings placeholders.
- `icons.tsx`, `types.ts`, `windows.css`.

Preview: `npm run dev`, then `/preview/?app=windows`.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-windows.ts`,
`Windows.tsx` and `apps.tsx`; you should not need to open them.

### Imports

```ts
import {
  Windows, useWindows, useDesktop,
  PLACEHOLDER_APPS, Explorer, Edge, Notepad, Terminal, Settings,
  Icons,
  type WindowsProps, type WindowsDesktop, type WindowsOptions,
  type WindowSpec, type DesktopWindow, type Launcher, type Toast, type User, type Theme, type WindowsEvent,
} from "./desktops/windows";
```

`Icons` is the whole `icons.tsx` namespace: `Icons.ExplorerIcon`,
`Icons.EdgeIcon`, `Icons.NotepadIcon`, `Icons.TerminalIcon`,
`Icons.SettingsIcon`, `Icons.FolderIcon`, `Icons.StartLogo` and the small
glyphs. `PLACEHOLDER_APPS` is five ready `Launcher`s (ids `"explorer"`,
`"edge"`, `"notepad"`, `"terminal"`, `"settings"`). `useDesktop()` returns
the same `WindowsDesktop` from inside a window's content (it throws outside
`<Windows>`).

### The hook

```ts
function useWindows(options?: WindowsOptions): WindowsDesktop;

interface WindowsOptions {
  windows?: WindowSpec[];                     // open at the start; read once, on mount
  theme?: "light" | "dark";                   // default "light"; read once, on mount
  onEvent?: (event: WindowsEvent) => void;    // see Events
}

interface WindowSpec {
  id: string;                  // required; opening an open id restores and focuses it
  title: string;               // required
  icon?: ReactNode;            // 16px in the title bar; 24px on the taskbar when no launcher owns it
  content?: ReactNode;         // leave out and draw it with <Windows renderWindow>
  app?: string;                // the Launcher id it belongs to (running mark on its taskbar button); default `id`
  width?: number;              // default 900, capped to the desktop
  height?: number;             // default 600, capped to the desktop
  x?: number;                  // default cascaded from the center
  y?: number;
  maximized?: boolean;
}
```

Windows in `options.windows` stack in array order (the last is in front and
active). They are placed before `<Windows>` has measured its box, against a
1280x752 default. There is no option to start minimized: call `minimize`
after mount.

### What code can do

All functions are stable across renders.

```ts
desktop.open(spec: WindowSpec): void
  // new id: adds it in front (closes Start) and emits "open".
  // open id: only restores/focuses it; the new spec (content, title, size) is ignored.
desktop.close(id: string): void                  // emits "close"
desktop.focus(id: string): void                  // to the front, un-minimized; emits "focus" unless already active
desktop.minimize(id: string): void               // emits "minimize"
desktop.restore(id: string): void                // emits "restore"
desktop.toggleMaximize(id: string): void         // emits "maximize" or "unmaximize"
desktop.place(id: string, box: Partial<{ x: number; y: number; width: number; height: number; maximized: boolean }>): void
  // moves / sizes; silent
desktop.toast(toast: { title: string; body?: string; app?: string; icon?: ReactNode; duration?: number; id?: string }): string
  // bottom-right notification; returns its id; duration default 5000 ms, 0 keeps it; same id replaces
desktop.dismissToast(id: string): void
desktop.setTheme(theme: "light" | "dark"): void  // emits "theme"
desktop.setStartOpen(open: boolean): void        // emits "start" when it changes
desktop.emit(event: WindowsEvent): void          // reports an event without changing anything
desktop.setBounds(width: number, height: number): void   // set by <Windows>; do not call
```

Read-only properties (spread on the object, not under `state`):

```ts
desktop.windows: DesktopWindow[]
desktop.activeId: string | null
desktop.theme: "light" | "dark"
desktop.toasts: Toast[]          // { id, title, body?, app?, icon?, duration? }
desktop.startOpen: boolean
```

### Events

```ts
type WindowsEvent =
  | { type: "launch"; app: string }          // a Start or taskbar click on a launcher with no window
  | { type: "open" | "close" | "focus" | "minimize" | "restore" | "maximize" | "unmaximize"; id: string }
  | { type: "start"; open: boolean }
  | { type: "search"; query: string }        // typing in Start's search
  | { type: "theme"; theme: "light" | "dark" }
  | { type: "power" }                         // Sleep in Start
  | { type: "toast-click"; id: string };     // the toast is also dismissed
```

Unlike the macOS kit, these fire for your own calls too (`open`, `close`,
`focus`, `minimize`, `restore`, `toggleMaximize`, `setTheme`,
`setStartOpen`), not only for the person's. Moving and resizing a window
send no event.

### State

```ts
interface DesktopWindow extends WindowSpec {
  app: string;
  x: number; y: number; width: number; height: number;
  maximized: boolean; minimized: boolean;
  z: number;                    // stacking order; higher is in front
}
```

`desktop.windows` is not plain JSON: `content` and `icon` are React nodes.
Save only the layout (`id`, `title`, `app`, `x`, `y`, `width`, `height`,
`z`, `maximized`, `minimized`) and draw windows with `renderWindow` instead
of `content`. To restore, sort the saved windows by `z`, pass them as
`options.windows` without `content` (they keep `x`, `y`, `width`,
`height`, `maximized`), and call `minimize` after mount for those that
were. `renderWindow` is only used for windows whose `content` is undefined.

### The component

```ts
interface WindowsProps {
  desktop: WindowsDesktop;                               // required: the hook's return
  apps?: Launcher[];                                     // Start, in order
  pinned?: string[];                                     // launcher ids on the taskbar; default all
  user?: { name: string; photo?: string; initials?: string };  // default { name: "User" }
  renderWindow?: (win: DesktopWindow) => ReactNode;      // draws windows opened without `content`
  className?: string;
  style?: CSSProperties;
}

interface Launcher {
  id: string;
  name: string;
  icon: ReactNode;             // taskbar (24px) and Start (32px); a bare <svg> is sized for you
  window?: () => Omit<WindowSpec, "id" | "title" | "icon"> & Partial<Pick<WindowSpec, "id" | "title" | "icon">>;
    // what a click opens (id, title, icon default to the launcher's); leave out to get only "launch"
}
```

A taskbar button shows the launcher's windows (`win.app === launcher.id`);
a click restores, focuses or minimizes the front one, and launches when
there is none. It fills its parent, so the parent needs a definite height.
A window's body (`.kw-content`) is `position: relative` with
`overflow: hidden`, and the desktop's CSS stops at its first child, so an
app kit inside keeps its own styles. App kits fill their parent's height,
so put them in a `position: absolute; inset: 0` box.

### Wiring it in an episode

Two app kits in windows, each with a taskbar button from its logo, a world
event that opens a window and shows a notification, and the layout saved
and redrawn.

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { casuro } from "@/lib/casuro";
import { Windows, useWindows, type DesktopWindow, type Launcher, type WindowSpec } from "./desktops/windows";
// Each app kit's logo for a launcher, from src/apps/<app>/icons.tsx:
import { AppLogo as SlackLogo } from "./apps/slack/icons";
import { AppLogo as GmailLogo } from "./apps/gmail/icons";
import { SlackScene } from "./SlackScene";   // the episode's own scenes, each rendering an app kit
import { GmailScene } from "./GmailScene";

// What is saved per window: the layout, never the React content.
type SavedWindow = Pick<DesktopWindow, "id" | "title" | "app" | "x" | "y" | "width" | "height" | "z" | "maximized" | "minimized">;

const WINDOWS: Record<string, WindowSpec> = {
  slack: { id: "slack", title: "Slack", width: 1100, height: 700 },
  gmail: { id: "gmail", title: "Gmail", width: 1000, height: 660 },
};

// Launchers open windows without content; renderWindow draws them.
const apps: Launcher[] = [
  { id: "slack", name: "Slack", icon: <SlackLogo />, window: () => WINDOWS.slack },
  { id: "gmail", name: "Gmail", icon: <GmailLogo />, window: () => WINDOWS.gmail },
];

// An app kit fills its parent: give it the whole window body.
const fill = (node: ReactNode) => <div style={{ position: "absolute", inset: 0 }}>{node}</div>;
const scenes: Record<string, ReactNode> = { slack: fill(<SlackScene />), gmail: fill(<GmailScene />) };

export function Desktop() {
  const [saved, setSaved] = useState<SavedWindow[] | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ windows?: SavedWindow[] }>().then((s) => setSaved(s?.windows ?? null));
  }, []);
  if (saved === undefined) return null;      // options.windows is read on mount only
  return <Win saved={saved} />;
}

function Win({ saved }: { saved: SavedWindow[] | null }) {
  const desktop = useWindows({
    windows: saved ? [...saved].sort((a, b) => a.z - b.z) : [WINDOWS.gmail],
    onEvent(event) {
      if (event.type === "launch") casuro.track.decision({ summary: `Opened ${event.app}` });
      if (event.type === "toast-click" && event.id === "priya") desktop.open(WINDOWS.slack);
    },
  });

  // Minimized is not an option: apply it once after mount.
  useEffect(() => {
    for (const w of saved ?? []) if (w.minimized) desktop.minimize(w.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The world: 30s in, Priya writes on Slack. Notify, then bring Slack to the front.
  useEffect(() => {
    const t = setTimeout(() => {
      desktop.toast({ id: "priya", app: "Slack", icon: <SlackLogo />, title: "Priya Shah", body: "Can you look at the Q3 numbers?" });
      casuro.track.notification({ title: "Slack", text: "Priya Shah: Can you look at the Q3 numbers?" });
      desktop.open(WINDOWS.slack);           // opens it, or restores and focuses the open one
    }, 30_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the layout (debounced: a drag changes it on every frame).
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const windows: SavedWindow[] = desktop.windows.map(({ id, title, app, x, y, width, height, z, maximized, minimized }) =>
        ({ id, title, app, x, y, width, height, z, maximized, minimized }));
      void casuro.store.set({ windows });    // merge with the rest of your episode's state
    }, 500);
  }, [desktop.windows]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Windows desktop={desktop} apps={apps} pinned={["slack", "gmail"]} user={{ name: "Sam Rivera" }}
        renderWindow={(w: DesktopWindow) => scenes[w.id]} />
    </div>
  );
}
```

Closing a window unmounts its content, so an app kit inside loses its
state. If a window can be closed and reopened, call the app kit's hook in
the component that owns the desktop (or save its `state` with
`casuro.store` and pass it back as `restore`), not inside the window.
Because `open` ignores a new spec for an open id, content passed to `open`
cannot be swapped later; draw it with `renderWindow` when it must change.
