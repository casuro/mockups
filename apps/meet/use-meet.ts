import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MeetActivity,
  MeetEvent,
  MeetHostControls,
  MeetLayout,
  MeetPanel,
  MeetRoom,
  MeetSeed,
  MeetShareSource,
  MeetState,
} from "./types";

// The call behind <Meet>: its state, what the world does to it (someone
// joins, talks, reacts, raises a hand, presents, chats) and what the
// signed-in person does (mute, present, send, leave). Every change goes
// through `update`, which keeps a ref in step with React state, so calls
// made between renders (timers, awaited replies) see what the last one
// wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  /** First name, or "You". */
  first: string;
  email: string;
  color: string;
  photo?: string;
  room: MeetRoom;
}

export interface MeetOptions {
  /** A state saved from `meet.state`, to pick up where it was left. */
  restore?: MeetState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: MeetEvent) => void;
  /** Chimes when people join or leave (default true; also a switch in Settings). */
  sounds?: boolean;
}

export interface Snack {
  id: number;
  text: string;
  /** Shows their avatar. */
  who?: string;
  action?: { label: string; run: () => void };
}

export interface Float {
  id: number;
  emoji: string;
  from: string;
}

const PALETTE = ["#1a73e8", "#c5221f", "#188038", "#e37400", "#8430ce", "#007b83", "#b0006d", "#5f6368"];
const WALLS: [string, string][] = [["#d8d0c4", "#c9bfb0"], ["#e1e6ee", "#cfd7e2"], ["#d6dccf", "#c3cbb9"], ["#eadbd0", "#dcc7b8"], ["#cfd3da", "#bcc2cc"], ["#e4ddd0", "#d2c8b6"]];
const KINDS: MeetRoom["kind"][] = ["window", "art", "shelf"];
const hash = (id: string) => [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;

export const DEVICES = {
  mic: ["Default - MacBook Pro Microphone (Built-in)", "Studio Display Microphone", "AirPods Pro"],
  speaker: ["Default - MacBook Pro Speakers (Built-in)", "Studio Display Speakers", "AirPods Pro"],
  camera: ["FaceTime HD Camera", "Studio Display Camera", "Desk View Camera"],
};

const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();
const without = (list: string[], id: string) => list.filter((x) => x !== id);
const setIn = (list: string[], id: string, on: boolean) => (on ? (list.includes(id) ? list : [...list, id]) : without(list, id));

function normalizePeople(seed: MeetSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  const domain = Object.values(seed.people).find((p) => p.email)?.email?.split("@")[1] ?? "example.com";
  for (const [id, p] of Object.entries(seed.people)) {
    const h = hash(id);
    out[id] = {
      id,
      name: p.name,
      first: id === seed.me ? "You" : p.name.split(" ")[0],
      email: p.email ?? `${id}@${domain}`,
      color: p.color ?? PALETTE[h % PALETTE.length],
      photo: p.photo,
      room: p.room ?? { wall: WALLS[h % WALLS.length], side: h % 2 ? "left" : "right", kind: KINDS[(h >> 3) % KINDS.length] },
    };
  }
  if (!out[seed.me]) throw new Error(`Meet: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function initialState(seed: MeetSeed): MeetState {
  let seq = 0;
  return {
    version: 1,
    view: "call",
    mic: seed.mic ?? true,
    camera: seed.camera ?? true,
    inCall: seed.inCall.filter((p) => p !== seed.me),
    video: seed.video ?? [],
    muted: seed.muted ?? [],
    hands: seed.hands ?? [],
    presenter: seed.presenter ?? null,
    sharing: null,
    chat: (seed.chat ?? []).map((m) => ({ id: m.id ?? `c${++seq}`, from: m.from, text: m.text, at: toTime(m.at) })),
    unread: 0,
    panel: null,
    activity: null,
    layout: "auto",
    pinned: null,
    hideNoVideo: false,
    captions: false,
    recording: false,
    transcript: false,
    poll: null,
    questions: (seed.questions ?? []).map((q) => ({ id: q.id ?? `q${++seq}`, from: q.from, text: q.text, votes: q.votes ?? 0, mine: false })),
    background: "none",
    filter: "none",
    device: { mic: 0, speaker: 0, camera: 0 },
    host: { mgmt: true, share: true, chat: true, react: true, mic: true, video: true, access: "trusted" },
    chimes: true,
    leaveEmpty: false,
    rating: 0,
    theme: seed.theme ?? "light",
    seq,
  };
}

export function useMeet(seed: MeetSeed, options: MeetOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const devices = useMemo(
    () => ({ mic: seed.devices?.mic ?? DEVICES.mic, speaker: seed.devices?.speaker ?? DEVICES.speaker, camera: seed.devices?.camera ?? DEVICES.camera }),
    [seed]
  );
  const [state, setState] = useState<MeetState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [speakingIds, setSpeaking] = useState<string[]>([]);
  const [dominant, setDominant] = useState<string | null>(null);
  const domAt = useRef(0);
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [notif, setNotif] = useState<{ from: string; text: string; n: number } | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [caption, setCaption] = useState<{ who: string; text: string; n: number } | null>(null);
  const uid = useRef(0);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => () => void audio.current?.close().catch(() => {}), []);

  const update = useCallback((fn: (draft: MeetState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: MeetEvent) => opts.current.onEvent?.(event), []);

  const name = useCallback((id: string) => people[id]?.name ?? id, [people]);

  /** A snackbar at the bottom left, with an optional avatar and action. */
  const snack = useCallback((text: string, o: { who?: string; action?: Snack["action"] } = {}) => {
    const id = ++uid.current;
    setSnacks((list) => [...list, { id, text, ...o }].slice(-3));
    return id;
  }, []);
  const dismiss = useCallback((id: number) => setSnacks((list) => list.filter((s) => s.id !== id)), []);

  const chime = useCallback((up = true, force = false) => {
    if (!force && (opts.current.sounds === false || !ref.current.chimes)) return;
    if (typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try {
      const ctx = (audio.current ??= new AudioContext());
      (up ? [659.25, 880] : [880, 587.33]).forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime + i * 0.12;
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.start(t);
        o.stop(t + 0.4);
      });
    } catch {
      // Sound is a nicety.
    }
  }, []);

  const float = useCallback((emoji: string, from: string) => {
    const id = ++uid.current;
    setFloats((list) => [...list, { id, emoji, from }]);
    setTimeout(() => setFloats((list) => list.filter((f) => f.id !== id)), 4300);
  }, []);

  const inCall = () => ref.current.view === "call";

  const openPanelRef = useRef<(panel: MeetPanel | null) => void>(() => {});

  // ---------- What the world does ----------

  const world = useMemo(
    () => ({
      /** Someone joins the call (camera on and mic on by default). */
      join(person: string, o: { video?: boolean; muted?: boolean } = {}) {
        if (!people[person]) throw new Error(`Meet: no person "${person}" in seed.people`);
        if (person === me || ref.current.inCall.includes(person)) return;
        update((s) => {
          s.inCall.push(person);
          s.video = setIn(s.video, person, o.video ?? true);
          s.muted = setIn(s.muted, person, o.muted ?? false);
        });
        if (inCall()) {
          snack(`${name(person)} joined`, { who: person });
          chime(true);
        }
      },
      /** Someone leaves; their hand goes down and their presentation stops. */
      leave(person: string) {
        if (!ref.current.inCall.includes(person)) return;
        update((s) => {
          s.inCall = without(s.inCall, person);
          s.hands = without(s.hands, person);
          if (s.presenter === person) s.presenter = null;
          if (s.pinned === person) s.pinned = null;
        });
        setSpeaking((ids) => without(ids, person));
        if (inCall()) {
          snack(`${name(person)} left the meeting`, { who: person });
          chime(false);
        }
      },
      /** Who is talking right now: the blue ring and moving bars on their tile. Include `me` for the signed-in person (shown only while their mic is on). */
      speaking(ids: string[]) {
        setSpeaking(ids);
        const lead = ids.find((id) => id !== me);
        if (lead && Date.now() - domAt.current > 5000) {
          setDominant((d) => {
            if (d !== lead) domAt.current = Date.now();
            return lead;
          });
        }
      },
      /** A line of captions from someone: shown word by word while captions are on. */
      caption(person: string, text: string) {
        setCaption((c) => ({ who: person, text, n: (c?.n ?? 0) + 1 }));
      },
      /** Someone sends a reaction: it floats up the left of the stage. */
      react(person: string, emoji: string) {
        if (inCall()) float(emoji, person);
      },
      /** Someone raises (or lowers) their hand. */
      raiseHand(person: string, on = true) {
        if (on && (!ref.current.inCall.includes(person) || ref.current.hands.includes(person))) return;
        update((s) => void (s.hands = setIn(s.hands, person, on)));
        if (on && inCall()) snack(`${name(person)} raised a hand`, { who: person, action: { label: "Open queue", run: () => openPanelRef.current("people") } });
      },
      /** Someone starts presenting (the stage shows `renderScreen`), or presenting stops (null). */
      present(person: string | null) {
        const was = ref.current.presenter;
        update((s) => {
          s.presenter = person;
          if (person !== me) s.sharing = null;
        });
        if (!person && was && was !== me && inCall()) snack(`${name(was)} stopped presenting`, { who: was });
      },
      /** A chat message from someone. Shows a preview and a dot on the chat button when the chat is closed. Returns its id. */
      chat(person: string, text: string) {
        // An empty message (a reply nobody needed to write) delivers nothing.
        if (!text?.trim()) return "";
        let id = "";
        let hidden = false;
        update((s) => {
          id = `c${++s.seq}`;
          s.chat.push({ id, from: person, text, at: Date.now() });
          hidden = s.panel !== "chat";
          if (hidden) s.unread += 1;
        });
        if (hidden && inCall()) setNotif((n) => ({ from: person, text, n: (n?.n ?? 0) + 1 }));
        return id;
      },
      /** Someone mutes or unmutes, or turns their camera on or off. */
      media(person: string, o: { muted?: boolean; video?: boolean }) {
        update((s) => {
          if (o.muted !== undefined) s.muted = setIn(s.muted, person, o.muted);
          if (o.video !== undefined) s.video = setIn(s.video, person, o.video);
        });
      },
      /** Someone votes in the live poll, for option `index`. */
      vote(index: number) {
        update((s) => {
          const o = s.poll?.options[index];
          if (o) o.votes += 1;
        });
      },
      /** Someone asks a question in Q&A. Returns its id. */
      ask(person: string, text: string) {
        let id = "";
        update((s) => {
          id = `q${++s.seq}`;
          s.questions.push({ id, from: person, text, votes: 0, mine: false });
        });
        return id;
      },
      /** Others upvote a question. */
      upvote(id: string, count = 1) {
        update((s) => {
          const q = s.questions.find((x) => x.id === id);
          if (q) q.votes += count;
        });
      },
      /** A snackbar at the bottom left, with `who`'s avatar. */
      toast(text: string, o: { who?: string } = {}) {
        snack(text, o);
      },
    }),
    [people, me, update, snack, chime, float, name]
  );

  // ---------- What the signed-in person does (wired by <Meet>) ----------

  const ui = useMemo(() => {
    const presentingOther = () => {
      const p = ref.current.presenter;
      return p && p !== me ? p : null;
    };
    const openPanel = (panel: MeetPanel | null) => {
      const next = ref.current.panel === panel ? null : panel;
      update((s) => {
        s.panel = next;
        s.activity = null;
        if (next === "chat") s.unread = 0;
      });
      if (next === "chat") setNotif(null);
      emit({ type: "panel", panel: next });
    };
    const stopPresenting = (quiet = false) => {
      if (ref.current.presenter !== me) return;
      update((s) => {
        s.presenter = null;
        s.sharing = null;
      });
      if (!quiet) snack("You stopped presenting");
      emit({ type: "present", on: false });
    };
    const toggleHand = () => {
      const raised = !ref.current.hands.includes(me);
      update((s) => void (s.hands = setIn(s.hands, me, raised)));
      if (raised) snack("Hand raised", { action: { label: "Lower hand", run: () => ref.current.hands.includes(me) && toggleHand() } });
      else snack("Hand lowered");
      emit({ type: "hand", raised });
    };
    return {
      emit,
      snack,
      dismiss,
      openPanel,
      setMic(on: boolean) {
        update((s) => void (s.mic = on));
        emit({ type: "mic", on });
      },
      setCamera(on: boolean) {
        update((s) => void (s.camera = on));
        emit({ type: "camera", on });
      },
      toggleHand,
      react(emoji: string) {
        float(emoji, me);
        emit({ type: "react", emoji });
      },
      present(source: MeetShareSource) {
        const other = presentingOther();
        if (source === "whiteboard" && ref.current.sharing === "whiteboard") return;
        update((s) => {
          s.presenter = me;
          s.sharing = source;
        });
        if (other) snack(`You took over presenting from ${name(other)}`);
        snack(source === "whiteboard" ? "Whiteboard opened. Everyone in the call can see it." : "You are presenting to everyone");
        emit({ type: "present", on: true, source });
      },
      stopPresenting,
      sendChat(text: string) {
        let id = "";
        update((s) => {
          id = `c${++s.seq}`;
          s.chat.push({ id, from: me, text, at: Date.now() });
        });
        emit({ type: "chat", text, id });
      },
      toggleCaptions() {
        const on = !ref.current.captions;
        update((s) => void (s.captions = on));
        emit({ type: "captions", on });
      },
      setLayout(layout: MeetLayout) {
        update((s) => {
          s.layout = layout;
          s.pinned = null;
        });
        emit({ type: "layout", layout, hideNoVideo: ref.current.hideNoVideo });
      },
      toggleHideNoVideo() {
        update((s) => void (s.hideNoVideo = !s.hideNoVideo));
        emit({ type: "layout", layout: ref.current.layout, hideNoVideo: ref.current.hideNoVideo });
      },
      pin(person: string, announce = true) {
        const next = ref.current.pinned === person ? null : person;
        update((s) => void (s.pinned = next));
        if (announce) snack(next ? `Pinned ${next === me ? "yourself" : name(next)}` : "Unpinned");
        emit({ type: "pin", person: next });
      },
      openActivity(activity: MeetActivity | null) {
        update((s) => void (s.activity = activity));
      },
      toggleRecording() {
        const on = !ref.current.recording;
        update((s) => void (s.recording = on));
        snack(on ? "Recording started. Everyone in the call has been notified." : "Recording stopped. It will be saved to Google Drive.");
        emit({ type: "record", on });
      },
      toggleTranscript() {
        const on = !ref.current.transcript;
        update((s) => void (s.transcript = on));
        snack(on ? "Transcript started" : "Transcript stopped. It will be saved to Google Docs.");
        emit({ type: "transcript", on });
      },
      launchPoll(question: string, options: string[]) {
        update((s) => void (s.poll = { question, options: options.map((text) => ({ text, votes: 0 })), mine: null }));
        snack("Poll launched");
        emit({ type: "poll", action: "launch", question, options });
      },
      votePoll(index: number) {
        const s = update((d) => {
          const p = d.poll;
          if (!p) return;
          if (p.mine !== null) p.options[p.mine].votes -= 1;
          p.mine = p.mine === index ? null : index;
          if (p.mine !== null) p.options[index].votes += 1;
        });
        if (s.poll) emit({ type: "poll", action: "vote", question: s.poll.question, options: s.poll.options.map((o) => o.text), choice: s.poll.mine });
      },
      endPoll() {
        const p = ref.current.poll;
        update((s) => void (s.poll = null));
        snack("Poll ended");
        if (p) emit({ type: "poll", action: "end", question: p.question, options: p.options.map((o) => o.text) });
      },
      askQuestion(text: string) {
        let id = "";
        update((s) => {
          id = `q${++s.seq}`;
          s.questions.push({ id, from: me, text, votes: 0, mine: false });
        });
        emit({ type: "question", action: "ask", id, text });
      },
      upvoteQuestion(id: string) {
        let text = "";
        update((s) => {
          const q = s.questions.find((x) => x.id === id);
          if (!q) return;
          q.mine = !q.mine;
          q.votes += q.mine ? 1 : -1;
          text = q.text;
        });
        emit({ type: "question", action: "upvote", id, text });
      },
      invite(person: string) {
        snack(`Calling ${name(person)}...`, { who: person });
        emit({ type: "person", action: "invite", person });
      },
      mute(person: string) {
        update((s) => void (s.muted = setIn(s.muted, person, true)));
        snack(`You muted ${name(person)}`);
        emit({ type: "person", action: "mute", person });
      },
      remove(person: string) {
        world.leave(person);
        emit({ type: "person", action: "remove", person });
      },
      lowerHand(person: string) {
        update((s) => void (s.hands = without(s.hands, person)));
        emit({ type: "person", action: "lower-hand", person });
      },
      lowerAll() {
        update((s) => void (s.hands = []));
        snack("All hands lowered");
        emit({ type: "lower-all" });
      },
      setHost<K extends keyof MeetHostControls>(key: K, value: MeetHostControls[K]) {
        update((s) => void (s.host[key] = value));
        if (key === "access") snack(`Meeting access set to ${String(value)[0].toUpperCase()}${String(value).slice(1)}`);
        emit({ type: "action", kind: "setting", label: `host.${key}=${String(value)}` });
      },
      setEffect(kind: "background" | "filter", id: string) {
        update((s) => {
          s[kind] = id;
          s.camera = true;
        });
        emit({ type: "action", kind: "setting", label: `${kind}=${id}` });
      },
      setDevice(kind: "mic" | "speaker" | "camera", index: number) {
        update((s) => void (s.device[kind] = index));
        snack(`Switched to ${devices[kind][index]}`);
        emit({ type: "action", kind: "device", label: devices[kind][index] });
      },
      setSetting(key: "chimes" | "leaveEmpty" | "dark", on: boolean) {
        update((s) => {
          if (key === "dark") s.theme = on ? "dark" : "light";
          else s[key] = on;
        });
        emit({ type: "action", kind: "setting", label: `${key}=${on}` });
      },
      testSpeaker() {
        chime(true, true);
        snack(`Playing test sound on ${devices.speaker[ref.current.device.speaker]}`);
      },
      leave() {
        update((s) => {
          s.view = "left";
          s.rating = 0;
          s.hands = without(s.hands, me);
          if (s.presenter === me) s.presenter = null;
          s.sharing = null;
        });
        setSnacks([]);
        setNotif(null);
        chime(false);
        emit({ type: "leave" });
      },
      rejoin() {
        update((s) => {
          Object.assign(s, { view: "call", panel: null, activity: null, pinned: null, unread: 0, captions: false, recording: false, transcript: false, poll: null, rating: 0 });
        });
        chime(true);
        emit({ type: "rejoin" });
      },
      rate(stars: number) {
        update((s) => void (s.rating = stars));
        emit({ type: "rate", stars });
      },
    };
  }, [me, update, emit, snack, dismiss, float, name, chime, devices, world]);
  openPanelRef.current = ui.openPanel;

  // The signed-in person only shows as speaking while their mic is on.
  const speakers = useMemo(
    () => speakingIds.filter((id) => (id === me ? state.mic : state.inCall.includes(id))),
    [speakingIds, me, state.mic, state.inCall]
  );

  return {
    seed,
    people,
    me,
    devices,
    /** Save this and pass it back as `restore`. */
    state,
    /** Who is talking now, as told by `speaking()`. */
    speakers,
    /** The person who spoke most recently (changes at most every 5s): who spotlight and sidebar show. */
    dominant,
    snacks,
    notif,
    floats,
    /** The latest line from `caption()`. */
    captionLine: caption,
    // The world
    ...world,
    // The signed-in person (wired by <Meet>)
    ui,
  };
}

export type MeetCall = ReturnType<typeof useMeet>;
