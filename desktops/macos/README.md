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
- `toast(title, body?)`: a notification banner, top right.
- `setTheme("light" | "dark")`; `state` is `{ windows, focused, toasts, theme }`.
- `onEvent` gets what the person does: `open`, `close`, `focus`, `minimize`, `restore`, `maximize`, `move`, `resize`, `dock`, `menu`, `theme`.

## `<MacOS>` props

- `mac`: from `useMacOS`.
- `dock`: `{ id, name, icon, onOpen }[]`. A window with `dockId` equal to an item's `id` gives it the running dot, and clicking the item restores that window instead of calling `onOpen`. Trash is always last (`onTrash`).
- `renderWindow(window)`: draws windows opened without `content`, e.g. from saved state.
- `idleApp`: the menu bar's app name when no window is focused (default "Finder").

`AppIcon` draws the Dock's icons: `finder`, `safari`, `notes`, `terminal`, `settings`, `trash`, `folder`.

The menu bar has the Apple menu (About This Mac, Dark Mode), the focused
app's menu and a Window menu; the Control Center icon switches dark mode.
Cmd+W closes and Cmd+M minimizes the focused window while focus is in the desktop.
