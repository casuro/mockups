// The Google Docs app's data. A `DocsSeed` is the document as it opens:
// who is in it, what it says, the comments and suggested edits on it.
// `DocsState` is what changes while someone uses it; it is plain JSON, so it
// can be saved and handed back to `useGoogleDocs` to pick up where they left off.

export interface DocsPerson {
  name: string;
  email?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's first letter by default. */
  initials?: string;
  /** Their presence ring and cursor color. */
  color?: string;
}

/**
 * A paragraph's text. Plain text, with a little markup: **bold**, *italic*,
 * [a link](https://...), and a line break for "\n". Runs of spaces are kept.
 */
export type DocsText = string;

/** One block of the document, top to bottom. */
export type DocsBlock =
  | { type: "title"; text: DocsText }
  | { type: "subtitle"; text: DocsText }
  | { type: "p" | "h1" | "h2" | "h3"; text: DocsText }
  | { type: "ul" | "ol"; items: DocsText[] }
  /** The header row is bold on grey. */
  | { type: "table"; header?: DocsText[]; rows: DocsText[][] }
  /** Anything else, as HTML (it is edited like the rest). */
  | { type: "html"; html: string };

/** The document's body: blocks, or an HTML string (as a `DocsState` keeps it). */
export type DocsContent = DocsBlock[] | string;

export type DocsMode = "Editing" | "Suggesting" | "Viewing";
export type DocsRole = "Owner" | "Editor" | "Commenter" | "Viewer";

export interface DocsReplyInput {
  /** A person's id from `people`. */
  from: string;
  /** When: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** "@Full Name" of anyone in `people` shows as a mention. */
  text: string;
}

export interface DocsCommentSeed extends DocsReplyInput {
  id?: string;
  /** The text it is on: its first match in the document is highlighted. */
  anchor: string;
  replies?: DocsReplyInput[];
}

export interface DocsSuggestionSeed {
  id?: string;
  from: string;
  at?: number | string;
  /** The text to replace: its first match is struck through. */
  replace: string;
  /** What it becomes, in green after it. Empty to suggest deleting it. */
  with: string;
  replies?: DocsReplyInput[];
}

export interface DocsSeed {
  /** The signed-in person's id. */
  me: string;
  people: Record<string, DocsPerson>;
  document: {
    title: string;
    content: DocsContent;
    /** A person id; the signed-in person by default. */
    owner?: string;
    /** Where it lives, for the Move button: "Product / PRDs" shows as "My Drive / Product / PRDs". */
    folder?: string;
    /** What Copy link copies. */
    url?: string;
    starred?: boolean;
  };
  /** Who else has it open (their faces at the top), and where their cursor sits: after this text. */
  collaborators?: { id: string; cursor?: string }[];
  comments?: DocsCommentSeed[];
  suggestions?: DocsSuggestionSeed[];
  /** The Share dialog. */
  share?: {
    /** Everyone with access and their role, in order; the owner comes first by default. */
    people?: Record<string, DocsRole>;
    /** General access: a group ("Northwind") and what anyone in it with the link can do. */
    general?: { name: string; role: DocsRole; description?: string };
  };
  mode?: DocsMode;
  theme?: "light" | "dark";
}

export interface DocsReply {
  id: string;
  from: string;
  at: number;
  text: string;
}

/** A comment on highlighted text, or a suggested edit, with its replies. */
export interface DocsThread {
  id: string;
  kind: "comment" | "suggestion";
  from: string;
  at: number;
  /** The comment; empty for a suggestion. */
  text: string;
  /** A suggestion's old and new text. */
  replace?: string;
  with?: string;
  replies: DocsReply[];
  /** Open until resolved (a comment) or accepted or rejected (a suggestion). */
  status: "open" | "resolved" | "accepted" | "rejected";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface DocsState {
  version: 1;
  title: string;
  /**
   * The document body as HTML. Comments are `<span class="hl" data-c="id">`
   * around their text; a suggestion is `<del class="sg-del" data-s="id">`
   * and `<ins class="sg-ins" data-s="id">`.
   */
  html: string;
  starred: boolean;
  mode: DocsMode;
  threads: DocsThread[];
  /** Collaborators with the document open, in order. */
  present: string[];
  /** Where each collaborator's cursor sits: after this text. */
  cursors: Record<string, string>;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type DocsEvent =
  /** They typed or formatted; sent a moment after they stop. */
  | { type: "edit"; html: string; text: string }
  | { type: "comment"; id: string; anchor: string; text: string }
  | { type: "reply"; id: string; text: string }
  | { type: "resolve"; id: string }
  | { type: "accept"; id: string }
  | { type: "reject"; id: string }
  | { type: "mode"; mode: DocsMode }
  | { type: "rename"; title: string }
  | { type: "star"; starred: boolean }
  | { type: "share"; action: "open" | "copy-link" | "done" }
  /** A menu item or button the kit only acknowledges with a toast. */
  | { type: "action"; label: string; menu?: string };
