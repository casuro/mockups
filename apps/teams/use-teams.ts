import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { duration, toTime } from "./format";
import type {
  MeetingRef,
  Presence,
  TeamsActivitySeed,
  TeamsEvent,
  TeamsMeetingState,
  TeamsMessage,
  TeamsMessageInput,
  TeamsSeed,
  TeamsState,
  TeamsView,
  Where,
} from "./types";

// The app behind <Teams>: its state, what the world does to it (deliver a
// message, post in a channel, reply, start or join a meeting, raise a hand)
// and what the signed-in person does (send, reply, react, open, call,
// join). Every change goes through `update`, which keeps a ref in step with
// React state, so calls made between renders (timers, awaited replies) see
// what the last one wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  presence: Presence;
  note: string;
  title?: string;
  photo?: string;
}

export interface Chat {
  /** "chat:priya" */
  key: string;
  id: string;
  kind: "dm" | "group";
  /** The other person, in a one-on-one chat. */
  with?: string;
  name: string;
  /** Everyone in it but the signed-in person. */
  others: string[];
  pinned: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  initials: string;
  members: string[];
  channels: { id: string; name: string; key: string }[];
}

export interface TeamsOptions {
  /** A state saved from `teams.state`, to pick up where it was left. */
  restore?: TeamsState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: TeamsEvent) => void;
}

export interface DeliverOptions {
  /** Show the sender typing for this many ms first. */
  typing?: number;
  /** Toast it when the signed-in person is looking elsewhere. Default: chats yes, channels no. */
  notify?: boolean;
}

const PALETTE = ["#8764b8", "#c239b3", "#0078d4", "#498205", "#ca5010", "#038387", "#4f6bed", "#e3008c"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const NOTES: Record<Presence, string> = { available: "Available", busy: "Busy", away: "Away", offline: "Offline", oof: "Out of office" };
const initialsOf = (name: string) =>
  name.split(/\s+/).filter((w) => /\w/.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const keyOf = (where: Where) => ("chat" in where ? `chat:${where.chat}` : `ch:${where.team}/${where.channel}`);
export const whereOf = (key: string): Where | null => {
  if (key.startsWith("chat:")) return { chat: key.slice(5) };
  if (key.startsWith("ch:")) {
    const [team, channel] = key.slice(3).split("/");
    return { team, channel };
  }
  return null;
};
const meetingId = (ref: MeetingRef) => (typeof ref === "string" ? ref : keyOf(ref));

function find(s: TeamsState, id: string) {
  for (const [key, c] of Object.entries(s.conversations))
    for (const m of c.messages) {
      if (m.id === id) return { m, key, parent: null as TeamsMessage | null };
      for (const r of m.replies) if (r.id === id) return { m: r, key, parent: m };
    }
  return null;
}

/** The meeting is over for everyone: its line in the conversation says how long it lasted. */
function endMeeting(s: TeamsState, id: string, noAnswer = false) {
  const h = s.meetings[id];
  if (!h) return;
  for (const c of Object.values(s.conversations))
    for (const m of c.messages)
      if (m.call?.kind === "live" && m.call.meeting === id) {
        m.call = { kind: noAnswer ? "noanswer" : "ended", duration: duration(Date.now() - h.startedAt), title: h.title };
      }
  delete s.meetings[id];
  if (s.inCall === id) s.inCall = null;
}

function without(h: TeamsMeetingState, person: string) {
  h.people = h.people.filter((p) => p !== person);
  h.ringing = h.ringing.filter((p) => p !== person);
  h.video = h.video.filter((p) => p !== person);
  h.muted = h.muted.filter((p) => p !== person);
  h.hands = h.hands.filter((p) => p !== person);
  if (h.sharing?.by === person) h.sharing = null;
}

function normalizePeople(seed: TeamsSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people)) {
    const presence = p.presence ?? "available";
    out[id] = {
      id,
      name: p.name,
      initials: p.initials ?? initialsOf(p.name),
      color: p.color ?? colorFor(id),
      presence,
      note: p.note ?? NOTES[presence],
      title: p.title,
      photo: p.photo,
    };
  }
  if (!out[seed.me]) throw new Error(`Teams: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function normalizeChats(seed: TeamsSeed, people: Record<string, Person>): Chat[] {
  return (seed.chats ?? []).map((c) => {
    const id = c.id ?? c.with;
    if (!id) throw new Error("Teams: a chat needs `with` (one-on-one) or `id` (group)");
    if (c.with)
      return { key: `chat:${id}`, id, kind: "dm", with: c.with, name: people[c.with]?.name ?? c.with, others: [c.with], pinned: !!c.pinned };
    const others = (c.members ?? []).filter((m) => m !== seed.me);
    return { key: `chat:${id}`, id, kind: "group", name: c.name ?? others.map((m) => people[m]?.name.split(" ")[0] ?? m).join(", "), others, pinned: !!c.pinned };
  });
}

function normalizeTeams(seed: TeamsSeed): Team[] {
  return (seed.teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color ?? colorFor(t.id),
    initials: initialsOf(t.name),
    members: t.members ?? [],
    channels: t.channels.map((c) => ({ id: c.id, name: c.name ?? c.id, key: `ch:${t.id}/${c.id}` })),
  }));
}

/** Is the conversation on screen? */
const showing = (s: TeamsState, key: string) => (s.view === "chat" && s.chat === key) || (s.view === "teams" && s.channel === key);

const VIEWS: TeamsView[] = ["activity", "chat", "teams", "calendar", "calls", "onedrive", "apps"];

/** Opening a conversation reads it; a channel leaves its red "New" line where the unread posts start. */
function markRead(s: TeamsState, key: string) {
  const c = s.conversations[key];
  if (!c) return;
  if (key.startsWith("ch:")) c.newFrom = c.unread ? (c.messages[c.messages.length - c.unread]?.id ?? null) : c.newFrom;
  c.unread = 0;
  c.mentions = 0;
}

function initialState(seed: TeamsSeed): TeamsState {
  let seq = 0;
  const mentionRe = new RegExp(`@${seed.me}\\b`);
  const make = (m: TeamsMessageInput): TeamsMessage => ({
    ...m,
    id: m.id ?? `s${++seq}`,
    at: toTime(m.at),
    text: m.text ?? "",
    reactions: m.reactions ?? [],
    replies: (m.replies ?? []).map(make),
    mentioned: m.from !== seed.me && mentionRe.test(m.text ?? ""),
  });
  const conversations: TeamsState["conversations"] = {};
  const add = (key: string, messages: TeamsMessageInput[] = [], unread = 0) => {
    const list = messages.map(make).sort((a, b) => a.at - b.at);
    conversations[key] = { unread, mentions: list.slice(list.length - unread).filter((m) => m.mentioned).length, messages: list, newFrom: null };
  };
  for (const c of seed.chats ?? []) add(`chat:${c.id ?? c.with}`, c.messages, c.unread);
  for (const t of seed.teams ?? []) for (const c of t.channels) add(`ch:${t.id}/${c.id}`, c.messages, c.unread);

  const meetings: TeamsState["meetings"] = {};
  for (const h of seed.meetings ?? []) {
    const id = keyOf(h.in);
    const conv = conversations[id];
    if (!conv) continue;
    const startedAt = toTime(h.startedAt);
    const organizer = h.organizer ?? h.people[0];
    conv.messages = [...conv.messages, make({ from: organizer, at: startedAt, call: { kind: "live", meeting: id, title: h.title } })].sort((a, b) => a.at - b.at);
    meetings[id] = {
      id,
      where: h.in,
      title: h.title,
      organizer,
      startedAt,
      people: [...h.people],
      ringing: [],
      video: h.video ?? [],
      muted: h.muted ?? [],
      hands: h.hands ?? [],
      sharing: h.sharing ? { by: h.sharing.by, title: h.sharing.title ?? "Shared screen" } : null,
      chat: (h.chat ?? []).map((m) => ({ ...m, at: startedAt })),
    };
  }

  const feed = (seed.activity ?? []).map((a: TeamsActivitySeed) => ({ ...a, id: a.id ?? `a${++seq}`, at: a.at === undefined ? null : toTime(a.at), unread: !!a.unread }));
  const firstChat = seed.chats?.[0];
  const firstTeam = seed.teams?.[0];
  const state: TeamsState = {
    version: 1,
    view: "chat",
    chat: firstChat ? `chat:${firstChat.id ?? firstChat.with}` : null,
    channel: seed.openChannel ? keyOf(seed.openChannel) : firstTeam?.channels[0] ? `ch:${firstTeam.id}/${firstTeam.channels[0].id}` : null,
    activity: null,
    detail: false,
    conversations,
    feed,
    meetings,
    inCall: null,
    presence: {},
    theme: seed.theme ?? "light",
    seq,
  };
  const open = seed.open;
  if (typeof open === "string") state.view = VIEWS.includes(open) ? open : "chat";
  else if (open) {
    const key = keyOf(open);
    if ("chat" in open) state.chat = key;
    else {
      state.view = "teams";
      state.channel = key;
    }
    state.detail = true;
  }
  const current = state.view === "chat" ? state.chat : state.view === "teams" ? state.channel : null;
  if (current) markRead(state, current);
  return state;
}

export function useTeams(seed: TeamsSeed, options: TeamsOptions = {}) {
  const base = useMemo(() => normalizePeople(seed), [seed]);
  const chats = useMemo(() => normalizeChats(seed, base), [seed, base]);
  const teamList = useMemo(() => normalizeTeams(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<TeamsState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [typing, setTypingState] = useState<{ key: string; from: string } | null>(null);
  const typingRef = useRef(typing);
  const [speaking, setSpeaking] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);
  const [reaction, setReaction] = useState<{ emoji: string; from: string; n: number } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const update = useCallback((fn: (draft: TeamsState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: TeamsEvent) => opts.current.onEvent?.(event), []);

  const setTyping = useCallback((value: { key: string; from: string } | null) => {
    typingRef.current = value;
    setTypingState(value);
  }, []);

  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  // Presence as it is now: changes since the seed, and "In a call" for the signed-in person in a meeting.
  const people = useMemo(() => {
    const out: Record<string, Person> = { ...base };
    for (const [id, p] of Object.entries(state.presence))
      if (out[id]) out[id] = { ...out[id], presence: p.presence, note: p.note ?? NOTES[p.presence] };
    if (state.inCall) out[me] = { ...out[me], presence: "busy", note: "In a call" };
    return out;
  }, [base, state.presence, state.inCall, me]);

  // Chats started after the seed (a one-on-one someone opens) join the list after the seeded ones.
  const chatList = useMemo(() => {
    const known = new Set(chats.map((c) => c.key));
    const extra: Chat[] = Object.keys(state.conversations)
      .filter((k) => k.startsWith("chat:") && !known.has(k))
      .map((k) => {
        const id = k.slice(5);
        return { key: k, id, kind: "dm", with: id, name: base[id]?.name ?? id, others: [id], pinned: false };
      });
    return [...chats, ...extra];
  }, [chats, state.conversations, base]);

  const chatOf = useCallback((key: string) => chatList.find((c) => c.key === key) ?? null, [chatList]);
  const channelOf = useCallback(
    (key: string) => {
      for (const team of teamList) {
        const channel = team.channels.find((c) => c.key === key);
        if (channel) return { team, channel };
      }
      return null;
    },
    [teamList]
  );

  /** "Design · Product & Design", a chat's name, or "Meet now". */
  const label = useCallback(
    (key: string) => {
      const ch = channelOf(key);
      if (ch) return `${ch.channel.name} · ${ch.team.name}`;
      return chatOf(key)?.name ?? (key.startsWith("chat:") ? (base[key.slice(5)]?.name ?? key.slice(5)) : "Meet now");
    },
    [channelOf, chatOf, base]
  );

  /** The conversation's key, creating a one-on-one chat with a known person on first use. */
  const need = useCallback(
    (where: Where) => {
      const key = keyOf(where);
      if (!ref.current.conversations[key]) {
        if ("chat" in where && base[where.chat] && where.chat !== me)
          update((s) => void (s.conversations[key] = { unread: 0, mentions: 0, messages: [], newFrom: null }));
        else throw new Error(`Teams: there is no conversation ${key}`);
      }
      return key;
    },
    [base, me, update]
  );

  const newMessage = useCallback(
    (draft: TeamsState, input: TeamsMessageInput): TeamsMessage => ({
      ...input,
      id: input.id ?? `m${++draft.seq}`,
      at: toTime(input.at),
      text: input.text ?? "",
      reactions: input.reactions ?? [],
      replies: (input.replies ?? []).map((r) => newMessage(draft, r)),
      mentioned: input.from !== me && new RegExp(`@${me}\\b`).test(input.text ?? ""),
    }),
    [me]
  );

  const later = useCallback((ms: number | undefined, fn: () => string): Promise<string> => {
    if (!ms || ms <= 0) return Promise.resolve(fn());
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        resolve(fn());
      }, ms);
      timers.current.add(t);
    });
  }, []);

  // ---------- What the world does ----------

  /** A message lands in a chat, or a new post in a channel. Resolves with its id once it is on screen. */
  const deliver = useCallback(
    (where: Where, message: TeamsMessageInput, options: DeliverOptions = {}): Promise<string> => {
      const key = need(where);
      if (options.typing) setTyping({ key, from: message.from });
      return later(options.typing, () => {
        if (typingRef.current?.key === key && typingRef.current.from === message.from) setTyping(null);
        let id = "";
        let notify = false;
        let mentioned = false;
        update((s) => {
          const m = newMessage(s, message);
          id = m.id;
          mentioned = m.mentioned;
          const conv = s.conversations[key];
          conv.messages.push(m);
          if (!showing(s, key)) {
            conv.unread += 1;
            if (m.mentioned) conv.mentions += 1;
            notify = options.notify ?? key.startsWith("chat:");
          }
        });
        if (notify || (mentioned && options.notify !== false && !showing(ref.current, key))) {
          const flat = (message.text ?? "").replace(/[*`]/g, "").replace(/\s+/g, " ").slice(0, 80) || "Sent a file";
          const ch = channelOf(key);
          toast(`${base[message.from]?.name ?? message.from}${ch ? ` in ${ch.channel.name}` : ""}: ${flat}`);
        }
        return id;
      });
    },
    [need, later, update, newMessage, setTyping, toast, base, channelOf]
  );

  /** A new post in a channel: `deliver` for a team's channel. */
  const post = useCallback(
    (channel: { team: string; channel: string }, message: TeamsMessageInput, options?: DeliverOptions) => deliver(channel, message, options),
    [deliver]
  );

  /** Someone replies to a channel post. Resolves with the reply's id. */
  const reply = useCallback(
    (postId: string, message: TeamsMessageInput, options: DeliverOptions = {}): Promise<string> => {
      const at = find(ref.current, postId);
      if (!at) throw new Error(`Teams: no post ${postId} to reply to`);
      const key = at.key;
      const parentId = at.parent?.id ?? postId;
      if (options.typing) setTyping({ key, from: message.from });
      return later(options.typing, () => {
        if (typingRef.current?.key === key && typingRef.current.from === message.from) setTyping(null);
        let id = "";
        update((s) => {
          const found = find(s, parentId);
          if (!found) return;
          const m = newMessage(s, message);
          id = m.id;
          found.m.replies.push(m);
          if (!showing(s, key)) {
            s.conversations[key].unread += 1;
            if (m.mentioned) s.conversations[key].mentions += 1;
          }
        });
        return id;
      });
    },
    [later, update, newMessage, setTyping]
  );

  /** Someone starts (`from`) or stops (null) typing in `where`: use it while a reply is being written. */
  const typingIn = useCallback((where: Where, from: string | null) => setTyping(from ? { key: need(where), from } : null), [need, setTyping]);

  /** Someone other than the signed-in person reacts to a message, post or reply. */
  const react = useCallback(
    (id: string, emoji: string) =>
      void update((s) => {
        const found = find(s, id);
        if (!found) return;
        const r = found.m.reactions.find((x) => x.emoji === emoji);
        if (r) r.count += 1;
        else found.m.reactions.push({ emoji, count: 1 });
      }),
    [update]
  );

  /** A new item at the top of Activity. */
  const notify = useCallback(
    (item: TeamsActivitySeed) =>
      void update((s) => {
        s.feed.unshift({ ...item, id: item.id ?? `a${++s.seq}`, at: toTime(item.at), unread: item.unread !== false });
      }),
    [update]
  );

  /** Someone's presence changes: the dot, and the line under their name. */
  const setPresence = useCallback(
    (person: string, presence: Presence, note?: string) =>
      void update((s) => {
        s.presence[person] = note ? { presence, note } : { presence };
      }),
    [update]
  );

  const addMeeting = useCallback(
    (s: TeamsState, id: string, where: Where | null, title: string, organizer: string) => {
      s.meetings[id] = { id, where, title, organizer, startedAt: Date.now(), people: [], ringing: [], video: [], muted: [], hands: [], sharing: null, chat: [] };
      if (where) s.conversations[keyOf(where)]?.messages.push(newMessage(s, { from: organizer, call: { kind: "live", meeting: id, title } }));
      return s.meetings[id];
    },
    [newMessage]
  );

  const defaultTitle = useCallback(
    (where: Where | null, by: string) => {
      if (!where) return `Meeting with ${base[by]?.name ?? by}`;
      const key = keyOf(where);
      const ch = channelOf(key);
      return ch ? `Meeting in ${ch.channel.name}` : label(key);
    },
    [base, channelOf, label]
  );

  const meeting = useMemo(
    () => ({
      /** Someone starts a meeting in a conversation (a call, in a chat). Returns its id: the conversation's key. */
      start(where: Where, by: string, o: { title?: string; people?: string[]; video?: boolean } = {}) {
        const id = need(where);
        update((d) => {
          const h = d.meetings[id] ?? addMeeting(d, id, where, o.title ?? defaultTitle(where, by), by);
          for (const p of [by, ...(o.people ?? [])]) if (!h.people.includes(p)) h.people.push(p);
          if (o.video && !h.video.includes(by)) h.video.push(by);
        });
        return id;
      },
      /** Someone joins (a meeting running there is started if there is none, when `meeting` is a conversation). */
      join(ref_: MeetingRef, person: string, o: { video?: boolean; muted?: boolean } = {}) {
        const id = meetingId(ref_);
        if (!ref.current.meetings[id] && typeof ref_ !== "string") return void meeting.start(ref_, person, { video: o.video });
        const s = update((d) => {
          const h = d.meetings[id];
          if (!h) return;
          h.ringing = h.ringing.filter((p) => p !== person);
          if (!h.people.includes(person)) h.people.push(person);
          if (o.video && !h.video.includes(person)) h.video.push(person);
          if (o.muted && !h.muted.includes(person)) h.muted.push(person);
        });
        if (s.inCall === id) toast(`${base[person]?.name ?? person} joined`);
      },
      /** Someone being called does not pick up. With nobody else there or ringing, the call ends. */
      decline(ref_: MeetingRef, person: string) {
        const id = meetingId(ref_);
        let alone = false;
        update((d) => {
          const h = d.meetings[id];
          if (!h) return;
          h.ringing = h.ringing.filter((p) => p !== person);
          alone = d.inCall === id && !h.people.some((p) => p !== me) && !h.ringing.length;
          if (alone) endMeeting(d, id, true);
        });
        if (alone) toast(`${base[person]?.name ?? person} didn't answer`);
      },
      /** Someone leaves; the meeting ends when nobody is left. */
      leave(ref_: MeetingRef, person: string) {
        const id = meetingId(ref_);
        update((d) => {
          const h = d.meetings[id];
          if (!h) return;
          without(h, person);
          if (!h.people.length) endMeeting(d, id);
        });
      },
      /** The meeting ends for everyone. */
      end(ref_: MeetingRef) {
        const id = meetingId(ref_);
        const was = ref.current.inCall === id;
        update((d) => endMeeting(d, id));
        if (was) toast("The meeting has ended");
      },
      /** Someone raises (or lowers) their hand. */
      raiseHand(ref_: MeetingRef, person: string, raised = true) {
        const id = meetingId(ref_);
        update((d) => {
          const h = d.meetings[id];
          if (!h) return;
          h.hands = h.hands.filter((p) => p !== person);
          if (raised) h.hands.push(person);
        });
      },
      /** Someone presents their screen (the title shows on it), or stops (null). */
      share(ref_: MeetingRef, person: string | null, title = "Shared screen") {
        const id = meetingId(ref_);
        update((d) => {
          const h = d.meetings[id];
          if (h) h.sharing = person ? { by: person, title } : null;
        });
      },
      /** Someone turns their camera or mic on or off. */
      set(ref_: MeetingRef, person: string, o: { video?: boolean; muted?: boolean }) {
        const id = meetingId(ref_);
        update((d) => {
          const h = d.meetings[id];
          if (!h) return;
          const flip = (list: string[], on: boolean | undefined) => (on === undefined ? list : on ? [...new Set([...list, person])] : list.filter((p) => p !== person));
          h.video = flip(h.video, o.video);
          h.muted = flip(h.muted, o.muted);
        });
      },
      /** A message in the meeting chat. */
      say(ref_: MeetingRef, from: string, text: string) {
        const id = meetingId(ref_);
        update((d) => void d.meetings[id]?.chat.push({ from, text, at: Date.now() }));
      },
      /** Someone sends a reaction: it floats up over the stage. */
      react(ref_: MeetingRef, from: string, emoji: string) {
        if (ref.current.inCall === meetingId(ref_)) setReaction((r) => ({ emoji, from, n: (r?.n ?? 0) + 1 }));
      },
      /** Who is talking right now: the ring around their tile. */
      speaking(ids: string[]) {
        setSpeaking(ids);
      },
    }),
    [need, update, addMeeting, defaultTitle, toast, base, me]
  );

  // ---------- Navigation (the world and the signed-in person) ----------

  /** Show a conversation. */
  const open = useCallback(
    (where: Where) => {
      const key = need(where);
      update((s) => {
        if ("chat" in where) {
          s.view = "chat";
          s.chat = key;
        } else {
          s.view = "teams";
          s.channel = key;
        }
        s.detail = true;
        markRead(s, key);
      });
      emit({ type: "open", where });
    },
    [need, update, emit]
  );

  /** Switch the app bar's view. */
  const show = useCallback(
    (view: TeamsView) => {
      update((s) => {
        s.view = view;
        // Chat, Teams and Activity open on their list on a phone; the others have no list worth stopping at.
        s.detail = !["chat", "teams", "activity"].includes(view);
        const key = view === "chat" ? s.chat : view === "teams" ? s.channel : null;
        if (key) markRead(s, key);
      });
      emit({ type: "view", view });
    },
    [update, emit]
  );

  // ---------- What the signed-in person does (wired by <Teams>) ----------

  const current = state.view === "chat" ? state.chat : state.view === "teams" ? state.channel : null;

  const send = useCallback(
    (text: string, subject?: string) => {
      const s0 = ref.current;
      const key = s0.view === "chat" ? s0.chat : s0.view === "teams" ? s0.channel : null;
      if (!key) return;
      let id = "";
      update((s) => {
        const c = s.conversations[key];
        const m = newMessage(s, { from: me, text, ...(subject ? { subject } : {}) });
        id = m.id;
        c.messages.forEach((x) => (x.mentioned = false));
        c.newFrom = null;
        c.messages.push(m);
      });
      emit({ type: "send", where: whereOf(key)!, text, id, ...(subject ? { subject } : {}) });
    },
    [update, newMessage, me, emit]
  );

  const replyToPost = useCallback(
    (postId: string, text: string) => {
      let id = "";
      let key = "";
      update((s) => {
        const found = find(s, postId);
        if (!found) return;
        const m = newMessage(s, { from: me, text });
        id = m.id;
        key = found.key;
        found.m.replies.push(m);
      });
      if (id) emit({ type: "reply", where: whereOf(key)!, post: postId, text, id });
    },
    [update, newMessage, me, emit]
  );

  const toggleReaction = useCallback(
    (id: string, emoji: string) => {
      let added = true;
      update((s) => {
        const list = find(s, id)?.m.reactions;
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
      emit({ type: "react", id, emoji, added });
    },
    [update, emit]
  );

  const pickActivity = useCallback(
    (id: string) => {
      const item = ref.current.feed.find((a) => a.id === id);
      update((s) => {
        const a = s.feed.find((x) => x.id === id);
        if (a) a.unread = false;
        s.activity = id;
      });
      if (item?.go) open(item.go);
    },
    [update, open]
  );

  const back = useCallback(() => void update((s) => void (s.detail = false)), [update]);

  const leaveMeeting = useCallback(
    (silent = false) => {
      const id = ref.current.inCall;
      if (!id) return;
      const where = ref.current.meetings[id]?.where ?? null;
      update((s) => {
        const h = s.meetings[id];
        s.inCall = null;
        if (!h) return;
        without(h, me);
        // A call or meeting you started ends when you hang up; one you joined goes on without you.
        if (h.organizer === me || !h.people.length) endMeeting(s, id);
      });
      if (!silent) toast("You left the meeting");
      emit({ type: "meeting", action: "leave", meeting: id, where });
    },
    [update, me, toast, emit]
  );

  const startMeeting = useCallback(
    (where: Where | null, o: { video?: boolean } = {}) => {
      if (ref.current.inCall) leaveMeeting(true);
      let id = where ? keyOf(where) : "";
      update((s) => {
        if (!id) id = `meet:${++s.seq}`;
        const running = s.meetings[id];
        const h = running ?? addMeeting(s, id, where, defaultTitle(where, me), me);
        if (!h.people.includes(me)) h.people.push(me);
        if (o.video && !h.video.includes(me)) h.video.push(me);
        if (!running && where && "chat" in where) h.ringing = chatOf(id)?.others ?? [where.chat];
        s.inCall = id;
      });
      emit({ type: "meeting", action: "start", meeting: id, where });
    },
    [update, addMeeting, defaultTitle, me, chatOf, emit, leaveMeeting]
  );

  const joinMeeting = useCallback(
    (id: string, o: { video?: boolean; muted?: boolean } = {}) => {
      if (ref.current.inCall === id) return;
      if (ref.current.inCall) leaveMeeting(true);
      update((s) => {
        const h = s.meetings[id];
        if (!h) return;
        if (!h.people.includes(me)) h.people.push(me);
        if (o.video && !h.video.includes(me)) h.video.push(me);
        if (o.muted && !h.muted.includes(me)) h.muted.push(me);
        s.inCall = id;
      });
      emit({ type: "meeting", action: "join", meeting: id, where: ref.current.meetings[id]?.where ?? null });
    },
    [update, me, emit, leaveMeeting]
  );

  const meetingControl = useCallback(
    (action: "mic" | "cam" | "share" | "hand") => {
      const id = ref.current.inCall;
      if (!id) return;
      let raised = false;
      update((s) => {
        const h = s.meetings[id];
        if (!h) return;
        const flip = (list: string[]) => (list.includes(me) ? list.filter((p) => p !== me) : [...list, me]);
        if (action === "mic") h.muted = flip(h.muted);
        if (action === "cam") h.video = flip(h.video);
        if (action === "hand") {
          h.hands = flip(h.hands);
          raised = h.hands.includes(me);
        }
        if (action === "share") h.sharing = h.sharing?.by === me ? null : { by: me, title: "Your screen" };
      });
      if (raised) toast("You raised your hand");
      emit({ type: "meeting", action, meeting: id, where: ref.current.meetings[id]?.where ?? null });
    },
    [update, me, toast, emit]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      const id = ref.current.inCall;
      if (!id) return;
      setReaction((r) => ({ emoji, from: me, n: (r?.n ?? 0) + 1 }));
      emit({ type: "meeting", action: "react", meeting: id, where: ref.current.meetings[id]?.where ?? null, emoji });
    },
    [me, emit]
  );

  const meetingChat = useCallback(
    (text: string) => {
      const id = ref.current.inCall;
      if (!id) return;
      update((s) => void s.meetings[id]?.chat.push({ from: me, text, at: Date.now() }));
      emit({ type: "meeting", action: "chat", meeting: id, where: ref.current.meetings[id]?.where ?? null, text });
    },
    [update, me, emit]
  );

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  return {
    seed,
    me,
    people,
    chats: chatList,
    teams: teamList,
    /** Save this and pass it back as `restore`. */
    state,
    typing,
    speaking,
    notice,
    reaction,
    label,
    chatOf,
    channelOf,
    /** The conversation on screen, if one is. */
    current: current ? whereOf(current) : null,
    // The world
    deliver,
    post,
    reply,
    typingIn,
    react,
    notify,
    setPresence,
    meeting,
    open,
    show,
    toast,
    // The signed-in person (wired by <Teams>)
    ui: { send, reply: replyToPost, toggleReaction, pickActivity, back, startMeeting, joinMeeting, leaveMeeting, meetingControl, sendReaction, meetingChat, setTheme, emit },
  };
}

export type TeamsApp = ReturnType<typeof useTeams>;
