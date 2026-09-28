// Dates as Greenhouse writes them: "Just now", "3 days ago", and an
// interview's "Tue, Sep 30, 10:00 AM".

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

/** How long ago `at` was: "Just now", "5 minutes ago", "2 hours ago", "3 days ago". */
export function ago(at: number, now = Date.now()) {
  const s = Math.max(0, (now - at) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return plural(Math.floor(s / 60), "minute");
  if (s < 86400) return plural(Math.floor(s / 3600), "hour");
  return plural(Math.floor(s / 86400), "day");
}

/** An interview's time: a timestamp formatted "Tue, Sep 30, 10:00 AM", or text as it is. */
export function when(value: number | string) {
  if (typeof value === "string") return value;
  const d = new Date(value);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}
