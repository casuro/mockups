# Claude Code (React)

`apps/claude-code.html` as React components: the same look, pixel for
pixel, with the sample data swapped for props. Like a shadcn component, you
copy the folder into your project and it is yours: use it as it is, or
change any file for what your screen needs.

```bash
cp -r apps/claude-code src/apps/claude-code
```

It needs only React 19. The styles are plain CSS scoped to
`.kit-claude-code`, so they neither leak into the rest of the page nor pick
up its styles (Tailwind included). It uses the mockup's system font stacks
(sans, serif and mono), so nothing loads from the network.

The kit never runs an agent. Claude's side of a session (its text, tool
calls, permission prompts, plans) comes from outside, through the calls
below: a script, a recording, or a real model.

## Use

```tsx
import { ClaudeCode, useClaudeCode, type ClaudeCodeSeed } from "./apps/claude-code";

const seed: ClaudeCodeSeed = {
  me: { name: "Sam Rivera", email: "sam@northwind.dev", plan: "Pro plan" },
  people: { priya: { name: "Priya Shah" } },
  repos: { "northwind/api": { branches: ["main"], path: "~/code/api" } },
  sessions: [
    {
      id: "fix-login",
      title: "Fix the login redirect",
      repo: "northwind/api",
      branch: "sam/login-redirect",
      items: [{ type: "user", text: "Users land on /404 after logging in. Find out why." }],
    },
  ],
};

function Workspace() {
  const cc = useClaudeCode(seed, {
    async onEvent(event) {
      if (event.type !== "prompt") return;
      const id = event.sessionId;
      cc.setStatus(id, "running", { verb: "Reading" });
      cc.append(id, { type: "read", path: "src/auth.ts", lines: ["export const next = '/home';"] });
      const answer = await cc.askPermission(id, { kind: "bash", command: "npm test -- auth" });
      if (answer === "deny" || answer === "cancel") return cc.setStatus(id, "idle");
      cc.append(id, { type: "bash", command: "npm test -- auth", output: " ✓ auth (3 tests)", exit: 0 });
      cc.append(id, { type: "text", text: "Fixed: the redirect now goes to `/home`." });
      cc.setStatus(id, "done");
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <ClaudeCode claudeCode={cc} />
    </div>
  );
}
```

`<ClaudeCode>` fills the box it is in, so give that box a height. It floats
the side panes over the transcript when the box is under 1100px wide, and
switches to the phone layout (sessions in a drawer, one full-screen pane at
a time) under 760px, whatever the window size, so it also works as one pane
of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `me` is the signed-in person; `people` are teammates by id (PR reviewers).
  `photo` is a picture URL, otherwise an initial on a plain disc.
- `repos` by name, with their `branches`, local `path` and `previewUrl`.
- `sessions`, each in a `repo` on a `branch`, `local` or `cloud`, with a
  `model`, a permission `mode` (`ask`, `auto`, `plan`), a `status` (`idle`,
  `running`, `input`, `done`), how full the `context` is (0 to 100), and its
  transcript `items`. The sidebar groups them by `at`.
- A transcript item is one of: `user`, `text` (markdown), `thinking`, `read`,
  `search`, `edit` (unified-diff `hunks`), `bash`, `todo`, `task` (a
  subagent), `permission`, `plan`, `pr`, `note`, or `custom`. Tool items
  take `open` (expanded) and `running` (a spinner). Finished edits make up
  the Diff pane.
- `models` (Opus 5.5, Sonnet 5, Haiku 4.5 by default), `examples` for the
  new-session screen, and `open`: the session on screen, or `null` for the
  new-session screen.

## Driving it

`useClaudeCode` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `cc.append(sessionId, item)` | An entry lands at the end of the transcript. Returns its id. |
| `cc.updateItem(id, patch)` | Changes an entry: `{ text, streaming: false }`, `{ running: false, exit: 0 }`, or a function that edits it in place (tick a todo). |
| `cc.setStatus(sessionId, status, { verb, tokens })` | Running shows "Clauding... (12s · 3.4k tokens)" and the stop button; `done` and `idle` end the run and send the next queued message. A session in the background toasts when it needs input or finishes. |
| `cc.askPermission(sessionId, { kind: "bash", command, why })` | Shows the prompt (or `{ kind: "edit", path, hunks }`) and waits. Resolves with `once`, `always`, `deny`, or `cancel` if they stop the run. |
| `cc.proposePlan(sessionId, markdown)` | Shows the plan and waits. Resolves with `approve` (the session switches to Auto-accept edits), `keep` or `cancel`. |
| `cc.updateSession(sessionId, { context, title, branch, ... })` | Changes the header: the context ring, the title, the branch. |
| `cc.terminal(sessionId, { command, output })` | A line in the Terminal pane; with no `command`, more output for the last one. |
| `cc.attach(name)` | A file in the composer on screen. |
| `cc.addSession(session)` | A session appears in the sidebar. |
| `cc.open(sessionId)` / `cc.open(null)` | Show a session, or the new-session screen. |
| `cc.toast(text, { icon, action })` | A notice at the top. |
| `cc.snapshot()` | The state as the last change left it, before React re-renders. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "prompt", sessionId, text, attachments, queued? }` | They send a message (their message is already in the transcript). Sent while Claude runs, it waits in the queue and arrives, `queued`, when the run ends. |
| `{ type: "newSession", sessionId, repo, branch, env, model, mode }` | They start a session from the new-session screen; its `prompt` follows. |
| `{ type: "permission", sessionId, id, answer }` / `{ type: "plan", ... }` | They answer a prompt, by button or 1, 2, 3. Also for prompts seeded unanswered, which no promise awaits. |
| `{ type: "stop", sessionId }` | They press stop or Esc. Running items are marked interrupted and open prompts cancelled. |
| `{ type: "model" \| "mode", sessionId, ... }` | They pick a model or permission mode (`sessionId` null on the new-session screen). |
| `{ type: "pane", pane, open }` | They open or close the Diff, Terminal or Preview pane. |
| `{ type: "terminal", sessionId, command }` | They run a command in the Terminal pane: answer with `cc.terminal`. |
| `{ type: "attach", sessionId, kind }` | They pick "Upload a file" or "Add a screenshot": answer with `cc.attach`. |
| `{ type: "createPr", sessionId, id, number, title, base, head, description, reviewers, draft }` | They create a PR. Its card `id` is in the transcript with no checks yet: add them with `updateItem`. |
| `{ type: "comment", sessionId, path, line, text }` | They comment on a diff line (it is also added to their draft). |
| `{ type: "revert", sessionId, path }` | They revert a file in the Diff pane. |
| `{ type: "rename" \| "archive" \| "delete", sessionId, ... }` | They rename, archive or delete a session. |
| `{ type: "preview", sessionId, action, url }` | They reload the Preview pane or open it in the browser. |
| `{ type: "open", sessionId }` | They open a session (or the new-session screen). |
| `{ type: "action", label, sessionId? }` | "View PR", "Help & support", "Log out". |

`cc.state` is everything that changed, as plain JSON: save it, and pass it
back as `useClaudeCode(seed, { restore })` to pick up where they left off.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-claude-code.ts`
and `ClaudeCode.tsx`; you should not need to open them.

### Imports

```ts
import {
  ClaudeCode, useClaudeCode, DEFAULT_MODELS,
  type ClaudeCodeProps, type ClaudeCodeApp, type ClaudeCodeOptions, type SessionPatch, type ToastOptions,
  type ClaudeCodeSeed, type ClaudeCodeState, type ClaudeCodeEvent,
  type SessionSeed, type SessionState, type SessionStatus, type PermissionMode, type Env,
  type ItemInput, type Item, type Hunk, type PermissionRequest, type PermissionAnswer, type PlanAnswer,
  type TodoItem, type PrCheck, type FileChange, type Pane, type Lang, type Model,
} from "./apps/claude-code";
```

`index.ts` re-exports every type in `types.ts` (`export type *`).
`DEFAULT_MODELS` is the model menu's default list (ids `"opus"`, `"sonnet"`,
`"haiku"`).

### The hook

```ts
function useClaudeCode(seed: ClaudeCodeSeed, options?: ClaudeCodeOptions): ClaudeCodeApp;

interface ClaudeCodeOptions {
  restore?: ClaudeCodeState | null;          // a saved `cc.state`; read once, on mount
  onEvent?: (event: ClaudeCodeEvent) => void; // everything the signed-in person does
  notifications?: boolean;                   // toast when a background session needs input or finishes; default true
}
```

`restore` is only used when its `version` is `1`, and only on the first
render; then the seed's `sessions`, `open`, `defaults` and `theme` are
ignored. `onEvent` is read through a ref, so an inline function is fine.

### The seed

```ts
interface ClaudeCodeSeed {
  me: { name: string; email?: string; plan?: string; photo?: string };  // required
  people?: Record<string, { name: string; photo?: string }>;            // PR reviewers by id
  models?: { id: string; name: string; desc?: string }[];               // DEFAULT_MODELS
  repos: Record<string, { branches?: string[]; path?: string; previewUrl?: string }>; // required, "acme/api" keys
  sessions: SessionSeed[];                                              // required (may be [])
  open?: string | null;          // session on screen; null = new-session screen; first session by default
  examples?: { repo: string; text: string }[];
  defaults?: { repo?: string; model?: string; mode?: PermissionMode; env?: Env; reviewers?: string[] };
  terminalBanner?: string;
  theme?: "light" | "dark";
}

interface SessionSeed {
  id?: string;                    // "s1", "s2"... by default
  title: string; repo: string; branch: string;   // required; repo is a key of `repos`
  env?: "local" | "cloud";
  model?: string;                 // model id; the first by default
  mode?: "ask" | "auto" | "plan";
  status?: "idle" | "running" | "input" | "done";
  archived?: boolean;
  at?: number | string;           // ms or date string; now by default
  context?: number;               // 0-100
  items?: ItemInput[];
  terminal?: { command: string; output?: string }[];
}

// Every item also takes: id?: string; open?: boolean; running?: boolean; interrupted?: boolean
type ItemInput =
  | { type: "user"; text: string; attachments?: string[] }
  | { type: "text"; text: string; streaming?: boolean }                 // markdown; streaming shows the caret
  | { type: "thinking"; text: string; seconds?: number; live?: boolean; verb?: string }
  | { type: "read"; path: string; lines: string[]; start?: number; lang?: Lang }
  | { type: "search"; pattern: string; path: string; matches: { file: string; line: number; text: string }[] }
  | { type: "edit"; path: string; hunks: Hunk[]; lang?: Lang; deleted?: boolean }  // Diff pane once not running
  | { type: "bash"; command: string; output?: string; exit?: number; seconds?: number }  // leave exit out while running
  | { type: "todo"; todos: { text: string; status: "done" | "active" | "pending" }[] }
  | { type: "task"; agent: string; description: string; steps: { kind: "read" | "search" | "bash"; text: string }[];
      result?: string; seconds?: number }
  | { type: "permission"; request: PermissionRequest; answer?: PermissionAnswer }
  | { type: "plan"; text: string; answer?: PlanAnswer }
  | { type: "pr"; number: number; title: string; base: string; head: string; reviewers?: string[];
      checks?: { name: string; duration?: string; done: boolean }[]; draft?: boolean }
  | { type: "note"; text: string; icon?: "hand" | "undo" | "alert" | "check"; tone?: "error" }
  | { type: "custom"; kind: string; data?: unknown };                   // drawn by renderItem

interface Hunk { oldStart: number; newStart: number; lines: string }   // lines prefixed " ", "+", "-"; oldStart 0 creates the file
type Lang = "ts" | "sql" | "css" | "sh" | "text";
type PermissionRequest =
  | { kind: "bash"; command: string; why?: string }
  | { kind: "edit"; path: string; hunks: Hunk[]; lang?: Lang };
type PermissionAnswer = "once" | "always" | "deny" | "cancel";
type PlanAnswer = "approve" | "keep" | "cancel";
```

### What code can do

Every function is stable across renders and reads the latest state, so it is
safe to call from timers and after `await`. The session calls throw if
`sessionId` does not exist.

```ts
cc.append(sessionId: string, item: ItemInput): string          // adds a transcript entry; returns its id
cc.updateItem(id: string, patch: Partial<ItemInput> | ((item: Item) => void)): void
  // merges fields ({ text, streaming: false }, { running: false, exit: 0 }) or edits in place
cc.setStatus(sessionId: string, status: SessionStatus, detail?: { verb?: string; tokens?: number }): void
  // "running" shows the status line and stop button; "done"/"idle" end the run and send the next queued message
cc.askPermission(sessionId: string, request: PermissionRequest): Promise<PermissionAnswer>
  // appends a permission item, sets status "input", waits; "cancel" if they stop the run
cc.proposePlan(sessionId: string, markdown: string): Promise<PlanAnswer>
  // "approve" also switches the session's mode to "auto"
cc.updateSession(sessionId: string, patch: SessionPatch): void
  // SessionPatch = Partial<{ title, branch, model, mode, context, archived, env }>
cc.terminal(sessionId: string, entry: { command?: string; output?: string }): void
  // a new line with `command`, or more output for the last one when `command` is left out
cc.attach(name: string): void                  // a file chip in the composer on screen
cc.addSession(session: SessionSeed): string    // returns its id
cc.open(sessionId: string | null): void        // also emits { type: "open" }
cc.toast(text: string, options?: ToastOptions): void
  // ToastOptions = { icon?: ToastIcon; action?: { label: string; run: () => void }; ms?: number /* 3600 */ }
  // ToastIcon: "check" | "hand" | "layers" | "archive" | "unarchive" | "trash" | "pr" | "ext" | "undo"
  //          | "comment" | "help" | "logout" | "zap" | "map"
cc.snapshot(): ClaudeCodeState                 // the latest state, before React re-renders
cc.dismiss(id: number): void                   // closes a toast
```

Read-only properties:

```ts
cc.state: ClaudeCodeState          // save this; see State below
cc.current: SessionState | null    // the session on screen
cc.toasts: { id: number; text: string; icon: ToastIcon; action?: { label: string; run: () => void }; out: boolean }[]
cc.seed: ClaudeCodeSeed
cc.models: Model[]
cc.people: Record<string, { id: string; name: string; initials: string; photo?: string }>
cc.ui                              // internal: the handlers <ClaudeCode> wires; do not call
```

What the kit does not do for you:

- Sending a prompt does not set the session running. Call
  `cc.setStatus(id, "running")` yourself; until you do, a second message is
  sent straight away instead of being queued.
- There is no streaming helper: append `{ type: "text", text: "", streaming: true }`
  and grow it with `updateItem`, or append the whole text at once.
- The permission `mode` and an "always" answer are only shown, never
  enforced: read `cc.snapshot()` (session `mode`) and skip `askPermission`
  yourself when the session is on `"auto"` or the command was always allowed.

### Events

```ts
type ClaudeCodeEvent =
  | { type: "prompt"; sessionId: string; text: string; attachments: string[]; queued?: boolean }
  | { type: "newSession"; sessionId: string; repo: string; branch: string; env: Env; model: string; mode: PermissionMode }
  | { type: "permission"; sessionId: string; id: string; answer: PermissionAnswer }
  | { type: "plan"; sessionId: string; id: string; answer: PlanAnswer }
  | { type: "stop"; sessionId: string }
  | { type: "open"; sessionId: string | null }
  | { type: "pane"; pane: "diff" | "terminal" | "preview"; open: boolean }
  | { type: "model"; sessionId: string | null; model: string }        // null: new-session screen
  | { type: "mode"; sessionId: string | null; mode: PermissionMode }
  | { type: "attach"; sessionId: string | null; kind: "file" | "screenshot" }  // answer with cc.attach
  | { type: "terminal"; sessionId: string; command: string }           // answer with cc.terminal
  | { type: "createPr"; sessionId: string; id: string; number: number; title: string; base: string;
      head: string; description: string; reviewers: string[]; draft: boolean }
  | { type: "revert"; sessionId: string; path: string }
  | { type: "comment"; sessionId: string; path: string; line: number; text: string }
  | { type: "rename"; sessionId: string; title: string }
  | { type: "archive"; sessionId: string; archived: boolean }
  | { type: "delete"; sessionId: string }
  | { type: "preview"; sessionId: string; action: "reload" | "open"; url: string }
  | { type: "action"; label: string; sessionId?: string };             // "View PR", "Help & support", "Log out"
```

When `prompt` arrives, the user's message is already in the transcript
(read it with `cc.snapshot()`). A new session emits `newSession` then
`prompt`. `permission` and `plan` are emitted for every answer except
`"cancel"`, including answers to seeded prompts that no promise awaits.

### State

`cc.state` is plain JSON (`structuredClone`-safe), so it can go straight
into `casuro.store.set(...)`:

```ts
interface ClaudeCodeState {
  version: 1;
  active: string | null;                 // session on screen
  sessions: SessionState[];
  panes: Record<"diff" | "terminal" | "preview", boolean>;
  paneWidth: number;
  diffView: "unified" | "split";
  previewDevice: "desktop" | "tablet" | "mobile";
  sidebarCollapsed: boolean;
  showArchived: boolean;
  draft: { repo: string; branch: string; env: Env; model: string; mode: PermissionMode; text: string; attachments: string[] };
  theme: "light" | "dark";
  seq: number;
}

interface SessionState {
  id: string; title: string; repo: string; branch: string; env: Env; model: string;
  mode: PermissionMode; status: SessionStatus; archived: boolean; at: number; context: number;
  items: Item[];                          // ItemInput with a required id
  changes: FileChange[];                  // the Diff pane: { path, lang, status: "A" | "M" | "D", hunks }
  applied: string[];
  diffFile: string | null;
  comments: Record<string, Record<string, string[]>>;
  terminal: { command: string; output?: string }[];
  run: { startedAt: number; verb: string; tokens: number } | null;
  queue: string[];                        // messages waiting for the run to end
  draft: string;
  attachments: string[];
}
```

To restore, pass the same seed and `{ restore: saved }` on mount. A promise
from `askPermission` or `proposePlan` does not survive a reload: a restored
unanswered prompt is answered through the `permission` / `plan` event
instead. Toasts are not saved.

### The component

```ts
interface ClaudeCodeProps {
  claudeCode: ClaudeCodeApp;                                          // required: the hook's return
  renderItem?: (item: Item, session: SessionState) => ReactNode;      // draws `custom` items
  renderPreview?: (session: SessionState) => ReactNode;               // the Preview pane's content
  renderTerminal?: (session: SessionState) => ReactNode;              // replaces the Terminal pane's body
  className?: string;
  style?: CSSProperties;
}
```

The prop is `claudeCode`, not `cc`. It fills its parent, so the parent needs
a definite height. It needs no provider and no global CSS; it imports
`claude-code.css` itself.

### Wiring it in an episode

The kit runs no agent: Claude's turn is produced by `casuro.llm` and played
into the transcript with the calls above.

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { ClaudeCode, useClaudeCode, type ClaudeCodeSeed, type ClaudeCodeState } from "./apps/claude-code";

const seed: ClaudeCodeSeed = {
  me: { name: "Sam Rivera", email: "sam@northwind.dev", plan: "Max plan" },
  people: { priya: { name: "Priya Shah" } },
  repos: { "northwind/api": { branches: ["main"], path: "~/code/api" } },
  sessions: [
    { id: "login", title: "Fix the login redirect", repo: "northwind/api", branch: "sam/login-redirect",
      items: [{ type: "text", text: "Ready. What should I look at?" }] },
  ],
};

const SYSTEM = "You are Claude Code working in northwind/api. Reply in short markdown.";

export function ClaudeCodeScene() {
  const [saved, setSaved] = useState<ClaudeCodeState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ claudeCode?: ClaudeCodeState }>().then((s) => setSaved(s?.claudeCode ?? null));
  }, []);
  if (saved === undefined) return null;          // wait: restore is read on mount only
  return <Workspace restore={saved} />;
}

function Workspace({ restore }: { restore: ClaudeCodeState | null }) {
  const cc = useClaudeCode(seed, {
    restore,
    async onEvent(event) {
      if (event.type === "prompt") {
        const id = event.sessionId;
        casuro.track.message({ from: "candidate", to: "Claude", channel: "claude-code", text: event.text });
        cc.setStatus(id, "running", { verb: "Thinking" });

        // The conversation so far, from the latest state (the prompt is already in it).
        const session = cc.snapshot().sessions.find((s) => s.id === id)!;
        const messages = session.items.flatMap<{ role: "user" | "assistant"; content: string }>((it) =>
          it.type === "user" ? [{ role: "user", content: it.text }]
          : it.type === "text" ? [{ role: "assistant", content: it.text }]
          : [],
        );
        const reply = await casuro.llm([{ role: "system", content: SYSTEM }, ...messages], { persona: "Claude" });

        // A tool call that needs permission, unless the session auto-accepts.
        if (cc.snapshot().sessions.find((s) => s.id === id)?.mode !== "auto") {
          const answer = await cc.askPermission(id, { kind: "bash", command: "npm test -- auth", why: "Check the fix" });
          casuro.track.decision({ summary: `Answered "${answer}" to running npm test -- auth` });
          if (answer === "cancel") return;                       // they pressed stop
          if (answer === "deny") return cc.setStatus(id, "idle");
        }
        const bash = cc.append(id, { type: "bash", command: "npm test -- auth", running: true });
        cc.updateItem(bash, { running: false, output: " ✓ auth (3 tests)", exit: 0 });
        cc.append(id, { type: "text", text: reply });
        casuro.track.message({ from: "Claude", to: "candidate", channel: "claude-code", text: reply });
        cc.setStatus(id, "done");
      }
      if (event.type === "createPr") {
        casuro.track.document({ title: event.title, text: event.description, action: "pull_request" });
      }
    },
  });

  // Timed: 60s in, a teammate's cloud session finishes in the background.
  useEffect(() => {
    const id = setTimeout(() => {
      cc.addSession({ title: "Nightly: flaky checkout test", repo: "northwind/api", branch: "claude/flaky-checkout",
        env: "cloud", status: "done", items: [{ type: "text", text: "The checkout test fails 1 run in 20: a race on the cart lock." }] });
      cc.toast("Priya's cloud session finished", { icon: "check" });
    }, 60_000);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save everything that changed.
  useEffect(() => {
    void casuro.store.set({ claudeCode: cc.state });
  }, [cc.state]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <ClaudeCode claudeCode={cc} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `ClaudeCode.tsx` | The layout, keyboard shortcuts, menus, dialogs, toasts and tooltips. |
| `Sidebar.tsx` | The sessions sidebar: new session, search, sessions by day, archive, account menu. |
| `NewSession.tsx` | The new-session screen. |
| `Session.tsx` | A session's header (title, repo, model, context ring, pane toggles, PR) and its layout. |
| `Transcript.tsx` | Messages and every card: thinking, read, search, edit, bash, todo, task, permission, plan, PR, note. |
| `Composer.tsx` | The composer with its pickers, the run status line and the queue. |
| `Panes.tsx` | The Diff, Terminal and Preview panes and the drag handle. |
| `Diff.tsx` | Unified and split diffs, and line comments. |
| `Dialogs.tsx` | Create pull request, and delete a session. |
| `use-claude-code.ts` | The state and what changes it. |
| `format.tsx` | Markdown, syntax highlighting, terminal colors, the diff model. |
| `icons.tsx` | The mockup's icons and the Claude and GitHub marks. |
| `claude-code.css` | The look, from the mockup. |

For a transcript entry the kit has no card for (a form, a chart, a
screenshot), append `{ type: "custom", kind, data }` and draw it with
`<ClaudeCode renderItem={(item, session) => ...} />`. The Preview pane shows
whatever `renderPreview={(session) => ...}` returns (the app being built),
and `renderTerminal` replaces the demo terminal with a real one. For
anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=claude-code` next to `/apps/claude-code.html`: the same
sessions and scripted runs, drawn by the React version and played through
the calls above.
