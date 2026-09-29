// The ChatGPT app's data. A `ChatGPTSeed` is the app as it opens: who is
// signed in, their GPTs and projects, and the chats already in the history.
// `ChatGPTState` is what changes while someone uses it; it is plain JSON, so
// it can be saved and handed back to `useChatGPT` to pick up where they left
// off. The kit never writes an answer itself: every assistant reply comes
// from outside, through `chatgpt.respond(...)`.

/** An attached file: its name and its type, usually the extension ("pdf", "csv", "png"). */
export interface ChatGPTFile {
  name: string;
  /** "pdf", "csv", "xlsx", "docx", "png", "jpg", "md", "txt", "js", "sql"... Picks the chip's icon and label. From the name when left out. */
  type?: string;
}

/** A file offered in the "Add files" picker. */
export interface ChatGPTRecentFile extends ChatGPTFile {
  /** "Edited yesterday", "Shared by Priya" */
  when?: string;
}

/** A web source under an answer, in the "Sources" pill and menu. */
export interface ChatGPTSource {
  name: string;
  /** "docs.example.com" */
  host: string;
  /** The dot's color. */
  color?: string;
}

/** A picture in an answer (a generated image). */
export interface ChatGPTImage {
  /** Any image URL: https, data: or blob:. */
  src: string;
  alt?: string;
}

/** The "Thought for 9s" line above an answer, and what it opens to. */
export interface ChatGPTThought {
  seconds: number;
  /** Paragraphs shown when it is opened. */
  notes?: string[];
}

/** One version of an assistant answer. */
export interface ChatGPTAnswerInput {
  /** Markdown: headings, **bold**, *italic*, `code`, fenced code blocks, tables, lists, > quotes, [links](https://...). */
  text: string;
  thought?: ChatGPTThought;
  sources?: ChatGPTSource[];
  image?: ChatGPTImage;
  /** Suggested next prompts under the last answer. */
  followups?: string[];
  /** The model's id that wrote it ("Used ChatGPT 5 Thinking" in the try-again menu). */
  model?: string;
}

export type ChatGPTMessageInput =
  | { role: "user"; id?: string; text: string; files?: ChatGPTFile[] }
  | ({ role: "assistant"; id?: string; feedback?: "up" | "down" | null } & (
      | ChatGPTAnswerInput
      /** Several versions (the "2/2" switcher); `v` is the one shown, the last by default. */
      | { versions: ChatGPTAnswerInput[]; v?: number }
    ));

export interface ChatGPTChatInput {
  id: string;
  title: string;
  /** Last activity: ms or a date string. Groups the history (Today, Yesterday, Previous 7 days...). Now, when left out. */
  at?: number | string;
  /** A project's id: the chat sits under that project in the sidebar. */
  project?: string;
  /** A GPT's id: the chat was with that GPT. */
  gpt?: string;
  archived?: boolean;
  messages?: ChatGPTMessageInput[];
}

/** The small glyph drawn on a GPT's colored circle. */
export type ChatGPTGlyph = "code" | "pen" | "chart" | "headset" | "checklist" | "sparkle";

export interface ChatGPTGpt {
  id: string;
  name: string;
  description?: string;
  /** Who made it, under its name on the GPT's start screen. */
  author?: { name: string; photo?: string };
  /** The circle's color. */
  color?: string;
  glyph?: ChatGPTGlyph;
  /** Listed in the sidebar under GPTs. */
  pinned?: boolean;
  /** Up to four prompts on its start screen. */
  starters?: string[];
}

export interface ChatGPTProject {
  id: string;
  name: string;
  /** Its chats are shown under it in the sidebar. */
  open?: boolean;
}

export interface ChatGPTModel {
  id: string;
  /** "Thinking" in the menu. */
  name: string;
  /** "Thinks longer for better answers" */
  description?: string;
  /** What follows "ChatGPT" in the top bar: "5 Thinking". Default `name`. */
  label?: string;
  /** Listed under "Legacy models". */
  legacy?: boolean;
}

/** A suggestion chip on the empty screen. */
export interface ChatGPTSuggestion {
  label: string;
  /** Put in the composer when clicked. */
  insert?: string;
  /** Turn on a tool when clicked instead ("Create image"). */
  tool?: ChatGPTTool;
  icon?: "doc" | "code" | "bulb" | "chart" | "image" | "globe" | "sparkle";
}

export type ChatGPTTool = "image" | "research" | "search";

export interface ChatGPTSeed {
  /** The signed-in person, in the sidebar's footer. */
  me: { name: string; email?: string; photo?: string; initials?: string; color?: string };
  /** Under the name in the footer ("Acme workspace"), and who a shared link is shared with. */
  workspace?: string;
  /** The tag next to the name ("Team", "Plus"). */
  plan?: string;
  /** Models in the top bar's picker. ChatGPT 5's by default. */
  models?: ChatGPTModel[];
  /** The model picked at the start; the first one by default. */
  model?: string;
  gpts?: ChatGPTGpt[];
  projects?: ChatGPTProject[];
  /** Any order: the sidebar sorts them by `at`. */
  chats?: ChatGPTChatInput[];
  /** Offered by "Add photos & files". */
  recentFiles?: ChatGPTRecentFile[];
  /** The empty screen's heading; a list takes turns each time it shows. */
  greeting?: string | string[];
  suggestions?: ChatGPTSuggestion[];
  /** The chat on screen at the start; a new chat by default. */
  open?: string;
  theme?: "light" | "dark";
  /** The line under the composer. */
  disclaimer?: string;
}

export interface ChatGPTAnswer extends ChatGPTAnswerInput {
  /** Cut short with the stop button. */
  stopped?: boolean;
  /** The conversation after this version, kept while another version is shown. */
  tail?: ChatGPTMessage[] | null;
}

export interface ChatGPTUserVersion {
  text: string;
  files: ChatGPTFile[];
  tail?: ChatGPTMessage[] | null;
}

export type ChatGPTMessage =
  | { id: string; role: "user"; v: number; versions: ChatGPTUserVersion[] }
  | { id: string; role: "assistant"; v: number; versions: ChatGPTAnswer[]; feedback: "up" | "down" | null };

export interface ChatGPTChat {
  id: string;
  title: string;
  at: number;
  project: string | null;
  gpt: string | null;
  archived: boolean;
  /** A temporary chat: never listed in the history. */
  temporary: boolean;
  messages: ChatGPTMessage[];
}

/** Everything that changes while the app is used. Plain JSON. */
export interface ChatGPTState {
  version: 1;
  chats: ChatGPTChat[];
  projects: ChatGPTProject[];
  /** GPT ids pinned in the sidebar. */
  pinned: string[];
  /** The chat on screen, or null for a new chat. */
  chat: string | null;
  /** The GPT a new chat is with. */
  gpt: string | null;
  /** The next new chat is temporary. */
  temporary: boolean;
  model: string;
  /** The sidebar is open (on a wide screen). */
  sidebar: boolean;
  /** Collapsed sidebar sections: "gpts", "projects". */
  closed: string[];
  theme: "light" | "dark";
  seq: number;
}

export type ChatGPTRegenerate = "again" | "details" | "concise" | "search";

/** What the signed-in person does. */
export type ChatGPTEvent =
  /** They send a prompt (typed, a starter, or a follow-up). A new chat has `fresh: true`. Answer with `respond(chatId, ...)`. */
  | { type: "prompt"; chatId: string; messageId: string; text: string; model: string; tool: ChatGPTTool | null; attachments: ChatGPTFile[]; gpt: string | null; project: string | null; temporary: boolean; fresh: boolean }
  /** They edit an earlier prompt and send it: the conversation after it is set aside. Answer with `respond`. */
  | { type: "edit"; chatId: string; messageId: string; text: string; model: string }
  /** "Try again" and the rest of that menu on an answer: a new version of it is waiting. Answer with `respond`. */
  | { type: "regenerate"; chatId: string; messageId: string; prompt: string; mode: ChatGPTRegenerate; model: string }
  /** They press stop while an answer is being written. */
  | { type: "stop"; chatId: string; messageId: string }
  /** Thumbs up or down (null takes it back), and the reason they picked, if any. */
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
  /** They finish dictating: put the words in with `chatgpt.draft(text)`. */
  | { type: "dictate" }
  | { type: "voice"; action: "start" | "end" | "mute" | "unmute" }
  /** Everything else the kit has no behaviour for: "library", "explore", "new-project", "project", "read-aloud", "copy", "code-edit", "image-download", "image-edit", "report", "account". */
  | { type: "action"; kind: string; label?: string; id?: string };
