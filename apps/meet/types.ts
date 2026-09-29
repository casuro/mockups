// The Google Meet call's data. A `MeetSeed` is the call as you join it: the
// meeting, who is in it, who is presenting, what was said in the chat.
// `MeetState` is what changes while someone uses it; it is plain JSON, so it
// can be saved and handed back to `useMeet` to pick up where they left off.

/** The room behind someone's camera: two wall colors, which side the furniture is on, and what is on the wall. */
export interface MeetRoom {
  wall: [string, string];
  side: "left" | "right";
  kind: "window" | "art" | "shelf";
}

export interface MeetPerson {
  name: string;
  email?: string;
  /** A picture URL: their face on camera, and their avatar. Initials on `color` when missing. */
  photo?: string;
  /** The avatar's background when there is no photo. */
  color?: string;
  /** The room drawn behind their face when their camera is on. Picked from their id when missing. */
  room?: MeetRoom;
}

export interface MeetChatInput {
  id?: string;
  /** A person's id. */
  from: string;
  text: string;
  /** When it was sent: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
}

export interface MeetChatMessage {
  id: string;
  from: string;
  text: string;
  at: number;
}

export interface MeetQuestionInput {
  id?: string;
  from: string;
  text: string;
  votes?: number;
}

export interface MeetQuestion {
  id: string;
  from: string;
  text: string;
  votes: number;
  /** The signed-in person upvoted it. */
  mine: boolean;
}

export interface MeetPoll {
  question: string;
  options: { text: string; votes: number }[];
  /** The option the signed-in person voted for. */
  mine: number | null;
}

export interface MeetSeed {
  meeting: {
    title: string;
    /** "abc-defg-hij": shown in the bar and in the joining link. */
    code: string;
    /** The host's id; the signed-in person by default. */
    host?: string;
    /** The Calendar attachment shown in Meeting details (a Google Doc). */
    doc?: string;
    dialIn?: { number: string; pin: string };
    /** Your organization, in the host controls ("People in Northwind can join"). */
    org?: string;
  };
  /** The signed-in person's id. */
  me: string;
  /** Everyone who is or may be in the call, by id. */
  people: Record<string, MeetPerson>;
  /** Who is in the call when you join, besides you, in tile order. */
  inCall: string[];
  /** People with their camera on (others show their avatar). */
  video?: string[];
  /** People with their microphone off. */
  muted?: string[];
  /** Raised hands, in the order they went up. */
  hands?: string[];
  /** Someone presenting their screen when you join. */
  presenter?: string | null;
  chat?: MeetChatInput[];
  /** Questions already asked in Q&A. */
  questions?: MeetQuestionInput[];
  /** People "Add people" can call; everyone in `people` by default. */
  invitable?: string[];
  /** Your microphone and camera as you join (both on by default). */
  mic?: boolean;
  camera?: boolean;
  /** The names in the microphone, speaker and camera menus. */
  devices?: { mic?: string[]; speaker?: string[]; camera?: string[] };
  /** The panels, menus and dialogs; the call itself is always dark, like Meet's. */
  theme?: "light" | "dark";
}

export type MeetLayout = "auto" | "tiled" | "spotlight" | "sidebar";
export type MeetPanel = "people" | "chat" | "info" | "activities" | "host" | "effects";
/** A page inside the Activities panel. */
export type MeetActivity = "polls" | "qa";
export type MeetShareSource = "screen" | "window" | "tab" | "whiteboard";

export interface MeetHostControls {
  mgmt: boolean;
  share: boolean;
  chat: boolean;
  react: boolean;
  mic: boolean;
  video: boolean;
  access: "open" | "trusted" | "restricted";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface MeetState {
  version: 1;
  /** In the call, or on the "You left the meeting" screen. */
  view: "call" | "left";
  mic: boolean;
  camera: boolean;
  /** Everyone else in the call, in tile order. */
  inCall: string[];
  video: string[];
  muted: string[];
  hands: string[];
  presenter: string | null;
  /** What the signed-in person is presenting, while they are. */
  sharing: MeetShareSource | null;
  chat: MeetChatMessage[];
  /** Chat messages that arrived while the chat panel was closed. */
  unread: number;
  panel: MeetPanel | null;
  activity: MeetActivity | null;
  layout: MeetLayout;
  pinned: string | null;
  hideNoVideo: boolean;
  captions: boolean;
  recording: boolean;
  transcript: boolean;
  poll: MeetPoll | null;
  questions: MeetQuestion[];
  /** Background effect: "none", "slight", "blur" or a scene id ("beach"). */
  background: string;
  /** Camera filter id ("warm"), or "none". */
  filter: string;
  /** The chosen microphone, speaker and camera, as indexes into the device lists. */
  device: { mic: number; speaker: number; camera: number };
  host: MeetHostControls;
  chimes: boolean;
  leaveEmpty: boolean;
  /** Stars given on the "You left" screen, 0 for none. */
  rating: number;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type MeetEvent =
  | { type: "mic"; on: boolean }
  | { type: "camera"; on: boolean }
  | { type: "hand"; raised: boolean }
  | { type: "react"; emoji: string }
  | { type: "present"; on: boolean; source?: MeetShareSource }
  | { type: "chat"; text: string; id: string }
  | { type: "captions"; on: boolean }
  | { type: "layout"; layout: MeetLayout; hideNoVideo: boolean }
  | { type: "pin"; person: string | null }
  | { type: "panel"; panel: MeetPanel | null }
  | { type: "record"; on: boolean }
  | { type: "transcript"; on: boolean }
  | { type: "poll"; action: "launch" | "vote" | "end"; question: string; options: string[]; choice?: number | null }
  | { type: "question"; action: "ask" | "upvote"; id: string; text: string }
  | { type: "person"; action: "invite" | "mute" | "remove" | "lower-hand"; person: string }
  | { type: "lower-all" }
  | { type: "draw"; tool: "pen" | "eraser"; strokes: number }
  | { type: "leave" }
  | { type: "rejoin" }
  | { type: "rate"; stars: number }
  | { type: "action"; kind: "copy-link" | "open-doc" | "breakout" | "help" | "report" | "device" | "setting"; label: string };
