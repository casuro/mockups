// The Teams app's data. A `TeamsSeed` is the app as it opens: who is in it,
// the chats, the teams with their channels and posts, meetings already
// running, the week's calendar. `TeamsState` is what changes while someone
// uses it; it is plain JSON, so it can be saved and handed back to
// `useTeams` to pick up where they left off.

/** A conversation: a chat by its id, or a team's channel. */
export type Where = { chat: string } | { team: string; channel: string };

/** A meeting: the conversation it runs in, or a meeting's id (from an event, or `teams.state.meetings`). */
export type MeetingRef = Where | string;

/** The app bar's views. */
export type TeamsView = "activity" | "chat" | "teams" | "calendar" | "calls" | "onedrive" | "apps";

/** The presence dot: green, red, amber, grey ring, or purple for out of office. */
export type Presence = "available" | "busy" | "away" | "offline" | "oof";

export interface TeamsPerson {
  name: string;
  /** Job title, shown in a meeting's participant list. */
  title?: string;
  /** A picture URL. Initials on `color` when missing. Also the camera feed in meetings. */
  photo?: string;
  /** Shown when there is no photo; the first letter of each word of the name by default. */
  initials?: string;
  color?: string;
  /** Default "available". Someone "offline" or "oof" never answers a call. */
  presence?: Presence;
  /** The status line under their name ("In a meeting"); follows `presence` by default. */
  note?: string;
}

export interface TeamsReaction {
  emoji: string;
  count: number;
  /** The signed-in person reacted with it. */
  mine?: boolean;
}

export interface TeamsFile {
  name: string;
  /** "Figma · 18 frames" */
  meta?: string;
  /** A few letters on the file icon: "FIG", "PDF". */
  ext?: string;
  color?: string;
}

/**
 * A call or meeting line in a conversation: in a chat, a small pill
 * ("Missed call from Sofia", "Call ended 4m 12s"); in a channel, the
 * meeting card. The kit adds these itself when a meeting starts and ends.
 */
export interface TeamsCall {
  kind: "live" | "ended" | "missed" | "noanswer";
  /** The meeting's id, while it is live. */
  meeting?: string;
  /** How long it lasted, once it ended: "4m 12s". */
  duration?: string;
  /** The meeting's title, on a channel's card. */
  title?: string;
}

export interface TeamsMessageInput {
  id?: string;
  /** A person's id from `people`. */
  from: string;
  /** When it was sent: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** *bold*, `code`, ```blocks```, @personId mentions and bare URLs. */
  text?: string;
  /** A channel post's subject line. */
  subject?: string;
  reactions?: TeamsReaction[];
  file?: TeamsFile;
  /** A channel post's replies. */
  replies?: TeamsMessageInput[];
  /** A call line instead of a message (`from` is who it concerns). */
  call?: TeamsCall;
  /** Anything else, drawn by the `renderCustom` prop of <Teams> (a form, an approval, a card). */
  custom?: { type: string; data?: unknown };
}

export interface TeamsMessage extends Omit<TeamsMessageInput, "at" | "replies" | "id" | "text" | "reactions"> {
  id: string;
  at: number;
  text: string;
  reactions: TeamsReaction[];
  replies: TeamsMessage[];
  /** Mentions the signed-in person: marked in red until they next post in the conversation. */
  mentioned: boolean;
}

export interface TeamsChatSeed {
  /** A one-on-one chat: the other person's id (also the chat's id by default). */
  with?: string;
  /** A group chat's id, name and members. */
  id?: string;
  name?: string;
  members?: string[];
  /** Listed under Pinned. */
  pinned?: boolean;
  /** How many of the last `messages` are unread when the app opens. */
  unread?: number;
  messages?: TeamsMessageInput[];
}

export interface TeamsChannelSeed {
  id: string;
  /** "General"; the id by default. */
  name?: string;
  unread?: number;
  /** The channel's posts, each with its replies. */
  messages?: TeamsMessageInput[];
}

export interface TeamsTeamSeed {
  id: string;
  name: string;
  color?: string;
  /** Person ids: the count in the header, and who can pick up a meeting there. */
  members?: string[];
  channels: TeamsChannelSeed[];
}

export interface TeamsMeetingSeed {
  /** The conversation it runs in. */
  in: Where;
  title: string;
  /** Who is in it. The first is the organizer, unless `organizer` says otherwise. */
  people: string[];
  organizer?: string;
  startedAt?: number | string;
  /** People with their camera on (shown with their photo). */
  video?: string[];
  muted?: string[];
  hands?: string[];
  /** Someone presenting their screen, and the window title on it. */
  sharing?: { by: string; title?: string };
  /** The meeting chat so far. */
  chat?: { from: string; text: string }[];
}

export interface TeamsActivitySeed {
  id?: string;
  /** Whose face it shows. */
  from: string;
  type: "mention" | "chat" | "meeting" | "like" | "reply";
  /** "Dev Patel mentioned you" */
  text: string;
  /** "Platform > Engineering" */
  where?: string;
  /** A line of what was said. */
  preview?: string;
  at?: number | string;
  /** Where clicking it goes. A "meeting" item shows Live while a meeting runs there. */
  go?: Where;
  unread?: boolean;
}

/** A calendar event in this week's view (Monday to Friday). */
export interface TeamsCalendarEvent {
  title: string;
  start: number | string;
  end: number | string;
  /** The second line: "Teams meeting", "Conference room 2". */
  where?: string;
  color?: "brand" | "green" | "amber";
  /** A meeting it belongs to: shows Join while that meeting runs. */
  meeting?: MeetingRef;
}

export interface TeamsCallRecord {
  with: string;
  kind: "outgoing" | "incoming" | "missed";
  /** "4m 12s" */
  duration?: string;
  at: number | string;
}

export interface TeamsFileRecord {
  name: string;
  /** A person's id or a name. */
  by: string;
  modified: number | string;
  ext?: string;
  color?: string;
}

export interface TeamsSeed {
  /** The signed-in person's id. */
  me: string;
  people: Record<string, TeamsPerson>;
  /** In list order. */
  chats?: TeamsChatSeed[];
  /** In list order. */
  teams?: TeamsTeamSeed[];
  meetings?: TeamsMeetingSeed[];
  activity?: TeamsActivitySeed[];
  /** This week's calendar. */
  events?: TeamsCalendarEvent[];
  /** Calendar > My calendars; "Calendar" by default. */
  calendars?: { name: string; color?: string }[];
  /** Calls > Speed dial: person ids. */
  speedDial?: string[];
  /** Calls > History. */
  calls?: TeamsCallRecord[];
  /** OneDrive > My files. */
  files?: TeamsFileRecord[];
  /** What is on screen at the start: a view, or a conversation. Chat, on the first chat, by default. */
  open?: Where | TeamsView;
  /** The channel the Teams view shows until another is picked; the first one by default. */
  openChannel?: { team: string; channel: string };
  theme?: "light" | "dark";
}

export interface TeamsConversationState {
  unread: number;
  /** Unread posts that mention the signed-in person: the @ badge on a channel. */
  mentions: number;
  messages: TeamsMessage[];
  /** Where a channel's red "New" line sits. */
  newFrom: string | null;
}

export interface TeamsMeetingState {
  id: string;
  where: Where | null;
  title: string;
  organizer: string;
  startedAt: number;
  people: string[];
  /** Being called, not yet in. */
  ringing: string[];
  video: string[];
  muted: string[];
  hands: string[];
  sharing: { by: string; title: string } | null;
  chat: { from: string; text: string; at: number }[];
}

export interface TeamsActivityItem extends Omit<TeamsActivitySeed, "id" | "at" | "unread"> {
  id: string;
  at: number | null;
  unread: boolean;
}

/** Everything that changes while the app is used. Plain JSON. */
export interface TeamsState {
  version: 1;
  view: TeamsView;
  /** The chat and the channel last open ("chat:priya", "ch:eng/incidents"). */
  chat: string | null;
  channel: string | null;
  /** The activity item picked last. */
  activity: string | null;
  /** On a narrow screen: the conversation is showing, not the list. */
  detail: boolean;
  conversations: Record<string, TeamsConversationState>;
  feed: TeamsActivityItem[];
  meetings: Record<string, TeamsMeetingState>;
  /** The meeting the signed-in person is in. */
  inCall: string | null;
  /** Presence changed since the seed. */
  presence: Record<string, { presence: Presence; note?: string }>;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type TeamsEvent =
  | { type: "send"; where: Where; text: string; id: string; subject?: string }
  | { type: "reply"; where: Where; post: string; text: string; id: string }
  | { type: "react"; id: string; emoji: string; added: boolean }
  | { type: "open"; where: Where }
  | { type: "view"; view: TeamsView }
  | {
      type: "meeting";
      action: "start" | "join" | "leave" | "mic" | "cam" | "share" | "hand" | "react" | "chat";
      meeting: string;
      where: Where | null;
      /** The reaction sent, or the chat message. */
      emoji?: string;
      text?: string;
    }
  | { type: "action"; kind: "event" | "file" | "app" | "link"; label: string };
