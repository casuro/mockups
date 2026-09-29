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

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-chatgpt.ts` and
`ChatGPT.tsx`; you should not need to open them.

### Imports

```ts
import {
  ChatGPT, useChatGPT, DEFAULT_MODELS,
  type ChatGPTProps, type ChatGPTApp, type ChatGPTOptions,
  type RespondOptions, type RespondResult, type StatusStep, type Generation,
  type ChatGPTSeed, type ChatGPTState, type ChatGPTEvent,
  type ChatGPTChatInput, type ChatGPTMessageInput, type ChatGPTChat, type ChatGPTMessage,
  type ChatGPTFile, type ChatGPTSource, type ChatGPTImage, type ChatGPTThought, type ChatGPTTool,
} from "./apps/chatgpt";
```

`index.ts` re-exports every type in `types.ts` (`export type *`).
`DEFAULT_MODELS` is the model picker's default list (ids `"auto"`,
`"instant"`, `"thinking"`, `"pro"`, and legacy `"4o"`, `"4.1"`, `"o3"`).

### The hook

```ts
function useChatGPT(seed: ChatGPTSeed, options?: ChatGPTOptions): ChatGPTApp;

interface ChatGPTOptions {
  restore?: ChatGPTState | null;             // a saved `chatgpt.state`; read once, on mount
  onEvent?: (event: ChatGPTEvent) => void;   // everything the signed-in person does
}
```

`restore` is only used when its `version` is `1`, and only on the first
render. When it is used, the seed's `chats`, `projects`, pinned GPTs, `open`,
`model` and `theme` are ignored (they live in the state); `me`, `gpts`,
`models` and the rest still come from the seed. `onEvent` is read through a
ref, so an inline function is fine.

### The seed

```ts
interface ChatGPTSeed {
  me: { name: string; email?: string; photo?: string; initials?: string; color?: string }; // required
  workspace?: string;             // "Acme workspace"
  plan?: string;                  // "Team", "Plus"
  models?: { id: string; name: string; description?: string; label?: string; legacy?: boolean }[]; // DEFAULT_MODELS
  model?: string;                 // model id picked at the start; the first by default
  gpts?: {
    id: string; name: string; description?: string;
    author?: { name: string; photo?: string }; color?: string;
    glyph?: "code" | "pen" | "chart" | "headset" | "checklist" | "sparkle";
    pinned?: boolean; starters?: string[];
  }[];
  projects?: { id: string; name: string; open?: boolean }[];
  chats?: ChatGPTChatInput[];
  recentFiles?: { name: string; type?: string; when?: string }[];
  greeting?: string | string[];
  suggestions?: {
    label: string; insert?: string; tool?: ChatGPTTool;
    icon?: "doc" | "code" | "bulb" | "chart" | "image" | "globe" | "sparkle";
  }[];
  open?: string;                  // chat id on screen at the start; a new chat by default
  theme?: "light" | "dark";
  disclaimer?: string;
}

interface ChatGPTChatInput {
  id: string; title: string;      // required
  at?: number | string;           // ms or date string; now by default
  project?: string; gpt?: string; archived?: boolean;
  messages?: ChatGPTMessageInput[];
}

type ChatGPTMessageInput =
  | { role: "user"; id?: string; text: string; files?: ChatGPTFile[] }
  | ({ role: "assistant"; id?: string; feedback?: "up" | "down" | null } &
      (ChatGPTAnswerInput | { versions: ChatGPTAnswerInput[]; v?: number }));

interface ChatGPTAnswerInput {
  text: string;                   // markdown
  thought?: { seconds: number; notes?: string[] };
  sources?: { name: string; host: string; color?: string }[];
  image?: { src: string; alt?: string };
  followups?: string[];
  model?: string;
}

interface ChatGPTFile { name: string; type?: string }   // type: "pdf", "csv"...; from the name by default
type ChatGPTTool = "image" | "research" | "search";
```

### What code can do

Every function is stable across renders and reads the latest state, so it is
safe to call from timers and after `await`.

```ts
chatgpt.respond(chatId: string, markdown: string, options?: RespondOptions): Promise<RespondResult>
  // The assistant answers. Fills the reply the person is waiting for (the pending
  // one after a prompt, edit or regenerate), or adds a new assistant message.
  // Resolves { messageId: string; stopped: boolean } when all of it is on screen
  // or they pressed stop. Rejects if the chat (or `options.to`) does not exist.
chatgpt.appendChat(chat: ChatGPTChatInput): void   // adds a chat, or replaces the one with its id
chatgpt.open(chatId: string | null): void          // show a chat; null (or an unknown id) = new chat
chatgpt.rename(chatId: string, title: string): void
chatgpt.draft(text: string): void                  // set the composer's text (React setState)
chatgpt.toast(text: string, icon?: "check" | "archive" | "trash" | "folder" | "download"): void
chatgpt.setTheme(theme: "light" | "dark"): void

interface RespondOptions {
  stream?: boolean;                          // word by word; default true
  status?: string | { text: string; sub?: string; ms?: number }[];  // shimmer before the words
  thought?: { seconds: number; notes?: string[] } | true;           // true counts the wait
  sources?: ChatGPTSource[];
  image?: ChatGPTImage;                      // "Creating image", then the picture
  imageMs?: number;                          // default 4800
  followups?: string[];
  model?: string;                            // the picked model by default
  title?: string;                            // the chat's title while it is "New chat"
  to?: string;                               // an assistant message id to answer; the pending one by default
}
```

Read-only properties:

```ts
chatgpt.state: ChatGPTState                // save this; see State below
chatgpt.chat: ChatGPTChat | null           // the chat on screen
chatgpt.generating: Generation | null      // { chatId, messageId, phase, status, sub, shown }
chatgpt.composer: { text: string; files: ChatGPTFile[]; tool: ChatGPTTool | null }
chatgpt.toasts: { id: number; text: string; icon?: string }[]
chatgpt.seed: ChatGPTSeed
chatgpt.models: ChatGPTModel[]
chatgpt.ui                                 // internal: the handlers <ChatGPT> wires; do not call
```

Only one answer is written at a time: a `respond` for another message
finishes the current one at once, and the person cannot send while an
answer is pending. If they press stop before you respond, `respond` resolves
`{ stopped: true }` without writing anything.

### Events

```ts
type ChatGPTEvent =
  | { type: "prompt"; chatId: string; messageId: string; text: string; model: string;
      tool: ChatGPTTool | null; attachments: ChatGPTFile[]; gpt: string | null;
      project: string | null; temporary: boolean; fresh: boolean }   // answer with respond
  | { type: "edit"; chatId: string; messageId: string; text: string; model: string }  // answer with respond
  | { type: "regenerate"; chatId: string; messageId: string; prompt: string;
      mode: "again" | "details" | "concise" | "search"; model: string }                // answer with respond
  | { type: "stop"; chatId: string; messageId: string }
  | { type: "feedback"; chatId: string; messageId: string; value: "up" | "down" | null; reason?: string }
  | { type: "open"; chatId: string }
  | { type: "new-chat"; gpt: string | null; temporary: boolean }
  | { type: "rename"; chatId: string; title: string }
  | { type: "archive"; chatId: string }
  | { type: "delete"; chatId: string }
  | { type: "move"; chatId: string; project: string | null }
  | { type: "share"; chatId: string; access: "workspace" | "private" }
  | { type: "model"; model: string }
  | { type: "pin-gpt"; gpt: string; pinned: boolean }
  | { type: "dictate" }                                     // put words in with chatgpt.draft
  | { type: "voice"; action: "start" | "end" | "mute" | "unmute" }
  | { type: "action"; kind: string; label?: string; id?: string };
  // action kinds: "library", "explore", "new-project", "project", "read-aloud", "copy",
  // "code-edit", "image-download", "image-edit", "report", "account"
```

In `prompt`, `messageId` is the user's message; the pending reply is the
next message. In `regenerate`, `messageId` is the answer being redone (a new
version of it is pending). World calls do not emit events.

### State

`chatgpt.state` is plain JSON (`structuredClone`-safe), so it can go straight
into `casuro.store.set(...)`. An answer lands in it when it finishes or is
stopped, not word by word.

```ts
interface ChatGPTState {
  version: 1;
  chats: ChatGPTChat[];          // including temporary chats
  projects: { id: string; name: string; open?: boolean }[];
  pinned: string[];              // GPT ids
  chat: string | null;           // on screen; null = new chat
  gpt: string | null;
  temporary: boolean;
  model: string;
  sidebar: boolean;
  closed: string[];              // collapsed sidebar sections
  theme: "light" | "dark";
  seq: number;
}

interface ChatGPTChat {
  id: string; title: string; at: number; project: string | null; gpt: string | null;
  archived: boolean; temporary: boolean; messages: ChatGPTMessage[];
}
type ChatGPTMessage =
  | { id: string; role: "user"; v: number; versions: { text: string; files: ChatGPTFile[]; tail?: ChatGPTMessage[] | null }[] }
  | { id: string; role: "assistant"; v: number; versions: (ChatGPTAnswerInput & { stopped?: boolean; tail?: ChatGPTMessage[] | null })[];
      feedback: "up" | "down" | null };
```

A message's shown text is `m.versions[m.v].text`. To restore, pass the same
seed and `{ restore: saved }` on mount. An answer still being written, the
composer's text and toasts are not saved.

### The component

```ts
interface ChatGPTProps {
  chatgpt: ChatGPTApp;          // required: the hook's return
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a definite height. It needs no
provider and no global CSS; it imports `chatgpt.css` itself.

### Wiring it in an episode

The kit writes no answers: turn the chat into LLM messages, call
`casuro.llm`, and hand the text to `respond`.

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { ChatGPT, useChatGPT, type ChatGPTSeed, type ChatGPTState } from "./apps/chatgpt";

const seed: ChatGPTSeed = {
  me: { name: "Sam Rivera", email: "sam@northwind.com" },
  workspace: "Northwind workspace",
  plan: "Team",
  chats: [
    { id: "c1", title: "Churn numbers", at: Date.now() - 3_600_000, messages: [
      { role: "user", text: "Summarise Q3 churn by plan" },
      { role: "assistant", text: "| Plan | Churn |\n| --- | --- |\n| Team | 2.1% |\n| Pro | 4.8% |" },
    ] },
  ],
};

const SYSTEM = "You are ChatGPT. Answer in markdown. The user works at Northwind.";

// The conversation before a message, as LLM messages. `state` in onEvent is
// the last render's, which does not have the prompt just sent yet, so the
// prompt is added from the event (see the note below).
function before(state: ChatGPTState, chatId: string, messageId: string) {
  const messages = state.chats.find((c) => c.id === chatId)?.messages ?? [];
  const i = messages.findIndex((m) => m.id === messageId);
  return (i < 0 ? messages : messages.slice(0, i))
    .map((m) => ({ role: m.role, content: m.versions[m.v].text }))
    .filter((m) => m.content);
}

export function ChatGPTScene() {
  const [saved, setSaved] = useState<ChatGPTState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ chatgpt?: ChatGPTState }>().then((s) => setSaved(s?.chatgpt ?? null));
  }, []);
  if (saved === undefined) return null;          // wait: restore is read on mount only
  return <Assistant restore={saved} />;
}

function Assistant({ restore }: { restore: ChatGPTState | null }) {
  const chatgpt = useChatGPT(seed, {
    restore,
    async onEvent(event) {
      if (event.type === "prompt" || event.type === "edit" || event.type === "regenerate") {
        const text = event.type === "regenerate" ? event.prompt : event.text;
        casuro.track.message({ from: "candidate", to: "ChatGPT", channel: "chatgpt", text });
        const messages = before(chatgpt.state, event.chatId, event.messageId);
        if (event.type !== "regenerate") messages.push({ role: "user", content: text });
        const reply = await casuro.llm([{ role: "system", content: SYSTEM }, ...messages], { persona: "ChatGPT" });
        const { stopped } = await chatgpt.respond(event.chatId, reply, { status: "Thinking", thought: true });
        casuro.track.message({ from: "ChatGPT", to: "candidate", channel: "chatgpt", text: stopped ? "(stopped)" : reply });
      }
      if (event.type === "feedback" && event.value) {
        casuro.track.decision({ summary: `Rated an answer ${event.value}${event.reason ? `: ${event.reason}` : ""}` });
      }
    },
  });

  // Timed: 45s in, a colleague shares a chat that lands in the history.
  useEffect(() => {
    const id = setTimeout(() => {
      chatgpt.appendChat({
        id: "shared-priya", title: "Priya: churn drivers", at: Date.now(),
        messages: [
          { role: "user", text: "What drives Pro churn?" },
          { role: "assistant", text: "Mostly **seat downgrades** after the price change." },
        ],
      });
      chatgpt.toast("Priya shared a chat with you", "check");
    }, 45_000);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save everything that changed (answers land when finished).
  useEffect(() => {
    void casuro.store.set({ chatgpt: chatgpt.state });
  }, [chatgpt.state]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <ChatGPT chatgpt={chatgpt} />
    </div>
  );
}
```

`onEvent` fires synchronously inside the kit's handler, so `chatgpt.state`
seen from it is the last render's: for a `prompt` it does not hold the new
prompt yet, for an `edit` it still holds the old text, and for a
`regenerate` it still holds the old answer. That is why the example takes
the conversation before `event.messageId` and adds the prompt from the
event.

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
