import type { CalendlyTimeZone, Day, SlotTime } from "./types";

// Days, times and time zones, the way the booking page writes them:
// "Friday, October 3", "9:30am", "9:00am - 9:30am, Friday, October 3, 2026".

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-03" from a year, a month (0-11) and a date. Months and dates past the end roll over. */
export function dayOf(year: number, month: number, date: number): Day {
  const d = new Date(Date.UTC(year, month, date));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The real date where this runs, "YYYY-MM-DD". */
export function localToday(): Day {
  const d = new Date();
  return dayOf(d.getFullYear(), d.getMonth(), d.getDate());
}

/** A day's year, month (0-11), date and weekday (0 is Sunday). */
export function partsOf(day: Day) {
  const [y, m, d] = day.split("-").map(Number);
  return { year: y, month: m - 1, date: d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "YYYY-MM" to its year and month (0-11). */
export function monthParts(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { year: y, month: m - 1 };
}
export const monthOf = (year: number, month: number) => dayOf(year, month, 1).slice(0, 7);

/** "Friday, October 3" */
export function longDay(day: Day, withYear = false) {
  const p = partsOf(day);
  return `${DAYS[p.weekday]}, ${MONTHS[p.month]} ${p.date}${withYear ? `, ${p.year}` : ""}`;
}

/** "09:30" to minutes after midnight. */
export const minutesOf = (time: SlotTime) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Minutes after midnight to "9:30am"; wraps past midnight either way. */
export function clock(minutes: number) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${pad(m % 60)}${h < 12 ? "am" : "pm"}`;
}

/** Hours from UTC in a zone on a day: its `offset`, or worked out from its IANA id. */
export function offsetOf(zone: CalendlyTimeZone | undefined, day: Day) {
  if (!zone) return 0;
  if (zone.offset != null) return zone.offset;
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone.id, timeZoneName: "longOffset" })
      .formatToParts(new Date(`${day}T12:00:00Z`))
      .find((p) => p.type === "timeZoneName")?.value;
    const m = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
    return m ? (m[1] === "-" ? -1 : 1) * (+m[2] + +m[3] / 60) : 0;
  } catch {
    return 0;
  }
}

/** The time it is now in a zone, "10:12am", as the time zone menu shows it. */
export function nowIn(zone: CalendlyTimeZone) {
  try {
    return new Date().toLocaleTimeString("en-US", { timeZone: zone.id, hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
  } catch {
    const now = new Date();
    return clock(now.getUTCHours() * 60 + now.getUTCMinutes() + offsetOf(zone, localToday()) * 60);
  }
}

/** "9:00am - 9:30am, Friday, October 3, 2026": a host time on a day, shown in another zone. */
export function whenText(day: Day, start: number, duration: number) {
  return `${clock(start)} - ${clock(start + duration)}, ${longDay(day, true)}`;
}
