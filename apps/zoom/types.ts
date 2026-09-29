// The Zoom meeting's data. A `ZoomSeed` is the meeting as it opens: what it
// is, who is in it, who is waiting, what was said in the chat. `ZoomState`
// is what changes while someone is in it; it is plain JSON, so it can be
// saved and handed back to `useZoom` to pick up where they left off.

export interface ZoomPerson {
  name: string;
  /** A picture URL: their camera feed when video is on, their profile picture when off. */
  photo?: string;
  /** Shown when there is no photo; the name's initials by default. */
  initials?: string;
  color?: string;
  /** "Available", "In a meeting": shown under their name in the invite list. */
  status?: string;
}

export interface ZoomMeeting {
  /** The topic, in the top bar: "Weekly sync". */
  title: string;
  /** The meeting ID as Zoom spaces it: "845 2231 9067". */
  id: string;
  passcode?: string;
  /** The host's person id; the signed-in person by default. */
  host?: string;
  /** The invite link; https://zoom.us/j/<id> by default. */
  link?: string;
  /** When it started (ms or a date string), for the timer. Now by default. */
  startedAt?: number | string;
}

export interface ZoomChatInput {
  id?: string;
  /** A person's id. */
  from: string;
  /** "everyone" (the default) or a person's id, for a direct message. */
  to?: string;
  text?: string;
  /** Sent time: a timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** A file instead of text. */
  file?: { name: string; size?: string };
  /** A grey notice in the middle ("This meeting is being recorded"). */
  system?: boolean;
}

export interface ZoomChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  at: number;
  file?: { name: string; size?: string };
  system?: boolean;
}

/** Something the signed-in person can pick in the Share Screen dialog. */
export interface ZoomScreen {
  id: string;
  /** "Screen", "Terminal", "Onboarding v4 - Launch checklist". */
  title: string;
  /** The picker's thumbnail. */
  thumb?: "desktop" | "design" | "document" | "terminal";
}

/** A sticky note on a whiteboard, in whiteboard pixels (1280x800). */
export interface ZoomNote {
  x: number;
  y: number;
  /** Who wrote it: a first name. */
  by: string;
  text: string;
  color?: string;
  /** Tilt in degrees. */
  tilt?: number;
}

export interface ZoomWhiteboard {
  title: string;
  notes?: ZoomNote[];
}

/** An app in the Apps panel. */
export interface ZoomApp {
  name: string;
  description?: string;
  color?: string;
  icon?: "notes" | "poll" | "docs" | "timer" | "bot" | "apps" | "whiteboard" | "sparkle";
}

/** What is being shared. */
export interface ZoomShare {
  /** Who is sharing. */
  by: string;
  kind: "screen" | "whiteboard";
  /** The screen's id: what `renderScreen` draws. */
  screen: string;
  /** A whiteboard's name. */
  title?: string;
  notes?: ZoomNote[];
  /** The sharer paused it (your own share). */
  paused?: boolean;
  /** The annotation toolbar is open. */
  annotate?: boolean;
  /** Viewing someone's share: fit to window (default) or original size. */
  fit?: boolean;
  /** Viewing someone's share: side-by-side with the video tiles. */
  sideBySide?: boolean;
}

export interface ZoomSeed {
  meeting: ZoomMeeting;
  /** The signed-in person's id. */
  me: string;
  /** Everyone who may appear, by id: in the meeting, waiting, or invitable. */
  people: Record<string, ZoomPerson>;
  /** Who is in the meeting at the start, besides the signed-in person. */
  participants: string[];
  /** Of them, who is muted. */
  muted?: string[];
  /** Of them, who has their camera off (everyone else's is on, the signed-in person's too). */
  cameraOff?: string[];
  /** In the waiting room at the start. */
  waiting?: string[];
  chat?: ZoomChatInput[];
  /** People the Invite dialog offers (those not already in or waiting). */
  contacts?: string[];
  /** What the Share Screen dialog offers; a whole "Screen" by default. */
  screens?: ZoomScreen[];
  /** Recent whiteboards, under the Whiteboards button. */
  whiteboards?: ZoomWhiteboard[];
  /** The Apps panel's list. */
  apps?: ZoomApp[];
  /** Someone already sharing when the meeting opens. */
  share?: { by: string; screen: string };
  view?: "gallery" | "speaker";
}

export interface ZoomSecurity {
  locked: boolean;
  waitingRoom: boolean;
  hidePictures: boolean;
  /** What every participant is allowed to do. */
  share: boolean;
  chat: boolean;
  rename: boolean;
  unmute: boolean;
  video: boolean;
}

/** Everything that changes while the meeting is used. Plain JSON. */
export interface ZoomState {
  version: 1;
  /** In the meeting, left it, or it was ended by the host. */
  phase: "meeting" | "left" | "ended";
  startedAt: number;
  host: string;
  /** In the meeting, the signed-in person first. */
  people: string[];
  waiting: string[];
  muted: string[];
  /** Cameras on. */
  video: string[];
  /** Raised hands: person id to when it went up (the participants list sorts by it). */
  hands: Record<string, number>;
  /** Nonverbal feedback on a tile: yes, no, slower, faster. */
  feedback: Record<string, "yes" | "no" | "slower" | "faster">;
  /** The signed-in person joined computer audio. */
  audio: boolean;
  view: "gallery" | "speaker";
  hideSelf: boolean;
  hideNonVideo: boolean;
  pinned: string | null;
  spotlight: string | null;
  panels: { participants: boolean; chat: boolean; apps: boolean };
  chat: ZoomChatMessage[];
  /** Who the chat composer sends to: "everyone" or a person's id. */
  chatTo: string;
  unread: number;
  share: ZoomShare | null;
  recording: { kind: "local" | "cloud"; paused: boolean } | null;
  captions: boolean;
  /** A waiting room arrival shown as a notice with Admit. */
  notice: string | null;
  security: ZoomSecurity;
  /** Chime when someone joins or leaves. */
  sounds: boolean;
  seq: number;
}

/** What the signed-in person does. */
export type ZoomEvent =
  | { type: "mute"; muted: boolean }
  | { type: "video"; on: boolean }
  | { type: "audio"; joined: boolean }
  | { type: "share"; action: "start" | "stop" | "pause" | "resume"; screen?: string; whiteboard?: string }
  | { type: "record"; action: "start" | "pause" | "resume" | "stop" | "ask"; kind?: "local" | "cloud" }
  | { type: "react"; emoji: string }
  | { type: "hand"; raised: boolean }
  | { type: "feedback"; value: "yes" | "no" | "slower" | "faster" | null }
  | { type: "chat"; id: string; text: string; to: string }
  | { type: "attach"; to: string }
  | { type: "admit"; person: string }
  | { type: "deny"; person: string }
  | {
      type: "participant";
      action: "mute" | "ask-unmute" | "ask-video" | "stop-video" | "lower-hand" | "pin" | "spotlight" | "to-waiting" | "remove";
      person: string;
    }
  | { type: "mute-all"; allowUnmute: boolean }
  | { type: "invite"; people: string[] }
  | { type: "view"; view: "gallery" | "speaker" }
  | { type: "captions"; on: boolean }
  | { type: "security"; setting: keyof ZoomSecurity | "suspend"; on: boolean }
  | { type: "app"; name: string }
  | { type: "annotate"; surface: "whiteboard" | "screen"; tool: string }
  | { type: "end" }
  | { type: "leave" }
  | { type: "rejoin" };
