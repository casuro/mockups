# Google Docs (React)

`apps/docs.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/docs src/apps/docs
```

It needs only React 19. The styles are plain CSS scoped to `.kit-docs`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included), and Roboto is embedded, so nothing loads from the network.

## Use

```tsx
import { GoogleDocs, useGoogleDocs, type DocsSeed } from "./apps/docs";

const seed: DocsSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera", email: "sam@northwind.com" },
    priya: { name: "Priya Shah", email: "priya@northwind.com", color: "#9334e6" },
  },
  document: {
    title: "Q3 launch plan",
    content: [
      { type: "title", text: "Q3 launch plan" },
      { type: "h1", text: "Goals" },
      { type: "ul", items: ["Ship the beta to **ten** design partners.", "Keep the launch date on August 4."] },
    ],
  },
  collaborators: [{ id: "priya", cursor: "design partners" }],
  comments: [{ anchor: "August 4", from: "priya", text: "Is legal review done by then?" }],
  suggestions: [{ from: "priya", replace: "ten", with: "twelve" }],
  share: { people: { priya: "Editor" }, general: { name: "Northwind", role: "Commenter" } },
};

function Editor() {
  const docs = useGoogleDocs(seed, {
    onEvent(event) {
      if (event.type === "comment") {
        // They commented on event.anchor; answer with docs.reply(event.id, "priya", "...").
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <GoogleDocs docs={docs} />
    </div>
  );
}
```

`<GoogleDocs>` fills the box it is in, so give that box a height. It drops
toolbar buttons as the box narrows, moves the comments under the page under
1000px, and switches to Docs' mobile layout under 760px, whatever the window
size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `photo` is a
  picture URL, otherwise initials on `color`; `color` is also their presence
  ring and cursor.
- `document`: the `title`, the `content`, the `owner` (you by default), the
  `folder` and `url` the Move and Copy link buttons use.
- `content` is a list of blocks (`title`, `subtitle`, `p`, `h1`-`h3`, `ul`,
  `ol`, `table`, or raw `html`) whose text takes `**bold**`, `*italic*`,
  `[links](url)` and `\n` breaks; or one HTML string.
- `collaborators`: who else has it open, with their cursor just after a
  piece of text.
- `comments` sit on the first match of their `anchor` text (highlighted) and
  can have `replies`; `suggestions` strike `replace` and insert `with` after
  it. `@Full Name` in a comment is a mention.
- `share`: the Share dialog's people and roles, and general access.

The state keeps the body as HTML (`state.html`), with comments as
`<span class="hl" data-c="id">` and suggestions as `<del class="sg-del">` /
`<ins class="sg-ins">` with `data-s="id"`.

## Driving it

`useGoogleDocs` returns the document. The world acts on it through:

| Call | What happens |
| --- | --- |
| `docs.comment(anchor, from, text)` | A collaborator comments on the first match of `anchor`. Returns the comment's id. |
| `docs.reply(id, from, text)` | A reply on a comment or suggestion. |
| `docs.suggest(from, replace, with)` | A suggested edit: `replace` struck, `with` in green (`""` to suggest a deletion). Returns its id. |
| `docs.resolve(id)` / `docs.accept(id)` / `docs.reject(id)` | Someone else settles a comment or suggestion. |
| `docs.join(id, cursor?)` / `docs.leave(id)` | A collaborator opens or closes the document. |
| `docs.moveCursor(id, after)` | Their cursor moves to just after that text (`null` hides it). |
| `docs.setContent(content)` / `docs.setTitle(title)` | Replace the body or the title. |
| `docs.toast(text)` | A notice at the bottom left. |

A comment, reply or suggestion on text or an id that is not there throws. Every function is stable
across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "edit", html, text }` | They typed or formatted; sent 800ms after they stop (`editDelay`). |
| `{ type: "comment", id, anchor, text }` | They comment on a selection. |
| `{ type: "reply", id, text }` | They reply to a comment or suggestion. |
| `{ type: "resolve" \| "accept" \| "reject", id }` | They resolve a comment, or accept or reject a suggestion. |
| `{ type: "mode", mode }` | They switch between Editing, Suggesting and Viewing. |
| `{ type: "rename", title }` / `{ type: "star", starred }` | They rename or star the document. |
| `{ type: "share", action }` | They open Share, copy the link, or press Done. |
| `{ type: "action", label, menu? }` | A menu item or button the kit only answers with a toast (Meet, Download...). |

`docs.state` is everything that changed, as plain JSON: save it, and pass it
back as `useGoogleDocs(seed, { restore })` to pick up where they left off.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-google-docs.ts`
and `GoogleDocs.tsx`; you should not need to open them.

### Imports

```ts
import {
  GoogleDocs, useGoogleDocs,
  type GoogleDocsProps, type GoogleDocsApp, type DocsOptions, type Person,
  type DocsSeed, type DocsState, type DocsEvent, type DocsPerson, type DocsContent, type DocsBlock, type DocsText,
  type DocsCommentSeed, type DocsSuggestionSeed, type DocsReplyInput, type DocsThread, type DocsReply,
  type DocsMode, type DocsRole,
} from "./apps/docs";
```

### The hook

```ts
function useGoogleDocs(seed: DocsSeed, options?: DocsOptions): GoogleDocsApp;

interface DocsOptions {
  restore?: DocsState | null;              // a saved `docs.state`; read on the first render only
  onEvent?: (event: DocsEvent) => void;    // what the signed-in person does
  editDelay?: number;                      // ms after the last keystroke before the `edit` event; default 800
}
```

`restore` is used only when its `version` is `1`; otherwise the seed is used.
`onEvent` is read through a ref, so an inline function is fine. It throws if
`seed.me` is not a key of `seed.people`. It builds HTML with `document` on
its first render, so it runs in the browser only. Keep the seed at module
level (or in `useMemo`): `people` is recomputed whenever the seed object
changes.

### The seed

```ts
interface DocsSeed {
  me: string;                              // required: a key of `people`
  people: Record<string, DocsPerson>;      // required
  document: {                              // required
    title: string;                         // required
    content: DocsContent;                  // required: DocsBlock[] or one HTML string
    owner?: string;                        // a person id; `me` by default
    folder?: string;                       // "Product / PRDs" shows as "My Drive / Product / PRDs"
    url?: string;                          // what Copy link copies
    starred?: boolean;
  };
  collaborators?: { id: string; cursor?: string }[];   // who else has it open; cursor sits after that text
  comments?: DocsCommentSeed[];
  suggestions?: DocsSuggestionSeed[];
  share?: {
    people?: Record<string, DocsRole>;     // "Owner" | "Editor" | "Commenter" | "Viewer"; owner first by default
    general?: { name: string; role: DocsRole; description?: string };  // general access, "Northwind"
  };
  mode?: DocsMode;                         // "Editing" (default) | "Suggesting" | "Viewing"
  theme?: "light" | "dark";
}

interface DocsPerson {
  name: string;                            // required
  email?: string;
  photo?: string;                          // picture URL; else initials on `color`
  initials?: string;                       // default: first letter of `name`
  color?: string;                          // presence ring and cursor color
}

type DocsBlock =
  | { type: "title" | "subtitle" | "p" | "h1" | "h2" | "h3"; text: DocsText }
  | { type: "ul" | "ol"; items: DocsText[] }
  | { type: "table"; header?: DocsText[]; rows: DocsText[][] }
  | { type: "html"; html: string };
// DocsText is a string with **bold**, *italic*, [a link](https://...) and "\n" line breaks.

interface DocsCommentSeed {
  id?: string;                             // "c1", "c2"... when left out
  anchor: string;                          // required: its first match is highlighted
  from: string;                            // required: a person id
  text: string;                            // required; "@Full Name" is a mention
  at?: number | string;                    // ms or date string; now by default
  replies?: DocsReplyInput[];
}

interface DocsSuggestionSeed {
  id?: string;                             // "s1", "s2"... when left out
  from: string;                            // required
  replace: string;                         // required: its first match is struck through
  with: string;                            // required: inserted in green after it; "" suggests a deletion
  at?: number | string;
  replies?: DocsReplyInput[];
}

interface DocsReplyInput { from: string; text: string; at?: number | string }
```

A seed comment or suggestion whose text is not in the document is dropped
silently. Give it an `id` if the world will reply to it or resolve it.

### What the world can do

All on the object `useGoogleDocs` returns; every function is stable across
renders and safe to call from timers and after `await`. None of them fires
`onEvent`.

```ts
docs.comment(anchor: string, from: string, text: string, o?: { at?: number | string; id?: string }): string  // comment on the first match of `anchor`; returns its id; throws if the text is not there
docs.reply(id: string, from: string, text: string): void              // reply on a comment or suggestion; throws on an unknown id
docs.suggest(from: string, replace: string, replacement: string): string  // suggested edit ("" deletes); returns its id; throws if `replace` is not there
docs.resolve(id: string): void                                         // someone else resolves a comment; throws on an unknown id
docs.accept(id: string): void                                          // someone else accepts a suggestion
docs.reject(id: string): void                                          // someone else rejects a suggestion
docs.join(id: string, cursor?: string): void                           // a collaborator opens it (face at the top), cursor after `cursor`
docs.leave(id: string): void                                           // a collaborator closes it
docs.moveCursor(id: string, after: string | null): void                // cursor to just after `after`; null hides it; also marks them present
docs.setContent(content: DocsContent): void                            // replaces the body; comments whose text is gone drop out of the margin
docs.setTitle(title: string): void
docs.toast(text: string): void                                         // a notice at the bottom left
```

Read-only fields: `seed`, `people: Record<string, Person>` (with `id`,
`name`, `email`, `initials`, `color`, `photo?`), `me`, `state`, `notice`.
`docs.ui` holds what `<GoogleDocs>` calls for the signed-in person (`input`,
`flush`, `postComment`, `reply`, `settle`, `setMode`, `rename`, `star`,
`emit`); most fire an `onEvent`, so the world should not call them.

### Events

```ts
type DocsEvent =
  | { type: "edit"; html: string; text: string }        // typed or formatted; sent `editDelay` ms after they stop; text is the plain text
  | { type: "comment"; id: string; anchor: string; text: string }   // commented on a selection; anchor is the selected text
  | { type: "reply"; id: string; text: string }         // id is the comment or suggestion replied to
  | { type: "resolve"; id: string }
  | { type: "accept"; id: string }
  | { type: "reject"; id: string }
  | { type: "mode"; mode: "Editing" | "Suggesting" | "Viewing" }
  | { type: "rename"; title: string }
  | { type: "star"; starred: boolean }
  | { type: "share"; action: "open" | "copy-link" | "done" }
  | { type: "action"; label: string; menu?: string };   // a menu item or button the kit only toasts
```

### State

`docs.state` is a `DocsState`, plain JSON: `{ version: 1, title, html,
starred, mode, threads: DocsThread[], present, cursors, theme, seq }`.
`html` is the body (comments as `<span class="hl" data-c="id">`,
suggestions as `<del class="sg-del" data-s="id">` / `<ins class="sg-ins"
data-s="id">`). A `DocsThread` is `{ id, kind: "comment" | "suggestion",
from, at, text, replace?, with?, replies: { id, from, at, text }[], status:
"open" | "resolved" | "accepted" | "rejected" }`. Save it whenever it changes
and pass it back as `useGoogleDocs(seed, { restore })`.

### The component

```ts
interface GoogleDocsProps {
  docs: GoogleDocsApp;                     // required: what useGoogleDocs returned
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height (`height: 100vh`, or a
flex or grid cell with one). It drops toolbar buttons as it narrows, moves
comments under the page below 1000px and uses the mobile layout below 760px.

Worth knowing before you build on it:

- Typing does not re-render or update `docs.state` on every key: `state.html`
  catches up when they pause (with the `edit` event). Read what they wrote
  from the `edit` event or from `state.html` after it.
- Suggesting mode only changes the label: what they type goes straight into
  the text, not as suggestions.
- `comment`, `reply`, `suggest`, `resolve`, `accept` and `reject` throw when
  the text or id is not there; the candidate may have edited it away, so
  wrap timed ones in `try`.
- There is no way to add a `custom` block; use a `{ type: "html", html }`
  block for anything the blocks do not cover.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { GoogleDocs, useGoogleDocs, type DocsSeed, type DocsState } from "./apps/docs";

// Module level, so its identity never changes between renders.
const seed: DocsSeed = {
  me: "you",
  people: {
    you: { name: "Sam Rivera", email: "sam@northwind.com" },
    priya: { name: "Priya Shah", email: "priya@northwind.com", color: "#9334e6" },
    omar: { name: "Omar Haddad", email: "omar@northwind.com" },
  },
  document: {
    title: "Q3 launch plan",
    content: [
      { type: "title", text: "Q3 launch plan" },
      { type: "h1", text: "Goals" },
      { type: "ul", items: ["Ship the beta to **ten** design partners.", "Keep the launch date on August 4."] },
      { type: "h1", text: "Risks" },
      { type: "p", text: "Legal review has not started." },
    ],
  },
  collaborators: [{ id: "priya", cursor: "design partners" }],
  comments: [{ anchor: "August 4", from: "priya", text: "Is legal review done by then?" }],
  share: { people: { priya: "Editor", omar: "Commenter" } },
};

// The hook reads `restore` only on its first render, so load the saved state first.
export function DocsScreen() {
  const [saved, setSaved] = useState<DocsState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<DocsState>().then(setSaved);
  }, []);
  if (saved === undefined) return null;
  return <Editor restore={saved} />;
}

function Editor({ restore }: { restore: DocsState | null }) {
  const docs = useGoogleDocs(seed, {
    restore,
    onEvent(event) {
      if (event.type === "edit") void casuro.track.document({ title: docs.state.title, text: event.text });
      if (event.type === "comment" || event.type === "reply") {
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: "docs-comments", text: event.text });
        void priyaReplies(event.id, event.text);
      }
      if (event.type === "accept" || event.type === "reject" || event.type === "resolve")
        void casuro.track.decision({ summary: `${event.type} ${event.id}` });
    },
  });

  async function priyaReplies(threadId: string, text: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: "You are Priya Shah, the PM who owns this launch plan. Reply to the comment in one or two sentences." },
        { role: "user", content: text },
      ],
      { persona: "Priya Shah" }
    );
    docs.reply(threadId, "priya", reply);
    void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "docs-comments", text: reply });
  }

  // A timed event: two minutes in, Omar opens the doc and suggests an edit.
  // suggest() throws when the text is gone (the candidate may have rewritten it).
  useEffect(() => {
    if (docs.state.threads.some((t) => t.from === "omar")) return;
    const t = setTimeout(() => {
      docs.join("omar", "Legal review");
      try {
        docs.suggest("omar", "has not started", "starts on July 14");
      } catch {
        docs.toast("Omar Haddad opened the document");
      }
    }, 120_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save whenever anything changes.
  useEffect(() => {
    void casuro.store.set(docs.state);
  }, [docs.state]);

  return (
    <div style={{ height: "100vh" }}>
      <GoogleDocs docs={docs} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `GoogleDocs.tsx` | The layout, the selection and formatting commands, comment on a selection, shortcuts, the toast. |
| `TopBar.tsx` | The logo, title, star, menu bar, presence, Meet, Share. |
| `Toolbar.tsx` | The toolbar and the Editing / Suggesting / Viewing mode. |
| `Page.tsx` | The ruler, the editable page, collaborators' cursors, placing the comment cards. |
| `Comments.tsx` | The comment and suggestion cards, replies, the reply box. |
| `Menu.tsx` | The menus (menu bar, zoom, style, font, mode). |
| `Share.tsx` | The Share dialog. |
| `use-google-docs.ts` | The state and what changes it. |
| `content.ts` | Blocks to HTML, and the marks comments and suggestions leave in it. |
| `format.tsx` | Comment times and mentions. |
| `docs.css` | The look, from the mockup. |

For content the blocks do not cover (an image, a checklist, a drawing), use
an `{ type: "html", html }` block, or pass the whole body as HTML. For
anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open `/preview/?app=docs`
next to `/apps/docs.html`: the same document, drawn by the React version,
with a collaborator answering the comments and replies you post.
