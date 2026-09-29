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
