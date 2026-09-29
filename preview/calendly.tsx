import { useRef } from "react";
import { Calendly, useCalendly, type CalendlyPage, type CalendlySeed } from "../apps/calendly";
import { FACES } from "./faces";

// apps/calendly.html's booking page, drawn by the React version: Naman's
// 30 minute meeting, his weekday hours (9am-5pm Eastern, with a few days and
// times already taken), and the same six time zones.

const pad = (n: number) => String(n).padStart(2, "0");

// Weekdays from today on, skipping a few; half-hour starts from 9am to 5pm, a few of them taken.
function availability(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  const date = d.getUTCDate();
  if (d.getUTCDay() % 6 === 0 || (date * 7) % 11 === 3) return [];
  const out: string[] = [];
  for (let m = 9 * 60; m < 17 * 60; m += 30) if ((m / 30 + date) % 5 !== 0) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

export const CALENDLY_DEMO: CalendlySeed = {
  host: { name: "Naman Shukla", photo: FACES.naman },
  event: {
    name: "30 Minute Meeting",
    duration: 30,
    location: "Google Meet",
    description: "A quick call to talk through how Casuro can help your team. Share a bit of context below and I will come prepared.",
  },
  availability,
  // The mockup's offsets from Eastern, with Eastern at UTC-4.
  timeZones: [
    { id: "America/New_York", label: "Eastern Time - US & Canada", offset: -4 },
    { id: "America/Chicago", label: "Central Time - US & Canada", offset: -5 },
    { id: "America/Denver", label: "Mountain Time - US & Canada", offset: -6 },
    { id: "America/Los_Angeles", label: "Pacific Time - US & Canada", offset: -7 },
    { id: "Europe/London", label: "UK, Ireland, Lisbon Time", offset: 1 },
    { id: "Asia/Kolkata", label: "India Standard Time", offset: 5.5 },
  ],
};

export function CalendlyPreview() {
  const ref = useRef<CalendlyPage | null>(null);
  const calendly = useCalendly(CALENDLY_DEMO, {
    onEvent(event) {
      const page = ref.current!;
      if (event.type === "link" && event.link === "cookies") page.toast("Only essential cookies are in use");
      if (event.type === "link" && event.link === "powered-by") page.toast("Opening calendly.com...");
    },
  });
  ref.current = calendly;
  return <Calendly calendly={calendly} />;
}
