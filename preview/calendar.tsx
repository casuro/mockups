import { useRef } from "react";
import { GoogleCalendar, useGoogleCalendar, type CalendarEntryInput, type CalendarGuest, type CalendarSeed, type GoogleCalendarApp, type Rsvp } from "../apps/calendar";
import { FACES } from "./faces";

// apps/calendar.html's week, driving the React version: the same people,
// calendars and events around today, with a notice when you join a call or
// delete an event.

// The day `n` days from this week's Monday, as "2026-09-28".
function at(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// ["hana", "yes", true] is Hana, going, organizing.
const G = (...list: [string, Rsvp, boolean?][]): CalendarGuest[] =>
  list.map(([who, rsvp, organizer]) => ({ ...(who.includes("@") ? { email: who } : { person: who }), rsvp, ...(organizer ? { organizer } : {}) }));
const FOCUS = "Heads-down block. Chat notifications muted, new invites auto-declined.";

const entries: CalendarEntryInput[] = [];
// Standup on weekdays and focus time Mon/Wed mornings, for several weeks around today.
for (let w = -8; w <= 8; w++)
  for (let d = 0; d < 5; d++) {
    const date = at(w * 7 + d);
    entries.push({
      title: "Daily standup", date, start: "09:30", end: "09:45", meet: "xqp-hzrn-kfa", recurrence: "Weekly on weekdays",
      guests: G(["hana", "yes", true], ["naman", "yes"], ["marcus", "yes"], ["sofia", "maybe"], ["dev", "yes"], ["lena", "yes"]),
      description: "15 minutes, three questions: yesterday, today, blockers. Keep deep dives for after.",
    });
    if (d === 0 || d === 2) entries.push({ title: "Focus time", date, start: "10:00", end: "12:00", color: "#f4511e", focus: true, description: FOCUS });
  }
entries.push(
  { title: "1:1 with Hana", date: at(0), start: "14:00", end: "14:30", meet: "hkn-wtpa-ruv", guests: G(["naman", "yes", true], ["hana", "yes"]), description: "Running doc: Q4 roadmap priorities, hiring plan, feedback on the onboarding revamp." },
  { title: "Lunch with Marcus", date: at(0), start: "12:30", end: "13:30", color: "#7986cb", location: "Blue Bottle, 2nd St", guests: G(["marcus", "yes", true], ["naman", "yes"]) },
  {
    title: "Onboarding v4 review", date: at(1), start: "11:00", end: "12:00", meet: "obv-4rev-wzt", location: "Casuro HQ, Room Ada (6)",
    guests: G(["sofia", "yes", true], ["naman", "yes"], ["hana", "yes"], ["dev", "no"], ["lena", "awaiting"]),
    description: "Walkthrough of the v4 onboarding flow: new workspace setup, invite step and the empty-state checklist. Please leave comments in the Figma file before the call.",
  },
  { title: "Design crit: Billing settings", date: at(1), start: "11:30", end: "12:30", color: "#8e24aa", meet: "dcr-bill-mnq", guests: G(["lena", "yes", true], ["naman", "maybe"], ["sofia", "yes"]) },
  { title: "Vendor call: Northwind Analytics", date: at(1), start: "15:00", end: "15:30", meet: "nwa-call-pld", guests: G(["naman", "yes", true], ["marcus", "yes"], ["priya@northwind-analytics.example", "awaiting"]), description: "Pricing and data retention terms for the usage analytics pilot." },
  {
    title: "Architecture sync", date: at(2), start: "15:00", end: "16:00", meet: "arc-sync-jvb", recurrence: "Weekly on Wednesday",
    guests: G(["marcus", "yes", true], ["naman", "yes"], ["dev", "yes"], ["hana", "maybe"]),
    description: "Agenda: event bus migration status, rate limiter design doc, on-call handoff.",
  },
  { title: "Interview: Staff Engineer", date: at(2), start: "15:30", end: "16:30", color: "#e67c73", guests: G(["dev", "yes", true], ["naman", "yes"]), description: "System design round. Scorecard in Greenhouse." },
  { title: "Hiring loop debrief", date: at(3), start: "16:00", end: "16:45", meet: "hld-brf-qsx", guests: G(["dev", "yes", true], ["naman", "yes"], ["marcus", "yes"], ["lena", "awaiting"]), description: "Debrief for the Staff Engineer loop. Submit scorecards before joining." },
  { title: "Focus time", date: at(3), start: "13:00", end: "15:00", color: "#f4511e", focus: true, description: FOCUS },
  {
    title: "Casuro All-hands", date: at(4), start: "12:00", end: "13:00", meet: "all-hnd-cas", location: "Casuro HQ, Commons + Meet",
    guests: G(["lena", "yes", true], ["naman", "yes"], ["hana", "yes"], ["marcus", "yes"], ["sofia", "yes"], ["dev", "yes"]),
    description: "Monthly all-hands: Q3 results, product demos from each squad and open Q&A.",
  },
  { title: "Sprint planning", date: at(4), start: "14:00", end: "15:00", meet: "spr-pln-wqe", guests: G(["hana", "yes", true], ["naman", "yes"], ["dev", "yes"], ["sofia", "yes"]) },
  { title: "Sofia Alvarez's birthday", date: at(2), allDay: true, calendar: "birthdays" },
  { title: "Submit Q3 self-review", date: at(1), allDay: true, calendar: "tasks", task: true },
  { title: "Casuro Recharge Day", date: at(4 + 7), allDay: true, calendar: "holidays" },
  { title: "Casuro Founders' Day", date: at(-3), allDay: true, calendar: "holidays" },
);

export const CALENDAR_DEMO: CalendarSeed = {
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", photo: FACES.naman },
    hana: { name: "Hana Kim", email: "hana@casuro.com", photo: FACES.hana },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", photo: FACES.sofia },
    dev: { name: "Dev Patel", email: "dev@casuro.com", photo: FACES.dev },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", photo: FACES.lena },
  },
  calendars: [
    { id: "naman", name: "Naman Shukla", color: "#039be5", primary: true },
    { id: "tasks", name: "Tasks", color: "#3f51b5" },
    { id: "birthdays", name: "Birthdays", color: "#33b679" },
    { id: "holidays", name: "Casuro Holidays", color: "#0b8043", group: "other" },
  ],
  entries,
  view: "week",
};

export function CalendarPreview() {
  const ref = useRef<GoogleCalendarApp | null>(null);
  const calendar = useGoogleCalendar(CALENDAR_DEMO, {
    onEvent(event) {
      const c = ref.current!;
      if (event.type === "join") c.toast(`Joining meet.google.com/${event.meet}...`);
      if (event.type === "delete") c.toast("Event deleted");
    },
  });
  ref.current = calendar;
  return <GoogleCalendar calendar={calendar} />;
}
