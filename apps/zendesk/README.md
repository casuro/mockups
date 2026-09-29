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
| `zendesk.addMessage(id, message, { delay })` | Any message: another agent's reply or internal note (`note: true`), or a customer's. |
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
