# Outlook (React)

`apps/outlook.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy
the folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/outlook src/apps/outlook
```

It needs only React 19. The styles are plain CSS scoped to `.kit-outlook`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). The font is the system Segoe UI stack, as in the
mockup, so nothing loads from the network.

## Use

```tsx
import { Outlook, useOutlook, type OutlookSeed } from "./apps/outlook";

const seed: OutlookSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera", email: "sam@northwind.example" },
    priya: { name: "Priya Shah", email: "priya@northwind.example" },
    billing: { name: "Acme Billing", email: "billing@acme.example", initials: "AB", color: 7 },
  },
  categories: { Urgent: "red", Finance: "yellow" },
  conversations: [
    {
      id: "q3",
      subject: "Q3 numbers",
      unread: true,
      categories: ["Finance"],
      messages: [
        { from: "priya", at: Date.now() - 3_600_000, text: "Hi Sam,\n\nThe Q3 sheet is attached.", signature: "Priya", attachments: [{ name: "q3.xlsx", size: 48_000 }] },
      ],
    },
    { subject: "Your invoice is ready", focused: false, messages: [{ from: "billing", text: "Total due: $120." }] },
  ],
};

function Mail() {
  const outlook = useOutlook(seed, {
    onEvent(event) {
      if (event.type === "send") {
        // The person sent (or replied to) event.conversation; answer, record, move the story on.
        void outlook.reply(event.conversation, { from: "priya", text: "Thanks!" }, { delay: 4000 });
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Outlook outlook={outlook} />
    </div>
  );
}
```

`<Outlook>` fills the box it is in, so give that box a height. Under 1200px
wide the reading pane opens over the message list, and under 760px it
switches to Outlook's phone layout (folder drawer, New mail button), by the
width of its own box, whatever the window size, so it also works as one pane
of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id, with a `name` and `email`. `me` is the signed-in
  person's id. `photo` is a picture URL, otherwise `initials` on one of
  Outlook's eight avatar `color`s. Mail can also come from, or go to, any
  plain email address.
- `conversations`: every conversation in the mailbox, each in a `folder`
  (`inbox` by default; also `drafts`, `sent`, `scheduled`, `deleted`, `junk`,
  `archive`, `notes`, `history`, or a custom folder's id). In the inbox,
  `focused: false` puts it under Other. It can be `unread`, `flagged`,
  `pinned`, of high `importance`, carry `categories`, be `snoozedUntil` a
  time, and hold a meeting `invite` (with other `busy` events that day for
  its day view).
- A message has `from`, `to`, `cc`, `at` (ms or a date string), and its body
  as plain `text` (a blank line starts a paragraph) or trusted `html` (tables,
  lists, a newsletter), plus a grey `signature` and `attachments`.
- `folders` (custom ones), `favorites`, `groups`, `categories` and their
  colors, `suggested` people for the To field, and the starting `theme`,
  `density`, reading `pane` position and `focusedInbox`.

## Driving it

`useOutlook` returns the mailbox. The world acts on it through:

| Call | What happens |
| --- | --- |
| `outlook.receive(conversation)` | New mail lands (in the inbox, unread, unless it says otherwise) with a notification card. Returns its id. |
| `outlook.reply(id, message, { delay: 5000 })` | Someone answers in a conversation: after the delay the message lands, the conversation moves to the inbox (unread unless it is open) and a card pops up. Resolves with the message id, or null if the conversation is gone. |
| `outlook.open(id)` | Show a conversation, from whatever folder it is in. |
| `outlook.compose({ to, subject, html })` | Open a new message (or, with `kind` and `conversation`, a reply) already filled in. |
| `outlook.toast(text, { ok, actions })` | A notice at the bottom, with buttons if you like. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent` (`ids` are
conversation ids):

| Event | When |
| --- | --- |
| `{ type: "send", kind, conversation, id, to, cc, bcc, subject, text, html, attachments, scheduled? }` | They send a new message, a reply, a reply all or a forward (or schedule one). |
| `{ type: "open", id }` | They open a conversation. |
| `{ type: "folder", folder }` / `{ type: "search", query }` | They go to a folder, or search. |
| `{ type: "delete", ids, permanent }` | They delete (from Deleted Items: for good). |
| `{ type: "archive", ids }` / `{ type: "move", ids, folder }` | They archive, or move to a folder. |
| `{ type: "junk", ids, junk, phishing? }` | They report junk or phishing, or mark as not junk. |
| `{ type: "read", ids, read }` / `{ type: "flag", ids, flagged }` / `{ type: "pin", ids, pinned }` | They mark read or unread, flag, pin. |
| `{ type: "snooze", ids, until }` / `{ type: "categorize", ids, category, added }` | They snooze, or add or remove a category (`category: null` clears them). |
| `{ type: "rsvp", id, response }` | They accept, tentatively accept or decline an invite. |
| `{ type: "draft", id, action }` | A draft is saved or discarded. |
| `{ type: "undo", label }` | They undo something; `label: "Send"` when they undo a send, so cancel your reply. |
| `{ type: "createFolder", folder }` / `{ type: "attachment", id, name, action }` | They create a folder, or open or download an attachment. |

`outlook.state` is everything that changed, as plain JSON: save it, and pass
it back as `useOutlook(seed, { restore })` to pick up where they left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Outlook.tsx` | The layout, keyboard shortcuts, menus, the settings flyout, the toast, the new-mail card, dialogs. |
| `Header.tsx` | The header with search, the ribbon, and the Move to, Snooze and Categorize menus. |
| `Folders.tsx` | The folder pane: Favorites, folders, Create new folder, Groups. |
| `MessageList.tsx` | Focused and Other, the filter, select mode, date groups, a conversation's row and its hover actions, the right-click menu. |
| `ReadingPane.tsx` | The open conversation: messages, attachments, the meeting invite; the multi-select actions; the empty pane. |
| `Compose.tsx` | Writing: recipient chips with suggestions, the rich-text body, the formatting buttons. |
| `use-outlook.ts` | The state and what changes it. |
| `format.tsx` | Dates, sizes and mail bodies. |
| `icons.tsx` | Outlook's icons and the Microsoft 365 logos. |
| `outlook.css` | The look, from the mockup. |

For something in a message the kit has no part for (a form, an approval, a
poll), give the message `custom: { type, data }` and draw it under the body
with `<Outlook renderCustom={(m) => ...} />`. For anything else, edit the
files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=outlook` next to `/apps/outlook.html`: the same mailbox and
demo (a colleague writes back a few seconds after you send them something),
drawn by the React version.
