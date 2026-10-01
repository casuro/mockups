# macOS desktop (React)

`desktops/macos.html` as React components: a macOS desktop (wallpaper, menu
bar, Dock, windows) whose windows hold any React content, so you can put an
app mockup, another kit (`<Slack>`, `<Gmail>`) or a placeholder inside one.
Copy the folder into your project and change it as you like.

It needs only React 19. The styles are plain CSS scoped to `.kit-macos`, so
they neither leak into the page nor pick up its styles.

## Use

```tsx
import { AppIcon, MacOS, useMacOS } from "./desktops/macos";

function Desktop() {
  const mac = useMacOS({
    windows: [{ id: "notes", title: "Notes", dockId: "notes", content: <p>Hello</p> }],
    onEvent: (event) => console.log(event), // { type: "close", id: "notes" } ...
  });
  return (
    <div style={{ height: "100vh" }}>
      <MacOS
        mac={mac}
        dock={[{ id: "notes", name: "Notes", icon: <AppIcon name="notes" />, onOpen: () => mac.open({ id: "notes", title: "Notes", dockId: "notes", content: <p>Hello</p> }) }]}
      />
    </div>
  );
}
```

`<MacOS>` fills the box it is put in; give that box a height. In a box under
760px wide, windows fill it like apps on a phone.

## The desktop: `useMacOS(options)`

- `options.windows`: windows open at the start; `options.theme`: `"light"` (default) or `"dark"`.
- `open(window)`: opens `{ id, title, content?, app?, dockId?, icon?, width?, height?, x?, y? }`, or brings the open window with that id to the front.
- `close(id)`, `focus(id)`, `minimize(id)`, `restore(id)`, `toggleMaximize(id)`, `moveTo(id, x, y)`, `resizeTo(id, w, h)`.
- `toast(title, body?, from?)`: a notification banner, top right, with the icon of the app it comes from (`{ app: "slack" }`, a Dock id) or the Apple logo.
- `setTheme("light" | "dark")`; `state` is `{ windows, focused, toasts, theme }`.
- `onEvent` gets what the person does: `open`, `close`, `focus`, `minimize`, `restore`, `maximize`, `move`, `resize`, `dock`, `menu`, `theme`.

## `<MacOS>` props

- `mac`: from `useMacOS`.
- `dock`: `{ id, name, icon, tile?, onOpen }[]`. `icon` is just the app's logo: the Dock puts it on a macOS app icon tile (below). A window with `dockId` equal to an item's `id` gives it the running dot, and clicking the item restores that window instead of calling `onOpen`. Trash is always last (`onTrash`).
- `renderWindow(window)`: draws windows opened without `content`, e.g. from saved state.
- `idleApp`: the menu bar's app name when no window is focused (default "Finder").

`AppIcon` draws macOS's own icons: `finder`, `safari`, `notes`, `terminal`, `settings`, `trash`, `folder`.

### App icons: pass the logo, the Dock draws the tile

Every app icon (the Dock, the phone's home screen, notifications, the
Window menu) is drawn as a macOS Tahoe icon: a squircle of glass with a
light rim and a soft shadow, the logo inside at a fixed size. Pass only the
logo, at any size it was drawn at; it is fitted to the tile:

```tsx
import { AppLogo, appTile } from "./apps/linear/icons";   // every app kit has these two
dock={[
  { id: "slack", name: "Slack", icon: <SlackLogo /> },                     // white glass tile
  { id: "linear", name: "Linear", icon: <AppLogo />, tile: appTile },      // the kit's own tile
  { id: "zoom", name: "Zoom", icon: <ZoomLogo />, tile: "full" },          // already a whole icon
  { id: "acme", name: "Acme", icon: "A", tile: "linear-gradient(#ff9a4d, #f0532c)" },  // a brand color
  { id: "metrics", name: "Metrics", icon: "📊" },                         // an emoji
]}
```

Anything can be an icon. In order of preference: the app kit's `AppLogo`
(with its `appTile`), then any `<svg>` or `<img>` you draw or have, then an
emoji (`icon: "📊"`), then a letter or short word (`icon: "A"`, `"Ops"`),
set bold and shrunk to fit. An emoji or text, as a string or in a plain
element (`<span>📊</span>`), fills the logo's box at every size, and
anything else is centered in it and cut off at its edge.

`tile` is what the logo sits on: left out (or `"#fff"`), the white tile;
any CSS color or gradient, a glass tile of that color; `"full"`, a logo that
is itself a square app icon, cut to the tile's shape edge to edge; `"none"`,
the logo alone with no tile, as the Trash. Do not wrap the logo in a tile of
your own: it would sit on the Dock's tile. `<AppTile tile="...">logo</AppTile>`
is the same tile for your own pages (a Launchpad, a Finder window); an
`AppTile` or `AppIcon` passed as an `icon` is drawn as it is, never on a
second tile.

The menu bar has the Apple menu (About This Mac, Dark Mode), the focused
app's menu and a Window menu; the Control Center icon switches dark mode.
Cmd+W closes and Cmd+M minimizes the focused window while focus is in the desktop.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-macos.ts`, `tile.tsx` and
`MacOS.tsx`; you should not need to open them.

### Imports

```ts
import {
  MacOS, useMacOS, AppIcon, AppTile, TILES,
  type MacOSProps, type MacOSDesktop, type MacOSOptions, type IconName, type AppTileProps,
  type MacWindowInput, type MacWindow, type DockItem, type MacToast, type MacToastFrom, type MacTheme, type MacState, type MacEvent,
} from "./desktops/macos";
```

`AppIcon` is `({ name: IconName; background?: string; bare?: boolean }) => JSX`
with `IconName` one of `"finder" | "safari" | "notes" | "terminal" | "settings" | "trash" | "folder"`;
`TILES` is each name's default tile (`"none"` for the Trash and the folder,
which have none); `bare` draws it without its tile.

`AppTile` is `({ children: ReactNode; tile?: string; inset?: string | number; className?; style? }) => JSX`:
the app icon tile around any logo (an `<svg>`, an `<img>`, a component, an
emoji, or a letter or short word). `tile` as in `DockItem`; `inset` is the room around the
logo, as a share of the tile (default `"19%"`, `0` for `"full"` and
`"none"`). It fills its parent's width and stays square.

### The hook

```ts
function useMacOS(options?: MacOSOptions): MacOSDesktop;

interface MacOSOptions {
  windows?: MacWindowInput[];              // open at the start; read once, on mount
  theme?: "light" | "dark";                // default "light"; read once, on mount
  onEvent?: (event: MacEvent) => void;     // what the person does; read through a ref
}

interface MacWindowInput {
  id: string;                  // required; one window per id
  title: string;               // required
  icon?: ReactNode;            // its logo in the Window menu, on a tile; default: its Dock item's icon
  content?: ReactNode;         // leave out and draw it with <MacOS renderWindow>
  app?: string;                // menu bar name while focused; default `title`
  dockId?: string;             // the DockItem it belongs to: running dot, Dock click restores it
  width?: number;              // default 720
  height?: number;             // default 440
  x?: number;                  // default cascaded from 120
  y?: number;                  // default cascaded from 50
}
```

Windows in `options.windows` stack in array order (the last one is in front
and focused). There is no option for a window to start minimized or
maximized: call `minimize` / `toggleMaximize` after mount.

### What code can do

All functions are stable across renders. None of them emits an event.

```ts
mac.open(win: MacWindowInput): void
  // new id: adds the window in front and focuses it.
  // open id: brings it to the front, un-minimizes it, and replaces its content only if `win.content` is given
  // (title, size and position are kept).
mac.close(id: string): void
mac.focus(id: string): void                 // to the front, un-minimized
mac.minimize(id: string): void
mac.restore(id: string): void               // same as focus
mac.toggleMaximize(id: string): void
mac.moveTo(id: string, x: number, y: number): void
mac.resizeTo(id: string, width: number, height: number): void
mac.toast(title: string, body?: string, from?: MacToastFrom): void   // notification banner, top right, gone after 4.2s
  // from: { app: "slack" } shows that Dock item's icon; { icon: <Logo />, tile?: string } an icon of its own;
  // left out, the Apple logo.
mac.dismissToast(id: number): void
mac.setTheme(theme: "light" | "dark"): void
mac.emit(event: MacEvent): void             // used by <MacOS> to report the person's actions
mac.state: MacState
```

### Events

```ts
type MacEvent =
  | { type: "open"; id: string }             // declared, but nothing in the kit emits it
  | { type: "close"; id: string }            // close button, Cmd+W, app menu Quit
  | { type: "focus"; id: string }            // pressing on a window that was not focused
  | { type: "minimize"; id: string }         // minimize button, Cmd+M, app menu Hide, phone home bar
  | { type: "restore"; id: string }          // picking a window in the Window menu
  | { type: "maximize"; id: string; maximized: boolean }  // zoom button or title bar double-click
  | { type: "move"; id: string; x: number; y: number }    // at the end of a drag
  | { type: "resize"; id: string; width: number; height: number }  // at the end of a resize
  | { type: "dock"; id: string }             // a Dock click (id "trash" for the Trash), before onOpen/restore
  | { type: "menu"; item: string }           // any menu bar item picked, by label
  | { type: "theme"; theme: "light" | "dark" };
```

Only the person's actions are reported; your calls are silent. A Dock click
on an item with no window sends `dock` and then calls its `onOpen`; nothing
reports the window that `onOpen` opens.

### State

```ts
interface MacState {
  windows: MacWindow[];
  focused: string | null;
  toasts: { id: number; title: string; body?: string; app?: string; icon?: ReactNode; tile?: string }[];
  theme: "light" | "dark";
}

interface MacWindow {
  id: string; title: string; app: string; dockId?: string;
  x: number; y: number; width: number; height: number;
  z: number;                   // stacking order; higher is in front
  minimized: boolean; maximized: boolean;
  icon?: ReactNode; content?: ReactNode;   // React nodes: not JSON
}
```

`mac.state` is not plain JSON: `content` and `icon` are React nodes. Save
only the layout (`id`, `title`, `app`, `dockId`, `x`, `y`, `width`,
`height`, `z`, `minimized`, `maximized`) and draw windows with
`renderWindow` instead of `content`. To restore, sort the saved windows by
`z`, pass them as `options.windows` without `content`, and after mount call
`minimize` / `toggleMaximize` for those that were. `renderWindow` is only
used for windows whose `content` is undefined.

### The component

```ts
interface MacOSProps {
  mac: MacOSDesktop;                               // required: the hook's return
  dock?: DockItem[];                               // left to right; Trash is always added last
  renderWindow?: (win: MacWindow) => ReactNode;    // draws windows opened without `content`
  idleApp?: string;                                // menu bar name with no focused window; default "Finder"
  onTrash?: () => void;
  className?: string;
  style?: CSSProperties;
}

interface DockItem {
  id: string;
  name: string;                // the Dock tooltip and the phone home screen label
  icon: ReactNode;             // the app's logo (<AppLogo />, <svg>, <img>, "📊", "A") or <AppIcon name="notes" />
  tile?: string;               // what the logo sits on: default white, a CSS color or gradient, "full" or "none"
  onOpen?: () => void;         // called on click when no window has `dockId === id`
}
```

The Dock draws each `icon` on an app icon tile (see "App icons" above), so
pass the bare logo, never a tile of your own.

It fills its parent, so the parent needs a definite height. A window's body
(`.wbody`) is `position: relative` with `overflow: auto`, and the desktop's
CSS stops at its first child, so an app kit inside keeps its own styles. App
kits fill their parent's height, so put them in a
`position: absolute; inset: 0` box inside the window.

### Wiring it in an episode

Two app kits in windows, each with a Dock icon from its logo, a world event
that opens a window and shows a notification from that app, and the layout
saved and redrawn.

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { casuro } from "@/lib/casuro";
import { MacOS, useMacOS, type MacWindow, type MacWindowInput } from "./desktops/macos";
// Each app kit's logo and tile for a launcher, from src/apps/<app>/icons.tsx:
import { AppLogo as SlackLogo, appTile as slackTile } from "./apps/slack/icons";
import { AppLogo as GmailLogo, appTile as gmailTile } from "./apps/gmail/icons";
import { SlackScene } from "./SlackScene";   // the episode's own scenes, each rendering an app kit
import { GmailScene } from "./GmailScene";

// What is saved per window: the layout, never the React content.
type SavedWindow = Pick<MacWindow, "id" | "title" | "app" | "dockId" | "x" | "y" | "width" | "height" | "z" | "minimized" | "maximized">;

const WINDOWS: Record<string, MacWindowInput> = {
  slack: { id: "slack", title: "Slack", dockId: "slack", width: 1000, height: 640, x: 80, y: 40 },
  gmail: { id: "gmail", title: "Gmail", dockId: "gmail", width: 960, height: 620, x: 200, y: 90 },
};

// An app kit fills its parent: give it the whole window body.
const fill = (node: ReactNode) => <div style={{ position: "absolute", inset: 0 }}>{node}</div>;
const scenes: Record<string, ReactNode> = { slack: fill(<SlackScene />), gmail: fill(<GmailScene />) };

export function Desktop() {
  const [saved, setSaved] = useState<SavedWindow[] | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ windows?: SavedWindow[] }>().then((s) => setSaved(s?.windows ?? null));
  }, []);
  if (saved === undefined) return null;      // options.windows is read on mount only
  return <Mac saved={saved} />;
}

function Mac({ saved }: { saved: SavedWindow[] | null }) {
  const mac = useMacOS({
    // No `content`: every window is drawn by renderWindow, so the state stays redrawable.
    windows: saved ? [...saved].sort((a, b) => a.z - b.z) : [WINDOWS.gmail, WINDOWS.slack],
    onEvent(event) {
      if (event.type === "close") casuro.track.decision({ summary: `Closed ${event.id}` });
    },
  });

  // Minimized and maximized are not options: apply them once after mount.
  useEffect(() => {
    for (const w of saved ?? []) {
      if (w.minimized) mac.minimize(w.id);
      if (w.maximized) mac.toggleMaximize(w.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The world: 30s in, Priya writes on Slack. Notify, then bring Slack to the front.
  useEffect(() => {
    const t = setTimeout(() => {
      mac.toast("Priya Shah", "Can you look at the Q3 numbers?", { app: "slack" });   // with Slack's icon
      casuro.track.notification({ title: "Slack", text: "Priya Shah: can you look at the Q3 numbers?" });
      mac.open(WINDOWS.slack);               // opens it, or brings the open one to the front
    }, 30_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the layout (debounced: a drag changes it on every frame).
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const windows: SavedWindow[] = mac.state.windows.map(({ id, title, app, dockId, x, y, width, height, z, minimized, maximized }) =>
        ({ id, title, app, dockId, x, y, width, height, z, minimized, maximized }));
      void casuro.store.set({ windows });    // merge with the rest of your episode's state
    }, 500);
  }, [mac.state.windows]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MacOS
        mac={mac}
        dock={[
          // Just the logo: the Dock draws the tile.
          { id: "slack", name: "Slack", icon: <SlackLogo />, tile: slackTile, onOpen: () => mac.open(WINDOWS.slack) },
          { id: "gmail", name: "Gmail", icon: <GmailLogo />, tile: gmailTile, onOpen: () => mac.open(WINDOWS.gmail) },
        ]}
        renderWindow={(w: MacWindow) => scenes[w.id]}
      />
    </div>
  );
}
```

Closing a window unmounts its content, so an app kit inside loses its
state. If a window can be closed and reopened, call the app kit's hook in
the component that owns the desktop (or save its `state` with
`casuro.store` and pass it back as `restore`), not inside the window.
