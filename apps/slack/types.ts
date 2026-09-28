// The Slack app's data. A `SlackSeed` is the workspace as it opens: who is
// in it, which channels exist, what was said before. `SlackState` is what
// changes while someone uses it; it is plain JSON, so it can be saved and
// handed back to `useSlack` to pick up where they left off.

/** A conversation: a channel by its name ("engineering"), or a DM with a person by their id. */
export type Where = { channel: string } | { dm: string };

export interface SlackPerson {
  name: string;
  /** Job title, shown in a DM's header. */
  title?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's first letter by default. */
  initials?: string;
  color?: string;
  /** Green presence dot. Default true. */
  online?: boolean;
  /** A status emoji next to the name. */
  status?: string;
  /** An app (Deploybot, GitHub): shows the APP tag and never groups with the message before it. */
  bot?: boolean;
}

export interface SlackReaction {
  emoji: string;
  count: number;
  /** The signed-in person reacted with it. */
  mine?: boolean;
}

/** A bot message's card: a title, label/value rows, and buttons. */
export interface SlackCard {
  title: string;
  /** [label, value] or [label, value, tone]; "ok" is green and "bad" red, both with a dot. */
  rows?: [string, string, ("ok" | "bad")?][];
  /** The first one is the primary button. */
  buttons?: string[];
}

export interface SlackFile {
  name: string;
  /** "Figma file · 18 frames" */
  meta?: string;
  /** Up to four letters on the file icon: "PDF", "FIG". */
  ext?: string;
  color?: string;
}

/** A link preview under a message. */
export interface SlackLink {
  site: string;
  title: string;
  body?: string;
  color?: string;
}

export interface SlackMessageInput {
  id?: string;
  /** A person's id from `people`. */
  from: string;
  /** When it was sent: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /**
   * Slack's mrkdwn: *bold*, _italic_, ~strike~, `code`, ```block```,
   * @personId mentions, #channel links and bare URLs.
   */
  text?: string;
  reactions?: SlackReaction[];
  replies?: SlackMessageInput[];
  card?: SlackCard;
  /** Bar heights for a small chart under the text. */
  chart?: number[];
  file?: SlackFile;
  link?: SlackLink;
  /** Anything else, drawn by the `renderCustom` prop of <Slack> (a form, an approval, a doc). */
  custom?: { type: string; data?: unknown };
}

export interface SlackMessage extends Omit<SlackMessageInput, "at" | "replies" | "id" | "text" | "reactions"> {
  id: string;
  at: number;
  text: string;
  reactions: SlackReaction[];
  replies: SlackMessage[];
  /** Mentions the signed-in person: highlighted until they next post in the conversation. */
  mentioned: boolean;
  /** A huddle's announcement: the conversation key it belongs to. */
  huddle?: string;
  /** How long the huddle lasted, once it ended ("12 minutes"). */
  ended?: string;
}

export interface SlackBookmark {
  label: string;
  /** One letter on the bookmark's icon. */
  letter?: string;
  color?: string;
}

export interface SlackChannelSeed {
  /** The name without the #: "engineering". */
  id: string;
  topic?: string;
  /** Person ids; the first three faces show in the header. */
  members?: string[];
  /** The count in the header; members plus the signed-in person by default. */
  memberCount?: number;
  /** Greyed out in the sidebar. */
  muted?: boolean;
  bookmarks?: SlackBookmark[];
  /** How many of the last `messages` are unread when the app opens. */
  unread?: number;
  messages?: SlackMessageInput[];
}

export interface SlackDmSeed {
  /** The other person's id. */
  with: string;
  unread?: number;
  messages?: SlackMessageInput[];
}

export interface SlackHuddleSeed {
  in: Where;
  /** Who started it; its first person by default. */
  by?: string;
  people: string[];
  startedAt?: number | string;
  /** People with their camera on (shown with their photo). */
  video?: string[];
  muted?: string[];
  /** Someone sharing their screen, and the window title on it. */
  sharing?: { by: string; title?: string };
}

export interface SlackSeed {
  workspace: { name: string; initial?: string };
  /** The signed-in person's id. */
  me: string;
  people: Record<string, SlackPerson>;
  /** In sidebar order. */
  channels: SlackChannelSeed[];
  dms?: SlackDmSeed[];
  /** Bots listed under Apps; every bot by default. */
  apps?: string[];
  /** Huddles already running when the app opens. */
  huddles?: SlackHuddleSeed[];
  /** The conversation on screen at the start; the first channel by default. */
  open?: Where;
  theme?: "light" | "dark";
  /** The count on "Later" in the sidebar. */
  later?: number;
}

export interface SlackConversationState {
  unread: number;
  /** The red badge: unread messages that mention the signed-in person (all of them, in a DM). */
  mentions: number;
  messages: SlackMessage[];
  /** Where the red "New" line sits: the first message that was unread when the conversation was opened. */
  newFrom: string | null;
}

export interface SlackHuddleState {
  people: string[];
  startedAt: number;
  video: string[];
  muted: string[];
  sharing: { by: string; title: string } | null;
  /** The announcement message's id. */
  messageId: string;
}

/** Everything that changes while the app is used. Plain JSON. */
export interface SlackState {
  version: 1;
  /** The conversation on screen: "channel:engineering" or "dm:hana". */
  current: string;
  /** The message whose thread is open. */
  thread: string | null;
  conversations: Record<string, SlackConversationState>;
  huddles: Record<string, SlackHuddleState>;
  /** The huddle the signed-in person is in. */
  inHuddle: string | null;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type SlackEvent =
  | { type: "send"; where: Where; text: string; id: string; thread?: string }
  | { type: "open"; where: Where }
  | { type: "react"; id: string; emoji: string; added: boolean }
  | { type: "action"; kind: "card" | "bookmark" | "link"; label: string; id?: string }
  | { type: "huddle"; action: "start" | "join" | "leave" | "mic" | "cam" | "share"; where: Where };
