# WhatsApp (React)

`apps/whatsapp.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/whatsapp src/apps/whatsapp
```

It needs only React 19. The styles are plain CSS scoped to `.kit-whatsapp`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). Like the mockup it uses the system font, so there is
nothing to embed and nothing loads from the network.

## Use

```tsx
import { WhatsApp, useWhatsApp, type WhatsAppSeed } from "./apps/whatsapp";

const seed: WhatsAppSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera" },
    priya: { name: "Priya Shah", online: true },
    tom: { name: "Tom Berg", lastSeen: "last seen today at 08:12" },
  },
  chats: [
    { id: "priya", with: "priya", messages: [
      { from: "priya", at: Date.now() - 3_600_000, text: "Are we still on for 3?" },
      { from: "you", at: Date.now() - 3_500_000, text: "Yes, see you there", ticks: "read" },
    ] },
    { id: "team", name: "Launch crew", members: ["priya", "tom"], unread: 1, messages: [
      { from: "tom", text: "Deck is final 🎉" },
    ] },
  ],
};

function Phone() {
  const whatsapp = useWhatsApp(seed, {
    onEvent(event) {
      if (event.type === "send") {
        // The person wrote in event.chat; mark it read, answer, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <WhatsApp whatsapp={whatsapp} />
    </div>
  );
}
```

`<WhatsApp>` fills the box it is in, so give that box a height. It switches
to the phone layout (the chat list, and the chat over it once one is opened)
when the box is under 760px wide, whatever the window size, so it also works
as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `photo` is a
  picture URL, otherwise initials on `color`; `color` is also their name's
  color in groups. `online`, or `lastSeen` ("last seen today at 09:34"),
  is what a one-to-one chat's header says.
- `chats`, in list order: a one-to-one chat has `with` (the other person's
  id), a group has a `name` and `members`. Either can be `pinned` (at the
  top, and under "Favorites"), `muted`, start with `unread` messages, or
  with someone `typing`.
- A message has `from`, `at` (ms or a date string) and `text`. It can also
  be a picture (`image`: a URL, or the mockup's drawn chart), a `voice` note,
  a `document`, quote another message (`quote`), carry `reactions`, or a
  `custom` part you draw yourself. The signed-in person's messages have
  `ticks`: "sent", "delivered" or "read".

## Driving it

`useWhatsApp` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `whatsapp.deliver(chatId, message, { typing: 1500 })` | Shows the sender typing, then the message lands and the chat moves to the top. Elsewhere, it bumps the unread count (`notify: true` also shows a toast). Resolves with the message id. A person's id as `chatId` starts a chat with them. An empty text delivers nothing: no typing, no message, and it resolves with `""`. |
| `whatsapp.setTicks(messageId, "delivered" \| "read")` | The ticks on one of the signed-in person's messages. |
| `whatsapp.typingIn(chatId, personId)` / `(chatId, null)` | Typing, in the list and the header, while a reply is being written. |
| `whatsapp.setOnline(personId, true \| false)` | "online" in the header; going offline records "last seen today at ..." |
| `whatsapp.react(messageId, emoji)` | Someone else reacts. |
| `whatsapp.open(chatId)` | Show a chat. |
| `whatsapp.toast(text)` | A notice at the bottom. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "send", chat, text, id }` | They send a message (it starts with one grey tick). |
| `{ type: "open", chat }` | They open a chat. |
| `{ type: "react", id, emoji, added }` | They tap a message's reactions to add or take back theirs. |
| `{ type: "play", id }` | They play a voice note. |
| `{ type: "download", id, name }` | They download a document. |
| `{ type: "call", chat, video }` | They press the video or voice call button. |
| `{ type: "action", label, chat }` | Any other button: "New chat", "Emoji", "Attach", "Voice message", "Contact info", "Status", "Settings"... |

`whatsapp.state` is everything that changed, as plain JSON: save it, and
pass it back as `useWhatsApp(seed, { restore })` to pick up where they left off.

## API reference

Everything below is what the kit's source defines; nothing else exists.

### Imports

```ts
import {
  WhatsApp, useWhatsApp,
  type WhatsAppProps, type WhatsAppApp, type WhatsAppOptions, type DeliverOptions, type Person, type ChatInfo,
  type WhatsAppSeed, type WhatsAppState, type WhatsAppEvent, type WhatsAppMessage, type WhatsAppMessageInput, type Ticks,
} from "./apps/whatsapp";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/whatsapp/icons";
```

`index.ts` also re-exports every other type in `types.ts` (`WhatsAppPerson`, `WhatsAppChatSeed`, `WhatsAppChatState`, `WhatsAppQuote`, `WhatsAppReaction`, `WhatsAppImage`, `WhatsAppDocument`).

### The hook

```ts
function useWhatsApp(seed: WhatsAppSeed, options?: WhatsAppOptions): WhatsAppApp;

interface WhatsAppOptions {
  restore?: WhatsAppState | null;             // a saved `whatsapp.state`; read on the first render only
  onEvent?: (event: WhatsAppEvent) => void;   // everything the signed-in person does
}
```

It throws if `seed.me` is not a key of `seed.people`. A `restore` whose `version` is not `1` is ignored.

### The seed

```ts
type Ticks = "sent" | "delivered" | "read";

interface WhatsAppSeed {
  me: string;                                  // required: the signed-in person's id
  people: Record<string, WhatsAppPerson>;      // required: everyone, `me` included
  chats: WhatsAppChatSeed[];                   // required, list order (pinned go first)
  open?: string;                               // chat id on screen; the first chat by default
  theme?: "light" | "dark";
}

interface WhatsAppPerson {
  name: string;                                // required
  photo?: string; color?: string; initials?: string;
  online?: boolean;                            // default false
  lastSeen?: string;                           // "last seen today at 09:34"
}

interface WhatsAppChatSeed {
  id: string;                                  // required: what deliver, open and events use
  with?: string;                               // one-to-one: the other person's id
  name?: string; members?: string[];           // group: name, members without `me`
  photo?: string;                              // group picture
  pinned?: boolean; muted?: boolean;
  unread?: number;
  typing?: string;                             // a person typing when the app opens
  messages?: WhatsAppMessageInput[];
}

interface WhatsAppMessageInput {
  from: string;                                // required: a person id
  id?: string;
  at?: number | string;                        // ms or a date string; now by default
  text?: string;                               // or an image caption; line breaks kept
  ticks?: Ticks;                               // `me`'s messages; "read" in a seed, "sent" when sent live
  quote?: { from: string; text: string };
  image?: { src?: string; alt?: string; title?: string; bars?: number[]; line?: number[] };   // no src = drawn chart
  voice?: { seconds: number };
  document?: { name: string; meta?: string; ext?: string };
  reactions?: { emoji: string; count: number; mine?: boolean }[];
  custom?: { type: string; data?: unknown };   // drawn by <WhatsApp renderCustom>
}
```

### What the world can do

All of these are stable across renders. A `chatId` is a seed chat's `id`, or a person's id, which starts a one-to-one chat with them on first use (any other id throws).

```ts
whatsapp.deliver(chatId: string, message: WhatsAppMessageInput, options?: DeliverOptions): Promise<string>
  // Lands a message, moves the chat to the top, bumps unread when it is not on screen.
  // Resolves with the message id.
interface DeliverOptions {
  typing?: number;    // show the sender typing for this many ms first
  notify?: boolean;   // also toast when the chat is not on screen; default false
}
whatsapp.setTicks(messageId: string, ticks: Ticks): void       // only on `me`'s messages
whatsapp.typingIn(chatId: string, from: string | null): void
whatsapp.setOnline(personId: string, online: boolean): void    // going offline records "last seen"
whatsapp.react(messageId: string, emoji: string): void         // someone else reacts
whatsapp.open(chatId: string): void                            // show a chat (also fires "open")
whatsapp.toast(text: string): void
```

Read-only fields: `whatsapp.state`, `whatsapp.seed`, `whatsapp.me`, `whatsapp.people` (`Record<string, Person>`), `whatsapp.notice`, `whatsapp.chat(id: string): ChatInfo` (a chat's name, `group`, `with`, `members`, `photo`). `whatsapp.ui` (`send`, `toggleReaction`, `setTheme`, `emit`) is what `<WhatsApp>` calls; a world does not need it.

### Events

```ts
type WhatsAppEvent =
  | { type: "send"; chat: string; text: string; id: string }
  | { type: "open"; chat: string }
  | { type: "react"; id: string; emoji: string; added: boolean }
  | { type: "play"; id: string }                     // a voice note
  | { type: "download"; id: string; name: string }   // a document
  | { type: "call"; chat: string; video: boolean }
  | { type: "action"; label: string; chat?: string }; // any other button, by its label
```

The candidate's messages stay at one grey tick until the world calls `whatsapp.setTicks(event.id, "delivered")` and then `"read"`: do it before a persona answers, or every message looks unread.

### State

`whatsapp.state` is a `WhatsAppState`: plain JSON (`version: 1`, `open`, `order`, `chats` by id, `online`, `lastSeen`, `theme`, `seq`), a new object after every change. Save it, and pass it back as `useWhatsApp(seed, { restore })`; `restore` is read only when the hook first mounts, so load the saved state before rendering the component that calls `useWhatsApp`.

### The component

```ts
interface WhatsAppProps {
  whatsapp: WhatsAppApp;                                   // required: from useWhatsApp
  renderCustom?: (message: WhatsAppMessage) => ReactNode;  // a message's `custom` part
  className?: string;
  style?: CSSProperties;
}
```

`<WhatsApp>` fills its parent, so the parent needs a height. Under 760px of width it uses the phone layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { WhatsApp, useWhatsApp, type WhatsAppSeed, type WhatsAppState } from "./apps/whatsapp";

const seed: WhatsAppSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera" },
    priya: { name: "Priya Shah", online: true },
    tom: { name: "Tom Berg", lastSeen: "last seen today at 08:12" },
  },
  chats: [
    // Keep a one-to-one chat's id equal to the person's id, so deliver("priya", ...) finds it.
    { id: "priya", with: "priya", messages: [{ from: "priya", at: Date.now() - 3_600_000, text: "Are we still on for 3?" }] },
    { id: "team", name: "Launch crew", members: ["priya", "tom"], messages: [{ from: "tom", text: "Deck is final 🎉" }] },
  ],
};

export default function Episode() {
  // `restore` is read once, on mount: load the saved state before rendering the phone.
  const [saved, setSaved] = useState<WhatsAppState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<WhatsAppState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Phone saved={saved} />;
}

function Phone({ saved }: { saved: WhatsAppState | null }) {
  const whatsapp = useWhatsApp(seed, {
    restore: saved,
    async onEvent(event) {
      if (event.type !== "send") return;
      void casuro.track.message({ from: "candidate", to: whatsapp.chat(event.chat).name, channel: "whatsapp", text: event.text });
      if (event.chat !== "priya") return;
      whatsapp.setTicks(event.id, "read");
      whatsapp.typingIn("priya", "priya");
      const reply = await casuro.llm(
        [
          { role: "system", content: "You are Priya Shah. Reply as a short WhatsApp message." },
          { role: "user", content: event.text },
        ],
        { persona: "Priya Shah" },
      );
      await whatsapp.deliver("priya", { from: "priya", text: reply });   // clears Priya's typing
      void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "whatsapp", text: reply });
    },
  });

  // One timed beat: Tom writes in the group 25 seconds in (only on a fresh start).
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      void whatsapp.deliver("team", { from: "tom", text: "Client moved the call to 2pm, can someone confirm?" }, { typing: 1500, notify: true });
    }, 25_000);
    return () => clearTimeout(t);
  }, [saved, whatsapp.deliver]);

  // Save every change.
  useEffect(() => void casuro.store.set(whatsapp.state), [whatsapp.state]);

  return (
    <div style={{ height: "100vh" }}>
      <WhatsApp whatsapp={whatsapp} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `WhatsApp.tsx` | The layout and the toast. |
| `ChatList.tsx` | The rail, and the chat list with its search, filters and rows. |
| `Conversation.tsx` | The chat's header and the scrolling wallpaper of messages. |
| `Messages.tsx` | Day separators and a bubble: its tail, sender, quote, picture, document, voice note, reactions, time and ticks. |
| `Composer.tsx` | The message field with the mic that turns into send. |
| `context.tsx` | What the parts share, and the avatar. |
| `use-whatsapp.ts` | The state and what changes it. |
| `format.ts` | Times and dates. |
| `icons.tsx` | The mockup's icons. |
| `whatsapp.css` | The look, from the mockup. |

For a message the kit has no part for (a location, a poll, a contact card),
give it `custom: { type, data }` and draw it with
`<WhatsApp renderCustom={(m) => ...} />`. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=whatsapp` next to `/apps/whatsapp.html`: the same chats and
demo, drawn by the React version.
