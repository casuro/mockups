# Google Meet (React)

`apps/meet.html` as React components: Meet's in-call screen, the same look,
pixel for pixel, with the sample data swapped for props. Like a shadcn
component, you copy the folder into your project and it is yours: use it as
it is, or change any file for what your screen needs.

```bash
cp -r apps/meet src/apps/meet
```

It needs only React 19. The styles are plain CSS scoped to `.kit-meet`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Roboto is embedded, so nothing loads from the network.

## Use

```tsx
import { Meet, useMeet, type MeetSeed } from "./apps/meet";

const seed: MeetSeed = {
  meeting: { title: "Weekly sync", code: "abc-defg-hij", host: "priya", org: "Northwind" },
  me: "you",
  people: {
    you: { name: "Sam Rivera", email: "sam@northwind.com" },
    priya: { name: "Priya Shah", photo: "/faces/priya.jpg" },
    omar: { name: "Omar Haddad" },
  },
  inCall: ["priya", "omar"],
  video: ["priya"],
  muted: ["omar"],
  presenter: "priya",
  chat: [{ from: "priya", text: "Slides are in the doc", at: Date.now() - 120_000 }],
};

function Call() {
  const meet = useMeet(seed, {
    onEvent(event) {
      if (event.type === "chat") {
        // The person wrote in the chat; answer, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Meet meet={meet} renderScreen={(presenter) => <Slides by={presenter} />} />
    </div>
  );
}
```

`<Meet>` fills the box it is in, so give that box a height. It switches to
Meet's phone layout when the box is under 760px wide, whatever the window
size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `meeting`: the title, the code in the bar and the joining link, the `host`,
  and optionally a Calendar `doc`, a `dialIn` number and your `org`.
- `people`: everyone who is or may be in the call, by id. `me` is the
  signed-in person. `photo` is their face on camera and their avatar; without
  it they show their initial on `color`. `room` is what is drawn behind their
  face (picked from their id when left out).
- `inCall`: who is in the call besides you, in tile order. `video`, `muted`
  and `hands` say who has their camera on, their mic off, their hand up.
- `presenter`: someone already presenting; the stage shows `renderScreen`.
- `chat` and `questions` (Q&A) already there; `invitable` for "Add people".
- `mic` and `camera` for how you join; `devices` for the menu names; `theme`.

## Driving it

`useMeet` returns the call. The world acts on it through:

| Call | What happens |
| --- | --- |
| `meet.join(id, { video, muted })` | Someone joins: a chime and "Priya joined". |
| `meet.leave(id)` | Someone leaves; their hand goes down and their presentation stops. |
| `meet.speaking([ids])` | Who is talking: the blue ring and bars. Spotlight and sidebar follow the latest speaker. Include `me` for the signed-in person. |
| `meet.caption(id, text)` | A line of captions, typed out word by word while captions are on. |
| `meet.react(id, emoji)` | A reaction floats up the stage with their name. |
| `meet.raiseHand(id, on)` | A hand goes up (with a snackbar and "Open queue") or down. |
| `meet.present(id)` / `meet.present(null)` | Someone starts or stops presenting. |
| `meet.chat(id, text)` | A chat message; a preview and a dot when the chat is closed. Returns its id. |
| `meet.media(id, { muted, video })` | Someone mutes or turns their camera off. |
| `meet.vote(index)` / `meet.ask(id, text)` / `meet.upvote(questionId, n)` | Votes in your poll, questions and upvotes in Q&A. |
| `meet.toast(text, { who })` | A snackbar at the bottom left. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "mic" \| "camera", on }` | They mute, unmute, or turn the camera on or off. |
| `{ type: "hand", raised }` | They raise or lower their hand. |
| `{ type: "react", emoji }` | They send a reaction. |
| `{ type: "present", on, source? }` | They present (screen, window, tab or whiteboard) or stop. |
| `{ type: "chat", text, id }` | They send a chat message. |
| `{ type: "captions", on }` | They turn captions on or off. |
| `{ type: "layout", layout, hideNoVideo }` / `{ type: "pin", person }` | They change the layout or pin a tile. |
| `{ type: "panel", panel }` | They open or close a side panel. |
| `{ type: "record" \| "transcript", on }` | They start or stop recording or a transcript. |
| `{ type: "poll", action, question, options, choice? }` / `{ type: "question", action, id, text }` | Polls and Q&A. |
| `{ type: "person", action, person }` / `{ type: "lower-all" }` | They invite, mute or remove someone, or lower hands. |
| `{ type: "draw", tool, strokes }` | They finish a stroke on the whiteboard (`strokes` is how many are on it). The drawing itself is on a canvas, which nothing can read, so record this if the drawing matters. |
| `{ type: "leave" }` / `{ type: "rejoin" }` / `{ type: "rate", stars }` | They leave, rejoin, or rate the call. |
| `{ type: "action", kind, label }` | Anything else: copy link, open the doc, breakout rooms, help, report, a device, a setting. |

Rejoining keeps who is in the call (the world may have changed it) and
resets your own things: panel, pin, captions, recording, poll.

`meet.state` is everything that changed, as plain JSON: save it, and pass it
back as `useMeet(seed, { restore })` to pick up where they left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Meet.tsx` | The layout, menus, snackbars, tooltips, chat preview, the "You left" screen, keyboard shortcuts. |
| `Stage.tsx` | Camera feeds and tiles, the layouts, the presentation and its strip, the whiteboard, captions, reactions. |
| `Bar.tsx` | The control bar, its menus and the reaction bar. |
| `Panels.tsx` | People, chat, meeting details, activities (polls, Q&A), host controls, effects. |
| `Dialogs.tsx` | Adjust view, settings, report a problem, add people. |
| `use-meet.ts` | The state and what changes it. |
| `context.tsx` | What the parts share, and the avatar. |
| `icons.tsx` | Meet's icons and the Docs logo. |
| `meet.css` | The look, from the mockup. |

What someone presents is yours to draw: `renderScreen(presenter)` returns
the screen at 1280 x 720 (a slide, a design file, a document), and the stage
scales it to fit with the presenter's label. Without it, a plain placeholder.
For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=meet` next to `/apps/meet.html`: the same call and demo,
drawn by the React version.
