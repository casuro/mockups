# Microsoft Teams (React)

`apps/teams.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/teams src/apps/teams
```

It needs only React 19. The styles are plain CSS scoped to `.kit-teams`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included). The type is the system's Segoe UI stack, as in the mockup, so
there is no font to embed and nothing loads from the network.

## Use

```tsx
import { Teams, useTeams, type TeamsSeed } from "./apps/teams";

const seed: TeamsSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera", title: "Support lead" },
    priya: { name: "Priya Shah", title: "Engineering lead", presence: "busy", note: "In a meeting" },
    omar: { name: "Omar Haddad", presence: "away" },
  },
  chats: [
    { with: "priya", unread: 1, messages: [{ from: "priya", at: Date.now() - 600_000, text: "Got a minute?" }] },
    { id: "oncall", name: "On-call", members: ["you", "priya", "omar"] },
  ],
  teams: [
    { id: "eng", name: "Engineering", members: ["you", "priya", "omar"], channels: [
      { id: "general", name: "General", messages: [
        { from: "omar", subject: "Deploy freeze", text: "No deploys after *4pm* today.", replies: [{ from: "priya", text: "Noted" }] },
      ] },
    ] },
  ],
};

function Workplace() {
  const teams = useTeams(seed, {
    onEvent(event) {
      if (event.type === "send") {
        // The person wrote in event.where; answer, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Teams teams={teams} />
    </div>
  );
}
```

`<Teams>` fills the box it is in, so give that box a height. It switches to
Teams' mobile layout (the app bar at the bottom, the list or the
conversation) when the box is under 760px wide, whatever the window size, so
it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `presence`
  is the dot (available, busy, away, offline, oof) and `note` the line under
  the name; `photo` is a picture URL (and the camera feed in a meeting),
  otherwise initials on `color`.
- `chats`, in list order: one-on-one (`with`) or group (`id`, `name`,
  `members`), `pinned` or not, each with `messages` and `unread`.
- `teams`, each with `channels` of posts. A post can have a `subject` and
  `replies`; the last two replies show, the rest behind a toggle.
- A message has `from`, `at` (ms or a date string) and `text` with `*bold*`,
  `` `code` ``, fenced blocks, `@personId` mentions and bare URLs. It can
  carry `reactions`, a `file`, a `call` line ("Missed call", "Call ended
  4m 12s") or a `custom` part you draw yourself.
- `meetings` already running in a conversation: who is in, cameras,
  mutes, raised hands, who is presenting, the meeting chat so far.
- `activity` (the feed), this week's `events`, `speedDial` and `calls`
  (the Calls view), `files` (OneDrive), `calendars`, and where it `open`s.

## Driving it

`useTeams` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `teams.deliver(where, message, { typing: 1500 })` | Shows the sender typing, then the message (or, in a channel, the post) lands. Elsewhere it bumps the unread count, and a chat message or a mention shows a toast. Resolves with its id. |
| `teams.post({ team, channel }, post)` | A new post in a channel. |
| `teams.reply(postId, message, { typing })` | A reply to a channel post. |
| `teams.typingIn(where, personId)` / `(where, null)` | Typing, while a reply is being written. |
| `teams.react(messageId, emoji)` | Someone else reacts. |
| `teams.notify(item)` | A new item at the top of Activity. |
| `teams.setPresence(personId, "busy", "Presenting")` | Someone's presence changes. |
| `teams.meeting.start(where, personId, { title })` | Someone starts a meeting (the card in a channel, the call line in a chat). |
| `teams.meeting.join(m, personId, { video, muted })` / `.decline(m, personId)` / `.leave(m, personId)` / `.end(m)` | People pick up a call (or don't), come and go. A call nobody answers ends as "No answer". |
| `teams.meeting.raiseHand(m, personId, raised)` / `.share(m, personId, title)` / `.set(m, personId, { video, muted })` | Hands, presenting, cameras and mics. |
| `teams.meeting.say(m, personId, text)` / `.react(m, personId, emoji)` / `.speaking([ids])` | The meeting chat, a floating reaction, who is talking. |
| `teams.open(where)` / `teams.show(view)` | Show a conversation, or a view of the app bar. |
| `teams.toast(text)` | A notice at the bottom. |

`where` is `{ chat: "priya" }` or `{ team: "eng", channel: "general" }`. A
meeting `m` is the conversation it runs in, or the meeting's id from an
event. Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "send", where, text, id, subject? }` | They send a chat message or start a post. |
| `{ type: "reply", where, post, text, id }` | They reply to a post. |
| `{ type: "react", id, emoji, added }` | They add or remove a reaction. |
| `{ type: "open", where }` / `{ type: "view", view }` | They open a conversation, or switch view. |
| `{ type: "meeting", action, meeting, where, emoji?, text? }` | They start a call or meeting, join, leave, turn the mic or camera on or off, present, raise a hand, react, or write in the meeting chat. |
| `{ type: "action", kind, label }` | They open a file, a calendar event, an app or a link. |

`teams.state` is everything that changed, as plain JSON: save it, and pass
it back as `useTeams(seed, { restore })` to pick up where they left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Teams.tsx` | The layout, the emoji picker, the toast, keyboard shortcuts (⌘E search, ⌘⇧M mute, Esc). |
| `Frame.tsx` | The title bar with search, the app bar, and each view's list pane. |
| `Chat.tsx` | A chat: its header and call buttons, bubbles, call lines, reactions, files. |
| `Channel.tsx` | A channel: posts, replies, the Reply box, the meeting card. |
| `Composer.tsx` | The composer, the feed that follows new messages, the Join button. |
| `Meeting.tsx` | The pre-join screen, the meeting window with its panels, the compact window. |
| `Views.tsx` | Activity, the week calendar, call history, OneDrive, Apps. |
| `use-teams.ts` | The state and what changes it. |
| `format.tsx` | Message text and times. |
| `teams.css` | The look, from the mockup. |

For a message the kit has no part for (a form, an approval, a card), give
it `custom: { type, data }` and draw it with
`<Teams renderCustom={(m) => ...} />`. What someone presents in a meeting is
a design file on a canvas by default; draw your own with
`<Teams renderScreen={(meeting) => ...} />`. For anything else, edit the
files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=teams` next to `/apps/teams.html`: the same organization and
demo, drawn by the React version.
