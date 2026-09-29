import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRIORITY_NAMES } from "./icons";
import type {
  EpicColor, JiraEvent, JiraField, JiraIssue, JiraIssueInput, JiraNotificationInput, JiraSeed, JiraSprint, JiraState, JiraStatus, JiraView,
  StatusTone, When,
} from "./types";

// The project behind <Jira>: its state, what the world does to it (an
// issue is filed, moves, gets a comment, a notification arrives) and what
// the signed-in person does (drag a card, edit a field, comment, complete
// the sprint). Every change goes through `update`, which keeps a ref in step
// with React state, so calls made between renders (timers, awaited replies)
// see what the last one wrote. Every function it returns is stable across
// renders.

export interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  photo?: string;
  color: string;
  initials: string;
}

export interface Status extends JiraStatus {
  tone: StatusTone;
}

export interface FlagInput {
  type?: "success" | "info" | "warning" | "error";
  title: string;
  body?: string;
  /** Links under the text; each closes the flag and runs. */
  actions?: { label: string; run: () => void }[];
}
export interface Flag extends FlagInput {
  id: number;
}

export interface JiraOptions {
  /** A state saved from `jira.state`, to pick up where it was left. */
  restore?: JiraState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: JiraEvent) => void;
}

/** Who did it, for the issue's history. Without `by`, a change leaves no history line. */
export interface ByOptions {
  by?: string;
}

export type IssuePatch = Partial<Pick<JiraIssue, "summary" | "status" | "assignee" | "reporter" | "priority" | "points" | "labels" | "sprint" | "epic" | "flagged" | "fixVersions" | "description" | "dev" | "links" | "watchers" | "custom">>;

const DEFAULT_STATUSES: JiraStatus[] = [
  { id: "todo", name: "To Do" },
  { id: "inprogress", name: "In Progress" },
  { id: "review", name: "In Review" },
  { id: "done", name: "Done" },
];
const TONES: StatusTone[] = ["todo", "inprogress", "review", "done"];
const EPIC_COLORS: EpicColor[] = ["purple", "orange", "lime", "blue"];
const PALETTE = ["#0c66e4", "#6e5dc6", "#22a06b", "#e56910", "#c9372c", "#1d7afc", "#8f7ee7", "#a54800"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
export const DAY = 86_400_000;

export const toTime = (at: When | undefined, fallback: number) =>
  typeof at === "number" ? at : at ? Date.parse(at) || fallback : fallback;

// ---------- Selectors: pure, over a state ----------

/** Ranked issues (no epics or subtasks). */
export const ordered = (s: JiraState) => s.order.map((k) => s.issues[k]).filter(Boolean);
/** An epic's issues, or an issue's subtasks. */
export const childrenOf = (s: JiraState, is: JiraIssue) =>
  is.type === "epic" ? ordered(s).filter((i) => i.epic === is.key) : Object.values(s.issues).filter((i) => i.parent === is.key);
export const epicOf = (s: JiraState, is: JiraIssue): JiraIssue | null => {
  if (is.epic) return s.issues[is.epic] ?? null;
  const p = is.parent ? s.issues[is.parent] : null;
  return p?.epic ? (s.issues[p.epic] ?? null) : null;
};
export const activeSprint = (s: JiraState) => s.sprints.find((x) => x.state === "active") ?? null;
export const inSprint = (s: JiraState, id: string) => ordered(s).filter((i) => i.sprint === id && !i.archived);
const keyNum = (key: string) => +key.slice(key.lastIndexOf("-") + 1) || 0;

function normalizePeople(seed: JiraSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people)) {
    const parts = p.name.trim().split(/\s+/);
    out[id] = {
      id,
      name: p.name,
      email: p.email ?? `${id}@${seed.site}.com`,
      role: p.role ?? "",
      photo: p.photo,
      color: p.color ?? colorFor(id),
      initials: ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase(),
    };
  }
  if (!out[seed.me]) throw new Error(`Jira: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function initialState(seed: JiraSeed, now: number): JiraState {
  const statuses = seed.statuses ?? DEFAULT_STATUSES;
  const issues: Record<string, JiraIssue> = {};
  const order: string[] = [];
  const epics: string[] = [];
  let seq = 0;
  let max = 0;
  for (const i of seed.issues) if (i.key) max = Math.max(max, keyNum(i.key));
  for (const i of seed.issues) for (const s of i.subtasks ?? []) if (s.key) max = Math.max(max, keyNum(s.key));
  let next = max + 1;

  const add = (input: JiraIssueInput) => {
    const key = input.key ?? `${seed.project.key}-${next++}`;
    const created = toTime(input.created, now);
    const reporter = input.reporter ?? seed.me;
    const assignee = input.assignee ?? null;
    const is: JiraIssue = {
      key,
      type: input.type,
      summary: input.summary,
      status: input.status ?? statuses[0].id,
      assignee,
      reporter,
      priority: input.priority ?? "medium",
      points: input.points ?? null,
      labels: input.labels ?? [],
      sprint: input.sprint ?? null,
      epic: input.epic ?? null,
      parent: input.parent ?? null,
      flagged: !!input.flagged,
      fixVersions: input.fixVersions ?? [],
      description: input.description ?? "",
      comments: (input.comments ?? []).map((c) => ({ id: c.id ?? `c${++seq}`, from: c.from, at: toTime(c.at, now), text: c.text, edited: !!c.edited })),
      history: [
        { by: reporter, field: "created", from: "", to: "", at: created },
        ...(input.history ?? []).map((h) => ({ by: h.by, field: h.field, from: h.from ?? "", to: h.to ?? "", at: toTime(h.at, now) })),
      ],
      worklog: (input.worklog ?? []).map((w) => ({ by: w.by, minutes: w.minutes, text: w.text ?? "", at: toTime(w.at, now) })),
      links: input.links ?? [],
      watchers: input.watchers ?? [...new Set([reporter, ...(assignee ? [assignee] : [])])],
      created,
      updated: toTime(input.updated, created),
      dev: input.dev ?? null,
      ...(input.type === "epic" ? { color: input.color ?? EPIC_COLORS[epics.length % 4] } : {}),
      ...(input.archived ? { archived: true } : {}),
      ...(input.custom ? { custom: input.custom } : {}),
    };
    issues[key] = is;
    if (is.type === "epic") epics.push(key);
    else if (is.type !== "subtask") order.push(key);
    for (const sub of input.subtasks ?? []) add({ ...sub, type: "subtask", parent: key, sprint: sub.sprint ?? is.sprint });
  };
  seed.issues.forEach(add);
  // Issues done in a closed sprint remember it for the Issues list.
  for (const is of Object.values(issues)) if (is.archived && is.sprint) (is.doneSprint = is.sprint), (is.sprint = null);

  const labels = [...new Set([...(seed.labels ?? []), ...Object.values(issues).flatMap((i) => i.labels)])];
  const open = seed.open?.issue && issues[seed.open.issue] ? seed.open.issue : null;
  return {
    version: 1,
    view: seed.open?.view ?? "board",
    open,
    fullPage: false,
    issues,
    order,
    epics,
    sprints: seed.sprints.map((s) => ({ id: s.id, name: s.name, start: s.start != null ? toTime(s.start, now) : null, end: s.end != null ? toTime(s.end, now) : null, state: s.state, goal: s.goal ?? "" })),
    versions: (seed.versions ?? []).map((v) => ({ id: v.id, name: v.name, date: v.date != null ? toTime(v.date, now) : null, released: !!v.released })),
    labels,
    notifications: (seed.notifications ?? []).map((n, i) => notification(n, `n${i + 1}`, now)),
    recent: (seed.recent ?? []).filter((k) => issues[k]),
    starred: true,
    theme: seed.theme ?? "light",
    nextKey: next,
    seq,
  };
}

function notification(n: JiraNotificationInput, id: string, now: number) {
  return { id: n.id ?? id, from: n.from, verb: n.verb, key: n.key, quote: n.quote, change: n.change, at: toTime(n.at, now), read: !!n.read, tab: n.tab ?? "direct" };
}

export function useJira(seed: JiraSeed, options: JiraOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const statuses = useMemo<Status[]>(
    () => (seed.statuses ?? DEFAULT_STATUSES).map((s) => ({ ...s, tone: s.tone ?? (TONES.includes(s.id as StatusTone) ? (s.id as StatusTone) : "todo") })),
    [seed.statuses]
  );
  const me = seed.me;
  // The app's clock: seed.now when the app opened, ticking on from there.
  const offset = useRef<number | null>(null);
  offset.current ??= seed.now != null ? toTime(seed.now, Date.now()) - Date.now() : 0;
  const now = useCallback(() => Date.now() + (offset.current ?? 0), []);

  const [state, setState] = useState<JiraState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed, now())));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [flags, setFlags] = useState<Flag[]>([]);
  const flagSeq = useRef(0);

  const update = useCallback((fn: (draft: JiraState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: JiraEvent) => opts.current.onEvent?.(event), []);

  const flag = useCallback((f: FlagInput) => {
    const id = ++flagSeq.current;
    setFlags((list) => [...list, { ...f, type: f.type ?? "success", id }].slice(-3));
    return id;
  }, []);
  const dismiss = useCallback((id: number) => setFlags((list) => list.filter((f) => f.id !== id)), []);
  /** A blue info flag at the bottom left. */
  const toast = useCallback((title: string, body?: string) => void flag({ type: "info", title, body }), [flag]);

  const pname = useCallback((id: string | null | undefined) => (id ? (people[id]?.name ?? id) : "Unassigned"), [people]);
  const statusName = useCallback((id: string) => statuses.find((s) => s.id === id)?.name ?? id, [statuses]);
  const sprintName = (s: JiraState, id: string | null) => (id ? (s.sprints.find((x) => x.id === id)?.name ?? id) : "");
  const doneStatus = statuses[statuses.length - 1].id;

  const need = useCallback((s: JiraState, key: string) => {
    const is = s.issues[key];
    if (!is) throw new Error(`Jira: there is no issue ${key}`);
    return is;
  }, []);

  const log = useCallback(
    (is: JiraIssue, by: string | undefined, field: string, from: string, to: string) => {
      is.updated = now();
      if (by) is.history.push({ by, field, from, to, at: now() });
    },
    [now]
  );

  /** Applies a patch to an issue, logging each change in its history as `by`. */
  const applyPatch = useCallback(
    (s: JiraState, is: JiraIssue, patch: IssuePatch, by?: string) => {
      const p = patch;
      if (p.summary !== undefined && p.summary !== is.summary) (log(is, by, "Summary", is.summary, p.summary), (is.summary = p.summary));
      if (p.status !== undefined && p.status !== is.status) (log(is, by, "Status", statusName(is.status), statusName(p.status)), (is.status = p.status));
      if (p.assignee !== undefined && p.assignee !== is.assignee) {
        log(is, by, "Assignee", pname(is.assignee), pname(p.assignee));
        is.assignee = p.assignee;
        if (p.assignee && !is.watchers.includes(p.assignee)) is.watchers.push(p.assignee);
      }
      if (p.reporter !== undefined && p.reporter !== is.reporter) (log(is, by, "Reporter", pname(is.reporter), pname(p.reporter)), (is.reporter = p.reporter));
      if (p.priority !== undefined && p.priority !== is.priority) (log(is, by, "Priority", PRIORITY_NAMES[is.priority], PRIORITY_NAMES[p.priority]), (is.priority = p.priority));
      if (p.points !== undefined && p.points !== is.points) (log(is, by, "Story point estimate", String(is.points ?? ""), String(p.points ?? "")), (is.points = p.points));
      if (p.sprint !== undefined && p.sprint !== is.sprint) {
        log(is, by, "Sprint", sprintName(s, is.sprint), sprintName(s, p.sprint));
        is.sprint = p.sprint;
        for (const c of childrenOf(s, is)) if (is.type !== "epic") c.sprint = p.sprint;
      }
      if (p.epic !== undefined && p.epic !== is.epic) (log(is, by, "Parent", is.epic ?? "", p.epic ?? ""), (is.epic = p.epic));
      if (p.flagged !== undefined && p.flagged !== is.flagged) (log(is, by, "Flagged", is.flagged ? "Impediment" : "", p.flagged ? "Impediment" : ""), (is.flagged = p.flagged));
      if (p.description !== undefined && p.description !== is.description) (log(is, by, "Description", "", "Updated"), (is.description = p.description));
      if (p.labels !== undefined) (is.labels = [...p.labels]), (is.updated = now());
      if (p.fixVersions !== undefined) (is.fixVersions = [...p.fixVersions]), (is.updated = now());
      if (p.dev !== undefined) is.dev = p.dev;
      if (p.links !== undefined) is.links = p.links;
      if (p.watchers !== undefined) is.watchers = p.watchers;
      if (p.custom !== undefined) is.custom = p.custom;
      for (const l of is.labels) if (!s.labels.includes(l)) s.labels.push(l);
    },
    [log, now, pname, statusName]
  );

  const addIssue = useCallback(
    (s: JiraState, input: JiraIssueInput, by: string, place?: { top?: boolean; after?: string }) => {
      const key = input.key ?? `${seed.project.key}-${s.nextKey++}`;
      if (s.issues[key]) throw new Error(`Jira: ${key} already exists`);
      const t = now();
      const assignee = input.assignee ?? null;
      const reporter = input.reporter ?? by;
      const is: JiraIssue = {
        key,
        type: input.type,
        summary: input.summary,
        status: input.status ?? statuses[0].id,
        assignee,
        reporter,
        priority: input.priority ?? "medium",
        points: input.points ?? null,
        labels: input.labels ?? [],
        sprint: input.type === "epic" ? null : (input.sprint ?? (input.parent ? (s.issues[input.parent]?.sprint ?? null) : null)),
        epic: input.type === "epic" ? null : (input.epic ?? null),
        parent: input.parent ?? null,
        flagged: !!input.flagged,
        fixVersions: input.fixVersions ?? [],
        description: input.description ?? "",
        comments: [],
        history: [{ by: reporter, field: "created", from: "", to: "", at: t }],
        worklog: [],
        links: input.links ?? [],
        watchers: input.watchers ?? [...new Set([reporter, ...(assignee ? [assignee] : [])])],
        created: t,
        updated: t,
        dev: input.dev ?? null,
        ...(input.type === "epic" ? { color: input.color ?? EPIC_COLORS[s.epics.length % 4] } : {}),
        ...(input.custom ? { custom: input.custom } : {}),
      };
      s.issues[key] = is;
      for (const l of is.labels) if (!s.labels.includes(l)) s.labels.push(l);
      if (is.type === "epic") s.epics.push(key);
      else if (is.type !== "subtask") {
        if (place?.top) s.order.unshift(key);
        else if (place?.after && s.order.includes(place.after)) s.order.splice(s.order.indexOf(place.after) + 1, 0, key);
        else s.order.push(key);
      }
      for (const sub of input.subtasks ?? []) addIssue(s, { ...sub, type: "subtask", parent: key }, by);
      return is;
    },
    [now, seed.project.key, statuses]
  );

  // ---------- What the world does ----------

  /** Someone files an issue (the signed-in person, unless `by` or `reporter` says otherwise). Resolves to its key. */
  const createIssue = useCallback(
    (input: JiraIssueInput, o: ByOptions & { top?: boolean } = {}) => {
      let key = "";
      update((s) => void (key = addIssue(s, input, o.by ?? input.reporter ?? me, { top: o.top }).key));
      return key;
    },
    [update, addIssue, me]
  );

  /** Someone changes an issue's fields. With `by`, each change shows in its history. */
  const updateIssue = useCallback(
    (key: string, patch: IssuePatch, o: ByOptions = {}) => void update((s) => applyPatch(s, need(s, key), patch, o.by)),
    [update, applyPatch, need]
  );

  /** Someone moves an issue to another status (a column on the board). */
  const transition = useCallback((key: string, status: string, o: ByOptions = {}) => updateIssue(key, { status }, o), [updateIssue]);

  /** Someone comments. A comment that @mentions the signed-in person, or lands on an issue they watch, also rings the bell. Returns its id. */
  const comment = useCallback(
    (key: string, from: string, text: string, o: { notify?: boolean } = {}) => {
      let id = "";
      update((s) => {
        const is = need(s, key);
        id = `c${++s.seq}`;
        is.comments.push({ id, from, at: now(), text, edited: false });
        is.updated = now();
        if (from === me || o.notify === false) return;
        const mentioned = text.includes(`@${people[me].name}`);
        if (mentioned || is.watchers.includes(me) || o.notify)
          s.notifications.unshift(notification({ from, verb: mentioned ? "mentioned you on" : "commented on", key, quote: text, tab: mentioned ? "direct" : "watching" }, `n${++s.seq}`, now()));
      });
      return id;
    },
    [update, need, now, me, people]
  );

  /** A notification lands in the bell. Returns its id. */
  const notify = useCallback(
    (n: JiraNotificationInput) => {
      let id = "";
      update((s) => {
        const made = notification(n, `n${++s.seq}`, now());
        id = made.id;
        s.notifications.unshift(made);
      });
      return id;
    },
    [update, now]
  );

  /** Show an issue (null closes it). */
  const open = useCallback(
    (key: string | null) =>
      void update((s) => {
        s.open = key && s.issues[key] ? key : null;
        if (s.open) s.recent = [s.open, ...s.recent.filter((k) => k !== s.open)].slice(0, 8);
        else if (s.fullPage) s.fullPage = false;
      }),
    [update]
  );

  /** Show a page: "board", "backlog", "list", or a page drawn by `renderPage`. */
  const show = useCallback(
    (view: JiraView) =>
      void update((s) => {
        s.view = view;
        if (s.fullPage) (s.fullPage = false), (s.open = null);
      }),
    [update]
  );

  // ---------- What the signed-in person does (wired by <Jira>) ----------

  const navigate = useCallback(
    (view: JiraView) => {
      update((s) => {
        s.view = view;
        s.open = null;
        s.fullPage = false;
      });
      emit({ type: "view", view });
    },
    [update, emit]
  );

  const openIssue = useCallback(
    (key: string) => {
      if (!ref.current.issues[key]) return;
      open(key);
      emit({ type: "open", key });
    },
    [open, emit]
  );

  const closeIssue = useCallback(() => {
    const key = ref.current.open;
    if (!key) return;
    update((s) => void ((s.open = null), (s.fullPage = false)));
    emit({ type: "close", key });
  }, [update, emit]);

  const setFullPage = useCallback((full: boolean) => void update((s) => void (s.fullPage = full && !!s.open)), [update]);

  const openSubtaskNote = (s: JiraState, is: JiraIssue) => {
    if (is.status !== doneStatus || is.type === "subtask" || is.type === "epic") return "";
    const n = childrenOf(s, is).filter((c) => c.status !== doneStatus).length;
    return n ? `${n} subtask${n > 1 ? "s are" : " is"} still open.` : "";
  };

  /** Moves an issue to a status; `quiet` skips the flag (drag and drop has its own). */
  const setStatus = useCallback(
    (key: string, to: string, quiet = false) => {
      const from = ref.current.issues[key]?.status;
      if (!from || from === to) return;
      const s = update((d) => applyPatch(d, need(d, key), { status: to }, me));
      emit({ type: "transition", key, from, to });
      if (!quiet) flag({ type: "success", title: `${key} moved to ${statusName(to)}`, body: openSubtaskNote(s, s.issues[key]) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update, applyPatch, need, me, emit, flag, statusName, doneStatus]
  );

  const assign = useCallback(
    (key: string, to: string | null, flagIt = false) => {
      const from = ref.current.issues[key]?.assignee ?? null;
      if (from === to) return;
      update((d) => applyPatch(d, need(d, key), { assignee: to }, me));
      emit({ type: "assign", key, from, to });
      if (flagIt && to === me) flag({ type: "success", title: `${key} assigned to you` });
    },
    [update, applyPatch, need, me, emit, flag]
  );

  /** Changes one field from the issue view's details (assignee goes through `assign`). */
  const setField = useCallback(
    (key: string, field: JiraField, to: unknown) => {
      if (field === "assignee") return assign(key, (to as string | null) ?? null);
      const is = ref.current.issues[key];
      if (!is) return;
      const from = (is as unknown as Record<string, unknown>)[field === "epic" ? "epic" : field];
      if (JSON.stringify(from) === JSON.stringify(to)) return;
      update((d) => applyPatch(d, need(d, key), { [field]: to } as IssuePatch, me));
      emit({ type: "edit", key, field, from, to });
    },
    [assign, update, applyPatch, need, me, emit]
  );

  const rank = useCallback(
    (key: string, before: string | null, after: string | null) => {
      update((s) => {
        s.order = s.order.filter((k) => k !== key);
        if (before && s.order.includes(before)) s.order.splice(s.order.indexOf(before), 0, key);
        else if (after && s.order.includes(after)) s.order.splice(s.order.indexOf(after) + 1, 0, key);
        else s.order.push(key);
      });
      emit({ type: "rank", key, before, after });
    },
    [update, emit]
  );

  /** A card or backlog row dropped on "status:<id>" or "sprint:<id|none>", maybe in a swimlane ("assignee:<id|none>", "epic:<key|none>"). */
  const drop = useCallback(
    (key: string, target: string, lane: string, before: string | null, after: string | null) => {
      const was = ref.current.issues[key];
      if (!was) return;
      const [kind, val] = [target.slice(0, target.indexOf(":")), target.slice(target.indexOf(":") + 1)];
      if (kind === "status") setStatus(key, val, true);
      if (kind === "sprint") setField(key, "sprint", val === "none" ? null : val);
      if (lane) {
        const [lk, lv] = lane.split(":");
        const v = lv === "none" ? null : lv;
        if (lk === "assignee") assign(key, v);
        if (lk === "epic") setField(key, "epic", v);
      }
      rank(key, before, after);
      const s = ref.current;
      const is = s.issues[key];
      const st = statuses.find((x) => x.id === is.status);
      if (kind === "status" && was.status !== is.status && st?.limit && inSprint(s, is.sprint ?? "").filter((i) => i.status === is.status && i.type !== "subtask").length > st.limit)
        flag({ type: "warning", title: `${st.name} is over its limit`, body: `The column limit is ${st.limit} issues.` });
      else if (kind === "status" && was.status !== is.status && openSubtaskNote(s, is)) flag({ type: "info", title: `${key} moved to ${statusName(is.status)}`, body: openSubtaskNote(s, is) });
      if (kind === "sprint" && (was.sprint ?? null) !== (is.sprint ?? null)) flag({ type: "success", title: `${key} moved to ${is.sprint ? sprintName(s, is.sprint) : "the backlog"}` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStatus, setField, assign, rank, statuses, flag, statusName]
  );

  /** The signed-in person files an issue (Create dialog, inline create, a child issue, a clone). */
  const create = useCallback(
    (input: JiraIssueInput, place: { top?: boolean; after?: string } = {}, flagIt: "full" | "short" | false = "full") => {
      let made: JiraIssue | null = null;
      update((s) => void (made = addIssue(s, { ...input, reporter: me }, me, place)));
      const is = made! as JiraIssue;
      emit({ type: "create", key: is.key, issue: is });
      if (flagIt === "full")
        flag({ type: "success", title: `You've created "${is.key}" issue.`, body: is.summary, actions: [{ label: "View issue", run: () => openIssue(is.key) }, { label: "Copy link", run: () => copyLink(is.key) }] });
      else if (flagIt === "short") flag({ type: "success", title: `${is.key} created`, body: is.summary, actions: [{ label: "View issue", run: () => openIssue(is.key) }] });
      return is.key;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update, addIssue, me, emit, flag, openIssue]
  );

  const url = useCallback((key: string) => `https://${seed.site}.atlassian.net/browse/${key}`, [seed.site]);
  const copyLink = useCallback(
    (key: string) => {
      try {
        void navigator.clipboard?.writeText(url(key)).catch(() => {});
      } catch {
        // The clipboard is a nicety.
      }
      flag({ type: "success", title: "Link copied to clipboard", body: url(key) });
      emit({ type: "action", kind: "copy-link", label: url(key), key });
    },
    [flag, emit, url]
  );

  const deleteIssue = useCallback(
    (key: string) => {
      const is = ref.current.issues[key];
      if (!is) return;
      update((s) => {
        for (const c of Object.values(s.issues)) if (c.parent === key) delete s.issues[c.key];
        if (is.type === "epic") {
          for (const c of Object.values(s.issues)) if (c.epic === key) c.epic = null;
          s.epics = s.epics.filter((k) => k !== key);
        }
        delete s.issues[key];
        s.order = s.order.filter((k) => k !== key);
        s.recent = s.recent.filter((k) => k !== key);
        for (const c of Object.values(s.issues)) c.links = c.links.filter((l) => l.key !== key);
        if (s.open === key) (s.open = null), (s.fullPage = false);
      });
      emit({ type: "delete", key });
      flag({ type: "success", title: `${key} has been deleted`, body: is.summary });
    },
    [update, emit, flag]
  );

  const addComment = useCallback(
    (key: string, text: string) => {
      let id = "";
      update((s) => {
        const is = need(s, key);
        id = `c${++s.seq}`;
        is.comments.push({ id, from: me, at: now(), text, edited: false });
        is.updated = now();
      });
      emit({ type: "comment", key, id, text, action: "add" });
    },
    [update, need, me, now, emit]
  );

  const editComment = useCallback(
    (key: string, id: string, text: string) => {
      update((s) => {
        const c = need(s, key).comments.find((x) => x.id === id);
        if (c && c.text !== text) (c.text = text), (c.edited = true);
      });
      emit({ type: "comment", key, id, text, action: "edit" });
    },
    [update, need, emit]
  );

  const deleteComment = useCallback(
    (key: string, id: string) => {
      const text = ref.current.issues[key]?.comments.find((c) => c.id === id)?.text ?? "";
      update((s) => void (need(s, key).comments = need(s, key).comments.filter((c) => c.id !== id)));
      emit({ type: "comment", key, id, text, action: "delete" });
      flag({ type: "success", title: "Comment deleted" });
    },
    [update, need, emit, flag]
  );

  const toggleFlag = useCallback(
    (key: string) => {
      const on = !ref.current.issues[key]?.flagged;
      setField(key, "flagged", on);
      flag({ type: on ? "warning" : "success", title: on ? `${key} has been flagged` : `Flag removed from ${key}`, body: on ? "Flagged issues show as impediments on the board." : "" });
    },
    [setField, flag]
  );

  const toggleWatch = useCallback(
    (key: string) => {
      const watching = !ref.current.issues[key]?.watchers.includes(me);
      update((s) => {
        const is = need(s, key);
        is.watchers = watching ? [...is.watchers, me] : is.watchers.filter((x) => x !== me);
      });
      emit({ type: "watch", key, watching });
      flag({ type: "success", title: watching ? `You're watching ${key}` : `You stopped watching ${key}`, body: watching ? "You'll get notified about updates to this issue." : "" });
    },
    [update, need, me, emit, flag]
  );

  const INVERSE: Record<string, string> = { blocks: "is blocked by", "is blocked by": "blocks", "relates to": "relates to", duplicates: "is duplicated by", "is duplicated by": "duplicates", "is caused by": "causes", causes: "is caused by" };
  const addLink = useCallback(
    (key: string, link: string, other: string) => {
      update((s) => {
        need(s, key).links.push({ type: link, key: other });
        s.issues[other]?.links.push({ type: INVERSE[link] ?? link, key });
        need(s, key).updated = now();
      });
      emit({ type: "link", key, other, link, added: true });
      flag({ type: "success", title: `${key} ${link} ${other}` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update, need, now, emit, flag]
  );

  const removeLink = useCallback(
    (key: string, other: string) => {
      const link = ref.current.issues[key]?.links.find((l) => l.key === other)?.type ?? "";
      update((s) => {
        need(s, key).links = need(s, key).links.filter((l) => l.key !== other);
        if (s.issues[other]) s.issues[other].links = s.issues[other].links.filter((l) => l.key !== key);
      });
      emit({ type: "link", key, other, link, added: false });
    },
    [update, need, emit]
  );

  const logWork = useCallback(
    (key: string, minutes = 30, text = "Review and follow-up") => {
      update((s) => {
        const is = need(s, key);
        is.worklog.push({ by: me, minutes, text, at: now() });
        is.updated = now();
      });
      emit({ type: "log", key, minutes });
      flag({ type: "success", title: `Logged ${minutes >= 60 ? `${Math.floor(minutes / 60)}h ` : ""}${minutes % 60 ? `${minutes % 60}m` : ""}`.trim() + ` on ${key}` });
    },
    [update, need, me, now, emit, flag]
  );

  const createBranch = useCallback(
    (key: string) => {
      const is = ref.current.issues[key];
      if (!is) return;
      const branch = `${key}-${is.summary.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)}`;
      update((s) => void (need(s, key).dev = { branch, commits: 0, lastCommit: now() }));
      emit({ type: "action", kind: "create-branch", label: branch, key });
      flag({ type: "success", title: "Branch created", body: branch });
    },
    [update, need, now, emit, flag]
  );

  // ---------- Sprints ----------

  const newSprint = (s: JiraState) => {
    const nums = s.sprints.map((x) => +(x.name.match(/(\d+)\s*$/)?.[1] ?? 0));
    const n = Math.max(0, ...nums) + 1;
    const last = s.sprints[s.sprints.length - 1];
    const base = last?.end ?? now();
    const sp: JiraSprint = { id: `sprint-${++s.seq}`, name: `${seed.project.key} Sprint ${n}`, start: base + 3 * DAY - 9 * 3_600_000, end: base + 17 * DAY, state: "future", goal: "" };
    s.sprints.push(sp);
    return sp;
  };

  const createSprint = useCallback(() => {
    let sp: JiraSprint | null = null;
    update((s) => void (sp = newSprint(s)));
    const made = sp! as JiraSprint;
    emit({ type: "sprint", action: "create", sprint: made.id });
    flag({ type: "success", title: `${made.name} created` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, emit, flag]);

  /** Starts a future sprint, or edits the active one. */
  const startSprint = useCallback(
    (id: string, fields: { name: string; start: number; end: number; goal: string }) => {
      const editing = ref.current.sprints.find((x) => x.id === id)?.state === "active";
      const s = update((d) => {
        const sp = d.sprints.find((x) => x.id === id);
        if (sp) Object.assign(sp, fields, { state: "active" });
      });
      emit({ type: "sprint", action: editing ? "edit" : "start", sprint: id });
      if (editing) flag({ type: "success", title: `${fields.name} updated` });
      else
        flag({
          type: "success",
          title: `${fields.name} started`,
          body: `${inSprint(s, id).filter((i) => i.type !== "subtask").length} issues, ends ${new Date(fields.end).getDate()} ${new Date(fields.end).toLocaleString("en-US", { month: "short" })}.`,
          actions: [{ label: "Go to board", run: () => navigate("board") }],
        });
    },
    [update, emit, flag, navigate]
  );

  /** Completes the active sprint: done issues leave the board, open ones move to `moveTo` (a sprint id, "new", or null for the backlog). */
  const completeSprint = useCallback(
    (moveTo: string | null) => {
      const active = activeSprint(ref.current);
      if (!active) return;
      let dest = moveTo;
      let done = 0;
      let moved = 0;
      const s = update((d) => {
        if (moveTo === "new") dest = newSprint(d).id;
        for (const i of Object.values(d.issues)) {
          if (i.sprint !== active.id) continue;
          if (i.status === doneStatus) {
            i.archived = true;
            i.doneSprint = active.id;
            i.sprint = null;
            if (i.type !== "subtask") done++;
          } else {
            i.sprint = dest;
            if (i.type !== "subtask") moved++;
          }
        }
        d.sprints.find((x) => x.id === active.id)!.state = "closed";
      });
      emit({ type: "sprint", action: "complete", sprint: active.id, moveTo: dest });
      flag({
        type: "success",
        title: `${active.name} completed`,
        body: `${done} issues done, ${moved} moved to ${dest ? sprintName(s, dest) : "the backlog"}.`,
        actions: [{ label: "View backlog", run: () => navigate("backlog") }],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update, emit, flag, navigate, doneStatus]
  );

  const deleteSprint = useCallback(
    (id: string) => {
      const sp = ref.current.sprints.find((x) => x.id === id);
      if (!sp) return;
      update((s) => {
        for (const i of Object.values(s.issues)) if (i.sprint === id) i.sprint = null;
        s.sprints = s.sprints.filter((x) => x.id !== id);
      });
      emit({ type: "sprint", action: "delete", sprint: id });
      flag({ type: "success", title: `${sp.name} deleted` });
    },
    [update, emit, flag]
  );

  // ---------- The bell, the theme, the star ----------

  const readNotification = useCallback((id: string | null) => void update((s) => s.notifications.forEach((n) => (id === null || n.id === id) && (n.read = true))), [update]);
  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);
  const toggleStar = useCallback(() => {
    const on = !ref.current.starred;
    update((s) => void (s.starred = on));
    toast(on ? `${seed.project.board ?? `${seed.project.key} board`} added to Starred` : `${seed.project.board ?? `${seed.project.key} board`} removed from Starred`);
  }, [update, toast, seed.project]);
  const addLabel = useCallback((label: string) => void update((s) => void (s.labels.includes(label) || s.labels.push(label))), [update]);

  const ui = useMemo(
    () => ({
      navigate, openIssue, closeIssue, setFullPage, setStatus, assign, setField, rank, drop, create, copyLink, deleteIssue,
      addComment, editComment, deleteComment, toggleFlag, toggleWatch, addLink, removeLink, logWork, createBranch,
      createSprint, startSprint, completeSprint, deleteSprint, readNotification, setTheme, toggleStar, addLabel, dismiss, flag, emit, url,
    }),
    [navigate, openIssue, closeIssue, setFullPage, setStatus, assign, setField, rank, drop, create, copyLink, deleteIssue, addComment, editComment, deleteComment, toggleFlag, toggleWatch, addLink, removeLink, logWork, createBranch, createSprint, startSprint, completeSprint, deleteSprint, readNotification, setTheme, toggleStar, addLabel, dismiss, flag, emit, url]
  );

  // Relative times ("5 minutes ago") and days left stay current.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  return {
    seed,
    people,
    me,
    statuses,
    /** Save this and pass it back as `restore`. */
    state,
    flags,
    now,
    pname,
    statusName,
    // The world
    createIssue,
    updateIssue,
    transition,
    comment,
    notify,
    toast,
    flag,
    open,
    show,
    // The signed-in person (wired by <Jira>)
    ui,
  };
}

export type JiraProject = ReturnType<typeof useJira>;
