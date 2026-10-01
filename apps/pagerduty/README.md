# PagerDuty (React)

`apps/pagerduty.html` as React components: the same look, pixel for pixel,
with the sample data swapped for props. Like a shadcn component, you copy
the folder into your project and it is yours: use it as it is, or change
any file for what your screen needs.

```bash
cp -r apps/pagerduty src/apps/pagerduty
```

It needs only React 19. The styles are plain CSS scoped to
`.kit-pagerduty`, so they neither leak into the rest of the page nor pick
up its styles (Tailwind included). It uses the system font, and the
PagerDuty, Datadog, Slack and Zoom marks are inline SVG, so nothing loads
from the network.

## Use

```tsx
import { PagerDuty, usePagerDuty, type PagerDutySeed } from "./apps/pagerduty";

const seed: PagerDutySeed = {
  account: { name: "Northwind" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.dev", role: "SRE" },
    priya: { name: "Priya Shah", role: "Engineering lead" },
  },
  policies: { core: { name: "Northwind Core", levels: ["sam", "priya"], rotation: "Core rotation" } },
  services: { api: { policy: "core" } },
  incidents: [
    { id: 101, title: "api 5xx rate above 2%", service: "api", priority: "P1", createdAt: Date.now() - 600_000,
      alerts: [{ source: "datadog", title: "api 5xx rate above 2%", detail: "service:api env:prod - 3.4%" }] },
  ],
  onCall: { policy: "core", until: Date.now() + 2 * 86_400_000 },
};

function OnCall() {
  const pagerduty = usePagerDuty(seed, {
    onEvent(event) {
      if (event.type === "acknowledge") {
        // The person took the page: record it, move the story on.
      }
    },
  });
  return (
    <div style={{ height: "100vh" }}>
      <PagerDuty pagerduty={pagerduty} />
    </div>
  );
}
```

`<PagerDuty>` fills the box it is in, so give that box a height. It moves
the "On call now" card under the list when the box is under 1100px wide,
folds the nav into a menu under 900px, and switches to the phone layout
(incidents as cards, the incident full screen) under 760px, whatever the
window size, so it also works as one pane of a larger screen.

## The data

`types.ts` has the full shape, commented. In short:

- `people`, by id. `me` is the signed-in person. `photo` is a picture URL,
  otherwise initials on `color`; `role` shows under their name in the
  "On call now" card.
- `policies`: escalation policies, each with `levels` (person ids, level 1
  first) and an optional `rotation` label for level 1. Escalate moves an
  incident to the next level.
- `services`, by name ("checkout"), each with its `policy`.
- `incidents`, each with `title`, `service`, `status` (triggered,
  acknowledged, resolved), `urgency` (high, low), `priority` (P1 to P5),
  `assignee` (level 1 of the service's policy by default), `level`,
  `createdAt`, `responders`, `alerts` (with a `source` such as "datadog"),
  a `timeline` and an optional conference `bridge` (`zoom`, `slack`). With
  no `timeline`, it starts with a "Triggered" line and a push notification
  to the assignee.
- A timeline line has a `type` (it picks the icon), `at`, and `text` where
  `**bold**` is bold. A note has `by`; `via: "datadog"` shows Datadog's
  mark and tag; a notify line's `channel` (push, sms, phone, email) picks
  its icon; a `custom` line is yours to draw.
- `onCall`: the policy the "On call now" card shows and when the shift
  hands over. The top bar shows "On-Call Now" while `me` is level 1 of any
  policy.
- `tab` and `open`: what is on screen at the start.

## Driving it

`usePagerDuty` returns the account. The world acts on it through:

| Call | What happens |
| --- | --- |
| `pagerduty.trigger(incident, { open, notify })` | An incident triggers. Returns its number. A toast when it is assigned to `me` (or with `notify: true`); `open: true` shows it. |
| `pagerduty.acknowledge(id, by)` / `.resolve(id, by)` | Someone acknowledges or resolves it, with a timeline line. `by` is `me` by default. |
| `pagerduty.reassign(id, to, by)` | Someone hands it to `to`; it goes back to triggered and `to` is notified. |
| `pagerduty.escalate(id, by)` | It moves to its policy's next level, triggered again. |
| `pagerduty.addResponder(id, person, by)` | Someone asks `person` to respond. |
| `pagerduty.addNote(id, from, text)` | A note from `from`. A toast when someone else writes on an incident that is not open. Returns the line's id. |
| `pagerduty.addTimeline(id, entry)` | Any timeline line, including a `custom` one. Returns its id. |
| `pagerduty.addAlert(id, alert)` | Another alert groups into the incident, with an "Alert grouped" line. |
| `pagerduty.updateIncident(id, patch)` | Change `title`, `priority`, `urgency` or `bridge`. |
| `pagerduty.setOnCall(policy, { levels, until })` | The rotation changes: who is on each level and when the shift hands over. |
| `pagerduty.open(id)` / `pagerduty.open(null)` | Show an incident in the drawer, or close it. |
| `pagerduty.showTab(tab)` | Show a tab: "mine", "open", "triggered", "acknowledged", "resolved". |
| `pagerduty.toast(text)` | A notice at the bottom. |
| `pagerduty.setTheme("dark")` | PagerDuty's dark colors. |

Every function is stable across renders. None of them fires an event:
events are only what the signed-in person does.

The signed-in person's actions arrive through `onEvent`:

| Event | When |
| --- | --- |
| `{ type: "open", incident }` | They open an incident from the list (`incident` is null when they close it). |
| `{ type: "acknowledge", incident }` | They press Acknowledge. |
| `{ type: "resolve", incident }` | They press Resolve. |
| `{ type: "reassign", incident, to }` | They reassign it to a person. |
| `{ type: "escalate", incident, level, to }` | They escalate it; `to` is who it went to. |
| `{ type: "add-responders", incident, person }` | They ask someone to respond. |
| `{ type: "note", incident, text, id }` | They add a note. |
| `{ type: "bulk", action, incidents, to? }` | They acknowledge, resolve or reassign the ticked incidents. |
| `{ type: "filter", tab, urgency, query }` | They pick a tab or an urgency. |
| `{ type: "action", label }` | They press something the kit has no behaviour for: "Services", "New Incident", "View schedule", "Help", "Zoom: <bridge>", "Slack: <channel>", "Service: <name>"... Answer with a toast, or build it. |

`pagerduty.state` is everything that changed, as plain JSON (incidents,
the rotation, filters, unsent notes): save it, and pass it back as
`usePagerDuty(seed, { restore })` to pick up where they left off.

## API reference

Everything below comes from `index.ts`, `types.ts`, `use-pagerduty.ts` and
`PagerDuty.tsx`. You should not need to open them.

### Imports

```ts
import {
  PagerDuty, usePagerDuty, TABS,
  type PagerDutyProps, type PagerDutyAccount, type PagerDutyOptions, type IncidentPatch, type Person,
  type PagerDutySeed, type PagerDutyState, type PagerDutyEvent, type PagerDutyIncident, type PagerDutyIncidentInput,
} from "./apps/pagerduty";
// The brand mark is not re-exported by index.ts (for a desktop launcher, say):
import { PagerDutyLogo } from "./apps/pagerduty/icons";
// Or the launcher logo and its Dock tile (see the repo README):
import { AppLogo, appTile } from "./apps/pagerduty/icons";
```

`PagerDutyLogo` is PagerDuty green (`#06AC38`) and fills the box it is put
in; pass `fill` for another color.

`index.ts` also re-exports every other type in `types.ts` (`PagerDutyPerson`, `PagerDutyPolicy`, `PagerDutyService`, `PagerDutyBridge`, `PagerDutyAlert`, `PagerDutyAlertInput`, `PagerDutyTimelineEntry`, `PagerDutyTimelineInput`, `TimelineType`, `IncidentStatus`, `Urgency`, `Priority`, `IncidentTab`, `UrgencyFilter`). `TABS` is the Incidents page's tabs, in order, as `{ id, name, test(incident, me) }`.

### The hook

```ts
function usePagerDuty(seed: PagerDutySeed, options?: PagerDutyOptions): PagerDutyAccount;

interface PagerDutyOptions {
  restore?: PagerDutyState | null;            // a saved `pagerduty.state`; read on the first render only
  onEvent?: (event: PagerDutyEvent) => void;  // everything the signed-in person does
}
```

It throws if `seed.me` is not a key of `seed.people`, or if an incident's
`service` is not a key of `seed.services`. A `restore` whose `version` is
not `1` is ignored and the seed is used.

### The seed

```ts
type IncidentStatus = "triggered" | "acknowledged" | "resolved";
type Urgency = "high" | "low";
type Priority = "P1" | "P2" | "P3" | "P4" | "P5";
type IncidentTab = "mine" | "open" | "triggered" | "acknowledged" | "resolved";
type UrgencyFilter = "all" | Urgency;

interface PagerDutySeed {
  account: { name: string };                          // required
  me: string;                                         // required: the signed-in person's id
  people: Record<string, PagerDutyPerson>;            // required
  policies: Record<string, PagerDutyPolicy>;          // required: escalation policies by id
  services: Record<string, PagerDutyService>;         // required: by service name
  incidents: PagerDutyIncidentInput[];                // required, any order (the list shows newest first)
  onCall?: { policy?: string; until?: number | string };  // the card's policy (first by default) and handover time
  tab?: IncidentTab;                                  // default "mine"
  open?: number;                                      // an incident open at the start
  theme?: "light" | "dark";
}

interface PagerDutyPerson {
  name: string;                                       // required
  email?: string;
  role?: string;                                      // under their name in "On call now"
  photo?: string; initials?: string; color?: string;
}

interface PagerDutyPolicy {
  name: string;                                       // required
  levels: string[];                                   // required: person ids, level 1 first
  rotation?: string;                                  // level 1's label in "On call now"; their role by default
}

interface PagerDutyService { policy: string }         // required: a policy id

interface PagerDutyIncidentInput {
  title: string;                                      // required
  service: string;                                    // required: a key of `services`
  id?: number;                                        // one more than the highest by default
  status?: IncidentStatus;                            // default "triggered"
  urgency?: Urgency;                                  // default "high"
  priority?: Priority;                                // none by default (shows "-")
  assignee?: string;                                  // default: the service policy's person at `level`
  level?: number;                                     // escalation level, 1-based; default 1
  createdAt?: number | string;                        // ms or a date string; now by default
  resolvedAt?: number | string;                       // for a seeded resolved incident; its last line by default
  responders?: string[];
  alerts?: PagerDutyAlertInput[];
  timeline?: PagerDutyTimelineInput[];                // default: "Triggered" + push notification to the assignee
  bridge?: { zoom?: string; slack?: string };         // as shown: "acme.zoom.us/j/812...", "#inc-api"
}

interface PagerDutyAlertInput {
  title: string;                                      // required
  detail?: string;                                    // the line under it
  source?: string;                                    // "datadog" shows its mark; anything else, its name
  status?: "triggered" | "resolved";                  // default "triggered"; shown resolved once the incident is
  at?: number | string;                               // default: the incident's createdAt (now for addAlert)
}

type TimelineType = "trigger" | "notify" | "ack" | "resolve" | "reassign" | "escalate" | "responders" | "note" | "alert" | "custom";

interface PagerDutyTimelineInput {
  type: TimelineType;                                 // required: picks the icon and color
  at?: number | string;                               // now by default
  text?: string;                                      // "**Acknowledged** by Priya Shah"; a note's body
  by?: string;                                        // a note's author (person id)
  via?: string;                                       // "datadog": its mark in the dot and a tag
  channel?: "push" | "sms" | "phone" | "email";      // a notify line's icon
  custom?: { type: string; data?: unknown };          // drawn by <PagerDuty renderCustom>
}
```

### What the hook makes of it

`pagerduty.people`, `pagerduty.current` and `pagerduty.state.incidents`
hold these, with every default filled in:

```ts
interface Person {
  id: string;
  name: string;
  initials: string;                                   // the seed's, or the name's
  color: string;                                      // the seed's, or one picked from the id
  email?: string;
  role?: string;
  photo?: string;
}

interface PagerDutyIncident {
  id: number;
  title: string;
  service: string;
  status: IncidentStatus;
  urgency: Urgency;
  priority: Priority | null;
  assignee: string;                                   // a person id
  level: number;                                      // escalation level, 1-based
  createdAt: number;                                  // ms
  resolvedAt: number | null;
  responders: string[];
  alerts: PagerDutyAlert[];
  timeline: PagerDutyTimelineEntry[];                 // in the order added; the drawer shows newest first
  bridge: PagerDutyBridge | null;                     // { zoom?: string; slack?: string }
}

interface PagerDutyAlert {
  title: string;
  status: "triggered" | "resolved";
  detail?: string;
  source?: string;
  at: number;                                         // ms
}

interface PagerDutyTimelineEntry {                    // a PagerDutyTimelineInput with these filled in:
  id: string;
  at: number;                                         // ms
  text: string;
  type: TimelineType;
  by?: string;
  via?: string;
  channel?: "push" | "sms" | "phone" | "email";
  custom?: { type: string; data?: unknown };
}
```

### What the world can do

All of these are stable across renders, so they are safe to call from timers and `onEvent`. Each one that names an incident throws when there is no such incident.

```ts
pagerduty.trigger(input: PagerDutyIncidentInput, o?: { open?: boolean; notify?: boolean }): number
  // Adds the incident and returns its number. Throws if the number is taken or the service is unknown.
  // notify (a toast) defaults to true when it is assigned to `me`; open shows it in the drawer.
pagerduty.acknowledge(id: number, by?: string): void              // triggered -> acknowledged
pagerduty.resolve(id: number, by?: string): void                  // -> resolved, stamps resolvedAt
pagerduty.reassign(id: number, to: string, by?: string): void     // -> triggered, assigned to `to`, who is notified
pagerduty.escalate(id: number, by?: string): void                 // next level of its service's policy, triggered again
pagerduty.addResponder(id: number, person: string, by?: string): void
  // `by` is `me` by default. Each adds its timeline lines, and does nothing when it does not apply
  // (acknowledging a resolved incident, reassigning to the assignee, escalating past the last level).
pagerduty.addNote(id: number, from: string, text: string): string          // returns the line's id
pagerduty.addTimeline(id: number, entry: PagerDutyTimelineInput): string   // returns the line's id
pagerduty.addAlert(id: number, alert: PagerDutyAlertInput): void           // plus an "Alert grouped" line
pagerduty.updateIncident(id: number, patch: IncidentPatch): void
type IncidentPatch = Partial<Pick<PagerDutyIncident, "title" | "priority" | "urgency" | "bridge">>;
pagerduty.setOnCall(policy: string, o?: { levels?: string[]; until?: number | string | null }): void
  // Replaces the policy's levels (escalation uses them too) and shows it in "On call now".
  // `until: null` hides the handover line. Throws for an unknown policy.
pagerduty.open(id: number | null): void          // the drawer; null closes it
pagerduty.showTab(tab: IncidentTab): void        // also clears the ticked incidents
pagerduty.toast(text: string): void
pagerduty.setTheme(theme: "light" | "dark"): void
```

Read-only fields: `pagerduty.state` (below), `pagerduty.seed`, `pagerduty.me`, `pagerduty.people` (`Record<string, Person>`, the seed's people with initials and colors filled in), `pagerduty.current` (the `PagerDutyIncident` in the drawer, or null), `pagerduty.notice` (the last toast). `pagerduty.ui` holds what `<PagerDuty>` calls for the signed-in person (`openIncident`, `act`, `setDraft`, `note`, `select`, `selectAll`, `bulk`, `filter`, `action`, `emit`); a world does not need it.

### Events

```ts
type PagerDutyEvent =
  | { type: "open"; incident: number | null }                    // null: they closed the drawer
  | { type: "acknowledge"; incident: number }
  | { type: "resolve"; incident: number }
  | { type: "reassign"; incident: number; to: string }
  | { type: "escalate"; incident: number; level: number; to: string }   // the new level and assignee
  | { type: "add-responders"; incident: number; person: string }
  | { type: "note"; incident: number; text: string; id: string }        // id = the timeline line
  | { type: "bulk"; action: "acknowledge" | "resolve" | "reassign"; incidents: number[]; to?: string }
  | { type: "filter"; tab: IncidentTab; urgency: UrgencyFilter; query: string }
  | { type: "action"; label: string };
```

An action fires only when it changed something (Acknowledge on an
acknowledged incident is disabled). `bulk` lists every ticked incident,
including ones it did not change. `filter` fires for tabs and urgency, not
for each keystroke in the search box (its text is in `query`).

### State

`pagerduty.state` is a `PagerDutyState`: plain JSON (`version: 1`,
`incidents`, `policies` - the seed's, as `setOnCall` changed them -,
`onCall`, `tab`, `urgency`, `query`, `selected`, `open`, `drafts` - unsent
notes by incident number -, `theme`, `seq`). It is a new object after every
change. Save it and pass it back as `usePagerDuty(seed, { restore })`;
`restore` is read only when the hook first mounts, so load the saved state
before rendering the component that calls `usePagerDuty`.

### The component

```ts
interface PagerDutyProps {
  pagerduty: PagerDutyAccount;          // required: from usePagerDuty
  renderCustom?: (entry: PagerDutyTimelineEntry, incident: PagerDutyIncident) => ReactNode;
                                        // draws a `custom` timeline line, under its text
  className?: string;
  style?: CSSProperties;
}
```

`<PagerDuty>` fills its parent, so the parent needs a height (`100vh`, or a
flex child with `min-height: 0`). Esc closes an open menu, then the
incident.

### Wiring it in an episode

```tsx
import { useEffect, useState } from "react";
import { casuro } from "@/lib/casuro";
import { PagerDuty, usePagerDuty, type PagerDutySeed, type PagerDutyState } from "./apps/pagerduty";

const MIN = 60_000;
const seed: PagerDutySeed = {
  account: { name: "Northwind" },
  me: "sam",
  people: {
    sam: { name: "Sam Rivera", email: "sam@northwind.dev", role: "SRE" },
    priya: { name: "Priya Shah", role: "Engineering lead" },
  },
  policies: { core: { name: "Northwind Core", levels: ["sam", "priya"], rotation: "Core rotation" } },
  services: { api: { policy: "core" }, db: { policy: "core" } },
  incidents: [
    { id: 101, title: "db connections above 90%", service: "db", status: "acknowledged", priority: "P2", createdAt: Date.now() - 25 * MIN,
      alerts: [{ source: "datadog", title: "db connections above 90%", detail: "db:primary - 92 of 100" }] },
  ],
  onCall: { policy: "core", until: Date.now() + 2 * 24 * 60 * MIN },
};

export function PagerDutyScene() {
  const [saved, setSaved] = useState<PagerDutyState | null | undefined>(undefined);
  useEffect(() => {
    void casuro.store.get<{ pagerduty?: PagerDutyState }>().then((s) => setSaved(s?.pagerduty ?? null));
  }, []);
  if (saved === undefined) return null;          // wait: restore is read on mount only
  return <OnCall restore={saved} />;
}

function OnCall({ restore }: { restore: PagerDutyState | null }) {
  const pagerduty = usePagerDuty(seed, {
    restore,
    async onEvent(event) {
      if (event.type === "acknowledge" || event.type === "resolve") {
        void casuro.track.decision({ summary: `${event.type === "resolve" ? "Resolved" : "Acknowledged"} incident #${event.incident}` });
      }
      if (event.type === "escalate") {
        void casuro.track.decision({ summary: `Escalated #${event.incident} to level ${event.level}` });
      }
      if (event.type === "note") {
        void casuro.track.message({ from: "candidate", to: "Priya Shah", channel: `#${event.incident}`, text: event.text });
        const reply = await casuro.llm(
          [
            { role: "system", content: "You are Priya Shah, the engineering lead, answering an incident note in one or two sentences." },
            { role: "user", content: event.text },
          ],
          { persona: "Priya Shah" },
        );
        pagerduty.addNote(event.incident, "priya", reply);
        void casuro.track.message({ from: "Priya Shah", to: "candidate", channel: `#${event.incident}`, text: reply });
      }
    },
  });

  // The page: 30 seconds in, the api starts failing (once: a restored state already has it).
  useEffect(() => {
    if (pagerduty.state.incidents.some((i) => i.id === 102)) return;
    const t = setTimeout(() => {
      pagerduty.trigger({
        id: 102, title: "[P1] api 5xx rate above 2%", service: "api", priority: "P1",
        bridge: { zoom: "northwind.zoom.us/j/81234567890", slack: "#inc-api" },
        alerts: [{ source: "datadog", title: "api 5xx rate above 2%", detail: "service:api env:prod - 3.4%" }],
      });
    }, 30_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save everything that changed.
  useEffect(() => {
    void casuro.store.set({ pagerduty: pagerduty.state });
  }, [pagerduty.state]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <PagerDuty pagerduty={pagerduty} />
    </div>
  );
}
```

## Changing it

The files are small and do one thing each:

| File | What it is |
| --- | --- |
| `PagerDuty.tsx` | The layout, the toast, Esc to close menus and the incident, the clock that keeps "12 min ago" moving. |
| `TopNav.tsx` | The green top bar: mark, product nav, search, help, the on-call chip and account menu, the phone menu. |
| `IncidentList.tsx` | The Incidents page: tabs, urgency filter, bulk bar, the table, "On call now" and your counts. |
| `Incident.tsx` | The incident drawer: actions, bridge, details, note box, timeline, alerts. |
| `context.tsx` | Shared screen state and the small parts: avatar, status badge, urgency and priority tags, people menu. |
| `use-pagerduty.ts` | The state and what changes it. |
| `format.tsx` | Times ("Today at 7:30 AM", "12 min ago", "1h 16m") and `**bold**` in timeline lines. |
| `icons.tsx` | The icons and the PagerDuty, Datadog, Slack and Zoom marks. |
| `pagerduty.css` | The look, from the mockup. |

For a timeline line the kit has no part for (a runbook step, a status page
update, a deploy), add it with
`pagerduty.addTimeline(id, { type: "custom", text, custom: { type, data } })`
and draw it with `<PagerDuty renderCustom={(entry, incident) => ...} />`;
it shows under the line's text. For anything else, edit the files.

## Preview

`npm install && npm run dev` in the repo root, then open
`/preview/?app=pagerduty` next to `/apps/pagerduty.html`: the same
incidents, drawn by the React version. Acknowledge the P1 and Marcus adds a
note a few seconds later; reassign or escalate and that person
acknowledges; a minute in, a Redis alert pages you.
