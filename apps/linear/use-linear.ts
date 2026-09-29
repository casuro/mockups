import { useCallback, useMemo, useRef, useState } from "react";
import type {
  LinearActivity,
  LinearActivityInput,
  LinearEvent,
  LinearIssue,
  LinearIssueInput,
  LinearSeed,
  LinearState,
  LinearStatus,
  LinearTab,
  LinearTeam,
  Priority,
} from "./types";

// The workspace behind <Linear>: its state, what the world does to it
// (create and update issues, comment, notify) and what the signed-in person
// does (open an issue, change its status, priority or assignee, comment).
// Every change goes through `update`, which keeps a ref in step with React
// state, so calls made between renders (timers, awaited replies) see what
// the last one wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: string;
}

export type Team = Required<LinearTeam>;
export type Status = Required<LinearStatus>;

export interface LinearOptions {
  /** A state saved from `linear.state`, to pick up where it was left. */
  restore?: LinearState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: LinearEvent) => void;
}

export interface UpdateOptions {
  /** Who made the change: adds "moved from Todo to In Progress"-style lines to the activity. */
  by?: string;
}

export const PRIORITIES = ["No priority", "Urgent", "High", "Medium", "Low"] as const;

const STATUS_COLOR: Record<LinearStatus["type"], string> = {
  backlog: "var(--st-backlog)",
  unstarted: "var(--st-todo)",
  started: "var(--st-progress)",
  completed: "var(--st-done)",
};

const toTime = (at: number | string | undefined | null) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

/** Which issues a tab shows. */
export function inTab(tab: LinearTab, status: Status | undefined) {
  if (!status) return false;
  if (tab === "active") return status.type === "started" || status.type === "unstarted";
  if (tab === "backlog") return status.type === "backlog";
  return true;
}

function normalize(seed: LinearSeed) {
  const people: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    people[id] = { id, name: p.name, photo: p.photo, color: p.color ?? "#c9ccd6", initials: p.initials ?? p.name.trim().charAt(0).toUpperCase() };
  if (!people[seed.me]) throw new Error(`Linear: seed.me "${seed.me}" is not one of seed.people`);
  if (!seed.teams.length) throw new Error("Linear: seed.teams is empty");
  if (!seed.statuses.length) throw new Error("Linear: seed.statuses is empty");
  const teams: Team[] = seed.teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color ?? "#5e6ad2",
    letter: t.letter ?? t.name.charAt(0).toUpperCase(),
    key: t.key ?? t.name.slice(0, 3).toUpperCase(),
  }));
  const statuses: Status[] = seed.statuses.map((s) => ({ ...s, color: s.color ?? STATUS_COLOR[s.type] }));
  return { people, teams, statuses };
}

function makeIssue(
  input: LinearIssueInput,
  ctx: { me: string; teams: Team[]; statuses: Status[]; nextId: (team: Team) => string; nextSeq: () => number }
): LinearIssue {
  const team = ctx.teams.find((t) => t.id === input.team) ?? ctx.teams[0];
  const created = toTime(input.created);
  const assignee = input.assignee ?? null;
  const activity = (input.activity ?? [{ kind: "event", from: input.creator ?? assignee ?? ctx.me, text: "created the issue", at: created }]).map(
    (a): LinearActivity => ({ ...a, id: a.id ?? `a${ctx.nextSeq()}`, at: toTime(a.at) })
  );
  return {
    id: input.id ?? ctx.nextId(team),
    title: input.title,
    team: team.id,
    status: input.status ?? (ctx.statuses.find((s) => s.type === "unstarted") ?? ctx.statuses[0]).id,
    priority: input.priority ?? 0,
    assignee,
    labels: input.labels ?? [],
    project: input.project ?? null,
    cycle: input.cycle ?? null,
    due: input.due == null ? null : toTime(input.due),
    created,
    description: input.description ?? "",
    subIssues: input.subIssues ?? [],
    activity,
  };
}

/** The next free number for a team's key: PLA-938 is taken, so PLA-939. */
function nextIdIn(issues: LinearIssue[], team: Team) {
  const prefix = `${team.key}-`;
  const top = issues.reduce((n, i) => (i.id.startsWith(prefix) ? Math.max(n, parseInt(i.id.slice(prefix.length), 10) || 0) : n), 0);
  return `${prefix}${top + 1}`;
}

function find(s: LinearState, id: string) {
  const issue = s.issues.find((i) => i.id === id);
  if (!issue) throw new Error(`Linear: there is no issue ${id}`);
  return issue;
}

function pushActivity(s: LinearState, issue: LinearIssue, input: LinearActivityInput) {
  const a: LinearActivity = { ...input, id: input.id ?? `a${++s.seq}`, at: toTime(input.at) };
  issue.activity.push(a);
  return a.id;
}

const FIELDS = ["title", "team", "status", "priority", "assignee", "labels", "project", "cycle", "description", "subIssues"] as const;

function initialState(seed: LinearSeed, teams: Team[], statuses: Status[]): LinearState {
  let seq = 0;
  const issues: LinearIssue[] = [];
  for (const input of seed.issues)
    issues.push(makeIssue(input, { me: seed.me, teams, statuses, nextId: (t) => nextIdIn(issues, t), nextSeq: () => ++seq }));
  const team = teams.find((t) => t.id === seed.team) ?? teams[0];
  const first = issues.find((i) => i.team === team.id);
  return {
    version: 1,
    issues,
    nav: `${team.id}:issues`,
    team: team.id,
    tab: "all",
    selected: seed.open ?? first?.id ?? null,
    open: seed.open ?? null,
    collapsed: [],
    expanded: seed.expanded ?? [teams[0].id],
    inbox: seed.inbox ?? 0,
    theme: seed.theme ?? "light",
    seq,
  };
}

export function useLinear(seed: LinearSeed, options: LinearOptions = {}) {
  const { people, teams, statuses } = useMemo(() => normalize(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<LinearState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed, teams, statuses)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);

  const update = useCallback((fn: (draft: LinearState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: LinearEvent) => opts.current.onEvent?.(event), []);

  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  const statusName = useCallback((id: string) => statuses.find((s) => s.id === id)?.name ?? id, [statuses]);
  const personName = useCallback((id: string | null) => (id ? (people[id]?.name ?? id) : "no one"), [people]);

  /** The issues the list shows now: the current team's, in the current tab. */
  const visible = useCallback(
    (s: LinearState = ref.current) =>
      statuses.flatMap((st) => (inTab(s.tab, st) ? s.issues.filter((i) => i.team === s.team && i.status === st.id) : [])),
    [statuses]
  );

  /** Applies a change and writes what changed into the activity when someone made it. */
  const change = useCallback(
    (s: LinearState, issue: LinearIssue, patch: Partial<Omit<LinearIssueInput, "id">>, by?: string) => {
      if (by && patch.status !== undefined && patch.status !== issue.status)
        pushActivity(s, issue, { kind: "event", from: by, text: `moved from ${statusName(issue.status)} to ${statusName(patch.status)}` });
      if (by && patch.priority !== undefined && patch.priority !== issue.priority)
        pushActivity(s, issue, { kind: "event", from: by, text: `set priority to ${PRIORITIES[patch.priority]}` });
      if (by && patch.assignee !== undefined && patch.assignee !== issue.assignee)
        pushActivity(s, issue, {
          kind: "event",
          from: by,
          text: patch.assignee === by ? "self-assigned the issue" : patch.assignee ? `assigned the issue to ${personName(patch.assignee)}` : "removed the assignee",
        });
      for (const k of FIELDS) if (patch[k] !== undefined) Object.assign(issue, { [k]: patch[k] });
      if (patch.due !== undefined) issue.due = patch.due == null ? null : toTime(patch.due);
      if (patch.created !== undefined) issue.created = toTime(patch.created);
    },
    [statusName, personName]
  );

  // ---------- What the world does ----------

  /** A new issue appears (someone filed it). Resolves with its id. */
  const createIssue = useCallback(
    (input: LinearIssueInput) => {
      let id = "";
      update((s) => {
        const issue = makeIssue(input, { me, teams, statuses, nextId: (t) => nextIdIn(s.issues, t), nextSeq: () => ++s.seq });
        if (s.issues.some((i) => i.id === issue.id)) throw new Error(`Linear: issue ${issue.id} already exists`);
        s.issues.push(issue);
        id = issue.id;
      });
      return id;
    },
    [update, me, teams, statuses]
  );

  /** Someone changes an issue: any of its fields. With `by`, the change shows in its activity. */
  const updateIssue = useCallback(
    (id: string, patch: Partial<Omit<LinearIssueInput, "id">>, o: UpdateOptions = {}) =>
      void update((s) => change(s, find(s, id), patch, o.by)),
    [update, change]
  );

  /** Someone comments on an issue. Returns the comment's id. */
  const comment = useCallback(
    (id: string, from: string, text: string) => {
      let cid = "";
      update((s) => void (cid = pushActivity(s, find(s, id), { kind: "comment", from, text })));
      return cid;
    },
    [update]
  );

  /** Any activity line: an event, a comment, or a `custom` one. Returns its id. */
  const log = useCallback(
    (id: string, entry: LinearActivityInput) => {
      let aid = "";
      update((s) => void (aid = pushActivity(s, find(s, id), entry)));
      return aid;
    },
    [update]
  );

  /** Something lands in the Inbox: its count goes up and the text shows as a toast. */
  const notify = useCallback(
    (text: string) => {
      update((s) => void (s.inbox += 1));
      toast(text);
    },
    [update, toast]
  );

  // ---------- What the signed-in person does (wired by <Linear>) ----------

  /** Show an issue, or the list (null). */
  const open = useCallback(
    (id: string | null) => {
      if (id) find(ref.current, id);
      update((s) => {
        s.open = id;
        if (id) s.selected = id;
      });
      if (id) emit({ type: "open", id });
    },
    [update, emit]
  );

  const select = useCallback((id: string | null) => void update((s) => void (s.selected = id)), [update]);

  /** Move the highlight (or the open issue) up or down the list. */
  const step = useCallback(
    (by: number) => {
      const list = visible();
      if (!list.length) return;
      const s = ref.current;
      const cur = list.findIndex((i) => i.id === (s.open ?? s.selected));
      const next = list[Math.max(0, Math.min(list.length - 1, cur + by))];
      if (s.open) open(next.id);
      else select(next.id);
    },
    [visible, open, select]
  );

  const setStatus = useCallback(
    (id: string, to: string) => {
      const from = find(ref.current, id).status;
      if (from === to) return;
      update((s) => change(s, find(s, id), { status: to }, me));
      emit({ type: "status", id, from, to });
    },
    [update, change, me, emit]
  );

  const setPriority = useCallback(
    (id: string, to: Priority) => {
      const from = find(ref.current, id).priority;
      if (from === to) return;
      update((s) => change(s, find(s, id), { priority: to }, me));
      emit({ type: "priority", id, from, to });
    },
    [update, change, me, emit]
  );

  const setAssignee = useCallback(
    (id: string, to: string | null) => {
      const from = find(ref.current, id).assignee;
      if (from === to) return;
      update((s) => change(s, find(s, id), { assignee: to }, me));
      emit({ type: "assignee", id, from, to });
    },
    [update, change, me, emit]
  );

  const postComment = useCallback(
    (id: string, text: string) => {
      let commentId = "";
      update((s) => void (commentId = pushActivity(s, find(s, id), { kind: "comment", from: me, text })));
      emit({ type: "comment", id, text, commentId });
    },
    [update, me, emit]
  );

  /** A sidebar item: "inbox", "mine", or a team's "platform:issues". A team's Issues shows its list. */
  const navigate = useCallback(
    (to: string) => {
      update((s) => {
        s.nav = to;
        s.open = null;
        const [team, page] = to.split(":");
        if (page === "issues" && teams.some((t) => t.id === team) && s.team !== team) {
          s.team = team;
          s.selected = s.issues.find((i) => i.team === team)?.id ?? null;
        }
      });
      emit({ type: "navigate", to });
    },
    [update, teams, emit]
  );

  const setTab = useCallback(
    (tab: LinearTab) => {
      update((s) => {
        s.tab = tab;
        s.open = null;
      });
      emit({ type: "navigate", to: `tab:${tab}` });
    },
    [update, emit]
  );

  const toggleGroup = useCallback(
    (status: string) =>
      void update((s) => void (s.collapsed = s.collapsed.includes(status) ? s.collapsed.filter((x) => x !== status) : [...s.collapsed, status])),
    [update]
  );

  const toggleTeam = useCallback(
    (team: string) =>
      void update((s) => void (s.expanded = s.expanded.includes(team) ? s.expanded.filter((x) => x !== team) : [...s.expanded, team])),
    [update]
  );

  const create = useCallback((status?: string) => emit({ type: "create", team: ref.current.team, ...(status ? { status } : {}) }), [emit]);

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  const issue = useCallback((id: string) => ref.current.issues.find((i) => i.id === id), []);

  return {
    seed,
    people,
    teams,
    statuses,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    /** The issues the list shows now, in order. */
    visible,
    /** An issue by id, as it is now. */
    issue,
    // The world
    createIssue,
    updateIssue,
    comment,
    log,
    notify,
    toast,
    open,
    // The signed-in person (wired by <Linear>)
    ui: { select, step, setStatus, setPriority, setAssignee, postComment, navigate, setTab, toggleGroup, toggleTeam, create, setTheme, emit },
  };
}

export type LinearWorkspace = ReturnType<typeof useLinear>;
