// The Claude Code app's data. A `ClaudeCodeSeed` is the app as it opens:
// who is signed in, which repositories they work in, and the sessions
// already there with their transcripts. `ClaudeCodeState` is what changes
// while someone uses it; it is plain JSON, so it can be saved and handed
// back to `useClaudeCode` to pick up where they left off.
//
// The kit never runs an agent itself. What Claude does in a session (text,
// tool calls, permission prompts, plans) comes from outside, through the
// calls `useClaudeCode` returns.

/** A session's state, shown in the sidebar and the composer. */
export type SessionStatus = "idle" | "running" | "input" | "done";
/** What Claude may do without asking. */
export type PermissionMode = "ask" | "auto" | "plan";
/** Where a session runs: on this machine, or in a cloud environment. */
export type Env = "local" | "cloud";
/** Syntax highlighting for code, diffs and file reads. */
export type Lang = "ts" | "sql" | "css" | "sh" | "text";
export type Pane = "diff" | "terminal" | "preview";

export interface Model {
  id: string;
  /** "Opus 5.5" */
  name: string;
  /** One line under the name in the model menu. */
  desc?: string;
}

export interface RepoSeed {
  /** Branches offered in the new-session screen and as a PR's base. "main" first. */
  branches?: string[];
  /** The local checkout, shown in the terminal prompt: "~/code/api". `~/<repo name>` by default. */
  path?: string;
  /** The URL the Preview pane shows for sessions in this repo. */
  previewUrl?: string;
}

/**
 * One hunk of a unified diff: where it starts in the old and new file, and
 * its lines, each prefixed with " " (context), "+" (added) or "-" (removed).
 * A hunk with `oldStart: 0` creates the file.
 */
export interface Hunk {
  oldStart: number;
  newStart: number;
  lines: string;
}

export type PermissionRequest =
  | { kind: "bash"; command: string; /** Why Claude wants to run it. */ why?: string }
  | { kind: "edit"; path: string; hunks: Hunk[]; lang?: Lang };

/** "always" means: always allow this command (bash), or every edit this session (edit). "cancel": the run was stopped. */
export type PermissionAnswer = "once" | "always" | "deny" | "cancel";
/** "approve" also switches the session to Auto-accept edits. */
export type PlanAnswer = "approve" | "keep" | "cancel";

export interface TodoItem {
  text: string;
  status: "done" | "active" | "pending";
}

export interface SearchMatch {
  file: string;
  line: number;
  text: string;
}

export interface TaskStep {
  kind: "read" | "search" | "bash";
  text: string;
}

export interface PrCheck {
  name: string;
  /** Shown once it is done: "1m 12s". */
  duration?: string;
  done: boolean;
}

interface ItemBase {
  /** Made up when left out. Use it with `updateItem`. */
  id?: string;
  /** A tool card, or thinking, is expanded. */
  open?: boolean;
  /** A tool call in progress: a spinner instead of the icon. */
  running?: boolean;
  /** A tool call stopped by the person pressing Stop. */
  interrupted?: boolean;
}

/** One entry of a transcript. */
export type ItemInput = ItemBase &
  (
    | { type: "user"; text: string; attachments?: string[] }
    /** Claude's reply, in markdown: paragraphs, `### headings`, lists, **bold**, `code` and ```fenced blocks```. `streaming` shows the caret. */
    | { type: "text"; text: string; streaming?: boolean }
    /** "Thought for 6s", expandable. `live` shows the shimmering "Thinking..." instead. */
    | { type: "thinking"; text: string; seconds?: number; live?: boolean; verb?: string }
    | { type: "read"; path: string; lines: string[]; /** First line number. Default 1. */ start?: number; lang?: Lang }
    | { type: "search"; pattern: string; /** Where it looked: "src/". */ path: string; matches: SearchMatch[] }
    /** Creates the file when the first hunk has `oldStart: 0`; `deleted` removes it. Lands in the Diff pane once it is not `running`. */
    | { type: "edit"; path: string; hunks: Hunk[]; lang?: Lang; deleted?: boolean }
    /** Exit 130 reads "Interrupted". Leave `exit` out while it runs. */
    | { type: "bash"; command: string; output?: string; exit?: number; seconds?: number }
    | { type: "todo"; todos: TodoItem[] }
    /** A subagent: its steps and, when done, its result (markdown inline: **bold**, `code`). */
    | { type: "task"; agent: string; description: string; steps: TaskStep[]; result?: string; seconds?: number }
    /** Asks before a command or an edit. Unanswered, it waits; see `askPermission`. */
    | { type: "permission"; request: PermissionRequest; answer?: PermissionAnswer }
    /** A proposed plan (markdown), to approve or keep planning; see `proposePlan`. */
    | { type: "plan"; text: string; answer?: PlanAnswer }
    /** A pull request card. The session header links the last one. `reviewers` are ids from `people`. */
    | { type: "pr"; number: number; title: string; base: string; head: string; reviewers?: string[]; checks?: PrCheck[]; draft?: boolean }
    /** A quiet one-line note ("Interrupted", "Reverted `x.ts`"): inline markdown. */
    | { type: "note"; text: string; icon?: "hand" | "undo" | "alert" | "check"; tone?: "error" }
    /** Anything else, drawn by the `renderItem` prop of <ClaudeCode>. */
    | { type: "custom"; kind: string; data?: unknown }
  );

export type Item = ItemInput & { id: string };
export type ItemType = Item["type"];

export interface TerminalEntry {
  command: string;
  output?: string;
}

export interface SessionSeed {
  id?: string;
  title: string;
  /** A key of `repos`: "acme/api". */
  repo: string;
  branch: string;
  env?: Env;
  /** A model id. The first model by default. */
  model?: string;
  mode?: PermissionMode;
  status?: SessionStatus;
  archived?: boolean;
  /** Last activity: ms or a date string. Groups the sidebar (Today, Yesterday, Previous 7 days). Now by default. */
  at?: number | string;
  /** How full the context window is, 0 to 100. */
  context?: number;
  items?: ItemInput[];
  /** What the Terminal pane shows as already run. */
  terminal?: TerminalEntry[];
}

export interface ClaudeCodeSeed {
  /** The signed-in person. */
  me: { name: string; email?: string; /** "Max plan" */ plan?: string; photo?: string };
  /** Teammates, by id: PR reviewers. `photo` is a picture URL, initials otherwise. */
  people?: Record<string, { name: string; photo?: string }>;
  /** The model menu. Opus 5.5, Sonnet 5 and Haiku 4.5 by default. */
  models?: Model[];
  /** Repositories by name ("acme/api"), in picker order. */
  repos: Record<string, RepoSeed>;
  /** In any order: the sidebar sorts them by `at`. */
  sessions: SessionSeed[];
  /** The session on screen at the start, or null for the new-session screen. The first session by default. */
  open?: string | null;
  /** Suggestion chips on the new-session screen. */
  examples?: { repo: string; text: string }[];
  /** The new-session screen's choices at the start. */
  defaults?: { repo?: string; model?: string; mode?: PermissionMode; env?: Env; /** Picked in the pull request dialog. The first two people by default. */ reviewers?: string[] };
  /** The first line of the Terminal pane. "Last login: <3 hours ago> on ttys004" by default. */
  terminalBanner?: string;
  theme?: "light" | "dark";
}

export interface FileChange {
  path: string;
  lang: Lang;
  /** Added, modified or deleted. */
  status: "A" | "M" | "D";
  hunks: Hunk[];
}

export interface SessionState {
  id: string;
  title: string;
  repo: string;
  branch: string;
  env: Env;
  model: string;
  mode: PermissionMode;
  status: SessionStatus;
  archived: boolean;
  at: number;
  context: number;
  items: Item[];
  /** Every applied edit, by file: the Diff pane. */
  changes: FileChange[];
  /** Edit items already folded into `changes`. */
  applied: string[];
  /** The file open in the Diff pane. */
  diffFile: string | null;
  /** Diff line comments by file, then by line key ("0:n14"). */
  comments: Record<string, Record<string, string[]>>;
  terminal: TerminalEntry[];
  /** While running: when the run started, what Claude is doing, and tokens used. */
  run: { startedAt: number; verb: string; tokens: number } | null;
  /** Messages sent while Claude was busy, sent in turn when it stops. */
  queue: string[];
  draft: string;
  attachments: string[];
}

/** Everything that changes while the app is used. Plain JSON. */
export interface ClaudeCodeState {
  version: 1;
  /** The session on screen, or null for the new-session screen. */
  active: string | null;
  sessions: SessionState[];
  panes: Record<Pane, boolean>;
  paneWidth: number;
  diffView: "unified" | "split";
  previewDevice: "desktop" | "tablet" | "mobile";
  sidebarCollapsed: boolean;
  showArchived: boolean;
  /** The new-session screen's choices and draft. */
  draft: { repo: string; branch: string; env: Env; model: string; mode: PermissionMode; text: string; attachments: string[] };
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type ClaudeCodeEvent =
  /** They send a message to Claude (also a queued one, when Claude gets to it). */
  | { type: "prompt"; sessionId: string; text: string; attachments: string[]; queued?: boolean }
  /** They start a session from the new-session screen; its first `prompt` follows. */
  | { type: "newSession"; sessionId: string; repo: string; branch: string; env: Env; model: string; mode: PermissionMode }
  | { type: "permission"; sessionId: string; id: string; answer: PermissionAnswer }
  | { type: "plan"; sessionId: string; id: string; answer: PlanAnswer }
  /** They press Stop (or Esc) while Claude runs. */
  | { type: "stop"; sessionId: string }
  | { type: "open"; sessionId: string | null }
  | { type: "pane"; pane: Pane; open: boolean }
  /** `sessionId` null: the new-session screen's choice. */
  | { type: "model"; sessionId: string | null; model: string }
  | { type: "mode"; sessionId: string | null; mode: PermissionMode }
  /** They pick "Upload a file" or "Add a screenshot": answer with `attach(name)`. */
  | { type: "attach"; sessionId: string | null; kind: "file" | "screenshot" }
  /** They run a command in the Terminal pane: answer with `terminal(sessionId, { output })`. */
  | { type: "terminal"; sessionId: string; command: string }
  /** The PR card `id` is in the transcript with no checks: add them with `updateItem`. */
  | { type: "createPr"; sessionId: string; id: string; number: number; title: string; base: string; head: string; description: string; reviewers: string[]; draft: boolean }
  | { type: "revert"; sessionId: string; path: string }
  /** A comment on a diff line; it is also added to their draft message. */
  | { type: "comment"; sessionId: string; path: string; line: number; text: string }
  | { type: "rename"; sessionId: string; title: string }
  | { type: "archive"; sessionId: string; archived: boolean }
  | { type: "delete"; sessionId: string }
  | { type: "preview"; sessionId: string; action: "reload" | "open"; url: string }
  /** Buttons with nothing else to do: "View PR", "Help & support", "Log out". */
  | { type: "action"; label: string; sessionId?: string };
