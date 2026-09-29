// The Jira app's data. A `JiraSeed` is the project as it opens: who works
// on it, its sprints and its issues. `JiraState` is what changes while
// someone uses it; it is plain JSON, so it can be saved and handed back to
// `useJira` to pick up where they left off.

export type IssueType = "story" | "bug" | "task" | "epic" | "subtask";
export type Priority = "highest" | "high" | "medium" | "low" | "lowest";
/** The colour family of a status: its lozenge, its button, and "done" strikes the key through. */
export type StatusTone = "todo" | "inprogress" | "review" | "done";
export type EpicColor = "purple" | "orange" | "lime" | "blue";
/** A timestamp in ms, or a date string ("2026-09-21T09:00"). */
export type When = number | string;

export interface JiraPerson {
  name: string;
  email?: string;
  /** Job title, shown in people pickers and the Teams menu. */
  role?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  color?: string;
}

export interface JiraStatus {
  /** "todo", "inprogress": what issues store in `status`. */
  id: string;
  /** "In Progress": the column title and the lozenge text. */
  name: string;
  /** The colours; the status's id when that is a tone, "todo" otherwise. The last status is where done work goes. */
  tone?: StatusTone;
  /** A column limit: the column turns red above it. */
  limit?: number;
}

export interface JiraSprintInput {
  id: string;
  name: string;
  start?: When;
  end?: When;
  /** One sprint at most is active: the board shows it. Future sprints wait in the backlog. */
  state: "active" | "future" | "closed";
  goal?: string;
}

export interface JiraVersionInput {
  id: string;
  name: string;
  date?: When;
  released?: boolean;
}

export interface JiraCommentInput {
  id?: string;
  from: string;
  at?: When;
  /** Plain text. "@Full Name" of a person shows as a mention. */
  text: string;
  edited?: boolean;
}

export interface JiraChangeInput {
  /** Who made the change. */
  by: string;
  /** "Status", "Assignee", "Sprint"...: the field's display name. */
  field: string;
  from?: string;
  to?: string;
  at?: When;
}

export interface JiraWorkInput {
  by: string;
  minutes: number;
  text?: string;
  at?: When;
}

/** The Development panel: a branch, its commits and a pull request. */
export interface JiraDev {
  branch: string;
  commits: number;
  lastCommit?: number;
  pr?: { num: number; state: "open" | "merged"; title: string };
}

export interface JiraLink {
  /** "blocks", "is blocked by", "relates to", "duplicates", "is caused by"... */
  type: string;
  key: string;
}

export interface JiraIssueInput {
  /** "CAS-912". The next free number in the project when left out. */
  key?: string;
  type: IssueType;
  summary: string;
  /** A status id; the first status by default. */
  status?: string;
  /** A person's id, or null for Unassigned. */
  assignee?: string | null;
  /** Who filed it; the signed-in person by default. */
  reporter?: string;
  priority?: Priority;
  points?: number | null;
  labels?: string[];
  /** A sprint id; the backlog when left out. */
  sprint?: string | null;
  /** The parent epic's key. */
  epic?: string | null;
  /** A subtask's parent key (or nest subtasks under `subtasks`). */
  parent?: string | null;
  /** Shows as an impediment: yellow card, red flag. */
  flagged?: boolean;
  /** Version ids. */
  fixVersions?: string[];
  /**
   * The description, as a small HTML subset: <p>, <h3>, <ul>/<ol>/<li>,
   * <strong>, <em>, <code>, <pre>. Plain text becomes a paragraph.
   */
  description?: string;
  comments?: JiraCommentInput[];
  /** Past changes, shown under Activity > History. "created" is added for you. */
  history?: JiraChangeInput[];
  worklog?: JiraWorkInput[];
  links?: JiraLink[];
  /** Person ids; the reporter and assignee by default. */
  watchers?: string[];
  created?: When;
  updated?: When;
  dev?: JiraDev;
  /** An epic's colour: its chips on cards and rows. */
  color?: EpicColor;
  /** Subtasks, created with this issue as their parent. */
  subtasks?: Omit<JiraIssueInput, "type" | "subtasks">[];
  /** Done in an earlier sprint: only in the Issues list. */
  archived?: boolean;
  /** Anything the kit has no field for, drawn by `renderCustom` under the description. */
  custom?: { type: string; data?: unknown };
}

export interface JiraNotificationInput {
  id?: string;
  from: string;
  /** "mentioned you on", "commented on", "changed the status of", "assigned you". */
  verb: string;
  key: string;
  /** A comment, quoted under the line. */
  quote?: string;
  /** A status change: [from, to] status ids. */
  change?: [string, string];
  at?: When;
  read?: boolean;
  /** "direct" (to you) or "watching" (issues you watch). Default "direct". */
  tab?: "direct" | "watching";
}

export interface JiraSeed {
  /** The Atlassian site: "casuro" (casuro.atlassian.net). */
  site: string;
  project: {
    /** The issue key prefix: "CAS". */
    key: string;
    name: string;
    /** "Software project". */
    kind?: string;
    /** The board's name: "CAS board" by default. */
    board?: string;
    /** A picture URL for the project avatar; mountains on `color` otherwise. */
    avatar?: string;
    color?: string;
  };
  /** The signed-in person's id. */
  me: string;
  people: Record<string, JiraPerson>;
  /** The workflow, in board column order. To Do, In Progress, In Review, Done by default. */
  statuses?: JiraStatus[];
  sprints: JiraSprintInput[];
  versions?: JiraVersionInput[];
  /** Labels offered in pickers, besides those on issues. */
  labels?: string[];
  /** Issues in rank order (epics and subtasks included). */
  issues: JiraIssueInput[];
  notifications?: JiraNotificationInput[];
  /** Recently viewed issue keys, for search and the Your work menu. */
  recent?: string[];
  /** The page on screen at the start ("board", "backlog", "list"), and an issue to open over it. */
  open?: { view?: JiraView; issue?: string };
  /** What "now" is when the app opens (relative times, days left in the sprint); the real time by default. It then ticks on. */
  now?: When;
  theme?: "light" | "dark";
}

/** The kit draws "board", "backlog" and "list"; the other sidebar pages are drawn by `renderPage`. */
export type JiraView = "board" | "backlog" | "list" | "timeline" | "reports" | "components" | "code" | "releases" | "pages" | "yourwork";

export interface JiraComment {
  id: string;
  from: string;
  at: number;
  text: string;
  edited: boolean;
}

export interface JiraChange {
  by: string;
  field: string;
  from: string;
  to: string;
  at: number;
}

export interface JiraWork {
  by: string;
  minutes: number;
  text: string;
  at: number;
}

export interface JiraIssue {
  key: string;
  type: IssueType;
  summary: string;
  status: string;
  assignee: string | null;
  reporter: string;
  priority: Priority;
  points: number | null;
  labels: string[];
  sprint: string | null;
  epic: string | null;
  parent: string | null;
  flagged: boolean;
  fixVersions: string[];
  description: string;
  comments: JiraComment[];
  history: JiraChange[];
  worklog: JiraWork[];
  links: JiraLink[];
  watchers: string[];
  created: number;
  updated: number;
  dev: JiraDev | null;
  color?: EpicColor;
  archived?: boolean;
  /** The sprint it was completed in, once that sprint closed. */
  doneSprint?: string;
  custom?: { type: string; data?: unknown };
}

export interface JiraSprint {
  id: string;
  name: string;
  start: number | null;
  end: number | null;
  state: "active" | "future" | "closed";
  goal: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  date: number | null;
  released: boolean;
}

export interface JiraNotification {
  id: string;
  from: string;
  verb: string;
  key: string;
  quote?: string;
  change?: [string, string];
  at: number;
  read: boolean;
  tab: "direct" | "watching";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface JiraState {
  version: 1;
  view: JiraView;
  /** The issue on screen, and whether it is open as a full page rather than a dialog. */
  open: string | null;
  fullPage: boolean;
  issues: Record<string, JiraIssue>;
  /** Rank of the issues on boards and in the backlog (no epics or subtasks). */
  order: string[];
  /** Epic keys, in the order they were made. */
  epics: string[];
  sprints: JiraSprint[];
  versions: JiraVersion[];
  labels: string[];
  notifications: JiraNotification[];
  recent: string[];
  /** The board is starred. */
  starred: boolean;
  theme: "light" | "dark";
  /** The next issue number. */
  nextKey: number;
  seq: number;
}

/** A field the signed-in person can change from the issue's details. */
export type JiraField = "assignee" | "reporter" | "priority" | "points" | "sprint" | "epic" | "labels" | "fixVersions" | "summary" | "description" | "flagged";

/** What the signed-in person does. */
export type JiraEvent =
  | { type: "open"; key: string }
  | { type: "close"; key: string }
  | { type: "view"; view: JiraView }
  | { type: "transition"; key: string; from: string; to: string }
  | { type: "assign"; key: string; from: string | null; to: string | null }
  | { type: "edit"; key: string; field: JiraField; from: unknown; to: unknown }
  | { type: "rank"; key: string; before: string | null; after: string | null }
  | { type: "create"; key: string; issue: JiraIssue }
  | { type: "delete"; key: string }
  | { type: "comment"; key: string; id: string; text: string; action: "add" | "edit" | "delete" }
  | { type: "link"; key: string; other: string; link: string; added: boolean }
  | { type: "watch"; key: string; watching: boolean }
  | { type: "log"; key: string; minutes: number }
  | { type: "sprint"; action: "start" | "edit" | "complete" | "create" | "delete"; sprint: string; moveTo?: string | null }
  | { type: "action"; kind: string; label: string; key?: string };
