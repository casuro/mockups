# Linear (React)

`apps/linear.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/linear src/apps/linear
```

It needs only React 19. The styles are plain CSS scoped to `.kit-linear`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Inter is embedded, so nothing loads from the network.

## Use

```tsx
import { Linear, useLinear, type LinearSeed } from "./apps/linear";

const seed: LinearSeed = {
  workspace: { name: "Northwind" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera" },
    priya: { name: "Priya Shah" },
  },
  teams: [{ id: "web", name: "Web", key: "WEB" }],
  statuses: [
    { id: "doing", name: "In Progress", type: "started" },
    { id: "todo", name: "Todo", type: "unstarted" },
    { id: "backlog", name: "Backlog", type: "backlog" },
    { id: "done", name: "Done", type: "completed" },
  ],
  labels: { Bug: "#eb5757" },
  projects: { launch: { name: "Spring launch", color: "#4cb782" } },
  issues: [
    { id: "WEB-12", title: "Checkout button overlaps footer on iPad", status: "todo", priority: 2,
      assignee: "priya", labels: ["Bug"], project: "launch", due: "2026-04-02",
      description: "Repro on iPad Air in landscape.\n\n- Open `/cart`\n- Scroll to the bottom" },
  ],
};

function Tracker() {
  const linear = useLinear(seed, {
    onEvent(event) {
      if (event.type === "status") {
        // The person moved event.id from event.from to event.to; react, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Linear linear={linear} />
    </div>
  );
}
```

`<Linear>` fills the box it is in, so give that box a height. It switches to
the mobile layout (the sidebar in a drawer) when the box is under 760px
wide, whatever the window size, so it also works as one pane of a larger
screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `photo` is a
  picture URL, otherwise their initial.
- `teams`, in sidebar order. Each has Issues, Cycles, Projects and Views
  under it; its Issues shows the list of that team's issues. `key` is the
  prefix of new issue ids ("WEB" gives WEB-13).
- `statuses`, in the order the list groups them. `type` draws the icon
  (backlog, unstarted, started, completed) and decides the Active and
  Backlog tabs.
- `labels` (name to color), `projects` and `cycles`, which issues refer to.
- An issue has a `title`, `status`, `priority` (0 none, 1 urgent to 4 low),
  `assignee`, `labels`, `project`, `cycle`, `due` and `created` (ms or a
  date string), a `description` (paragraphs, "- " lists and `code`),
  `subIssues` (other issues' ids) and `activity`: events ("moved from Todo to
  In Progress") and comments, oldest first.
- `inbox`: the count on Inbox.

## Driving it

`useLinear` returns the workspace. The world acts on it through:

| Call | What happens |
| --- | --- |
| `linear.createIssue(issue)` | A new issue appears in its team's list. Returns its id. |
| `linear.updateIssue(id, patch, { by })` | Someone changes any field. With `by`, status, priority and assignee changes also show in the activity. |
| `linear.comment(id, from, text)` | Someone comments. Returns the comment's id. |
| `linear.log(id, entry)` | Any activity line: an event, a comment, or a `custom` one. |
| `linear.notify(text)` | Something lands in the Inbox: its count goes up and the text shows as a toast. |
| `linear.open(id)` / `linear.open(null)` | Show an issue, or the list. |
| `linear.toast(text)` | A notice at the bottom. |

`linear.issue(id)` reads an issue as it is now, and `linear.visible()` the
list as shown. Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "open", id }` | They open an issue (click, Enter, Cmd+K, previous/next). |
| `{ type: "status", id, from, to }` | They change its status from the status menu (click the icon, then pick or press 1-4). |
| `{ type: "priority", id, from, to }` | They change its priority in the properties panel. |
| `{ type: "assignee", id, from, to }` | They change its assignee in the properties panel. |
| `{ type: "comment", id, text, commentId }` | They post a comment (the button, or Cmd+Enter). |
| `{ type: "create", team, status? }` | They press a New issue button or the Cmd+K action. Answer with `createIssue`. |
| `{ type: "navigate", to }` | They pick a sidebar item ("inbox", "mine", "web:cycles") or a tab ("tab:active"). |

Keys: Cmd+K the command menu, j/k or the arrows move the highlight (or the
open issue), Enter opens, Esc closes the menu or the issue.

`linear.state` is everything that changed, as plain JSON: save it, and pass
it back as `useLinear(seed, { restore })` to pick up where they left off.

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-linear.ts` and
`Linear.tsx`. You should not need to open them.

### Imports

```ts
import {
  Linear, useLinear, PRIORITIES,
  type LinearProps, type LinearWorkspace, type LinearOptions, type UpdateOptions, type Person, type Team, type Status,
  type LinearSeed, type LinearState, type LinearEvent, type LinearIssue, type LinearIssueInput, type LinearActivity,
  type LinearActivityInput, type Priority,
} from "./apps/linear";
```

`PRIORITIES` is `["No priority", "Urgent", "High", "Medium", "Low"]`,
indexed by `Priority`. `index.ts` also re-exports every other type in
`types.ts` (`LinearPerson`, `LinearTeam`, `LinearStatus`, `LinearProject`,
`LinearCycle`, `LinearTab`).

### The hook

```ts
function useLinear(seed: LinearSeed, options?: LinearOptions): LinearWorkspace;

interface LinearOptions {
  restore?: LinearState | null;           // a saved `linear.state`; read once, on the first render
  onEvent?: (event: LinearEvent) => void; // everything the signed-in person does
}
```

Keep `seed` stable (a module constant or `useMemo`). The hook throws when
`seed.me` is not in `seed.people`, or `teams` or `statuses` is empty.

### The seed

```ts
type Priority = 0 | 1 | 2 | 3 | 4;       // 0 No priority, 1 Urgent, 2 High, 3 Medium, 4 Low

interface LinearSeed {
  workspace: { name: string; initial?: string }; // required
  me: string;                             // required - signed-in person's id
  people: Record<string, { name: string; photo?: string; initials?: string; color?: string }>; // required; name required
  teams: {                                // required, non-empty, sidebar order
    id: string; name: string;             // required
    color?: string; letter?: string;
    key?: string;                         // new issue id prefix; first 3 letters of the name by default
  }[];
  statuses: {                             // required, non-empty, list group order
    id: string; name: string;             // required
    type: "backlog" | "unstarted" | "started" | "completed"; // required - icon and tab
    color?: string;
  }[];
  labels?: Record<string, string>;        // label name -> dot color
  projects?: Record<string, { name: string; color?: string }>;
  cycles?: Record<string, { name: string; dates?: string }>;
  issues: LinearIssueInput[];             // required (may be [])
  inbox?: number;                         // the count on Inbox
  team?: string;                          // team shown first; the first team by default
  open?: string;                          // an issue id open at the start
  expanded?: string[];                    // teams expanded in the sidebar; the first by default
  theme?: "light" | "dark";
}

interface LinearIssueInput {
  title: string;                          // required
  id?: string;                            // "PLA-912"; team key + next number when left out
  team?: string;                          // team id; the first team by default
  status?: string;                        // status id; the first "unstarted" status by default
  priority?: Priority;                    // 0 by default
  assignee?: string | null;               // person id
  labels?: string[];                      // label names
  project?: string | null;                // project id
  cycle?: string | null;                  // cycle id
  due?: number | string | null;           // ms or "2026-10-02"
  created?: number | string;              // now by default
  creator?: string;                       // who "created the issue"; assignee, else me
  description?: string;                   // paragraphs split by a blank line, "- " lists, `code`
  subIssues?: string[];                   // other issues' ids
  activity?: LinearActivityInput[];       // oldest first; a "created the issue" line by default
}

interface LinearActivityInput {
  kind: "event" | "comment";              // required
  from: string;                           // required - person id
  text: string;                           // required - event words after the name, or the comment
  id?: string;
  at?: number | string;                   // now by default
  custom?: { type: string; data?: unknown }; // drawn by `renderCustom`
}
```

### What the world can do

All functions are stable across renders. A missing issue id throws.

- `createIssue(issue: LinearIssueInput): string` - adds an issue to its team's list and returns its id. Throws if the id exists.
- `updateIssue(id: string, patch: Partial<Omit<LinearIssueInput, "id">>, opts?: { by?: string }): void` - changes `title, team, status, priority, assignee, labels, project, cycle, due, created, description, subIssues` (`activity` and `creator` in a patch are ignored). With `by`, status, priority and assignee changes add an activity line.
- `comment(id: string, from: string, text: string): string` - a comment from `from`; returns its id.
- `log(id: string, entry: LinearActivityInput): string` - any activity line (event, comment, or `custom`); returns its id.
- `notify(text: string): void` - Inbox count +1 and a toast with the text.
- `toast(text: string): void` - a notice at the bottom.
- `open(id: string | null): void` - shows an issue, or the list with `null`. Note: it also fires an `{ type: "open" }` event.
- `issue(id: string): LinearIssue | undefined` - an issue as it is now.
- `visible(): LinearIssue[]` - the list as shown (current team and tab).
- `state: LinearState` - see State.
- Read-only: `seed`, `me`, `people: Record<string, Person>` (`id, name, initials, color, photo?`), `teams: Team[]`, `statuses: Status[]`, `notice`.
- `ui` is what `<Linear>` wires to the signed-in person's clicks. Do not call it from the world.

### Events

```ts
type LinearEvent =
  | { type: "open"; id: string }
  | { type: "status"; id: string; from: string; to: string }      // status ids
  | { type: "priority"; id: string; from: Priority; to: Priority }
  | { type: "assignee"; id: string; from: string | null; to: string | null }
  | { type: "comment"; id: string; text: string; commentId: string }
  | { type: "create"; team: string; status?: string }             // New issue pressed; nothing is created
  | { type: "navigate"; to: string };                             // "inbox", "mine", "web:cycles", "tab:active"...
```

The kit has no New issue form: on `create`, the world must call
`createIssue` itself (and usually `open` it), or nothing happens.

### State

`linear.state` is a `LinearState`: plain JSON (`version: 1`, `issues`,
`nav`, `team`, `tab`, `selected`, `open`, `collapsed`, `expanded`, `inbox`,
`theme`, `seq`). Save it whenever it changes and pass it back as
`useLinear(seed, { restore })`. `restore` is read only on the first render,
and only when `restore.version === 1`, so load the saved state before you
mount the component that calls `useLinear`.

### The component

```ts
interface LinearProps {
  linear: LinearWorkspace;                             // required - what useLinear returned
  renderCustom?: (entry: LinearActivity) => ReactNode; // draws an activity line's `custom`
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height. Under 760px wide it
switches to the mobile layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Linear, useLinear, PRIORITIES, type LinearSeed, type LinearState } from "./apps/linear";

const seed: LinearSeed = {
  workspace: { name: "Northwind" },
  me: "sam",
  people: { sam: { name: "Sam Rivera" }, priya: { name: "Priya Shah" }, leo: { name: "Leo Park" } },
  teams: [{ id: "web", name: "Web", key: "WEB" }],
  statuses: [
    { id: "todo", name: "Todo", type: "unstarted" },
    { id: "doing", name: "In Progress", type: "started" },
    { id: "backlog", name: "Backlog", type: "backlog" },
    { id: "done", name: "Done", type: "completed" },
  ],
  labels: { Bug: "#eb5757" },
  issues: [
    { id: "WEB-12", title: "Checkout button overlaps footer on iPad", status: "todo", priority: 2, assignee: "priya", labels: ["Bug"] },
    { id: "WEB-13", title: "Saved cards list", status: "doing", priority: 3, assignee: "leo" },
  ],
};

// `restore` is read once, so load the saved state before mounting the tracker.
export function Episode() {
  const [saved, setSaved] = useState<LinearState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<LinearState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Tracker saved={saved} />;
}

function Tracker({ saved }: { saved: LinearState | null }) {
  const linear = useLinear(seed, {
    restore: saved,
    onEvent(event) {
      if (event.type === "status") void casuro.track.decision({ summary: `Moved ${event.id} from ${event.from} to ${event.to}` });
      if (event.type === "priority") void casuro.track.decision({ summary: `Set ${event.id} to ${PRIORITIES[event.to]}` });
      if (event.type === "comment") {
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: event.id, text: event.text });
        void answer(event.id, event.text);
      }
      if (event.type === "create") {
        const id = linear.createIssue({ title: "New issue", team: event.team, status: event.status, creator: "sam" });
        linear.open(id);
      }
    },
  });

  // Priya answers every comment the candidate posts.
  async function answer(id: string, text: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: `You are Priya Shah, a frontend engineer. Reply to a Linear comment on "${linear.issue(id)?.title}" in one or two sentences.` },
        { role: "user", content: text },
      ],
      { persona: "Priya Shah" },
    );
    linear.comment(id, "priya", reply);
    void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: id, text: reply });
  }

  // Two minutes in, Priya files an urgent bug (once: a restored state already has it).
  useEffect(() => {
    if (linear.issue("WEB-20")) return;
    const t = setTimeout(() => {
      linear.createIssue({ id: "WEB-20", title: "Checkout returns 502 in EU", team: "web", priority: 1, assignee: "sam", labels: ["Bug"], creator: "priya" });
      linear.notify("Priya Shah assigned you WEB-20");
    }, 120_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => void casuro.store.set(linear.state), [linear.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Linear linear={linear} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Linear.tsx` | The layout, the header, keyboard shortcuts, the drawer, the toast. |
| `Sidebar.tsx` | The workspace, Inbox, My issues, and the teams with their pages. |
| `IssueList.tsx` | The list header with its tabs, the status groups and the issue rows. |
| `IssueDetail.tsx` | An open issue: breadcrumb, description, sub-issues, activity, comment box, properties. |
| `Menus.tsx` | The status, priority and assignee menus, and the Cmd+K command menu. |
| `use-linear.ts` | The state and what changes it. |
| `format.tsx` | Dates and the description. |
| `icons.tsx` | The icons, status and priority icons, and the Linear logo. |
| `linear.css` | The look, from the mockup. |

For an activity line the kit has no part for (a pull request, a deploy, an
attachment), give it `custom: { type, data }` and draw it with
`<Linear renderCustom={(entry) => ...} />`. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=linear` next to `/apps/linear.html`: the same workspace,
drawn by the React version, where a teammate answers your comments and New
issue files one for you.
