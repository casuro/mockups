import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cap, initialsOf } from "./format";
import type {
  TicketField,
  TicketStatus,
  ZendeskEvent,
  ZendeskMessage,
  ZendeskMessageInput,
  ZendeskSeed,
  ZendeskState,
  ZendeskTicket,
  ZendeskTicketInput,
  ZendeskView,
  ZendeskViewFilter,
} from "./types";

// The help desk behind <Zendesk>: its state, what the world does to it
// (a ticket arrives, a customer replies, a ticket changes) and what the
// signed-in agent does (open, reply, change fields, apply a macro). Every
// change goes through `update`, which keeps a ref in step with React state,
// so calls made between renders (timers, awaited replies) see what the last
// one wrote. Every function it returns is stable across renders.

/** An agent or a requester, as the parts draw them. */
export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: string;
  email?: string;
  agent: boolean;
}

export interface ZendeskOptions {
  /** A state saved from `zendesk.state`, to pick up where it was left. */
  restore?: ZendeskState | null;
  /** Everything the signed-in agent does. */
  onEvent?: (event: ZendeskEvent) => void;
}

export interface MessageOptions {
  /** Wait this many ms before it lands. */
  delay?: number;
  /** Toast it when the agent is looking elsewhere. Default: true for a customer's message. */
  notify?: boolean;
}

/** What `updateTicket` can change. */
export type TicketPatch = Partial<Pick<ZendeskTicket, "subject" | "status" | "priority" | "type" | "assignee" | "tags" | "followers">>;

const UNSOLVED: TicketStatus[] = ["new", "open", "pending"];
export const DEFAULT_VIEWS: ZendeskView[] = [
  { id: "mine", name: "Your unsolved tickets", filter: { assignee: "me", status: UNSOLVED } },
  { id: "unassigned", name: "Unassigned tickets", filter: { assignee: "none", status: UNSOLVED } },
  { id: "all", name: "All unsolved", filter: { status: UNSOLVED } },
  { id: "recent", name: "Recently updated", filter: { updatedWithin: 24 } },
  { id: "pending", name: "Pending", filter: { status: ["pending"] } },
  { id: "solved", name: "Solved", filter: { status: ["solved"] } },
];

const PALETTE = ["#5c6970", "#b35e1a", "#7a4dab", "#2a8a78", "#c2436b", "#1f73b7", "#8a6b00", "#3b6ea5"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const toTime = (at: number | string | undefined, fallback = Date.now()) =>
  typeof at === "number" ? at : at ? Date.parse(at) || fallback : fallback;
const FIELD_LABEL: Record<TicketField, string> = { assignee: "Assignee", type: "Type", priority: "Priority", status: "Status" };

export function matches(t: ZendeskTicket, f: ZendeskViewFilter, me: string) {
  if (f.assignee === "me" && t.assignee !== me) return false;
  if (f.assignee === "none" && t.assignee) return false;
  if (f.assignee && f.assignee !== "me" && f.assignee !== "none" && t.assignee !== f.assignee) return false;
  if (f.status && !f.status.includes(t.status)) return false;
  if (f.updatedWithin != null && Date.now() - t.updatedAt > f.updatedWithin * 3_600_000) return false;
  return true;
}

function normalizePeople(seed: ZendeskSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.requesters))
    out[id] = { id, name: p.name, initials: initialsOf(p.name), color: p.color ?? colorFor(id), photo: p.photo, email: p.email, agent: false };
  for (const [id, a] of Object.entries(seed.agents))
    out[id] = { id, name: a.name, initials: initialsOf(a.name), color: a.color ?? colorFor(id), photo: a.photo, email: a.email, agent: true };
  if (!seed.agents[seed.me]) throw new Error(`Zendesk: seed.me "${seed.me}" is not one of seed.agents`);
  return out;
}

function makeMessage(m: ZendeskMessageInput, channel: ZendeskTicket["channel"], id: string): ZendeskMessage {
  return { ...m, id: m.id ?? id, at: toTime(m.at), channel: m.channel ?? channel, note: !!m.note, text: m.text ?? "" };
}

function makeTicket(t: ZendeskTicketInput, id: number, nextId: () => string): ZendeskTicket {
  const channel = t.channel ?? "email";
  const messages = (t.messages ?? []).map((m) => makeMessage(m, channel, nextId())).sort((a, b) => a.at - b.at);
  const requestedAt = toTime(t.requestedAt, messages[0]?.at ?? Date.now());
  return {
    id,
    subject: t.subject,
    requester: t.requester,
    status: t.status ?? "new",
    priority: t.priority ?? "normal",
    type: t.type ?? "question",
    assignee: t.assignee ?? null,
    tags: [...(t.tags ?? [])],
    followers: [...(t.followers ?? [])],
    channel,
    requestedAt,
    updatedAt: toTime(t.updatedAt, messages[messages.length - 1]?.at ?? requestedAt),
    messages,
  };
}

const nextTicketId = (tickets: { id?: number }[]) => tickets.reduce((n, t) => Math.max(n, t.id ?? 0), 0) + 1;

function initialState(seed: ZendeskSeed, views: ZendeskView[]): ZendeskState {
  let seq = 0;
  const tickets: ZendeskTicket[] = [];
  for (const t of seed.tickets) tickets.push(makeTicket(t, t.id ?? nextTicketId([...seed.tickets, ...tickets]), () => `s${++seq}`));
  const tabs = (seed.tabs ?? []).filter((id) => tickets.some((t) => t.id === id));
  const open = seed.open != null && tickets.some((t) => t.id === seed.open) ? seed.open : null;
  if (open != null && !tabs.includes(open)) tabs.push(open);
  return { version: 1, tickets, tabs, active: open, view: seed.view ?? views[0]?.id ?? "", drafts: {}, theme: seed.theme ?? "light", seq };
}

export function useZendesk(seed: ZendeskSeed, options: ZendeskOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const views = seed.views ?? DEFAULT_VIEWS;
  const macros = useMemo(() => seed.macros ?? [], [seed.macros]);
  const me = seed.me;
  const [state, setState] = useState<ZendeskState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed, views)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const update = useCallback((fn: (draft: ZendeskState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: ZendeskEvent) => opts.current.onEvent?.(event), []);
  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);
  const later = useCallback((ms: number | undefined, fn: () => void) => {
    if (!ms || ms <= 0) return fn();
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  /** The ticket, in a draft of the state; throws when there is none. */
  const need = (s: ZendeskState, id: number) => {
    const t = s.tickets.find((x) => x.id === id);
    if (!t) throw new Error(`Zendesk: there is no ticket #${id}`);
    return t;
  };

  // ---------- What the world does ----------

  /** A ticket arrives. Resolves with its number. */
  const createTicket = useCallback(
    (input: ZendeskTicketInput, o: { open?: boolean } = {}) => {
      let id = 0;
      update((s) => {
        id = input.id ?? nextTicketId(s.tickets);
        if (s.tickets.some((t) => t.id === id)) throw new Error(`Zendesk: ticket #${id} already exists`);
        s.tickets.unshift(makeTicket(input, id, () => `m${++s.seq}`));
        if (o.open) {
          if (!s.tabs.includes(id)) s.tabs.push(id);
          s.active = id;
        }
      });
      return id;
    },
    [update]
  );

  /**
   * A message lands on a ticket: from its requester, another agent, or a
   * note. A customer's reply reopens a pending or solved ticket. Resolves
   * with the message id once it is on screen.
   */
  const addMessage = useCallback(
    (ticket: number, message: ZendeskMessageInput, o: MessageOptions = {}): Promise<string> =>
      new Promise((resolve) =>
        later(o.delay, () => {
          let id = "";
          const s = update((d) => {
            const t = need(d, ticket);
            const m = makeMessage(message, t.channel, `m${++d.seq}`);
            id = m.id;
            t.messages.push(m);
            t.updatedAt = Date.now();
            if (!people[message.from]?.agent && (t.status === "pending" || t.status === "solved")) t.status = "open";
          });
          const customer = !people[message.from]?.agent;
          if (s.active !== ticket && (o.notify ?? customer))
            toast(`${people[message.from]?.name ?? message.from} ${message.note ? "added a note" : "replied"} on #${ticket}`);
          resolve(id);
        })
      ),
    [update, later, people, toast]
  );

  /** The ticket's requester replies, after `delay` ms. */
  const customerReply = useCallback(
    (ticket: number, text: string, o: MessageOptions & { attachment?: string; channel?: ZendeskMessage["channel"] } = {}) => {
      const t = ref.current.tickets.find((x) => x.id === ticket);
      if (!t) throw new Error(`Zendesk: there is no ticket #${ticket}`);
      const { attachment, channel, ...rest } = o;
      return addMessage(ticket, { from: t.requester, text, attachment, channel }, rest);
    },
    [addMessage]
  );

  /** Change a ticket's fields from outside (another agent, a trigger, an automation). */
  const updateTicket = useCallback(
    (id: number, patch: TicketPatch) =>
      void update((s) => {
        Object.assign(need(s, id), structuredClone(patch), { updatedAt: Date.now() });
      }),
    [update]
  );

  /** Show a ticket in a tab (opening the tab if needed), or null for the view's list. */
  const open = useCallback(
    (id: number | null) =>
      void update((s) => {
        if (id != null) {
          need(s, id);
          if (!s.tabs.includes(id)) s.tabs.push(id);
        }
        s.active = id;
      }),
    [update]
  );

  /** List a view's tickets. */
  const showView = useCallback(
    (id: string) =>
      void update((s) => {
        s.view = id;
        s.active = null;
      }),
    [update]
  );

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  // ---------- What the signed-in agent does (wired by <Zendesk>) ----------

  const openTicket = useCallback(
    (id: number) => {
      open(id);
      emit({ type: "open", ticket: id });
    },
    [open, emit]
  );

  const pickView = useCallback(
    (id: string) => {
      showView(id);
      emit({ type: "view", view: id });
    },
    [showView, emit]
  );

  const closeTab = useCallback(
    (id: number) => {
      update((s) => {
        const i = s.tabs.indexOf(id);
        if (i < 0) return;
        s.tabs.splice(i, 1);
        if (s.active === id) s.active = s.tabs[Math.min(i, s.tabs.length - 1)] ?? null;
      });
      emit({ type: "close", ticket: id });
    },
    [update, emit]
  );

  const setDraft = useCallback((id: number, text: string) => void update((s) => void (s.drafts[id] = text)), [update]);

  /** Submit the composer's text (if any) as a reply or note, and set the status. */
  const submit = useCallback(
    (status: TicketStatus, note: boolean) => {
      const id = ref.current.active;
      if (id == null) return;
      const text = (ref.current.drafts[id] ?? "").trim();
      let messageId: string | undefined;
      update((s) => {
        const t = need(s, id);
        if (text) {
          const m = makeMessage({ from: me, text, note, channel: "web" }, t.channel, `m${++s.seq}`);
          messageId = m.id;
          t.messages.push(m);
          if (!t.assignee) t.assignee = me;
        }
        t.status = status;
        t.updatedAt = Date.now();
        s.drafts[id] = "";
      });
      toast(text ? `Ticket #${id} updated and submitted as ${cap(status)}` : `Ticket #${id} status set to ${cap(status)}`);
      emit({ type: "submit", ticket: id, status, note, text, ...(messageId ? { id: messageId } : {}) });
    },
    [update, me, toast, emit]
  );

  const applyMacro = useCallback(
    (index: number) => {
      const id = ref.current.active;
      const m = macros[index];
      if (id == null || !m) return;
      setDraft(id, m.text);
      toast(`Macro applied: ${m.name}`);
      emit({ type: "macro", ticket: id, macro: m.name });
    },
    [macros, setDraft, toast, emit]
  );

  const changeField = useCallback(
    (field: TicketField, value: string | null) => {
      const id = ref.current.active;
      if (id == null) return;
      update((s) => {
        const t = need(s, id);
        if (field === "assignee") t.assignee = value || null;
        else if (field === "status" && value) t.status = value as ZendeskTicket["status"];
        else if (field === "priority" && value) t.priority = value as ZendeskTicket["priority"];
        else if (field === "type" && value) t.type = value as ZendeskTicket["type"];
      });
      toast(`${FIELD_LABEL[field]} updated`);
      emit({ type: "change", ticket: id, field, value });
    },
    [update, toast, emit]
  );

  const setTag = useCallback(
    (tag: string, added: boolean) => {
      const id = ref.current.active;
      const clean = tag.trim().toLowerCase().replace(/\s+/g, "_");
      if (id == null || !clean) return;
      const t = ref.current.tickets.find((x) => x.id === id);
      if (!t || t.tags.includes(clean) === added) return;
      update((s) => {
        const d = need(s, id);
        d.tags = added ? [...d.tags, clean] : d.tags.filter((g) => g !== clean);
      });
      emit({ type: "tag", ticket: id, tag: clean, added });
    },
    [update, emit]
  );

  const toggleFollow = useCallback(() => {
    const id = ref.current.active;
    if (id == null) return;
    let following = false;
    update((s) => {
      const t = need(s, id);
      following = !t.followers.includes(me);
      t.followers = following ? [...t.followers, me] : t.followers.filter((f) => f !== me);
    });
    emit({ type: "follow", ticket: id, following });
  }, [update, me, emit]);

  const action = useCallback((label: string) => emit({ type: "action", label }), [emit]);

  return {
    seed,
    people,
    me,
    views,
    macros,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    /** The ticket on screen, or null on a view's list. */
    active: state.active == null ? null : (state.tickets.find((t) => t.id === state.active) ?? null),
    // The world
    createTicket,
    addMessage,
    customerReply,
    updateTicket,
    open,
    showView,
    toast,
    setTheme,
    // The signed-in agent (wired by <Zendesk>)
    ui: { openTicket, pickView, closeTab, setDraft, submit, applyMacro, changeField, setTag, toggleFollow, action, emit },
  };
}

export type ZendeskWorkspace = ReturnType<typeof useZendesk>;
