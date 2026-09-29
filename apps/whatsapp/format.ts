// Times as WhatsApp Web shows them: "09:47" on a bubble, "Yesterday" or
// "Friday" in the chat list and on the day separators.

export const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

/** "09:47" */
export const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const daysAgo = (at: number) => Math.round((dayStart(Date.now()) - dayStart(at)) / 86400000);

/** "Today", "Yesterday", "Friday" within the week, then the date. */
export function dayLabel(at: number) {
  const days = daysAgo(at);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(at).toLocaleDateString([], { weekday: "long" });
  return new Date(at).toLocaleDateString();
}

/** The time on a chat in the list: the clock today, the day before that. */
export const listTime = (at: number) => (daysAgo(at) <= 0 ? clock(at) : dayLabel(at));

/** A voice note's length: "0:42". */
export const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, "0")}`;

/** "last seen today at 09:34" */
export function lastSeenAt(at: number) {
  const day = dayLabel(at);
  const when = day === "Today" || day === "Yesterday" ? day.toLowerCase() : /^\D+$/.test(day) ? day : `on ${day}`;
  return `last seen ${when} at ${clock(at)}`;
}
