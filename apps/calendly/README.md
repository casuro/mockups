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
