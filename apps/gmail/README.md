# Gmail (React)

`apps/gmail.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/gmail src/apps/gmail
```

It needs only React 19. The styles are plain CSS scoped to `.kit-gmail`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Roboto is embedded, so nothing loads from the network.

## Use

```tsx
import { Gmail, useGmail, type GmailSeed } from "./apps/gmail";

const seed: GmailSeed = {
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.example" },
    priya: { name: "Priya Shah", email: "priya@northwind.example", signature: "Priya Shah\nEngineering lead" },
    billing: { name: "Acme Billing", email: "billing@acme.example" },
  },
  labels: { Clients: "#1a73e8", "Clients/Contoso": "#188038" },
  mails: [
    {
      subject: "Contract draft for review", unread: true, important: true, labels: ["Clients/Contoso"],
      messages: [
        { from: "priya", to: ["sam"], at: Date.now() - 3_600_000, body: "Hi Sam,\n\nThe draft is attached. Two open points:\n- Payment terms\n- Renewal date", attachments: ["Contract v2.pdf"] },
      ],
    },
    { subject: "Your invoice", tab: "updates", messages: [{ from: "billing", to: ["sam"], body: "Total due: $120.00" }] },
  ],
};

function Mailbox() {
  const gmail = useGmail(seed, {
    onEvent(event) {
      if (event.type === "reply") {
        // The person answered in event.mail; answer back, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Gmail gmail={gmail} />
    </div>
  );
}
```

`<Gmail>` fills the box it is in, so give that box a height. It switches to
Gmail's tablet layout under 1100px and its mobile layout (drawer, Compose
button, two-line rows) under 760px, measured on that box rather than the
window, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id, with `name` and `email`. `me` is the signed-in
  person's id. `photo` is a picture URL, otherwise their initial on `color`.
  A `signature` ("Name\nCompany") ends their messages.
- `labels`: name to color. `"Engineering/Incidents"` nests under Engineering.
- `mails`: conversations. Each has a `subject`, a `folder` (inbox by default;
  sent, drafts, snoozed, scheduled, spam, trash, archive), an inbox `tab`
  (primary, promotions, social, updates), `labels`, the `unread`, `starred`
  and `important` flags, an optional calendar `invite`, and its `messages`.
- A message has `from`, `to` (ids, or plain addresses), `at` (ms or a date
  string), `body`, and `attachments` (file names; the extension picks the
  icon). In `body`, a blank line starts a paragraph, `- ` lines are a list,
  `` `code` ``, `*bold*` and URLs work. A `custom` part is drawn by you.
- `agenda`, `notes` and `tasks` fill the Calendar, Keep and Tasks side panels.
- `theme`, `density`, `pane` and `open` set how it starts.

## Driving it

`useGmail` returns the mailbox. The world acts on it through:

| Call | What happens |
| --- | --- |
| `gmail.receive(mail)` | A new conversation arrives (in the inbox, unread, by default) with a "New message from ..." notice and an Open button. Returns its id. |
| `gmail.reply(mailId, message, { delay: 5000 })` | After the delay, a message lands in that conversation, which moves back to the inbox, unread unless it is on screen, with a notice. `to` defaults to the signed-in person. Resolves with the message id. |
| `gmail.modify(mailId, { folder, tab, labels, unread, starred, important })` | Change a conversation. |
| `gmail.open(mailId)` | Show a conversation (a draft opens in the compose window). |
| `gmail.toast(text, [{ label, run }])` | A notice at the bottom left, with optional actions. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "send", id, to, subject, body }` | They send from the compose window (`id` is the new conversation). |
| `{ type: "reply", mail, id, to, body }` | They send an inline reply. |
| `{ type: "draft", id, to, subject, body }` | They close the compose window with something written. |
| `{ type: "open", id }` | They open a conversation. |
| `{ type: "action", action, ids }` | They archive, delete, report spam, snooze, mark read or unread, or add to Tasks. |
| `{ type: "undo", action, ids }` | They press Undo on a notice. |
| `{ type: "star", id, starred }` / `{ type: "important", id, important }` | They flag a conversation. |
| `{ type: "label", id, label, added }` | They take a label off a conversation. |
| `{ type: "manageLabel", action, label, to?, color? }` | They create, rename, recolor or remove a label. |
| `{ type: "rsvp", id, answer }` | They answer an invitation. |
| `{ type: "search", query }` / `{ type: "view", folder, label, tab }` | They search, or change folder, label or tab. |
| `{ type: "attachment", mail, name }` | They open an attachment. |
| `{ type: "task", text, done }` | They add or tick off a task. |

`gmail.state` is everything that changed, as plain JSON: save it, and pass
it back as `useGmail(seed, { restore })` to pick up where they left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Gmail.tsx` | The layout, the list or conversation in the main card, popovers, the snackbar, keyboard shortcuts. |
| `Header.tsx` | The top bar with search, the Google apps grid, the account card, Quick settings. |
| `Nav.tsx` | The sidebar: Compose, folders with More / Less, labels, the label menu and dialogs. |
| `MailList.tsx` | The list toolbar, inbox tabs, search chips, and a row per conversation. |
| `Thread.tsx` | An open conversation: messages, attachments, the invitation card, the inline reply. |
| `Compose.tsx` | The compose window. |
| `Side.tsx` | The Calendar, Keep and Tasks strip and panels. |
| `use-gmail.ts` | The state and what changes it. |
| `format.tsx` | Message text, snippets, dates, file icons. |
| `gmail.css` | The look, from the mockup. |

For content the kit has no part for (a form, a receipt, a chart), give a
message `custom: { type, data }` and draw it under the body with
`<Gmail renderCustom={(message) => ...} />`. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=gmail` next to `/apps/gmail.html`: the same mailbox and
demo (a colleague answers what you send them), drawn by the React version.
