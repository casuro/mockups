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
| `whatsapp.deliver(chatId, message, { typing: 1500 })` | Shows the sender typing, then the message lands and the chat moves to the top. Elsewhere, it bumps the unread count (`notify: true` also shows a toast). Resolves with the message id. A person's id as `chatId` starts a chat with them. |
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
