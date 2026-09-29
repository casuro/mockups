// The Zendesk Agent Workspace's data. A `ZendeskSeed` is the help desk as
// it opens: the agents, the customers and their organizations, the tickets
// and what was said on them, the macros and the views. `ZendeskState` is
// what changes while someone works in it; it is plain JSON, so it can be
// saved and handed back to `useZendesk` to pick up where they left off.

export type TicketStatus = "new" | "open" | "pending" | "solved";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketType = "question" | "incident" | "problem" | "task";
/** How a message came in: the icon next to its time. */
export type TicketChannel = "email" | "web" | "chat";

/** Someone on the support team. */
export interface ZendeskAgent {
  name: string;
  email?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  color?: string;
  /** The group in the Assignee field ("Support / Hana Kim"). Default "Support". */
  group?: string;
}

/** A customer's company. */
export interface ZendeskOrganization {
  name: string;
  /** The green plan pill next to the name: "Enterprise". */
  plan?: string;
  /** An IANA time zone for "Local time": "Europe/London". */
  timezone?: string;
  /** Shown after the local time: "London". */
  city?: string;
  /** The Tags row in the customer panel. */
  tags?: string[];
}

/** One line of a customer's interaction history, under their tickets. */
export interface ZendeskInteraction {
  text: string;
  /** "Sep 21", "Mar 2025" */
  when: string;
}

/** A customer who writes in. */
export interface ZendeskRequester {
  name: string;
  email: string;
  /** An id from `organizations`. */
  org?: string;
  /** Job title. */
  title?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  color?: string;
  /** Default "English". */
  language?: string;
  /** Older interactions, listed after their other tickets. */
  history?: ZendeskInteraction[];
}

export interface ZendeskMessageInput {
  id?: string;
  /** An agent's or a requester's id. */
  from: string;
  /** When it was written: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** Default: the ticket's channel. */
  channel?: TicketChannel;
  /** An internal note: yellow, visible to agents only. */
  note?: boolean;
  /** Plain text; line breaks are kept. */
  text?: string;
  /** A file name, shown as an attachment under the text. */
  attachment?: string;
  /** Anything else, drawn by the `renderCustom` prop of <Zendesk> (a form, an order, a log excerpt). */
  custom?: { type: string; data?: unknown };
}

export interface ZendeskMessage extends Omit<ZendeskMessageInput, "id" | "at" | "channel" | "text" | "note"> {
  id: string;
  at: number;
  channel: TicketChannel;
  note: boolean;
  text: string;
}

export interface ZendeskTicketInput {
  /** The ticket number. The next free one after the highest, when left out. */
  id?: number;
  subject: string;
  /** A requester's id. */
  requester: string;
  /** Default "new". */
  status?: TicketStatus;
  /** Default "normal". */
  priority?: TicketPriority;
  /** Default "question". */
  type?: TicketType;
  /** An agent's id; unassigned when left out. */
  assignee?: string | null;
  tags?: string[];
  /** Agent ids. */
  followers?: string[];
  /** How it came in. Default "email". */
  channel?: TicketChannel;
  /** When it was opened; the first message's time, or now. */
  requestedAt?: number | string;
  /** When it last changed; the last message's time, or when it was opened. */
  updatedAt?: number | string;
  /** Oldest first. */
  messages?: ZendeskMessageInput[];
}

export interface ZendeskTicket {
  id: number;
  subject: string;
  requester: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  assignee: string | null;
  tags: string[];
  followers: string[];
  channel: TicketChannel;
  requestedAt: number;
  updatedAt: number;
  messages: ZendeskMessage[];
}

/**
 * Which tickets a view lists. Every condition given must hold.
 * `assignee`: "me" (the signed-in agent), "none" (unassigned) or an agent id.
 */
export interface ZendeskViewFilter {
  assignee?: "me" | "none" | (string & {});
  status?: TicketStatus[];
  /** Updated in the last this-many hours. */
  updatedWithin?: number;
}

export interface ZendeskView {
  id: string;
  name: string;
  filter: ZendeskViewFilter;
}

/** A canned reply that fills the composer. */
export interface ZendeskMacro {
  name: string;
  text: string;
}

export interface ZendeskSeed {
  /** The name customers write to: messages from them read "to Northwind Support". */
  account: { name: string };
  /** The signed-in agent's id. */
  me: string;
  agents: Record<string, ZendeskAgent>;
  organizations?: Record<string, ZendeskOrganization>;
  requesters: Record<string, ZendeskRequester>;
  tickets: ZendeskTicketInput[];
  macros?: ZendeskMacro[];
  /** The views panel, in order. Zendesk's usual six by default (yours, unassigned, all unsolved, recent, pending, solved). */
  views?: ZendeskView[];
  /** The view listed at the start; the first by default. */
  view?: string;
  /** Tickets open in tabs at the start. */
  tabs?: number[];
  /** The tab on screen at the start; the view's list when left out. */
  open?: number;
  theme?: "light" | "dark";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface ZendeskState {
  version: 1;
  tickets: ZendeskTicket[];
  /** Ticket ids open in the top bar, left to right. */
  tabs: number[];
  /** The ticket on screen, or null for the view's list. */
  active: number | null;
  /** The view listed when no ticket is on screen. */
  view: string;
  /** Unsent composer text, by ticket id. */
  drafts: Record<string, string>;
  theme: "light" | "dark";
  seq: number;
}

export type TicketField = "assignee" | "type" | "priority" | "status";

/** What the signed-in agent does. */
export type ZendeskEvent =
  | { type: "open"; ticket: number }
  | { type: "close"; ticket: number }
  | { type: "view"; view: string }
  /** Submit: a public reply or an internal note (`text` empty when only the status changed), and the status it was submitted as. */
  | { type: "submit"; ticket: number; status: TicketStatus; note: boolean; text: string; id?: string }
  | { type: "macro"; ticket: number; macro: string }
  | { type: "change"; ticket: number; field: TicketField; value: string | null }
  | { type: "tag"; ticket: number; tag: string; added: boolean }
  | { type: "follow"; ticket: number; following: boolean }
  /** A control the kit has no behaviour for: "Play", "Options", "Notifications", "Reporting", "Bold"... */
  | { type: "action"; label: string };
