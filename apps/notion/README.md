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

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-notion.ts` and
`Notion.tsx`; you should not need to open them.

### Imports

```ts
import {
  Notion, useNotion,
  type NotionProps, type NotionWorkspace, type NotionOptions, type PagePatch, type CommentTarget, type Person,
  type NotionSeed, type NotionState, type NotionEvent, type NotionPerson, type NotionTeamspace,
  type NotionPageSeed, type NotionPage, type NotionBlockInput, type NotionBlock, type NotionBlockData, type NotionBlockType,
  type NotionProperty, type NotionValue, type NotionShare, type NotionComment, type NotionColor, type NotionSketch,
  type RichText, type CodeLanguage,
} from "./apps/notion";
```

### The hook

```ts
function useNotion(seed: NotionSeed, options?: NotionOptions): NotionWorkspace;

interface NotionOptions {
  restore?: NotionState | null;            // a saved `notion.state`; read on the first render only
  onEvent?: (event: NotionEvent) => void;  // what the signed-in person does
}
```

`restore` is used only when its `version` is `1`; otherwise the seed is used.
`onEvent` is read through a ref, so an inline function is fine. It throws if
`seed.me` is not a key of `seed.people`. Keep the seed at module level (or in
`useMemo`): `people` and `teamspaces` are recomputed whenever the seed object
changes.

### The seed

```ts
interface NotionSeed {
  workspace: {                             // required
    name: string;                          // required
    initial?: string;
    plan?: string;                         // "Business Plan · 6 members"
    domain?: string;                       // only emails here can be invited; anyone when missing
    url?: string;                          // page links are url + "/" + page id; "https://www.notion.so/<name>" by default
  };
  me: string;                              // required: a key of `people`
  people: Record<string, NotionPerson>;    // required
  teamspaces?: NotionTeamspace[];
  pages: NotionPageSeed[];                 // required: every page, in sidebar order
  favorites?: string[];                    // page ids
  comments?: Record<string, NotionComment[]>;  // threads by id, for [text](comment:id) highlights
  open?: string;                           // page on screen at the start; the first page by default
  inbox?: number;                          // the count on Inbox
  theme?: "light" | "dark";
}

interface NotionPerson { name: string; email?: string; photo?: string; initials?: string; color?: string }  // name required
interface NotionTeamspace { id: string; name: string; icon: string; color?: NotionColor }                // icon is an emoji
interface NotionComment { from: string; text: string; at?: number | string }                           // from: a person id

interface NotionPageSeed {
  id: string;                              // required
  title?: string;
  icon?: string;                           // an emoji
  cover?: string;                          // "blueprint" | "nebula" | any CSS background | a picture URL
  coverY?: number;                         // 0-100, default 50
  parent?: string;                         // a teamspace id, a page id (subpage, or a row of a database page), or "private" (default)
  by?: string;                             // last edited by; `me` by default
  edited?: number | string;                // last edited; an hour ago by default
  presence?: string[];                     // viewing it now (faces at the top right)
  share?: NotionShare[];                   // { person, access: "Full access" | "Can edit" | ... }; you with full access by default
  access?: string;                         // general access line; "Can edit" by default
  full?: boolean;                          // full width
  blocks?: NotionBlockInput[];
  database?: { properties: NotionProperty[] };   // makes it a database; its rows are pages whose parent is it
  properties?: Record<string, NotionValue>;      // a row's cells by property id (string | string[])
}

interface NotionProperty {
  id: string; name: string;
  type: "title" | "status" | "select" | "multi" | "person" | "date" | "text";  // one "title" column
  width?: number;
  options?: { name: string; color?: NotionColor | "default"; done?: boolean }[];
}

// A block: one of these, plus { id?: string; children?: NotionBlockInput[]; color?: NotionColor; background?: NotionColor }
type NotionBlockData =
  | { type: "text" | "h1" | "h2" | "h3" | "bullet" | "number" | "quote"; text?: RichText }
  | { type: "todo"; text?: RichText; checked?: boolean }
  | { type: "toggle"; text?: RichText; open?: boolean }    // children show only while open
  | { type: "callout"; text?: RichText; icon?: string }     // icon: emoji, 💡 by default
  | { type: "divider" }
  | { type: "code"; text?: string; language?: "plain" | "bash" | "sql" | "javascript" }
  | { type: "table"; rows: RichText[][]; header?: boolean }
  | { type: "image"; src?: string; sketch?: "phones" | { boxes: [string, string?][] }; caption?: string }
  | { type: "bookmark"; url: string; title: string; description?: string; icon?: string }
  | { type: "toc" }
  | { type: "database"; database: string }                // another (database) page's id, drawn inline
  | { type: "page"; page: string }                        // a link to a page
  | { type: "custom"; kind: string; data?: unknown };     // drawn by the renderBlock prop

type NotionColor = "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
// RichText: **bold**, *italic*, ~~strike~~, `code`, [label](https://...), [label](color:gray),
// [label](comment:threadId), @personId, @2026-10-10, [[pageId]]; "\" before *~`[]@\ keeps it literal.
```

Blocks without an `id` get `b1`, `b2`... in seed order, and new blocks
continue the count; give an explicit id (not of the form `b<number>`) to
every block the world will change, comment on or insert after.

### What the world can do

All on the object `useNotion` returns; every function is stable across
renders and safe to call from timers and after `await`. None of them fires
`onEvent`.

```ts
notion.open(id: string): void                                   // shows a page; throws on an unknown page
notion.updatePage(id: string, patch: PagePatch): void           // PagePatch = Partial<Omit<NotionPageSeed, "id">>; `blocks` replaces all blocks; throws on an unknown page
notion.addPage(page: NotionPageSeed): void                      // a new page in the sidebar, or a row when its parent is a database page
notion.appendBlocks(pageId: string, blocks: NotionBlockInput[], o?: { after?: string; by?: string }): string[]  // at the end, or right after block `after` (end if not found); `by` sets who last edited; returns the new ids
notion.updateBlock(id: string, patch: Partial<NotionBlockInput>): void   // merges fields (text, checked, open, rows...); `children` replaces them; throws on an unknown block
notion.removeBlock(id: string): void                            // removes it, its children move up; unknown ids are ignored
notion.setPresence(ids: string[], pageId?: string): void        // who is viewing a page; the page on screen by default (the page must exist)
notion.comment(target: CommentTarget, message: { from: string; text: string }): string  // returns the thread id; shows a toast
notion.toast(text: string): void                                // a notice at the bottom

type CommentTarget =
  | { block: string; quote: string }   // new thread: highlights the first match of `quote` in that block's raw text (markup included); throws if not found
  | { thread: string };                // adds to an existing thread
```

Read-only fields: `seed`, `people: Record<string, Person>` (with `id`,
`name`, `email`, `initials`, `color`, `photo?`), `me`, `teamspaces`,
`state`, `page` (the `NotionPage` on screen), `toasts`, `fmt`. `notion.ui`
holds what `<Notion>` calls for the signed-in person (`go`, `editText`,
`editCell`, `editTitle`, `insertAfter`, `turnInto`, `remove`, `check`,
`flip`, `favorite`, `invite`, `copyLink`, `openComment`, `action`,
`setTheme`, ...); most fire an `onEvent`, so the world should not call them.

### Events

```ts
type NotionEvent =
  | { type: "open"; page: string }
  | { type: "edit"; page: string; block: string; text: string; cell?: [number, number] }  // 600ms after they pause in a block, table cell ([row, column]) or image caption; text in the markup
  | { type: "rename"; page: string; title: string }                     // 600ms after they pause in the title
  | { type: "insert"; page: string; block: string; blockType: NotionBlockType; after: string }
  | { type: "turn-into"; page: string; block: string; from: NotionBlockType; to: NotionBlockType }
  | { type: "delete"; page: string; block: string }
  | { type: "todo"; page: string; block: string; checked: boolean }
  | { type: "toggle"; page: string; block: string; open: boolean }
  | { type: "share"; page: string; action: "invite"; email: string }
  | { type: "share"; page: string; action: "copy-link"; url: string }
  | { type: "favorite"; page: string; on: boolean }
  | { type: "comment"; page: string; thread: string }                   // clicked a comment highlight
  | { type: "action"; name: string; page: string; id?: string };        // "Search", "Add cover", "Board view", "Open row"...
```

### State

`notion.state` is a `NotionState`, plain JSON: `{ version: 1, current,
pages: Record<string, NotionPage>, order, favorites, expanded, collapsed,
comments: Record<string, { from, text, at: number }[]>, theme, seq }`. A
`NotionPage` is the page seed with `title`, `parent`, `by`, `edited` (ms),
`presence`, `share`, `access` filled in and `blocks: NotionBlock[]` (every
block with an `id` and `children`). Save it whenever it changes and pass it
back as `useNotion(seed, { restore })`. What the person wrote is in
`state.pages[id].blocks`, in the markup.

### The component

```ts
interface NotionProps {
  notion: NotionWorkspace;                             // required: what useNotion returned
  renderBlock?: (block: NotionBlock) => ReactNode;     // draws `custom` blocks
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height (`height: 100vh`, or a
flex or grid cell with one). Under 760px of its own width the sidebar
becomes a drawer.

Worth knowing before you build on it:

- The person cannot write comments: "Add comment" and the Comments button
  only fire `{ type: "action", name: "Add comment" | "Comments" }`, and
  clicking a highlight toasts its latest comment and fires `{ type:
  "comment", thread }`. Conversation in
  Notion runs through the world's `comment()` and the person's edits.
- `edit` fires on every pause while they type, so the same block can arrive
  many times; act on it once (a flag, or a length threshold) rather than on
  each event.
- `comment({ block, quote })` matches against the block's raw markup: a
  quote that crosses `**bold**` or a link will not match.
- The world cannot change the theme (the person can, from the workspace
  menu or ⌘⇧L); set `seed.theme`.

### Wiring it in an episode

```tsx
import { useEffect, useRef, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Notion, useNotion, type NotionSeed, type NotionState } from "./apps/notion";

// Module level, so its identity never changes between renders.
// Blocks the world will touch get explicit ids ("root-cause"), otherwise they are "b1", "b2"...
const seed: NotionSeed = {
  workspace: { name: "Northwind", domain: "northwind.com" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.com" },
    priya: { name: "Priya Shah", email: "priya@northwind.com" },
    omar: { name: "Omar Haddad", email: "omar@northwind.com" },
  },
  teamspaces: [{ id: "ops", name: "Operations", icon: "🧭", color: "blue" }],
  pages: [
    {
      id: "postmortem", title: "Checkout outage postmortem", icon: "🔥", parent: "ops", by: "priya", presence: ["priya"],
      blocks: [
        { id: "intro", type: "callout", icon: "📌", background: "yellow", text: "[Owner](comment:t1): @sam. Due @2026-10-03." },
        { type: "h2", text: "What happened" },
        { type: "text", text: "Checkout returned 502s for **38 minutes** after the 14:05 deploy." },
        { type: "h2", text: "Root cause" },
        { id: "root-cause", type: "text", text: "" },
        { id: "fix", type: "todo", text: "Add a canary step to the deploy" },
      ],
    },
  ],
  comments: { t1: [{ from: "priya", text: "Sam, can you write the root cause today?" }] },
  open: "postmortem",
};

// The hook reads `restore` only on its first render, so load the saved state first.
export function NotionScreen() {
  const [saved, setSaved] = useState<NotionState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<NotionState>().then(setSaved);
  }, []);
  if (saved === undefined) return null;
  return <Workspace restore={saved} />;
}

function Workspace({ restore }: { restore: NotionState | null }) {
  const answered = useRef(false);
  const notion = useNotion(seed, {
    restore,
    onEvent(event) {
      if (event.type === "edit") {
        void casuro.track.document({ title: notion.state.pages[event.page]?.title, region: event.block, text: event.text });
        if (event.block === "root-cause" && event.text.length > 80 && !answered.current) {
          answered.current = true;
          void priyaAnswers(event.text);
        }
      }
      if (event.type === "todo") void casuro.track.decision({ summary: `${event.checked ? "Checked" : "Unchecked"} ${event.block}` });
    },
  });

  // Priya answers in the comment thread on "Owner".
  async function priyaAnswers(rootCause: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: "You are Priya Shah, engineering manager. Sam wrote this root cause for the checkout outage. Reply in one or two sentences with one probing question." },
        { role: "user", content: rootCause },
      ],
      { persona: "Priya Shah" }
    );
    notion.comment({ thread: "t1" }, { from: "priya", text: reply });
    void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "notion-comments", text: reply });
  }

  // A timed event: Omar opens the page a minute in and adds the deploy log under the root cause.
  useEffect(() => {
    if (notion.state.pages.postmortem.presence.includes("omar")) return;
    const t = setTimeout(() => {
      notion.setPresence(["priya", "omar"], "postmortem");
      notion.appendBlocks(
        "postmortem",
        [{ type: "code", language: "bash", text: "14:05 deploy api@4.12.0\n14:07 502 rate 31%\n14:43 rollback api@4.11.2" }],
        { after: "root-cause", by: "omar" }
      );
      notion.toast("Omar Haddad added the deploy log");
    }, 60_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save whenever anything changes.
  useEffect(() => {
    void casuro.store.set(notion.state);
  }, [notion.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Notion notion={notion} />
    </div>
  );
}
```

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
