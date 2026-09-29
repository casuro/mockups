// The PagerDuty app's data. A `PagerDutySeed` is the account as it opens:
// who is in it, the escalation policies and services, the incidents so far.
// `PagerDutyState` is what changes while someone uses it; it is plain JSON,
// so it can be saved and handed back to `usePagerDuty` to pick up where
// they left off.

export type IncidentStatus = "triggered" | "acknowledged" | "resolved";
export type Urgency = "high" | "low";
export type Priority = "P1" | "P2" | "P3" | "P4" | "P5";
/** The Incidents page's tabs. "mine" is the signed-in person's open incidents. */
export type IncidentTab = "mine" | "open" | "triggered" | "acknowledged" | "resolved";
export type UrgencyFilter = "all" | Urgency;

export interface PagerDutyPerson {
  name: string;
  email?: string;
  /** Job title, shown under their name in the "On call now" card. */
  role?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's initials by default. */
  initials?: string;
  color?: string;
}

export interface PagerDutyPolicy {
  name: string;
  /** Person ids, level 1 first: who an incident escalates to, in order. */
  levels: string[];
  /** What level 1 is called in the "On call now" card ("Platform rotation"); their role by default. */
  rotation?: string;
}

export interface PagerDutyService {
  /** The escalation policy's id. */
  policy: string;
}

/** Where an incident's responders talk: shown as the conference bridge line. */
export interface PagerDutyBridge {
  /** A Zoom meeting, as shown: "acme.zoom.us/j/81234567890". */
  zoom?: string;
  /** A Slack channel, as shown: "#inc-checkout". */
  slack?: string;
}

export interface PagerDutyAlertInput {
  title: string;
  /** The line under the title: "service:checkout env:prod - value 3.08%". */
  detail?: string;
  /** The monitoring tool it came from. "datadog" shows Datadog's mark; anything else, its name. */
  source?: string;
  /** Default "triggered". Every alert shows as resolved once its incident is. */
  status?: "triggered" | "resolved";
  /** A timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
}

export interface PagerDutyAlert extends Required<Pick<PagerDutyAlertInput, "title" | "status">> {
  detail?: string;
  source?: string;
  at: number;
}

/**
 * What a timeline line is about; it picks the line's icon and color.
 * "custom" is drawn by the `renderCustom` prop of <PagerDuty>.
 */
export type TimelineType = "trigger" | "notify" | "ack" | "resolve" | "reassign" | "escalate" | "responders" | "note" | "alert" | "custom";

export interface PagerDutyTimelineInput {
  type: TimelineType;
  /** A timestamp in ms, or a date string. Now, when left out. */
  at?: number | string;
  /** The line: "**Acknowledged** by Hana Kim". `**bold**` is bold. For a note, the note itself. */
  text?: string;
  /** A note's author (a person id): the line reads "<name> added a note" over the note. */
  by?: string;
  /** The tool it came through ("datadog"): its mark in the dot and a tag after the line. */
  via?: string;
  /** How someone was notified: picks the icon of a "notify" line. */
  channel?: "push" | "sms" | "phone" | "email";
  /** Anything else, drawn by the `renderCustom` prop of <PagerDuty> (a runbook step, a status page update). */
  custom?: { type: string; data?: unknown };
}

export interface PagerDutyTimelineEntry extends Omit<PagerDutyTimelineInput, "at" | "text"> {
  id: string;
  at: number;
  text: string;
}

export interface PagerDutyIncidentInput {
  /** The incident number; one more than the highest so far when left out. */
  id?: number;
  title: string;
  /** A service id from `services`. */
  service: string;
  /** Default "triggered". */
  status?: IncidentStatus;
  /** Default "high". */
  urgency?: Urgency;
  priority?: Priority;
  /** A person id. The first level of the service's policy by default. */
  assignee?: string;
  /** The escalation level it is at (1-based). Default 1. */
  level?: number;
  /** A timestamp in ms, or a date string. Now, when left out. */
  createdAt?: number | string;
  /** When it was resolved; for a seeded resolved incident. Its last timeline line by default. */
  resolvedAt?: number | string;
  /** Person ids asked to help, besides the assignee. */
  responders?: string[];
  alerts?: PagerDutyAlertInput[];
  /** Its log. When left out, a "Triggered" line (through the first alert's source) and a push notification to the assignee. */
  timeline?: PagerDutyTimelineInput[];
  bridge?: PagerDutyBridge;
}

export interface PagerDutyIncident {
  id: number;
  title: string;
  service: string;
  status: IncidentStatus;
  urgency: Urgency;
  priority: Priority | null;
  assignee: string;
  level: number;
  createdAt: number;
  resolvedAt: number | null;
  responders: string[];
  alerts: PagerDutyAlert[];
  timeline: PagerDutyTimelineEntry[];
  bridge: PagerDutyBridge | null;
}

export interface PagerDutySeed {
  account: { name: string };
  /** The signed-in person's id. */
  me: string;
  people: Record<string, PagerDutyPerson>;
  policies: Record<string, PagerDutyPolicy>;
  /** Services by name ("checkout"), each with its escalation policy. */
  services: Record<string, PagerDutyService>;
  /** In any order: the list shows the newest first. */
  incidents: PagerDutyIncidentInput[];
  /** The "On call now" card: which policy it shows, and when the level 1 shift hands over. The first policy by default. */
  onCall?: { policy?: string; until?: number | string };
  /** The tab the Incidents page opens on. Default "mine". */
  tab?: IncidentTab;
  /** An incident open at the start. */
  open?: number;
  theme?: "light" | "dark";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface PagerDutyState {
  version: 1;
  incidents: PagerDutyIncident[];
  /** The seed's policies, as `setOnCall` has changed them. */
  policies: Record<string, PagerDutyPolicy>;
  onCall: { policy: string; until: number | null };
  tab: IncidentTab;
  urgency: UrgencyFilter;
  /** The search box. */
  query: string;
  /** Incidents ticked in the list. */
  selected: number[];
  /** The incident in the drawer. */
  open: number | null;
  /** Unsent notes, by incident number. */
  drafts: Record<string, string>;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type PagerDutyEvent =
  | { type: "open"; incident: number | null }
  | { type: "acknowledge"; incident: number }
  | { type: "resolve"; incident: number }
  | { type: "reassign"; incident: number; to: string }
  | { type: "escalate"; incident: number; level: number; to: string }
  | { type: "add-responders"; incident: number; person: string }
  | { type: "note"; incident: number; text: string; id: string }
  | { type: "bulk"; action: "acknowledge" | "resolve" | "reassign"; incidents: number[]; to?: string }
  | { type: "filter"; tab: IncidentTab; urgency: UrgencyFilter; query: string }
  | { type: "action"; label: string };
