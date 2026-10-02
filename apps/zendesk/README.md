# Zendesk Agent Workspace (React)

`apps/zendesk.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy
the folder into your project and it is yours: use it as it is, or change
any file for what your screen needs.

```bash
cp -r apps/zendesk src/apps/zendesk
```

It needs only React 19. The styles are plain CSS scoped to `.kit-zendesk`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). It uses the system font, like Zendesk, so nothing
loads from the network.

## Use

```tsx
import { Zendesk, useZendesk, type ZendeskSeed } from "./apps/zendesk";

const seed: ZendeskSeed = {
  account: { name: "Northwind Support" },
  me: "sam",
  agents: {
    sam: { name: "Sam Rivera", email: "sam@northwind.com" },
    priya: { name: "Priya Shah", group: "Tier 2" },
  },
  organizations: {
    acme: { name: "Acme Corp", plan: "Enterprise", timezone: "Europe/London", city: "London" },
  },
  requesters: {
    jo: { name: "Jo Park", email: "jo@acme.com", org: "acme", title: "Office Manager" },
  },
  tickets: [
    {
      id: 1042, subject: "Can't log in after password reset", requester: "jo",
      status: "open", priority: "high", type: "incident", assignee: "sam", tags: ["login"],
      messages: [{ from: "jo", at: Date.now() - 3_600_000, text: "The reset link says it expired." }],
    },
  ],
  macros: [{ name: "Ask for a screenshot", text: "Could you send a screenshot of the error?" }],
  tabs: [1042],
  open: 1042,
};

function HelpDesk() {
  const zendesk = useZendesk(seed, {
    onEvent(event) {
      if (event.type === "submit" && !event.note) {
        // The agent replied on event.ticket; have the customer answer, record it, move the story on.
        void zendesk.customerReply(event.ticket, "That worked, thanks!", { delay: 3000 });
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Zendesk zendesk={zendesk} />
    </div>
  );
}
```

`<Zendesk>` fills the box it is in, so give that box a height. It drops the
customer panel when the box is under 1180px wide, and switches to the phone
layout (a drawer for the views, folded ticket properties) under 760px,
whatever the window size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `agents` and `requesters`, by id (use distinct ids across both). `me` is
  the signed-in agent. `photo` is a picture URL, otherwise initials on
  `color`. An agent's `group` shows in the Assignee field ("Support / Sam").
- `organizations`, which requesters belong to: the plan pill, local time
  (`timezone`, `city`) and tags in the customer panel. A requester's
  `history` lists older interactions under their organization's tickets.
- `tickets`, each with `subject`, `status` (new, open, pending, solved),
  `priority`, `type`, `assignee`, `tags`, `followers`, `channel` (email,
  web, chat) and `messages`, oldest first. A message has `from`, `at` (ms
  or a date string) and plain `text`; `note: true` makes it an internal
  note, and it can carry an `attachment` name or a `custom` part.
- `macros`: canned replies that fill the composer.
- `views`: the views panel, each with a `filter` on assignee ("me", "none"
  or an id), statuses and `updatedWithin` hours. Zendesk's usual six when
  left out.
- `view`, `tabs` and `open`: what is on screen at the start.

## Driving it

`useZendesk` returns the workspace. The world acts on it through:

| Call | What happens |
| --- | --- |
| `zendesk.createTicket(ticket, { open })` | A ticket arrives (at the top of the lists). Returns its number; `open: true` shows it in a tab. |
| `zendesk.customerReply(id, text, { delay: 3000 })` | The requester answers after `delay` ms, which reopens a pending or solved ticket. A toast when the agent is on another ticket. Resolves with the message id. |
| `zendesk.addMessage(id, message, { delay })` | Any message: another agent's reply or internal note (`note: true`), or a customer's. An empty text delivers nothing (`customerReply` too) and resolves with `""`. |
| `zendesk.updateTicket(id, patch)` | Change `status`, `priority`, `type`, `assignee`, `tags`, `followers` or `subject`, as a trigger or another agent would. |
| `zendesk.open(id)` / `zendesk.open(null)` | Show a ticket in a tab, or the view's list. |
| `zendesk.showView(id)` | List a view. |
| `zendesk.toast(text)` | A notice at the bottom. |
| `zendesk.setTheme("dark")` | Zendesk's dark colors. |

Every function is stable across renders.

The signed-in agent's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "submit", ticket, status, note, text, id? }` | They press Submit: a public reply or internal note (`text` is empty when only the status changed), submitted as `status`. |
| `{ type: "open", ticket }` | They open a ticket from a list, a tab or the customer's recent tickets. |
| `{ type: "close", ticket }` | They close a tab. |
| `{ type: "view", view }` | They pick a view. |
| `{ type: "macro", ticket, macro }` | They apply a macro (its name). |
| `{ type: "change", ticket, field, value }` | They change the assignee, type, priority or status in the properties panel. |
| `{ type: "tag", ticket, tag, added }` | They add or remove a tag. |
| `{ type: "follow", ticket, following }` | They follow or unfollow the ticket. |
| `{ type: "action", label }` | They press something the kit has no behaviour for: "Play", "Options", "Notifications", "Reporting", "Bold"... Answer with a toast, or build it. |

`zendesk.state` is everything that changed, as plain JSON (tickets, tabs,
unsent drafts): save it, and pass it back as `useZendesk(seed, { restore })`
to pick up where they left off.

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-zendesk.ts` and
`Zendesk.tsx`. You should not need to open them.

### Imports

```ts
import {
  Zendesk, useZendesk, DEFAULT_VIEWS,
  type ZendeskProps, type ZendeskWorkspace, type ZendeskOptions, type MessageOptions, type TicketPatch, type Person,
  type ZendeskSeed, type ZendeskState, type ZendeskEvent, type ZendeskTicket, type ZendeskTicketInput,
  type ZendeskMessage, type ZendeskMessageInput, type TicketStatus,
} from "./apps/zendesk";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/zendesk/icons";
```

`DEFAULT_VIEWS` is the six views used when `seed.views` is left out (ids
`mine`, `unassigned`, `all`, `recent`, `pending`, `solved`). `index.ts` also
re-exports every other type in `types.ts` (`ZendeskAgent`,
`ZendeskRequester`, `ZendeskOrganization`, `ZendeskView`, `ZendeskMacro`,
`TicketPriority`, `TicketType`, `TicketChannel`, `TicketField`...).

### The hook

```ts
function useZendesk(seed: ZendeskSeed, options?: ZendeskOptions): ZendeskWorkspace;

interface ZendeskOptions {
  restore?: ZendeskState | null;           // a saved `zendesk.state`; read once, on the first render
  onEvent?: (event: ZendeskEvent) => void; // everything the signed-in agent does
}
```

Keep `seed` stable (a module constant or `useMemo`). `seed.me` must be a
key of `seed.agents`, or the hook throws. Ticket ids are numbers.

### The seed

```ts
type TicketStatus = "new" | "open" | "pending" | "solved";
type TicketPriority = "low" | "normal" | "high" | "urgent";
type TicketType = "question" | "incident" | "problem" | "task";
type TicketChannel = "email" | "web" | "chat";

interface ZendeskSeed {
  account: { name: string };               // required - "to Northwind Support"
  me: string;                              // required - signed-in agent's id
  agents: Record<string, { name: string; email?: string; photo?: string; color?: string; group?: string }>; // required; group "Support" by default
  organizations?: Record<string, { name: string; plan?: string; timezone?: string; city?: string; tags?: string[] }>;
  requesters: Record<string, {             // required; ids distinct from agent ids
    name: string; email: string;           // required
    org?: string; title?: string; photo?: string; color?: string;
    language?: string;                     // "English" by default
    history?: { text: string; when: string }[];
  }>;
  tickets: ZendeskTicketInput[];           // required (may be [])
  macros?: { name: string; text: string }[];
  views?: { id: string; name: string; filter: { assignee?: "me" | "none" | string; status?: TicketStatus[]; updatedWithin?: number } }[];
  view?: string;                           // view listed at the start; the first by default
  tabs?: number[];                         // tickets open in tabs at the start
  open?: number;                           // the tab on screen at the start
  theme?: "light" | "dark";
}

interface ZendeskTicketInput {
  subject: string;                         // required
  requester: string;                       // required - a requester id
  id?: number;                             // next free number when left out
  status?: TicketStatus;                   // "new"
  priority?: TicketPriority;               // "normal"
  type?: TicketType;                       // "question"
  assignee?: string | null;                // agent id
  tags?: string[];
  followers?: string[];                    // agent ids
  channel?: TicketChannel;                 // "email"
  requestedAt?: number | string;           // first message's time, or now
  updatedAt?: number | string;             // last message's time
  messages?: ZendeskMessageInput[];        // oldest first
}

interface ZendeskMessageInput {
  from: string;                            // required - agent or requester id
  id?: string;
  at?: number | string;                    // now by default
  channel?: TicketChannel;                 // the ticket's by default
  note?: boolean;                          // internal note
  text?: string;                           // plain text, line breaks kept
  attachment?: string;                     // a file name
  custom?: { type: string; data?: unknown }; // drawn by `renderCustom`
}
```

### What the world can do

All functions are stable across renders. A missing ticket id throws.

- `createTicket(ticket: ZendeskTicketInput, opts?: { open?: boolean }): number` - a ticket arrives at the top of the lists; returns its number. `open: true` shows it in a tab. Throws if the id exists.
- `customerReply(ticket: number, text: string, opts?: { delay?: number; notify?: boolean; attachment?: string; channel?: TicketChannel }): Promise<string>` - the requester writes, after `delay` ms. Resolves with the message id once it lands. Reopens a pending or solved ticket; toasts when the agent is on another ticket.
- `addMessage(ticket: number, message: ZendeskMessageInput, opts?: { delay?: number; notify?: boolean }): Promise<string>` - any message: another agent's reply, an internal note (`note: true`), or a customer's. A non-agent `from` reopens a pending or solved ticket. `notify` is true by default for customers only.
- `updateTicket(id: number, patch: TicketPatch): void` - `TicketPatch` is a partial of `subject, status, priority, type, assignee, tags, followers`.
- `open(id: number | null): void` - shows a ticket in a tab, or the view's list with `null`. Does not fire an event.
- `showView(id: string): void` - lists a view.
- `toast(text: string): void` - a notice at the bottom.
- `setTheme(theme: "light" | "dark"): void`.
- `active: ZendeskTicket | null` - the ticket on screen.
- `state: ZendeskState` - see State.
- Read-only: `seed`, `me`, `people: Record<string, Person>` (agents and requesters: `id, name, initials, color, photo?, email?, agent`), `views`, `macros`, `notice`.
- `ui` is what `<Zendesk>` wires to the agent's clicks. Do not call it from the world.

Delayed messages are dropped if the hook unmounts before they land.

### Events

```ts
type ZendeskEvent =
  | { type: "open"; ticket: number }
  | { type: "close"; ticket: number }
  | { type: "view"; view: string }
  | { type: "submit"; ticket: number; status: TicketStatus; note: boolean; text: string; id?: string } // text "" when only the status changed
  | { type: "macro"; ticket: number; macro: string }            // the macro's name; it only fills the composer
  | { type: "change"; ticket: number; field: "assignee" | "type" | "priority" | "status"; value: string | null }
  | { type: "tag"; ticket: number; tag: string; added: boolean }
  | { type: "follow"; ticket: number; following: boolean }
  | { type: "action"; label: string };                          // "Play", "Options", "Reporting", "Bold"...
```

A public reply is `submit` with `note: false` and a non-empty `text`.
Submitting a reply on an unassigned ticket assigns it to the signed-in
agent.

### State

`zendesk.state` is a `ZendeskState`: plain JSON (`version: 1`, `tickets`,
`tabs`, `active`, `view`, `drafts` - unsent composer text by ticket id -,
`theme`, `seq`). Save it whenever it changes and pass it back as
`useZendesk(seed, { restore })`. `restore` is read only on the first render,
and only when `restore.version === 1`, so load the saved state before you
mount the component that calls `useZendesk`.

### The component

```ts
interface ZendeskProps {
  zendesk: ZendeskWorkspace;                            // required - what useZendesk returned
  renderCustom?: (message: ZendeskMessage) => ReactNode; // draws a message's `custom`, under its text
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height. It drops the customer
panel under 1180px wide and switches to the phone layout under 760px.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Zendesk, useZendesk, type ZendeskSeed, type ZendeskState } from "./apps/zendesk";

const seed: ZendeskSeed = {
  account: { name: "Northwind Support" },
  me: "sam",
  agents: { sam: { name: "Sam Rivera" }, priya: { name: "Priya Shah", group: "Tier 2" } },
  organizations: { acme: { name: "Acme Corp", plan: "Enterprise", timezone: "Europe/London", city: "London" } },
  requesters: {
    jo: { name: "Jo Park", email: "jo@acme.com", org: "acme", title: "Office Manager" },
    max: { name: "Max Bauer", email: "max@acme.com", org: "acme" },
  },
  tickets: [
    { id: 1042, subject: "Can't log in after password reset", requester: "jo", status: "open", priority: "high",
      type: "incident", assignee: "sam", messages: [{ from: "jo", text: "The reset link says it expired." }] },
  ],
  macros: [{ name: "Ask for a screenshot", text: "Could you send a screenshot of the error?" }],
  tabs: [1042],
  open: 1042,
};

// `restore` is read once, so load the saved state before mounting the help desk.
export function Episode() {
  const [saved, setSaved] = useState<ZendeskState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<ZendeskState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <HelpDesk saved={saved} />;
}

function HelpDesk({ saved }: { saved: ZendeskState | null }) {
  const zendesk = useZendesk(seed, {
    restore: saved,
    onEvent(event) {
      if (event.type === "submit" && event.text && !event.note) {
        const ticket = zendesk.state.tickets.find((t) => t.id === event.ticket);
        const customer = ticket ? zendesk.people[ticket.requester].name : "customer";
        void casuro.track.message({ from: "candidate", to: customer, channel: `#${event.ticket}`, text: event.text });
        if (ticket) void answer(ticket.id, customer, event.text);
      }
      if (event.type === "change") void casuro.track.decision({ summary: `Set ${event.field} of #${event.ticket} to ${event.value}` });
    },
  });

  // The requester answers every public reply.
  async function answer(ticket: number, customer: string, text: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: `You are ${customer}, an Acme Corp employee writing to Northwind Support. Answer the agent's email in two sentences.` },
        { role: "user", content: text },
      ],
      { persona: customer },
    );
    await zendesk.customerReply(ticket, reply, { delay: 2000 });
    void casuro.track.message({ from: customer, to: "candidate", channel: `#${ticket}`, text: reply });
  }

  // Two minutes in, an urgent ticket arrives (once: a restored state already has it).
  useEffect(() => {
    if (zendesk.state.tickets.some((t) => t.id === 1050)) return;
    const t = setTimeout(() => {
      zendesk.createTicket({
        id: 1050, subject: "Whole office locked out", requester: "max", priority: "urgent", type: "incident",
        messages: [{ from: "max", text: "Nobody at Acme can sign in since 9am. We have a board meeting at noon." }],
      });
      zendesk.toast("New ticket #1050 from Max Bauer");
    }, 120_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => void casuro.store.set(zendesk.state), [zendesk.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Zendesk zendesk={zendesk} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Zendesk.tsx` | The layout, the phone drawer, the toast, Esc to close menus. |
| `Nav.tsx` | The product rail, the top bar with a tab per open ticket, the views panel with counts. |
| `TicketList.tsx` | A view's table of tickets. |
| `Ticket.tsx` | A ticket on screen, and its properties panel: requester, assignee, followers, tags, type, priority, status. |
| `Conversation.tsx` | The subject, public replies and internal notes. |
| `Composer.tsx` | Public reply or internal note, the toolbar, macros, the "Submit as" split button. |
| `Customer.tsx` | The customer, their organization, recent tickets, interaction history. |
| `use-zendesk.ts` | The state and what changes it. |
| `format.ts` | Times ("Today 09:14", "12 min ago") and local time. |
| `zendesk.css` | The look, from the mockup. |

For a message the kit has no part for (an order, a form, a log excerpt),
give it `custom: { type, data }` and draw it with
`<Zendesk renderCustom={(m) => ...} />`; it shows under the message text.
For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=zendesk` next to `/apps/zendesk.html`: the same help desk,
drawn by the React version. Submit a public reply as Pending and the
customer answers a few seconds later.
