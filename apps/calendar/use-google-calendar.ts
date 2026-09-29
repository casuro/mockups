import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, monday, parseDay, ymd } from "./format";
import type { CalendarEntry, CalendarEntryInput, CalendarEvent, CalendarSeed, CalendarState, CalendarView, Rsvp } from "./types";

// The calendar behind <GoogleCalendar>: its state, what the world does to it
// (an invite lands, an entry moves, a guest answers) and what the signed-in
// person does (create, delete, answer, open, join, move around). Every
// change goes through `update`, which keeps a ref in step with React state,
// so calls made between renders (timers, awaited replies) see what the last
// one wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  email?: string;
  initials: string;
  color: string;
  photo?: string;
}

export interface CalendarOptions {
  /** A state saved from `calendar.state`, to pick up where it was left. */
  restore?: CalendarState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: CalendarEvent) => void;
}

const PALETTE = ["#5c6bc0", "#039be5", "#33b679", "#e67c73", "#8e24aa", "#f4511e", "#0b8043", "#3f51b5"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

function normalizePeople(seed: CalendarSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    out[id] = { id, name: p.name, email: p.email, photo: p.photo, color: p.color ?? colorFor(id), initials: p.initials ?? p.name.trim().charAt(0).toUpperCase() };
  if (!out[seed.me]) throw new Error(`GoogleCalendar: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

const primaryOf = (seed: CalendarSeed) => (seed.calendars.find((c) => c.primary) ?? seed.calendars[0])?.id ?? "";

function makeEntry(input: CalendarEntryInput, id: string, primary: string): CalendarEntry {
  return {
    ...input,
    id,
    calendar: input.calendar ?? primary,
    guests: (input.guests ?? []).map((g) => ({ ...g, rsvp: g.rsvp ?? "awaiting" })),
  };
}

/** A fresh "e12" id, skipping any already taken (the seed's or an episode's own ids). */
function nextId(s: CalendarState, taken = new Set(s.entries.map((e) => e.id))) {
  let id: string;
  do id = `e${++s.seq}`;
  while (taken.has(id));
  return id;
}

function initialState(seed: CalendarSeed): CalendarState {
  const primary = primaryOf(seed);
  const s: CalendarState = {
    version: 1,
    view: seed.view ?? "week",
    anchor: seed.start ?? ymd(new Date()),
    visible: Object.fromEntries(seed.calendars.map((c) => [c.id, c.visible !== false])),
    entries: [],
    selected: null,
    theme: seed.theme ?? "light",
    seq: 0,
  };
  const given = new Set(seed.entries.flatMap((e) => (e.id ? [e.id] : [])));
  for (const e of seed.entries) s.entries.push(makeEntry(e, e.id ?? nextId(s, given), primary));
  return s;
}

/** The first day and number of days on screen in the day and week views (three days when narrow). */
export function daysOnScreen(view: CalendarView, anchor: string, narrow: boolean): [Date, number] {
  const a = parseDay(anchor);
  if (view === "day") return [a, 1];
  if (narrow) return [a, 3];
  return [monday(a), 7];
}

export function useGoogleCalendar(seed: CalendarSeed, options: CalendarOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const primary = useMemo(() => primaryOf(seed), [seed]);
  const [state, setState] = useState<CalendarState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);
  // The clock: the red line and the dimmed past move with it.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const update = useCallback((fn: (draft: CalendarState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: CalendarEvent) => opts.current.onEvent?.(event), []);
  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);
  const entry = useCallback((id: string) => ref.current.entries.find((e) => e.id === id) ?? null, []);

  // ---------- What the world does ----------

  /** An entry appears (an invite lands, someone books time). Returns its id. */
  const addEntry = useCallback(
    (input: CalendarEntryInput) => {
      let id = "";
      update((s) => {
        id = input.id ?? nextId(s);
        s.entries.push(makeEntry(input, id, primary));
      });
      return id;
    },
    [update, primary]
  );

  /** An entry changes: moved, renamed, a guest or a link added. */
  const updateEntry = useCallback(
    (id: string, patch: Partial<CalendarEntryInput>) =>
      void update((s) => {
        const i = s.entries.findIndex((e) => e.id === id);
        if (i >= 0) s.entries[i] = makeEntry({ ...s.entries[i], ...patch }, id, primary);
      }),
    [update, primary]
  );

  /** An entry goes away (cancelled by its organizer). */
  const removeEntry = useCallback(
    (id: string) =>
      void update((s) => {
        s.entries = s.entries.filter((e) => e.id !== id);
        if (s.selected === id) s.selected = null;
      }),
    [update]
  );

  /** A guest answers: `who` is a person's id or an outside guest's email. Adds them as a guest when they are not one. */
  const rsvp = useCallback(
    (id: string, who: string, answer: Rsvp) =>
      void update((s) => {
        const e = s.entries.find((x) => x.id === id);
        if (!e) return;
        const g = e.guests.find((x) => x.person === who || x.email === who);
        if (g) g.rsvp = answer;
        else e.guests.push(people[who] ? { person: who, rsvp: answer } : { email: who, rsvp: answer });
      }),
    [update, people]
  );

  /** Opens an entry's popover, or closes it (null). */
  const open = useCallback((id: string | null) => void update((s) => void (s.selected = id)), [update]);

  /** Shows a day, in a view (the current one by default). */
  const goTo = useCallback(
    (date: string, view?: CalendarView) =>
      void update((s) => {
        s.anchor = date;
        if (view) s.view = view;
      }),
    [update]
  );

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  // ---------- What the signed-in person does (wired by <GoogleCalendar>) ----------

  const navigate = useCallback(
    (date: string, view?: CalendarView) => {
      const s = update((d) => {
        d.anchor = date;
        if (view) d.view = view;
      });
      emit({ type: "navigate", date, view: s.view });
    },
    [update, emit]
  );

  /** Today, previous or next: a day, three days, a week or a month at a time. */
  const step = useCallback(
    (dir: -1 | 0 | 1, narrow: boolean) => {
      const { view, anchor } = ref.current;
      const a = parseDay(anchor);
      let next = ymd(new Date());
      if (dir && view === "month") next = ymd(new Date(a.getFullYear(), a.getMonth() + dir, 1));
      else if (dir) next = ymd(addDays(a, dir * daysOnScreen(view, anchor, narrow)[1]));
      navigate(next);
    },
    [navigate]
  );

  const setView = useCallback(
    (view: CalendarView) => {
      if (ref.current.view === view) return;
      update((s) => void (s.view = view));
      emit({ type: "view", view });
    },
    [update, emit]
  );

  const toggleCalendar = useCallback(
    (id: string) => {
      const s = update((d) => void (d.visible[id] = !d.visible[id]));
      emit({ type: "toggle", calendar: id, visible: s.visible[id] });
    },
    [update, emit]
  );

  const select = useCallback(
    (id: string) => {
      update((s) => void (s.selected = id));
      emit({ type: "open", id });
    },
    [update, emit]
  );

  const create = useCallback(
    (input: CalendarEntryInput) => {
      const s = update((d) => void d.entries.push(makeEntry(input, nextId(d), primary)));
      emit({ type: "create", entry: s.entries[s.entries.length - 1] });
    },
    [update, emit, primary]
  );

  const remove = useCallback(
    (id: string) => {
      const e = entry(id);
      if (!e) return;
      removeEntry(id);
      emit({ type: "delete", entry: e });
    },
    [entry, removeEntry, emit]
  );

  const answer = useCallback(
    (id: string, value: Exclude<Rsvp, "awaiting">) => {
      rsvp(id, me, value);
      emit({ type: "rsvp", id, answer: value });
    },
    [rsvp, me, emit]
  );

  const join = useCallback(
    (id: string) => {
      const meet = entry(id)?.meet;
      if (meet) emit({ type: "join", id, meet });
    },
    [entry, emit]
  );

  return {
    seed,
    people,
    me,
    /** The calendar new entries go on. */
    primary,
    /** Save this and pass it back as `restore`. */
    state,
    now,
    notice,
    // The world
    addEntry,
    updateEntry,
    removeEntry,
    rsvp,
    open,
    goTo,
    toast,
    setTheme,
    // The signed-in person (wired by <GoogleCalendar>)
    ui: { navigate, step, setView, toggleCalendar, select, create, remove, answer, join, emit },
  };
}

export type GoogleCalendarApp = ReturnType<typeof useGoogleCalendar>;
