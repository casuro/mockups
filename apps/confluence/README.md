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

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-confluence.ts` and
`Confluence.tsx`. You should not need to open them.

### Imports

```ts
import {
  Confluence, useConfluence,
  type ConfluenceProps, type ConfluenceSpace, type ConfluenceOptions, type PagePatch, type Person,
  type ConfluenceSeed, type ConfluenceState, type ConfluenceEvent, type ConfluencePage, type ConfluencePageSeed,
  type ConfluenceBlock, type ConfluenceComment,
} from "./apps/confluence";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/confluence/icons";
```

`index.ts` also re-exports every other type in `types.ts`
(`ConfluencePerson`, `ConfluenceIssue`, `ConfluenceTask`,
`ConfluenceReaction`, `ConfluenceCommentInput`, `LozengeColor`).

### The hook

```ts
function useConfluence(seed: ConfluenceSeed, options?: ConfluenceOptions): ConfluenceSpace;

interface ConfluenceOptions {
  restore?: ConfluenceState | null;           // a saved `confluence.state`; read once, on the first render
  onEvent?: (event: ConfluenceEvent) => void; // everything the signed-in person does
}
```

Keep `seed` stable (a module constant or `useMemo`). The hook throws when
`seed.me` is not in `seed.people`, or two pages share an id.

### The seed

```ts
interface ConfluenceSeed {
  space: { name: string; site?: string; initial?: string }; // required; name required
  me: string;                                 // required - signed-in person's id
  people: Record<string, { name: string; photo?: string; initials?: string; color?: string }>; // required; name required
  pages: ConfluencePageSeed[];                // required - the tree, top level first, sidebar order
  issues?: Record<string, { summary: string; status: string; color?: LozengeColor }>; // for {jira:KEY}
  open?: string;                              // page on screen at the start; the first page by default
  expanded?: string[];                        // pages whose children show; the open page's parents by default
  notifications?: number;                     // the red count on the bell
  theme?: "light" | "dark";
}

interface ConfluencePageSeed {
  id: string;                                 // required - unique in the space
  title: string;                              // required
  author?: string;                            // person id; me by default
  updated?: number | string;                  // "Last updated"; now by default
  readTime?: string;                          // "6 min read"; worked out from the words by default
  blocks?: ConfluenceBlock[];
  likes?: string[];                           // person ids
  reactions?: { emoji: string; count: number; mine?: boolean }[];
  comments?: { id?: string; from: string; at?: number | string; text: string }[];
  starred?: boolean;
  children?: ConfluencePageSeed[];
}

type LozengeColor = "grey" | "blue" | "green" | "yellow";

type ConfluenceBlock =                        // every text, cell and item is rich text (see "The data")
  | { type: "heading"; text: string; level?: 2 | 3; id?: string } // level 2 (default) lists under "On this page"
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "panel"; tone: "info" | "note" | "warning" | "success"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "code"; code: string; language?: string }              // "sql" colors keywords
  | { type: "tasks"; items: { text: string; done?: boolean }[] }   // the signed-in person can tick them
  | { type: "custom"; kind: string; data?: unknown };             // drawn by `renderBlock`
```

### What the world can do

All functions are stable across renders. A missing page id throws.

- `addComment(pageId: string, from: string, text: string, opts?: { notify?: boolean }): string` - a comment under the page; returns its id. A toast says so when `from` is not the signed-in person (`notify` overrides that).
- `updatePage(pageId: string, patch: PagePatch): void` - `PagePatch` is a partial of `title, author, readTime, blocks, likes, reactions, starred`, plus `updated?: number | string`. "Last updated" moves to now when `title` or `blocks` change, unless `updated` is given. New `blocks` reset the read time unless `readTime` is set.
- `addPage(page: ConfluencePageSeed, parent?: string): void` - a new page (with its `children`), last under `parent`, or at the top level. Returns nothing: you choose `page.id`.
- `like(pageId: string, personId: string, liked?: boolean): void` - someone likes the page (`liked` defaults to true), or stops.
- `react(pageId: string, emoji: string): void` - adds 1 to that emoji's pill, making it if needed.
- `notify(count: number): void` - sets the count on the bell (it does not add).
- `open(pageId: string): void` - shows a page and expands its parents. This one does not fire an `open` event.
- `toast(text: string): void` - a notice at the bottom.
- `page: ConfluencePage` - the page on screen now (`id, title, parent, children, author, updated, readTime?, blocks, likes, reactions, comments, starred`).
- `state: ConfluenceState` - see State.
- Read-only: `seed`, `me`, `people: Record<string, Person>` (`id, name, initials, color, photo?`), `notice`.
- `ui` is what `<Confluence>` wires to the signed-in person's clicks. Do not call it from the world.

### Events

```ts
type ConfluenceEvent =
  | { type: "open"; pageId: string }
  | { type: "like"; pageId: string; liked: boolean }
  | { type: "react"; pageId: string; emoji: string; added: boolean }
  | { type: "comment"; pageId: string; text: string; id: string }
  | { type: "check"; pageId: string; block: number; item: number; text: string; done: boolean } // block/item are indexes
  | { type: "star"; pageId: string; starred: boolean }
  | { type: "search"; query: string }
  | {
      type: "action";
      kind: "edit" | "share" | "more" | "create" | "add-page" | "home" | "recent" | "spaces" | "overview" | "blogs" | "notifications" | "jira" | "reply" | "like-comment";
      pageId?: string;
      id?: string;                            // issue key for "jira"; comment id for "reply" and "like-comment"
    };
```

The kit has no page editor: Edit, Create and "+" only fire an `action`
event. If the candidate must write, draw a form yourself (a `custom` block,
or a pane next to the kit) and put the result in with `updatePage` or
`addPage`.

### State

`confluence.state` is a `ConfluenceState`: plain JSON (`version: 1`,
`current`, `roots`, `pages` by id, `expanded`, `notifications`, `theme`,
`seq`). Save it whenever it changes and pass it back as
`useConfluence(seed, { restore })`. `restore` is read only on the first
render, and only when `restore.version === 1`, so load the saved state
before you mount the component that calls `useConfluence`.

### The component

```ts
interface ConfluenceProps {
  confluence: ConfluenceSpace;                // required - what useConfluence returned
  renderBlock?: (block: Extract<ConfluenceBlock, { type: "custom" }>, page: ConfluencePage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height. It hides "On this page"
under 1100px wide and switches to the mobile layout under 760px.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Confluence, useConfluence, type ConfluenceSeed, type ConfluenceState } from "./apps/confluence";

const seed: ConfluenceSeed = {
  space: { name: "Platform", site: "Northwind" },
  me: "sam",
  people: { sam: { name: "Sam Rivera" }, priya: { name: "Priya Shah" }, leo: { name: "Leo Park" } },
  pages: [
    { id: "runbooks", title: "Runbooks", author: "leo", children: [
      { id: "keys", title: "Key rotation", author: "priya", updated: "2026-09-20", blocks: [
        { type: "panel", tone: "info", text: "Owner: @priya. Status: {status:Draft|blue}" },
        { type: "heading", text: "Steps" },
        { type: "tasks", items: [{ text: "Generate the new key", done: true }, { text: "Roll it out" }] },
      ] },
    ] },
  ],
  open: "keys",
};

// `restore` is read once, so load the saved state before mounting the wiki.
export function Episode() {
  const [saved, setSaved] = useState<ConfluenceState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<ConfluenceState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Wiki saved={saved} />;
}

function Wiki({ saved }: { saved: ConfluenceState | null }) {
  const confluence = useConfluence(seed, {
    restore: saved,
    onEvent(event) {
      if (event.type === "check")
        void casuro.track.decision({ summary: `${event.done ? "Ticked" : "Unticked"} "${event.text}" on ${event.pageId}` });
      if (event.type === "comment") {
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: event.pageId, text: event.text });
        void answer(event.pageId, event.text);
      }
      if (event.type === "action" && event.kind === "edit") confluence.toast("Editing is off for this page");
    },
  });

  // Priya, the author, answers every comment.
  async function answer(pageId: string, text: string) {
    const page = confluence.state.pages[pageId];
    const reply = await casuro.llm(
      [
        { role: "system", content: `You are Priya Shah, who wrote the Confluence page "${page?.title}". Reply to a comment in one or two sentences.` },
        { role: "user", content: text },
      ],
      { persona: "Priya Shah" },
    );
    confluence.addComment(pageId, "priya", reply);
    void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: pageId, text: reply });
  }

  // Two minutes in, Leo publishes an incident page (once: a restored state already has it).
  useEffect(() => {
    if (confluence.state.pages["keys-incident"]) return;
    const t = setTimeout(() => {
      confluence.addPage(
        { id: "keys-incident", title: "Incident: old key still in use", author: "leo", blocks: [
          { type: "panel", tone: "warning", text: "The old key expires *tonight*. @sam please confirm the rollout in [[keys]]." },
        ] },
        "runbooks",
      );
      confluence.addComment("keys", "leo", "Opened [[keys-incident]] - we are out of time on this one.");
      confluence.notify(1);
    }, 120_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => void casuro.store.set(confluence.state), [confluence.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Confluence confluence={confluence} />
    </div>
  );
}
```

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
