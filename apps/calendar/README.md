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
