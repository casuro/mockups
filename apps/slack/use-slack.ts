import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlackEvent, SlackMessage, SlackMessageInput, SlackSeed, SlackState, Where } from "./types";

// The workspace behind <Slack>: its state, what the world does to it
// (deliver a message, type, react, join a huddle) and what the signed-in
// person does (send, react, open, join). Every change goes through
// `update`, which keeps a ref in step with React state, so calls made
// between renders (timers, awaited replies) see what the last one wrote.
// Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  online: boolean;
  title?: string;
  photo?: string;
  status?: string;
  bot: boolean;
}

export interface SlackOptions {
  /** A state saved from `slack.state`, to pick up where it was left. */
  restore?: SlackState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: SlackEvent) => void;
  /** Chimes when a huddle starts, and when someone joins or leaves (default true). */
  sounds?: boolean;
}

export interface DeliverOptions {
  /** Show the sender typing for this many ms first. */
  typing?: number;
  /** Toast it when the signed-in person is looking elsewhere. Default: DMs and mentions of them. */
  notify?: boolean;
}

const PALETTE = ["#e8a33d", "#e01e5a", "#1264a3", "#2bac76", "#7c3085", "#0b4c8c", "#d4582b", "#36c5f0"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export const keyOf = (where: Where) => ("channel" in where ? `channel:${where.channel}` : `dm:${where.dm}`);
export const whereOf = (key: string): Where => {
  const i = key.indexOf(":");
  return key.slice(0, i) === "channel" ? { channel: key.slice(i + 1) } : { dm: key.slice(i + 1) };
};
const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

export const minutes = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 1 ? "less than a minute" : m === 1 ? "1 minute" : `${m} minutes`;
};

function find(s: SlackState, id: string) {
  for (const [key, c] of Object.entries(s.conversations))
    for (const m of c.messages) {
      if (m.id === id) return { m, key, parent: null as SlackMessage | null };
      for (const r of m.replies) if (r.id === id) return { m: r, key, parent: m };
    }
  return null;
}

function endHuddle(s: SlackState, key: string) {
  const h = s.huddles[key];
  if (!h) return;
  const found = find(s, h.messageId);
  if (found) found.m.ended = minutes(Date.now() - h.startedAt);
  delete s.huddles[key];
  if (s.inHuddle === key) s.inHuddle = null;
}

function normalizePeople(seed: SlackSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people)) {
    out[id] = {
      id,
      name: p.name,
      color: p.color ?? colorFor(id),
      online: p.online !== false,
      initials: p.initials ?? p.name.trim().charAt(0).toUpperCase(),
      title: p.title,
      photo: p.photo,
      status: p.status,
      bot: !!p.bot,
    };
  }
  if (!out[seed.me]) throw new Error(`Slack: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function initialState(seed: SlackSeed): SlackState {
  let seq = 0;
  const mentionRe = new RegExp(`@${seed.me}\\b`);
  const make = (m: SlackMessageInput): SlackMessage => ({
    ...m,
    id: m.id ?? `s${++seq}`,
    at: toTime(m.at),
    text: m.text ?? "",
    reactions: m.reactions ?? [],
    replies: (m.replies ?? []).map(make),
    mentioned: m.from !== seed.me && mentionRe.test(m.text ?? ""),
  });
  const conversations: SlackState["conversations"] = {};
  const add = (key: string, messages: SlackMessageInput[] = [], unread = 0, dm = false) => {
    const list = messages.map(make).sort((a, b) => a.at - b.at);
    conversations[key] = {
      unread,
      mentions: dm ? unread : list.slice(list.length - unread).filter((m) => m.mentioned).length,
      messages: list,
      newFrom: null,
    };
  };
  for (const c of seed.channels) add(`channel:${c.id}`, c.messages, c.unread);
  for (const d of seed.dms ?? []) add(`dm:${d.with}`, d.messages, d.unread, true);

  const huddles: SlackState["huddles"] = {};
  for (const h of seed.huddles ?? []) {
    const key = keyOf(h.in);
    const conv = conversations[key];
    if (!conv) continue;
    const startedAt = toTime(h.startedAt);
    const announce: SlackMessage = {
      id: `s${++seq}`,
      from: h.by ?? h.people[0],
      at: startedAt,
      text: "",
      reactions: [],
      replies: [],
      mentioned: false,
      huddle: key,
    };
    conv.messages = [...conv.messages, announce].sort((a, b) => a.at - b.at);
    huddles[key] = {
      people: [...h.people],
      startedAt,
      video: h.video ?? [],
      muted: h.muted ?? [],
      sharing: h.sharing ? { by: h.sharing.by, title: h.sharing.title ?? "Shared screen" } : null,
      messageId: announce.id,
    };
  }

  const current = seed.open ? keyOf(seed.open) : Object.keys(conversations)[0];
  const state: SlackState = { version: 1, current, thread: null, conversations, huddles, inHuddle: null, theme: seed.theme ?? "light", seq };
  // Opening on a conversation with unread messages reads them and leaves the "New" line.
  const conv = conversations[current];
  if (conv?.unread) {
    conv.newFrom = conv.messages[conv.messages.length - conv.unread]?.id ?? null;
    conv.unread = 0;
    conv.mentions = 0;
  }
  return state;
}

export function useSlack(seed: SlackSeed, options: SlackOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<SlackState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [typing, setTypingState] = useState<{ key: string; from: string } | null>(null);
  const typingRef = useRef(typing);
  const [speaking, setSpeaking] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      void audio.current?.close().catch(() => {});
    };
  }, []);

  const update = useCallback((fn: (draft: SlackState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: SlackEvent) => opts.current.onEvent?.(event), []);

  const setTyping = useCallback((value: { key: string; from: string } | null) => {
    typingRef.current = value;
    setTypingState(value);
  }, []);

  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  const chime = useCallback((up = true) => {
    if (opts.current.sounds === false) return;
    try {
      const ctx = (audio.current ??= new AudioContext());
      (up ? [660, 880] : [880, 587]).forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime + i * 0.12;
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.start(t);
        o.stop(t + 0.4);
      });
    } catch {
      // Sound is a nicety.
    }
  }, []);

  const label = useCallback(
    (key: string) => {
      const w = whereOf(key);
      return "channel" in w ? `#${w.channel}` : (people[w.dm]?.name ?? w.dm);
    },
    [people]
  );

  /** The conversation's key, creating a DM with a known person on first use. */
  const need = useCallback(
    (where: Where) => {
      const key = keyOf(where);
      if (!ref.current.conversations[key]) {
        if ("dm" in where && people[where.dm])
          update((s) => void (s.conversations[key] = { unread: 0, mentions: 0, messages: [], newFrom: null }));
        else throw new Error(`Slack: there is no conversation ${label(key)}`);
      }
      return key;
    },
    [people, update, label]
  );

  const newMessage = useCallback(
    (draft: SlackState, input: SlackMessageInput): SlackMessage => ({
      ...input,
      id: input.id ?? `m${++draft.seq}`,
      at: toTime(input.at),
      text: input.text ?? "",
      reactions: input.reactions ?? [],
      replies: [],
      mentioned: input.from !== me && new RegExp(`@${me}\\b`).test(input.text ?? ""),
    }),
    [me]
  );

  const startHuddle = useCallback(
    (s: SlackState, key: string, by: string) => {
      const m = newMessage(s, { from: by });
      m.huddle = key;
      s.conversations[key].messages.push(m);
      s.huddles[key] = { people: [], startedAt: Date.now(), video: [], muted: [], sharing: null, messageId: m.id };
      return s.huddles[key];
    },
    [newMessage]
  );

  // ---------- What the world does ----------

  /** A message lands in `where` (or in a thread, with `thread`). Resolves with its id once it is on screen. */
  const deliver = useCallback(
    (where: Where, message: SlackMessageInput & { thread?: string }, options: DeliverOptions = {}): Promise<string> => {
      const key = need(where);
      // An empty message (a reply nobody needed to write) delivers nothing: they stop typing, and that is all.
      if (!message.text?.trim() && !message.card && !message.chart && !message.file && !message.link && !message.custom) {
        if (typingRef.current?.key === key && typingRef.current.from === message.from) setTyping(null);
        return Promise.resolve("");
      }
      const land = () => {
        if (typingRef.current?.key === key && typingRef.current.from === message.from) setTyping(null);
        let id = "";
        let notify = false;
        update((s) => {
          const { thread, ...input } = message;
          const m = newMessage(s, input);
          id = m.id;
          const conv = s.conversations[key];
          if (thread) {
            const found = find(s, thread);
            if (!found) throw new Error(`Slack: no message ${thread} to reply to`);
            found.m.replies.push(m);
          } else conv.messages.push(m);
          if (s.current !== key) {
            const dm = key.startsWith("dm:");
            conv.unread += 1;
            if (dm || m.mentioned) conv.mentions += 1;
            notify = options.notify ?? (dm || m.mentioned);
          }
        });
        if (notify) {
          const w = whereOf(key);
          const flat = (message.text ?? "").replace(/\s+/g, " ").slice(0, 80) || "sent a message";
          toast(`${people[message.from]?.name ?? message.from}${"channel" in w ? ` in #${w.channel}` : ""}: ${flat}`);
        }
        return id;
      };
      if (options.typing && options.typing > 0) {
        setTyping({ key, from: message.from });
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
    [need, update, newMessage, people, toast, setTyping]
  );

  /** Someone starts (`from`) or stops (null) typing in `where`: use it while a reply is being written. */
  const typingIn = useCallback(
    (where: Where, from: string | null) => setTyping(from ? { key: need(where), from } : null),
    [need, setTyping]
  );

  /** Someone other than the signed-in person reacts to a message. */
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

  const huddle = useMemo(
    () => ({
      /** Someone starts a huddle in `where`, or joins the one running there. */
      join(where: Where, person: string, o: { video?: boolean; muted?: boolean } = {}) {
        const key = need(where);
        const s = update((d) => {
          const h = d.huddles[key] ?? startHuddle(d, key, person);
          if (!h.people.includes(person)) h.people.push(person);
          if (o.video && !h.video.includes(person)) h.video.push(person);
          if (o.muted && !h.muted.includes(person)) h.muted.push(person);
        });
        if (s.inHuddle === key) {
          chime();
          toast(`${people[person]?.name ?? person} joined the huddle`);
        }
      },
      /** Someone leaves; the huddle ends when nobody is left. */
      leave(where: Where, person: string) {
        const key = need(where);
        const was = ref.current.inHuddle === key;
        update((d) => {
          const h = d.huddles[key];
          if (!h) return;
          h.people = h.people.filter((p) => p !== person);
          h.video = h.video.filter((p) => p !== person);
          h.muted = h.muted.filter((p) => p !== person);
          if (h.sharing?.by === person) h.sharing = null;
          if (!h.people.length) endHuddle(d, key);
        });
        if (was) chime(false);
      },
      /** Someone shares their screen (the title shows on it), or stops (null). */
      share(where: Where, person: string | null, title = "Shared screen") {
        const key = need(where);
        update((d) => {
          const h = d.huddles[key];
          if (h) h.sharing = person ? { by: person, title } : null;
        });
      },
      /** Who is talking right now: the ring around their tile. */
      speaking(ids: string[]) {
        setSpeaking(ids);
      },
    }),
    [need, update, chime, toast, people, startHuddle]
  );

  // ---------- What the signed-in person does (wired by <Slack>) ----------

  const open = useCallback(
    (where: Where) => {
      const key = need(where);
      update((s) => {
        s.current = key;
        s.thread = null;
        const c = s.conversations[key];
        c.newFrom = c.unread ? (c.messages[c.messages.length - c.unread]?.id ?? null) : null;
        c.unread = 0;
        c.mentions = 0;
      });
      emit({ type: "open", where });
    },
    [need, update, emit]
  );

  const send = useCallback(
    (text: string, thread?: string, alsoToChannel = false) => {
      const key = ref.current.current;
      let id = "";
      update((s) => {
        const c = s.conversations[key];
        const m = newMessage(s, { from: me, text });
        id = m.id;
        if (thread) {
          find(s, thread)?.m.replies.push(m);
          if (alsoToChannel) c.messages.push(newMessage(s, { from: me, text }));
        } else {
          c.newFrom = null;
          c.messages.forEach((x) => (x.mentioned = false));
          c.messages.push(m);
        }
      });
      emit({ type: "send", where: whereOf(key), text, id, ...(thread ? { thread } : {}) });
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

  const openThread = useCallback((id: string | null) => void update((s) => void (s.thread = id)), [update]);

  const leaveHuddle = useCallback(
    (silent = false) => {
      const key = ref.current.inHuddle;
      if (!key) return;
      update((s) => {
        const h = s.huddles[key];
        s.inHuddle = null;
        if (!h) return;
        h.people = h.people.filter((p) => p !== me);
        h.video = h.video.filter((p) => p !== me);
        h.muted = h.muted.filter((p) => p !== me);
        if (h.sharing?.by === me) h.sharing = null;
        if (!h.people.length) endHuddle(s, key);
      });
      if (!silent) {
        chime(false);
        toast("You left the huddle");
      }
      emit({ type: "huddle", action: "leave", where: whereOf(key) });
    },
    [update, me, chime, toast, emit]
  );

  const joinHuddle = useCallback(
    (key: string) => {
      if (ref.current.inHuddle === key) return;
      if (ref.current.inHuddle) leaveHuddle(true);
      const fresh = !ref.current.huddles[key];
      update((s) => {
        const h = s.huddles[key] ?? startHuddle(s, key, me);
        if (!h.people.includes(me)) h.people.push(me);
        s.inHuddle = key;
      });
      chime();
      emit({ type: "huddle", action: fresh ? "start" : "join", where: whereOf(key) });
    },
    [update, me, chime, emit, leaveHuddle, startHuddle]
  );

  const huddleControl = useCallback(
    (action: "mic" | "cam" | "share") => {
      const key = ref.current.inHuddle;
      if (!key) return;
      update((s) => {
        const h = s.huddles[key];
        if (!h) return;
        const flip = (list: string[]) => (list.includes(me) ? list.filter((p) => p !== me) : [...list, me]);
        if (action === "mic") h.muted = flip(h.muted);
        if (action === "cam") h.video = flip(h.video);
        if (action === "share") h.sharing = h.sharing?.by === me ? null : { by: me, title: "Your screen" };
      });
      emit({ type: "huddle", action, where: whereOf(key) });
    },
    [update, me, emit]
  );

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    typing,
    speaking,
    notice,
    label,
    /** The conversation on screen. */
    current: whereOf(state.current),
    // The world
    deliver,
    typingIn,
    react,
    toast,
    huddle,
    open,
    // The signed-in person (wired by <Slack>)
    ui: { send, toggleReaction, openThread, joinHuddle, leaveHuddle, huddleControl, setTheme, emit },
  };
}

export type SlackWorkspace = ReturnType<typeof useSlack>;
