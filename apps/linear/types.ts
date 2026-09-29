// The Linear app's data. A `LinearSeed` is the workspace as it opens: who is
// in it, its teams, workflow statuses, labels, projects, cycles and issues.
// `LinearState` is what changes while someone uses it; it is plain JSON, so
// it can be saved and handed back to `useLinear` to pick up where they left off.

/** 0 No priority, 1 Urgent, 2 High, 3 Medium, 4 Low. */
export type Priority = 0 | 1 | 2 | 3 | 4;

/** The list tabs: every issue, the started and unstarted ones, or the backlog. */
export type LinearTab = "all" | "active" | "backlog";

export interface LinearPerson {
  name: string;
  /** A picture URL. The name's first letter on `color` when missing. */
  photo?: string;
  initials?: string;
  /** Behind the initials. Linear's grey by default. */
  color?: string;
}

export interface LinearTeam {
  /** The id issues use in `team`: "platform". */
  id: string;
  name: string;
  /** The square team icon's color. */
  color?: string;
  /** The letter on the team icon; the name's first letter by default. */
  letter?: string;
  /** The prefix of new issue ids: "PLA" gives PLA-940. The name's first three letters by default. */
  key?: string;
}

export interface LinearStatus {
  /** The id issues use in `status`: "progress". */
  id: string;
  /** "In Progress" */
  name: string;
  /**
   * Draws the icon and sorts it into a tab: backlog is a dotted ring, unstarted
   * an empty ring, started a half-filled ring, completed a filled check.
   */
  type: "backlog" | "unstarted" | "started" | "completed";
  /** The icon's color. Grey, yellow for started and Linear's violet for completed by default. */
  color?: string;
}

export interface LinearProject {
  name: string;
  color?: string;
}

export interface LinearCycle {
  /** "Cycle 42" */
  name: string;
  /** Shown after the name: "Sep 22 - Oct 5". */
  dates?: string;
}

/** A line in an issue's activity: an event ("moved from Todo to In Progress") or a comment. */
export interface LinearActivityInput {
  id?: string;
  kind: "event" | "comment";
  /** A person's id from `people`. */
  from: string;
  /** An event's words after the name ("created the issue"), or a comment's text. */
  text: string;
  /** When: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** Anything else, drawn by the `renderCustom` prop of <Linear> (an attachment, a PR, a deploy). */
  custom?: { type: string; data?: unknown };
}

export interface LinearActivity extends Omit<LinearActivityInput, "id" | "at"> {
  id: string;
  at: number;
}

export interface LinearIssueInput {
  /** "PLA-912". The team's key and the next number, when left out. */
  id?: string;
  title: string;
  /** A team id; the first team by default. */
  team?: string;
  /** A status id; the first unstarted status by default. */
  status?: string;
  priority?: Priority;
  /** A person's id; unassigned when left out. */
  assignee?: string | null;
  /** Label names, from `labels`. */
  labels?: string[];
  /** A project id, from `projects`. */
  project?: string | null;
  /** A cycle id, from `cycles`. */
  cycle?: string | null;
  /** The due date: a timestamp in ms, or a date string ("2026-10-02"). */
  due?: number | string | null;
  /** When it was created: a timestamp in ms, or a date string. Now, when left out. */
  created?: number | string;
  /** Who created it, for the first activity line; the assignee, or the signed-in person, by default. */
  creator?: string;
  /**
   * Paragraphs separated by a blank line; lines starting with "- " make a
   * list; `code` is inline code.
   */
  description?: string;
  /** Ids of other issues shown as its sub-issues. */
  subIssues?: string[];
  /** Oldest first. A "created the issue" line by default. */
  activity?: LinearActivityInput[];
}

export interface LinearIssue {
  id: string;
  title: string;
  team: string;
  status: string;
  priority: Priority;
  assignee: string | null;
  labels: string[];
  project: string | null;
  cycle: string | null;
  due: number | null;
  created: number;
  description: string;
  subIssues: string[];
  activity: LinearActivity[];
}

export interface LinearSeed {
  workspace: { name: string; initial?: string };
  /** The signed-in person's id. */
  me: string;
  people: Record<string, LinearPerson>;
  /** In sidebar order. */
  teams: LinearTeam[];
  /** In the order the list groups them. */
  statuses: LinearStatus[];
  /** Label name to its dot's color. */
  labels?: Record<string, string>;
  projects?: Record<string, LinearProject>;
  cycles?: Record<string, LinearCycle>;
  issues: LinearIssueInput[];
  /** The count on Inbox. */
  inbox?: number;
  /** The team whose issues show first; the first team by default. */
  team?: string;
  /** An issue open at the start. */
  open?: string;
  /** Teams expanded in the sidebar; the first one by default. */
  expanded?: string[];
  theme?: "light" | "dark";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface LinearState {
  version: 1;
  issues: LinearIssue[];
  /** The highlighted sidebar item: "inbox", "mine", "projects", "views", or "platform:issues", "platform:cycles"... */
  nav: string;
  /** The team whose issues the list shows. */
  team: string;
  tab: LinearTab;
  /** The highlighted row, moved with j/k or the arrow keys. */
  selected: string | null;
  /** The issue on screen, or null for the list. */
  open: string | null;
  /** Status ids whose group is folded. */
  collapsed: string[];
  /** Team ids expanded in the sidebar. */
  expanded: string[];
  inbox: number;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type LinearEvent =
  | { type: "open"; id: string }
  | { type: "status"; id: string; from: string; to: string }
  | { type: "priority"; id: string; from: Priority; to: Priority }
  | { type: "assignee"; id: string; from: string | null; to: string | null }
  | { type: "comment"; id: string; text: string; commentId: string }
  /** They pressed a New issue button: the team, and the status of the group it was in. */
  | { type: "create"; team: string; status?: string }
  /** They picked a sidebar item or a list tab. */
  | { type: "navigate"; to: string };
