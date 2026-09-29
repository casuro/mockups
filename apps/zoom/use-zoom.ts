import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ZoomChatInput, ZoomChatMessage, ZoomEvent, ZoomSecurity, ZoomSeed, ZoomShare, ZoomState, ZoomWhiteboard } from "./types";

// The meeting behind <Zoom>: its state, what the world does to it (someone
// joins, knocks in the waiting room, talks, reacts, shares, chats) and what
// the signed-in person does (mute, share, record, admit, chat, leave).
// Every change goes through `update`, which keeps a ref in step with React
// state, so calls made between renders (timers, awaited replies) see what
// the last one wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: string;
  status?: string;
}

export interface ZoomOptions {
  /** A state saved from `zoom.state`, to pick up where it was left. */
  restore?: ZoomState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: ZoomEvent) => void;
}

export type Feedback = "yes" | "no" | "slower" | "faster";
export const FEEDBACK: Record<Feedback, { emoji: string; label: string }> = {
  yes: { emoji: "✅", label: "Yes" },
  no: { emoji: "❌", label: "No" },
  slower: { emoji: "⏪", label: "Slower" },
  faster: { emoji: "⏩", label: "Faster" },
};

const PALETTE = ["#0b5cff", "#e8a33d", "#e5427a", "#1e9c4a", "#7a3ff2", "#ff742e", "#0e9f6e", "#36c5f0"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const without = (list: string[], id: string) => list.filter((x) => x !== id);
const withOne = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

/** Drop someone from everything that is about being in the meeting. */
function dropPerson(d: ZoomState, id: string) {
  d.people = without(d.people, id);
  d.muted = without(d.muted, id);
  d.video = without(d.video, id);
  delete d.hands[id];
  delete d.feedback[id];
  if (d.pinned === id) d.pinned = null;
  if (d.spotlight === id) d.spotlight = null;
  if (d.share?.by === id) d.share = null;
  if (d.chatTo === id) d.chatTo = "everyone";
}

function normalizePeople(seed: ZoomSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people)) {
    const words = p.name.trim().split(/\s+/);
    out[id] = {
      id,
      name: p.name,
      color: p.color ?? colorFor(id),
      initials: p.initials ?? (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : "")).toUpperCase(),
      photo: p.photo,
      status: p.status,
    };
  }
  if (!out[seed.me]) throw new Error(`Zoom: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function initialState(seed: ZoomSeed, fresh = false): ZoomState {
  let seq = 0;
  const others = seed.participants.filter((p) => p !== seed.me);
  const chat: ZoomChatMessage[] = fresh
    ? []
    : (seed.chat ?? []).map((m) => ({ ...m, id: m.id ?? `c${++seq}`, to: m.to ?? "everyone", text: m.text ?? "", at: toTime(m.at) }));
  const share: ZoomShare | null = !fresh && seed.share ? { by: seed.share.by, kind: "screen", screen: seed.share.screen, fit: true } : null;
  return {
    version: 1,
    phase: "meeting",
    startedAt: fresh ? Date.now() : toTime(seed.meeting.startedAt),
    host: seed.meeting.host ?? seed.me,
    people: [seed.me, ...others],
    waiting: fresh ? [] : (seed.waiting ?? []).filter((p) => !others.includes(p)),
    muted: (seed.muted ?? []).filter((p) => others.includes(p)),
    video: [seed.me, ...others.filter((p) => !(seed.cameraOff ?? []).includes(p))],
    hands: {},
    feedback: {},
    audio: true,
    view: seed.view ?? "gallery",
    hideSelf: false,
    hideNonVideo: false,
    pinned: null,
    spotlight: null,
    panels: { participants: false, chat: false, apps: false },
    chat,
    chatTo: "everyone",
    unread: 0,
    share,
    recording: null,
    captions: false,
    notice: null,
    security: { locked: false, waitingRoom: true, hidePictures: false, share: true, chat: true, rename: true, unmute: true, video: true },
    sounds: true,
    seq,
  };
}

export function useZoom(seed: ZoomSeed, options: ZoomOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<ZoomState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [speakingNow, setSpeakingNow] = useState<string[]>([]);
  const recent = useRef<string[]>([]);
  const [caption, setCaption] = useState<{ id: string; text: string } | null>(null);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; at: number }>>({});
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      void audio.current?.close().catch(() => {});
      audio.current = null;
    };
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const update = useCallback((fn: (draft: ZoomState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: ZoomEvent) => opts.current.onEvent?.(event), []);
  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);
  const nameOf = useCallback((id: string) => people[id]?.name ?? id, [people]);

  const chime = useCallback((up = true) => {
    if (!ref.current.sounds) return;
    try {
      const ctx = (audio.current ??= new AudioContext());
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      (up ? [660, 880] : [880, 587]).forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime + i * 0.15;
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.07, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.start(t);
        o.stop(t + 0.45);
      });
    } catch {
      // Sound is a nicety.
    }
  }, []);

  const canManage = state.host === me;

  const pushChat = useCallback(
    (d: ZoomState, input: ZoomChatInput): ZoomChatMessage => {
      const m: ZoomChatMessage = {
        id: input.id ?? `m${++d.seq}`,
        from: input.from,
        to: input.to ?? "everyone",
        text: input.text ?? "",
        at: toTime(input.at),
        ...(input.file ? { file: input.file } : {}),
        ...(input.system ? { system: true } : {}),
      };
      d.chat.push(m);
      return m;
    },
    []
  );

  // ---------- What the world does ----------

  /** Someone joins the meeting (from the waiting room, if they were in it). */
  const join = useCallback(
    (person: string, o: { video?: boolean; muted?: boolean; quiet?: boolean } = {}) => {
      if (!people[person] || ref.current.people.includes(person)) return;
      update((d) => {
        d.people.push(person);
        d.waiting = without(d.waiting, person);
        if (d.notice === person) d.notice = null;
        if (o.video !== false) d.video = withOne(d.video, person);
        if (o.muted) d.muted = withOne(d.muted, person);
      });
      if (!o.quiet) {
        chime(true);
        toast(`${nameOf(person)} joined the meeting`);
      }
    },
    [people, update, chime, toast, nameOf]
  );

  /** Someone knocks: they wait in the waiting room for the host to admit them (or join, if it is off). */
  const admitRequest = useCallback(
    (person: string) => {
      const s = ref.current;
      if (!people[person] || s.people.includes(person) || s.waiting.includes(person)) return;
      if (!s.security.waitingRoom) return join(person);
      update((d) => {
        d.waiting.push(person);
        if (d.host === me) d.notice = person;
      });
      chime(true);
    },
    [people, update, join, chime, me]
  );

  /** Someone leaves (or is dropped): `message` replaces the "left the meeting" toast. */
  const leave = useCallback(
    (person: string, message?: string) => {
      const s = ref.current;
      if (s.waiting.includes(person)) {
        update((d) => {
          d.waiting = without(d.waiting, person);
          if (d.notice === person) d.notice = null;
        });
        return;
      }
      if (!s.people.includes(person) || person === me) return;
      update((d) => dropPerson(d, person));
      setSpeakingNow((ids) => without(ids, person));
      chime(false);
      toast(message ?? `${nameOf(person)} left the meeting`);
    },
    [update, chime, toast, nameOf, me]
  );

  /** Who is talking right now: the green ring, the speaker view's main tile. */
  const speaking = useCallback((ids: string[]) => {
    setSpeakingNow(ids);
    for (const id of [...ids].reverse()) recent.current = [id, ...without(recent.current, id)].slice(0, 4);
  }, []);

  /** Someone says something: they are the one speaking, and it shows as a caption when captions are on. */
  const say = useCallback(
    (person: string, text: string) => {
      speaking([person]);
      setCaption({ id: person, text });
    },
    [speaking]
  );

  const showReaction = useCallback(
    (person: string, emoji: string) => {
      const at = Date.now();
      setReactions((r) => ({ ...r, [person]: { emoji, at } }));
      later(5000, () =>
        setReactions((r) => {
          if (r[person]?.at !== at) return r;
          const next = { ...r };
          delete next[person];
          return next;
        })
      );
    },
    [later]
  );

  /** Someone sends a reaction: it pops on their tile for five seconds. */
  const react = useCallback(
    (person: string, emoji: string) => {
      if (ref.current.people.includes(person)) showReaction(person, emoji);
    },
    [showReaction]
  );

  /** Someone raises or lowers their hand. */
  const raiseHand = useCallback(
    (person: string, on: boolean) => {
      if (!ref.current.people.includes(person)) return;
      update((d) => {
        if (on) d.hands[person] = Date.now();
        else delete d.hands[person];
      });
      if (on && person !== me && ref.current.host === me) toast(`${nameOf(person)} raised their hand`);
    },
    [update, toast, nameOf, me]
  );

  /** Someone mutes or unmutes. */
  const mute = useCallback(
    (person: string, on: boolean) => void update((d) => void (d.muted = on ? withOne(d.muted, person) : without(d.muted, person))),
    [update]
  );

  /** Someone turns their camera on or off. */
  const camera = useCallback(
    (person: string, on: boolean) => void update((d) => void (d.video = on ? withOne(d.video, person) : without(d.video, person))),
    [update]
  );

  /** Someone shares a screen (`screen` is what `renderScreen` draws), or stops sharing (null). */
  const share = useCallback(
    (person: string | null, screen = "screen") => {
      if (person === null) {
        const was = ref.current.share;
        update((d) => void (d.share = null));
        if (was && was.by !== me) toast(`${nameOf(was.by)} stopped sharing`);
        return;
      }
      if (!ref.current.people.includes(person)) return;
      update((d) => void (d.share = { by: person, kind: "screen", screen, fit: true }));
      speaking([person]);
      toast(`${nameOf(person)} started screen sharing`);
    },
    [update, toast, nameOf, speaking, me]
  );

  /** A chat message from someone, to everyone or (with `to`) to one person. Resolves with its id. */
  const chat = useCallback(
    (from: string, text: string, to = "everyone", extra: { file?: { name: string; size?: string } } = {}) => {
      let id = "";
      update((d) => {
        id = pushChat(d, { from, to, text, ...extra }).id;
        if (!d.panels.chat && from !== me) d.unread += 1;
      });
      if (!ref.current.panels.chat && from !== me) toast(`${nameOf(from)}: ${text || extra.file?.name || ""}`);
      return id;
    },
    [update, pushChat, toast, nameOf, me]
  );

  /** The host ends the meeting for everyone. */
  const end = useCallback(() => {
    update((d) => {
      d.phase = "ended";
      d.recording = null;
    });
    chime(false);
  }, [update, chime]);

  // ---------- What the signed-in person does (wired by <Zoom>) ----------

  const toggleMic = useCallback(() => {
    const s = ref.current;
    if (!s.audio) {
      update((d) => {
        d.audio = true;
        d.muted = without(d.muted, me);
      });
      toast("You joined computer audio");
      emit({ type: "audio", joined: true });
      return;
    }
    const muted = !s.muted.includes(me);
    update((d) => void (d.muted = muted ? withOne(d.muted, me) : without(d.muted, me)));
    emit({ type: "mute", muted });
  }, [update, toast, emit, me]);

  const leaveAudio = useCallback(() => {
    update((d) => void (d.audio = false));
    toast("You left computer audio");
    emit({ type: "audio", joined: false });
  }, [update, toast, emit]);

  const toggleVideo = useCallback(() => {
    const on = !ref.current.video.includes(me);
    update((d) => void (d.video = on ? withOne(d.video, me) : without(d.video, me)));
    emit({ type: "video", on });
  }, [update, emit, me]);

  const startShare = useCallback(
    (screen: string) => {
      const prev = ref.current.share;
      update((d) => void (d.share = { by: me, kind: "screen", screen, paused: false, annotate: false }));
      if (prev && prev.by !== me) toast(`You started sharing. ${nameOf(prev.by)}'s share has stopped.`);
      emit({ type: "share", action: "start", screen });
    },
    [update, toast, nameOf, emit, me]
  );

  const startWhiteboard = useCallback(
    (board: ZoomWhiteboard) => {
      update((d) => void (d.share = { by: me, kind: "whiteboard", screen: "whiteboard", title: board.title, notes: (board.notes ?? []).map((n) => ({ ...n })), annotate: true }));
      toast("You are sharing a whiteboard");
      emit({ type: "share", action: "start", whiteboard: board.title });
    },
    [update, toast, emit, me]
  );

  const stopShare = useCallback(() => {
    const was = ref.current.share;
    if (!was) return;
    update((d) => void (d.share = null));
    toast(was.kind === "whiteboard" ? "You stopped sharing the whiteboard" : "You stopped sharing your screen");
    emit({ type: "share", action: "stop" });
  }, [update, toast, emit]);

  const pauseShare = useCallback(() => {
    const paused = !ref.current.share?.paused;
    update((d) => void (d.share && (d.share.paused = paused)));
    toast(paused ? "Screen sharing paused" : "Screen sharing resumed");
    emit({ type: "share", action: paused ? "pause" : "resume" });
  }, [update, toast, emit]);

  /** Viewing options of the share on screen: annotate, fit to window, side-by-side. */
  const shareOption = useCallback(
    (patch: Pick<ZoomShare, "annotate" | "fit" | "sideBySide">) => void update((d) => void (d.share && Object.assign(d.share, patch))),
    [update]
  );

  const addSticky = useCallback(() => {
    const colors = ["#fff3a8", "#c9f2d6", "#d6e4ff", "#ffd9c7"];
    const first = people[me].name.split(" ")[0];
    update((d) => {
      d.share?.notes?.push({ x: 180 + Math.random() * 800, y: 140 + Math.random() * 460, color: colors[Math.floor(Math.random() * 4)], tilt: Math.round(Math.random() * 6 - 3), by: first, text: "New idea" });
    });
  }, [update, people, me]);

  const record = useCallback(
    (action: "start" | "pause" | "stop" | "ask", kind: "local" | "cloud" = "local") => {
      const r = ref.current.recording;
      if (action === "ask") {
        toast(`Asked ${nameOf(ref.current.host)} for permission to record`);
        emit({ type: "record", action: "ask" });
      } else if (action === "start") {
        update((d) => {
          d.recording = { kind, paused: false };
          pushChat(d, { from: me, system: true, text: kind === "cloud" ? "This meeting is being recorded to the cloud" : "This meeting is being recorded" });
        });
        toast(kind === "cloud" ? "Recording to the cloud" : "Recording on this computer");
        emit({ type: "record", action: "start", kind });
      } else if (action === "pause" && r) {
        update((d) => void (d.recording && (d.recording.paused = !r.paused)));
        toast(r.paused ? "Recording resumed" : "Recording paused");
        emit({ type: "record", action: r.paused ? "resume" : "pause", kind: r.kind });
      } else if (action === "stop" && r) {
        update((d) => void (d.recording = null));
        toast(r.kind === "cloud" ? "Cloud recording stopped. You'll get an email when it's ready." : "Recording stopped. It will be converted when the meeting ends.");
        emit({ type: "record", action: "stop", kind: r.kind });
      }
    },
    [update, pushChat, toast, nameOf, emit, me]
  );

  const reactMine = useCallback(
    (emoji: string) => {
      showReaction(me, emoji);
      emit({ type: "react", emoji });
    },
    [showReaction, emit, me]
  );

  const toggleHand = useCallback(() => {
    const raised = !ref.current.hands[me];
    raiseHand(me, raised);
    toast(raised ? "You raised your hand" : "You lowered your hand");
    emit({ type: "hand", raised });
  }, [raiseHand, toast, emit, me]);

  const setFeedback = useCallback(
    (value: Feedback) => {
      const next = ref.current.feedback[me] === value ? null : value;
      update((d) => {
        if (next) d.feedback[me] = next;
        else delete d.feedback[me];
      });
      emit({ type: "feedback", value: next });
    },
    [update, emit, me]
  );

  const sendChat = useCallback(
    (text: string) => {
      const to = ref.current.chatTo;
      let id = "";
      update((d) => void (id = pushChat(d, { from: me, to, text }).id));
      emit({ type: "chat", id, text, to });
    },
    [update, pushChat, emit, me]
  );

  const setChatTo = useCallback((to: string) => void update((d) => void (d.chatTo = to)), [update]);

  const togglePanel = useCallback(
    (panel: "participants" | "chat" | "apps", narrow = false) =>
      void update((d) => {
        const was = d.panels[panel];
        if (narrow || panel === "apps") d.panels = { participants: false, chat: false, apps: false };
        else d.panels.apps = false;
        d.panels[panel] = !was;
        if (panel === "chat" && d.panels.chat) d.unread = 0;
      }),
    [update]
  );

  const openChatWith = useCallback(
    (person: string, narrow = false) =>
      void update((d) => {
        d.chatTo = person;
        if (narrow) d.panels = { participants: false, chat: true, apps: false };
        else {
          d.panels.chat = true;
          d.panels.apps = false;
        }
        d.unread = 0;
      }),
    [update]
  );

  const closePanels = useCallback((panel?: "participants" | "chat" | "apps") => {
    update((d) => {
      if (panel) d.panels[panel] = false;
      else d.panels = { participants: false, chat: false, apps: false };
    });
  }, [update]);

  const admit = useCallback(
    (person: string) => {
      join(person);
      emit({ type: "admit", person });
    },
    [join, emit]
  );

  const admitAll = useCallback(() => {
    const list = ref.current.waiting.slice();
    list.forEach((p) => join(p, { quiet: true }));
    chime(true);
    toast(`Admitted ${plural(list.length, "participant")}`);
    list.forEach((person) => emit({ type: "admit", person }));
  }, [join, chime, toast, emit]);

  const deny = useCallback(
    (person: string) => {
      update((d) => {
        d.waiting = without(d.waiting, person);
        if (d.notice === person) d.notice = null;
      });
      toast(`${nameOf(person)} was removed from the waiting room`);
      emit({ type: "deny", person });
    },
    [update, toast, nameOf, emit]
  );

  const dismissNotice = useCallback(() => void update((d) => void (d.notice = null)), [update]);

  /** The host (or anyone, for pin) acts on a participant from their tile or the participants list. */
  const participant = useCallback(
    (action: Extract<ZoomEvent, { type: "participant" }>["action"], person: string) => {
      const name = nameOf(person);
      switch (action) {
        case "mute":
          mute(person, true);
          setSpeakingNow((ids) => without(ids, person));
          break;
        case "ask-unmute":
          toast(`Asked ${name} to unmute`);
          break;
        case "ask-video":
          toast(`Asked ${name} to start video`);
          break;
        case "stop-video":
          camera(person, false);
          break;
        case "lower-hand":
          raiseHand(person, false);
          toast(`Lowered ${name}'s hand`);
          break;
        case "pin":
          update((d) => {
            d.pinned = d.pinned === person ? null : person;
            if (d.pinned) d.view = "speaker";
          });
          if (ref.current.pinned) toast(`Pinned ${name}`);
          break;
        case "spotlight":
          update((d) => {
            d.spotlight = d.spotlight === person ? null : person;
            if (d.spotlight) d.view = "speaker";
          });
          toast(ref.current.spotlight ? `Spotlighting ${name} for everyone` : "Spotlight removed");
          break;
        case "to-waiting":
          update((d) => {
            dropPerson(d, person);
            d.waiting.push(person);
          });
          toast(`${name} was moved to the waiting room`);
          break;
        case "remove":
          update((d) => dropPerson(d, person));
          chime(false);
          toast(`${name} was removed from the meeting`);
          break;
      }
      emit({ type: "participant", action, person });
    },
    [nameOf, mute, camera, raiseHand, update, toast, chime, emit]
  );

  const muteAll = useCallback(
    (allowUnmute: boolean) => {
      update((d) => {
        d.security.unmute = allowUnmute;
        for (const p of d.people) if (p !== me && p !== d.host) d.muted = withOne(d.muted, p);
      });
      setSpeakingNow([]);
      toast("All participants are muted");
      emit({ type: "mute-all", allowUnmute });
    },
    [update, toast, emit, me]
  );

  const invite = useCallback(
    (ids: string[]) => {
      toast(`Invited ${ids.map((id) => nameOf(id).split(" ")[0]).join(", ")}`);
      emit({ type: "invite", people: ids });
    },
    [toast, nameOf, emit]
  );

  const setView = useCallback(
    (view: "gallery" | "speaker") => {
      update((d) => {
        d.view = view;
        if (view !== "speaker") d.pinned = null;
      });
      toast(view === "speaker" ? "Speaker view" : "Gallery view");
      emit({ type: "view", view });
    },
    [update, toast, emit]
  );

  const toggleHideSelf = useCallback(() => {
    const hidden = !ref.current.hideSelf;
    update((d) => void (d.hideSelf = hidden));
    toast(hidden ? "Your self view is hidden. Others can still see you." : "Self view shown");
  }, [update, toast]);

  const toggleHideNonVideo = useCallback(() => void update((d) => void (d.hideNonVideo = !d.hideNonVideo)), [update]);

  const toggleCaptions = useCallback(() => {
    const on = !ref.current.captions;
    update((d) => void (d.captions = on));
    toast(on ? "Captions on" : "Captions off");
    emit({ type: "captions", on });
  }, [update, toast, emit]);

  const security = useCallback(
    (key: keyof ZoomSecurity) => {
      const on = !ref.current.security[key];
      update((d) => void (d.security[key] = on));
      const verbs: Partial<Record<keyof ZoomSecurity, string>> = { share: "share their screen", chat: "chat", rename: "rename themselves", unmute: "unmute themselves", video: "start their video" };
      toast(
        key === "locked" ? (on ? "Meeting locked. No one new can join." : "Meeting unlocked")
          : key === "waitingRoom" ? (on ? "Waiting room enabled" : "Waiting room disabled")
          : key === "hidePictures" ? (on ? "Profile pictures hidden" : "Profile pictures shown")
          : `Participants can ${on ? "now" : "no longer"} ${verbs[key]}`
      );
      emit({ type: "security", setting: key, on });
    },
    [update, toast, emit]
  );

  const suspend = useCallback(() => {
    update((d) => {
      for (const p of d.people) if (p !== me) {
        d.muted = withOne(d.muted, p);
        d.video = without(d.video, p);
      }
      if (d.share && d.share.by !== me) d.share = null;
      Object.assign(d.security, { locked: true, share: false, chat: false, unmute: false, video: false });
    });
    setSpeakingNow([]);
    toast("Participant activities suspended");
    emit({ type: "security", setting: "suspend", on: true });
  }, [update, toast, emit, me]);

  const toggleSounds = useCallback(() => {
    const on = !ref.current.sounds;
    update((d) => void (d.sounds = on));
    toast(on ? "Join and leave sounds on" : "Join and leave sounds off");
  }, [update, toast]);

  const openApp = useCallback(
    (name: string) => {
      toast(`Opening ${name}...`);
      emit({ type: "app", name });
    },
    [toast, emit]
  );

  /** The host ends it for all, or anyone leaves; as host, leaving hands the meeting to the next person. */
  const hangUp = useCallback(
    (forAll: boolean) => {
      const s = ref.current;
      const next = !forAll && s.host === me ? s.people.find((p) => p !== me) : undefined;
      update((d) => {
        d.phase = forAll ? "ended" : "left";
        d.recording = null;
        d.share = d.share?.by === me ? null : d.share;
        if (next) d.host = next;
      });
      chime(false);
      if (next) toast(`${nameOf(next)} is now the host`);
      emit({ type: forAll ? "end" : "leave" });
    },
    [update, chime, toast, nameOf, emit, me]
  );

  const rejoin = useCallback(() => {
    const next = initialState(seed, true);
    ref.current = next;
    setState(next);
    setSpeakingNow([]);
    recent.current = [];
    setCaption(null);
    chime(true);
    toast("You rejoined the meeting");
    emit({ type: "rejoin" });
  }, [seed, chime, toast, emit]);

  const ui = useMemo(
    () => ({
      toggleMic, leaveAudio, toggleVideo, startShare, startWhiteboard, stopShare, pauseShare, shareOption, addSticky,
      record, reactMine, toggleHand, setFeedback, sendChat, setChatTo, togglePanel, openChatWith, closePanels,
      admit, admitAll, deny, dismissNotice, participant, muteAll, invite, setView, toggleHideSelf, toggleHideNonVideo,
      toggleCaptions, security, suspend, toggleSounds, openApp, hangUp, rejoin, chime, emit,
    }),
    [toggleMic, leaveAudio, toggleVideo, startShare, startWhiteboard, stopShare, pauseShare, shareOption, addSticky,
      record, reactMine, toggleHand, setFeedback, sendChat, setChatTo, togglePanel, openChatWith, closePanels,
      admit, admitAll, deny, dismissNotice, participant, muteAll, invite, setView, toggleHideSelf, toggleHideNonVideo,
      toggleCaptions, security, suspend, toggleSounds, openApp, hangUp, rejoin, chime, emit]
  );

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    /** Who is talking now, and the last few who did (for speaker view). */
    speakingNow,
    recentSpeakers: recent,
    caption,
    reactions,
    notice,
    canManage,
    nameOf,
    // The world
    join,
    admitRequest,
    leave,
    speaking,
    say,
    react,
    raiseHand,
    mute,
    camera,
    share,
    chat,
    end,
    toast,
    // The signed-in person (wired by <Zoom>)
    ui,
  };
}

export type ZoomMeetingApi = ReturnType<typeof useZoom>;
