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
