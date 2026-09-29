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
