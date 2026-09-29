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
