// The WhatsApp app's data. A `WhatsAppSeed` is the app as it opens: who the
// signed-in person knows, which chats exist, what was said before.
// `WhatsAppState` is what changes while someone uses it; it is plain JSON, so
// it can be saved and handed back to `useWhatsApp` to pick up where they left off.

/** A message of the signed-in person: one grey tick (sent), two grey (delivered), two blue (read). */
export type Ticks = "sent" | "delivered" | "read";

export interface WhatsAppPerson {
  name: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Their name's color above their messages in a group, and on quotes of them. */
  color?: string;
  /** Shown when there is no photo; the name's first letter by default. */
  initials?: string;
  /** "online" in a chat's header. Default false. */
  online?: boolean;
  /** Shown in the header when they are not online: "last seen today at 09:34". */
  lastSeen?: string;
}

/** The message a reply quotes, drawn as the colored block at the top of the bubble. */
export interface WhatsAppQuote {
  /** A person's id; the signed-in person shows as "You". */
  from: string;
  text: string;
}

export interface WhatsAppReaction {
  emoji: string;
  count: number;
  /** The signed-in person reacted with it. */
  mine?: boolean;
}

/**
 * A picture: a URL, or with no `src` the mockup's drawn chart (a dark card
 * with a title, bars and a line), handy for a screenshot of a dashboard.
 */
export interface WhatsAppImage {
  src?: string;
  alt?: string;
  /** The drawn chart's title: "Billing / p95 latency". */
  title?: string;
  /** The drawn chart's bar heights, in percent. */
  bars?: number[];
  /** The drawn chart's line, as heights from 0 to 100. */
  line?: number[];
}

export interface WhatsAppDocument {
  name: string;
  /** "12 pages • PDF • 2.4 MB" */
  meta?: string;
  /** Up to four letters on the file icon. Default "PDF". */
  ext?: string;
}

export interface WhatsAppMessageInput {
  id?: string;
  /** A person's id; the signed-in person's messages are on the right, in green. */
  from: string;
  /** When it was sent: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** The text, or the caption of an image. Line breaks are kept. */
  text?: string;
  /** The signed-in person's messages only. Default "read" in a seed, "sent" when they send it. */
  ticks?: Ticks;
  quote?: WhatsAppQuote;
  image?: WhatsAppImage;
  /** A voice note, drawn with the sender's photo, a play button and a waveform. */
  voice?: { seconds: number };
  document?: WhatsAppDocument;
  reactions?: WhatsAppReaction[];
  /** Anything else, drawn by the `renderCustom` prop of <WhatsApp> (a location, a poll, a contact card). */
  custom?: { type: string; data?: unknown };
}

export interface WhatsAppMessage extends Omit<WhatsAppMessageInput, "id" | "at" | "text" | "reactions"> {
  id: string;
  at: number;
  text: string;
  reactions: WhatsAppReaction[];
}

export interface WhatsAppChatSeed {
  /** The chat's id: what `deliver`, `open` and events use. */
  id: string;
  /** A one-to-one chat: the other person's id. Its name and photo are theirs. */
  with?: string;
  /** A group's name. */
  name?: string;
  /** A group's members, not counting the signed-in person, in the order the header lists them. */
  members?: string[];
  /** A group's picture URL; the grey group icon when missing. */
  photo?: string;
  /** At the top of the list, with a pin, and under the "Favorites" filter. */
  pinned?: boolean;
  /** A crossed-out speaker in the list. */
  muted?: boolean;
  /** The green count in the list. */
  unread?: number;
  /** Someone typing when the app opens (a person's id). */
  typing?: string;
  messages?: WhatsAppMessageInput[];
}

export interface WhatsAppSeed {
  /** The signed-in person's id. */
  me: string;
  /** Everyone, by id, the signed-in person included. */
  people: Record<string, WhatsAppPerson>;
  /** In list order; pinned chats go first. */
  chats: WhatsAppChatSeed[];
  /** The chat on screen at the start; the first one by default. */
  open?: string;
  theme?: "light" | "dark";
}

export interface WhatsAppChatState {
  unread: number;
  /** Who is typing in it now. */
  typing: string | null;
  pinned: boolean;
  muted: boolean;
  messages: WhatsAppMessage[];
}

/** Everything that changes while the app is used. Plain JSON. */
export interface WhatsAppState {
  version: 1;
  /** The chat on screen. */
  open: string;
  /** Chat ids in list order: pinned first, then by latest message. */
  order: string[];
  chats: Record<string, WhatsAppChatState>;
  /** Who is online and when the others were last seen, by person id. */
  online: Record<string, boolean>;
  lastSeen: Record<string, string>;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type WhatsAppEvent =
  | { type: "send"; chat: string; text: string; id: string }
  | { type: "open"; chat: string }
  | { type: "react"; id: string; emoji: string; added: boolean }
  | { type: "play"; id: string }
  | { type: "download"; id: string; name: string }
  | { type: "call"; chat: string; video: boolean }
  /** Any other button: "New chat", "Emoji", "Attach", "Voice message", "Contact info", "Status"... */
  | { type: "action"; label: string; chat?: string };
