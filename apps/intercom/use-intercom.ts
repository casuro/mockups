import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  IntercomConversationSeed,
  IntercomConversationState,
  IntercomCustomer,
  IntercomEvent,
  IntercomMessage,
  IntercomMessageInput,
  IntercomSeed,
  IntercomState,
  IntercomSuggestion,
} from "./types";

// The inbox behind <Intercom>: its state, what the world does to it (a
// customer writes, a conversation arrives, Copilot suggests an answer, a
// teammate takes a conversation) and what the signed-in teammate does
// (open, reply, note, assign, snooze, close). Every change goes through
// `update`, which keeps a ref in step with React state, so calls made
// between renders (timers, awaited replies) see what the last one wrote.
// Every function it returns is stable across renders.

/** A teammate or a customer, ready to draw. */
export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: string;
  email?: string;
}

export interface IntercomOptions {
  /** A state saved from `intercom.state`, to pick up where it was left. */
  restore?: IntercomState | null;
  /** Everything the signed-in teammate does. */
  onEvent?: (event: IntercomEvent) => void;
}

export interface DeliverOptions {
  /** Show the customer typing for this many ms first (customer messages, in the open conversation). */
  typing?: number;
  /** Toast it when another conversation is on screen. Default: customer messages. */
  notify?: boolean;
}

/** What `updateConversation` can change. */
export type ConversationPatch = Partial<
  Pick<IntercomConversationState, "subject" | "priority" | "sla" | "slaBreached" | "team" | "tags" | "status" | "unread" | "channel">
>;

const PALETTE = ["#0f766e", "#7c3aed", "#c2410c", "#0369a1", "#be185d", "#4d7c0f", "#b45309", "#4338ca"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

const newMessage = (draft: IntercomState, input: IntercomMessageInput): IntercomMessage => ({
  ...input,
  id: input.id ?? `m${++draft.seq}`,
  at: toTime(input.at),
});

function person(id: string, p: { name: string; photo?: string; initials?: string; color?: string; email?: string }): Person {
  return { id, name: p.name, photo: p.photo, email: p.email, initials: p.initials ?? initialsOf(p.name), color: p.color ?? colorFor(id) };
}

function conversationState(c: IntercomConversationSeed, me: string, make: (m: IntercomMessageInput) => IntercomMessage): IntercomConversationState {
  return {
    id: c.id,
    customer: c.customer,
    subject: c.subject,
    channel: c.channel ?? "chat",
    unread: !!c.unread,
    priority: !!c.priority,
    sla: c.sla ?? null,
    slaBreached: !!c.slaBreached,
    assignee: c.assignee ?? me,
    team: c.team ?? null,
    tags: c.tags ?? [],
    status: c.status ?? "open",
    messages: (c.messages ?? []).map(make).sort((a, b) => a.at - b.at),
    copilot: c.copilot ?? null,
  };
}

function initialState(seed: IntercomSeed): IntercomState {
  let seq = 0;
  const make = (m: IntercomMessageInput): IntercomMessage => ({ ...m, id: m.id ?? `s${++seq}`, at: toTime(m.at) });
  const conversations: IntercomState["conversations"] = {};
  for (const c of seed.conversations) conversations[c.id] = conversationState(c, seed.me, make);
  const current = seed.open ?? seed.conversations[0]?.id ?? "";
  // Opening on an unread conversation reads it.
  if (conversations[current]) conversations[current].unread = false;
  return {
    version: 1,
    current,
    view: seed.view ?? seed.inboxes[0]?.id ?? "",
    status: "Open",
    sort: "Newest",
    away: false,
    mode: "reply",
    tab: "details",
    order: seed.conversations.map((c) => c.id),
    conversations,
    customers: {},
    seq,
  };
}

export function useIntercom(seed: IntercomSeed, options: IntercomOptions = {}) {
  const me = seed.me;
  const teammates = useMemo(() => {
    const out: Record<string, Person> = {};
    for (const [id, t] of Object.entries(seed.teammates)) out[id] = person(id, t);
    if (!out[me]) throw new Error(`Intercom: seed.me "${me}" is not one of seed.teammates`);
    return out;
  }, [seed, me]);
  const [state, setState] = useState<IntercomState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [typing, setTypingState] = useState<string | null>(null);
  const typingRef = useRef(typing);
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const customers = useMemo(() => {
    const out: Record<string, Person & IntercomCustomer> = {};
    for (const [id, c] of Object.entries({ ...seed.customers, ...state.customers })) out[id] = { ...c, ...person(id, c) };
    return out;
  }, [seed.customers, state.customers]);
  const customersRef = useRef(customers);
  customersRef.current = customers;

  const update = useCallback((fn: (draft: IntercomState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: IntercomEvent) => opts.current.onEvent?.(event), []);
  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);
  const setTyping = useCallback((value: string | null) => {
    typingRef.current = value;
    setTypingState(value);
  }, []);

  /** The conversation's id, or an error when there is none. */
  const need = useCallback((id: string) => {
    if (!ref.current.conversations[id]) throw new Error(`Intercom: there is no conversation "${id}"`);
    return id;
  }, []);

  const nameOf = useCallback((customerId: string) => customersRef.current[customerId]?.name ?? customerId, []);

  // ---------- What the world does ----------

  /** A message lands in a conversation: the customer, Fin, a teammate's reply or note, or an event line. Resolves with its id. */
  const deliver = useCallback(
    (conversation: string, message: IntercomMessageInput, options: DeliverOptions = {}): Promise<string> => {
      const id = need(conversation);
      const land = () => {
        if (typingRef.current === id) setTyping(null);
        let mid = "";
        let notify = false;
        update((s) => {
          const c = s.conversations[id];
          const m = newMessage(s, message);
          mid = m.id;
          c.messages.push(m);
          if (message.kind === "customer") c.status = "open";
          if (message.kind !== "event") s.order = [id, ...s.order.filter((x) => x !== id)];
          if (s.current !== id && message.kind !== "event") {
            c.unread = true;
            notify = options.notify ?? message.kind === "customer";
          }
        });
        if (notify) {
          const c = ref.current.conversations[id];
          toast(`${nameOf(c.customer)}: ${message.text.replace(/\s+/g, " ").slice(0, 80)}`);
        }
        return mid;
      };
      if (options.typing && options.typing > 0) {
        setTyping(id);
        return new Promise((resolve) => {
          const t = setTimeout(() => {
            timers.current.delete(t);
            resolve(land());
          }, options.typing);
          timers.current.add(t);
        });
      }
      return Promise.resolve(land());
    },
    [need, update, toast, setTyping, nameOf]
  );

  /** The customer writes in a conversation. With `typing`, they are seen typing first. */
  const customerMessage = useCallback(
    (conversation: string, text: string, options: DeliverOptions = {}) => deliver(conversation, { kind: "customer", text }, options),
    [deliver]
  );

  /** The customer starts (a conversation id) or stops (null) typing: use it while a message is being written. */
  const typingIn = useCallback((conversation: string | null) => setTyping(conversation ? need(conversation) : null), [need, setTyping]);

  /** A conversation arrives at the top of the list. Pass `customer` when they are not in the seed's customers. */
  const newConversation = useCallback(
    (conversation: IntercomConversationSeed, customer?: IntercomCustomer, options: { notify?: boolean } = {}) => {
      if (ref.current.conversations[conversation.id]) throw new Error(`Intercom: conversation "${conversation.id}" already exists`);
      update((s) => {
        if (customer) s.customers[conversation.customer] = customer;
        const c = conversationState({ unread: true, ...conversation }, me, (m) => newMessage(s, m));
        s.conversations[c.id] = c;
        s.order = [c.id, ...s.order];
        if (!s.current) s.current = c.id;
      });
      if (options.notify !== false) toast(`New conversation from ${customer?.name ?? nameOf(conversation.customer)}`);
    },
    [update, me, toast, nameOf]
  );

  /** Copilot's suggested answer for a conversation (a string is just the answer). */
  const suggest = useCallback(
    (conversation: string, suggestion: IntercomSuggestion | string) => {
      const id = need(conversation);
      update((s) => void (s.conversations[id].copilot = typeof suggestion === "string" ? { answer: suggestion } : suggestion));
    },
    [need, update]
  );

  /** Someone else assigns a conversation to a teammate. */
  const assign = useCallback(
    (conversation: string, teammate: string) => {
      const id = need(conversation);
      update((s) => void (s.conversations[id].assignee = teammate));
    },
    [need, update]
  );

  /** Changes a conversation's attributes: priority, SLA, tags, team, status... */
  const updateConversation = useCallback(
    (conversation: string, patch: ConversationPatch) => {
      const id = need(conversation);
      update((s) => void Object.assign(s.conversations[id], patch));
    },
    [need, update]
  );

  /** Shows a conversation (also what a click on a row does). */
  const open = useCallback(
    (conversation: string) => {
      const id = need(conversation);
      update((s) => {
        s.current = id;
        s.conversations[id].unread = false;
      });
      emit({ type: "open", conversation: id });
    },
    [need, update, emit]
  );

  // ---------- What the signed-in teammate does (wired by <Intercom>) ----------

  const send = useCallback(
    (text: string) => {
      const s0 = ref.current;
      const id = s0.current;
      const note = s0.mode === "note";
      let mid = "";
      update((s) => {
        const m = newMessage(s, { kind: note ? "note" : "reply", by: me, text });
        mid = m.id;
        s.conversations[id].messages.push(m);
        s.order = [id, ...s.order.filter((x) => x !== id)];
      });
      emit(note ? { type: "note", conversation: id, text, id: mid } : { type: "reply", conversation: id, text, id: mid });
    },
    [update, me, emit]
  );

  const assignTo = useCallback(
    (to: string) => {
      const id = ref.current.current;
      update((s) => void (s.conversations[id].assignee = to));
      toast(`Assigned to ${teammates[to]?.name ?? to}`);
      emit({ type: "assign", conversation: id, to });
    },
    [update, toast, emit, teammates]
  );

  const snooze = useCallback(
    (until: string) => {
      const id = ref.current.current;
      update((s) => void (s.conversations[id].status = "snoozed"));
      toast(`Snoozed until ${until.toLowerCase()}`);
      emit({ type: "snooze", conversation: id, until });
    },
    [update, toast, emit]
  );

  const close = useCallback(() => {
    const id = ref.current.current;
    update((s) => {
      const c = s.conversations[id];
      c.status = "closed";
      c.messages.push(newMessage(s, { kind: "event", text: `*${teammates[me].name}* closed the conversation` }));
    });
    toast("Conversation closed");
    emit({ type: "close", conversation: id });
  }, [update, toast, emit, teammates, me]);

  const setView = useCallback(
    (id: string) => {
      update((s) => void (s.view = id));
      emit({ type: "view", id });
    },
    [update, emit]
  );

  const setFilter = useCallback(
    (patch: Partial<Pick<IntercomState, "status" | "sort">>) => {
      const s = update((d) => void Object.assign(d, patch));
      emit({ type: "filter", status: s.status, sort: s.sort });
    },
    [update, emit]
  );

  const toggleAway = useCallback(() => {
    const s = update((d) => void (d.away = !d.away));
    toast(s.away ? "You're now away" : "You're now active");
    emit({ type: "away", away: s.away });
  }, [update, toast, emit]);

  const setMode = useCallback((mode: IntercomState["mode"]) => void update((s) => void (s.mode = mode)), [update]);
  const setTab = useCallback((tab: IntercomState["tab"]) => void update((s) => void (s.tab = tab)), [update]);

  return {
    seed,
    me,
    teammates,
    customers,
    /** Save this and pass it back as `restore`. */
    state,
    /** The conversation whose customer is typing. */
    typing,
    notice,
    /** The conversation on screen. */
    current: state.current,
    // The world
    deliver,
    customerMessage,
    typingIn,
    newConversation,
    suggest,
    assign,
    updateConversation,
    open,
    toast,
    // The signed-in teammate (wired by <Intercom>)
    ui: { send, assignTo, snooze, close, setView, setFilter, toggleAway, setMode, setTab, emit },
  };
}

export type IntercomWorkspace = ReturnType<typeof useIntercom>;
