# Intercom Inbox (React)

`apps/intercom.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy
the folder into your project and it is yours: use it as it is, or change
any file for what your screen needs.

```bash
cp -r apps/intercom src/apps/intercom
```

It needs only React 19. The styles are plain CSS scoped to `.kit-intercom`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). The mockup uses the system font stack, so there is no
font to load and nothing comes from the network.

## Use

```tsx
import { Intercom, useIntercom, type IntercomSeed } from "./apps/intercom";

const seed: IntercomSeed = {
  workspace: { name: "Northwind" },
  me: "sam",
  teammates: {
    sam: { name: "Sam Rivera" },
    priya: { name: "Priya Shah" },
  },
  customers: {
    jo: { name: "Jo Park", email: "jo@acme.test", company: "Acme", plan: "Pro", timezone: "Europe/London" },
  },
  inboxes: [{ id: "you", label: "Your inbox", icon: "👋" }],
  teamInboxes: [{ id: "support", label: "Support", icon: "🛠", count: 4 }],
  conversations: [
    {
      id: "c1", customer: "jo", subject: "Can't export invoices", channel: "email", sla: "30m", team: "Support", tags: ["Billing"],
      messages: [{ kind: "customer", at: Date.now() - 600_000, text: "The export button does nothing." }],
      copilot: { answer: "Hi Jo, exports are back: try again and it will download as CSV." },
    },
  ],
};

function Support() {
  const intercom = useIntercom(seed, {
    onEvent(event) {
      if (event.type === "reply") {
        // The teammate answered in event.conversation; have the customer write back, record it, move on.
        intercom.customerMessage(event.conversation, "Thanks, that worked!", { typing: 2000 });
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Intercom intercom={intercom} />
    </div>
  );
}
```

`<Intercom>` fills the box it is in, so give that box a height. It follows
the mockup's layouts by the width of that box, whatever the window size, so
it also works as one pane of a larger screen: under 1180px the details
panel becomes a sheet (the panel button in the header), and under 760px the
sidebar becomes a drawer and the list and the conversation take turns.

## The data

`types.ts` has the full shape, commented. In short:

- `teammates`, by id, with a `photo` URL (initials on `color` otherwise).
  `me` is the signed-in teammate's id.
- `customers`, by id: name, email, company, location, `timezone` (for the
  local time), plan, and `recent` conversations for the details panel.
- `inboxes`, `teamInboxes` and `views`: the sidebar, each item with an
  `icon` and a `count`. A `count` left out is the number of conversations
  the item lists; `conversations: [ids]` narrows the list to those when the
  item is selected.
- `conversations`, newest first: the customer, subject, `channel` (chat or
  email), `unread`, `priority`, `sla` and `slaBreached`, `assignee`, `team`,
  `tags`, `messages` and Copilot's suggested answer.
- A message has a `kind`: `customer`, `reply` (a teammate `by`), `note` (an
  internal note), `fin` (Fin AI Agent) or `event` (a centered line, where
  `*stars*` make a name bold). `at` is ms or a date string; `seen` marks a
  reply as seen.
- `inserts`: the text the composer's emoji, article and macro buttons add.

## Driving it

`useIntercom` returns the inbox. The world acts on it through:

| Call | What happens |
| --- | --- |
| `intercom.customerMessage(id, text, { typing: 1500 })` | The customer is seen typing, then the message lands. Elsewhere, the conversation turns unread, moves to the top and a toast shows it. Resolves with the message id. |
| `intercom.deliver(id, message, { typing })` | Any message: Fin's answer, a teammate's reply or note, an event line. |
| `intercom.typingIn(id)` / `(null)` | The customer typing, while a message is being written. |
| `intercom.newConversation(conversation, customer?)` | A conversation arrives at the top of the list, unread. Pass `customer` when they are new. |
| `intercom.suggest(id, { answer, question?, sources? })` | Copilot's suggested answer (a string is just the answer). |
| `intercom.assign(id, teammateId)` | Someone else assigns the conversation. |
| `intercom.updateConversation(id, patch)` | Priority, SLA, tags, team, status, subject. |
| `intercom.open(id)` | Show a conversation. |
| `intercom.toast(text)` | A notice at the bottom. |

Every function is stable across renders.

The signed-in teammate's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "open", conversation }` | They open a conversation. |
| `{ type: "reply", conversation, text, id }` | They send a reply to the customer. |
| `{ type: "note", conversation, text, id }` | They add an internal note. |
| `{ type: "assign", conversation, to }` | They assign it from the header. |
| `{ type: "snooze", conversation, until }` | They snooze it ("Tomorrow"). |
| `{ type: "close", conversation }` | They close it. |
| `{ type: "insert", conversation, tool, text }` | They add Copilot's suggestion to the composer, or insert the emoji, article or macro. |
| `{ type: "copilot", conversation, action, text? }` | Regenerate, a question asked in the Copilot box, or a source link. |
| `{ type: "view", id }` / `{ type: "filter", status, sort }` | They pick a sidebar item, or the list's status or sort. |
| `{ type: "away", away }` | They set themselves away or active. |
| `{ type: "action", label, conversation? }` | A button the kit has no behaviour for: the rail's other apps, search, new conversation, attach, GIF. |

`intercom.state` is everything that changed, as plain JSON: save it, and
pass it back as `useIntercom(seed, { restore })` to pick up where they left
off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Intercom.tsx` | The layout, the dropdown menu, the toast, Esc. |
| `Sidebar.tsx` | The app rail and the inbox sidebar. |
| `ConversationList.tsx` | The list: its header, status and sort pills, and rows. |
| `Conversation.tsx` | The conversation's header and thread. |
| `Composer.tsx` | The composer with its Reply and Note tabs and inserts. |
| `Details.tsx` | The details panel: Details and Copilot. |
| `use-intercom.ts` | The state and what changes it. |
| `format.tsx` | Times and event lines. |
| `intercom.css` | The look, from the mockup. |

For a message the kit has no part for (a form, an order, a file), give it
`custom: { type, data }` and draw it with
`<Intercom renderCustom={(m) => ...} />`. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=intercom` next to `/apps/intercom.html`: the same inbox,
drawn by the React version, with customers answering what you send.
