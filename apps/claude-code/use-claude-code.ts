import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { langOf } from "./format";
import type {
  ClaudeCodeEvent,
  ClaudeCodeSeed,
  ClaudeCodeState,
  Env,
  Item,
  ItemInput,
  Model,
  Pane,
  PermissionAnswer,
  PermissionMode,
  PermissionRequest,
  PlanAnswer,
  SessionSeed,
  SessionState,
  SessionStatus,
} from "./types";

// The app behind <ClaudeCode>: its state, what the world does to it (Claude
// writes, calls a tool, asks for permission, proposes a plan, finishes) and
// what the signed-in person does (send, answer, stop, open a pane). Every
// change goes through `update`, which keeps a ref in step with React state,
// so calls made between renders (timers, awaited answers) see what the last
// one wrote. Every function it returns is stable across renders.

export interface ClaudeCodeOptions {
  /** A state saved from `claudeCode.state`, to pick up where it was left. */
  restore?: ClaudeCodeState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: ClaudeCodeEvent) => void;
  /** Toast when a session in the background needs input or finishes (default true). */
  notifications?: boolean;
}

export interface Person {
  id: string;
  name: string;
  initials: string;
  photo?: string;
}

export type ToastIcon = "check" | "hand" | "layers" | "archive" | "unarchive" | "trash" | "pr" | "ext" | "undo" | "comment" | "help" | "logout" | "zap" | "map";

export interface Toast {
  id: number;
  text: string;
  icon: ToastIcon;
  action?: { label: string; run: () => void };
  out: boolean;
}

export interface ToastOptions {
  icon?: ToastIcon;
  action?: { label: string; run: () => void };
  /** How long it stays, in ms. Default 3600. */
  ms?: number;
}

/** What the world may change on a session. */
export type SessionPatch = Partial<Pick<SessionState, "title" | "branch" | "model" | "mode" | "context" | "archived" | "env">>;

export const DEFAULT_MODELS: Model[] = [
  { id: "opus", name: "Opus 5.5", desc: "Most capable for complex, long-running work" },
  { id: "sonnet", name: "Sonnet 5", desc: "Fast and capable for everyday coding" },
  { id: "haiku", name: "Haiku 4.5", desc: "Fastest for quick edits and questions" },
];

export const MODES: { id: PermissionMode; name: string; short: string; desc: string }[] = [
  { id: "ask", name: "Ask before edits", short: "Ask before edits", desc: "Claude asks before editing files or running commands" },
  { id: "auto", name: "Auto-accept edits", short: "Auto-accept", desc: "Edits are applied without asking; commands still need approval" },
  { id: "plan", name: "Plan mode", short: "Plan mode", desc: "Claude researches and proposes a plan before changing anything" },
];

const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

const trimHunk = (lines: string) => lines.replace(/^\n/, "").replace(/\n$/, "");

/** The first word of the command, and the script for `npm run x`: what "Always allow" covers. */
export const commandKey = (command: string) => {
  const w = command.trim().split(/\s+/);
  return w.slice(0, w[1] === "run" ? 3 : 2).join(" ");
};

/** The unanswered permission prompt or plan, if Claude is waiting on one. */
export const pendingOf = (s: SessionState) =>
  [...s.items].reverse().find((i) => (i.type === "permission" || i.type === "plan") && !i.answer) as
    | Extract<Item, { type: "permission" | "plan" }>
    | undefined;

function normalizeItem(input: ItemInput, id: string): Item {
  const item = { ...input, id } as Item;
  if (item.type === "edit") item.hunks = item.hunks.map((h) => ({ ...h, lines: trimHunk(h.lines) }));
  if (item.type === "permission" && item.request.kind === "edit")
    item.request = { ...item.request, hunks: item.request.hunks.map((h) => ({ ...h, lines: trimHunk(h.lines) })) };
  return item;
}

/** Folds finished edits into the session's change set (the Diff pane). */
function applyEdits(s: SessionState) {
  for (const it of s.items) {
    if (it.type !== "edit" || it.running || s.applied.includes(it.id)) continue;
    s.applied.push(it.id);
    let ch = s.changes.find((c) => c.path === it.path);
    if (!ch) {
      ch = { path: it.path, lang: it.lang ?? langOf(it.path), status: it.hunks[0]?.oldStart === 0 ? "A" : it.deleted ? "D" : "M", hunks: [] };
      s.changes.push(ch);
    }
    ch.hunks = ch.hunks.concat(it.hunks);
    if (!s.diffFile) s.diffFile = it.path;
  }
}

function makeSession(seed: SessionSeed, id: string, models: Model[], nextId: () => string): SessionState {
  const s: SessionState = {
    id,
    title: seed.title,
    repo: seed.repo,
    branch: seed.branch,
    env: seed.env ?? "local",
    model: seed.model ?? models[0].id,
    mode: seed.mode ?? "ask",
    status: seed.status ?? "idle",
    archived: !!seed.archived,
    at: toTime(seed.at),
    context: seed.context ?? 0,
    items: (seed.items ?? []).map((it) => normalizeItem(it, it.id ?? nextId())),
    changes: [],
    applied: [],
    diffFile: null,
    comments: {},
    terminal: (seed.terminal ?? []).map((t) => ({ ...t })),
    run: seed.status === "running" ? { startedAt: Date.now(), verb: "Thinking", tokens: 0 } : null,
    queue: [],
    draft: "",
    attachments: [],
  };
  applyEdits(s);
  return s;
}

function initialState(seed: ClaudeCodeSeed, models: Model[]): ClaudeCodeState {
  let seq = 0;
  const nextId = () => `i${++seq}`;
  const sessions = seed.sessions.map((s, n) => makeSession(s, s.id ?? `s${n + 1}`, models, nextId));
  const repos = Object.keys(seed.repos);
  const repo = seed.defaults?.repo ?? repos[0] ?? "";
  return {
    version: 1,
    active: seed.open === undefined ? (sessions[0]?.id ?? null) : seed.open,
    sessions,
    panes: { diff: false, terminal: false, preview: false },
    paneWidth: 580,
    diffView: "unified",
    previewDevice: "desktop",
    sidebarCollapsed: false,
    showArchived: false,
    draft: {
      repo,
      branch: seed.repos[repo]?.branches?.[0] ?? "main",
      env: seed.defaults?.env ?? "local",
      model: seed.defaults?.model ?? models[0].id,
      mode: seed.defaults?.mode ?? "ask",
      text: "",
      attachments: [],
    },
    theme: seed.theme ?? "light",
    seq,
  };
}

function titleFrom(prompt: string) {
  const t = prompt.replace(/\s+/g, " ").trim().split(" ").slice(0, 7).join(" ").replace(/[.,:;!?]+$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function useClaudeCode(seed: ClaudeCodeSeed, options: ClaudeCodeOptions = {}) {
  const models = useMemo(() => (seed.models?.length ? seed.models : DEFAULT_MODELS), [seed.models]);
  const people = useMemo(() => {
    const out: Record<string, Person> = {};
    for (const [id, p] of Object.entries(seed.people ?? {}))
      out[id] = { id, name: p.name, photo: p.photo, initials: p.name.trim().charAt(0).toUpperCase() };
    return out;
  }, [seed.people]);
  const [state, setState] = useState<ClaudeCodeState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed, models)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  /** Who is awaiting an answer to a prompt, by item id. */
  const waiting = useRef(new Map<string, (answer: string) => void>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const update = useCallback((fn: (draft: ClaudeCodeState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: ClaudeCodeEvent) => opts.current.onEvent?.(event), []);

  const find = (s: ClaudeCodeState, sessionId: string) => {
    const found = s.sessions.find((x) => x.id === sessionId);
    if (!found) throw new Error(`ClaudeCode: there is no session "${sessionId}"`);
    return found;
  };

  // ---------- Toasts ----------

  const dismiss = useCallback(
    (id: number) => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, out: true } : t)));
      later(() => setToasts((list) => list.filter((t) => t.id !== id)), 220);
    },
    [later]
  );

  const toastSeq = useRef(0);
  /** A notice under the top of the app. */
  const toast = useCallback(
    (text: string, o: ToastOptions = {}) => {
      const id = ++toastSeq.current;
      const action = o.action ? { label: o.action.label, run: () => (o.action!.run(), dismiss(id)) } : undefined;
      setToasts((list) => [...list, { id, text, icon: o.icon ?? "check", action, out: false }].slice(-3));
      later(() => dismiss(id), o.ms ?? 3600);
    },
    [later, dismiss]
  );

  // ---------- What the signed-in person does to the screen ----------

  const open = useCallback(
    (sessionId: string | null) => {
      update((s) => void (s.active = sessionId));
      emit({ type: "open", sessionId });
    },
    [update, emit]
  );

  const notify = useCallback(
    (sessionId: string, status: SessionStatus) => {
      if (opts.current.notifications === false || ref.current.active === sessionId) return;
      const s = ref.current.sessions.find((x) => x.id === sessionId);
      if (!s) return;
      const go = { label: "Open", run: () => open(sessionId) };
      if (status === "input") toast(`"${s.title}" needs your input`, { icon: "hand", action: go });
      if (status === "done") toast(`"${s.title}" finished`, { action: go });
    },
    [toast, open]
  );

  const sendQueued = useCallback(
    (sessionId: string) =>
      later(() => {
        const s = ref.current.sessions.find((x) => x.id === sessionId);
        if (!s?.queue.length || s.status === "running" || s.status === "input") return;
        const text = s.queue[0];
        update((d) => {
          const x = find(d, sessionId);
          x.queue.shift();
          x.items.push({ type: "user", text, id: `i${++d.seq}` });
        });
        emit({ type: "prompt", sessionId, text, attachments: [], queued: true });
      }, 400),
    [later, update, emit]
  );

  // ---------- What the world does ----------

  /** Adds an entry to a session's transcript. Returns its id. */
  const append = useCallback(
    (sessionId: string, item: ItemInput) => {
      let id = "";
      update((d) => {
        const s = find(d, sessionId);
        id = item.id ?? `i${++d.seq}`;
        s.items.push(normalizeItem(item, id));
        applyEdits(s);
      });
      return id;
    },
    [update]
  );

  /** Changes an entry: new fields (`{ text, streaming: false }`), or a function that edits it in place. */
  const updateItem = useCallback(
    (id: string, patch: Partial<ItemInput> | ((item: Item) => void)) =>
      void update((d) => {
        for (const s of d.sessions) {
          const i = s.items.findIndex((x) => x.id === id);
          if (i < 0) continue;
          if (typeof patch === "function") patch(s.items[i]);
          else s.items[i] = normalizeItem({ ...s.items[i], ...patch } as ItemInput, id);
          applyEdits(s);
          return;
        }
      }),
    [update]
  );

  /** Sets a session running, waiting on input, done or idle. While running, `verb` ("Reading") and `tokens` feed the status line. */
  const setStatus = useCallback(
    (sessionId: string, status: SessionStatus, detail: { verb?: string; tokens?: number } = {}) => {
      const before = ref.current.sessions.find((x) => x.id === sessionId)?.status;
      update((d) => {
        const s = find(d, sessionId);
        if (status !== before && (status === "done" || status === "idle" || (status === "running" && before !== "input"))) s.at = Date.now();
        s.status = status;
        if (status === "running" || status === "input") {
          s.run ??= { startedAt: Date.now(), verb: "Thinking", tokens: 0 };
          if (detail.verb) s.run.verb = detail.verb;
          if (detail.tokens !== undefined) s.run.tokens = detail.tokens;
        } else s.run = null;
      });
      if (status !== before) notify(sessionId, status);
      if ((status === "done" || status === "idle") && before !== status) sendQueued(sessionId);
    },
    [update, notify, sendQueued]
  );

  const ask = useCallback(
    <A extends string>(sessionId: string, item: ItemInput): Promise<A> => {
      const id = append(sessionId, item);
      update((d) => {
        const s = find(d, sessionId);
        s.status = "input";
        s.run ??= { startedAt: Date.now(), verb: "Waiting", tokens: 0 };
      });
      notify(sessionId, "input");
      return new Promise<A>((resolve) => waiting.current.set(id, resolve as (a: string) => void));
    },
    [append, update, notify]
  );

  /** Claude asks before a command or an edit. Resolves with the person's answer ("cancel" if they stop the run). */
  const askPermission = useCallback(
    (sessionId: string, request: PermissionRequest) => ask<PermissionAnswer>(sessionId, { type: "permission", request }),
    [ask]
  );

  /** Claude proposes a plan. Resolves with "approve" (the session switches to Auto-accept edits), "keep" or "cancel". */
  const proposePlan = useCallback(
    (sessionId: string, text: string) => ask<PlanAnswer>(sessionId, { type: "plan", text }),
    [ask]
  );

  /** Changes a session's title, branch, model, mode, context use (0 to 100) or archived flag. */
  const updateSession = useCallback(
    (sessionId: string, patch: SessionPatch) => void update((d) => void Object.assign(find(d, sessionId), patch)),
    [update]
  );

  /** A line in the Terminal pane: a new command with its output, or (no `command`) more output for the last one. */
  const terminal = useCallback(
    (sessionId: string, entry: { command?: string; output?: string }) =>
      void update((d) => {
        const t = find(d, sessionId).terminal;
        if (entry.command !== undefined || !t.length) t.push({ command: entry.command ?? "", output: entry.output ?? "" });
        else t[t.length - 1].output = (t[t.length - 1].output ?? "") + (entry.output ?? "");
      }),
    [update]
  );

  /** Adds a file to the composer on screen (after an `attach` event). */
  const attach = useCallback(
    (name: string) =>
      void update((d) => {
        const s = d.active ? d.sessions.find((x) => x.id === d.active) : null;
        (s ? s.attachments : d.draft.attachments).push(name);
      }),
    [update]
  );

  /** A session appears in the sidebar (one started elsewhere). Returns its id. */
  const addSession = useCallback(
    (session: SessionSeed) => {
      let id = "";
      update((d) => {
        id = session.id ?? `s${++d.seq}`;
        d.sessions.push(makeSession(session, id, models, () => `i${++d.seq}`));
      });
      return id;
    },
    [update, models]
  );

  // ---------- What the signed-in person does (wired by <ClaudeCode>) ----------

  const answer = useCallback(
    (sessionId: string, id: string, value: PermissionAnswer | PlanAnswer) => {
      const s = ref.current.sessions.find((x) => x.id === sessionId);
      const it = s?.items.find((x) => x.id === id);
      if (!s || !it || (it.type !== "permission" && it.type !== "plan") || it.answer) return;
      const resolve = waiting.current.get(id);
      waiting.current.delete(id);
      update((d) => {
        const x = find(d, sessionId);
        const item = x.items.find((i) => i.id === id)!;
        (item as { answer?: string }).answer = value;
        if (item.type === "plan" && value === "approve") x.mode = "auto";
        if (value === "cancel") return;
        // A live run carries on; an answer to a prompt nobody awaits hands the turn to the world.
        if (resolve) x.status = "running";
        else if (x.status === "input" && !pendingOf(x)) x.status = "idle";
      });
      resolve?.(value);
      if (value !== "cancel")
        emit(it.type === "plan" ? { type: "plan", sessionId, id, answer: value as PlanAnswer } : { type: "permission", sessionId, id, answer: value as PermissionAnswer });
    },
    [update, emit]
  );

  const stop = useCallback(
    (sessionId: string) => {
      const s = ref.current.sessions.find((x) => x.id === sessionId);
      if (!s || (s.status !== "running" && s.status !== "input")) return;
      const started = s.run?.startedAt ?? Date.now();
      const cancelled: string[] = [];
      update((d) => {
        const x = find(d, sessionId);
        for (const it of x.items) {
          if (it.type === "thinking" && it.live) {
            it.live = false;
            it.seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
          }
          if (it.type === "text" && it.streaming) it.streaming = false;
          if (it.running) {
            it.running = false;
            if (it.type === "bash") it.exit = 130;
            else it.interrupted = true;
          }
          if ((it.type === "permission" || it.type === "plan") && !it.answer) {
            it.answer = "cancel";
            cancelled.push(it.id);
          }
        }
        applyEdits(x);
        x.items.push({ type: "note", text: "Interrupted · tell Claude what to do instead", icon: "hand", tone: "error", id: `i${++d.seq}` });
        x.run = null;
        x.status = "idle";
      });
      for (const id of cancelled) {
        waiting.current.get(id)?.("cancel");
        waiting.current.delete(id);
      }
      emit({ type: "stop", sessionId });
    },
    [update, emit]
  );

  const setDraft = useCallback(
    (text: string) =>
      void update((d) => {
        const s = d.active ? d.sessions.find((x) => x.id === d.active) : null;
        if (s) s.draft = text;
        else d.draft.text = text;
      }),
    [update]
  );

  /** Sends the composer's text in the session on screen. */
  const send = useCallback(() => {
    const cur = ref.current;
    const s = cur.sessions.find((x) => x.id === cur.active);
    const text = s?.draft.trim();
    if (!s || !text) return;
    const p = pendingOf(s);
    if (s.status === "running" || (p && waiting.current.has(p.id))) {
      update((d) => {
        const x = find(d, s.id);
        x.queue.push(text);
        x.draft = "";
      });
      toast(
        p && waiting.current.has(p.id) ? "Queued. Answer the prompt above and Claude will get to it next." : "Queued. Claude will pick it up when the current step finishes.",
        { icon: "layers" }
      );
      return;
    }
    // Replying instead of answering declines the prompt.
    if (p) answer(s.id, p.id, p.type === "plan" ? "keep" : "deny");
    const attachments = s.attachments.slice();
    update((d) => {
      const x = find(d, s.id);
      x.items.push({ type: "user", text, attachments, id: `i${++d.seq}` });
      x.draft = "";
      x.attachments = [];
    });
    emit({ type: "prompt", sessionId: s.id, text, attachments });
  }, [update, toast, answer, emit]);

  /** Starts a session from the new-session screen. */
  const start = useCallback(() => {
    const n = ref.current.draft;
    const text = n.text.trim();
    if (!text) return;
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").split("-").filter(Boolean).slice(0, 4).join("-");
    const who = n.env === "cloud" ? "claude" : seed.me.name.trim().split(/\s+/)[0].toLowerCase();
    const branch = n.branch === (seed.repos[n.repo]?.branches?.[0] ?? "main") ? `${who}/${slug}` : n.branch;
    let id = "";
    update((d) => {
      id = `s${++d.seq}`;
      const s = makeSession({ title: titleFrom(text), repo: n.repo, branch, env: n.env, model: n.model, mode: n.mode, context: 3 }, id, models, () => `i${++d.seq}`);
      s.items.push({ type: "user", text, attachments: n.attachments.slice(), id: `i${++d.seq}` });
      d.sessions.unshift(s);
      d.active = id;
      d.draft.text = "";
      d.draft.attachments = [];
    });
    emit({ type: "newSession", sessionId: id, repo: n.repo, branch, env: n.env, model: n.model, mode: n.mode });
    emit({ type: "prompt", sessionId: id, text, attachments: n.attachments.slice() });
  }, [update, emit, models, seed.me.name, seed.repos]);

  const setModel = useCallback(
    (model: string) => {
      const sessionId = ref.current.active;
      update((d) => {
        const s = sessionId ? find(d, sessionId) : null;
        if (s) s.model = model;
        else d.draft.model = model;
      });
      emit({ type: "model", sessionId, model });
    },
    [update, emit]
  );

  const setMode = useCallback(
    (mode: PermissionMode) => {
      const sessionId = ref.current.active;
      update((d) => {
        const s = sessionId ? find(d, sessionId) : null;
        if (s) s.mode = mode;
        else d.draft.mode = mode;
      });
      emit({ type: "mode", sessionId, mode });
      const m = MODES.find((x) => x.id === mode)!;
      toast(`Permission mode: ${m.name}`, { icon: mode === "ask" ? "hand" : mode === "auto" ? "zap" : "map", ms: 2000 });
    },
    [update, emit, toast]
  );

  const setChoice = useCallback(
    (patch: Partial<{ repo: string; branch: string; env: Env; text: string }>) =>
      void update((d) => {
        if (patch.repo && patch.repo !== d.draft.repo) d.draft.branch = seed.repos[patch.repo]?.branches?.[0] ?? "main";
        Object.assign(d.draft, patch);
      }),
    [update, seed.repos]
  );

  const togglePane = useCallback(
    (pane: Pane, force?: boolean, narrow = false) => {
      const on = force ?? !ref.current.panes[pane];
      update((d) => {
        if (narrow && on) (Object.keys(d.panes) as Pane[]).forEach((k) => (d.panes[k] = false));
        d.panes[pane] = on;
      });
      emit({ type: "pane", pane, open: on });
    },
    [update, emit]
  );

  const closePanes = useCallback(() => {
    const open = (Object.keys(ref.current.panes) as Pane[]).filter((k) => ref.current.panes[k]);
    update((d) => open.forEach((k) => (d.panes[k] = false)));
    open.forEach((pane) => emit({ type: "pane", pane, open: false }));
  }, [update, emit]);

  const rename = useCallback(
    (sessionId: string, title: string) => {
      const t = title.trim();
      if (!t) return;
      update((d) => void (find(d, sessionId).title = t));
      emit({ type: "rename", sessionId, title: t });
    },
    [update, emit]
  );

  const archive = useCallback(
    (sessionId: string, archived: boolean) => {
      const s = ref.current.sessions.find((x) => x.id === sessionId);
      if (!s) return;
      if (archived && (s.status === "running" || s.status === "input")) stop(sessionId);
      update((d) => void (find(d, sessionId).archived = archived));
      emit({ type: "archive", sessionId, archived });
      if (archived) toast(`Archived "${s.title}"`, { icon: "archive", action: { label: "Undo", run: () => archiveRef.current(sessionId, false) } });
      else toast(`Restored "${s.title}"`, { icon: "unarchive" });
    },
    [update, emit, toast, stop]
  );
  const archiveRef = useRef(archive);
  archiveRef.current = archive;

  const remove = useCallback(
    (sessionId: string) => {
      const s = ref.current.sessions.find((x) => x.id === sessionId);
      if (!s) return;
      if (s.status === "running" || s.status === "input") stop(sessionId);
      update((d) => {
        d.sessions = d.sessions.filter((x) => x.id !== sessionId);
        if (d.active === sessionId) d.active = null;
      });
      emit({ type: "delete", sessionId });
      toast(`Deleted "${s.title}"`, { icon: "trash" });
    },
    [update, emit, toast, stop]
  );

  const runInTerminal = useCallback(
    (sessionId: string, command: string) => {
      const c = command.trim();
      if (c === "clear") return void update((d) => void (find(d, sessionId).terminal = []));
      update((d) => void find(d, sessionId).terminal.push({ command: c, output: "" }));
      if (c) emit({ type: "terminal", sessionId, command: c });
    },
    [update, emit]
  );

  const revert = useCallback(
    (sessionId: string, path: string) => {
      const s = ref.current.sessions.find((x) => x.id === sessionId);
      const idx = s?.changes.findIndex((c) => c.path === path) ?? -1;
      if (!s || idx < 0) return;
      const change = s.changes[idx];
      update((d) => {
        const x = find(d, sessionId);
        x.changes.splice(idx, 1);
        x.diffFile = x.changes[0]?.path ?? null;
        x.items.push({ type: "note", text: `Reverted \`${path}\``, icon: "undo", id: `i${++d.seq}` });
      });
      emit({ type: "revert", sessionId, path });
      toast(`Reverted ${path.split("/").pop()}`, {
        icon: "undo",
        action: {
          label: "Undo",
          run: () =>
            update((d) => {
              const x = find(d, sessionId);
              x.changes.splice(idx, 0, change);
              x.diffFile = path;
            }),
        },
      });
    },
    [update, emit, toast]
  );

  const comment = useCallback(
    (sessionId: string, path: string, key: string, line: number, text: string) => {
      const name = path.split("/").pop();
      update((d) => {
        const x = find(d, sessionId);
        ((x.comments[path] ??= {})[key] ??= []).push(text);
        if (!x.draft.includes(`@${name}`)) x.draft = (x.draft ? x.draft + "\n" : "") + `Re @${name} line ${line}: ${text}`;
      });
      emit({ type: "comment", sessionId, path, line, text });
      toast("Comment added. It's in your next message to Claude.", { icon: "comment" });
    },
    [update, emit, toast]
  );

  const createPr = useCallback(
    (sessionId: string, pr: { title: string; base: string; description: string; reviewers: string[]; draft: boolean }) => {
      const s = ref.current.sessions.find((x) => x.id === sessionId);
      if (!s) return;
      const numbers = ref.current.sessions.flatMap((x) => x.items.flatMap((i) => (i.type === "pr" ? [i.number] : [])));
      const number = (numbers.length ? Math.max(...numbers) : 0) + 1;
      const id = append(sessionId, { type: "pr", number, title: pr.title, base: pr.base, head: s.branch, reviewers: pr.reviewers, draft: pr.draft, checks: [] });
      emit({ type: "createPr", sessionId, id, number, head: s.branch, ...pr });
      toast(`Pull request #${number} created on ${s.repo}`, { icon: "pr", action: { label: "View", run: () => emit({ type: "action", label: "View PR", sessionId }) } });
    },
    [append, emit, toast]
  );

  const edit = useCallback((fn: (draft: ClaudeCodeState) => void) => void update(fn), [update]);

  /** The state as the last change left it, even before React re-renders: for code reacting to an event. */
  const snapshot = useCallback((): ClaudeCodeState => ref.current, []);

  const api = useMemo(
    () => ({
      answer,
      stop,
      send,
      start,
      setDraft,
      setModel,
      setMode,
      setChoice,
      togglePane,
      closePanes,
      rename,
      archive,
      remove,
      runInTerminal,
      revert,
      comment,
      createPr,
      /** Screen-only changes (collapsed sidebar, diff layout, open tool cards): no event. */
      edit,
      emit,
    }),
    [answer, stop, send, start, setDraft, setModel, setMode, setChoice, togglePane, closePanes, rename, archive, remove, runInTerminal, revert, comment, createPr, edit, emit]
  );

  return {
    seed,
    models,
    people,
    /** Save this and pass it back as `restore`. */
    state,
    toasts,
    dismiss,
    /** The session on screen, or null on the new-session screen. */
    current: state.sessions.find((s) => s.id === state.active) ?? null,
    // The world
    snapshot,
    append,
    updateItem,
    askPermission,
    proposePlan,
    setStatus,
    updateSession,
    terminal,
    attach,
    addSession,
    open,
    toast,
    // The signed-in person (wired by <ClaudeCode>)
    ui: api,
  };
}

export type ClaudeCodeApp = ReturnType<typeof useClaudeCode>;
