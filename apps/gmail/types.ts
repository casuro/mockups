// The Gmail app's data. A `GmailSeed` is the mailbox as it opens: who is
// signed in, who they write to, which labels exist, which mail is already
// there. `GmailState` is what changes while someone uses it; it is plain
// JSON, so it can be saved and handed back to `useGmail` to pick up where
// they left off.

/** Where a conversation lives. "archive" is out of the inbox but still in All Mail. */
export type GmailFolder = "inbox" | "sent" | "drafts" | "snoozed" | "scheduled" | "spam" | "trash" | "archive";

/** The inbox tabs. */
export type GmailTab = "primary" | "promotions" | "social" | "updates";

/** What the sidebar can show: a folder, or one of the views over every folder. */
export type GmailView = Exclude<GmailFolder, "archive"> | "starred" | "important" | "all";

export type GmailRsvp = "yes" | "no" | "maybe";

export interface GmailPerson {
  name: string;
  email: string;
  /** A picture URL. Their initial on `color` when missing. */
  photo?: string;
  color?: string;
  /** Lines under "--" at the end of their messages ("Dev Patel\nCasuro"). */
  signature?: string;
}

/** A calendar invitation, drawn as a card with Yes / No / Maybe in the conversation's first message. */
export interface GmailInvite {
  title: string;
  /** Timestamps in ms, or date strings. */
  start: number | string;
  end: number | string;
  /** A person's id; the first message's sender by default. */
  organizer?: string;
  /** Guest count; everyone on the first message by default. */
  guests?: number;
  /** Shows "Join with Google Meet". Default true. */
  meet?: boolean;
  /** The signed-in person's answer so far. */
  rsvp?: GmailRsvp | null;
}

export interface GmailMessageInput {
  id?: string;
  /** A person's id from `people`. */
  from: string;
  /** Person ids, or plain addresses for people not in `people`. */
  to: string[];
  /** When it was sent: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /**
   * The text. A blank line starts a new paragraph, lines starting with "- "
   * are a bulleted list, `code` is monospace, *bold* is bold, and bare URLs
   * are links.
   */
  body?: string;
  /** File names; the extension picks the icon ("Plan.pdf", "numbers.xlsx"). */
  attachments?: string[];
  /** Adds the sender's `signature`. Default true. */
  signed?: boolean;
  /** Anything else, drawn under the body by the `renderCustom` prop of <Gmail> (a form, a receipt, a chart). */
  custom?: { type: string; data?: unknown };
}

/** A conversation: a subject and its messages, oldest first. */
export interface GmailMailInput {
  id?: string;
  subject: string;
  /** Default "inbox". */
  folder?: GmailFolder;
  /** The inbox tab; default "primary". */
  tab?: GmailTab;
  /** Label names from `labels`; a nested one is "Parent/Child". */
  labels?: string[];
  unread?: boolean;
  starred?: boolean;
  important?: boolean;
  invite?: GmailInvite;
  messages: GmailMessageInput[];
}

/** An event in the Calendar side panel. */
export interface GmailAgendaItem {
  /** As shown: "9:30 - 9:45 AM". */
  time: string;
  title: string;
  /** Green instead of blue: happening now or next. */
  now?: boolean;
}

/** A note in the Keep side panel. */
export interface GmailNote {
  title: string;
  text: string;
  /** Yellow, like a pinned Keep note. */
  yellow?: boolean;
}

export interface GmailSeed {
  /** The signed-in person's id. */
  me: string;
  /** Everyone: senders, recipients, and who the To field suggests. */
  people: Record<string, GmailPerson>;
  /** Label name to color. Nest with "/": "Engineering/Incidents". */
  labels?: Record<string, string>;
  /** Every conversation, in any order (lists sort newest first). */
  mails: GmailMailInput[];
  /** The Calendar side panel's agenda for today. */
  agenda?: GmailAgendaItem[];
  /** The Keep side panel's notes. */
  notes?: GmailNote[];
  /** The Tasks side panel's list. */
  tasks?: { text: string; done?: boolean }[];
  /** "Managed by casuro.com" in the account card. */
  domain?: string;
  /** The conversation on screen at the start; the inbox by default. */
  open?: string;
  theme?: "light" | "dark";
  density?: GmailDensity;
  pane?: GmailPane;
}

export type GmailDensity = "default" | "comfortable" | "compact";
/** "right" shows the conversation next to the list. */
export type GmailPane = "none" | "right";

export interface GmailMessage extends Omit<GmailMessageInput, "id" | "at" | "body" | "attachments" | "signed"> {
  id: string;
  at: number;
  body: string;
  attachments: string[];
  signed: boolean;
}

export interface GmailMail {
  id: string;
  subject: string;
  folder: GmailFolder;
  tab: GmailTab;
  labels: string[];
  unread: boolean;
  starred: boolean;
  important: boolean;
  invite: (Omit<GmailInvite, "start" | "end" | "rsvp"> & { start: number; end: number; rsvp: GmailRsvp | null }) | null;
  messages: GmailMessage[];
}

/** The compose window. */
export interface GmailCompose {
  /** Person ids or plain addresses. */
  to: string[];
  subject: string;
  body: string;
  mode: "normal" | "min" | "full";
  /** The draft it was opened from. */
  draftOf: string | null;
}

/** Everything that changes while the app is used. Plain JSON. */
export interface GmailState {
  version: 1;
  /** What the list shows: a folder or view, a label, or search results (`query`). */
  view: { folder: GmailView; tab: GmailTab; label: string | null; query: string; hasAttachment: boolean };
  /** The conversation on screen. */
  open: string | null;
  selected: string[];
  /** Earlier messages the person expanded (the last one always is). */
  expanded: string[];
  /** The inline reply being written, under a conversation. */
  reply: { mail: string; text: string } | null;
  compose: GmailCompose | null;
  labels: Record<string, string>;
  mails: GmailMail[];
  tasks: { id: string; text: string; done: boolean }[];
  side: "calendar" | "keep" | "tasks" | null;
  navCollapsed: boolean;
  /** "More" is open in the sidebar. */
  more: boolean;
  density: GmailDensity;
  pane: GmailPane;
  theme: "light" | "dark";
  seq: number;
}

/** A conversation action from the toolbar, a row's hover buttons, or a shortcut. */
export type GmailAction = "archive" | "delete" | "spam" | "snooze" | "read" | "unread" | "task";

/** What the signed-in person does. */
export type GmailEvent =
  | { type: "send"; id: string; to: string[]; subject: string; body: string }
  | { type: "reply"; mail: string; id: string; to: string[]; body: string }
  | { type: "draft"; id: string; to: string[]; subject: string; body: string }
  | { type: "open"; id: string }
  | { type: "action"; action: GmailAction; ids: string[] }
  | { type: "undo"; action: GmailAction | "send" | "reply" | "removeLabel"; ids: string[] }
  | { type: "star"; id: string; starred: boolean }
  | { type: "important"; id: string; important: boolean }
  | { type: "label"; id: string; label: string; added: boolean }
  | { type: "manageLabel"; action: "create" | "rename" | "color" | "remove"; label: string; to?: string; color?: string }
  | { type: "rsvp"; id: string; answer: GmailRsvp }
  | { type: "search"; query: string }
  | { type: "view"; folder: GmailView; label: string | null; tab: GmailTab }
  | { type: "attachment"; mail: string; name: string }
  | { type: "task"; text: string; done: boolean };
