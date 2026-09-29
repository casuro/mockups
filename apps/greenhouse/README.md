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

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-greenhouse.ts` and
`Greenhouse.tsx`. You should not need to open them.

### Imports

```ts
import {
  Greenhouse, useGreenhouse,
  type GreenhouseProps, type GreenhouseApp, type GreenhouseOptions, type Staff,
  type GreenhouseSeed, type GreenhouseState, type GreenhouseEvent, type GreenhouseCandidate, type GreenhouseCandidateInput,
  type GreenhouseScorecard, type GreenhouseActivityInput, type GreenhouseInterview,
} from "./apps/greenhouse";
```

`index.ts` also re-exports every other type in `types.ts`
(`GreenhouseStaff`, `GreenhouseJob`, `GreenhouseRecommendation`,
`GreenhouseActivity`, `GreenhouseActivityKind`).

### The hook

```ts
function useGreenhouse(seed: GreenhouseSeed, options?: GreenhouseOptions): GreenhouseApp;

interface GreenhouseOptions {
  restore?: GreenhouseState | null;           // a saved `greenhouse.state`; read once, on the first render
  onEvent?: (event: GreenhouseEvent) => void; // everything the signed-in person does
}
```

Keep `seed` stable (a module constant or `useMemo`). The hook throws when
`seed.me` is not in `seed.staff`, or a candidate's `stage` is not one of
`seed.stages`. Stages are plain strings and must match exactly.

### The seed

```ts
interface GreenhouseSeed {
  company: { name: string };                  // required
  me: string;                                 // required - signed-in staff id
  staff: Record<string, { name: string; role?: string; photo?: string; initials?: string; color?: string }>; // required
  job: {                                      // required
    title: string;                            // required
    department: string;                       // required
    location?: string;
    req?: string;                             // "ENG-2041" -> "Req #ENG-2041"
    status?: string;                          // "Open" by default
    hiringTeam?: string[];                    // staff ids, top right
    recruiter?: string;                       // staff id
    coordinator?: string;                     // staff id; told about interview requests; the recruiter by default
  };
  stages: string[];                           // required - the columns, in order
  candidates: GreenhouseCandidateInput[];     // required - board order within each stage
  open?: string;                              // a candidate whose drawer is open at the start
  notifications?: boolean;                    // the orange dot on the bell
  theme?: "light" | "dark";
}

interface GreenhouseCandidateInput {
  id: string;                                 // required
  name: string;                               // required
  company: string;                            // required
  source: string;                             // required - "LinkedIn", "Referral"
  stage: string;                              // required - one of `stages`
  initials?: string; color?: string; photo?: string;
  title?: string;                             // current job title
  days?: number;                              // days in stage; 0 by default
  rating?: number;                            // 0-3 dots
  email?: string; phone?: string;
  tags?: string[];
  applied?: string;                           // "7 days ago"
  scorecards?: GreenhouseScorecard[];         // any awaited one shows "Needs scorecard"
  activity?: GreenhouseActivityInput[];       // newest first
  interviews?: GreenhouseInterview[];         // upcoming, in order
}

interface GreenhouseScorecard {
  by: string;                                 // required - interviewer's staff id
  step: string;                               // required - "Onsite: System Design"
  recommendation: "strong-yes" | "yes" | "no" | null; // required - null = awaited
  attributes?: [string, number][];            // [attribute, 1-4]
}

interface GreenhouseActivityInput {
  kind: "note" | "move" | "mail";             // required - the icon
  by: string;                                 // required - staff id, or any name ("Greenhouse")
  text: string;                               // required
  id?: string;
  at?: number | string;                       // now by default; shown as "3 days ago"
}

interface GreenhouseInterview {
  title: string;                              // required
  when: number | string;                      // required - ms (formatted), or text shown as is
  with: string[];                             // required - staff ids
}
```

### What the world can do

All functions are stable across renders. A missing candidate id or an
unknown stage throws.

- `addCandidate(candidate: GreenhouseCandidateInput): void` - lands at the end of their stage. Throws if the id exists.
- `moveCandidate(id: string, stage: string, by?: string): void` - someone else moves them; `days` resets to 0. With `by` (staff id or name), a move line tops their activity.
- `submitScorecard(candidateId: string, scorecard: GreenhouseScorecard, rating?: number): void` - replaces the scorecard with the same `by` and `step`, or adds it. `rating` (0-3) sets the card's dots.
- `addActivity(candidateId: string, item: GreenhouseActivityInput): string` - tops their activity feed; returns its id.
- `scheduleInterview(candidateId: string, interview: GreenhouseInterview): void` - shows under Upcoming Interviews.
- `rejectCandidate(id: string): void` - they leave the board (`rejected: true` in state; there is no undo call).
- `open(id: string | null): void` - opens a candidate's drawer, or closes it. Does not fire an event.
- `toast(text: string): void` - a notice at the bottom.
- `setTheme(theme: "light" | "dark"): void`.
- `candidates: GreenhouseCandidate[]` - those on the board (not rejected).
- `nameOf(who: string): string` - a staff member's name, or the text itself.
- `state: GreenhouseState` - see State.
- Read-only: `seed`, `me`, `stages`, `staff: Record<string, Staff>` (`id, name, role?, photo?, initials, color`), `notice`.
- `ui` is what `<Greenhouse>` wires to the person's clicks. Do not call it from the world.

### Events

```ts
type GreenhouseEvent =
  | { type: "open"; candidate: string }
  | { type: "close"; candidate: string }
  | { type: "move"; candidate: string; from: string; to: string }   // stage names
  | { type: "bulk-move"; candidates: string[]; to: string }        // no activity lines are written
  | { type: "reject"; candidate: string }
  | { type: "note"; candidate: string; text: string; id: string }
  | { type: "schedule"; candidate: string }                       // only a toast: book it with scheduleInterview
  | { type: "filter"; stage: string | null }                      // null = All stages
  | { type: "action"; kind: "add" | "notifications" | "nav" | "tab" | "email"; label: string };
```

The kit has no scorecard form for the signed-in person and no Add a
candidate dialog: those buttons only fire `action`.

### State

`greenhouse.state` is a `GreenhouseState`: plain JSON (`version: 1`,
`candidates` including rejected ones, `open`, `filter`, `selected`, `theme`,
`seq`). Save it whenever it changes and pass it back as
`useGreenhouse(seed, { restore })`. `restore` is read only on the first
render, and only when `restore.version === 1`, so load the saved state
before you mount the component that calls `useGreenhouse`.

### The component

```ts
interface GreenhouseProps {
  greenhouse: GreenhouseApp;                  // required - what useGreenhouse returned
  className?: string;
  style?: CSSProperties;
}
```

There is no render prop for custom content. It fills its parent, so the
parent needs a height; the page scrolls inside it. Under 760px wide it
switches to the mobile layout.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { Greenhouse, useGreenhouse, type GreenhouseSeed, type GreenhouseState } from "./apps/greenhouse";

const seed: GreenhouseSeed = {
  company: { name: "Northwind" },
  me: "sam",
  staff: {
    sam: { name: "Sam Rivera", role: "Hiring Manager" },
    priya: { name: "Priya Shah", role: "Recruiter" },
    leo: { name: "Leo Park", role: "Staff Designer" },
  },
  job: { title: "Product Designer", department: "Design", location: "Remote", hiringTeam: ["sam", "priya", "leo"], recruiter: "priya" },
  stages: ["Application Review", "Phone Screen", "Onsite", "Offer"],
  candidates: [
    { id: "c1", name: "Alex Moore", company: "Figtree", title: "Designer", source: "LinkedIn", stage: "Phone Screen", days: 2, rating: 2,
      scorecards: [{ by: "priya", step: "Phone Screen", recommendation: "yes", attributes: [["Communication", 3]] }] },
    { id: "c2", name: "Rina Okafor", company: "Lumen", source: "Referral", stage: "Onsite", rating: 1,
      scorecards: [{ by: "leo", step: "Onsite: Portfolio", recommendation: null }] },
  ],
};

// `restore` is read once, so load the saved state before mounting the board.
export function Episode() {
  const [saved, setSaved] = useState<GreenhouseState | null | undefined>(undefined);
  useEffect(() => void casuro.store.get<GreenhouseState>().then(setSaved), []);
  if (saved === undefined) return null;
  return <Recruiting saved={saved} />;
}

function Recruiting({ saved }: { saved: GreenhouseState | null }) {
  const greenhouse = useGreenhouse(seed, {
    restore: saved,
    onEvent(event) {
      const name = (id: string) => greenhouse.state.candidates.find((c) => c.id === id)?.name ?? id;
      if (event.type === "move") void casuro.track.decision({ summary: `Moved ${name(event.candidate)} from ${event.from} to ${event.to}` });
      if (event.type === "reject") void casuro.track.decision({ summary: `Rejected ${name(event.candidate)}` });
      if (event.type === "note") void casuro.track.document({ title: `Note on ${name(event.candidate)}`, text: event.text });
      if (event.type === "schedule") void book(event.candidate, name(event.candidate));
    },
  });

  // Priya, the recruiter, answers an interview request and books it.
  async function book(candidate: string, name: string) {
    const reply = await casuro.llm(
      [
        { role: "system", content: "You are Priya Shah, a recruiter. In one sentence, confirm to the hiring manager that you are booking the interview." },
        { role: "user", content: `Please schedule an interview with ${name}.` },
      ],
      { persona: "Priya Shah" },
    );
    greenhouse.addActivity(candidate, { kind: "mail", by: "priya", text: reply });
    greenhouse.scheduleInterview(candidate, { title: "Onsite Loop (3 sessions)", when: Date.now() + 2 * 86_400_000, with: ["sam", "leo"] });
    void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: "greenhouse", text: reply });
  }

  // Two minutes in, Leo's awaited scorecard comes in (once: a restored state already has it).
  useEffect(() => {
    const awaited = greenhouse.state.candidates.find((c) => c.id === "c2")?.scorecards.some((s) => s.by === "leo" && s.recommendation === null);
    if (!awaited) return;
    const t = setTimeout(() => {
      greenhouse.submitScorecard("c2", { by: "leo", step: "Onsite: Portfolio", recommendation: "strong-yes", attributes: [["Craft", 4], ["Systems thinking", 3]] }, 3);
      greenhouse.addActivity("c2", { kind: "note", by: "leo", text: "Best portfolio review this quarter. Let's not lose her." });
      greenhouse.toast("Leo Park submitted a scorecard for Rina Okafor");
    }, 120_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => void casuro.store.set(greenhouse.state), [greenhouse.state]);

  return (
    <div style={{ height: "100vh" }}>
      <Greenhouse greenhouse={greenhouse} />
    </div>
  );
}
```

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
