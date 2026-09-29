# Zoom (React)

`apps/zoom.html` as React components: Zoom's in-meeting window, the same
look pixel for pixel, with the sample data swapped for props. Like a shadcn
component, you copy the folder into your project and it is yours: use it as
it is, or change any file for what your screen needs.

```bash
cp -r apps/zoom src/apps/zoom
```

It needs only React 19. The styles are plain CSS scoped to `.kit-zoom`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Lato is embedded, so nothing loads from the network. The
meeting window is always dark, like the real client.

## Use

```tsx
import { Zoom, useZoom, type ZoomSeed } from "./apps/zoom";

const seed: ZoomSeed = {
  meeting: { title: "Weekly sync", id: "812 4410 2297", passcode: "k29sQ" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera" },
    priya: { name: "Priya Shah" },
    tom: { name: "Tom Becker" },
    ana: { name: "Ana Lopes" },
  },
  participants: ["priya", "tom"],
  muted: ["tom"],
  waiting: ["ana"],
  chat: [{ from: "priya", text: "Agenda is in the doc" }],
  screens: [{ id: "slides", title: "Q3 plan.key", thumb: "document" }],
};

function Meeting() {
  const zoom = useZoom(seed, {
    onEvent(event) {
      if (event.type === "admit") {
        // Ana is in: have her say hello.
        zoom.chat(event.person, "Hi all, sorry I'm late");
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Zoom zoom={zoom} renderScreen={(share) => <img src={`/screens/${share.screen}.png`} alt="" />} />
    </div>
  );
}
```

`<Zoom>` fills the box it is in, so give that box a height. It switches to
Zoom's phone layout (the speaker full screen, pages of tiles to swipe, the
End button in the top bar) when the box is under 760px wide, and floats the
side panels over the video under 1100px, whatever the window size, so it
also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `meeting`: the title, meeting ID, passcode, host (the signed-in person by
  default) and invite link, shown in the top bar and the info popover.
- `people`: everyone who may appear, by id. `me` is the signed-in person.
  `photo` is their camera feed when video is on and their picture when off;
  without one, initials on `color`.
- `participants` in the meeting at the start, with who is `muted` and who has
  `cameraOff`; `waiting` in the waiting room; the `chat` so far.
- `contacts` for the Invite dialog, `screens` for the Share Screen dialog,
  recent `whiteboards` (with sticky notes), and `apps` for the Apps panel.
- `share`: someone already sharing when the meeting opens.

A shared screen is 1280x800, scaled to fit. The kit does not know what is on
it: `renderScreen(share)` draws `share.screen` (the id of a `screens` entry,
or whatever the world passed to `zoom.share`). Without it, the screen's id
shows on a grey screen.

## Driving it

`useZoom` returns the meeting. The world acts on it through:

| Call | What happens |
| --- | --- |
| `zoom.join(personId, { video, muted, quiet })` | They join (from the waiting room, if they were in it), with a chime and a toast. |
| `zoom.admitRequest(personId)` | They knock: they wait in the waiting room, with a notice to admit them. Straight in when the waiting room is off. |
| `zoom.leave(personId, message?)` | They leave, or leave the waiting room. |
| `zoom.speaking([ids])` | Who is talking: the green ring, and the big tile in speaker view. |
| `zoom.say(personId, text)` | They talk, and it shows as a caption when captions are on. |
| `zoom.react(personId, emoji)` | A reaction pops on their tile for five seconds. |
| `zoom.raiseHand(personId, on)` | Their hand goes up (top of the participants list) or down. |
| `zoom.mute(personId, on)` / `zoom.camera(personId, on)` | They mute, or turn their camera on or off. |
| `zoom.share(personId, screen)` / `zoom.share(null)` | They share a screen (under the green "You are viewing" bar), or stop. |
| `zoom.chat(from, text, to?, { file? })` | A chat message, to everyone or (with `to`) a direct message. It bumps the Chat badge and toasts while the chat is closed. Returns its id. |
| `zoom.end()` | The host ends the meeting for everyone. |
| `zoom.toast(text)` | A notice at the top. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "mute", muted }` / `{ type: "video", on }` / `{ type: "audio", joined }` | They mute or unmute, turn video on or off, leave or join computer audio. |
| `{ type: "share", action, screen?, whiteboard? }` | They start, stop, pause or resume sharing a screen or a whiteboard. |
| `{ type: "record", action, kind? }` | They start (local or cloud), pause, resume or stop recording, or ask the host to. |
| `{ type: "react", emoji }` / `{ type: "hand", raised }` / `{ type: "feedback", value }` | Reactions, the raised hand, and yes/no/slower/faster. |
| `{ type: "chat", id, text, to }` | They send a chat message (`to` is "everyone" or a person's id). |
| `{ type: "attach", to }` | They press "Send a file" in the chat: answer with `zoom.chat(me, "", to, { file })`. |
| `{ type: "admit", person }` / `{ type: "deny", person }` | They admit someone from the waiting room, or remove them from it. |
| `{ type: "participant", action, person }` | As host: mute, ask to unmute, ask to start video, stop video, lower a hand, pin, spotlight, put in the waiting room, remove. Asking only asks: answer with `zoom.mute` or `zoom.camera`. |
| `{ type: "mute-all", allowUnmute }` / `{ type: "invite", people }` | Mute All; the Invite dialog (bring them in with `zoom.join`). |
| `{ type: "view", view }` / `{ type: "captions", on }` / `{ type: "security", setting, on }` / `{ type: "app", name }` | The View menu, captions, the Security menu, an app in the Apps panel. |
| `{ type: "end" }` / `{ type: "leave" }` / `{ type: "rejoin" }` | They end the meeting for all, leave it, or rejoin from the "You left" screen. |

`zoom.state` is everything that changed, as plain JSON: save it, and pass it
back as `useZoom(seed, { restore })` to pick up where they left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Zoom.tsx` | The window, the top bar with the meeting info and View menu, the waiting room notice, the "You left" screen, menus, toast, keyboard shortcuts. |
| `Stage.tsx` | The video tiles in gallery, speaker and phone layouts, a shared screen and its view options, annotation, the whiteboard, captions, and your own share with its floating controls. |
| `Toolbar.tsx` | The bottom toolbar, its overflow into More, and the menus it opens (audio, video, security, record, reactions, whiteboards, end). |
| `Panels.tsx` | The Participants panel with the waiting room, the Meeting Chat with the recipient picker, the Apps panel. |
| `Dialogs.tsx` | The confirm, Share Screen and Invite dialogs. |
| `use-zoom.ts` | The state and what changes it. |
| `context.tsx` | What the parts share: the context, the avatar, the clock, menu items. |
| `icons.tsx` | Zoom's icons and logo. |
| `zoom.css` | The look, from the mockup. |

What is on a shared screen is yours to draw with `renderScreen`. For
anything else, edit the files. The mockup's virtual backgrounds dialog,
rename, co-hosts and remote control are left out; add them the same way if
your screen needs them.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=zoom` next to `/apps/zoom.html`: the same meeting and demo
(someone knocking, hands, reactions, Lena sharing her design file, people
talking, replies in the chat), drawn by the React version.
