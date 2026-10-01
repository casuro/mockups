# Google Calendar (React)

`apps/calendar.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy
the folder into your project and it is yours: use it as it is, or change
any file for what your screen needs.

```bash
cp -r apps/calendar src/apps/calendar
```

It needs only React 19. The styles are plain CSS scoped to `.kit-calendar`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included), and Roboto is embedded, so nothing loads from the
network.

## Use

```tsx
import { GoogleCalendar, useGoogleCalendar, type CalendarSeed } from "./apps/calendar";

const seed: CalendarSeed = {
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.example" },
    priya: { name: "Priya Shah", email: "priya@northwind.example" },
  },
  calendars: [
    { id: "sam", name: "Sam Rivera", color: "#039be5", primary: true },
    { id: "holidays", name: "Holidays", color: "#0b8043", group: "other" },
  ],
  entries: [
    {
      title: "Quarterly planning", date: "2026-03-10", start: "10:00", end: "11:00",
      meet: "abc-defg-hij", location: "Room 4",
      guests: [{ person: "priya", rsvp: "yes", organizer: true }, { person: "sam" }],
    },
    { title: "Spring break", date: "2026-03-13", allDay: true, calendar: "holidays" },
  ],
  start: "2026-03-10",
};

function Planner() {
  const calendar = useGoogleCalendar(seed, {
    onEvent(event) {
      if (event.type === "rsvp") {
        // They answered event.id with event.answer; record it, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <GoogleCalendar calendar={calendar} />
    </div>
  );
}
```

`<GoogleCalendar>` fills the box it is in, so give that box a height. It
switches to Calendar's phone layout (three days, the side panel as a
drawer) when the box is under 760px wide, whatever the window size, so it
also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`: everyone, by id. `me` is the signed-in person's id. `photo` is
  a picture URL, otherwise initials on `color`.
- `calendars`, in side panel order, under "My calendars" or (`group:
  "other"`) "Other calendars", with a `color` and whether they start
  `visible`. The `primary` one is the signed-in person's own: its events
  can be deleted, show a reminder, and new events go on it.
- `entries`: a `title`, a `date` ("2026-03-10") and either `start`/`end`
  ("09:30", 24-hour) or `allDay`. Optional: `calendar`, `color`, `guests`
  (a person or an outside `email`, their `rsvp`, `organizer`), `location`,
  `meet` (a Meet code), `description`, `recurrence` (the text the popover
  shows; list each occurrence as its own entry), `focus` (focus time),
  `task` (an outlined task chip in the all-day row), and `custom`.
- `start`: the day on screen at first (today by default); `view`: "day",
  "week" or "month".

## Driving it

`useGoogleCalendar` returns the calendar. The world acts on it through:

| Call | What happens |
| --- | --- |
| `calendar.addEntry(entry)` | An entry appears (an invite lands, someone books time). Returns its id. |
| `calendar.updateEntry(id, patch)` | An entry changes: moved, renamed, a guest or a Meet link added. |
| `calendar.removeEntry(id)` | An entry goes away (its organizer cancelled it). |
| `calendar.rsvp(entryId, personIdOrEmail, "yes" \| "no" \| "maybe")` | A guest answers; the popover's guest list and counts follow. |
| `calendar.open(id)` / `open(null)` | Opens an entry's popover, or closes it. |
| `calendar.goTo(date, view?)` | Shows a day, in a view. |
| `calendar.toast(text)` | A notice at the bottom left. |
| `calendar.setTheme("dark")` | Calendar's dark theme. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "create", entry }` | They save an event from quick-create (Create, or a click on an empty slot). |
| `{ type: "delete", entry }` | They delete an event on their own calendar. |
| `{ type: "rsvp", id, answer }` | They press Yes, No or Maybe under "Going?". |
| `{ type: "open", id }` | They open an entry's popover. |
| `{ type: "join", id, meet }` | They press "Join with Google Meet". |
| `{ type: "navigate", date, view }` | Today, the arrows, the mini month, or a day's number. |
| `{ type: "view", view }` | They switch between Day, Week and Month (the menu, or D, W, M). |
| `{ type: "toggle", calendar, visible }` | They tick or untick a calendar. |

`calendar.state` is everything that changed, as plain JSON: save it, and
pass it back as `useGoogleCalendar(seed, { restore })` to pick up where
they left off.

## API reference

Everything below is taken from `index.ts`, `types.ts`, `use-google-calendar.ts`
and `GoogleCalendar.tsx`; you should not need to open them.

### Imports

```ts
import {
  GoogleCalendar, useGoogleCalendar,
  type GoogleCalendarProps, type GoogleCalendarApp, type CalendarOptions, type Person,
  type CalendarSeed, type CalendarState, type CalendarEvent, type CalendarEntry, type CalendarEntryInput,
  type CalendarPerson, type CalendarCalendar, type CalendarGuest, type CalendarView, type Rsvp,
} from "./apps/calendar";
// The launcher logo and its Dock tile are not re-exported by index.ts (see the repo README):
import { AppLogo, appTile } from "./apps/calendar/icons";
```

### The hook

```ts
function useGoogleCalendar(seed: CalendarSeed, options?: CalendarOptions): GoogleCalendarApp;

interface CalendarOptions {
  restore?: CalendarState | null;             // a saved `calendar.state`; read on the first render only
  onEvent?: (event: CalendarEvent) => void;   // what the signed-in person does
}
```

`restore` is used only when its `version` is `1`; otherwise the seed is used.
Both options are read once (`restore`) or through a ref (`onEvent`), so an
inline `onEvent` is fine. It throws if `seed.me` is not a key of
`seed.people`. Keep the seed at module level (or in `useMemo`): `people` is
recomputed whenever the seed object changes.

### The seed

```ts
interface CalendarSeed {
  me: string;                                  // required: a key of `people`
  people: Record<string, CalendarPerson>;      // required
  calendars: CalendarCalendar[];               // required, in side panel order
  entries: CalendarEntryInput[];               // required
  start?: string;                              // "2026-09-28"; today by default
  view?: CalendarView;                         // "day" | "week" | "month"; default "week"
  theme?: "light" | "dark";                    // default "light"
}

interface CalendarPerson {
  name: string;                                // required
  email?: string;
  photo?: string;                              // picture URL; else initials on `color`
  initials?: string;                           // default: first letter of `name`
  color?: string;
}

interface CalendarCalendar {
  id: string;                                  // required
  name: string;                                // required
  color: string;                               // required, "#039be5"
  group?: "mine" | "other";                    // default "mine"
  visible?: boolean;                           // default true
  primary?: boolean;                           // the signed-in person's own; first with it, else the first calendar
}

interface CalendarEntryInput {
  id?: string;                                 // "e1", "e2"... when left out
  title: string;                               // required
  date: string;                                // required, "2026-09-28"
  calendar?: string;                           // a calendar id; the primary one by default
  allDay?: boolean;
  start?: string;                              // "09:30", 24-hour; ignored when allDay
  end?: string;                                // "10:15", "24:00" = midnight; start + 1h by default
  color?: string;                              // overrides the calendar's color
  guests?: CalendarGuest[];
  location?: string;
  meet?: string;                               // a Meet code; shows "Join with Google Meet"
  description?: string;
  recurrence?: string;                         // text only ("Weekly on weekdays"); list each occurrence yourself
  focus?: boolean;                             // focus time
  task?: boolean;                              // outlined chip in the all-day row
  custom?: { type: string; data?: unknown };   // drawn by the `renderDetails` prop
}

interface CalendarGuest {
  person?: string;                             // a key of `people`...
  email?: string;                              // ...or an outside address
  rsvp?: Rsvp;                                 // "yes" | "no" | "maybe" | "awaiting"; default "awaiting"
  organizer?: boolean;
}
```

A stored `CalendarEntry` is a `CalendarEntryInput` with `id: string`,
`calendar: string` and `guests: (CalendarGuest & { rsvp: Rsvp })[]` always
filled in.

### What the world can do

All on the object `useGoogleCalendar` returns; every function is stable
across renders and safe to call from timers and after `await`.

```ts
calendar.addEntry(entry: CalendarEntryInput): string            // adds an entry, returns its id
calendar.updateEntry(id: string, patch: Partial<CalendarEntryInput>): void   // merges the patch; unknown id is ignored
calendar.removeEntry(id: string): void                          // removes it (closes its popover if open)
calendar.rsvp(id: string, who: string, answer: Rsvp): void      // `who` is a person id or a guest email; adds them as a guest if missing
calendar.open(id: string | null): void                          // opens an entry's popover, or closes it
calendar.goTo(date: string, view?: CalendarView): void          // shows a day, in a view (current view by default)
calendar.toast(text: string): void                              // a notice at the bottom left
calendar.setTheme(theme: "light" | "dark"): void
```

Read-only fields: `seed`, `people: Record<string, Person>` (with `id`,
`name`, `email?`, `initials`, `color`, `photo?`), `me`, `primary` (the id of
the calendar new entries go on), `state`, `now` (a `Date`, ticks every 30s),
`notice`. `calendar.ui` holds what `<GoogleCalendar>` calls for the signed-in
person (`navigate`, `step`, `setView`, `toggleCalendar`, `select`, `create`,
`remove`, `answer`, `join`, `emit`); each one fires an `onEvent`, so the world
should not call them.

The world's calls never fire `onEvent`: only the signed-in person's actions
do.

### Events

```ts
type CalendarEvent =
  | { type: "create"; entry: CalendarEntry }           // saved from quick-create
  | { type: "delete"; entry: CalendarEntry }           // deleted one of their own (primary calendar) entries
  | { type: "rsvp"; id: string; answer: "yes" | "no" | "maybe" }
  | { type: "open"; id: string }                       // opened an entry's popover
  | { type: "join"; id: string; meet: string }         // pressed "Join with Google Meet"
  | { type: "navigate"; date: string; view: CalendarView }
  | { type: "view"; view: CalendarView }
  | { type: "toggle"; calendar: string; visible: boolean };
```

### State

`calendar.state` is a `CalendarState`, plain JSON (no functions, no
`Date`s): `{ version: 1, view, anchor, visible, entries: CalendarEntry[],
selected, theme, seq }`. Save it whenever it changes and pass it back as
`useGoogleCalendar(seed, { restore })`. Read `calendar.state.entries` to see
what is on the calendar now, including what the person created.

### The component

```ts
interface GoogleCalendarProps {
  calendar: GoogleCalendarApp;                         // required: what useGoogleCalendar returned
  renderDetails?: (entry: CalendarEntry) => ReactNode; // draws an entry's `custom` part in its popover
  className?: string;
  style?: CSSProperties;
}
```

It fills its parent, so the parent needs a height (`height: 100vh`, or a
flex or grid cell with one). Under 760px of its own width it uses the phone
layout.

Worth knowing before you build on it:

- Quick-create saves a title only, as a one-hour event on the primary
  calendar; "Add guests", "More options", "Edit event" and the Task tab are
  drawn but do nothing. To have the person invite someone, react to the
  `create` event (for example with `updateEntry(id, { guests })`).
- "Going?" (and so the `rsvp` event) shows only on entries where `me` is a
  guest by `person` id.
- Delete (and so the `delete` event) shows only on entries on the primary
  calendar.
- An entry with `custom` shows it only when `renderDetails` is passed.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { GoogleCalendar, useGoogleCalendar, type CalendarSeed, type CalendarState } from "./apps/calendar";

// Module level, so its identity never changes between renders.
const seed: CalendarSeed = {
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.example" },
    priya: { name: "Priya Shah", email: "priya@northwind.example" },
    omar: { name: "Omar Haddad", email: "omar@northwind.example" },
  },
  calendars: [
    { id: "sam", name: "Sam Rivera", color: "#039be5", primary: true },
    { id: "team", name: "Platform team", color: "#33b679" },
  ],
  entries: [
    {
      id: "standup", title: "Standup", date: "2026-03-10", start: "09:30", end: "09:45", calendar: "team",
      meet: "abc-defg-hij", recurrence: "Weekly on weekdays",
      guests: [{ person: "omar", rsvp: "yes", organizer: true }, { person: "sam", rsvp: "yes" }, { person: "priya" }],
    },
    { id: "review", title: "Design review", date: "2026-03-11", start: "14:00", end: "15:00", location: "Room 4" },
  ],
  start: "2026-03-10",
  view: "week",
};

// The hook reads `restore` only on its first render, so load the saved state first.
export function CalendarScreen() {
  const [saved, setSaved] = useState<CalendarState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<CalendarState>().then(setSaved);
  }, []);
  if (saved === undefined) return null;
  return <Planner restore={saved} />;
}

function Planner({ restore }: { restore: CalendarState | null }) {
  const calendar = useGoogleCalendar(seed, {
    restore,
    onEvent(event) {
      if (event.type === "create")
        void casuro.track.document({ action: "create", title: event.entry.title, text: `${event.entry.date} ${event.entry.start}-${event.entry.end}` });
      if (event.type === "delete") void casuro.track.decision({ summary: `Deleted "${event.entry.title}"` });
      if (event.type === "rsvp") {
        void casuro.track.decision({ summary: `Answered ${event.answer} to ${event.id}` });
        if (event.id === "offsite" && event.answer === "no") void priyaMoves(event.id);
      }
    },
  });

  // The organizer reacts to a decline by moving the meeting.
  async function priyaMoves(id: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: "You are Priya Shah. Sam declined your offsite planning meeting. Answer with only a new start time on 2026-03-12, as HH:MM, between 10:00 and 16:00." },
        { role: "user", content: "Pick a new time." },
      ],
      { persona: "Priya Shah" }
    );
    const start = /\d{2}:\d{2}/.exec(reply)?.[0] ?? "15:00";
    calendar.updateEntry(id, { date: "2026-03-12", start, end: `${String(Number(start.slice(0, 2)) + 1).padStart(2, "0")}${start.slice(2)}` });
    calendar.rsvp(id, "sam", "awaiting");
    calendar.toast(`Priya Shah moved "Offsite planning" to ${start}`);
  }

  // A timed event: an invite lands 30 seconds in (once; a restored state already has it).
  useEffect(() => {
    if (calendar.state.entries.some((e) => e.id === "offsite")) return;
    const t = setTimeout(() => {
      calendar.addEntry({
        id: "offsite", title: "Offsite planning", date: "2026-03-11", start: "11:00", end: "12:00", meet: "xqp-hzrn-kfa",
        guests: [{ person: "priya", rsvp: "yes", organizer: true }, { person: "sam" }],
      });
      calendar.toast("Priya Shah invited you to Offsite planning");
    }, 30_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save whenever anything changes.
  useEffect(() => {
    void casuro.store.set(calendar.state);
  }, [calendar.state]);

  return (
    <div style={{ height: "100vh" }}>
      <GoogleCalendar calendar={calendar} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `GoogleCalendar.tsx` | The layout, closing what floats on an outside click, keyboard shortcuts, the toast. |
| `Header.tsx` | The top bar: menu, logo, Today, the arrows, the period, the view switch. |
| `SidePanel.tsx` | Create, the mini month, "Search for people", the calendars and their checkboxes. |
| `TimeGrid.tsx` | The day and week views: all-day row, hours, overlaps side by side, the current-time line. |
| `MonthView.tsx` | The month view. |
| `Popovers.tsx` | An entry's popover, quick-create, and the Day / Week / Month menu. |
| `use-google-calendar.ts` | The state and what changes it. |
| `format.ts` | Days and times, the way Calendar writes them. |
| `calendar.css` | The look, from the mockup. |

For something the popover has no row for (an agenda, attachments, an
approval), give the entry `custom: { type, data }` and draw it with
`<GoogleCalendar renderDetails={(entry) => ...} />`. For anything else,
edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=calendar` next to `/apps/calendar.html`: the same week and
people, drawn by the React version.
