# Microsoft Teams (React)

`apps/teams.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/teams src/apps/teams
```

It needs only React 19. The styles are plain CSS scoped to `.kit-teams`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included). The type is the system's Segoe UI stack, as in the mockup, so
there is no font to embed and nothing loads from the network.

## Use

```tsx
import { Teams, useTeams, type TeamsSeed } from "./apps/teams";

const seed: TeamsSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera", title: "Support lead" },
    priya: { name: "Priya Shah", title: "Engineering lead", presence: "busy", note: "In a meeting" },
    omar: { name: "Omar Haddad", presence: "away" },
  },
  chats: [
    { with: "priya", unread: 1, messages: [{ from: "priya", at: Date.now() - 600_000, text: "Got a minute?" }] },
    { id: "oncall", name: "On-call", members: ["you", "priya", "omar"] },
  ],
  teams: [
    { id: "eng", name: "Engineering", members: ["you", "priya", "omar"], channels: [
      { id: "general", name: "General", messages: [
        { from: "omar", subject: "Deploy freeze", text: "No deploys after *4pm* today.", replies: [{ from: "priya", text: "Noted" }] },
      ] },
    ] },
  ],
};

function Workplace() {
  const teams = useTeams(seed, {
    onEvent(event) {
      if (event.type === "send") {
        // The person wrote in event.where; answer, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Teams teams={teams} />
    </div>
  );
}
```

`<Teams>` fills the box it is in, so give that box a height. It switches to
Teams' mobile layout (the app bar at the bottom, the list or the
conversation) when the box is under 760px wide, whatever the window size, so
it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `presence`
  is the dot (available, busy, away, offline, oof) and `note` the line under
  the name; `photo` is a picture URL (and the camera feed in a meeting),
  otherwise initials on `color`.
- `chats`, in list order: one-on-one (`with`) or group (`id`, `name`,
  `members`), `pinned` or not, each with `messages` and `unread`.
- `teams`, each with `channels` of posts. A post can have a `subject` and
  `replies`; the last two replies show, the rest behind a toggle.
- A message has `from`, `at` (ms or a date string) and `text` with `*bold*`,
  `` `code` ``, fenced blocks, `@personId` mentions and bare URLs. It can
  carry `reactions`, a `file`, a `call` line ("Missed call", "Call ended
  4m 12s") or a `custom` part you draw yourself.
- `meetings` already running in a conversation: who is in, cameras,
  mutes, raised hands, who is presenting, the meeting chat so far.
- `activity` (the feed), this week's `events`, `speedDial` and `calls`
  (the Calls view), `files` (OneDrive), `calendars`, and where it `open`s.

## Driving it

`useTeams` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `teams.deliver(where, message, { typing: 1500 })` | Shows the sender typing, then the message (or, in a channel, the post) lands. Elsewhere it bumps the unread count, and a chat message or a mention shows a toast. Resolves with its id. |
| `teams.post({ team, channel }, post)` | A new post in a channel. |
| `teams.reply(postId, message, { typing })` | A reply to a channel post. |
| `teams.typingIn(where, personId)` / `(where, null)` | Typing, while a reply is being written. |
| `teams.react(messageId, emoji)` | Someone else reacts. |
| `teams.notify(item)` | A new item at the top of Activity. |
| `teams.setPresence(personId, "busy", "Presenting")` | Someone's presence changes. |
| `teams.meeting.start(where, personId, { title })` | Someone starts a meeting (the card in a channel, the call line in a chat). |
| `teams.meeting.join(m, personId, { video, muted })` / `.decline(m, personId)` / `.leave(m, personId)` / `.end(m)` | People pick up a call (or don't), come and go. A call nobody answers ends as "No answer". |
| `teams.meeting.raiseHand(m, personId, raised)` / `.share(m, personId, title)` / `.set(m, personId, { video, muted })` | Hands, presenting, cameras and mics. |
| `teams.meeting.say(m, personId, text)` / `.react(m, personId, emoji)` / `.speaking([ids])` | The meeting chat, a floating reaction, who is talking. |
| `teams.open(where)` / `teams.show(view)` | Show a conversation, or a view of the app bar. |
| `teams.toast(text)` | A notice at the bottom. |

`where` is `{ chat: "priya" }` or `{ team: "eng", channel: "general" }`. A
meeting `m` is the conversation it runs in, or the meeting's id from an
event. Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "send", where, text, id, subject? }` | They send a chat message or start a post. |
| `{ type: "reply", where, post, text, id }` | They reply to a post. |
| `{ type: "react", id, emoji, added }` | They add or remove a reaction. |
| `{ type: "open", where }` / `{ type: "view", view }` | They open a conversation, or switch view. |
| `{ type: "meeting", action, meeting, where, emoji?, text? }` | They start a call or meeting, join, leave, turn the mic or camera on or off, present, raise a hand, react, or write in the meeting chat. |
| `{ type: "action", kind, label }` | They open a file, a calendar event, an app or a link. |

`teams.state` is everything that changed, as plain JSON: save it, and pass
it back as `useTeams(seed, { restore })` to pick up where they left off.

## API reference

Everything below is what the kit's source defines; nothing else exists.

### Imports

```ts
import {
  Teams, useTeams, keyOf, whereOf,
  type TeamsProps, type TeamsApp, type TeamsOptions, type DeliverOptions, type Person, type Chat, type Team,
  type TeamsSeed, type TeamsState, type TeamsEvent, type TeamsMessage, type TeamsMessageInput,
  type TeamsMeetingState, type Where, type MeetingRef, type TeamsView, type Presence,
} from "./apps/teams";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/teams/icons";
```

`index.ts` also re-exports every other type in `types.ts` (`TeamsPerson`, `TeamsChatSeed`, `TeamsTeamSeed`, `TeamsChannelSeed`, `TeamsMeetingSeed`, `TeamsActivitySeed`, `TeamsActivityItem`, `TeamsCalendarEvent`, `TeamsCallRecord`, `TeamsFileRecord`, `TeamsCall`, `TeamsFile`, `TeamsReaction`, `TeamsConversationState`). `keyOf(where)` gives the state key (`"chat:priya"`, `"ch:eng/general"`); `whereOf(key)` goes back and returns `null` for anything else (a "Meet now" id like `"meet:12"`).

### The hook

```ts
function useTeams(seed: TeamsSeed, options?: TeamsOptions): TeamsApp;

interface TeamsOptions {
  restore?: TeamsState | null;             // a saved `teams.state`; read on the first render only
  onEvent?: (event: TeamsEvent) => void;   // everything the signed-in person does
}
```

It throws if `seed.me` is not a key of `seed.people`, or if a chat has neither `with` nor `id`. A `restore` whose `version` is not `1` is ignored.

### The seed

```ts
type Where = { chat: string } | { team: string; channel: string };   // chat id, or team id + channel id
type MeetingRef = Where | string;                                    // a conversation, or a meeting id
type TeamsView = "activity" | "chat" | "teams" | "calendar" | "calls" | "onedrive" | "apps";
type Presence = "available" | "busy" | "away" | "offline" | "oof";

interface TeamsSeed {
  me: string;                                   // required: the signed-in person's id
  people: Record<string, TeamsPerson>;          // required
  chats?: TeamsChatSeed[];                      // list order
  teams?: TeamsTeamSeed[];                      // list order
  meetings?: TeamsMeetingSeed[];                // already running
  activity?: TeamsActivitySeed[];
  events?: { title: string; start: number | string; end: number | string; where?: string;
             color?: "brand" | "green" | "amber"; meeting?: MeetingRef }[];   // this week (Mon-Fri)
  calendars?: { name: string; color?: string }[];
  speedDial?: string[];                         // person ids
  calls?: { with: string; kind: "outgoing" | "incoming" | "missed"; duration?: string; at: number | string }[];
  files?: { name: string; by: string; modified: number | string; ext?: string; color?: string }[];
  open?: Where | TeamsView;                     // first on screen; Chat on the first chat by default
  openChannel?: { team: string; channel: string };
  theme?: "light" | "dark";
}

interface TeamsPerson {
  name: string;                                 // required
  title?: string; photo?: string; initials?: string; color?: string;
  presence?: Presence;                          // default "available"; "offline"/"oof" never answer a call
  note?: string;                                // line under the name
}

interface TeamsChatSeed {
  with?: string;                                // one-on-one: the other person's id (also the chat id)
  id?: string; name?: string; members?: string[];   // group chat
  pinned?: boolean;
  unread?: number;                              // how many of the last messages are unread
  messages?: TeamsMessageInput[];
}

interface TeamsTeamSeed {
  id: string; name: string;                     // required
  color?: string;
  members?: string[];
  channels: { id: string; name?: string; unread?: number; messages?: TeamsMessageInput[] }[];   // required
}

interface TeamsMeetingSeed {
  in: Where; title: string; people: string[];  // required; people[0] organizes by default
  organizer?: string; startedAt?: number | string;
  video?: string[]; muted?: string[]; hands?: string[];
  sharing?: { by: string; title?: string };
  chat?: { from: string; text: string }[];
}

interface TeamsActivitySeed {
  from: string;                                 // required: whose face
  type: "mention" | "chat" | "meeting" | "like" | "reply";   // required
  text: string;                                 // required: "Dev Patel mentioned you"
  id?: string; where?: string; preview?: string; at?: number | string;
  go?: Where;                                   // where clicking it goes
  unread?: boolean;
}

interface TeamsMessageInput {
  from: string;                                 // required: a person id
  id?: string;
  at?: number | string;                         // ms or a date string; now by default
  text?: string;                                // *bold*, `code`, ```blocks```, @personId, URLs
  subject?: string;                             // a channel post's subject
  reactions?: { emoji: string; count: number; mine?: boolean }[];
  file?: { name: string; meta?: string; ext?: string; color?: string };
  replies?: TeamsMessageInput[];                // a channel post's replies
  call?: { kind: "live" | "ended" | "missed" | "noanswer"; meeting?: string; duration?: string; title?: string };
  custom?: { type: string; data?: unknown };    // drawn by <Teams renderCustom>
}
```

### What the world can do

All of these are stable across renders.

```ts
teams.deliver(where: Where, message: TeamsMessageInput, options?: DeliverOptions): Promise<string>
  // A chat message, or a new post in a channel. Resolves with its id once on screen.
  // Throws (synchronously) for an unknown conversation; a one-on-one chat with a known person is created on first use.
interface DeliverOptions {
  typing?: number;    // show the sender typing for this many ms first
  notify?: boolean;   // toast when the person is elsewhere; default: chats yes, channels no (mentions always)
}
teams.post(channel: { team: string; channel: string }, message: TeamsMessageInput, options?: DeliverOptions): Promise<string>
teams.reply(postId: string, message: TeamsMessageInput, options?: DeliverOptions): Promise<string>
  // a reply to a channel post (a reply id works too: it goes to that reply's post); throws for an unknown id
teams.typingIn(where: Where, from: string | null): void
teams.react(id: string, emoji: string): void                     // someone else reacts
teams.notify(item: TeamsActivitySeed): void                      // new item at the top of Activity
teams.setPresence(person: string, presence: Presence, note?: string): void
teams.open(where: Where): void                                   // show a conversation (also fires "open")
teams.show(view: TeamsView): void                                // switch view (also fires "view")
teams.toast(text: string): void

teams.meeting.start(where: Where, by: string, o?: { title?: string; people?: string[]; video?: boolean }): string
  // returns the meeting id, which is keyOf(where)
teams.meeting.join(m: MeetingRef, person: string, o?: { video?: boolean; muted?: boolean }): void
  // starts one when `m` is a conversation with no meeting; does nothing for an unknown id string
teams.meeting.decline(m: MeetingRef, person: string): void      // a ringing person does not pick up
teams.meeting.leave(m: MeetingRef, person: string): void        // ends it when nobody is left
teams.meeting.end(m: MeetingRef): void
teams.meeting.raiseHand(m: MeetingRef, person: string, raised?: boolean): void   // default true
teams.meeting.share(m: MeetingRef, person: string | null, title?: string): void  // null stops
teams.meeting.set(m: MeetingRef, person: string, o: { video?: boolean; muted?: boolean }): void
teams.meeting.say(m: MeetingRef, from: string, text: string): void              // meeting chat
teams.meeting.react(m: MeetingRef, from: string, emoji: string): void            // shows only while the signed-in person is in that meeting
teams.meeting.speaking(ids: string[]): void
```

Read-only fields: `teams.state`, `teams.seed`, `teams.me`, `teams.people` (`Record<string, Person>` with presence applied), `teams.chats` (`Chat[]`), `teams.teams` (`Team[]`), `teams.current` (the `Where` on screen, or `null`), `teams.typing`, `teams.speaking`, `teams.notice`, `teams.reaction`, `teams.label(key)`, `teams.chatOf(key)`, `teams.channelOf(key)`. `teams.ui` is what `<Teams>` calls for the signed-in person; a world does not need it.

### Events

```ts
type TeamsEvent =
  | { type: "send"; where: Where; text: string; id: string; subject?: string }   // chat message or new post
  | { type: "reply"; where: Where; post: string; text: string; id: string }     // reply to a channel post
  | { type: "react"; id: string; emoji: string; added: boolean }
  | { type: "open"; where: Where }
  | { type: "view"; view: TeamsView }
  | { type: "meeting"; action: "start" | "join" | "leave" | "mic" | "cam" | "share" | "hand" | "react" | "chat";
      meeting: string; where: Where | null; emoji?: string; text?: string }    // emoji for "react", text for "chat"
  | { type: "action"; kind: "event" | "file" | "app" | "link"; label: string };
```

When the person calls someone from a chat (`meeting` / `start` with a chat `where`), the others are left ringing (`state.meetings[id].ringing`) until the world answers with `teams.meeting.join(event.meeting, person)` or `teams.meeting.decline(event.meeting, person)`; nothing answers on its own. `teams.open` and `teams.show` fire `open` and `view` even when the world calls them.

### State

`teams.state` is a `TeamsState`: plain JSON (`version: 1`, `view`, `chat`, `channel`, `activity`, `detail`, `conversations` keyed by `keyOf(where)`, `feed`, `meetings` by id, `inCall`, `presence`, `theme`, `seq`), a new object after every change. Save it, and pass it back as `useTeams(seed, { restore })`; `restore` is read only when the hook first mounts, so load the saved state before rendering the component that calls `useTeams`.

### The component

```ts
interface TeamsProps {
  teams: TeamsApp;                                               // required: from useTeams
  renderCustom?: (message: TeamsMessage) => ReactNode;           // a message's `custom` part
  renderScreen?: (meeting: TeamsMeetingState) => ReactNode;      // what is presented in a meeting
  className?: string;
  style?: CSSProperties;
}
```

`<Teams>` fills its parent, so the parent needs a height. Under 760px of width it uses the mobile layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Teams, useTeams, type TeamsSeed, type TeamsState } from "./apps/teams";

const seed: TeamsSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera", title: "Support lead" },
    priya: { name: "Priya Shah", title: "Engineering lead", presence: "busy" },
    omar: { name: "Omar Haddad", presence: "away" },
  },
  chats: [{ with: "priya", messages: [{ from: "priya", at: Date.now() - 600_000, text: "Got a minute?" }] }],
  teams: [
    { id: "eng", name: "Engineering", members: ["you", "priya", "omar"], channels: [
      { id: "general", name: "General", messages: [{ from: "omar", subject: "Deploy freeze", text: "No deploys after *4pm* today." }] },
    ] },
  ],
};

export default function Episode() {
  // `restore` is read once, on mount: load the saved state before rendering the app.
  const [saved, setSaved] = useState<TeamsState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<TeamsState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Workplace saved={saved} />;
}

function Workplace({ saved }: { saved: TeamsState | null }) {
  const teams = useTeams(seed, {
    restore: saved,
    async onEvent(event) {
      if (event.type !== "send") return;
      const to = "chat" in event.where ? event.where.chat : `${event.where.team}/${event.where.channel}`;
      void casuro.track.message({ from: "candidate", to, channel: "teams", text: event.text });
      if (!("chat" in event.where) || event.where.chat !== "priya") return;
      teams.typingIn(event.where, "priya");
      const reply = await casuro.llm(
        [
          { role: "system", content: "You are Priya Shah, engineering lead. Reply as a short Teams chat message." },
          { role: "user", content: event.text },
        ],
        { persona: "Priya Shah" },
      );
      teams.typingIn(event.where, null);
      await teams.deliver(event.where, { from: "priya", text: reply });
      void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "teams", text: reply });
    },
  });

  // One timed beat: Omar posts in General 30 seconds in (only on a fresh start).
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      void teams.post({ team: "eng", channel: "general" }, { from: "omar", subject: "Checkout errors", text: "Seeing 500s on checkout, @you can you look?" }, { typing: 1500 });
    }, 30_000);
    return () => clearTimeout(t);
  }, [saved, teams.post]);

  // Save every change.
  useEffect(() => void casuro.store.set(teams.state), [teams.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Teams teams={teams} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Teams.tsx` | The layout, the emoji picker, the toast, keyboard shortcuts (⌘E search, ⌘⇧M mute, Esc). |
| `Frame.tsx` | The title bar with search, the app bar, and each view's list pane. |
| `Chat.tsx` | A chat: its header and call buttons, bubbles, call lines, reactions, files. |
| `Channel.tsx` | A channel: posts, replies, the Reply box, the meeting card. |
| `Composer.tsx` | The composer, the feed that follows new messages, the Join button. |
| `Meeting.tsx` | The pre-join screen, the meeting window with its panels, the compact window. |
| `Views.tsx` | Activity, the week calendar, call history, OneDrive, Apps. |
| `use-teams.ts` | The state and what changes it. |
| `format.tsx` | Message text and times. |
| `teams.css` | The look, from the mockup. |

For a message the kit has no part for (a form, an approval, a card), give
it `custom: { type, data }` and draw it with
`<Teams renderCustom={(m) => ...} />`. What someone presents in a meeting is
a design file on a canvas by default; draw your own with
`<Teams renderScreen={(meeting) => ...} />`. For anything else, edit the
files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=teams` next to `/apps/teams.html`: the same organization and
demo, drawn by the React version.
