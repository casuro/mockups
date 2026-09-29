// The Notion app's data. A `NotionSeed` is the workspace as it opens: who
// is in it, its teamspaces, and its pages with their blocks. `NotionState`
// is what changes while someone uses it; it is plain JSON, so it can be
// saved and handed back to `useNotion` to pick up where they left off.

/** Notion's nine colors, for block text, block backgrounds and database tags. */
export type NotionColor = "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";

export interface NotionPerson {
  name: string;
  /** Shown in the share menu and the workspace menu. */
  email?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's first letter by default. */
  initials?: string;
  color?: string;
}

export interface NotionTeamspace {
  id: string;
  name: string;
  /** An emoji. */
  icon: string;
  /** The icon's tile. Default gray. */
  color?: NotionColor;
}

/**
 * The text of a block, a title cell or a table cell, in a small markup:
 *
 * - `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``
 * - `[label](https://...)` a link, `[label](color:gray)` colored text
 * - `[label](comment:threadId)` a comment highlight (see `comments`)
 * - `@personId` a person mention, `@2026-10-10` a date mention,
 *   `[[pageId]]` a page mention (its icon and title, and it opens the page)
 * - `\` before any of `*~`[]@\` keeps it literal.
 */
export type RichText = string;

export type CodeLanguage = "plain" | "bash" | "sql" | "javascript";

/** What a block is. Every block may also have `children`, drawn indented under it. */
export type NotionBlockData =
  | { type: "text" | "h1" | "h2" | "h3" | "bullet" | "number" | "quote"; text?: RichText }
  | { type: "todo"; text?: RichText; checked?: boolean }
  /** Its `children` show only while it is `open`. */
  | { type: "toggle"; text?: RichText; open?: boolean }
  /** `icon` is an emoji (💡 by default). The box is gray unless `background` says otherwise. */
  | { type: "callout"; text?: RichText; icon?: string }
  | { type: "divider" }
  /** Plain text, highlighted for bash and SQL. */
  | { type: "code"; text?: string; language?: CodeLanguage }
  /** A simple table: rows of cells in `RichText`; `header` makes the first row a header. */
  | { type: "table"; rows: RichText[][]; header?: boolean }
  /** A picture by URL, or one of the kit's drawn stand-ins (`sketch`). */
  | { type: "image"; src?: string; sketch?: NotionSketch; caption?: string }
  /** A link card. `icon` is the letter on its favicon, the host's first letter by default. */
  | { type: "bookmark"; url: string; title: string; description?: string; icon?: string }
  /** The page's headings, as links. */
  | { type: "toc" }
  /** A database page, drawn inline as its table. */
  | { type: "database"; database: string }
  /** A link to another page. */
  | { type: "page"; page: string }
  /** Anything else, drawn by the `renderBlock` prop of <Notion> (an embed, a chart, a form). */
  | { type: "custom"; kind: string; data?: unknown };

/** A drawn stand-in for an image: three phone screens, or boxes with a label and a subtitle each. */
export type NotionSketch = "phones" | { boxes: [string, string?][] };

export type NotionBlockType = NotionBlockData["type"];

interface BlockCommon {
  /** Text color. */
  color?: NotionColor;
  /** Background color. */
  background?: NotionColor;
}

export type NotionBlockInput = NotionBlockData & BlockCommon & { id?: string; children?: NotionBlockInput[] };
export type NotionBlock = NotionBlockData & BlockCommon & { id: string; children: NotionBlock[] };

/** A database column. */
export interface NotionProperty {
  id: string;
  name: string;
  /** One `title` column holds the row's page title. */
  type: "title" | "status" | "select" | "multi" | "person" | "date" | "text";
  /** Column width in px. */
  width?: number;
  /** For status, select and multi. `done` marks a status whose rows are never overdue. */
  options?: { name: string; color?: NotionColor | "default"; done?: boolean }[];
}

/** A row's cell: an option name, option names, person ids, an ISO date ("2026-10-10") or text. */
export type NotionValue = string | string[];

export interface NotionShare {
  /** A person's id. */
  person: string;
  /** "Full access", "Can edit", "Can comment", "Can view". */
  access: string;
}

export interface NotionPageSeed {
  id: string;
  title?: string;
  /** An emoji; a page icon is drawn when missing. */
  icon?: string;
  /** "blueprint" or "nebula", or any CSS background ("linear-gradient(...)"), or a picture URL. */
  cover?: string;
  /** The cover's vertical position, 0 to 100. Default 50. */
  coverY?: number;
  /** A teamspace id, a page id (a subpage, or a row when that page is a database), or "private" (the default). */
  parent?: string;
  /** Who last edited it; `me` by default. */
  by?: string;
  /** When it was last edited: ms or a date string. An hour ago by default. */
  edited?: number | string;
  /** People viewing it now, shown at the top right. */
  presence?: string[];
  /** Who it is shared with; the signed-in person with full access by default. */
  share?: NotionShare[];
  /** The general access line in the share menu: "Can edit" by default. */
  access?: string;
  /** Full width. */
  full?: boolean;
  blocks?: NotionBlockInput[];
  /** Makes it a database: its columns. Its rows are the pages whose `parent` is it. */
  database?: { properties: NotionProperty[] };
  /** A row's cells, by property id. The title column is the page's `title`. */
  properties?: Record<string, NotionValue>;
}

export interface NotionComment {
  /** A person's id. */
  from: string;
  text: string;
  at?: number | string;
}

export interface NotionSeed {
  workspace: {
    name: string;
    initial?: string;
    /** Under the name in the workspace menu: "Business Plan · 6 members". */
    plan?: string;
    /** Only emails at this domain can be invited ("northwind.com"). Anyone, when missing. */
    domain?: string;
    /** Page links are this plus "/" and the page id. Default "https://www.notion.so/<name>". */
    url?: string;
  };
  /** The signed-in person's id. */
  me: string;
  people: Record<string, NotionPerson>;
  teamspaces?: NotionTeamspace[];
  /** Every page, in sidebar order. */
  pages: NotionPageSeed[];
  /** Page ids in the Favorites section. */
  favorites?: string[];
  /** Comment threads by id, for `[text](comment:id)` highlights. */
  comments?: Record<string, NotionComment[]>;
  /** The page on screen at the start; the first page by default. */
  open?: string;
  /** The count on Inbox in the sidebar. */
  inbox?: number;
  theme?: "light" | "dark";
}

export interface NotionPage extends Omit<NotionPageSeed, "blocks" | "edited" | "by" | "presence" | "share" | "access" | "parent" | "title"> {
  title: string;
  parent: string;
  by: string;
  edited: number;
  presence: string[];
  share: NotionShare[];
  access: string;
  blocks: NotionBlock[];
}

/** Everything that changes while the app is used. Plain JSON. */
export interface NotionState {
  version: 1;
  /** The page on screen. */
  current: string;
  pages: Record<string, NotionPage>;
  /** Page ids in sidebar order. */
  order: string[];
  favorites: string[];
  /** Open carets in the sidebar: teamspace ids, and "<section>:<pageId>". */
  expanded: string[];
  /** The sidebar is closed (⌘\). */
  collapsed: boolean;
  comments: Record<string, (NotionComment & { at: number })[]>;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type NotionEvent =
  | { type: "open"; page: string }
  /** They stopped typing in a block for a moment. `cell` is [row, column] in a table. */
  | { type: "edit"; page: string; block: string; text: string; cell?: [number, number] }
  | { type: "rename"; page: string; title: string }
  | { type: "insert"; page: string; block: string; blockType: NotionBlockType; after: string }
  /** From the "/" menu or a markdown shortcut ("# ", "- ", "[] "...). */
  | { type: "turn-into"; page: string; block: string; from: NotionBlockType; to: NotionBlockType }
  | { type: "delete"; page: string; block: string }
  | { type: "todo"; page: string; block: string; checked: boolean }
  | { type: "toggle"; page: string; block: string; open: boolean }
  | { type: "share"; page: string; action: "invite"; email: string }
  | { type: "share"; page: string; action: "copy-link"; url: string }
  | { type: "favorite"; page: string; on: boolean }
  | { type: "comment"; page: string; thread: string }
  /** Anything the kit only draws: "Search", "Add cover", "Board view", "Open row"... `id` is a page or block. */
  | { type: "action"; name: string; page: string; id?: string };
