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
| `meet.chat(id, text)` | A chat message; a preview and a dot when the chat is closed. Returns its id. An empty text delivers nothing and returns `""`. |
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

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-meet.ts` and
`Meet.tsx`; you should not need to open them.

### Imports

```ts
import {
  Meet, useMeet,
  type MeetProps, type MeetCall, type MeetOptions, type Person,
  type MeetSeed, type MeetState, type MeetEvent, type MeetPerson, type MeetRoom,
  type MeetChatInput, type MeetChatMessage, type MeetQuestionInput, type MeetQuestion, type MeetPoll,
  type MeetLayout, type MeetPanel, type MeetActivity, type MeetShareSource, type MeetHostControls,
} from "./apps/meet";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/meet/icons";
```

### The hook

```ts
function useMeet(seed: MeetSeed, options?: MeetOptions): MeetCall;

interface MeetOptions {
  restore?: MeetState | null;              // a saved `meet.state`; read on the first render only
  onEvent?: (event: MeetEvent) => void;    // what the signed-in person does
  sounds?: boolean;                        // join/leave chimes; default true (also a switch in Settings)
}
```

`restore` is used only when its `version` is `1`; otherwise the seed is used.
`onEvent` is read through a ref, so an inline function is fine. It throws if
`seed.me` is not a key of `seed.people`. Keep the seed at module level (or in
`useMemo`): `people` and `devices` are recomputed whenever the seed object
changes.

### The seed

```ts
interface MeetSeed {
  meeting: {                               // required
    title: string;                         // required
    code: string;                          // required, "abc-defg-hij"
    host?: string;                         // a person id; `me` by default
    doc?: string;                          // Calendar attachment title in Meeting details
    dialIn?: { number: string; pin: string };
    org?: string;                          // "People in Northwind can join"
  };
  me: string;                              // required: a key of `people`
  people: Record<string, MeetPerson>;      // required: everyone who is or may be in the call
  inCall: string[];                        // required: in the call besides you, in tile order
  video?: string[];                        // cameras on (others show their avatar); none by default
  muted?: string[];                        // mics off
  hands?: string[];                        // raised hands, in order
  presenter?: string | null;               // presenting when you join; the stage shows `renderScreen`
  chat?: MeetChatInput[];
  questions?: MeetQuestionInput[];         // Q&A already asked
  invitable?: string[];                    // "Add people" list; everyone in `people` by default
  mic?: boolean;                           // your mic as you join; default true
  camera?: boolean;                        // your camera as you join; default true
  devices?: { mic?: string[]; speaker?: string[]; camera?: string[] };  // device menu names
  theme?: "light" | "dark";                // panels and dialogs; the call itself is always dark
}

interface MeetPerson {
  name: string;                            // required
  email?: string;                          // `<id>@<domain of the first email>` by default
  photo?: string;                          // face on camera and avatar; else initial on `color`
  color?: string;
  room?: MeetRoom;                         // drawn behind their face; picked from the id by default
}
interface MeetRoom { wall: [string, string]; side: "left" | "right"; kind: "window" | "art" | "shelf" }

interface MeetChatInput { id?: string; from: string; text: string; at?: number | string }   // at: ms or date string; now by default
interface MeetQuestionInput { id?: string; from: string; text: string; votes?: number }
```

### What the world can do

All on the object `useMeet` returns; every function is stable across
renders and safe to call from timers and after `await`. None of them fires
`onEvent`.

```ts
meet.join(person: string, o?: { video?: boolean; muted?: boolean }): void  // joins with a chime and "X joined"; video on, mic on by default; throws if not in `people`; no-op for `me` or someone already in
meet.leave(person: string): void               // leaves; their hand goes down, their presentation and pin stop
meet.speaking(ids: string[]): void             // who is talking now (blue ring, bars); [] for nobody; include `me` for the signed-in person (shown only while their mic is on)
meet.caption(person: string, text: string): void  // a caption line, typed out word by word; shown only while captions are on
meet.react(person: string, emoji: string): void   // a reaction floats up the stage
meet.raiseHand(person: string, on?: boolean): void  // on defaults to true; only for people in the call
meet.present(person: string | null): void      // someone starts presenting, or presenting stops
meet.chat(person: string, text: string): string   // a chat message from them; returns its id
meet.media(person: string, o: { muted?: boolean; video?: boolean }): void  // someone mutes or turns their camera off/on
meet.vote(index: number): void                 // one more vote for option `index` of the live poll (only exists once the person launches one)
meet.ask(person: string, text: string): string // a Q&A question; returns its id
meet.upvote(id: string, count?: number): void  // count defaults to 1
meet.toast(text: string, o?: { who?: string }): void  // a snackbar, with `who`'s avatar
```

Read-only fields: `seed`, `people: Record<string, Person>` (with `id`,
`name`, `first` ("You" for `me`), `email`, `color`, `photo?`, `room`), `me`,
`devices`, `state`, `speakers` (who shows as speaking now), `dominant` (the
latest speaker other than `me`; changes at most every 5s), `snacks`, `notif`,
`floats`, `captionLine` (`{ who, text, n } | null`). `meet.ui` holds what
`<Meet>` calls for the signed-in person (`setMic`, `setCamera`,
`toggleCaptions`, `sendChat`, `leave`, ...); each one fires an `onEvent`, so
the world should not call them.

### Events

```ts
type MeetEvent =
  | { type: "mic"; on: boolean }
  | { type: "camera"; on: boolean }
  | { type: "hand"; raised: boolean }
  | { type: "react"; emoji: string }
  | { type: "present"; on: boolean; source?: "screen" | "window" | "tab" | "whiteboard" }
  | { type: "chat"; text: string; id: string }
  | { type: "captions"; on: boolean }
  | { type: "layout"; layout: "auto" | "tiled" | "spotlight" | "sidebar"; hideNoVideo: boolean }
  | { type: "pin"; person: string | null }
  | { type: "panel"; panel: "people" | "chat" | "info" | "activities" | "host" | "effects" | null }
  | { type: "record"; on: boolean }
  | { type: "transcript"; on: boolean }
  | { type: "poll"; action: "launch" | "vote" | "end"; question: string; options: string[]; choice?: number | null }
  | { type: "question"; action: "ask" | "upvote"; id: string; text: string }
  | { type: "person"; action: "invite" | "mute" | "remove" | "lower-hand"; person: string }
  | { type: "lower-all" }
  | { type: "draw"; tool: "pen" | "eraser"; strokes: number }
  | { type: "leave" }
  | { type: "rejoin" }
  | { type: "rate"; stars: number }
  | { type: "action"; kind: "copy-link" | "open-doc" | "breakout" | "help" | "report" | "device" | "setting"; label: string };
```

### State

`meet.state` is a `MeetState`, plain JSON: `version: 1`, `view: "call" |
"left"`, `mic`, `camera`, `inCall`, `video`, `muted`, `hands`, `presenter`,
`sharing`, `chat: MeetChatMessage[]` (`{ id, from, text, at }`), `unread`,
`panel`, `activity`, `layout`, `pinned`, `hideNoVideo`, `captions`,
`recording`, `transcript`, `poll: MeetPoll | null` (`{ question, options: {
text, votes }[], mine }`), `questions: MeetQuestion[]` (`{ id, from, text,
votes, mine }`), `background`, `filter`, `device`, `host`, `chimes`,
`leaveEmpty`, `rating`, `theme`, `seq`. Save it whenever it changes and pass
it back as `useMeet(seed, { restore })`. Who is speaking, snackbars,
reactions and the caption line are not in it.

### The component

```ts
interface MeetProps {
  meet: MeetCall;                                      // required: what useMeet returned
  renderScreen?: (presenter: string) => ReactNode;     // what someone presents, drawn at 1280 x 720 and scaled to fit
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height (`height: 100vh`, or a
flex or grid cell with one). Under 760px of its own width it uses the phone
layout.

Worth knowing before you build on it:

- The kit has no audio or video of its own: a live call's voice comes from
  `casuro.call`, and the kit only shows it, through `speaking()` and
  `caption()`. The person's mute button changes `state.mic` and fires
  `{ type: "mic" }`; it does not mute the real microphone of `casuro.call`.
- Captions show only after the person turns them on (the CC button or the C
  key). The world has no call to turn them on; `state.captions` says whether
  they are.
- `speaking()` replaces the whole list each time, so keep your own record of
  who is talking when two sources (the agent and the candidate) report
  separately.
- The world cannot launch or end a poll; only the person can. `vote(index)`
  does nothing until they have launched one.
- Leaving shows the "You left" screen (`state.view === "left"`) with Rejoin;
  end `casuro.call` on the `leave` event.

### Wiring it in an episode

```tsx
import { useEffect, useRef, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Meet, useMeet, type MeetSeed, type MeetState } from "./apps/meet";

// Module level, so its identity never changes between renders.
const seed: MeetSeed = {
  meeting: { title: "Hiring panel: system design", code: "abc-defg-hij", host: "priya", org: "Northwind" },
  me: "you",
  people: {
    you: { name: "Sam Rivera", email: "sam@northwind.com" },
    priya: { name: "Priya Shah", email: "priya@northwind.com" },
    omar: { name: "Omar Haddad", email: "omar@northwind.com" },
  },
  inCall: ["priya"],
  video: ["priya"],
  chat: [{ from: "priya", text: "Welcome! The brief is in the meeting details.", at: Date.now() - 60_000 }],
};

// The hook reads `restore` only on its first render, so load the saved state first.
export function MeetScreen() {
  const [saved, setSaved] = useState<MeetState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<MeetState>().then(setSaved);
  }, []);
  if (saved === undefined) return null;
  return <Call restore={saved} />;
}

function Call({ restore }: { restore: MeetState | null }) {
  const meet = useMeet(seed, {
    restore,
    onEvent(event) {
      if (event.type === "chat") {
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: "meet-chat", text: event.text });
        void answerInChat(event.text);
      }
      if (event.type === "present" && event.on) void casuro.track.decision({ summary: `Started presenting (${event.source})` });
      if (event.type === "leave") void casuro.call.end();
      if (event.type === "rejoin") void casuro.call.start({ persona: "Priya Shah", voice: "coral" });
    },
  });

  async function answerInChat(text: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: "You are Priya Shah, running a system design interview on Google Meet. Answer the chat message in one short line." },
        { role: "user", content: text },
      ],
      { persona: "Priya Shah" }
    );
    meet.chat("priya", reply);
    void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "meet-chat", text: reply });
  }

  // The live voice call: Priya talks through casuro.call; the kit shows who speaks and the captions.
  // casuro.call.on has no unsubscribe, so register once (a ref survives React's dev double effects).
  const talking = useRef({ agent: false, candidate: false, wired: false });
  useEffect(() => {
    if (talking.current.wired) return;
    talking.current.wired = true;
    const show = () =>
      meet.speaking([...(talking.current.agent ? ["priya"] : []), ...(talking.current.candidate ? [meet.me] : [])]);
    casuro.call.on((e) => {
      if (e.type === "agent_speaking") {
        talking.current.agent = e.speaking;
        show();
      }
      if (e.type === "candidate_speaking") {
        talking.current.candidate = e.speaking;
        show();
      }
      if (e.type === "agent_transcript") {
        meet.caption("priya", e.text);
        void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "call", text: e.text });
      }
      if (e.type === "candidate_transcript") {
        meet.caption(meet.me, e.text);
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: "call", text: e.text });
      }
      if (e.type === "ended") {
        meet.speaking([]);
        meet.leave("priya");
      }
    });
    if (meet.state.view === "call") void casuro.call.start({ persona: "Priya Shah", voice: "coral" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A timed event: Omar joins two minutes in, muted, and says so in the chat.
  useEffect(() => {
    if (meet.state.inCall.includes("omar")) return;
    const t = setTimeout(() => {
      meet.join("omar", { video: true, muted: true });
      meet.chat("omar", "Sorry I'm late, carry on");
    }, 120_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save whenever anything changes.
  useEffect(() => {
    void casuro.store.set(meet.state);
  }, [meet.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Meet meet={meet} renderScreen={() => <div style={{ width: 1280, height: 720, background: "#fff" }}>Architecture diagram</div>} />
    </div>
  );
}
```

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
