// The Google Calendar app's data. A `CalendarSeed` is the calendar as it
// opens: who is in it, which calendars exist, what is on them, and which
// day and view are on screen. `CalendarState` is what changes while someone
// uses it; it is plain JSON, so it can be saved and handed back to
// `useGoogleCalendar` to pick up where they left off.

export type CalendarView = "day" | "week" | "month";

/** A guest's answer. "awaiting" has not answered yet. */
export type Rsvp = "yes" | "no" | "maybe" | "awaiting";

export interface CalendarPerson {
  name: string;
  email?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's first letter by default. */
  initials?: string;
  color?: string;
}

export interface CalendarCalendar {
  id: string;
  name: string;
  /** Its events' color and its checkbox's color: "#039be5". */
  color: string;
  /** The side panel group it is listed under. Default "mine". */
  group?: "mine" | "other";
  /** Its checkbox is ticked and its events show. Default true. */
  visible?: boolean;
  /**
   * The signed-in person's own calendar: its events can be edited and
   * deleted, have a reminder, and new events go on it. The first calendar
   * with `primary`, or the first calendar, when none says so.
   */
  primary?: boolean;
}

export interface CalendarGuest {
  /** A person's id from `people`. */
  person?: string;
  /** Someone outside `people`: shown by their address. */
  email?: string;
  /** Default "awaiting". */
  rsvp?: Rsvp;
  /** Shows "Organizer" under their name. */
  organizer?: boolean;
}

export interface CalendarEntryInput {
  id?: string;
  title: string;
  /** A calendar's id; the primary calendar by default. */
  calendar?: string;
  /** The day, as "2026-09-28". */
  date: string;
  /** An all-day entry sits in the row above the hours and has no times. */
  allDay?: boolean;
  /** "09:30", 24-hour. Ignored for all-day entries. */
  start?: string;
  /** "10:15"; "24:00" ends at midnight. An hour after `start` by default. */
  end?: string;
  /** Overrides the calendar's color for this entry. */
  color?: string;
  guests?: CalendarGuest[];
  location?: string;
  /** A Google Meet code: "xqp-hzrn-kfa". Shows "Join with Google Meet". */
  meet?: string;
  description?: string;
  /** How it repeats, as the popover says it: "Weekly on weekdays". Repeat an entry by listing each occurrence. */
  recurrence?: string;
  /** Focus time: "Do not disturb, declining new invitations". */
  focus?: boolean;
  /** A task: drawn as an outlined chip with a check circle in the all-day row. */
  task?: boolean;
  /** Anything else, drawn in the popover by the `renderDetails` prop of <GoogleCalendar> (an agenda, attachments, a form). */
  custom?: { type: string; data?: unknown };
}

/** An entry as stored: every id, calendar and guest answer filled in. */
export interface CalendarEntry extends Omit<CalendarEntryInput, "id" | "calendar" | "guests"> {
  id: string;
  calendar: string;
  guests: (CalendarGuest & { rsvp: Rsvp })[];
}

export interface CalendarSeed {
  /** The signed-in person's id. */
  me: string;
  people: Record<string, CalendarPerson>;
  /** In side panel order. */
  calendars: CalendarCalendar[];
  entries: CalendarEntryInput[];
  /** The day on screen at the start, as "2026-09-28". Today by default. */
  start?: string;
  /** Default "week" (three days when the box is narrow). */
  view?: CalendarView;
  theme?: "light" | "dark";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface CalendarState {
  version: 1;
  view: CalendarView;
  /** The day the view is built around, as "2026-09-28". */
  anchor: string;
  /** Which calendars are ticked, by id. */
  visible: Record<string, boolean>;
  entries: CalendarEntry[];
  /** The entry whose popover is open. */
  selected: string | null;
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type CalendarEvent =
  | { type: "create"; entry: CalendarEntry }
  | { type: "delete"; entry: CalendarEntry }
  | { type: "rsvp"; id: string; answer: Exclude<Rsvp, "awaiting"> }
  | { type: "open"; id: string }
  | { type: "join"; id: string; meet: string }
  | { type: "navigate"; date: string; view: CalendarView }
  | { type: "view"; view: CalendarView }
  | { type: "toggle"; calendar: string; visible: boolean };
