import { useCallback, useMemo, useRef, useState } from "react";
import type {
  GreenhouseActivity,
  GreenhouseActivityInput,
  GreenhouseCandidate,
  GreenhouseCandidateInput,
  GreenhouseEvent,
  GreenhouseInterview,
  GreenhouseScorecard,
  GreenhouseSeed,
  GreenhouseState,
} from "./types";

// The job behind <Greenhouse>: its state, what the world does to it (a
// candidate applies, a scorecard comes in, an interview is booked) and what
// the signed-in person does (open a candidate, move, reject, add a note).
// Every change goes through `update`, which keeps a ref in step with React
// state, so calls made between renders (timers, awaited replies) see what the
// last one wrote. Every function it returns is stable across renders.

export interface Staff {
  id: string;
  name: string;
  role?: string;
  photo?: string;
  initials: string;
  color: string;
}

export interface GreenhouseOptions {
  /** A state saved from `greenhouse.state`, to pick up where it was left. */
  restore?: GreenhouseState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: GreenhouseEvent) => void;
}

const PALETTE = ["#2f7d6b", "#6b5ca5", "#b5613a", "#3a6ea5", "#a5456b", "#5f7d2f", "#8a6d1f", "#2f6f8a"];
export const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

function normalizeStaff(seed: GreenhouseSeed): Record<string, Staff> {
  const out: Record<string, Staff> = {};
  for (const [id, p] of Object.entries(seed.staff))
    out[id] = { id, name: p.name, role: p.role, photo: p.photo, initials: p.initials ?? initialsOf(p.name), color: p.color ?? colorFor(id) };
  if (!out[seed.me]) throw new Error(`Greenhouse: seed.me "${seed.me}" is not one of seed.staff`);
  return out;
}

function makeActivity(a: GreenhouseActivityInput, id: string): GreenhouseActivity {
  return { ...a, id: a.id ?? id, at: toTime(a.at) };
}

function makeCandidate(c: GreenhouseCandidateInput, stages: string[], next: () => string): GreenhouseCandidate {
  if (!stages.includes(c.stage)) throw new Error(`Greenhouse: candidate ${c.id}'s stage "${c.stage}" is not one of seed.stages`);
  return {
    ...c,
    days: c.days ?? 0,
    rating: Math.max(0, Math.min(3, c.rating ?? 0)),
    tags: c.tags ?? [],
    scorecards: (c.scorecards ?? []).map((s) => ({ ...s, attributes: s.attributes ? [...s.attributes] : undefined })),
    activity: (c.activity ?? []).map((a) => makeActivity(a, next())),
    interviews: (c.interviews ?? []).map((v) => ({ ...v, with: [...v.with] })),
    rejected: false,
  };
}

function initialState(seed: GreenhouseSeed): GreenhouseState {
  let seq = 0;
  const next = () => `a${++seq}`;
  const candidates = seed.candidates.map((c) => makeCandidate(c, seed.stages, next));
  return {
    version: 1,
    candidates,
    open: seed.open && candidates.some((c) => c.id === seed.open) ? seed.open : null,
    filter: null,
    selected: [],
    theme: seed.theme ?? "light",
    seq,
  };
}

export function useGreenhouse(seed: GreenhouseSeed, options: GreenhouseOptions = {}) {
  const staff = useMemo(() => normalizeStaff(seed), [seed]);
  const { me, stages } = seed;
  const [state, setState] = useState<GreenhouseState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);

  const update = useCallback((fn: (draft: GreenhouseState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: GreenhouseEvent) => opts.current.onEvent?.(event), []);
  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  /** A staff member's name, or the text itself for anyone else ("Greenhouse"). */
  const nameOf = useCallback((who: string) => staff[who]?.name ?? who, [staff]);

  const find = useCallback((s: GreenhouseState, id: string) => {
    const c = s.candidates.find((x) => x.id === id);
    if (!c) throw new Error(`Greenhouse: there is no candidate ${id}`);
    return c;
  }, []);

  const checkStage = useCallback(
    (stage: string) => {
      if (!stages.includes(stage)) throw new Error(`Greenhouse: "${stage}" is not one of seed.stages`);
    },
    [stages]
  );

  // ---------- What the world does ----------

  /** A new candidate lands on the board (at the end of their stage). */
  const addCandidate = useCallback(
    (candidate: GreenhouseCandidateInput) =>
      void update((s) => {
        if (s.candidates.some((c) => c.id === candidate.id)) throw new Error(`Greenhouse: candidate ${candidate.id} already exists`);
        s.candidates.push(makeCandidate(candidate, stages, () => `a${++s.seq}`));
      }),
    [update, stages]
  );

  /**
   * Someone else moves a candidate to `stage`. With `by` (a staff id or a
   * name), the move also shows in their activity feed.
   */
  const moveCandidate = useCallback(
    (id: string, stage: string, by?: string) => {
      checkStage(stage);
      update((s) => {
        const c = find(s, id);
        if (c.stage === stage) return;
        if (by) c.activity.unshift(makeActivity({ kind: "move", by, text: `Moved from ${c.stage} to ${stage}` }, `a${++s.seq}`));
        c.stage = stage;
        c.days = 0;
      });
    },
    [update, find, checkStage]
  );

  /**
   * An interviewer submits a scorecard: it replaces their awaited one for the
   * same step, or is added. `rating` sets the card's dots too.
   */
  const submitScorecard = useCallback(
    (candidateId: string, scorecard: GreenhouseScorecard, rating?: number) =>
      void update((s) => {
        const c = find(s, candidateId);
        const i = c.scorecards.findIndex((x) => x.by === scorecard.by && x.step === scorecard.step);
        if (i >= 0) c.scorecards[i] = scorecard;
        else c.scorecards.push(scorecard);
        if (rating !== undefined) c.rating = Math.max(0, Math.min(3, rating));
      }),
    [update, find]
  );

  /** Something shows at the top of a candidate's activity feed. Returns its id. */
  const addActivity = useCallback(
    (candidateId: string, item: GreenhouseActivityInput) => {
      let id = "";
      update((s) => {
        const a = makeActivity(item, `a${++s.seq}`);
        id = a.id;
        find(s, candidateId).activity.unshift(a);
      });
      return id;
    },
    [update, find]
  );

  /** An interview is booked: it shows under Upcoming Interviews. */
  const scheduleInterview = useCallback(
    (candidateId: string, interview: GreenhouseInterview) =>
      void update((s) => void find(s, candidateId).interviews.push({ ...interview, with: [...interview.with] })),
    [update, find]
  );

  /** A candidate leaves the board (rejected, or withdrew). */
  const rejectCandidate = useCallback(
    (id: string) =>
      void update((s) => {
        find(s, id).rejected = true;
        s.selected = s.selected.filter((x) => x !== id);
        if (s.open === id) s.open = null;
      }),
    [update, find]
  );

  /** Opens a candidate's drawer (null closes it). */
  const open = useCallback(
    (id: string | null) =>
      void update((s) => {
        if (id) find(s, id);
        s.open = id;
      }),
    [update, find]
  );

  // ---------- What the signed-in person does (wired by <Greenhouse>) ----------

  const openCandidate = useCallback(
    (id: string) => {
      open(id);
      emit({ type: "open", candidate: id });
    },
    [open, emit]
  );

  const close = useCallback(() => {
    const id = ref.current.open;
    if (!id) return;
    open(null);
    emit({ type: "close", candidate: id });
  }, [open, emit]);

  const move = useCallback(
    (id: string, stage: string) => {
      const c = ref.current.candidates.find((x) => x.id === id);
      if (!c || c.stage === stage) return;
      const from = c.stage;
      moveCandidate(id, stage, me);
      toast(`${c.name} moved to ${stage}`);
      emit({ type: "move", candidate: id, from, to: stage });
    },
    [moveCandidate, me, toast, emit]
  );

  const bulkMove = useCallback(
    (stage: string) => {
      checkStage(stage);
      const ids = ref.current.selected;
      if (!ids.length) return;
      update((s) => {
        for (const id of ids) {
          const c = find(s, id);
          if (c.stage !== stage) {
            c.stage = stage;
            c.days = 0;
          }
        }
        s.selected = [];
      });
      toast(`Moved ${ids.length} candidate${ids.length > 1 ? "s" : ""} to ${stage}`);
      emit({ type: "bulk-move", candidates: ids, to: stage });
    },
    [update, find, checkStage, toast, emit]
  );

  const reject = useCallback(
    (id: string) => {
      const c = ref.current.candidates.find((x) => x.id === id);
      if (!c) return;
      rejectCandidate(id);
      toast(`${c.name} rejected`);
      emit({ type: "reject", candidate: id });
    },
    [rejectCandidate, toast, emit]
  );

  const addNote = useCallback(
    (id: string, text: string) => {
      const note = addActivity(id, { kind: "note", by: me, text });
      toast("Note added");
      emit({ type: "note", candidate: id, text, id: note });
    },
    [addActivity, me, toast, emit]
  );

  const requestInterview = useCallback(
    (id: string) => {
      const who = seed.job.coordinator ?? seed.job.recruiter;
      toast(who ? `Interview request sent to ${nameOf(who)}` : "Interview request sent");
      emit({ type: "schedule", candidate: id });
    },
    [seed.job.coordinator, seed.job.recruiter, nameOf, toast, emit]
  );

  const setFilter = useCallback(
    (stage: string | null) => {
      update((s) => void (s.filter = stage));
      emit({ type: "filter", stage });
    },
    [update, emit]
  );

  const toggleSelect = useCallback(
    (id: string) =>
      void update((s) => {
        s.selected = s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id];
      }),
    [update]
  );

  const clearSelection = useCallback(() => void update((s) => void (s.selected = [])), [update]);

  /** Light or dark. */
  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  const ui = useMemo(
    () => ({ openCandidate, close, move, bulkMove, reject, addNote, requestInterview, setFilter, toggleSelect, clearSelection, emit }),
    [openCandidate, close, move, bulkMove, reject, addNote, requestInterview, setFilter, toggleSelect, clearSelection, emit]
  );

  return {
    seed,
    staff,
    me,
    stages,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    nameOf,
    /** The candidates on the board (not rejected). */
    candidates: state.candidates.filter((c) => !c.rejected),
    // The world
    addCandidate,
    moveCandidate,
    submitScorecard,
    addActivity,
    scheduleInterview,
    rejectCandidate,
    open,
    toast,
    setTheme,
    // The signed-in person (wired by <Greenhouse>)
    ui,
  };
}

export type GreenhouseApp = ReturnType<typeof useGreenhouse>;
