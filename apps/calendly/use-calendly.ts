import { useCallback, useMemo, useRef, useState } from "react";
import { localToday, minutesOf, monthOf, monthParts, offsetOf } from "./format";
import type { CalendlyAvailability, CalendlyBooking, CalendlyEvent, CalendlyForm, CalendlyQuestion, CalendlySeed, CalendlyState, CalendlyTimeZone, Day, SlotTime } from "./types";

// The booking page behind <Calendly>: its state, what the world does to it
// (change when the host is free, start over, show a notice) and what the
// invitee does (pick a day and a time, fill in the form, book). Every change
// goes through `update`, which keeps a ref in step with React state, so calls
// made between renders (timers, awaited replies) see what the last one wrote.
// Every function it returns is stable across renders.

export interface CalendlyOptions {
  /** A state saved from `calendly.state`, to pick up where it was left. */
  restore?: CalendlyState | null;
  /** Everything the invitee does. */
  onEvent?: (event: CalendlyEvent) => void;
}

export const DEFAULT_QUESTIONS: CalendlyQuestion[] = [{ id: "notes", label: "Please share anything that will help prepare for our meeting.", multiline: true }];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = (): CalendlyForm => ({ name: "", email: "", guests: "", answers: {} });

function initialState(seed: CalendlySeed): CalendlyState {
  if (!seed.timeZones.length) throw new Error("Calendly: seed.timeZones needs at least one time zone");
  const host = seed.hostTimeZone ?? seed.timeZones[0].id;
  return {
    version: 1,
    step: "calendar",
    month: seed.month ?? (seed.today ?? localToday()).slice(0, 7),
    day: null,
    slot: null,
    timeZone: seed.timeZone ?? host,
    form: emptyForm(),
    showGuests: false,
    errors: {},
    bookings: [],
    theme: seed.theme ?? "light",
  };
}

function listFor(availability: CalendlyAvailability, day: Day): SlotTime[] {
  const list = typeof availability === "function" ? availability(day) : availability[day];
  return [...(list ?? [])].sort((a, b) => minutesOf(a) - minutesOf(b));
}

export function useCalendly(seed: CalendlySeed, options: CalendlyOptions = {}) {
  const [state, setState] = useState<CalendlyState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const availability = useRef<CalendlyAvailability>(seed.availability);
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);

  const today = seed.today ?? localToday();
  const hostZoneId = seed.hostTimeZone ?? seed.timeZones[0]?.id;
  const questions = seed.event.questions ?? DEFAULT_QUESTIONS;

  const update = useCallback((fn: (draft: CalendlyState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: CalendlyEvent) => opts.current.onEvent?.(event), []);

  const zone = useCallback(
    (id: string): CalendlyTimeZone => seed.timeZones.find((z) => z.id === id) ?? { id, label: id },
    [seed.timeZones]
  );

  /** The times still open on a day, on the host's clock: none before today, none already booked here. */
  const slotsFor = useCallback(
    (day: Day): SlotTime[] => {
      if (day < today) return [];
      const taken = new Set(ref.current.bookings.filter((b) => b.day === day).map((b) => b.time));
      return listFor(availability.current, day).filter((t) => !taken.has(t));
    },
    [today]
  );

  /** A host time on a day, in minutes after midnight on the invitee's clock (or `zoneId`'s). */
  const localMinutes = useCallback(
    (day: Day, time: SlotTime, zoneId = ref.current.timeZone) =>
      minutesOf(time) + (offsetOf(zone(zoneId), day) - offsetOf(zone(hostZoneId), day)) * 60,
    [zone, hostZoneId]
  );

  // ---------- What the world does ----------

  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  /** When the host is free from now on. A picked day or time that is no longer open is let go. */
  const setAvailability = useCallback(
    (next: CalendlyAvailability) => {
      availability.current = next;
      update((s) => {
        if (s.step !== "calendar" || !s.day) return;
        const open = slotsFor(s.day);
        if (!open.length) s.day = s.slot = null;
        else if (s.slot && !open.includes(s.slot)) s.slot = null;
      });
    },
    [update, slotsFor]
  );

  /** Back to the page as it opened: the seed's availability, month and time zone, an empty form, no bookings. */
  const reset = useCallback(() => {
    availability.current = seed.availability;
    update((s) => Object.assign(s, initialState(seed)));
  }, [seed, update]);

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  // ---------- What the invitee does (wired by <Calendly>) ----------

  const showMonth = useCallback(
    (delta: number) => {
      const { year, month } = monthParts(ref.current.month);
      const next = monthOf(year, month + delta);
      if (next < today.slice(0, 7)) return;
      update((s) => void (s.month = next));
      emit({ type: "month", month: next });
    },
    [update, emit, today]
  );

  const pickDay = useCallback(
    (day: Day) => {
      update((s) => {
        s.day = day;
        s.slot = null;
      });
      emit({ type: "date", day });
    },
    [update, emit]
  );

  const pickSlot = useCallback(
    (time: SlotTime) => {
      const day = ref.current.day;
      if (!day) return;
      update((s) => void (s.slot = time));
      emit({ type: "slot", day, time });
    },
    [update, emit]
  );

  const next = useCallback(() => {
    const { day, slot } = ref.current;
    if (!day || !slot) return;
    update((s) => {
      s.step = "details";
      s.errors = {};
    });
    emit({ type: "next", day, time: slot });
  }, [update, emit]);

  const back = useCallback(() => {
    update((s) => void (s.step = "calendar"));
    emit({ type: "back" });
  }, [update, emit]);

  const setTimeZone = useCallback(
    (id: string) => {
      update((s) => void (s.timeZone = id));
      emit({ type: "timezone", timeZone: id });
    },
    [update, emit]
  );

  /** Typing in a field: "name", "email", "guests", or a question id. */
  const setField = useCallback(
    (field: string, value: string) =>
      void update((s) => {
        if (field === "name" || field === "email" || field === "guests") s.form[field] = value;
        else s.form.answers[field] = value;
      }),
    [update]
  );

  const addGuests = useCallback(() => void update((s) => void (s.showGuests = true)), [update]);

  /** Schedule Event: checks the form, then books. Returns the errors (empty when booked). */
  const submit = useCallback(() => {
    const { form, day, slot, timeZone } = ref.current;
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Can't be blank";
    if (!form.email.trim()) errors.email = "Can't be blank";
    else if (!EMAIL.test(form.email.trim())) errors.email = "Invalid email";
    for (const q of questions) if (q.required && !(form.answers[q.id] ?? "").trim()) errors[q.id] = "Can't be blank";
    if (Object.keys(errors).length || !day || !slot) {
      update((s) => void (s.errors = errors));
      emit({ type: "invalid", errors });
      return errors;
    }
    const booking: CalendlyBooking = {
      day,
      time: slot,
      timeZone,
      name: form.name.trim(),
      email: form.email.trim(),
      guests: form.guests.split(/[\s,;]+/).filter(Boolean),
      answers: { ...form.answers },
    };
    update((s) => {
      s.errors = {};
      s.step = "done";
      s.bookings.push(booking);
    });
    emit({ type: "book", booking });
    return errors;
  }, [update, emit, questions]);

  const again = useCallback(() => {
    update((s) => {
      s.step = "calendar";
      s.day = s.slot = null;
      s.showGuests = false;
      s.errors = {};
      s.form = emptyForm();
    });
    emit({ type: "again" });
  }, [update, emit]);

  const ui = useMemo(
    () => ({ showMonth, pickDay, pickSlot, next, back, setTimeZone, setField, addGuests, submit, again, emit }),
    [showMonth, pickDay, pickSlot, next, back, setTimeZone, setField, addGuests, submit, again, emit]
  );

  return {
    seed,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    today,
    questions,
    /** The invitee's time zone. */
    zone: zone(state.timeZone),
    slotsFor,
    localMinutes,
    /** The most recent booking, once there is one. */
    booking: state.bookings[state.bookings.length - 1] ?? null,
    // The world
    setAvailability,
    reset,
    toast,
    setTheme,
    // The invitee (wired by <Calendly>)
    ui,
  };
}

export type CalendlyPage = ReturnType<typeof useCalendly>;
