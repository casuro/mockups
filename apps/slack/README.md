# Slack (React)

`apps/slack.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/slack src/apps/slack
```

It needs only React 19. The styles are plain CSS scoped to `.kit-slack`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Lato is embedded, so nothing loads from the network.

## Use

```tsx
import { Slack, useSlack, type SlackSeed } from "./apps/slack";

const seed: SlackSeed = {
  workspace: { name: "Northwind" },
  me: "you",
  people: {
    you: { name: "Sam Rivera" },
    priya: { name: "Priya Shah", title: "Engineering lead" },
    alerts: { name: "Datadog", bot: true, color: "#632ca6" },
  },
  channels: [
    { id: "incidents", topic: "Sev-1s only", members: ["priya", "alerts"], messages: [
      { from: "priya", at: Date.now() - 3_600_000, text: "Morning all" },
    ] },
  ],
  dms: [{ with: "priya" }],
  open: { channel: "incidents" },
};

function Workspace() {
  const slack = useSlack(seed, {
    onEvent(event) {
      if (event.type === "send") {
        // The person posted in event.where; answer, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Slack slack={slack} />
    </div>
  );
}
```

`<Slack>` fills the box it is in, so give that box a height. It switches to
Slack's mobile layout when the box is under 760px wide, whatever the window
size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. A `bot` shows
  the APP tag; `photo` is a picture URL, otherwise initials on `color`.
- `channels`, in sidebar order, and `dms`, each with `messages`. `unread`
  marks the last few messages unread; the conversation that opens first
  shows them under a red "New" line.
- A message has `from`, `at` (ms or a date string), and `text` in Slack's
  mrkdwn: `*bold*`, `_italic_`, `~strike~`, `` `code` ``, fenced blocks,
  `@personId` mentions and `#channel` links. It can also carry `reactions`,
  `replies` (a thread), a bot `card` with buttons, a `chart`, a `file`, a
  `link` preview, or a `custom` part you draw yourself.
- `huddles` already running, with who is in them and who is sharing a screen.

## Driving it

`useSlack` returns the workspace. The world acts on it through:

| Call | What happens |
| --- | --- |
| `slack.deliver(where, message, { typing: 1500 })` | Shows the sender typing, then the message lands. Elsewhere, it bumps the unread count; a DM or a mention also shows a toast. Resolves with the message id. An empty text delivers nothing: no typing, no message, and it resolves with `""`. |
| `slack.deliver(where, { ...message, thread: id })` | A reply in a thread. |
| `slack.typingIn(where, personId)` / `(where, null)` | Typing, while a reply is being written. |
| `slack.react(messageId, emoji)` | Someone else reacts. |
| `slack.huddle.join(where, personId, { video })` / `.leave(...)` / `.share(...)` / `.speaking([ids])` | Huddles. |
| `slack.open(where)` | Show a conversation. |
| `slack.toast(text)` | A notice at the bottom. |

`where` is `{ channel: "incidents" }` or `{ dm: "priya" }`. Every function is
stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "send", where, text, id, thread? }` | They post a message or a thread reply. |
| `{ type: "open", where }` | They open a conversation. |
| `{ type: "react", id, emoji, added }` | They add or remove a reaction. |
| `{ type: "action", kind, label, id? }` | They press a card button, a bookmark or a link. |
| `{ type: "huddle", action, where }` | They start, join or leave a huddle, or use its controls. |

`slack.state` is everything that changed, as plain JSON: save it, and pass
it back as `useSlack(seed, { restore })` to pick up where they left off.

## API reference

Everything below is what the kit's source defines; nothing else exists.

### Imports

```ts
import {
  Slack, useSlack, keyOf, whereOf,
  type SlackProps, type SlackWorkspace, type SlackOptions, type DeliverOptions, type Person,
  type SlackSeed, type SlackState, type SlackEvent, type SlackMessage, type SlackMessageInput, type Where,
} from "./apps/slack";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/slack/icons";
```

`index.ts` also re-exports every other type in `types.ts` (`SlackPerson`, `SlackChannelSeed`, `SlackDmSeed`, `SlackHuddleSeed`, `SlackCard`, `SlackFile`, `SlackLink`, `SlackReaction`, `SlackBookmark`, `SlackConversationState`, `SlackHuddleState`). `keyOf(where)` turns a `Where` into a state key (`"channel:incidents"`, `"dm:priya"`); `whereOf(key)` goes back.

### The hook

```ts
function useSlack(seed: SlackSeed, options?: SlackOptions): SlackWorkspace;

interface SlackOptions {
  restore?: SlackState | null;             // a saved `slack.state`; read on the first render only
  onEvent?: (event: SlackEvent) => void;   // everything the signed-in person does
  sounds?: boolean;                        // huddle chimes, default true
}
```

It throws if `seed.me` is not a key of `seed.people`. A `restore` whose `version` is not `1` is ignored and the seed is used.

### The seed

```ts
type Where = { channel: string } | { dm: string };   // channel name without "#", or a person id

interface SlackSeed {
  workspace: { name: string; initial?: string };      // required
  me: string;                                         // required: the signed-in person's id
  people: Record<string, SlackPerson>;                // required: everyone, by id
  channels: SlackChannelSeed[];                       // required, sidebar order
  dms?: SlackDmSeed[];
  apps?: string[];                                    // bots under Apps; every bot by default
  huddles?: SlackHuddleSeed[];                        // already running
  open?: Where;                                       // first on screen; first channel by default
  theme?: "light" | "dark";
  later?: number;                                     // count on "Later"
}

interface SlackPerson {
  name: string;                                       // required
  title?: string; photo?: string; initials?: string; color?: string;
  online?: boolean;                                   // default true
  status?: string;                                    // status emoji
  bot?: boolean;                                      // APP tag
}

interface SlackChannelSeed {
  id: string;                                         // required: "engineering"
  topic?: string;
  members?: string[];
  memberCount?: number;
  muted?: boolean;
  bookmarks?: { label: string; letter?: string; color?: string }[];
  unread?: number;                                    // how many of the last messages are unread
  messages?: SlackMessageInput[];
}

interface SlackDmSeed { with: string; unread?: number; messages?: SlackMessageInput[] }   // `with` required

interface SlackHuddleSeed {
  in: Where;                                          // required
  people: string[];                                   // required
  by?: string; startedAt?: number | string;
  video?: string[]; muted?: string[];
  sharing?: { by: string; title?: string };
}

interface SlackMessageInput {
  from: string;                                       // required: a person id
  id?: string;
  at?: number | string;                               // ms or a date string; now by default
  text?: string;                                      // mrkdwn, @personId, #channel
  reactions?: { emoji: string; count: number; mine?: boolean }[];
  replies?: SlackMessageInput[];                      // a thread
  card?: { title: string; rows?: [string, string, ("ok" | "bad")?][]; buttons?: string[] };
  chart?: number[];
  file?: { name: string; meta?: string; ext?: string; color?: string };
  link?: { site: string; title: string; body?: string; color?: string };
  custom?: { type: string; data?: unknown };          // drawn by <Slack renderCustom>
}
```

### What the world can do

All of these are stable across renders, so they are safe to call from timers and `onEvent`.

```ts
slack.deliver(where: Where, message: SlackMessageInput & { thread?: string }, options?: DeliverOptions): Promise<string>
  // Posts `message` as `message.from`. With `thread` (a message id) it is a thread reply.
  // Resolves with the new message's id once it is on screen. Throws for an unknown channel;
  // a DM with a known person is created on first use.
interface DeliverOptions {
  typing?: number;    // show the sender typing for this many ms first
  notify?: boolean;   // toast it when the person is elsewhere; default: DMs and mentions of `me`
}
slack.typingIn(where: Where, from: string | null): void     // show someone typing (null stops it)
slack.react(id: string, emoji: string): void                // someone else adds a reaction
slack.toast(text: string): void                             // a notice at the bottom
slack.open(where: Where): void                              // switch the screen to a conversation
slack.huddle.join(where: Where, person: string, o?: { video?: boolean; muted?: boolean }): void
                                                            // starts one there if none is running
slack.huddle.leave(where: Where, person: string): void      // ends it when nobody is left
slack.huddle.share(where: Where, person: string | null, title?: string): void   // null stops sharing
slack.huddle.speaking(ids: string[]): void                  // ring around who is talking
```

Read-only fields: `slack.state` (below), `slack.seed`, `slack.me`, `slack.people` (`Record<string, Person>`, the seed's people with defaults filled in), `slack.current` (the `Where` on screen), `slack.typing`, `slack.speaking`, `slack.notice`, `slack.label(key: string): string` (`"#incidents"` or a person's name). `slack.ui` holds what `<Slack>` calls for the signed-in person (`send`, `toggleReaction`, `openThread`, `joinHuddle`, `leaveHuddle`, `huddleControl`, `setTheme`, `emit`); a world does not need it.

### Events

```ts
type SlackEvent =
  | { type: "send"; where: Where; text: string; id: string; thread?: string }   // thread = parent message id
  | { type: "open"; where: Where }
  | { type: "react"; id: string; emoji: string; added: boolean }
  | { type: "action"; kind: "card" | "bookmark" | "link"; label: string; id?: string }   // id = the message, for card and link-preview
  | { type: "huddle"; action: "start" | "join" | "leave" | "mic" | "cam" | "share"; where: Where };
```

`slack.open(...)` also fires `{ type: "open" }`, even when the world calls it, so do not treat every `open` as the person's click.

### State

`slack.state` is a `SlackState`: plain JSON (`version: 1`, `current`, `thread`, `conversations` keyed by `keyOf(where)`, `huddles`, `inHuddle`, `theme`, `seq`). It is a new object after every change. Save it, and pass it back as `useSlack(seed, { restore })`; `restore` is read only when the hook first mounts, so load the saved state before rendering the component that calls `useSlack`.

### The component

```ts
interface SlackProps {
  slack: SlackWorkspace;                                  // required: from useSlack
  renderCustom?: (message: SlackMessage) => ReactNode;    // draws a message's `custom` part
  className?: string;
  style?: CSSProperties;
}
```

`<Slack>` fills its parent, so the parent needs a height (`100vh`, or a flex child with `min-height: 0`). Under 760px of width it uses the mobile layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Slack, useSlack, type SlackSeed, type SlackState } from "./apps/slack";

const seed: SlackSeed = {
  workspace: { name: "Northwind" },
  me: "you",
  people: {
    you: { name: "Sam Rivera" },
    priya: { name: "Priya Shah", title: "Engineering lead" },
    alerts: { name: "Datadog", bot: true, color: "#632ca6" },
  },
  channels: [
    { id: "incidents", topic: "Sev-1s only", members: ["priya", "alerts"], messages: [
      { from: "priya", at: Date.now() - 3_600_000, text: "Morning all, quiet night so far." },
    ] },
  ],
  dms: [{ with: "priya" }],
  open: { channel: "incidents" },
};

export default function Episode() {
  // `restore` is read once, on mount: load the saved state before rendering the workspace.
  const [saved, setSaved] = useState<SlackState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<SlackState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Workspace saved={saved} />;
}

function Workspace({ saved }: { saved: SlackState | null }) {
  const slack = useSlack(seed, {
    restore: saved,
    async onEvent(event) {
      if (event.type !== "send") return;
      const to = "dm" in event.where ? event.where.dm : `#${event.where.channel}`;
      void casuro.track.message({ from: "candidate", to, channel: "slack", text: event.text });
      if (!("dm" in event.where) || event.where.dm !== "priya") return;
      slack.typingIn(event.where, "priya");
      const reply = await casuro.llm(
        [
          { role: "system", content: "You are Priya Shah, engineering lead at Northwind. Reply as a short Slack DM." },
          { role: "user", content: event.text },
        ],
        { persona: "Priya Shah" },
      );
      slack.typingIn(event.where, null);
      await slack.deliver(event.where, { from: "priya", text: reply });
      void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "slack", text: reply });
    },
  });

  // One timed beat: the alert fires 20 seconds in (only on a fresh start).
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      void slack.deliver(
        { channel: "incidents" },
        { from: "alerts", text: "p99 latency on checkout-api is 4.2s", card: { title: "Monitor triggered", rows: [["Service", "checkout-api", "bad"]], buttons: ["Acknowledge"] } },
        { typing: 1200 },
      );
    }, 20_000);
    return () => clearTimeout(t);
  }, [saved, slack.deliver]);

  // Save every change.
  useEffect(() => void casuro.store.set(slack.state), [slack.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Slack slack={slack} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Slack.tsx` | The layout, the channel header and intro, the emoji picker, the toast, keyboard shortcuts. |
| `Sidebar.tsx` | The top bar with search, the workspace rail, the sidebar. |
| `Messages.tsx` | The message list, a message, its hover bar, card, chart, file, link preview, reactions, thread summary. |
| `Composer.tsx` | The composer and the thread pane. |
| `Huddle.tsx` | The huddle card, header pill, dock and window. |
| `use-slack.ts` | The state and what changes it. |
| `format.tsx` | mrkdwn and dates. |
| `slack.css` | The look, from the mockup. |

For a message the kit has no part for (a form, an approval, a document),
give it `custom: { type, data }` and draw it with
`<Slack renderCustom={(m) => ...} />`. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=slack` next to `/apps/slack.html`: the same workspace and
demo, drawn by the React version.
