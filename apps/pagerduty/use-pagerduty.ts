import { useCallback, useMemo, useRef, useState } from "react";
import { initialsOf } from "./format";
import type {
  IncidentTab,
  PagerDutyAlert,
  PagerDutyAlertInput,
  PagerDutyEvent,
  PagerDutyIncident,
  PagerDutyIncidentInput,
  PagerDutyPolicy,
  PagerDutySeed,
  PagerDutyState,
  PagerDutyTimelineEntry,
  PagerDutyTimelineInput,
  UrgencyFilter,
} from "./types";

// The account behind <PagerDuty>: its state, what the world does to it (an
// incident triggers, someone acknowledges, a note comes in, the rotation
// changes) and what the signed-in person does (open, acknowledge, resolve,
// reassign, escalate, add responders and notes, bulk actions). Every change
// goes through `update`, which keeps a ref in step with React state, so
// calls made between renders (timers, awaited replies) see what the last
// one wrote. Every function it returns is stable across renders.

/** A person, as the parts draw them. */
export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  email?: string;
  role?: string;
  photo?: string;
}

export interface PagerDutyOptions {
  /** A state saved from `pagerduty.state`, to pick up where it was left. */
  restore?: PagerDutyState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: PagerDutyEvent) => void;
}

/** What `updateIncident` can change. */
export type IncidentPatch = Partial<Pick<PagerDutyIncident, "title" | "priority" | "urgency" | "bridge">>;

export const TABS: { id: IncidentTab; name: string; test: (i: PagerDutyIncident, me: string) => boolean }[] = [
  { id: "mine", name: "Your open incidents", test: (i, me) => i.assignee === me && i.status !== "resolved" },
  { id: "open", name: "All open", test: (i) => i.status !== "resolved" },
  { id: "triggered", name: "Triggered", test: (i) => i.status === "triggered" },
  { id: "acknowledged", name: "Acknowledged", test: (i) => i.status === "acknowledged" },
  { id: "resolved", name: "Resolved", test: (i) => i.status === "resolved" },
];

/** The incidents the list shows for the state's tab, urgency and search, newest first. */
export function visible(s: PagerDutyState, me: string, name: (id: string) => string) {
  const tab = TABS.find((t) => t.id === s.tab) ?? TABS[0];
  const q = s.query.trim().toLowerCase();
  return s.incidents
    .filter((i) => tab.test(i, me) && (s.urgency === "all" || i.urgency === s.urgency))
    .filter((i) => !q || `${i.id} ${i.title} ${i.service} ${name(i.assignee)}`.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt - a.createdAt);
}

const PALETTE = ["#43708c", "#8a5a00", "#6b4ea3", "#1f7a6d", "#b0405e", "#2f6fb3", "#5d6b2f", "#a8511c"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const toTime = (at: number | string | undefined, fallback = Date.now()) =>
  typeof at === "number" ? at : at ? Date.parse(at) || fallback : fallback;
const SOURCE: Record<string, string> = { datadog: "Datadog" };
export const sourceName = (s: string) => SOURCE[s] ?? s;

function normalizePeople(seed: PagerDutySeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    out[id] = { id, name: p.name, initials: p.initials ?? initialsOf(p.name), color: p.color ?? colorFor(id), email: p.email, role: p.role, photo: p.photo };
  if (!out[seed.me]) throw new Error(`PagerDuty: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

const makeEntry = (e: PagerDutyTimelineInput, id: string): PagerDutyTimelineEntry => ({ ...e, id, at: toTime(e.at), text: e.text ?? "" });
const makeAlert = (a: PagerDutyAlertInput, at: number): PagerDutyAlert => ({ ...a, status: a.status ?? "triggered", at: toTime(a.at, at) });

function makeIncident(input: PagerDutyIncidentInput, id: number, policies: Record<string, PagerDutyPolicy>, seed: PagerDutySeed, people: Record<string, Person>, nextId: () => string): PagerDutyIncident {
  const service = seed.services[input.service];
  if (!service) throw new Error(`PagerDuty: there is no service "${input.service}"`);
  const level = input.level ?? 1;
  const assignee = input.assignee ?? policies[service.policy]?.levels[level - 1] ?? seed.me;
  const createdAt = toTime(input.createdAt);
  const alerts = (input.alerts ?? []).map((a) => makeAlert(a, createdAt));
  const via = alerts[0]?.source;
  const timeline = (
    input.timeline ?? [
      { type: "trigger", at: createdAt, text: via ? `**Triggered** through the ${sourceName(via)} integration` : "**Triggered**", via },
      { type: "notify", at: createdAt, text: `Notified **${people[assignee]?.name ?? assignee}** by push notification`, channel: "push" },
    ]
  ).map((e) => makeEntry({ ...e, at: e.at ?? createdAt }, nextId()));
  const status = input.status ?? "triggered";
  return {
    id,
    title: input.title,
    service: input.service,
    status,
    urgency: input.urgency ?? "high",
    priority: input.priority ?? null,
    assignee,
    level,
    createdAt,
    resolvedAt: status === "resolved" ? toTime(input.resolvedAt, Math.max(createdAt, ...timeline.map((e) => e.at))) : null,
    responders: [...(input.responders ?? [])],
    alerts,
    timeline,
    bridge: input.bridge ?? null,
  };
}

const nextNumber = (list: { id?: number }[]) => list.reduce((n, i) => Math.max(n, i.id ?? 0), 0) + 1;

function initialState(seed: PagerDutySeed, people: Record<string, Person>): PagerDutyState {
  let seq = 0;
  const policies = structuredClone(seed.policies);
  const incidents: PagerDutyIncident[] = [];
  for (const i of seed.incidents)
    incidents.push(makeIncident(i, i.id ?? nextNumber([...seed.incidents, ...incidents]), policies, seed, people, () => `s${++seq}`));
  const policy = seed.onCall?.policy ?? Object.keys(policies)[0] ?? "";
  const open = seed.open != null && incidents.some((i) => i.id === seed.open) ? seed.open : null;
  return {
    version: 1,
    incidents,
    policies,
    onCall: { policy, until: seed.onCall?.until != null ? toTime(seed.onCall.until) : null },
    tab: seed.tab ?? "mine",
    urgency: "all",
    query: "",
    selected: [],
    open,
    drafts: {},
    theme: seed.theme ?? "light",
    seq,
  };
}

export function usePagerDuty(seed: PagerDutySeed, options: PagerDutyOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<PagerDutyState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed, people)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);

  const update = useCallback((fn: (draft: PagerDutyState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: PagerDutyEvent) => opts.current.onEvent?.(event), []);
  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);
  const nameOf = useCallback((id: string) => people[id]?.name ?? id, [people]);

  /** The incident, in a draft of the state; throws when there is none. */
  const need = (s: PagerDutyState, id: number) => {
    const i = s.incidents.find((x) => x.id === id);
    if (!i) throw new Error(`PagerDuty: there is no incident #${id}`);
    return i;
  };
  const log = (s: PagerDutyState, i: PagerDutyIncident, e: PagerDutyTimelineInput) => {
    const entry = makeEntry(e, `t${++s.seq}`);
    i.timeline.push(entry);
    return entry.id;
  };

  /**
   * One change to an incident, by `by`, with its timeline lines. Returns
   * what happened for a toast, or null when it does not apply (acknowledging
   * a resolved incident, reassigning to the same person, escalating past the
   * last level).
   */
  const change = useCallback(
    (s: PagerDutyState, id: number, what: "acknowledge" | "resolve" | "reassign" | "escalate" | "responder", by: string, arg?: string): string | null => {
      const i = need(s, id);
      const who = nameOf(by);
      if (what === "acknowledge" && i.status === "triggered") {
        i.status = "acknowledged";
        log(s, i, { type: "ack", text: `**Acknowledged** by ${who}` });
        return `#${id} acknowledged`;
      }
      if (what === "resolve" && i.status !== "resolved") {
        i.status = "resolved";
        i.resolvedAt = Date.now();
        log(s, i, { type: "resolve", text: `**Resolved** by ${who}` });
        return `#${id} resolved`;
      }
      if (what === "reassign" && arg && i.status !== "resolved" && arg !== i.assignee) {
        i.assignee = arg;
        i.status = "triggered";
        log(s, i, { type: "reassign", text: `Reassigned to **${nameOf(arg)}** by ${who}` });
        log(s, i, { type: "notify", at: Date.now() + 1, text: `Notified **${nameOf(arg)}** by push notification`, channel: "push" });
        return `#${id} reassigned to ${nameOf(arg)}`;
      }
      if (what === "responder" && arg && !i.responders.includes(arg) && arg !== i.assignee) {
        i.responders.push(arg);
        log(s, i, { type: "responders", text: `${who} requested **${nameOf(arg)}** to respond` });
        return `Requested ${nameOf(arg)} to respond`;
      }
      if (what === "escalate" && i.status !== "resolved") {
        const levels = s.policies[seed.services[i.service]?.policy ?? ""]?.levels ?? [];
        if (i.level >= levels.length) return null;
        i.level += 1;
        i.assignee = levels[i.level - 1];
        i.status = "triggered";
        log(s, i, { type: "escalate", text: `Escalated to **${nameOf(i.assignee)}** (level ${i.level}) by ${who}` });
        log(s, i, { type: "notify", at: Date.now() + 1, text: `Notified **${nameOf(i.assignee)}** by phone call`, channel: "phone" });
        return `#${id} escalated to ${nameOf(i.assignee)}`;
      }
      return null;
    },
    [nameOf, seed.services]
  );

  // ---------- What the world does ----------

  /** An incident triggers (from a monitor, or someone else). Returns its number. */
  const trigger = useCallback(
    (input: PagerDutyIncidentInput, o: { open?: boolean; notify?: boolean } = {}) => {
      let made: PagerDutyIncident | null = null;
      update((s) => {
        const id = input.id ?? nextNumber(s.incidents);
        if (s.incidents.some((i) => i.id === id)) throw new Error(`PagerDuty: incident #${id} already exists`);
        made = makeIncident(input, id, s.policies, seed, people, () => `t${++s.seq}`);
        s.incidents.push(made);
        if (o.open) s.open = id;
      });
      const i = made as PagerDutyIncident | null;
      if (!i) return 0;
      if (o.notify ?? i.assignee === me) toast(`Incident #${i.id} triggered: ${i.title}`);
      return i.id;
    },
    [update, seed, people, me, toast]
  );

  /** Someone (`by`, the signed-in person by default) acknowledges an incident. */
  const acknowledge = useCallback((id: number, by = me) => void update((s) => change(s, id, "acknowledge", by)), [update, change, me]);
  /** Someone resolves an incident. */
  const resolve = useCallback((id: number, by = me) => void update((s) => change(s, id, "resolve", by)), [update, change, me]);
  /** Someone reassigns an incident to `to`; it goes back to triggered. */
  const reassign = useCallback((id: number, to: string, by = me) => void update((s) => change(s, id, "reassign", by, to)), [update, change, me]);
  /** Someone escalates an incident to its policy's next level. */
  const escalate = useCallback((id: number, by = me) => void update((s) => change(s, id, "escalate", by)), [update, change, me]);
  /** Someone asks `person` to respond. */
  const addResponder = useCallback((id: number, person: string, by = me) => void update((s) => change(s, id, "responder", by, person)), [update, change, me]);

  /** A note on an incident, from a person id. Returns the timeline line's id. */
  const addNote = useCallback(
    (id: number, from: string, text: string) => {
      let entry = "";
      update((s) => void (entry = log(s, need(s, id), { type: "note", by: from, text })));
      if (from !== me && ref.current.open !== id) toast(`${nameOf(from)} added a note on #${id}`);
      return entry;
    },
    [update, me, nameOf, toast]
  );

  /** Any line on an incident's timeline, including a `custom` one. Returns its id. */
  const addTimeline = useCallback(
    (id: number, entry: PagerDutyTimelineInput) => {
      let made = "";
      update((s) => void (made = log(s, need(s, id), entry)));
      return made;
    },
    [update]
  );

  /** Another alert groups into an incident, with an "Alert grouped" line. */
  const addAlert = useCallback(
    (id: number, alert: PagerDutyAlertInput) =>
      void update((s) => {
        const i = need(s, id);
        const a = makeAlert(alert, Date.now());
        i.alerts.push(a);
        log(s, i, { type: "alert", at: a.at, text: `Alert grouped: **${a.title}**`, via: a.source });
      }),
    [update]
  );

  /** Change an incident's title, priority, urgency or bridge. */
  const updateIncident = useCallback(
    (id: number, patch: IncidentPatch) => void update((s) => void Object.assign(need(s, id), structuredClone(patch))),
    [update]
  );

  /**
   * The rotation changes: a policy's `levels` (person ids, level 1 first)
   * and when the shift hands over. The "On call now" card shows `policy`
   * from now on.
   */
  const setOnCall = useCallback(
    (policy: string, o: { levels?: string[]; until?: number | string | null } = {}) =>
      void update((s) => {
        if (!s.policies[policy]) throw new Error(`PagerDuty: there is no policy "${policy}"`);
        if (o.levels) s.policies[policy].levels = [...o.levels];
        s.onCall.policy = policy;
        if (o.until !== undefined) s.onCall.until = o.until == null ? null : toTime(o.until);
      }),
    [update]
  );

  /** Show an incident in the drawer, or null to close it. */
  const open = useCallback(
    (id: number | null) =>
      void update((s) => {
        if (id != null) need(s, id);
        s.open = id;
      }),
    [update]
  );

  /** Show a tab of the Incidents page. */
  const showTab = useCallback(
    (tab: IncidentTab) =>
      void update((s) => {
        s.tab = tab;
        s.selected = [];
      }),
    [update]
  );

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  // ---------- What the signed-in person does (wired by <PagerDuty>) ----------

  const openIncident = useCallback(
    (id: number | null) => {
      open(id);
      emit({ type: "open", incident: id });
    },
    [open, emit]
  );

  /** Acknowledge, resolve, reassign, escalate or add a responder on the open incident. */
  const act = useCallback(
    (what: "acknowledge" | "resolve" | "reassign" | "escalate" | "responder", arg?: string) => {
      const id = ref.current.open;
      if (id == null) return;
      let msg: string | null = null;
      const s = update((d) => void (msg = change(d, id, what, me, arg)));
      if (!msg) return;
      toast(msg);
      if (what === "acknowledge" || what === "resolve") emit({ type: what, incident: id });
      else if (what === "reassign") emit({ type: "reassign", incident: id, to: arg! });
      else if (what === "responder") emit({ type: "add-responders", incident: id, person: arg! });
      else {
        const i = need(s, id);
        emit({ type: "escalate", incident: id, level: i.level, to: i.assignee });
      }
    },
    [update, change, me, toast, emit]
  );

  const setDraft = useCallback((text: string) => {
    const id = ref.current.open;
    if (id != null) update((s) => void (s.drafts[id] = text));
  }, [update]);

  /** Add the draft (or `text`) as a note on the open incident. Returns false when there is nothing to add. */
  const note = useCallback(
    (text?: string) => {
      const id = ref.current.open;
      const body = (text ?? ref.current.drafts[id ?? -1] ?? "").trim();
      if (id == null || !body) {
        toast("Write a note first");
        return false;
      }
      let entry = "";
      update((s) => {
        entry = log(s, need(s, id), { type: "note", by: me, text: body });
        s.drafts[id] = "";
      });
      toast("Note added");
      emit({ type: "note", incident: id, text: body, id: entry });
      return true;
    },
    [update, me, toast, emit]
  );

  const select = useCallback(
    (id: number, on: boolean) =>
      void update((s) => void (s.selected = on ? [...new Set([...s.selected, id])] : s.selected.filter((x) => x !== id))),
    [update]
  );

  const selectAll = useCallback(
    (on: boolean) => void update((s) => void (s.selected = on ? visible(s, me, nameOf).map((i) => i.id) : [])),
    [update, me, nameOf]
  );

  const bulk = useCallback(
    (action: "acknowledge" | "resolve" | "reassign", to?: string) => {
      const ids = ref.current.selected;
      let n = 0;
      update((s) => {
        for (const id of ids) if (s.incidents.some((i) => i.id === id) && change(s, id, action, me, to)) n += 1;
        s.selected = [];
      });
      toast(n ? `${n} incident${n === 1 ? "" : "s"} ${action === "acknowledge" ? "acknowledged" : action === "resolve" ? "resolved" : `reassigned to ${nameOf(to ?? "")}`}` : "Nothing to change");
      emit({ type: "bulk", action, incidents: ids, ...(to ? { to } : {}) });
    },
    [update, change, me, toast, nameOf, emit]
  );

  const filter = useCallback(
    (patch: { tab?: IncidentTab; urgency?: UrgencyFilter; query?: string }) => {
      const s = update((d) => {
        if (patch.tab && patch.tab !== d.tab) d.selected = [];
        Object.assign(d, patch);
        const shown = new Set(visible(d, me, nameOf).map((i) => i.id));
        d.selected = d.selected.filter((id) => shown.has(id));
      });
      if (patch.query === undefined) emit({ type: "filter", tab: s.tab, urgency: s.urgency, query: s.query });
    },
    [update, me, nameOf, emit]
  );

  const action = useCallback((label: string) => emit({ type: "action", label }), [emit]);

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    /** The incident in the drawer, or null. */
    current: state.open == null ? null : (state.incidents.find((i) => i.id === state.open) ?? null),
    // The world
    trigger,
    acknowledge,
    resolve,
    reassign,
    escalate,
    addResponder,
    addNote,
    addTimeline,
    addAlert,
    updateIncident,
    setOnCall,
    open,
    showTab,
    toast,
    setTheme,
    // The signed-in person (wired by <PagerDuty>)
    ui: { openIncident, act, setDraft, note, select, selectAll, bulk, filter, action, emit },
  };
}

export type PagerDutyAccount = ReturnType<typeof usePagerDuty>;
