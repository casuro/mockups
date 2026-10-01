# Ubuntu desktop (React)

`desktops/linux.html` as React components: Ubuntu's GNOME shell (top bar,
Quick Settings, Ubuntu Dock, app grid) with windows that hold any React
content, so you can put an app kit, an iframe or a form on a desktop. Copy the
folder into your project and change what you need.

It needs only React 19. The styles are plain CSS scoped to `.kit-linux` and
stop at each window's content, so they neither leak into the page nor into
what you put in a window. Window content inherits the `--lx-*` colors
(`--lx-bg`, `--lx-fg`, `--lx-dim`, `--lx-line`, `--lx-side`, `--lx-sel`,
`--lx-accent`), which follow Dark Style.

## Use

```tsx
import { Linux, LinuxIcons, useLinux, type LinuxApp } from "./desktops/linux";

const apps: LinuxApp[] = [
  { id: "files", name: "Files", icon: <LinuxIcons.FilesIcon />, window: () => ({ content: <MyFiles />, width: 860, height: 540 }) },
  { id: "slack", name: "Slack", icon: <img src="/slack.svg" alt="" />, window: () => ({ content: <Slack slack={slack} />, width: 1100, height: 720 }) },
];

function Desktop() {
  const linux = useLinux({
    onEvent(event) {
      if (event.type === "launch") {
        // The person opened an app from the dock or the app grid.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Linux linux={linux} apps={apps} />
    </div>
  );
}
```

`<Linux>` fills the box it is in. Under 760px wide (the box, not the screen)
it shows the app grid as a home screen and opens apps full screen.

## The desktop

`useLinux(options)` holds the state and returns stable functions:

- `open({ id, title, content, icon?, headerStart?, headerEnd?, width?, height?, x?, y?, maximized? })`:
  one window per id; opening an open id brings it to the front.
- `close(id)`, `focus(id)`, `minimize(id)`, `toggleMaximize(id)`, `move(id, x, y)`, `resize(id, w, h)`
- `toast(title, body?)`: a GNOME notification banner.
- `setDark(dark)`: Dark Style, also in Quick Settings.
- `state`: `{ windows, focused, dark, toast }`.

`onEvent` gets `launch`, `open`, `close`, `focus`, `minimize`, `maximize` and
`theme` events. Options also take `windows` (open from the start) and `dark`.

Apps in `apps` with `dock: false` are only in the app grid. An app without
`window` only sends `launch`, for you to `open()` whatever you like. Content
stored with `open()` is fixed; to draw it from current state, pass
`renderWindow={(w) => ...}`, as `preview/linux.tsx` does for Settings.

Keyboard (on by default, `keyboard={false}` to turn off): Super toggles the app
grid, Escape closes it, Ctrl+W closes the focused window.

See it at `/preview/?app=linux`.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-linux.ts` and
`Linux.tsx`; you should not need to open them.

### Imports

```ts
import {
  Linux, useLinux, LinuxIcons,
  type LinuxProps, type LinuxDesktop, type LinuxOptions,
  type LinuxWindowInput, type LinuxWindow, type LinuxApp, type LinuxToast, type LinuxState, type LinuxEvent,
} from "./desktops/linux";
```

`LinuxIcons` is the whole `icons.tsx` namespace: app icons such as
`LinuxIcons.FilesIcon`, `LinuxIcons.FolderIcon`, `LinuxIcons.ShowApps`, and
16px symbolic glyphs (`LinuxIcons.Search`, `LinuxIcons.Gear`,
`LinuxIcons.Menu`, `LinuxIcons.Back`...) for header bars.

### The hook

```ts
function useLinux(options?: LinuxOptions): LinuxDesktop;

interface LinuxOptions {
  windows?: LinuxWindowInput[];              // open from the start; read once, on mount
  dark?: boolean;                            // Dark Style at the start; default false
  onEvent?: (event: LinuxEvent) => void;     // read through a ref
}

interface LinuxWindowInput {
  id: string;                  // required; one window per id; use the LinuxApp's id to tie it to its dock icon
  title: ReactNode;            // required; centered in the header bar
  content: ReactNode;          // required (pass null when renderWindow draws it)
  icon?: ReactNode;
  headerStart?: ReactNode;     // header bar extras, left of the title
  headerEnd?: ReactNode;       // right of the title, before the window buttons
  width?: number;              // default 720
  height?: number;             // default 480
  x?: number;                  // default cascaded from 80
  y?: number;                  // default cascaded from 40
  maximized?: boolean;
}
```

Windows in `options.windows` stack in array order (the last is in front and
focused). There is no option to start minimized: call `minimize` after
mount.

### What code can do

All functions are stable and read the latest state through a ref, so they
are safe in timers and after `await`.

```ts
linux.open(win: LinuxWindowInput): void
  // new id: adds it in front, emits "open".
  // open id: replaces its title, icon, content, headerStart, headerEnd, then focuses it (size and place kept).
linux.close(id: string): void                    // emits "close"
linux.focus(id: string): void                    // to the front, un-minimized; emits "focus"
linux.minimize(id: string): void                 // emits "minimize"
linux.toggleMaximize(id: string): void           // emits "maximize" { maximized }
linux.move(id: string, x: number, y: number): void          // also un-maximizes; silent
linux.resize(id: string, width: number, height: number): void  // also un-maximizes; silent
linux.toast(title: string, body?: string): void  // one banner at the top; a new one replaces it; gone after 3.5s
linux.setDark(dark: boolean): void               // emits "theme"
linux.emit(event: LinuxEvent): void              // used by <Linux> for "launch"
linux.state: LinuxState
```

There is no `restore`: `focus(id)` brings a minimized window back.

### Events

```ts
type LinuxEvent =
  | { type: "launch"; app: string }      // a dock or app grid click on an app with no window
  | { type: "open"; id: string }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "maximize"; id: string; maximized: boolean }
  | { type: "theme"; dark: boolean };
```

These fire for your own calls as well as the person's (the hook emits them,
not the component). Moving and resizing send no event, and a toast cannot
be clicked.

### State

```ts
interface LinuxState {
  windows: LinuxWindow[];       // in the order opened; `z` says which is in front
  focused: string | null;
  dark: boolean;
  toast: { id: number; title: string; body?: string } | null;
}

interface LinuxWindow extends LinuxWindowInput {
  width: number; height: number; x: number; y: number;
  maximized: boolean; minimized: boolean;
  z: number;
}
```

`linux.state` is not plain JSON: `title`, `content`, `icon`, `headerStart`
and `headerEnd` are React nodes. Save only the layout (`id`, the title as a
string, `x`, `y`, `width`, `height`, `z`, `maximized`, `minimized`) and draw
windows with `renderWindow`. To restore, sort the saved windows by `z`, pass
them as `options.windows` with `content: null`, and call `minimize` after
mount for those that were. Note that `renderWindow`, when given, draws
every window (its `content` is then unused), unlike the macOS and Windows
kits where it only draws windows without content.

### The component

```ts
interface LinuxProps {
  linux: LinuxDesktop;                               // required: the hook's return
  apps?: LinuxApp[];                                 // the dock (dock !== false) and the app grid (all)
  renderWindow?: (window: LinuxWindow) => ReactNode; // draws every window's content when given
  keyboard?: boolean;                                // Super, Escape, Ctrl+W; default true (listens on the window)
  className?: string;
  style?: CSSProperties;
}

interface LinuxApp {
  id: string;
  name: string;
  icon: ReactNode;             // dock and app grid; a bare <svg> is sized for you
  dock?: boolean;              // default true
  window?: () => Omit<LinuxWindowInput, "id" | "title"> & { title?: ReactNode };
    // what a click opens (id is the app's id, title defaults to its name); leave out to get only "launch"
}
```

A dock icon shows its app running when a window with the app's `id` is
open; a click focuses it, or minimizes it when it is already in front. It
fills its parent, so the parent needs a definite height. A window's content
box (`.lx-content`) is a flex column with `overflow: auto` and no
positioning, and the desktop's CSS stops there, so an app kit inside keeps
its own styles. App kits fill their parent's height: give them a
`flex: 1; min-height: 0; position: relative` box with a
`position: absolute; inset: 0` box inside. A minimized window is
`display: none`, so a kit inside measures 0 wide until it comes back.

### Wiring it in an episode

Two app kits in windows, each with a dock icon from its logo, a world event
that opens a window and shows a notification, and the layout saved and
redrawn.

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { casuro } from "@/lib/casuro";
import { Linux, useLinux, type LinuxApp, type LinuxWindow, type LinuxWindowInput } from "./desktops/linux";
// Each app kit's logo for a launcher, from src/apps/<app>/icons.tsx:
import { AppLogo as SlackLogo } from "./apps/slack/icons";
import { AppLogo as GmailLogo } from "./apps/gmail/icons";
import { SlackScene } from "./SlackScene";   // the episode's own scenes, each rendering an app kit
import { GmailScene } from "./GmailScene";

// What is saved per window: the layout, never the React nodes.
interface SavedWindow { id: string; title: string; x: number; y: number; width: number; height: number; z: number; maximized: boolean; minimized: boolean }

// Window ids match the app ids, so the dock shows them running.
const WINDOWS: Record<string, LinuxWindowInput> = {
  slack: { id: "slack", title: "Slack", content: null, width: 1100, height: 700 },
  gmail: { id: "gmail", title: "Gmail", content: null, width: 1000, height: 660 },
};

const apps: LinuxApp[] = [
  { id: "slack", name: "Slack", icon: <SlackLogo />, window: () => ({ content: null, width: 1100, height: 700 }) },
  { id: "gmail", name: "Gmail", icon: <GmailLogo />, window: () => ({ content: null, width: 1000, height: 660 }) },
];

// An app kit fills its parent: give it the whole content box.
const fill = (node: ReactNode) => (
  <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
    <div style={{ position: "absolute", inset: 0 }}>{node}</div>
  </div>
);
const scenes: Record<string, ReactNode> = { slack: fill(<SlackScene />), gmail: fill(<GmailScene />) };

export function Desktop() {
  const [saved, setSaved] = useState<SavedWindow[] | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ windows?: SavedWindow[] }>().then((s) => setSaved(s?.windows ?? null));
  }, []);
  if (saved === undefined) return null;      // options.windows is read on mount only
  return <Ubuntu saved={saved} />;
}

function Ubuntu({ saved }: { saved: SavedWindow[] | null }) {
  const linux = useLinux({
    windows: saved
      ? [...saved].sort((a, b) => a.z - b.z).map(({ id, title, x, y, width, height, maximized }) => ({ id, title, content: null, x, y, width, height, maximized }))
      : [WINDOWS.gmail],
    onEvent(event) {
      if (event.type === "launch") casuro.track.decision({ summary: `Opened ${event.app}` });
    },
  });

  // Minimized is not an option: apply it once after mount.
  useEffect(() => {
    for (const w of saved ?? []) if (w.minimized) linux.minimize(w.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The world: 30s in, Priya writes on Slack. Notify, then bring Slack to the front.
  useEffect(() => {
    const t = setTimeout(() => {
      linux.toast("Priya Shah", "Can you look at the Q3 numbers?");
      casuro.track.notification({ title: "Slack", text: "Priya Shah: Can you look at the Q3 numbers?" });
      linux.open(WINDOWS.slack);             // opens it, or focuses (and un-minimizes) the open one
    }, 30_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the layout (debounced: a drag changes it on every frame).
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const windows: SavedWindow[] = linux.state.windows.map((w) => ({
        id: w.id, title: typeof w.title === "string" ? w.title : w.id,
        x: w.x, y: w.y, width: w.width, height: w.height, z: w.z, maximized: w.maximized, minimized: w.minimized,
      }));
      void casuro.store.set({ windows });    // merge with the rest of your episode's state
    }, 500);
  }, [linux.state.windows]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Linux linux={linux} apps={apps} renderWindow={(w: LinuxWindow) => scenes[w.id]} />
    </div>
  );
}
```

Closing a window unmounts its content, so an app kit inside loses its
state. If a window can be closed and reopened, call the app kit's hook in
the component that owns the desktop (or save its `state` with
`casuro.store` and pass it back as `restore`), not inside the window.
