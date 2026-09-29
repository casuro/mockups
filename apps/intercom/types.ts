// The Intercom Inbox's data. An `IntercomSeed` is the inbox as it opens:
// the workspace, the teammates, the customers, the conversations with what
// was said so far, and Copilot's suggested answers. `IntercomState` is what
// changes while someone uses it; it is plain JSON, so it can be saved and
// handed back to `useIntercom` to pick up where they left off.

export interface IntercomTeammate {
  name: string;
  email?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's initials by default. */
  initials?: string;
  color?: string;
}

export interface IntercomCustomer {
  name: string;
  email?: string;
  company?: string;
  /** "Austin, TX" */
  location?: string;
  /** An IANA time zone ("America/Chicago"), for the local time in the details panel. */
  timezone?: string;
  /** "Growth (annual)", shown as a chip. */
  plan?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  initials?: string;
  color?: string;
  /** Earlier conversations, listed under "Recent conversations". */
  recent?: { subject: string; at: string; status?: string }[];
}

/** An item of the inbox sidebar: a view, a team inbox or a saved view. */
export interface IntercomInbox {
  id: string;
  label: string;
  /** An emoji or one character, shown before the label. */
  icon?: string;
  /** The count on the right. When left out, how many conversations the item lists. */
  count?: number;
  /** The conversation ids the item lists, newest first; every conversation when left out. */
  conversations?: string[];
}

/**
 * What a conversation shows:
 * - "customer": the customer wrote (left, grey bubble);
 * - "reply": a teammate (`by`) answered the customer (right, blue bubble);
 * - "note": a teammate's internal note (right, yellow);
 * - "fin": Fin AI Agent answered (right, lilac, with the AI tag);
 * - "event": a line in the middle, like "*Fin* handed the conversation to *Support*".
 */
export type IntercomMessageKind = "customer" | "reply" | "note" | "fin" | "event";

export interface IntercomMessageInput {
  id?: string;
  kind: IntercomMessageKind;
  /** The teammate's id, for a reply or a note. */
  by?: string;
  /** Plain text; line breaks are kept. In an event, *stars* make a name bold. */
  text: string;
  /** When it was sent: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** A reply the customer has seen: "Seen" under it. */
  seen?: boolean;
  /** Anything else, drawn by the `renderCustom` prop of <Intercom> (a form, an order, a file). */
  custom?: { type: string; data?: unknown };
}

export interface IntercomMessage extends Omit<IntercomMessageInput, "id" | "at"> {
  id: string;
  at: number;
}

/** A link under Copilot's answer. */
export interface IntercomSource {
  title: string;
  /** An article (book icon) or an earlier conversation (bubble icon). Default "article". */
  kind?: "article" | "conversation";
}

/** Copilot's suggested answer, shown in the details panel's Copilot tab. */
export interface IntercomSuggestion {
  /** What it answers: "Suggested answer for: <question>". The conversation's subject by default. */
  question?: string;
  answer: string;
  sources?: IntercomSource[];
}

export type IntercomStatus = "open" | "snoozed" | "closed";

export interface IntercomConversationSeed {
  id: string;
  /** The customer's id from `customers`. */
  customer: string;
  subject: string;
  /** Messenger chat or email: the icon in the list and "Channel" in the details. Default "chat". */
  channel?: "chat" | "email";
  /** Bold in the list with a blue dot until opened. */
  unread?: boolean;
  /** The red Priority tag. */
  priority?: boolean;
  /** The SLA tag: "12m", "2h", "Overdue". */
  sla?: string;
  /** The SLA is missed: the tag turns red. */
  slaBreached?: boolean;
  /** A teammate's id; the signed-in person by default. */
  assignee?: string;
  /** The team it belongs to, shown under "Team". */
  team?: string;
  tags?: string[];
  status?: IntercomStatus;
  messages?: IntercomMessageInput[];
  /** Copilot's suggested answer, until `suggest()` replaces it. */
  copilot?: IntercomSuggestion;
}

export interface IntercomSeed {
  workspace: { name: string };
  /** The signed-in teammate's id. */
  me: string;
  teammates: Record<string, IntercomTeammate>;
  customers: Record<string, IntercomCustomer>;
  /** The top of the sidebar: "Your inbox", "Mentions", "All"... */
  inboxes: IntercomInbox[];
  /** Under "Team inboxes". */
  teamInboxes?: IntercomInbox[];
  /** Under "Views". */
  views?: IntercomInbox[];
  /** Newest first, as the list shows them. */
  conversations: IntercomConversationSeed[];
  /** What the composer's buttons insert: the emoji, the help article and the macro. */
  inserts?: { emoji?: string; article?: string; macro?: string };
  /** The conversation on screen at the start; the first one by default. */
  open?: string;
  /** The sidebar item selected at the start; the first inbox by default. */
  view?: string;
  theme?: "light" | "dark";
}

export interface IntercomConversationState {
  id: string;
  customer: string;
  subject: string;
  channel: "chat" | "email";
  unread: boolean;
  priority: boolean;
  sla: string | null;
  slaBreached: boolean;
  assignee: string;
  team: string | null;
  tags: string[];
  status: IntercomStatus;
  messages: IntercomMessage[];
  copilot: IntercomSuggestion | null;
}

/** Everything that changes while the app is used. Plain JSON. */
export interface IntercomState {
  version: 1;
  /** The conversation on screen. */
  current: string;
  /** The selected sidebar item. */
  view: string;
  /** The list's status and sort pills. */
  status: "Open" | "Snoozed" | "Closed" | "All";
  sort: "Newest" | "Oldest" | "Waiting longest" | "Priority";
  /** The signed-in teammate set themselves away. */
  away: boolean;
  /** The composer's tab. */
  mode: "reply" | "note";
  /** The details panel's tab. */
  tab: "details" | "copilot";
  /** Newest first. */
  order: string[];
  conversations: Record<string, IntercomConversationState>;
  /** Customers added with a new conversation, on top of the seed's. */
  customers: Record<string, IntercomCustomer>;
  seq: number;
}

/** What the signed-in teammate does. */
export type IntercomEvent =
  | { type: "open"; conversation: string }
  | { type: "reply"; conversation: string; text: string; id: string }
  | { type: "note"; conversation: string; text: string; id: string }
  | { type: "assign"; conversation: string; to: string }
  | { type: "snooze"; conversation: string; until: string }
  | { type: "close"; conversation: string }
  /** A composer insert: Copilot's suggestion ("Add to composer"), the emoji, the article or the macro. */
  | { type: "insert"; conversation: string; tool: "suggestion" | "emoji" | "article" | "macro"; text: string }
  /** In the Copilot tab: Regenerate, a question asked, or a source link. */
  | { type: "copilot"; conversation: string; action: "regenerate" | "ask" | "source"; text?: string }
  | { type: "view"; id: string }
  | { type: "filter"; status: IntercomState["status"]; sort: IntercomState["sort"] }
  | { type: "away"; away: boolean }
  /** A button the kit has no behaviour for (rail items, search, new conversation, GIF, attach...). */
  | { type: "action"; label: string; conversation?: string };
