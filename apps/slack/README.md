# Slack (React)

`apps/slack.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/slack src/apps/slack
```

It needs only React 19. The styles are plain CSS scoped to `.kit-slack`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Lato is embedded, so nothing loads from the network.

## Use

```tsx
import { Slack, useSlack, type SlackSeed } from "./apps/slack";

const seed: SlackSeed = {
  workspace: { name: "Northwind" },
  me: "you",
  people: {
    you: { name: "Sam Rivera" },
    priya: { name: "Priya Shah", title: "Engineering lead" },
    alerts: { name: "Datadog", bot: true, color: "#632ca6" },
  },
  channels: [
    { id: "incidents", topic: "Sev-1s only", members: ["priya", "alerts"], messages: [
      { from: "priya", at: Date.now() - 3_600_000, text: "Morning all" },
    ] },
  ],
  dms: [{ with: "priya" }],
  open: { channel: "incidents" },
};

function Workspace() {
  const slack = useSlack(seed, {
    onEvent(event) {
      if (event.type === "send") {
        // The person posted in event.where; answer, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Slack slack={slack} />
    </div>
  );
}
```

`<Slack>` fills the box it is in, so give that box a height. It switches to
Slack's mobile layout when the box is under 760px wide, whatever the window
size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. A `bot` shows
  the APP tag; `photo` is a picture URL, otherwise initials on `color`.
- `channels`, in sidebar order, and `dms`, each with `messages`. `unread`
  marks the last few messages unread; the conversation that opens first
  shows them under a red "New" line.
- A message has `from`, `at` (ms or a date string), and `text` in Slack's
  mrkdwn: `*bold*`, `_italic_`, `~strike~`, `` `code` ``, fenced blocks,
  `@personId` mentions and `#channel` links. It can also carry `reactions`,
  `replies` (a thread), a bot `card` with buttons, a `chart`, a `file`, a
  `link` preview, or a `custom` part you draw yourself.
- `huddles` already running, with who is in them and who is sharing a screen.

## Driving it

`useSlack` returns the workspace. The world acts on it through:

| Call | What happens |
| --- | --- |
| `slack.deliver(where, message, { typing: 1500 })` | Shows the sender typing, then the message lands. Elsewhere, it bumps the unread count; a DM or a mention also shows a toast. Resolves with the message id. |
| `slack.deliver(where, { ...message, thread: id })` | A reply in a thread. |
| `slack.typingIn(where, personId)` / `(where, null)` | Typing, while a reply is being written. |
| `slack.react(messageId, emoji)` | Someone else reacts. |
| `slack.huddle.join(where, personId, { video })` / `.leave(...)` / `.share(...)` / `.speaking([ids])` | Huddles. |
| `slack.open(where)` | Show a conversation. |
| `slack.toast(text)` | A notice at the bottom. |

`where` is `{ channel: "incidents" }` or `{ dm: "priya" }`. Every function is
stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "send", where, text, id, thread? }` | They post a message or a thread reply. |
| `{ type: "open", where }` | They open a conversation. |
| `{ type: "react", id, emoji, added }` | They add or remove a reaction. |
| `{ type: "action", kind, label, id? }` | They press a card button, a bookmark or a link. |
| `{ type: "huddle", action, where }` | They start, join or leave a huddle, or use its controls. |

`slack.state` is everything that changed, as plain JSON: save it, and pass
it back as `useSlack(seed, { restore })` to pick up where they left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Slack.tsx` | The layout, the channel header and intro, the emoji picker, the toast, keyboard shortcuts. |
| `Sidebar.tsx` | The top bar with search, the workspace rail, the sidebar. |
| `Messages.tsx` | The message list, a message, its hover bar, card, chart, file, link preview, reactions, thread summary. |
| `Composer.tsx` | The composer and the thread pane. |
| `Huddle.tsx` | The huddle card, header pill, dock and window. |
| `use-slack.ts` | The state and what changes it. |
| `format.tsx` | mrkdwn and dates. |
| `slack.css` | The look, from the mockup. |

For a message the kit has no part for (a form, an approval, a document),
give it `custom: { type, data }` and draw it with
`<Slack renderCustom={(m) => ...} />`. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=slack` next to `/apps/slack.html`: the same workspace and
demo, drawn by the React version.
