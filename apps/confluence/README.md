# Confluence (React)

`apps/confluence.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/confluence src/apps/confluence
```

It needs only React 19. The styles are plain CSS scoped to `.kit-confluence`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). Like the mockup, it uses the system font stack, so
there is no font to embed and nothing loads from the network.

## Use

```tsx
import { Confluence, useConfluence, type ConfluenceSeed } from "./apps/confluence";

const seed: ConfluenceSeed = {
  space: { name: "Platform", site: "Northwind" },
  me: "you",
  people: {
    you: { name: "Sam Rivera" },
    priya: { name: "Priya Shah" },
  },
  issues: { "NW-42": { summary: "Rotate API keys", status: "In Progress", color: "blue" } },
  pages: [
    { id: "runbooks", title: "Runbooks", children: [
      {
        id: "keys",
        title: "Key rotation",
        author: "priya",
        updated: "2026-09-20",
        blocks: [
          { type: "panel", tone: "info", text: "Owner: @priya. Status: {status:Draft|blue}" },
          { type: "heading", text: "Steps" },
          { type: "tasks", items: [{ text: "Generate the new key", done: true }, { text: "Roll it out, tracked in {jira:NW-42}" }] },
        ],
        comments: [{ from: "priya", at: "2026-09-21", text: "@you can you review this?" }],
      },
    ] },
  ],
  open: "keys",
};

function Wiki() {
  const confluence = useConfluence(seed, {
    onEvent(event) {
      if (event.type === "comment") {
        // The person commented on event.pageId; answer, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Confluence confluence={confluence} />
    </div>
  );
}
```

`<Confluence>` fills the box it is in, so give that box a height. It hides
"On this page" when the box is under 1100px wide and switches to the mobile
layout, with the sidebar as a drawer, under 760px, whatever the window size,
so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `space`: its name, and the site under it. `me` is the signed-in person's
  id; `people` is everyone, by id, with a `photo` URL or initials on `color`.
- `pages`: the page tree, in sidebar order, each with its `children`. A page
  has a `title`, an `author`, when it was `updated`, and `blocks`; the read
  time is worked out from the words unless you give `readTime`. It can also
  carry `likes` (person ids), emoji `reactions`, `comments` and `starred`.
  The breadcrumbs are the space and the page's parents.
- `blocks`, one after another: `heading` (level 2 ones list under "On this
  page"), `paragraph`, `list`, `panel` (info, note, warning, success),
  `table`, `code` (with line numbers; `language: "sql"` colors keywords),
  `tasks` (a checklist) and `custom`.
- Every text is rich text: `*bold*`, `` `code` ``, `@personId` mentions,
  `[[pageId]]` or `[[pageId|label]]` links, `{status:Done|green}` lozenges
  (grey, blue, green, yellow) and `{jira:KEY}` smart links to `issues`.
- `open` is the page on screen at the start, `expanded` the tree nodes shown
  open, `notifications` the count on the bell.

## Driving it

`useConfluence` returns the space. The world acts on it through:

| Call | What happens |
| --- | --- |
| `confluence.addComment(pageId, from, text)` | A comment lands under the page. When it is from someone else, a toast says so. Returns its id. |
| `confluence.updatePage(pageId, { title, blocks, ... })` | The page changes; "Last updated" moves to now unless `updated` is given. |
| `confluence.addPage(page, parentId?)` | A new page in the tree, last under its parent (or at the top). |
| `confluence.like(pageId, personId, liked?)` | Someone likes the page, or stops. |
| `confluence.react(pageId, emoji)` | Someone adds to an emoji reaction. |
| `confluence.notify(count)` | The count on the bell. |
| `confluence.open(pageId)` | Show a page, opening its parents in the tree. |
| `confluence.toast(text)` | A notice at the bottom. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "open", pageId }` | They open a page from the tree, a link, a breadcrumb or search. |
| `{ type: "like", pageId, liked }` | They like the page, or unlike it. |
| `{ type: "react", pageId, emoji, added }` | They add or remove an emoji reaction. |
| `{ type: "comment", pageId, text, id }` | They save a comment (Save, or Cmd/Ctrl+Enter). |
| `{ type: "check", pageId, block, item, text, done }` | They tick or untick a checklist item. |
| `{ type: "star", pageId, starred }` | They star or unstar the page. |
| `{ type: "search", query }` | They search; the first page whose title matches opens. |
| `{ type: "action", kind, pageId?, id? }` | They press Edit, Share, More, Create, a menu, a Jira link (`id` is its key), or Reply / Like on a comment (`id` is the comment). |

`confluence.state` is everything that changed, as plain JSON: save it, and
pass it back as `useConfluence(seed, { restore })` to pick up where they
left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Confluence.tsx` | The layout, the mobile drawer, the toast. |
| `Sidebar.tsx` | The top nav with search, and the space sidebar with its page tree. |
| `Page.tsx` | The page: breadcrumbs, actions, title, byline, "On this page". |
| `Blocks.tsx` | The content blocks: panels, table, code, checklist. |
| `Comments.tsx` | Like and reactions, the comments, the comment box. |
| `use-confluence.ts` | The state and what changes it. |
| `format.tsx` | Rich text, read time and dates. |
| `confluence.css` | The look, from the mockup. |

For content the kit has no block for (a chart, an embed, a form), give the
page a `{ type: "custom", kind, data }` block and draw it with
`<Confluence renderBlock={(block, page) => ...} />`. For anything else, edit
the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=confluence` next to `/apps/confluence.html`: the same space and
pages, drawn by the React version. Comment on a page and its author answers.
