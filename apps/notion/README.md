# Notion (React)

`apps/notion.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/notion src/apps/notion
```

It needs only React 19. The styles are plain CSS scoped to `.kit-notion`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included). Notion's own system font stack is used, as in the mockup, so
there is no font to embed and nothing loads from the network.

## Use

```tsx
import { Notion, useNotion, type NotionSeed } from "./apps/notion";

const seed: NotionSeed = {
  workspace: { name: "Northwind", domain: "northwind.com" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.com" },
    priya: { name: "Priya Shah", email: "priya@northwind.com" },
  },
  teamspaces: [{ id: "ops", name: "Operations", icon: "🧭", color: "blue" }],
  pages: [
    {
      id: "runbook", title: "Incident runbook", icon: "🚨", parent: "ops", by: "priya", presence: ["priya"],
      blocks: [
        { type: "callout", icon: "📌", background: "yellow", text: "Owner @priya. Reviewed @2026-10-01." },
        { type: "h2", text: "When the pager goes off" },
        { type: "number", text: "Acknowledge within **5 minutes**" },
        { type: "number", text: "Open a channel and post the first update" },
        { type: "toggle", text: "Who to call", children: [{ type: "text", text: "@priya, then the platform lead." }] },
        { type: "todo", text: "Review this page every quarter" },
      ],
    },
  ],
  open: "runbook",
};

function Workspace() {
  const notion = useNotion(seed, {
    onEvent(event) {
      if (event.type === "edit") {
        // They wrote in event.block on event.page; read it, react, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Notion notion={notion} />
    </div>
  );
}
```

`<Notion>` fills the box it is in, so give that box a height. It switches to
Notion's mobile layout (the sidebar becomes a drawer) when the box is under
760px wide, whatever the window size, so it also works as one pane of a
larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `photo` is a
  picture URL, otherwise initials on `color`.
- `teamspaces`, each with an emoji and a tile color.
- `pages`, in sidebar order. A page has a `parent`: a teamspace id, another
  page's id (a subpage), or `"private"`. It can have an `icon` (emoji), a
  `cover` (`"blueprint"`, `"nebula"`, any CSS background, or a picture URL),
  who last edited it and when, who is viewing it (`presence`), and who it is
  shared with.
- A page's `blocks` are a tree: `text`, `h1` to `h3`, `bullet`, `number`,
  `todo`, `toggle`, `quote`, `callout`, `divider`, `code`, `table`, `image`,
  `bookmark`, `toc`, `database` (another page's table, inline), `page` (a
  link to a page) and `custom`. Any block can have `children`, drawn
  indented under it; a toggle shows them only while `open`. Blocks can have
  a text `color` and a `background`.
- Text is a small markup: `**bold**`, `*italic*`, `~~strike~~`,
  `` `code` ``, `[label](https://...)`, `[label](color:gray)`,
  `[label](comment:threadId)` (a comment highlight), `@personId`,
  `@2026-10-10` (a date) and `[[pageId]]` (a page mention).
- A page with `database: { properties }` is a database; its rows are the
  pages whose `parent` is it, with their cells in `properties`.
- `favorites`, the page `open` at the start, the `inbox` count, `comments`.

## Driving it

`useNotion` returns the workspace. The world acts on it through:

| Call | What happens |
| --- | --- |
| `notion.updatePage(id, patch)` | Changes a page: title, icon, cover, `by` and `edited`, sharing, or all its `blocks`. |
| `notion.appendBlocks(pageId, blocks, { after, by })` | Blocks land at the end of the page, or after block `after`. Returns their ids. |
| `notion.updateBlock(id, patch)` / `notion.removeBlock(id)` | Changes or removes one block (its children move up). |
| `notion.addPage(page)` | A new page in the sidebar, or a new row when its parent is a database. |
| `notion.setPresence([ids], pageId?)` | Who is viewing a page now; the page on screen by default. |
| `notion.comment({ block, quote }, { from, text })` | Someone comments on words of a block: they get the yellow highlight, and a toast. `{ thread }` adds to a thread. Returns the thread id. |
| `notion.open(id)` | Show a page. |
| `notion.toast(text)` | A notice at the bottom. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "open", page }` | They open a page. |
| `{ type: "edit", page, block, text, cell? }` | They pause typing in a block (or a table cell, or a caption). `text` is in the markup. |
| `{ type: "rename", page, title }` | They pause typing in the title. |
| `{ type: "insert", page, block, blockType, after }` | Enter, the "/" menu or the gutter's + adds a block. |
| `{ type: "turn-into", page, block, from, to }` | The "/" menu or a markdown shortcut (`# `, `- `, `1. `, `[] `, `> `, `" `, `---`) changes a block. |
| `{ type: "delete", page, block }` | Backspace in an empty block removes it. |
| `{ type: "todo", page, block, checked }` | They tick or untick a to-do. |
| `{ type: "toggle", page, block, open }` | They open or close a toggle. |
| `{ type: "share", page, action: "invite", email }` / `action: "copy-link", url` | They invite someone (only at `workspace.domain`, when set) or copy the link. |
| `{ type: "favorite", page, on }` | They star or unstar the page. |
| `{ type: "comment", page, thread }` | They click a comment highlight (the kit toasts its latest comment). |
| `{ type: "action", name, page, id? }` | Anything the kit only draws: "Search", "Add cover", "Board view", "Open row", "Open link"... |

`notion.state` is everything that changed, as plain JSON: save it, and pass
it back as `useNotion(seed, { restore })` to pick up where they left off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Notion.tsx` | The layout, popovers, toasts, keyboard shortcuts (⌘\\ sidebar, ⌘⇧L theme, Esc). |
| `Sidebar.tsx` | The sidebar with its page trees, and the workspace menu. |
| `TopBar.tsx` | Breadcrumbs, edited time, presence, the share popover, the favorite star. |
| `Page.tsx` | The cover, icon and title, and the page body. |
| `Blocks.tsx` | Every block, and the contenteditable they are typed in. |
| `Editor.tsx` | Enter, Backspace, the "/" menu and markdown shortcuts. |
| `Database.tsx` | A database's table view. |
| `use-notion.ts` | The state and what changes it. |
| `format.ts` | The text markup both ways, dates, code highlighting, the caret. |
| `notion.css` | The look, from the mockup. |

For a block the kit has no part for (an embed, a chart, a form), give it
`{ type: "custom", kind, data }` and draw it with
`<Notion renderBlock={(block) => ...} />`. For anything else, edit the
files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=notion` next to `/apps/notion.html`: the same workspace,
drawn by the React version. The preview puts the workspace on
`window.notion`, to try the world calls from the console.
