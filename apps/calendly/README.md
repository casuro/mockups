# Calendly (React)

`apps/calendly.html` as React components: the same booking page, pixel for
pixel, with the sample data swapped for props. Like a shadcn component, you
copy the folder into your project and it is yours: use it as it is, or change
any file for what your screen needs.

```bash
cp -r apps/calendly src/apps/calendly
```

It needs only React 19. The styles are plain CSS scoped to `.kit-calendly`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). It uses the system font stack, like the mockup, so
nothing loads from the network.

## Use

```tsx
import { Calendly, useCalendly, type CalendlySeed } from "./apps/calendly";

const seed: CalendlySeed = {
  host: { name: "Priya Shah" },
  event: { name: "Intro Call", duration: 30, description: "A first chat about the role." },
  // Weekdays, 10am to 4pm on the hour, in the host's time zone.
  availability: (day) => {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    return weekday % 6 === 0 ? [] : ["10:00", "11:00", "13:00", "14:00", "15:00"];
  },
  timeZones: [
    { id: "America/New_York", label: "Eastern Time - US & Canada" },
    { id: "Europe/London", label: "UK, Ireland, Lisbon Time" },
  ],
};

function Booking() {
  const calendly = useCalendly(seed, {
    onEvent(event) {
      if (event.type === "book") {
        // event.booking has the day, time, name, email, guests and answers.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Calendly calendly={calendly} />
    </div>
  );
}
```

`<Calendly>` fills the box it is in, so give that box a height; the page
scrolls inside it. It switches to Calendly's phone layout when the box is
under 760px wide, whatever the window size, so it also works as one pane of
a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `host`: the `name`, and a `photo` URL (initials when missing).
- `event`: the event type's `name`, `duration` in minutes, `location`
  ("Google Meet" by default, with Meet's logo, or a pin with
  `locationIcon: "pin"`), `description`, and the `questions` on the Enter
  Details form after name, email and guests.
- `availability`: when the host is free, on the host's clock. A function
  from a day ("2026-10-02") to its start times (["09:00", "09:30"]), or those
  lists by day. A day with no times is greyed out; days before `today` and
  times already booked on the page are never offered.
- `timeZones`: the picker's menu. Each has an IANA `id` and a `label`; its
  UTC `offset` in hours is worked out from the id unless given.
  `hostTimeZone` is the zone `availability` is written in (the first one by
  default) and `timeZone` the one the invitee starts in.
- `month` ("2026-10") and `today` ("2026-10-01") to pin the calendar; the
  real date by default.

## Driving it

`useCalendly` returns the page. The world acts on it through:

| Call | What happens |
| --- | --- |
| `calendly.setAvailability(next)` | The host's free times change. A picked day or time that is no longer open is let go. |
| `calendly.reset()` | Back to the page as it opened: the seed's availability, month and time zone, an empty form, no bookings. |
| `calendly.toast(text)` | A notice at the bottom. |
| `calendly.setTheme("dark")` | Dark or light. |

Every function is stable across renders.

The invitee's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "month", month }` | They page the calendar. |
| `{ type: "date", day }` | They pick a day. |
| `{ type: "slot", day, time }` | They pick a time (on the host's clock). |
| `{ type: "next", day, time }` | They press Next on it, on to Enter Details. |
| `{ type: "back" }` | They go back to the calendar. |
| `{ type: "timezone", timeZone }` | They pick another time zone. |
| `{ type: "book", booking }` | Schedule Event with a valid form: the day, time, zone, name, email, guests and answers. |
| `{ type: "invalid", errors }` | Schedule Event with errors, by field. |
| `{ type: "again" }` | Schedule another event. |
| `{ type: "link", link }` | Cookie settings, the Terms, the Privacy Notice, or the Powered by ribbon. |

`calendly.state` is everything that changed, as plain JSON (the step, the
day and time picked, the time zone, the form, the bookings): save it, and
pass it back as `useCalendly(seed, { restore })` to pick up where they left
off. Availability is part of the seed, not the state.

## API reference

Everything below is what the kit's source defines; nothing else exists.

### Imports

```ts
import {
  Calendly, useCalendly, dayOf, localToday,
  type CalendlyProps, type CalendlyPage, type CalendlyOptions,
  type CalendlySeed, type CalendlyState, type CalendlyEvent, type CalendlyBooking,
  type CalendlyAvailability, type Day, type SlotTime,
} from "./apps/calendly";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/calendly/icons";
```

`index.ts` also re-exports every other type in `types.ts` (`CalendlyHost`, `CalendlyEventType`, `CalendlyQuestion`, `CalendlyTimeZone`, `CalendlyForm`). Two helpers: `localToday(): Day` is today on the browser's clock as `"YYYY-MM-DD"`, and `dayOf(year: number, month: number, date: number): Day` builds a day with a zero-based `month` (like `Date`: `dayOf(2026, 9, 2)` is `"2026-10-02"`), rolling over out-of-range dates.

### The hook

```ts
function useCalendly(seed: CalendlySeed, options?: CalendlyOptions): CalendlyPage;

interface CalendlyOptions {
  restore?: CalendlyState | null;              // a saved `calendly.state`; read on the first render only
  onEvent?: (event: CalendlyEvent) => void;    // everything the invitee does
}
```

It throws if `seed.timeZones` is empty. A `restore` whose `version` is not `1` is ignored.

### The seed

```ts
type Day = string;         // "YYYY-MM-DD"
type SlotTime = string;    // "HH:MM", 24-hour, on the host's clock
type CalendlyAvailability = ((day: Day) => SlotTime[]) | Record<Day, SlotTime[]>;

interface CalendlySeed {
  host: { name: string; photo?: string };      // required
  event: CalendlyEventType;                    // required
  availability: CalendlyAvailability;          // required: host's free start times per day
  timeZones: { id: string; label: string; offset?: number }[];   // required, at least one; id is IANA
  hostTimeZone?: string;                       // zone `availability` is in; the first of timeZones by default
  timeZone?: string;                           // invitee's starting zone; hostTimeZone by default
  month?: string;                              // "YYYY-MM" shown first; today's month by default
  today?: Day;                                 // the real date by default; nothing before it is bookable
  theme?: "light" | "dark";
}

interface CalendlyEventType {
  name: string;                                // required: "30 Minute Meeting"
  duration: number;                            // required: minutes
  location?: string;                           // "Google Meet" by default
  locationIcon?: "meet" | "pin";
  locationNote?: string;                       // on the confirmation
  description?: string;
  questions?: { id: string; label: string; required?: boolean; multiline?: boolean }[];
                                               // after name, email, guests; one "notes" question by default
}
```

### What the world can do

All of these are stable across renders. There is no way to message the invitee from the page besides a toast: a persona's answer to a booking belongs in another app (mail, chat).

```ts
calendly.setAvailability(next: CalendlyAvailability): void
  // The host's free times from now on; a picked day or time that is no longer open is let go.
calendly.reset(): void          // back to the seed: its availability, month and zone, an empty form, no bookings
calendly.toast(text: string): void
calendly.setTheme(theme: "light" | "dark"): void
```

Read-only fields: `calendly.state`, `calendly.seed`, `calendly.notice`, `calendly.today` (`Day`), `calendly.questions` (the form's questions, defaults applied), `calendly.zone` (the invitee's `CalendlyTimeZone`), `calendly.booking` (the latest `CalendlyBooking`, or `null`), `calendly.slotsFor(day: Day): SlotTime[]` (times still open that day: none before today, none already booked), `calendly.localMinutes(day: Day, time: SlotTime, zoneId?: string): number` (a host time in minutes after midnight on the invitee's clock, or `zoneId`'s). `calendly.ui` is what `<Calendly>` calls for the invitee; a world does not need it.

### Events

```ts
interface CalendlyBooking {
  day: Day; time: SlotTime;         // the start, on the host's clock
  timeZone: string;                 // the zone the invitee picked it in
  name: string; email: string;
  guests: string[];                 // split from what was typed
  answers: Record<string, string>;  // by question id
}

type CalendlyEvent =
  | { type: "month"; month: string }
  | { type: "date"; day: Day }
  | { type: "slot"; day: Day; time: SlotTime }
  | { type: "next"; day: Day; time: SlotTime }            // on to Enter Details
  | { type: "back" }
  | { type: "timezone"; timeZone: string }
  | { type: "book"; booking: CalendlyBooking }
  | { type: "invalid"; errors: Record<string, string> }   // by field: "name", "email", "guests" or a question id
  | { type: "again" }                                     // Schedule another event
  | { type: "link"; link: "cookies" | "terms" | "privacy" | "powered-by" };
```

### State

`calendly.state` is a `CalendlyState`: plain JSON (`version: 1`, `step` of `"calendar" | "details" | "done"`, `month`, `day`, `slot`, `timeZone`, `form`, `showGuests`, `errors`, `bookings`, `theme`), a new object after every change. Save it, and pass it back as `useCalendly(seed, { restore })`; `restore` is read only when the hook first mounts, so load the saved state before rendering the component that calls `useCalendly`. Availability is not in the state: after a restore the page uses `seed.availability` again, so call `setAvailability` again (or save it yourself) if the world changed it.

### The component

```ts
interface CalendlyProps {
  calendly: CalendlyPage;    // required: from useCalendly
  className?: string;
  style?: CSSProperties;
}
```

`<Calendly>` fills its parent and scrolls inside it, so the parent needs a height. Under 760px of width it uses the phone layout. There is no `renderCustom`.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Calendly, useCalendly, type CalendlySeed, type CalendlyState, type Day } from "./apps/calendly";

const weekdays = (day: Day) => {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return weekday % 6 === 0 ? [] : ["10:00", "11:00", "13:00", "14:00", "15:00"];
};

const seed: CalendlySeed = {
  host: { name: "Priya Shah" },
  event: { name: "Intro Call", duration: 30, description: "A first chat about the role.",
           questions: [{ id: "topic", label: "What would you like to cover?", required: true, multiline: true }] },
  availability: weekdays,
  timeZones: [
    { id: "America/New_York", label: "Eastern Time - US & Canada" },
    { id: "Europe/London", label: "UK, Ireland, Lisbon Time" },
  ],
};

export default function Episode() {
  // `restore` is read once, on mount: load the saved state before rendering the page.
  const [saved, setSaved] = useState<CalendlyState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<CalendlyState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Booking saved={saved} />;
}

function Booking({ saved }: { saved: CalendlyState | null }) {
  const calendly = useCalendly(seed, {
    restore: saved,
    async onEvent(event) {
      if (event.type !== "book") return;
      const { day, time, timeZone, answers } = event.booking;
      const text = `Booked ${day} ${time} (${timeZone}): ${answers.topic ?? ""}`;
      void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: "calendly", text });
      const reply = await casuro.llm(
        [
          { role: "system", content: "You are Priya Shah. In one short sentence, acknowledge this meeting booking." },
          { role: "user", content: text },
        ],
        { persona: "Priya Shah" },
      );
      // The page has no message thread: the toast is its only way to show it.
      calendly.toast(reply);
      void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "calendly", text: reply });
    },
  });

  // One timed beat: 30 seconds in, the host's afternoons fill up.
  useEffect(() => {
    const t = setTimeout(() => {
      calendly.setAvailability((day) => weekdays(day).filter((time) => time < "12:00"));
      calendly.toast("Priya's calendar just changed");
    }, 30_000);
    return () => clearTimeout(t);
  }, [calendly.setAvailability, calendly.toast]);

  // Save every change.
  useEffect(() => void casuro.store.set(calendly.state), [calendly.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Calendly calendly={calendly} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Calendly.tsx` | The page and card, Cookie settings, the ribbon, the toast. |
| `HostPanel.tsx` | The left side: host, event, and the time picked on Enter Details. |
| `Picker.tsx` | Select a Date & Time: the month, the time zone menu, the times with Next. |
| `Details.tsx` | Enter Details: the form, guests, questions, validation. |
| `Confirmation.tsx` | You are scheduled. |
| `use-calendly.ts` | The state and what changes it. |
| `format.ts` | Days, times and time zone offsets. |
| `calendly.css` | The look, from the mockup. |

There is no escape hatch for custom parts: the form's extra fields come from
`event.questions`, and for anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=calendly` next to `/apps/calendly.html`: the same booking
page, drawn by the React version.
