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
