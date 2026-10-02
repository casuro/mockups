import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lastSeenAt, toTime } from "./format";
import type { Ticks, WhatsAppEvent, WhatsAppMessage, WhatsAppMessageInput, WhatsAppSeed, WhatsAppState } from "./types";

// The phone behind <WhatsApp>: its state, what the world does to it (a
// message arrives, ticks turn blue, someone types or comes online, reacts)
// and what the signed-in person does (send, open a chat, play a voice note,
// call). Every change goes through `update`, which keeps a ref in step with
// React state, so calls made between renders (timers, awaited replies) see
// what the last one wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  /** The first name, as group previews and typing lines use it. */
  first: string;
  initials: string;
  color: string;
  photo?: string;
}

/** A chat as the list and header draw it. */
export interface ChatInfo {
  id: string;
  name: string;
  group: boolean;
  /** A one-to-one chat's other person. */
  with?: string;
  members: string[];
  photo?: string;
}

export interface WhatsAppOptions {
  /** A state saved from `whatsapp.state`, to pick up where it was left. */
  restore?: WhatsAppState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: WhatsAppEvent) => void;
}

export interface DeliverOptions {
  /** Show the sender typing for this many ms first. */
  typing?: number;
  /** Also show a toast when the chat is not on screen. Default false. */
  notify?: boolean;
}

// WhatsApp's colors for names in groups.
const PALETTE = ["#1f7aec", "#d4458a", "#e5733a", "#7f66ff", "#06a88e", "#c9a100", "#ff5c5c", "#029d00"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

function normalizePeople(seed: WhatsAppSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people)) {
    out[id] = {
      id,
      name: p.name,
      first: p.name.trim().split(/\s+/)[0],
      color: p.color ?? colorFor(id),
      initials: p.initials ?? p.name.trim().charAt(0).toUpperCase(),
      photo: p.photo,
    };
  }
  if (!out[seed.me]) throw new Error(`WhatsApp: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

/** Puts a chat at the top of the list, under the pinned ones (a pinned chat keeps its place). */
function bump(s: WhatsAppState, id: string) {
  if (s.chats[id].pinned) return;
  const rest = s.order.filter((c) => c !== id);
  const pinned = rest.filter((c) => s.chats[c].pinned).length;
  rest.splice(pinned, 0, id);
  s.order = rest;
}

function findMessage(s: WhatsAppState, id: string) {
  for (const c of Object.values(s.chats)) {
    const m = c.messages.find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}

function initialState(seed: WhatsAppSeed): WhatsAppState {
  let seq = 0;
  const chats: WhatsAppState["chats"] = {};
  for (const c of seed.chats) {
    const messages = (c.messages ?? [])
      .map((m): WhatsAppMessage => ({
        ...m,
        id: m.id ?? `s${++seq}`,
        at: toTime(m.at),
        text: m.text ?? "",
        reactions: m.reactions ?? [],
        ...(m.from === seed.me ? { ticks: m.ticks ?? "read" } : {}),
      }))
      .sort((a, b) => a.at - b.at);
    chats[c.id] = { unread: c.unread ?? 0, typing: c.typing ?? null, pinned: !!c.pinned, muted: !!c.muted, messages };
  }
  const ids = seed.chats.map((c) => c.id);
  const order = [...ids.filter((id) => chats[id].pinned), ...ids.filter((id) => !chats[id].pinned)];
  const online: Record<string, boolean> = {};
  const lastSeen: Record<string, string> = {};
  for (const [id, p] of Object.entries(seed.people)) {
    online[id] = !!p.online;
    if (p.lastSeen) lastSeen[id] = p.lastSeen;
  }
  const open = seed.open && chats[seed.open] ? seed.open : ids[0];
  if (open) chats[open].unread = 0;
  return { version: 1, open, order, chats, online, lastSeen, theme: seed.theme ?? "light", seq };
}

export function useWhatsApp(seed: WhatsAppSeed, options: WhatsAppOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<WhatsAppState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed)
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

  const update = useCallback((fn: (draft: WhatsAppState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: WhatsAppEvent) => opts.current.onEvent?.(event), []);

  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  const seedChats = useMemo(() => new Map(seed.chats.map((c) => [c.id, c])), [seed]);

  /** A chat's name, picture and members, for the list and the header. */
  const chat = useCallback(
    (id: string): ChatInfo => {
      const c = seedChats.get(id);
      const dm = c ? c.with : people[id] ? id : undefined;
      if (dm) return { id, name: people[dm]?.name ?? dm, group: false, with: dm, members: [dm], photo: people[dm]?.photo };
      return { id, name: c?.name ?? id, group: true, members: c?.members ?? [], photo: c?.photo };
    },
    [seedChats, people]
  );

  /** The chat's id, starting a one-to-one chat with a known person on first use. */
  const need = useCallback(
    (id: string) => {
      if (!ref.current.chats[id]) {
        if (!people[id]) throw new Error(`WhatsApp: there is no chat "${id}"`);
        update((s) => {
          s.chats[id] = { unread: 0, typing: null, pinned: false, muted: false, messages: [] };
          s.order.push(id);
        });
      }
      return id;
    },
    [people, update]
  );

  const newMessage = useCallback(
    (draft: WhatsAppState, input: WhatsAppMessageInput): WhatsAppMessage => ({
      ...input,
      id: input.id ?? `m${++draft.seq}`,
      at: toTime(input.at),
      text: input.text ?? "",
      reactions: input.reactions ?? [],
      ...(input.from === me ? { ticks: input.ticks ?? "sent" } : {}),
    }),
    [me]
  );

  // ---------- What the world does ----------

  /** Someone starts (a person's id) or stops (null) typing in a chat: use it while a reply is being written. */
  const typingIn = useCallback(
    (chatId: string, from: string | null) => {
      const id = need(chatId);
      update((s) => void (s.chats[id].typing = from));
    },
    [need, update]
  );

  /** A message lands in a chat. Resolves with its id once it is on screen. */
  const deliver = useCallback(
    (chatId: string, message: WhatsAppMessageInput, options: DeliverOptions = {}): Promise<string> => {
      // An empty message (a reply nobody needed to write) delivers nothing: they stop typing, and that is all.
      if (!message.text?.trim() && !message.image && !message.voice && !message.document && !message.custom) {
        if (ref.current.chats[chatId]?.typing === message.from) update((s) => void (s.chats[chatId].typing = null));
        return Promise.resolve("");
      }
      const id = need(chatId);
      const land = () => {
        let mid = "";
        let away = false;
        update((s) => {
          const c = s.chats[id];
          const m = newMessage(s, message);
          mid = m.id;
          c.messages.push(m);
          if (c.typing === message.from) c.typing = null;
          if (s.open !== id) {
            c.unread += 1;
            away = true;
          }
          bump(s, id);
        });
        if (away && options.notify) {
          const info = chat(id);
          const who = people[message.from]?.name ?? message.from;
          const body = message.text || (message.voice ? "Voice message" : message.document ? message.document.name : message.image ? "Photo" : "");
          toast(`${info.group ? `${who} in ${info.name}` : who}: ${body.replace(/\s+/g, " ").slice(0, 80)}`);
        }
        return mid;
      };
      if (options.typing && options.typing > 0) {
        update((s) => void (s.chats[id].typing = message.from));
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
    [need, update, newMessage, chat, people, toast]
  );

  /** The ticks on one of the signed-in person's messages: "delivered", then "read". */
  const setTicks = useCallback(
    (messageId: string, ticks: Ticks) =>
      void update((s) => {
        const m = findMessage(s, messageId);
        if (m && m.from === me) m.ticks = ticks;
      }),
    [update, me]
  );

  /** Someone comes online, or goes offline (and was last seen now). */
  const setOnline = useCallback(
    (personId: string, online: boolean) =>
      void update((s) => {
        if (s.online[personId] && !online) s.lastSeen[personId] = lastSeenAt(Date.now());
        s.online[personId] = online;
      }),
    [update]
  );

  /** Someone other than the signed-in person reacts to a message. */
  const react = useCallback(
    (messageId: string, emoji: string) =>
      void update((s) => {
        const m = findMessage(s, messageId);
        if (!m) return;
        const r = m.reactions.find((x) => x.emoji === emoji);
        if (r) r.count += 1;
        else m.reactions.push({ emoji, count: 1 });
      }),
    [update]
  );

  /** Shows a chat. */
  const open = useCallback(
    (chatId: string) => {
      const id = need(chatId);
      update((s) => {
        s.open = id;
        s.chats[id].unread = 0;
      });
      emit({ type: "open", chat: id });
    },
    [need, update, emit]
  );

  // ---------- What the signed-in person does (wired by <WhatsApp>) ----------

  const send = useCallback(
    (text: string) => {
      const chatId = ref.current.open;
      let id = "";
      update((s) => {
        const m = newMessage(s, { from: me, text });
        id = m.id;
        const c = s.chats[chatId];
        c.messages.push(m);
        c.typing = null;
        bump(s, chatId);
      });
      emit({ type: "send", chat: chatId, text, id });
      return id;
    },
    [update, newMessage, me, emit]
  );

  /** Adds or takes back the signed-in person's reaction. */
  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      let added = true;
      update((s) => {
        const list = findMessage(s, messageId)?.reactions;
        if (!list) return;
        const r = list.find((x) => x.emoji === emoji);
        if (!r) list.push({ emoji, count: 1, mine: true });
        else if (r.mine) {
          added = false;
          r.count -= 1;
          r.mine = false;
          if (!r.count) list.splice(list.indexOf(r), 1);
        } else {
          r.count += 1;
          r.mine = true;
        }
      });
      emit({ type: "react", id: messageId, emoji, added });
    },
    [update, emit]
  );

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  const ui = useMemo(() => ({ send, toggleReaction, setTheme, emit }), [send, toggleReaction, setTheme, emit]);

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    chat,
    // The world
    deliver,
    setTicks,
    typingIn,
    setOnline,
    react,
    toast,
    open,
    // The signed-in person (wired by <WhatsApp>)
    ui,
  };
}

export type WhatsAppApp = ReturnType<typeof useWhatsApp>;
