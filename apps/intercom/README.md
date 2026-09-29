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

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-intercom.ts` and
`Intercom.tsx`. You should not need to open them.

### Imports

```ts
import {
  Intercom, useIntercom,
  type IntercomProps, type IntercomWorkspace, type IntercomOptions, type DeliverOptions, type ConversationPatch, type Person,
  type IntercomSeed, type IntercomState, type IntercomEvent, type IntercomConversationSeed, type IntercomConversationState,
  type IntercomCustomer, type IntercomMessage, type IntercomMessageInput, type IntercomSuggestion,
} from "./apps/intercom";
```

`index.ts` also re-exports every other type in `types.ts`
(`IntercomTeammate`, `IntercomInbox`, `IntercomMessageKind`,
`IntercomSource`, `IntercomStatus`).

### The hook

```ts
function useIntercom(seed: IntercomSeed, options?: IntercomOptions): IntercomWorkspace;

interface IntercomOptions {
  restore?: IntercomState | null;           // a saved `intercom.state`; read once, on the first render
  onEvent?: (event: IntercomEvent) => void; // everything the signed-in teammate does
}
```

Keep `seed` stable (a module constant or `useMemo`). `seed.me` must be a key
of `seed.teammates`, or the hook throws.

### The seed

```ts
interface IntercomSeed {
  workspace: { name: string };              // required
  me: string;                               // required - signed-in teammate's id
  teammates: Record<string, { name: string; email?: string; photo?: string; initials?: string; color?: string }>; // required
  customers: Record<string, IntercomCustomer>; // required
  inboxes: IntercomInbox[];                 // required - top of the sidebar ("Your inbox", "Mentions"...)
  teamInboxes?: IntercomInbox[];            // under "Team inboxes"
  views?: IntercomInbox[];                  // under "Views"
  conversations: IntercomConversationSeed[]; // required - newest first
  inserts?: { emoji?: string; article?: string; macro?: string }; // what the composer's buttons insert
  open?: string;                            // conversation on screen at the start; the first by default
  view?: string;                            // sidebar item selected at the start; the first inbox by default
  theme?: "light" | "dark";
}

interface IntercomCustomer {
  name: string;                             // required
  email?: string; company?: string;
  location?: string;                        // "Austin, TX"
  timezone?: string;                        // IANA, for the local time
  plan?: string;                            // a chip
  photo?: string; initials?: string; color?: string;
  recent?: { subject: string; at: string; status?: string }[];
}

interface IntercomInbox {
  id: string; label: string;                // required
  icon?: string;                            // an emoji or one character
  count?: number;                           // how many it lists, when left out
  conversations?: string[];                 // ids it lists; all when left out
}

interface IntercomConversationSeed {
  id: string;                               // required
  customer: string;                         // required - a customer id
  subject: string;                          // required
  channel?: "chat" | "email";               // "chat"
  unread?: boolean;
  priority?: boolean;                       // red Priority tag
  sla?: string;                             // "12m", "2h", "Overdue"
  slaBreached?: boolean;
  assignee?: string;                        // teammate id; me by default
  team?: string;
  tags?: string[];
  status?: "open" | "snoozed" | "closed";   // "open"
  messages?: IntercomMessageInput[];
  copilot?: IntercomSuggestion;
}

interface IntercomMessageInput {
  kind: "customer" | "reply" | "note" | "fin" | "event"; // required
  text: string;                             // required - plain text; in an event, *stars* bold a name
  id?: string;
  by?: string;                              // teammate id, for a reply or note
  at?: number | string;                     // now by default
  seen?: boolean;                           // "Seen" under a reply
  custom?: { type: string; data?: unknown }; // drawn by `renderCustom`
}

interface IntercomSuggestion {
  answer: string;                           // required
  question?: string;                        // the subject by default
  sources?: { title: string; kind?: "article" | "conversation" }[];
}
```

### What the world can do

All functions are stable across renders. A missing conversation id throws.

- `customerMessage(conversation: string, text: string, opts?: { typing?: number; notify?: boolean }): Promise<string>` - the customer writes; with `typing`, they are seen typing for that many ms first. Resolves with the message id. Reopens the conversation; elsewhere it turns unread, moves to the top and toasts.
- `deliver(conversation: string, message: IntercomMessageInput, opts?: { typing?: number; notify?: boolean }): Promise<string>` - any message: Fin, a teammate's reply or note, an event line. `notify` is true by default for customer messages only.
- `typingIn(conversation: string | null): void` - shows the customer typing (while you wait for `casuro.llm`), or stops it. `customerMessage` clears it when the message lands.
- `newConversation(conversation: IntercomConversationSeed, customer?: IntercomCustomer, opts?: { notify?: boolean }): void` - a conversation arrives at the top, unread, with a toast unless `notify: false`. Pass `customer` when its id is not in `seed.customers`. Throws if the id exists. Returns nothing: you choose the id.
- `suggest(conversation: string, suggestion: IntercomSuggestion | string): void` - Copilot's suggested answer.
- `assign(conversation: string, teammate: string): void` - someone else assigns it (no toast, no event).
- `updateConversation(conversation: string, patch: ConversationPatch): void` - `ConversationPatch` is a partial of `subject, priority, sla, slaBreached, team, tags, status, unread, channel`.
- `open(conversation: string): void` - shows a conversation and marks it read. It also fires an `{ type: "open" }` event.
- `toast(text: string): void` - a notice at the bottom.
- `current: string` - the conversation on screen. `typing: string | null` - whose customer is typing.
- `state: IntercomState` - see State.
- Read-only: `seed`, `me`, `teammates: Record<string, Person>`, `customers: Record<string, Person & IntercomCustomer>` (seed ones plus those added by `newConversation`), `notice`. `Person` is `id, name, initials, color, photo?, email?`.
- `ui` is what `<Intercom>` wires to the teammate's clicks. Do not call it from the world.

### Events

```ts
type IntercomEvent =
  | { type: "open"; conversation: string }
  | { type: "reply"; conversation: string; text: string; id: string }  // sent to the customer
  | { type: "note"; conversation: string; text: string; id: string }   // internal note
  | { type: "assign"; conversation: string; to: string }
  | { type: "snooze"; conversation: string; until: string }
  | { type: "close"; conversation: string }
  | { type: "insert"; conversation: string; tool: "suggestion" | "emoji" | "article" | "macro"; text: string }
  | { type: "copilot"; conversation: string; action: "regenerate" | "ask" | "source"; text?: string }
  | { type: "view"; id: string }
  | { type: "filter"; status: "Open" | "Snoozed" | "Closed" | "All"; sort: "Newest" | "Oldest" | "Waiting longest" | "Priority" }
  | { type: "away"; away: boolean }
  | { type: "action"; label: string; conversation?: string };           // rail items, search, new conversation, GIF, attach...
```

Copilot does not answer on its own: on `copilot` with `action: "ask"` or
`"regenerate"`, generate an answer and call `suggest`.

### State

`intercom.state` is an `IntercomState`: plain JSON (`version: 1`,
`current`, `view`, `status`, `sort`, `away`, `mode`, `tab`, `order`,
`conversations` by id, `customers` added at run time, `seq`). The typing
indicator is not in it. Save it whenever it changes and pass it back as
`useIntercom(seed, { restore })`. `restore` is read only on the first
render, and only when `restore.version === 1`, so load the saved state
before you mount the component that calls `useIntercom`.

### The component

```ts
interface IntercomProps {
  intercom: IntercomWorkspace;                           // required - what useIntercom returned
  renderCustom?: (message: IntercomMessage) => ReactNode; // draws a message's `custom`
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height. Under 1180px wide the
details panel becomes a sheet; under 760px the sidebar is a drawer and the
list and conversation take turns.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Intercom, useIntercom, type IntercomSeed, type IntercomState } from "./apps/intercom";

const seed: IntercomSeed = {
  workspace: { name: "Northwind" },
  me: "sam",
  teammates: { sam: { name: "Sam Rivera" }, priya: { name: "Priya Shah" } },
  customers: {
    jo: { name: "Jo Park", email: "jo@acme.test", company: "Acme", plan: "Pro", timezone: "Europe/London" },
    max: { name: "Max Bauer", email: "max@globex.test", company: "Globex", plan: "Enterprise" },
  },
  inboxes: [{ id: "you", label: "Your inbox", icon: "👋" }],
  conversations: [
    { id: "c1", customer: "jo", subject: "Can't export invoices", channel: "email", sla: "30m", tags: ["Billing"],
      messages: [{ kind: "customer", text: "The export button does nothing." }],
      copilot: { answer: "Hi Jo, exports are back: try again and it will download as CSV." } },
  ],
};

// `restore` is read once, so load the saved state before mounting the inbox.
export function Episode() {
  const [saved, setSaved] = useState<IntercomState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<IntercomState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Support saved={saved} />;
}

function Support({ saved }: { saved: IntercomState | null }) {
  const intercom = useIntercom(seed, {
    restore: saved,
    onEvent(event) {
      if (event.type === "reply") {
        const name = intercom.customers[intercom.state.conversations[event.conversation].customer].name;
        void casuro.track.message({ from: "candidate", to: name, channel: event.conversation, text: event.text });
        void answer(event.conversation, name, event.text);
      }
      if (event.type === "close" || event.type === "snooze")
        void casuro.track.decision({ summary: `${event.type === "close" ? "Closed" : "Snoozed"} conversation ${event.conversation}` });
    },
  });

  // The customer writes back to every reply, typing while the model thinks.
  async function answer(conversation: string, name: string, text: string) {
    intercom.typingIn(conversation);
    const reply = await casuro.llm(
      [
        { role: "system", content: `You are ${name}, a customer chatting with Northwind support. Answer in one or two short sentences.` },
        { role: "user", content: text },
      ],
      { persona: name },
    );
    await intercom.customerMessage(conversation, reply, { typing: 800 });
    void casuro.track.message({ from: name, to: "candidate", channel: conversation, text: reply });
  }

  // Two minutes in, a new customer writes (once: a restored state already has it).
  useEffect(() => {
    if (intercom.state.conversations.c2) return;
    const t = setTimeout(() => {
      intercom.newConversation({
        id: "c2", customer: "max", subject: "Charged twice", priority: true, sla: "10m",
        messages: [{ kind: "customer", text: "We were charged twice this month. I need this fixed today." }],
      });
    }, 120_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => void casuro.store.set(intercom.state), [intercom.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Intercom intercom={intercom} />
    </div>
  );
}
```

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
