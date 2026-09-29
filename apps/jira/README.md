# Jira (React)

`apps/jira.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/jira src/apps/jira
```

It needs only React 19. The styles are plain CSS scoped to `.kit-jira`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included). The font is the system stack the mockup uses (Atlassian Sans when
installed), so nothing loads from the network.

## Use

```tsx
import { Jira, useJira, type JiraSeed } from "./apps/jira";

const seed: JiraSeed = {
  site: "northwind",
  project: { key: "NW", name: "Northwind Web" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", role: "Engineering Manager" },
    priya: { name: "Priya Shah", role: "Backend Engineer" },
  },
  sprints: [{ id: "s7", name: "NW Sprint 7", start: "2026-09-21", end: "2026-10-02", state: "active", goal: "Fix checkout" }],
  issues: [
    { key: "NW-10", type: "epic", summary: "Checkout", color: "orange" },
    { key: "NW-12", type: "bug", summary: "Payment retries time out", status: "inprogress", assignee: "priya",
      priority: "high", points: 3, sprint: "s7", epic: "NW-10", labels: ["checkout"],
      subtasks: [{ summary: "Add backoff", assignee: "priya" }],
      comments: [{ from: "priya", text: "@Sam Rivera can you review?" }] },
    { type: "task", summary: "Runbook for the payment worker" },
  ],
};

function Tracker() {
  const jira = useJira(seed, {
    onEvent(event) {
      if (event.type === "transition" && event.to === "done") {
        // They finished event.key; react, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Jira jira={jira} />
    </div>
  );
}
```

`<Jira>` fills the box it is in, so give that box a height. It switches to
Jira's phone layout (the sidebar becomes a drawer, one column at a time, the
issue full screen) when the box is under 760px wide, whatever the window
size, so it also works as one pane of a larger screen. Pass a seed that does
not change between renders (a constant, or `useMemo`).

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `photo` is a
  picture URL, otherwise initials on `color`; `role` shows in pickers.
- `project`: its key (the issue prefix), name and board name; `site` makes
  links (`<site>.atlassian.net/browse/KEY`).
- `statuses`: the workflow and board columns (To Do, In Progress, In Review,
  Done by default). The last one is done; `limit` is a column limit.
- `sprints`: one `active` (the board), `future` ones (the backlog), `closed`
  ones. `versions` are the Fix versions.
- `issues`, in rank order: `type` (story, bug, task, epic, subtask),
  `summary`, `status`, `assignee`, `reporter`, `priority`, `points`,
  `labels`, `sprint`, `epic` (its epic's key), `flagged`, a `description` in
  a small HTML subset, `subtasks`, `comments` ("@Full Name" mentions),
  `history`, `worklog`, `links`, `watchers` and a `dev` panel (branch,
  commits, pull request). An epic has a `color`. Keys are numbered for you
  when left out.
- `notifications` in the bell, `recent` issues for search, the page and issue
  `open` at the start, and `now`: what time it is when the app opens, for
  "5 minutes ago" and the days left in the sprint.

## Driving it

`useJira` returns the project. The world acts on it through:

| Call | What happens |
| --- | --- |
| `jira.createIssue(issue, { by, top })` | Someone files an issue (in a sprint, the backlog, or as a subtask with `parent`). Returns its key. |
| `jira.updateIssue(key, patch, { by })` | Someone changes fields: summary, status, assignee, priority, points, labels, sprint, epic, flagged, description, dev... With `by`, each change shows in the issue's history. |
| `jira.transition(key, status, { by })` | Someone moves an issue to another status (column). |
| `jira.comment(key, from, text)` | A comment lands. One that @mentions the signed-in person, or is on an issue they watch, also rings the bell. Returns its id. |
| `jira.notify({ from, verb, key, quote?, change? })` | A notification lands in the bell. |
| `jira.toast(title, body?)` / `jira.flag({ type, title, body, actions })` | A flag at the bottom left; `actions` are links that run your code. |
| `jira.open(key)` / `jira.open(null)` | Show an issue, or close it. |
| `jira.show(view)` | Show a page: `"board"`, `"backlog"`, `"list"`, or one drawn by `renderPage`. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "transition", key, from, to }` | They drag a card to another column, or pick a status. |
| `{ type: "assign", key, from, to }` | They change the assignee (picker, "Assign to me", a swimlane). |
| `{ type: "edit", key, field, from, to }` | They change another field: summary, description, priority, points, sprint, epic, labels, fix versions, reporter, flag. |
| `{ type: "rank", key, before, after }` | They drop an issue between two others. |
| `{ type: "create", key, issue }` | They create an issue (dialog, inline, child, clone). |
| `{ type: "comment", key, id, text, action }` | They add, edit or delete a comment. |
| `{ type: "open", key }` / `{ type: "close", key }` | They open or close an issue. |
| `{ type: "view", view }` | They go to another page. |
| `{ type: "sprint", action, sprint, moveTo? }` | They start, edit, complete, create or delete a sprint. |
| `{ type: "link", key, other, link, added }`, `{ type: "watch", ... }`, `{ type: "log", ... }`, `{ type: "delete", key }` | Links, watching, logged work, deleting. |
| `{ type: "action", kind, label, key? }` | A button the kit has no behaviour for: Insights, Attach, a menu item, a sidebar page, the Development links. Answer it with a toast, or do the real thing. |

`jira.state` is everything that changed, as plain JSON: save it, and pass it
back as `useJira(seed, { restore })` to pick up where they left off.

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-jira.ts` and
`Jira.tsx`. You should not need to open them.

### Imports

```ts
import {
  Jira, useJira,
  type JiraProps, type JiraProject, type JiraOptions, type ByOptions, type IssuePatch, type FlagInput, type Person, type Status,
  type JiraSeed, type JiraState, type JiraEvent, type JiraIssue, type JiraIssueInput, type JiraView, type JiraField,
} from "./apps/jira";
```

`index.ts` also re-exports every other type in `types.ts` (`JiraPerson`,
`JiraStatus`, `JiraSprintInput`, `JiraCommentInput`, `JiraNotificationInput`,
`IssueType`, `Priority`, `When`...).

### The hook

```ts
function useJira(seed: JiraSeed, options?: JiraOptions): JiraProject;

interface JiraOptions {
  restore?: JiraState | null;          // a saved `jira.state`; read once, on the first render
  onEvent?: (event: JiraEvent) => void; // everything the signed-in person does
}
```

Keep `seed` stable (a module constant or `useMemo`). `seed.me` must be a key
of `seed.people`, or the hook throws.

### The seed

```ts
type When = number | string;          // ms timestamp, or "2026-09-21T09:00"
type IssueType = "story" | "bug" | "task" | "epic" | "subtask";
type Priority = "highest" | "high" | "medium" | "low" | "lowest";
type JiraView = "board" | "backlog" | "list" | "timeline" | "reports" | "components" | "code" | "releases" | "pages" | "yourwork";

interface JiraSeed {
  site: string;                        // required - "casuro" -> casuro.atlassian.net
  project: {                           // required
    key: string;                       // required - issue prefix, "CAS"
    name: string;                      // required
    kind?: string;                     // "Software project"
    board?: string;                    // "CAS board" by default
    avatar?: string;                   // picture URL
    color?: string;
  };
  me: string;                          // required - signed-in person's id
  people: Record<string, JiraPerson>;  // required
  statuses?: JiraStatus[];             // columns in order; default todo, inprogress, review, done. The last is "done".
  sprints: JiraSprintInput[];          // required (may be [])
  versions?: { id: string; name: string; date?: When; released?: boolean }[];
  labels?: string[];                   // offered in pickers besides those on issues
  issues: JiraIssueInput[];            // required - rank order, epics and subtasks included
  notifications?: JiraNotificationInput[];
  recent?: string[];                   // recently viewed issue keys
  open?: { view?: JiraView; issue?: string }; // page on screen at the start, and an issue open over it
  now?: When;                          // the app's clock at open; ticks on from there
  theme?: "light" | "dark";
}

interface JiraPerson { name: string; email?: string; role?: string; photo?: string; color?: string } // name required
interface JiraStatus { id: string; name: string; tone?: "todo" | "inprogress" | "review" | "done"; limit?: number }
interface JiraSprintInput { id: string; name: string; start?: When; end?: When; state: "active" | "future" | "closed"; goal?: string }

interface JiraIssueInput {
  type: IssueType;                     // required
  summary: string;                     // required
  key?: string;                        // "CAS-912"; next free number when left out
  status?: string;                     // a status id; the first status by default
  assignee?: string | null;            // person id; null = Unassigned
  reporter?: string;                   // person id; the signed-in person by default (seed) or `by` (createIssue)
  priority?: Priority;                 // "medium" by default
  points?: number | null;
  labels?: string[];
  sprint?: string | null;              // sprint id; backlog when left out
  epic?: string | null;                // parent epic's key
  parent?: string | null;              // a subtask's parent key
  flagged?: boolean;
  fixVersions?: string[];              // version ids
  description?: string;                // HTML subset: <p> <h3> <ul>/<ol>/<li> <strong> <em> <code> <pre>; plain text = one paragraph
  comments?: { id?: string; from: string; at?: When; text: string; edited?: boolean }[]; // "@Full Name" mentions
  history?: { by: string; field: string; from?: string; to?: string; at?: When }[];
  worklog?: { by: string; minutes: number; text?: string; at?: When }[];
  links?: { type: string; key: string }[]; // type: "blocks", "is blocked by", "relates to"...
  watchers?: string[];                 // reporter and assignee by default
  created?: When;
  updated?: When;
  dev?: { branch: string; commits: number; lastCommit?: number; pr?: { num: number; state: "open" | "merged"; title: string } };
  color?: "purple" | "orange" | "lime" | "blue"; // epics only
  subtasks?: Omit<JiraIssueInput, "type" | "subtasks">[];
  archived?: boolean;                  // done in an earlier sprint: Issues list only
  custom?: { type: string; data?: unknown }; // drawn by `renderCustom`
}

interface JiraNotificationInput {
  from: string; verb: string; key: string; // required; verb: "mentioned you on", "commented on", "changed the status of", "assigned you"
  id?: string; quote?: string; change?: [string, string]; at?: When; read?: boolean;
  tab?: "direct" | "watching";         // "direct" by default
}
```

### What the world can do

All functions are stable across renders. A missing issue key throws.

- `createIssue(issue: JiraIssueInput, opts?: { by?: string; top?: boolean }): string` - files an issue and returns its key. `top` ranks it first. `parent` makes a subtask. Only the seed reads `comments`, `history`, `worklog`, `created`, `updated` and `archived`; here they are ignored (add comments with `comment` afterwards). Throws if `key` already exists.
- `updateIssue(key: string, patch: IssuePatch, opts?: { by?: string }): void` - changes fields. `IssuePatch` is a partial of `summary, status, assignee, reporter, priority, points, labels, sprint, epic, flagged, fixVersions, description, dev, links, watchers, custom`. With `by`, each change adds a history line.
- `transition(key: string, status: string, opts?: { by?: string }): void` - moves an issue to a status id.
- `comment(key: string, from: string, text: string, opts?: { notify?: boolean }): string` - adds a comment as `from`, returns its id. It rings the bell when it @mentions the signed-in person or they watch the issue; `notify: true` forces that, `notify: false` stops it.
- `notify(n: JiraNotificationInput): string` - a notification in the bell; returns its id.
- `toast(title: string, body?: string): void` - a blue info flag at the bottom left.
- `flag(f: { type?: "success" | "info" | "warning" | "error"; title: string; body?: string; actions?: { label: string; run: () => void }[] }): number` - a flag with action links; returns its id. `type` is "success" by default.
- `open(key: string | null): void` - shows an issue, or closes it with `null`.
- `show(view: JiraView): void` - goes to a page.
- `state: JiraState` - see State.
- Read-only helpers: `seed`, `me`, `people: Record<string, Person>` (normalized: `id, name, email, role, photo?, color, initials`), `statuses: Status[]`, `flags`, `now(): number` (the app clock), `pname(id: string | null | undefined): string`, `statusName(id: string): string`.
- `ui` is what `<Jira>` wires to the signed-in person's clicks. Do not call it from the world.

### Events

`onEvent` gets only what the signed-in person does, never the world's own calls.

```ts
type JiraEvent =
  | { type: "open"; key: string }
  | { type: "close"; key: string }
  | { type: "view"; view: JiraView }
  | { type: "transition"; key: string; from: string; to: string }          // status ids
  | { type: "assign"; key: string; from: string | null; to: string | null } // person ids
  | { type: "edit"; key: string; field: JiraField; from: unknown; to: unknown }
  | { type: "rank"; key: string; before: string | null; after: string | null }
  | { type: "create"; key: string; issue: JiraIssue }
  | { type: "delete"; key: string }
  | { type: "comment"; key: string; id: string; text: string; action: "add" | "edit" | "delete" }
  | { type: "link"; key: string; other: string; link: string; added: boolean }
  | { type: "watch"; key: string; watching: boolean }
  | { type: "log"; key: string; minutes: number }
  | { type: "sprint"; action: "start" | "edit" | "complete" | "create" | "delete"; sprint: string; moveTo?: string | null }
  | { type: "action"; kind: string; label: string; key?: string }; // buttons with no behaviour ("copy-link", "create-branch"...)

type JiraField = "assignee" | "reporter" | "priority" | "points" | "sprint" | "epic" | "labels" | "fixVersions" | "summary" | "description" | "flagged";
```

### State

`jira.state` is a `JiraState`: plain JSON (`version: 1`, `view`, `open`,
`issues` by key, `order`, `sprints`, `notifications`...). Save it whenever it
changes and pass it back as `useJira(seed, { restore })`. `restore` is read
only on the first render, and only when `restore.version === 1`, so load the
saved state before you mount the component that calls `useJira`.

### The component

```ts
interface JiraProps {
  jira: JiraProject;                                  // required - what useJira returned
  renderCustom?: (issue: JiraIssue) => ReactNode;     // draws `issue.custom` under the description
  renderPage?: (view: JiraView) => ReactNode;         // draws timeline, reports, code...
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height. Under 760px wide it
switches to the phone layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Jira, useJira, type JiraSeed, type JiraState } from "./apps/jira";

const seed: JiraSeed = {
  site: "northwind",
  project: { key: "NW", name: "Northwind Web" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", role: "Engineering Manager" },
    priya: { name: "Priya Shah", role: "Backend Engineer" },
    leo: { name: "Leo Park", role: "Frontend Engineer" },
  },
  sprints: [{ id: "s7", name: "NW Sprint 7", start: "2026-09-21", end: "2026-10-02", state: "active", goal: "Fix checkout" }],
  issues: [
    { key: "NW-10", type: "epic", summary: "Checkout" },
    { key: "NW-12", type: "bug", summary: "Payment retries time out", status: "inprogress", assignee: "priya",
      priority: "high", points: 3, sprint: "s7", epic: "NW-10" },
    { key: "NW-13", type: "story", summary: "Show saved cards", assignee: "leo", points: 5, sprint: "s7", epic: "NW-10" },
  ],
};

// `restore` is read once, so load the saved state before mounting the tracker.
export function Episode() {
  const [saved, setSaved] = useState<JiraState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<JiraState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Tracker saved={saved} />;
}

function Tracker({ saved }: { saved: JiraState | null }) {
  const jira = useJira(seed, {
    restore: saved,
    onEvent(event) {
      if (event.type === "transition")
        void casuro.track.decision({ summary: `Moved ${event.key} from ${jira.statusName(event.from)} to ${jira.statusName(event.to)}` });
      if (event.type === "assign")
        void casuro.track.decision({ summary: `Assigned ${event.key} to ${jira.pname(event.to)}` });
      if (event.type === "comment" && event.action === "add") {
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: event.key, text: event.text });
        void answer(event.key, event.text);
      }
    },
  });

  // Priya answers every comment the candidate leaves.
  async function answer(key: string, text: string) {
    const issue = jira.state.issues[key];
    const reply = await casuro.llm(
      [
        { role: "system", content: `You are Priya Shah, a backend engineer. Reply to a Jira comment on ${key} "${issue?.summary}" in one or two sentences.` },
        { role: "user", content: text },
      ],
      { persona: "Priya Shah" },
    );
    jira.comment(key, "priya", reply);
    void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: key, text: reply });
  }

  // Two minutes in, Priya files a blocker (once: a restored state already has it).
  useEffect(() => {
    if (jira.state.issues["NW-20"]) return;
    const t = setTimeout(() => {
      jira.createIssue(
        { key: "NW-20", type: "bug", summary: "Checkout returns 502 in EU", priority: "highest", sprint: "s7", epic: "NW-10", flagged: true },
        { by: "priya", top: true },
      );
      jira.comment("NW-20", "priya", "@Sam Rivera this is blocking the release, who should pick it up?");
    }, 120_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => void casuro.store.set(jira.state), [jira.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Jira jira={jira} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Jira.tsx` | The layout, popovers, dialogs, flags, keyboard shortcuts. |
| `TopNav.tsx` | The top bar: menus, Create, search, notifications, help, settings, profile. |
| `Sidebar.tsx` | The project sidebar. |
| `Board.tsx` | The sprint board: filter bar, columns, swimlanes, cards, card menu, inline create. |
| `Backlog.tsx` | The sprints and the backlog. |
| `IssueList.tsx` | The Issues list with filters, JQL and sorting. |
| `Issue.tsx` | An issue, as a dialog or a full page: summary, description, child and linked issues. |
| `Activity.tsx` | Its activity: comments with @-mentions, history, work log. |
| `Details.tsx` | Its status button and Details fields with their pickers. |
| `Dialogs.tsx` | Create issue, start or edit a sprint, complete sprint, confirm, shortcuts. |
| `dnd.ts` | Dragging cards and rows. |
| `use-jira.ts` | The state and what changes it. |
| `format.tsx` | Dates, descriptions and mentions. |
| `jira.css` | The look, from the mockup. |

For content the kit has no field for (a form, an approval, a checklist),
give the issue `custom: { type, data }` and draw it under the description
with `<Jira renderCustom={(issue) => ...} />`. The pages the kit does not
draw (Timeline, Reports, Components, Code, Releases, Project pages, Your
work) show their title; draw them with `<Jira renderPage={(view) => ...} />`.
For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=jira` next to `/apps/jira.html`: the same project and demo,
drawn by the React version.
