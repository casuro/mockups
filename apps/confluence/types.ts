// The Confluence app's data. A `ConfluenceSeed` is the space as it opens:
// who is in it, its page tree, what each page says, who liked and commented.
// `ConfluenceState` is what changes while someone uses it; it is plain JSON,
// so it can be saved and handed back to `useConfluence` to pick up where
// they left off.

export interface ConfluencePerson {
  name: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the first letters of the name by default. */
  initials?: string;
  color?: string;
}

/** A lozenge's color: grey by default. */
export type LozengeColor = "grey" | "blue" | "green" | "yellow";

/** A Jira issue that page text can show as a smart link: `{jira:CAS-912}`. */
export interface ConfluenceIssue {
  summary: string;
  /** The status lozenge: "In Review", "Done". */
  status: string;
  color?: LozengeColor;
}

/**
 * A page's content, one block after another. Every `text` (and every table
 * cell, list item and checklist item) is rich text:
 *
 * - `*bold*` and `` `code` ``
 * - `@personId`: a mention; the signed-in person's own is highlighted
 * - `[[pageId]]` or `[[pageId|label]]`: a link to another page of the space
 * - `{status:Approved}` or `{status:Approved|green}`: a status lozenge
 * - `{jira:CAS-912}`: the issue from `seed.issues`, as a smart link
 */
export type ConfluenceBlock =
  /** Level 2 headings (the default) are listed under "On this page". */
  | { type: "heading"; text: string; level?: 2 | 3; id?: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  /** A colored panel with its icon. */
  | { type: "panel"; tone: "info" | "note" | "warning" | "success"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  /** Line numbers, comments (`--`, `//`) and strings; `language: "sql"` also colors SQL keywords. */
  | { type: "code"; code: string; language?: string }
  /** A checklist; the signed-in person can tick items. */
  | { type: "tasks"; items: ConfluenceTask[] }
  /** Anything else, drawn by the `renderBlock` prop of <Confluence> (a chart, an embed, a form). */
  | { type: "custom"; kind: string; data?: unknown };

export interface ConfluenceTask {
  text: string;
  done?: boolean;
}

export interface ConfluenceReaction {
  emoji: string;
  count: number;
  /** The signed-in person reacted with it. */
  mine?: boolean;
}

export interface ConfluenceCommentInput {
  id?: string;
  /** A person's id from `people`. */
  from: string;
  /** When it was posted: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** Rich text, as in blocks. */
  text: string;
}

export interface ConfluenceComment {
  id: string;
  from: string;
  at: number;
  text: string;
}

export interface ConfluencePageSeed {
  /** Unique within the space; used by `[[pageId]]` links and the world calls. */
  id: string;
  title: string;
  /** A person's id; the byline. The signed-in person by default. */
  author?: string;
  /** "Last updated": a timestamp in ms or a date string. Now by default. */
  updated?: number | string;
  /** "6 min read"; worked out from the words by default. */
  readTime?: string;
  blocks?: ConfluenceBlock[];
  /** Person ids who like it, in order. */
  likes?: string[];
  /** The emoji pills next to Like. */
  reactions?: ConfluenceReaction[];
  comments?: ConfluenceCommentInput[];
  starred?: boolean;
  /** Child pages, in tree order. */
  children?: ConfluencePageSeed[];
}

export interface ConfluenceSeed {
  space: {
    name: string;
    /** The small line under the space name: the site or company. */
    site?: string;
    /** The letter on the space icon; the name's first by default. */
    initial?: string;
  };
  /** The signed-in person's id. */
  me: string;
  people: Record<string, ConfluencePerson>;
  /** The page tree, top level first, in sidebar order. */
  pages: ConfluencePageSeed[];
  /** Issues that `{jira:KEY}` can show. */
  issues?: Record<string, ConfluenceIssue>;
  /** The page on screen at the start; the first page by default. */
  open?: string;
  /** Pages whose children show in the sidebar; the open page's parents by default. */
  expanded?: string[];
  /** The red count on the bell. None when 0 or left out. */
  notifications?: number;
  theme?: "light" | "dark";
}

export interface ConfluencePage {
  id: string;
  title: string;
  /** The parent page's id, or null at the top level. */
  parent: string | null;
  /** Child page ids, in order. */
  children: string[];
  author: string;
  updated: number;
  readTime?: string;
  blocks: ConfluenceBlock[];
  likes: string[];
  reactions: ConfluenceReaction[];
  comments: ConfluenceComment[];
  starred: boolean;
}

/** Everything that changes while the app is used. Plain JSON. */
export interface ConfluenceState {
  version: 1;
  /** The page on screen. */
  current: string;
  /** Top-level page ids, in sidebar order. */
  roots: string[];
  pages: Record<string, ConfluencePage>;
  /** Pages whose children show in the sidebar. */
  expanded: string[];
  notifications: number;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type ConfluenceEvent =
  | { type: "open"; pageId: string }
  | { type: "like"; pageId: string; liked: boolean }
  | { type: "react"; pageId: string; emoji: string; added: boolean }
  | { type: "comment"; pageId: string; text: string; id: string }
  /** `block` is the checklist's index in the page's blocks, `item` the item's index in it. */
  | { type: "check"; pageId: string; block: number; item: number; text: string; done: boolean }
  | { type: "star"; pageId: string; starred: boolean }
  | { type: "search"; query: string }
  | {
      type: "action";
      kind: "edit" | "share" | "more" | "create" | "add-page" | "home" | "recent" | "spaces" | "overview" | "blogs" | "notifications" | "jira" | "reply" | "like-comment";
      pageId?: string;
      /** The issue key, for "jira"; the comment id, for "reply" and "like-comment". */
      id?: string;
    };
