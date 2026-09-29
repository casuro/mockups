# ChatGPT (React)

`apps/chatgpt.html` as React components: the same look, pixel for pixel, with
the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/chatgpt src/apps/chatgpt
```

It needs only React 19. The styles are plain CSS scoped to `.kit-chatgpt`, so
they neither leak into the rest of the page nor pick up its styles (Tailwind
included). It uses the system UI font, like the mockup, so nothing loads from
the network.

The kit never writes an answer itself. Every assistant reply comes from
outside, through `chatgpt.respond(...)`: from a model, a script, or canned
text.

## Use

```tsx
import { ChatGPT, useChatGPT, type ChatGPTSeed } from "./apps/chatgpt";

const seed: ChatGPTSeed = {
  me: { name: "Sam Rivera", email: "sam@northwind.com" },
  workspace: "Northwind workspace",
  plan: "Team",
  projects: [{ id: "launch", name: "Spring launch", open: true }],
  chats: [
    { id: "c1", title: "Pricing page copy", at: Date.now() - 3_600_000, messages: [
      { role: "user", text: "Tighten this headline: Save time on every invoice" },
      { role: "assistant", text: "**Invoices in half the time.** Short, concrete, and it leads with the benefit." },
    ] },
  ],
};

function Assistant() {
  const chatgpt = useChatGPT(seed, {
    onEvent(event) {
      if (event.type === "prompt") {
        // Ask your model, then stream the answer in.
        void chatgpt.respond(event.chatId, "Here's what I'd do...", { status: "Thinking", thought: true });
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <ChatGPT chatgpt={chatgpt} />
    </div>
  );
}
```

`<ChatGPT>` fills the box it is in, so give that box a height. It switches to
ChatGPT's mobile layout (the sidebar becomes a drawer) when the box is under
760px wide, whatever the window size, so it also works as one pane of a
larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `me`, the signed-in person (a `photo` URL, otherwise initials), with the
  `workspace` and `plan` shown under their name.
- `chats`, each with a `title`, `at` (ms or a date string; the sidebar groups
  them into Today, Yesterday, Previous 7 days...), an optional `project` or
  `gpt`, and `messages`. A user message has `text` and `files`; an answer has
  markdown `text` (headings, bold, lists, tables, fenced code with
  highlighting, quotes, links) and can carry a `thought`, `sources`, an
  `image`, `followups`, or several `versions` for the "2/2" switcher.
- `gpts` (pinned ones sit in the sidebar; each has a start screen with
  `starters`), `projects`, `models` (ChatGPT 5's by default, with legacy
  ones in a submenu), `recentFiles` for the file picker, and the empty
  screen's `greeting` and `suggestions`.

## Driving it

`useChatGPT` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `chatgpt.respond(chatId, markdown, options)` | The assistant answers: the reply the person is waiting for, or a new message. Resolves with `{ messageId, stopped }` once it is all on screen or they pressed stop. |
| `options.status` | `"Thinking"`, or steps `[{ text: "Researching", sub: "Reading 12 sources", ms: 1100 }]`, shimmering before the words. |
| `options.stream` | Word by word with the pulsing cursor (default), or all at once with `false`. |
| `options.thought`, `.sources`, `.image`, `.followups`, `.title` | "Thought for Ns" (`true` counts the wait), the Sources pill, a picture that appears slowly, suggested next prompts, and the chat's title. |
| `chatgpt.appendChat(chat)` | A chat lands in the history (or replaces the one with its id). |
| `chatgpt.open(chatId)` / `open(null)` | Show a chat, or a new chat. |
| `chatgpt.rename(chatId, title)` | Retitle a chat. |
| `chatgpt.draft(text)` | Put text in the composer (after dictation, say). |
| `chatgpt.toast(text, icon?)` | A notice at the top. |
| `chatgpt.setTheme("dark")` | Dark or light. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "prompt", chatId, messageId, text, model, tool, attachments, gpt, project, temporary, fresh }` | They send a prompt, a starter or a follow-up. Answer with `respond`. |
| `{ type: "edit", chatId, messageId, text, model }` | They edit an earlier prompt; what followed is kept as the older version. Answer with `respond`. |
| `{ type: "regenerate", chatId, messageId, prompt, mode, model }` | Try again, Add details, More concise or Search the web. Answer with `respond`. |
| `{ type: "stop", chatId, messageId }` | They stop an answer. |
| `{ type: "feedback", chatId, messageId, value, reason? }` | Thumbs up or down, and the reason they pick. |
| `{ type: "open" }`, `"new-chat"`, `"rename"`, `"archive"`, `"delete"`, `"move"`, `"share"`, `"model"`, `"pin-gpt"` | Moving around and tidying the history. |
| `{ type: "dictate" }` | They finish dictating: put the words in with `draft`. |
| `{ type: "voice", action }` | Voice mode starts, ends, mutes. |
| `{ type: "action", kind, label?, id? }` | Everything the kit only draws: Library, Explore GPTs, New project, read aloud, a code block's Edit, report, the account menu. |

`chatgpt.state` is everything that changed, as plain JSON: save it, and pass
it back as `useChatGPT(seed, { restore })` to pick up where they left off. An
answer lands in it when it finishes (or is stopped), not word by word.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `ChatGPT.tsx` | The layout, scrolling, keyboard shortcuts, toasts, tooltips. |
| `Sidebar.tsx` | The sidebar, its rail and drawer, the chat menu, renaming, the account menu. |
| `TopBar.tsx` | The model picker, the GPT menu, share and the conversation menu. |
| `Conversation.tsx` | The empty screen, prompts with their edit box, answers with their action row, versions, feedback and follow-ups. |
| `Composer.tsx` | The composer: files, the + menu and tools, dictation, send and stop. |
| `Dialogs.tsx` | Share, delete, search, the file picker, voice mode. |
| `markdown.tsx` | Markdown, code highlighting, streaming. |
| `use-chatgpt.ts` | The state and what changes it. |
| `chatgpt.css` | The look, from the mockup. |

The kit leaves out the mockup's Library, Explore GPTs and project pages,
canvas and the settings dialog: their buttons send an `action` event, so a
screen can react (a toast, its own page). For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=chatgpt` next to `/apps/chatgpt.html`: the same history and
GPTs, with the mockup's keyword-routed canned answers streamed back through
`respond`.
