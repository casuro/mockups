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
  lists, a newsletter), plus a grey `signature` and `attachments`. `html` is
  shown as written, so anything a model writes (a persona's reply) goes in
  `text`, which is escaped.
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

## API reference

Everything below is what the kit's source defines; nothing else exists.

### Imports

```ts
import {
  Outlook, useOutlook, listOf,
  type OutlookProps, type OutlookMailbox, type OutlookOptions, type ReceiveOptions, type ReplyOptions,
  type ToastOptions, type ComposeOptions, type Person,
  type OutlookSeed, type OutlookState, type OutlookEvent, type OutlookConversation, type OutlookConversationInput,
  type OutlookMessage, type OutlookMessageInput,
} from "./apps/outlook";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/outlook/icons";
```

`index.ts` also re-exports every other type in `types.ts` (`OutlookPerson`, `OutlookFolder`, `BuiltInFolder`, `CategoryColor`, `OutlookAttachment`, `OutlookInviteSeed`, `OutlookInvite`, `OutlookBusy`, `RsvpResponse`, `OutlookCompose`, `ComposeKind`, `Density`, `PanePosition`, `ListFilter`). `listOf(state, outlook.people, outlook.me)` returns the conversations the list shows right now (folder, pivot, search and filter applied), newest first.

### The hook

```ts
function useOutlook(seed: OutlookSeed, options?: OutlookOptions): OutlookMailbox;

interface OutlookOptions {
  restore?: OutlookState | null;             // a saved `outlook.state`; read on the first render only
  onEvent?: (event: OutlookEvent) => void;   // everything the signed-in person does
}
```

It throws if `seed.me` is not a key of `seed.people`. A `restore` whose `version` is not `1` is ignored.

### The seed

```ts
type BuiltInFolder = "inbox" | "drafts" | "sent" | "scheduled" | "deleted" | "junk" | "archive" | "notes" | "history";
type CategoryColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "teal" | "pink";
type RsvpResponse = "accept" | "tentative" | "decline";

interface OutlookSeed {
  me: string;                                    // required: the signed-in person's id
  people: Record<string, OutlookPerson>;         // required
  conversations: OutlookConversationInput[];     // required, any folder, any order
  account?: { organization?: string };
  folders?: { id: string; name: string }[];      // custom folders
  favorites?: string[];                          // folder ids; inbox, sent, drafts by default
  groups?: { name: string; color?: string }[];
  categories?: Record<string, CategoryColor>;    // name -> color, menu order
  open?: string;                                 // conversation id open at the start
  suggested?: string[];                          // people first in the To field
  theme?: "light" | "dark";
  density?: "roomy" | "cozy" | "compact";
  pane?: "right" | "bottom" | "off";
  focusedInbox?: boolean;                        // default true
}

interface OutlookPerson {
  name: string; email: string;                   // required
  photo?: string; initials?: string;
  color?: number;                                // avatar color 0-7
}

interface OutlookConversationInput {
  subject: string;                               // required
  messages: OutlookMessageInput[];               // required, oldest first
  id?: string;
  folder?: string;                               // a BuiltInFolder or a custom folder id; default "inbox"
  focused?: boolean;                             // default true; false = Other
  unread?: boolean; flagged?: boolean; pinned?: boolean;
  importance?: "high" | "normal";
  categories?: string[];
  invite?: { start: number | string; end: number | string;            // required in an invite
             title?: string; location?: string; organizer?: string; attendees?: number;
             busy?: { title: string; start: number | string; end: number | string }[];
             response?: RsvpResponse | null };
  snoozedUntil?: number | string;
}

interface OutlookMessageInput {
  from: string;                                  // required: a person id or an email address
  id?: string;
  to?: string[];                                 // ids or addresses; [me] by default
  cc?: string[];
  at?: number | string;                          // ms or a date string; now by default
  text?: string;                                 // plain text, escaped: use this for model output
  html?: string;                                 // trusted HTML instead of text, shown as written
  signature?: string;
  attachments?: { name: string; size: number }[];   // size in bytes
  custom?: { type: string; data?: unknown };     // drawn by <Outlook renderCustom>
}
```

### What the world can do

All of these are stable across renders.

```ts
outlook.receive(conversation: OutlookConversationInput, o?: ReceiveOptions): string
  // New mail (unread, in the inbox, unless it says otherwise), with the new-mail card.
  // Returns its id synchronously; throws if a conversation with that id exists.
interface ReceiveOptions { notify?: boolean }    // the new-mail card, default true
outlook.reply(conversation: string, message: OutlookMessageInput, o?: ReplyOptions): Promise<string | null>
  // After `delay` ms the message lands, the conversation moves to the inbox (Focused),
  // unread unless it is open, with the card. Resolves with the message id, or null if it is gone.
interface ReplyOptions { notify?: boolean; delay?: number }
outlook.open(id: string): void                   // show a conversation from any folder (fires "open")
outlook.compose(o?: ComposeOptions): void        // open the compose form already filled in
interface ComposeOptions {
  kind?: "new" | "reply" | "replyAll" | "forward"; conversation?: string | null;
  to?: string[]; cc?: string[]; subject?: string; html?: string;
  attachments?: { name: string; size: number }[]; draft?: string | null;
}
outlook.toast(text: string, o?: ToastOptions): void
interface ToastOptions { ok?: boolean; actions?: { label: string; run: () => void }[] }   // ok = green check
```

Read-only fields: `outlook.state`, `outlook.seed`, `outlook.me`, `outlook.people` (`Record<string, Person>`), `outlook.person(idOrEmail: string): Person` (an unknown address comes back as a Person named by the address), `outlook.notice`, `outlook.alert`, `outlook.dialog`, `outlook.canUndo`. `outlook.ui` is what `<Outlook>` calls for the signed-in person; a world does not need it.

### Events

```ts
type OutlookEvent =
  | { type: "send"; kind: "new" | "reply" | "replyAll" | "forward";
      conversation: string;          // the one replied to, or a new one in Sent Items (or Scheduled)
      id: string;                    // the new message
      to: string[]; cc: string[]; bcc: string[];   // person ids or typed email addresses
      subject: string; text: string; html: string;  // text = the body stripped of tags
      attachments: { name: string; size: number }[];
      scheduled?: number }           // when they picked "Schedule send"
  | { type: "open"; id: string }
  | { type: "folder"; folder: string }
  | { type: "search"; query: string }
  | { type: "delete"; ids: string[]; permanent: boolean }
  | { type: "archive"; ids: string[] }
  | { type: "move"; ids: string[]; folder: string }
  | { type: "junk"; ids: string[]; junk: boolean; phishing?: boolean }
  | { type: "read"; ids: string[]; read: boolean }
  | { type: "flag"; ids: string[]; flagged: boolean }
  | { type: "pin"; ids: string[]; pinned: boolean }
  | { type: "snooze"; ids: string[]; until: number }
  | { type: "categorize"; ids: string[]; category: string | null; added: boolean }
  | { type: "rsvp"; id: string; response: "accept" | "tentative" | "decline" }
  | { type: "draft"; id: string; action: "save" | "discard" }
  | { type: "undo"; label: string }
  | { type: "createFolder"; folder: { id: string; name: string } }
  | { type: "attachment"; id: string; name: string; action: "open" | "download" };
```

`send` fires at once; pressing Undo afterwards fires `{ type: "undo", label: "Send" }` with no id, so remember the last `send` yourself if you need to cancel an answer. An undone new message removes its conversation, so a later `outlook.reply` to it resolves `null`; an undone reply does not stop an answer already scheduled. A scheduled send (`scheduled` set) never goes out by itself: it sits in the Scheduled folder as a new conversation, even when it was a reply.

### State

`outlook.state` is an `OutlookState`: plain JSON (`version: 1`, `conversations`, `folders`, `favorites`, `categories`, `folder`, `pivot`, `query`, `filter`, `open`, `selected`, `selectMode`, `compose`, `theme`, `density`, `pane`, `focusedInbox`, `navHidden`, `seq`), a new object after every change. Save it, and pass it back as `useOutlook(seed, { restore })`; `restore` is read only when the hook first mounts, so load the saved state before rendering the component that calls `useOutlook`.

### The component

```ts
interface OutlookProps {
  outlook: OutlookMailbox;                                  // required: from useOutlook
  renderCustom?: (message: OutlookMessage) => ReactNode;    // a message's `custom` part, under the body
  className?: string;
  style?: CSSProperties;
}
```

`<Outlook>` fills its parent, so the parent needs a height. Under 1200px of that parent's width the reading pane opens over the list; under 760px it uses the phone layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Outlook, useOutlook, type OutlookSeed, type OutlookState } from "./apps/outlook";

const seed: OutlookSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera", email: "sam@northwind.example" },
    priya: { name: "Priya Shah", email: "priya@northwind.example" },
    billing: { name: "Acme Billing", email: "billing@acme.example", initials: "AB", color: 7 },
  },
  categories: { Finance: "yellow" },
  conversations: [
    { id: "q3", subject: "Q3 numbers", unread: true, categories: ["Finance"], messages: [
      { from: "priya", at: Date.now() - 3_600_000, text: "Hi Sam,\n\nThe Q3 sheet is attached. Can you sanity-check revenue?", signature: "Priya", attachments: [{ name: "q3.xlsx", size: 48_000 }] },
    ] },
  ],
};

export default function Episode() {
  // `restore` is read once, on mount: load the saved state before rendering the mailbox.
  const [saved, setSaved] = useState<OutlookState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<OutlookState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Mail saved={saved} />;
}

function Mail({ saved }: { saved: OutlookState | null }) {
  const outlook = useOutlook(seed, {
    restore: saved,
    async onEvent(event) {
      if (event.type !== "send" || event.scheduled) return;
      const to = event.to.map((t) => outlook.person(t));
      void casuro.track.message({ from: "candidate", to: to.map((p) => p.name).join(", "), channel: "email", text: event.text });
      if (!to.some((p) => p.id === "priya")) return;
      const reply = await casuro.llm(
        [
          { role: "system", content: "You are Priya Shah, a finance analyst. Answer this email briefly in plain text." },
          { role: "user", content: `Subject: ${event.subject}\n\n${event.text}` },
        ],
        { persona: "Priya Shah" },
      );
      // `text`, not `html`: model output is escaped there.
      await outlook.reply(event.conversation, { from: "priya", text: reply }, { delay: 4000 });
      void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "email", text: reply });
    },
  });

  // One timed beat: an invoice lands 40 seconds in (only on a fresh start).
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      outlook.receive({ subject: "Invoice overdue", importance: "high", messages: [{ from: "billing", text: "Invoice #4410 is 30 days overdue. Total due: $12,400." }] });
    }, 40_000);
    return () => clearTimeout(t);
  }, [saved, outlook.receive]);

  // Save every change.
  useEffect(() => void casuro.store.set(outlook.state), [outlook.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Outlook outlook={outlook} />
    </div>
  );
}
```

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
