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
| `gmail.reply(mailId, message, { delay: 5000 })` | After the delay, a message lands in that conversation, which moves back to the inbox, unread unless it is on screen, with a notice. `to` defaults to the signed-in person. Resolves with the message id. An empty body delivers nothing and resolves with `""`. |
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

## API reference

Everything below is what the kit's source defines; nothing else exists.

### Imports

```ts
import {
  Gmail, useGmail,
  type GmailProps, type GmailMailbox, type GmailOptions, type Notice, type NoticeAction, type Person,
  type GmailSeed, type GmailState, type GmailEvent, type GmailMail, type GmailMailInput,
  type GmailMessage, type GmailMessageInput, type GmailFolder, type GmailTab,
} from "./apps/gmail";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/gmail/icons";
```

`index.ts` also re-exports every other type in `types.ts` (`GmailPerson`, `GmailInvite`, `GmailRsvp`, `GmailView`, `GmailAction`, `GmailAgendaItem`, `GmailNote`, `GmailCompose`, `GmailDensity`, `GmailPane`).

### The hook

```ts
function useGmail(seed: GmailSeed, options?: GmailOptions): GmailMailbox;

interface GmailOptions {
  restore?: GmailState | null;             // a saved `gmail.state`; read on the first render only
  onEvent?: (event: GmailEvent) => void;   // everything the signed-in person does
}
```

It throws if `seed.me` is not a key of `seed.people`. A `restore` whose `version` is not `1` is ignored.

### The seed

```ts
type GmailFolder = "inbox" | "sent" | "drafts" | "snoozed" | "scheduled" | "spam" | "trash" | "archive";
type GmailTab = "primary" | "promotions" | "social" | "updates";
type GmailRsvp = "yes" | "no" | "maybe";

interface GmailSeed {
  me: string;                                  // required: the signed-in person's id
  people: Record<string, GmailPerson>;         // required
  mails: GmailMailInput[];                     // required, any order
  labels?: Record<string, string>;             // name -> color; "Parent/Child" nests
  agenda?: { time: string; title: string; now?: boolean }[];   // Calendar side panel
  notes?: { title: string; text: string; yellow?: boolean }[]; // Keep side panel
  tasks?: { text: string; done?: boolean }[];                  // Tasks side panel
  domain?: string;                             // "Managed by ..." in the account card
  open?: string;                               // a mail id on screen at the start; the inbox by default
  theme?: "light" | "dark";
  density?: "default" | "comfortable" | "compact";
  pane?: "none" | "right";
}

interface GmailPerson {
  name: string; email: string;                 // required
  photo?: string; color?: string;
  signature?: string;                          // "Name\nCompany", added under "--"
}

interface GmailMailInput {                     // a conversation
  subject: string;                             // required
  messages: GmailMessageInput[];               // required, oldest first
  id?: string;
  folder?: GmailFolder;                        // default "inbox"
  tab?: GmailTab;                              // default "primary"
  labels?: string[];
  unread?: boolean; starred?: boolean; important?: boolean;
  invite?: { title: string; start: number | string; end: number | string;
             organizer?: string; guests?: number; meet?: boolean; rsvp?: GmailRsvp | null };
}

interface GmailMessageInput {
  from: string;                                // required: a person id
  to: string[];                                // required: person ids or plain addresses
  id?: string;
  at?: number | string;                        // ms or a date string; now by default
  body?: string;                               // blank line = paragraph, "- " list, `code`, *bold*, URLs
  attachments?: string[];                      // file names; the extension picks the icon
  signed?: boolean;                            // add the sender's signature, default true
  custom?: { type: string; data?: unknown };   // drawn by <Gmail renderCustom>
}
```

### What the world can do

All of these are stable across renders.

```ts
gmail.receive(mail: GmailMailInput, o?: { notify?: boolean }): string
  // A new conversation (unread, in the inbox, unless `mail` says otherwise). Returns its id
  // synchronously. The "New message from ..." notice shows by default when it lands in the inbox.
gmail.reply(mailId: string, message: Omit<GmailMessageInput, "to"> & { to?: string[] },
            o?: { delay?: number; notify?: boolean }): Promise<string>
  // A message lands in an existing conversation after `delay` ms; `to` defaults to [me].
  // Moves it to inbox/primary, unread unless on screen, with a notice (notify: false hides it).
  // Resolves with the message id, or "" if the conversation no longer exists.
gmail.modify(id: string, patch: Partial<Pick<GmailMail, "folder" | "tab" | "labels" | "unread" | "starred" | "important">>): void
gmail.open(id: string): void                  // show a conversation, mark it read, fire "open"; a draft opens in compose
gmail.toast(text: string, actions?: NoticeAction[]): void   // NoticeAction = { label: string; run: () => void }
```

Read-only fields: `gmail.state`, `gmail.seed`, `gmail.me`, `gmail.people` (`Record<string, Person>`), `gmail.person(idOrAddress: string): Person` (resolves an id or an address from an event's `to`; unknown addresses come back as `{ name: address, email: address }`), `gmail.notice`. `gmail.ui` is what `<Gmail>` calls for the signed-in person; a world does not need it.

### Events

```ts
type GmailAction = "archive" | "delete" | "spam" | "snooze" | "read" | "unread" | "task";
type GmailView = Exclude<GmailFolder, "archive"> | "starred" | "important" | "all";

type GmailEvent =
  | { type: "send"; id: string; to: string[]; subject: string; body: string }   // id = the new conversation (in "sent")
  | { type: "reply"; mail: string; id: string; to: string[]; body: string }     // inline reply; id = the message
  | { type: "draft"; id: string; to: string[]; subject: string; body: string }
  | { type: "open"; id: string }
  | { type: "action"; action: GmailAction; ids: string[] }
  | { type: "undo"; action: GmailAction | "send" | "reply" | "removeLabel"; ids: string[] }
  | { type: "star"; id: string; starred: boolean }
  | { type: "important"; id: string; important: boolean }
  | { type: "label"; id: string; label: string; added: boolean }
  | { type: "manageLabel"; action: "create" | "rename" | "color" | "remove"; label: string; to?: string; color?: string }
  | { type: "rsvp"; id: string; answer: GmailRsvp }
  | { type: "search"; query: string }
  | { type: "view"; folder: GmailView; label: string | null; tab: GmailTab }
  | { type: "attachment"; mail: string; name: string }
  | { type: "task"; text: string; done: boolean };
```

`to` holds person ids or whatever address was typed; pass each through `gmail.person(...)` to get a name. `send` and `reply` fire at once, and the person can still press Undo afterwards (`undo` with action `"send"` or `"reply"`, `ids` holding the conversation or message id). An undone `send` removes the conversation, so a later `gmail.reply` to it resolves `""` and nothing lands; an undone `reply` does not stop an answer the world already scheduled. To answer a new mail the person composed, reply into `event.id`: the conversation moves from Sent to the inbox with the answer.

### State

`gmail.state` is a `GmailState`: plain JSON (`version: 1`, `view`, `open`, `selected`, `expanded`, `reply`, `compose`, `labels`, `mails`, `tasks`, `side`, `navCollapsed`, `more`, `density`, `pane`, `theme`, `seq`), a new object after every change. Save it, and pass it back as `useGmail(seed, { restore })`; `restore` is read only when the hook first mounts, so load the saved state before rendering the component that calls `useGmail`.

### The component

```ts
interface GmailProps {
  gmail: GmailMailbox;                                    // required: from useGmail
  renderCustom?: (message: GmailMessage) => ReactNode;    // a message's `custom` part, under the body
  className?: string;
  style?: CSSProperties;
}
```

`<Gmail>` fills its parent, so the parent needs a height. It uses the tablet layout under 1100px and the mobile one under 760px of that parent's width.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Gmail, useGmail, type GmailSeed, type GmailState } from "./apps/gmail";

const seed: GmailSeed = {
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.example" },
    priya: { name: "Priya Shah", email: "priya@northwind.example", signature: "Priya Shah\nEngineering lead" },
    billing: { name: "Acme Billing", email: "billing@acme.example" },
  },
  labels: { Clients: "#1a73e8" },
  mails: [
    { id: "contract", subject: "Contract draft for review", unread: true, labels: ["Clients"], messages: [
      { from: "priya", to: ["sam"], at: Date.now() - 3_600_000, body: "Hi Sam,\n\nThe draft is attached. Can you check the payment terms?", attachments: ["Contract v2.pdf"] },
    ] },
  ],
};

export default function Episode() {
  // `restore` is read once, on mount: load the saved state before rendering the mailbox.
  const [saved, setSaved] = useState<GmailState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<GmailState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Mailbox saved={saved} />;
}

function Mailbox({ saved }: { saved: GmailState | null }) {
  const gmail = useGmail(seed, {
    restore: saved,
    async onEvent(event) {
      if (event.type !== "send" && event.type !== "reply") return;
      const to = event.to.map((t) => gmail.person(t));
      void casuro.track.message({ from: "candidate", to: to.map((p) => p.name).join(", "), channel: "email", text: event.body });
      if (!to.some((p) => p.id === "priya")) return;
      const mailId = event.type === "send" ? event.id : event.mail;
      const reply = await casuro.llm(
        [
          { role: "system", content: "You are Priya Shah, engineering lead. Answer this email briefly, plain text, no subject line." },
          { role: "user", content: event.body },
        ],
        { persona: "Priya Shah" },
      );
      await gmail.reply(mailId, { from: "priya", body: reply }, { delay: 4000 });
      void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "email", text: reply });
    },
  });

  // One timed beat: an invoice arrives 40 seconds in (only on a fresh start).
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      gmail.receive({ subject: "Invoice overdue", important: true, messages: [{ from: "billing", to: ["sam"], body: "Invoice #4410 is 30 days overdue. Total due: $12,400.00" }] });
    }, 40_000);
    return () => clearTimeout(t);
  }, [saved, gmail.receive]);

  // Save every change.
  useEffect(() => void casuro.store.set(gmail.state), [gmail.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Gmail gmail={gmail} />
    </div>
  );
}
```

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
