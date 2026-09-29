// The Outlook mail app's data. An `OutlookSeed` is the mailbox as it opens:
// who is in it, which folders and categories exist, what mail is already
// there. `OutlookState` is what changes while someone uses it; it is plain
// JSON, so it can be saved and handed back to `useOutlook` to pick up where
// they left off.

export interface OutlookPerson {
  name: string;
  email: string;
  /** A picture URL. Initials on one of Outlook's avatar colors when missing. */
  photo?: string;
  /** Shown when there is no photo; the first letters of the name by default ("Contoso Weekly" is "CW"). */
  initials?: string;
  /** One of Outlook's eight avatar colors, 0 to 7; picked from the name by default. */
  color?: number;
}

/** The folders every mailbox has. Custom folders come from `seed.folders`. */
export type BuiltInFolder = "inbox" | "drafts" | "sent" | "scheduled" | "deleted" | "junk" | "archive" | "notes" | "history";

export interface OutlookFolder {
  id: string;
  name: string;
}

/** The colors a category can have. */
export type CategoryColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "teal" | "pink";

export interface OutlookAttachment {
  name: string;
  /** In bytes. */
  size: number;
}

export interface OutlookMessageInput {
  id?: string;
  /** A person's id from `people`, or an email address. */
  from: string;
  /** Person ids or email addresses. The signed-in person by default. */
  to?: string[];
  cc?: string[];
  /** When it was sent: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** Plain text: a blank line starts a new paragraph. */
  text?: string;
  /** Rich content instead of `text`: trusted HTML (tables, lists, a newsletter). Styled like mail: <p>, <ul>, <code>, <blockquote>, table.tbl, .promo, a.cta. */
  html?: string;
  /** Lines under the body in grey: "Dev Patel\nBackend Engineer | Northwind". */
  signature?: string;
  attachments?: OutlookAttachment[];
  /** Anything else, drawn by the `renderCustom` prop of <Outlook> under the body (a form, an approval). */
  custom?: { type: string; data?: unknown };
}

export interface OutlookMessage extends Omit<OutlookMessageInput, "id" | "at" | "to" | "cc" | "attachments"> {
  id: string;
  at: number;
  to: string[];
  cc: string[];
  attachments: OutlookAttachment[];
}

export type RsvpResponse = "accept" | "tentative" | "decline";

/** Something else on the calendar, drawn in the invite's day view. */
export interface OutlookBusy {
  title: string;
  start: number | string;
  end: number | string;
}

export interface OutlookInviteSeed {
  /** The conversation's subject by default. */
  title?: string;
  start: number | string;
  end: number | string;
  /** "Microsoft Teams Meeting" by default. */
  location?: string;
  /** A person id; who sent the first message by default. */
  organizer?: string;
  /** "5 attendees"; everyone on the first message by default. */
  attendees?: number;
  /** Other events that day, to show clashes in the day view. */
  busy?: OutlookBusy[];
  /** Already answered. */
  response?: RsvpResponse | null;
}

export interface OutlookInvite {
  title: string;
  start: number;
  end: number;
  location: string;
  organizer: string;
  attendees: number;
  busy: { title: string; start: number; end: number }[];
  response: RsvpResponse | null;
}

/** A conversation: one subject, one or more messages, in one folder. */
export interface OutlookConversationInput {
  id?: string;
  subject: string;
  /** A built-in folder or a custom folder's id. "inbox" by default. */
  folder?: string;
  /** In the Focused tab of the inbox (true, the default) or Other. */
  focused?: boolean;
  unread?: boolean;
  flagged?: boolean;
  pinned?: boolean;
  importance?: "high" | "normal";
  /** Category names from `seed.categories`. */
  categories?: string[];
  /** A meeting invite, shown with Accept, Tentative and Decline. */
  invite?: OutlookInviteSeed;
  /** Snoozed until then (in the Scheduled folder). */
  snoozedUntil?: number | string;
  /** Oldest first. */
  messages: OutlookMessageInput[];
}

export interface OutlookConversation {
  id: string;
  subject: string;
  folder: string;
  focused: boolean;
  unread: boolean;
  flagged: boolean;
  pinned: boolean;
  importance: "high" | "normal";
  categories: string[];
  invite: OutlookInvite | null;
  snoozedUntil: number | null;
  messages: OutlookMessage[];
  /** A draft: what it was being written as, so opening it picks the reply back up. */
  draft?: { kind: ComposeKind; conversation: string | null };
}

export interface OutlookSeed {
  /** The signed-in person's id. */
  me: string;
  people: Record<string, OutlookPerson>;
  /** The organization, shown on the account card. */
  account?: { organization?: string };
  /** Custom folders, under the built-in ones. */
  folders?: OutlookFolder[];
  /** Folder ids under Favorites; Inbox, Sent Items and Drafts by default. */
  favorites?: string[];
  /** Microsoft 365 groups listed (collapsed) under Groups. */
  groups?: { name: string; color?: string }[];
  /** Category names and their colors, in menu order. */
  categories?: Record<string, CategoryColor>;
  /** Every conversation, in any folder. */
  conversations: OutlookConversationInput[];
  /** The conversation open at the start. */
  open?: string;
  /** People suggested first in the To field; everyone else in `people` by default. */
  suggested?: string[];
  theme?: "light" | "dark";
  density?: Density;
  pane?: PanePosition;
  /** Split the inbox into Focused and Other. Default true. */
  focusedInbox?: boolean;
}

export type Density = "roomy" | "cozy" | "compact";
export type PanePosition = "right" | "bottom" | "off";
export type ComposeKind = "new" | "reply" | "replyAll" | "forward";
export type ListFilter = "all" | "unread" | "flagged" | "tome" | "files" | "mentions";

/** A message being written: a new one in the reading pane, or a reply under its conversation. */
export interface OutlookCompose {
  /** Changes for every new compose, so the editor starts fresh. */
  key: number;
  kind: ComposeKind;
  /** The conversation replied to or forwarded. */
  conversation: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  showCc: boolean;
  showBcc: boolean;
  subject: string;
  /** The body as the editor last saved it. */
  html: string;
  attachments: OutlookAttachment[];
  /** Its conversation in Drafts, once saved. */
  draft: string | null;
  savedAt: number | null;
}

/** Everything that changes while the app is used. Plain JSON. */
export interface OutlookState {
  version: 1;
  conversations: OutlookConversation[];
  folders: OutlookFolder[];
  favorites: string[];
  categories: Record<string, CategoryColor>;
  /** The folder on screen. */
  folder: string;
  pivot: "focused" | "other";
  /** A search: the list shows matches from every folder. */
  query: string;
  filter: ListFilter;
  /** The conversation in the reading pane. */
  open: string | null;
  /** Checked conversations. */
  selected: string[];
  /** The list shows checkboxes. */
  selectMode: boolean;
  compose: OutlookCompose | null;
  theme: "light" | "dark";
  density: Density;
  pane: PanePosition;
  focusedInbox: boolean;
  /** The folder pane is hidden. */
  navHidden: boolean;
  seq: number;
}

/** What the signed-in person does. `ids` are conversation ids. */
export type OutlookEvent =
  | {
      type: "send";
      kind: ComposeKind;
      /** The conversation it went into: the one replied to, or a new one in Sent Items. */
      conversation: string;
      /** The new message's id. */
      id: string;
      to: string[];
      cc: string[];
      bcc: string[];
      subject: string;
      /** The body as plain text, and as the editor's HTML. */
      text: string;
      html: string;
      attachments: OutlookAttachment[];
      /** Scheduled to go out then, from the Send button's menu. */
      scheduled?: number;
    }
  | { type: "open"; id: string }
  | { type: "folder"; folder: string }
  | { type: "search"; query: string }
  | { type: "delete"; ids: string[]; permanent: boolean }
  | { type: "archive"; ids: string[] }
  | { type: "move"; ids: string[]; folder: string }
  | { type: "junk"; ids: string[]; junk: boolean; phishing?: boolean }
  | { type: "read"; ids: string[]; read: boolean }
  | { type: "flag"; ids: string[]; flagged: boolean }
  | { type: "pin"; ids: string[]; pinned: boolean }
  | { type: "snooze"; ids: string[]; until: number }
  | { type: "categorize"; ids: string[]; category: string | null; added: boolean }
  | { type: "rsvp"; id: string; response: RsvpResponse }
  | { type: "draft"; id: string; action: "save" | "discard" }
  | { type: "undo"; label: string }
  | { type: "createFolder"; folder: OutlookFolder }
  | { type: "attachment"; id: string; name: string; action: "open" | "download" };
