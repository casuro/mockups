// The Calendly booking page's data. A `CalendlySeed` is the page as it
// opens: whose page it is, the event type being booked, when the host is
// free and which time zones the invitee can pick from. `CalendlyState` is
// what changes while someone books; it is plain JSON, so it can be saved
// and handed back to `useCalendly` to pick up where they left off.

/** A day, as "YYYY-MM-DD". */
export type Day = string;

/** A start time on the host's clock, as 24-hour "HH:MM": "09:00", "14:30". */
export type SlotTime = string;

/**
 * When the host can be booked, in the host's time zone.
 * Either a function that lists a day's start times ([] when the day is not
 * bookable), or those lists by day. Days before today are never bookable.
 */
export type CalendlyAvailability = ((day: Day) => SlotTime[]) | Record<Day, SlotTime[]>;

export interface CalendlyHost {
  name: string;
  /** A picture URL, shown round on the left and on the confirmation. Initials when missing. */
  photo?: string;
}

export interface CalendlyQuestion {
  id: string;
  label: string;
  /** "Can't be blank" when left empty. */
  required?: boolean;
  /** A text area instead of a one-line field. */
  multiline?: boolean;
}

export interface CalendlyEventType {
  /** "30 Minute Meeting" */
  name: string;
  /** Minutes: "30 min" on the left, and the end of the booked time. */
  duration: number;
  /** Where it happens: "Google Meet" by default. */
  location?: string;
  /** The icon by the location: Google Meet's logo (default) or a map pin. */
  locationIcon?: "meet" | "pin";
  /** On the confirmation, next to the location: "Web conferencing details to follow." by default. */
  locationNote?: string;
  /** Shown under the details while picking a time. */
  description?: string;
  /**
   * The questions on the Enter Details form, after name, email and guests.
   * One multi-line "Please share anything that will help prepare for our meeting." by default.
   */
  questions?: CalendlyQuestion[];
}

export interface CalendlyTimeZone {
  /** An IANA id ("America/New_York"): the menu shows the time there now. */
  id: string;
  /** "Eastern Time - US & Canada" */
  label: string;
  /** Hours from UTC. Worked out from `id` for the day shown when left out. */
  offset?: number;
}

export interface CalendlySeed {
  host: CalendlyHost;
  event: CalendlyEventType;
  availability: CalendlyAvailability;
  /** The time zones in the picker, in menu order. At least one. */
  timeZones: CalendlyTimeZone[];
  /** The id of the zone `availability` is written in; the first of `timeZones` by default. */
  hostTimeZone?: string;
  /** The zone the invitee sees times in at the start; `hostTimeZone` by default. */
  timeZone?: string;
  /** The month shown first, "YYYY-MM"; the month of `today` by default. */
  month?: string;
  /** Today, "YYYY-MM-DD": gets the dot, and nothing before it can be booked. The real date by default. */
  today?: Day;
  theme?: "light" | "dark";
}

/** What the invitee has typed on the Enter Details form. */
export interface CalendlyForm {
  name: string;
  email: string;
  /** Comma- or space-separated emails, as typed. */
  guests: string;
  /** Answers to `event.questions`, by question id. */
  answers: Record<string, string>;
}

/** A booking made on the page. */
export interface CalendlyBooking {
  day: Day;
  /** The start, on the host's clock. */
  time: SlotTime;
  /** The zone the invitee picked it in. */
  timeZone: string;
  name: string;
  email: string;
  guests: string[];
  answers: Record<string, string>;
}

/** Everything that changes while the page is used. Plain JSON. */
export interface CalendlyState {
  version: 1;
  step: "calendar" | "details" | "done";
  /** The month on screen, "YYYY-MM". */
  month: string;
  /** The day picked, whose times show next to the calendar. */
  day: Day | null;
  /** The time picked (on the host's clock), showing Next. */
  slot: SlotTime | null;
  /** The invitee's time zone id. */
  timeZone: string;
  form: CalendlyForm;
  /** "Add Guests" was pressed. */
  showGuests: boolean;
  /** Form errors by field: "name", "email", "guests" or a question id. */
  errors: Record<string, string>;
  /** Bookings made here, oldest first; their times are no longer offered. */
  bookings: CalendlyBooking[];
  theme: "light" | "dark";
}

/** What the invitee does. */
export type CalendlyEvent =
  | { type: "month"; month: string }
  | { type: "date"; day: Day }
  | { type: "slot"; day: Day; time: SlotTime }
  /** Next on a time: on to Enter Details. */
  | { type: "next"; day: Day; time: SlotTime }
  | { type: "back" }
  | { type: "timezone"; timeZone: string }
  | { type: "book"; booking: CalendlyBooking }
  /** The form was sent with errors (by field). */
  | { type: "invalid"; errors: Record<string, string> }
  | { type: "again" }
  | { type: "link"; link: "cookies" | "terms" | "privacy" | "powered-by" };
