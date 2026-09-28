# Greenhouse (React)

`apps/greenhouse.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy the
folder into your project and it is yours: use it as it is, or change any
file for what your screen needs.

```bash
cp -r apps/greenhouse src/apps/greenhouse
```

It needs only React 19. The styles are plain CSS scoped to `.kit-greenhouse`,
so they neither leak into the rest of the page nor pick up its styles
(Tailwind included). Greenhouse uses the system font stack, so there is no
font to embed and nothing loads from the network.

## Use

```tsx
import { Greenhouse, useGreenhouse, type GreenhouseSeed } from "./apps/greenhouse";

const seed: GreenhouseSeed = {
  company: { name: "Northwind" },
  me: "sam",
  staff: {
    sam: { name: "Sam Rivera", role: "Hiring Manager" },
    priya: { name: "Priya Shah", role: "Recruiter" },
  },
  job: {
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    hiringTeam: ["sam", "priya"],
    recruiter: "priya",
  },
  stages: ["Application Review", "Phone Screen", "Onsite", "Offer"],
  candidates: [
    { id: "c1", name: "Alex Moore", company: "Figtree", title: "Designer", source: "LinkedIn", stage: "Phone Screen", days: 2, rating: 2,
      scorecards: [{ by: "priya", step: "Phone Screen", recommendation: null }] },
  ],
};

function Recruiting() {
  const greenhouse = useGreenhouse(seed, {
    onEvent(event) {
      if (event.type === "move") {
        // They moved event.candidate from event.from to event.to; react, record, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <Greenhouse greenhouse={greenhouse} />
    </div>
  );
}
```

`<Greenhouse>` fills the box it is in, so give that box a height; the page
scrolls inside it under a sticky top nav. It switches to Greenhouse's mobile
layout when the box is under 760px wide, whatever the window size, so it also
works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `staff`: the company's people, by id, with a `role` and a `photo` URL
  (initials on `color` otherwise). `me` is the signed-in person's id.
- `job`: its title, department, location, req number and status, the
  `hiringTeam` shown top right, and the `recruiter` and `coordinator` in a
  candidate's Details.
- `stages`: the pipeline's columns, in order.
- `candidates`, in board order. Each has `initials` (or a `photo`), `company`,
  `title`, `source`, `stage` (one of `stages`), `days` in stage, a 0-3
  `rating` (the dots), contact details, `tags`, `applied`, and:
  - `scorecards`: an interviewer's `recommendation` (`"strong-yes"`, `"yes"`,
    `"no"`, or `null` while awaited) with `[attribute, 1-4]` rows. Any awaited
    one puts "Needs scorecard" on the card.
  - `activity`, newest first: a note, a stage move or an email, `by` a staff
    id or any name ("Greenhouse"), `at` a time shown as "3 days ago".
  - `interviews`: a title, `when` (a timestamp, or text shown as it is) and
    the staff `with` them.

## Driving it

`useGreenhouse` returns the app. The world acts on it through:

| Call | What happens |
| --- | --- |
| `greenhouse.addCandidate(candidate)` | A new candidate lands at the end of their stage. |
| `greenhouse.moveCandidate(id, stage, by?)` | Someone else moves a candidate; with `by`, it shows in their activity feed. |
| `greenhouse.submitScorecard(candidateId, scorecard, rating?)` | A scorecard comes in: it replaces the awaited one from the same person and step, or is added. `rating` sets the card's dots. |
| `greenhouse.addActivity(candidateId, item)` | Something tops their activity feed (an email sent, a note). Returns its id. |
| `greenhouse.scheduleInterview(candidateId, interview)` | An interview shows under Upcoming Interviews. |
| `greenhouse.rejectCandidate(id)` | A candidate leaves the board. |
| `greenhouse.open(id)` / `(null)` | Opens or closes a candidate's drawer. |
| `greenhouse.toast(text)` | A notice at the bottom. |
| `greenhouse.setTheme("dark")` | Light or dark. |

Every function is stable across renders.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "open", candidate }` / `{ type: "close", candidate }` | They open or close a candidate's drawer. |
| `{ type: "move", candidate, from, to }` | They move a candidate from the drawer. |
| `{ type: "bulk-move", candidates, to }` | They tick candidates and move them together. |
| `{ type: "reject", candidate }` | They reject a candidate. |
| `{ type: "note", candidate, text, id }` | They save a note. |
| `{ type: "schedule", candidate }` | They press Schedule interview (the coordinator is told; book it with `scheduleInterview`). |
| `{ type: "filter", stage }` | They pick a stage chip (`null` is All stages). |
| `{ type: "action", kind, label }` | They press Add a candidate, the bell, a nav link, a job tab or an email address. |

`greenhouse.state` is everything that changed, as plain JSON: save it, and
pass it back as `useGreenhouse(seed, { restore })` to pick up where they left
off.

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `Greenhouse.tsx` | The layout, Esc to close the drawer, the toast. |
| `Header.tsx` | The top nav, and the job header with its hiring team and tabs. |
| `Board.tsx` | The pipeline toolbar (stage chips, bulk move) and the board of columns and cards. |
| `Drawer.tsx` | A candidate's drawer: profile, stage progress, move and reject, scorecards, activity and notes, interviews, details. |
| `use-greenhouse.ts` | The state and what changes it. |
| `context.tsx` | The context and the staff and candidate avatars. |
| `format.ts` | "3 days ago" and interview times. |
| `icons.tsx` | The icons and the Greenhouse logo. |
| `greenhouse.css` | The look, from the mockup. |

For anything the kit has no part for (another tab's page, a scorecard form),
the nav links, job tabs and buttons report what was pressed through
`{ type: "action" }`, so the episode can answer with a toast or a screen of
its own; for more, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=greenhouse` next to `/apps/greenhouse.html`: the same job and
pipeline, drawn by the React version, with the coordinator booking an
interview a moment after you ask for one.
