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
| `{ type: "annotate", surface, tool }` | They draw, stamp or erase on the whiteboard or a shared screen. The marks are on a canvas, which nothing can read, so record this if they matter. |
| `{ type: "end" }` / `{ type: "leave" }` / `{ type: "rejoin" }` | They end the meeting for all, leave it, or rejoin from the "You left" screen. |

`zoom.state` is everything that changed, as plain JSON: save it, and pass it
back as `useZoom(seed, { restore })` to pick up where they left off.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-zoom.ts` and
`Zoom.tsx`; you should not need to open them.

### Imports

```ts
import {
  Zoom, useZoom,
  type ZoomProps, type ZoomMeetingApi, type ZoomOptions, type Person,
  type ZoomSeed, type ZoomState, type ZoomEvent, type ZoomPerson, type ZoomMeeting,
  type ZoomChatInput, type ZoomChatMessage, type ZoomScreen, type ZoomWhiteboard, type ZoomNote,
  type ZoomApp, type ZoomShare, type ZoomSecurity,
} from "./apps/zoom";
```

### The hook

```ts
function useZoom(seed: ZoomSeed, options?: ZoomOptions): ZoomMeetingApi;

interface ZoomOptions {
  restore?: ZoomState | null;              // a saved `zoom.state`; read on the first render only
  onEvent?: (event: ZoomEvent) => void;    // what the signed-in person does
}
```

`restore` is used only when its `version` is `1`; otherwise the seed is used.
`onEvent` is read through a ref, so an inline function is fine. It throws if
`seed.me` is not a key of `seed.people`. Keep the seed at module level (or in
`useMemo`): `people` is recomputed whenever the seed object changes.

### The seed

```ts
interface ZoomSeed {
  meeting: ZoomMeeting;                    // required
  me: string;                              // required: a key of `people`
  people: Record<string, ZoomPerson>;      // required: in the meeting, waiting, or invitable
  participants: string[];                  // required: in the meeting at the start, besides you
  muted?: string[];                        // of them, who is muted
  cameraOff?: string[];                    // of them, cameras off (everyone else's is on, yours too)
  waiting?: string[];                      // in the waiting room at the start
  chat?: ZoomChatInput[];
  contacts?: string[];                     // offered by the Invite dialog
  screens?: ZoomScreen[];                  // offered by Share Screen; one whole "Screen" by default
  whiteboards?: ZoomWhiteboard[];          // recent whiteboards
  apps?: ZoomApp[];                        // the Apps panel
  share?: { by: string; screen: string };  // someone already sharing (must be a participant)
  view?: "gallery" | "speaker";            // default "gallery"
}

interface ZoomMeeting {
  title: string;                           // required
  id: string;                              // required, "845 2231 9067"
  passcode?: string;
  host?: string;                           // a person id; `me` by default
  link?: string;                           // https://zoom.us/j/<id> by default
  startedAt?: number | string;             // for the timer; now by default
}

interface ZoomPerson {
  name: string;                            // required
  photo?: string;                          // camera feed when video is on, picture when off
  initials?: string;                       // default: first and last initials
  color?: string;
  status?: string;                         // "Available", under the name in the Invite list
}

interface ZoomChatInput {
  id?: string;
  from: string;                            // required: a person id
  to?: string;                             // "everyone" (default) or a person id for a direct message
  text?: string;
  at?: number | string;                    // ms or date string; now by default
  file?: { name: string; size?: string };  // a file instead of text
  system?: boolean;                        // a grey notice in the middle
}

interface ZoomScreen { id: string; title: string; thumb?: "desktop" | "design" | "document" | "terminal" }
interface ZoomWhiteboard { title: string; notes?: ZoomNote[] }
interface ZoomNote { x: number; y: number; by: string; text: string; color?: string; tilt?: number }  // x, y in 1280x800 px; by is a first name
interface ZoomApp { name: string; description?: string; color?: string; icon?: "notes" | "poll" | "docs" | "timer" | "bot" | "apps" | "whiteboard" | "sparkle" }
```

### What the world can do

All on the object `useZoom` returns; every function is stable across
renders and safe to call from timers and after `await`. None of them fires
`onEvent`.

```ts
zoom.join(person: string, o?: { video?: boolean; muted?: boolean; quiet?: boolean }): void  // joins (leaving the waiting room if there); video on, unmuted by default; quiet skips chime and toast; unknown or present ids are ignored
zoom.admitRequest(person: string): void      // knocks: into the waiting room with an Admit notice (notice only when `me` is host); straight in when the waiting room is off
zoom.leave(person: string, message?: string): void  // leaves the meeting or the waiting room; `message` replaces the toast; ignored for `me`
zoom.speaking(ids: string[]): void           // who is talking now (green ring, speaker view's big tile); [] for nobody
zoom.say(person: string, text: string): void // sets speaking([person]) and the caption line (shown only while captions are on)
zoom.react(person: string, emoji: string): void     // pops on their tile for 5s
zoom.raiseHand(person: string, on: boolean): void   // `on` is required
zoom.mute(person: string, on: boolean): void        // on = muted; works for `me` too
zoom.camera(person: string, on: boolean): void      // on = camera on; works for `me` too
zoom.share(person: string | null, screen?: string): void  // they share `screen` (default "screen"; what renderScreen draws), or null stops any share
zoom.chat(from: string, text: string, to?: string, extra?: { file?: { name: string; size?: string } }): string  // to: "everyone" (default) or a person id; returns the message id
zoom.end(): void                             // the host ends the meeting for everyone (state.phase = "ended")
zoom.toast(text: string): void               // a notice at the top
```

Read-only fields: `seed`, `people: Record<string, Person>` (with `id`,
`name`, `initials`, `color`, `photo?`, `status?`), `me`, `state`,
`speakingNow: string[]`, `recentSpeakers` (a ref), `caption` (`{ id, text } |
null`), `reactions`, `notice`, `canManage` (`state.host === me`),
`nameOf(id): string`. `zoom.ui` holds what `<Zoom>` calls for the signed-in
person (`toggleMic`, `startShare`, `sendChat`, `admit`, `hangUp`, `rejoin`,
...); most fire an `onEvent`, so the world should not call them.

### Events

```ts
type ZoomEvent =
  | { type: "mute"; muted: boolean }
  | { type: "video"; on: boolean }
  | { type: "audio"; joined: boolean }
  | { type: "share"; action: "start" | "stop" | "pause" | "resume"; screen?: string; whiteboard?: string }
  | { type: "record"; action: "start" | "pause" | "resume" | "stop" | "ask"; kind?: "local" | "cloud" }
  | { type: "react"; emoji: string }
  | { type: "hand"; raised: boolean }
  | { type: "feedback"; value: "yes" | "no" | "slower" | "faster" | null }
  | { type: "chat"; id: string; text: string; to: string }           // to: "everyone" or a person id
  | { type: "attach"; to: string }                                   // "Send a file": answer with zoom.chat(me, "", to, { file })
  | { type: "admit"; person: string }
  | { type: "deny"; person: string }
  | { type: "participant"; action: "mute" | "ask-unmute" | "ask-video" | "stop-video" | "lower-hand" | "pin" | "spotlight" | "to-waiting" | "remove"; person: string }
  | { type: "mute-all"; allowUnmute: boolean }
  | { type: "invite"; people: string[] }
  | { type: "view"; view: "gallery" | "speaker" }
  | { type: "captions"; on: boolean }
  | { type: "security"; setting: keyof ZoomSecurity | "suspend"; on: boolean }
  | { type: "app"; name: string }
  | { type: "annotate"; surface: "whiteboard" | "screen"; tool: string }
  | { type: "end" }
  | { type: "leave" }
  | { type: "rejoin" };
```

`ZoomSecurity` keys: `locked`, `waitingRoom`, `hidePictures`, `share`,
`chat`, `rename`, `unmute`, `video`.

### State

`zoom.state` is a `ZoomState`, plain JSON: `version: 1`, `phase: "meeting" |
"left" | "ended"`, `startedAt`, `host`, `people` (in the meeting, `me`
first), `waiting`, `muted`, `video` (cameras on), `hands` (id to ms),
`feedback`, `audio`, `view`, `hideSelf`, `hideNonVideo`, `pinned`,
`spotlight`, `panels`, `chat: ZoomChatMessage[]` (`{ id, from, to, text, at,
file?, system? }`), `chatTo`, `unread`, `share: ZoomShare | null` (`{ by,
kind, screen, title?, notes?, paused?, annotate?, fit?, sideBySide? }`),
`recording`, `captions`, `notice`, `security`, `sounds`, `seq`. Save it
whenever it changes and pass it back as `useZoom(seed, { restore })`. Who is
speaking, the caption line and reactions are not in it.

### The component

```ts
interface ZoomProps {
  zoom: ZoomMeetingApi;                              // required: what useZoom returned
  renderScreen?: (share: ZoomShare) => ReactNode;    // a shared screen's content, 1280x800, scaled to fit; draw share.screen
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height (`height: 100vh`, or a
flex or grid cell with one). Under 760px of its own width it uses the phone
layout; under 1100px side panels float over the video.

Worth knowing before you build on it:

- The kit has no audio or video of its own: a live call's voice comes from
  `casuro.call`, and the kit only shows it, through `speaking()` and
  `say()`. The person's mute button changes `state.muted` and fires
  `{ type: "mute" }`; it does not mute the real microphone of `casuro.call`.
- `say()` replaces the speaking list with just that person and leaves it
  there: call `speaking([])` (or your own list) when they stop.
- Captions show only after the person turns them on (Show Captions); the
  world has no call for it. `state.captions` says whether they are on.
- `speaking()` replaces the whole list each time, so keep your own record of
  who is talking when the agent and the candidate report separately.
- Rejoin (from the "You left" screen) starts the meeting again from the
  seed, with an empty chat and no one waiting; whatever the world changed
  (joins, leaves, shares) is gone. Start `casuro.call` again on `rejoin`.
- When `me` is the host (the default), Leave hands the host to the next
  person; the End menu also offers "End meeting for all" (`{ type: "end" }`).
- Requests change nothing by themselves: the host's "ask-unmute" and
  "ask-video" (`participant` events), and a non-host's `{ type: "record",
  action: "ask" }`. Answer them with `zoom.mute`, `zoom.camera` or a chat.

### Wiring it in an episode

```tsx
import { useEffect, useRef, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Zoom, useZoom, type ZoomSeed, type ZoomState } from "./apps/zoom";

// Module level, so its identity never changes between renders.
const seed: ZoomSeed = {
  meeting: { title: "Incident review", id: "812 4410 2297", passcode: "k29sQ", host: "sam" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera" },
    lena: { name: "Lena Okafor" },
    tom: { name: "Tom Becker", status: "Available" },
  },
  participants: ["lena"],
  contacts: ["tom"],
  chat: [{ from: "lena", text: "Timeline is in the incident doc" }],
  screens: [{ id: "dashboard", title: "Grafana - API latency", thumb: "desktop" }],
};

// The hook reads `restore` only on its first render, so load the saved state first.
export function ZoomScreen() {
  const [saved, setSaved] = useState<ZoomState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<ZoomState>().then(setSaved);
  }, []);
  if (saved === undefined) return null;
  return <Meeting restore={saved} />;
}

function Meeting({ restore }: { restore: ZoomState | null }) {
  const zoom = useZoom(seed, {
    restore,
    onEvent(event) {
      if (event.type === "chat") {
        void casuro.track.message({ from: "candidate", to: event.to === "everyone" ? "everyone" : "Lena Okafor", channel: "zoom-chat", text: event.text });
        void answerInChat(event.text, event.to);
      }
      if (event.type === "share" && event.action === "start") void casuro.track.decision({ summary: `Shared ${event.screen ?? event.whiteboard}` });
      if (event.type === "admit") void casuro.track.decision({ summary: `Admitted ${event.person} from the waiting room` });
      if (event.type === "leave" || event.type === "end") void casuro.call.end();
      if (event.type === "rejoin") void casuro.call.start({ persona: "Lena Okafor", voice: "sage" });
    },
  });

  async function answerInChat(text: string, to: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: "You are Lena Okafor, an SRE in an incident review on Zoom. Answer the chat message in one short line." },
        { role: "user", content: text },
      ],
      { persona: "Lena Okafor" }
    );
    zoom.chat("lena", reply, to === "everyone" ? "everyone" : zoom.me);
    void casuro.track.message({ from: "Lena Okafor", to: "candidate", channel: "zoom-chat", text: reply });
  }

  // The live voice call: Lena talks through casuro.call; the kit shows who speaks and the captions.
  // casuro.call.on has no unsubscribe, so register once (a ref survives React's dev double effects).
  const talking = useRef({ agent: false, candidate: false, wired: false });
  useEffect(() => {
    if (talking.current.wired) return;
    talking.current.wired = true;
    // say() makes its speaker the only one speaking, so set the real list again after it.
    const show = () =>
      zoom.speaking([...(talking.current.agent ? ["lena"] : []), ...(talking.current.candidate ? [zoom.me] : [])]);
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
        zoom.say("lena", e.text);
        show();
        void casuro.track.message({ from: "Lena Okafor", to: "candidate", channel: "call", text: e.text });
      }
      if (e.type === "candidate_transcript") {
        zoom.say(zoom.me, e.text);
        show();
        void casuro.track.message({ from: "candidate", to: "Lena Okafor", channel: "call", text: e.text });
      }
      if (e.type === "ended") {
        zoom.speaking([]);
        zoom.leave("lena", "Lena Okafor left the meeting");
      }
    });
    if (zoom.state.phase === "meeting") void casuro.call.start({ persona: "Lena Okafor", voice: "sage" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A timed event: Tom knocks in the waiting room a minute in; the candidate (the host) admits him or not.
  useEffect(() => {
    const s = zoom.state;
    if (s.people.includes("tom") || s.waiting.includes("tom")) return;
    const t = setTimeout(() => zoom.admitRequest("tom"), 60_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save whenever anything changes.
  useEffect(() => {
    void casuro.store.set(zoom.state);
  }, [zoom.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Zoom zoom={zoom} renderScreen={(share) => <div style={{ width: 1280, height: 800, background: "#fff" }}>{share.screen}</div>} />
    </div>
  );
}
```

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
