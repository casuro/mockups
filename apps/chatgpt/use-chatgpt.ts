import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatGPTAnswer,
  ChatGPTAnswerInput,
  ChatGPTChat,
  ChatGPTChatInput,
  ChatGPTEvent,
  ChatGPTFile,
  ChatGPTImage,
  ChatGPTMessage,
  ChatGPTMessageInput,
  ChatGPTModel,
  ChatGPTRegenerate,
  ChatGPTSeed,
  ChatGPTSource,
  ChatGPTState,
  ChatGPTThought,
  ChatGPTTool,
} from "./types";

// The app behind <ChatGPT>: its state, what the world does to it (answer a
// prompt, add a chat, put words in the composer) and what the signed-in
// person does (send, edit, try again, stop, rate, rename, archive). Every
// change goes through `update`, which keeps a ref in step with React state,
// so calls made between renders (timers, awaited replies) see what the last
// one wrote. Every function it returns is stable across renders.

export interface ChatGPTOptions {
  /** A state saved from `chatgpt.state`, to pick up where it was left. */
  restore?: ChatGPTState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: ChatGPTEvent) => void;
}

export interface StatusStep {
  text: string;
  /** Smaller grey text after it: "Reading 12 sources". */
  sub?: string;
  /** How long it shows. Default 1100 (1500 for a single status given as a string). */
  ms?: number;
}

export interface RespondOptions {
  /** Write the answer out word by word, with the pulsing cursor. Default true. */
  stream?: boolean;
  /** Shimmering status shown before the answer starts: "Thinking", or steps in turn. */
  status?: string | StatusStep[];
  /** "Thought for Ns" above the answer. `true` counts the seconds since the prompt was sent. */
  thought?: ChatGPTThought | true;
  sources?: ChatGPTSource[];
  /** A generated picture: "Creating image" with a slow reveal, then the picture. */
  image?: ChatGPTImage;
  /** How long the image takes to appear, in ms. Default 4800. */
  imageMs?: number;
  followups?: string[];
  /** The model that wrote it; the one picked in the top bar by default. */
  model?: string;
  /** The chat's title, when it is still "New chat". From the first prompt by default. */
  title?: string;
  /** Answer this assistant message (a pending reply's id); the chat's pending reply by default. */
  to?: string;
}

export interface RespondResult {
  messageId: string;
  /** The person pressed stop before it finished. */
  stopped: boolean;
}

/** An answer being written: on screen only, never in the saved state. */
export interface Generation {
  chatId: string;
  messageId: string;
  /** waiting: no answer yet; status: the shimmer; image: the picture appearing; stream: the words. */
  phase: "waiting" | "status" | "image" | "stream";
  status: string;
  sub: string;
  shown: string;
}

export interface Toast {
  id: number;
  text: string;
  icon?: "check" | "archive" | "trash" | "folder" | "download";
}

export const DEFAULT_MODELS: ChatGPTModel[] = [
  { id: "auto", name: "Auto", description: "Decides how long to think", label: "5" },
  { id: "instant", name: "Instant", description: "Answers right away", label: "5 Instant" },
  { id: "thinking", name: "Thinking", description: "Thinks longer for better answers", label: "5 Thinking" },
  { id: "pro", name: "Pro", description: "Research-grade intelligence", label: "5 Pro" },
  { id: "4o", name: "GPT-4o", legacy: true },
  { id: "4.1", name: "GPT-4.1", legacy: true },
  { id: "o3", name: "o3", legacy: true },
];

const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

export const fileType = (f: ChatGPTFile) => (f.type ?? f.name.split(".").pop() ?? "").toLowerCase();

export const cur = <M extends ChatGPTMessage>(m: M) => m.versions[m.v] as M["versions"][number];
export const textOf = (m: ChatGPTMessage) => cur(m).text || "";

/** A short title from a prompt: its first few words, without the filler ("Can you write me a..."). */
export function titleFrom(prompt: string) {
  let words = prompt.replace(/[^\w\s'-]/g, " ").trim().split(/\s+/);
  while (words.length > 1 && /^(a|an|the|please|can|could|you|create|draw|make|generate|give|me|write|help|i|need|to)$/i.test(words[0])) words.shift();
  words = words.slice(0, 5);
  while (words.length > 1 && /^(a|an|the|for|of|to|in|on|with|and|or|at|by|from|my|our|is)$/i.test(words[words.length - 1])) words.pop();
  const t = words.join(" ");
  return t ? t[0].toUpperCase() + t.slice(1) : "New chat";
}

function initialState(seed: ChatGPTSeed): ChatGPTState {
  let seq = 0;
  const answer = (a: ChatGPTAnswerInput): ChatGPTAnswer => ({ ...a, tail: null });
  const message = (m: ChatGPTMessageInput): ChatGPTMessage => {
    const id = m.id ?? `s${++seq}`;
    if (m.role === "user") return { id, role: "user", v: 0, versions: [{ text: m.text, files: m.files ?? [], tail: null }] };
    const versions = "versions" in m ? m.versions.map(answer) : [answer(m)];
    const v = "versions" in m ? Math.min(m.v ?? versions.length - 1, versions.length - 1) : 0;
    return { id, role: "assistant", v, versions, feedback: m.feedback ?? null };
  };
  const models = seed.models ?? DEFAULT_MODELS;
  return {
    version: 1,
    chats: (seed.chats ?? []).map((c) => chatOf(c, message)),
    projects: (seed.projects ?? []).map((p) => ({ ...p, open: !!p.open })),
    pinned: (seed.gpts ?? []).filter((g) => g.pinned).map((g) => g.id),
    chat: seed.open ?? null,
    gpt: null,
    temporary: false,
    model: seed.model ?? models[0]?.id ?? "auto",
    sidebar: true,
    closed: [],
    theme: seed.theme ?? "light",
    seq,
  };
}

function chatOf(c: ChatGPTChatInput, message: (m: ChatGPTMessageInput) => ChatGPTMessage): ChatGPTChat {
  return {
    id: c.id,
    title: c.title,
    at: toTime(c.at),
    project: c.project ?? null,
    gpt: c.gpt ?? null,
    archived: !!c.archived,
    temporary: false,
    messages: (c.messages ?? []).map(message),
  };
}

export function useChatGPT(seed: ChatGPTSeed, options: ChatGPTOptions = {}) {
  const models = useMemo(() => seed.models ?? DEFAULT_MODELS, [seed]);
  const [state, setState] = useState<ChatGPTState>(() =>
    options.restore?.version === 1 ? options.restore : initialState(seed)
  );
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;

  const [gen, setGenState] = useState<Generation | null>(null);
  const genRef = useRef<{ g: Generation; full: string; t0: number; resolve?: (r: RespondResult) => void } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastN = useRef(0);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<ChatGPTFile[]>([]);
  const [tool, setTool] = useState<ChatGPTTool | null>(null);

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

  const update = useCallback((fn: (draft: ChatGPTState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: ChatGPTEvent) => opts.current.onEvent?.(event), []);

  const toast = useCallback((text: string, icon?: Toast["icon"]) => {
    const id = ++toastN.current;
    setToasts((list) => [...list, { id, text, icon }].slice(-3));
    later(() => setToasts((list) => list.filter((t) => t.id !== id)), 2820);
  }, [later]);

  const setGen = useCallback((g: Generation | null) => {
    if (genRef.current && g) genRef.current.g = g;
    setGenState(g);
  }, []);

  const findMessage = (s: ChatGPTState, chatId: string, id: string) => {
    const c = s.chats.find((x) => x.id === chatId);
    const m = c?.messages.find((x) => x.id === id);
    return c && m ? { c, m, i: c.messages.indexOf(m) } : null;
  };

  /** Ends the answer being written: all of it, or what is on screen when stopped. */
  const finish = useCallback(
    (stopped: boolean) => {
      const run = genRef.current;
      if (!run) return;
      genRef.current = null;
      const { g, full } = run;
      update((s) => {
        const found = findMessage(s, g.chatId, g.messageId);
        if (!found || found.m.role !== "assistant") return;
        const v = cur(found.m);
        v.text = stopped ? (g.phase === "stream" ? g.shown : "") : full;
        if (stopped) {
          v.stopped = true;
          if (g.phase !== "stream") delete v.image;
        }
        found.c.at = Date.now();
      });
      setGenState(null);
      run.resolve?.({ messageId: g.messageId, stopped });
    },
    [update]
  );

  /** A reply the person is waiting for: the answer's empty message, until `respond` fills it. */
  const pend = useCallback(
    (chatId: string, messageId: string) => {
      if (genRef.current) finish(false);
      const g: Generation = { chatId, messageId, phase: "waiting", status: "", sub: "", shown: "" };
      genRef.current = { g, full: "", t0: Date.now() };
      setGenState(g);
    },
    [finish]
  );

  // ---------- What the world does ----------

  /**
   * The assistant answers in `chatId`: the reply the person is waiting for,
   * or a new message. Resolves when it is all on screen, or when they stop it.
   */
  const respond = useCallback(
    (chatId: string, markdown: string, o: RespondOptions = {}): Promise<RespondResult> => {
      const s0 = ref.current;
      const chat = s0.chats.find((c) => c.id === chatId);
      if (!chat) return Promise.reject(new Error(`ChatGPT: there is no chat ${chatId}`));
      let run = genRef.current;
      let messageId: string;
      if (run && run.g.chatId === chatId && run.g.phase === "waiting" && (!o.to || o.to === run.g.messageId)) {
        messageId = run.g.messageId;
      } else {
        const last = chat.messages[chat.messages.length - 1];
        // Stopped before the answer came: it stays stopped.
        if (!o.to && last?.role === "assistant" && cur(last).stopped && !cur(last).text) return Promise.resolve({ messageId: last.id, stopped: true });
        if (o.to) {
          const m = chat.messages.find((x) => x.id === o.to);
          if (!m) return Promise.reject(new Error(`ChatGPT: no message ${o.to} in ${chatId}`));
          if (m.role === "assistant" && cur(m).stopped) return Promise.resolve({ messageId: m.id, stopped: true });
          messageId = m.id;
        } else {
          messageId = "";
          update((s) => {
            const m: ChatGPTMessage = { id: `m${++s.seq}`, role: "assistant", v: 0, versions: [{ text: "", tail: null }], feedback: null };
            messageId = m.id;
            s.chats.find((c) => c.id === chatId)!.messages.push(m);
          });
        }
        if (genRef.current) finish(false);
        const g: Generation = { chatId, messageId, phase: "waiting", status: "", sub: "", shown: "" };
        genRef.current = { g, full: "", t0: Date.now() };
      }
      run = genRef.current!;
      run.full = markdown;
      const t0 = run.t0;

      // The answer's parts, set now; its text lands as it streams.
      update((s) => {
        const found = findMessage(s, chatId, messageId);
        if (!found || found.m.role !== "assistant") return;
        const v = cur(found.m);
        v.model = o.model ?? s.model;
        if (o.sources) v.sources = o.sources;
        if (o.followups) v.followups = o.followups;
        if (o.image) v.image = o.image;
        if (found.c.title === "New chat") {
          const firstUser = found.c.messages.find((x) => x.role === "user");
          found.c.title = o.title ?? titleFrom(firstUser ? textOf(firstUser) : markdown);
        }
      });

      return new Promise<RespondResult>((resolve) => {
        const mine = genRef.current!;
        mine.resolve = resolve;
        const alive = () => genRef.current === mine;
        const g = (patch: Partial<Generation>) => setGen({ ...mine.g, ...patch });

        const steps: StatusStep[] =
          typeof o.status === "string" ? [{ text: o.status, ms: 1500 }] : o.status?.length ? o.status : o.image ? [{ text: "Getting started", ms: 700 }] : [{ text: "", ms: o.stream === false ? 0 : 420 }];
        let delay = 0;
        for (const step of steps) {
          later(() => alive() && g({ phase: "status", status: step.text, sub: step.sub ?? "" }), delay);
          delay += step.ms ?? 1100;
        }

        const stream = () => {
          if (!alive()) return;
          if (o.stream === false || !markdown) return finish(false);
          g({ phase: "stream", shown: "" });
          let pos = 0;
          const tick = () => {
            if (!alive()) return;
            // A "token" at a time: a word or a few symbols, sometimes two, like real streaming.
            const rest = markdown.slice(pos);
            const a = rest.match(/^(\s*\S{1,7})/);
            let step = a ? a[1].length : rest.length;
            if (Math.random() < 0.35) {
              const b = rest.slice(step).match(/^(\s*\S{1,7})/);
              if (b) step += b[1].length;
            }
            pos = Math.min(markdown.length, pos + step);
            g({ phase: "stream", shown: markdown.slice(0, pos) });
            if (pos >= markdown.length) return finish(false);
            later(tick, 18 + Math.random() * 30);
          };
          tick();
        };

        later(() => {
          if (!alive()) return;
          if (o.thought) {
            const thought = o.thought === true ? { seconds: Math.max(1, Math.round((Date.now() - t0) / 1000)) } : o.thought;
            update((s) => {
              const found = findMessage(s, chatId, messageId);
              if (found?.m.role === "assistant") cur(found.m).thought = thought;
            });
          }
          if (o.image) {
            g({ phase: "image", status: "Creating image", sub: "" });
            later(stream, o.imageMs ?? 4800);
          } else stream();
        }, delay);
      });
    },
    [update, finish, later, setGen]
  );

  /** A chat lands in the history (or replaces the one with its id). */
  const appendChat = useCallback(
    (chat: ChatGPTChatInput) =>
      void update((s) => {
        const make = (m: ChatGPTMessageInput): ChatGPTMessage => {
          const id = m.id ?? `m${++s.seq}`;
          if (m.role === "user") return { id, role: "user", v: 0, versions: [{ text: m.text, files: m.files ?? [], tail: null }] };
          const versions = ("versions" in m ? m.versions : [m]).map((a) => ({ ...a, tail: null }));
          return { id, role: "assistant", v: "versions" in m ? (m.v ?? versions.length - 1) : 0, versions, feedback: m.feedback ?? null };
        };
        const c = chatOf(chat, make);
        const i = s.chats.findIndex((x) => x.id === chat.id);
        if (i >= 0) s.chats[i] = c;
        else s.chats.push(c);
      }),
    [update]
  );

  /** Show a chat, or a new chat (null). */
  const open = useCallback(
    (chatId: string | null) =>
      void update((s) => {
        s.chat = chatId && s.chats.some((c) => c.id === chatId) ? chatId : null;
        const c = s.chats.find((x) => x.id === s.chat);
        s.gpt = c?.gpt ?? null;
        s.temporary = false;
        const p = c?.project ? s.projects.find((x) => x.id === c.project) : null;
        if (p) p.open = true;
      }),
    [update]
  );

  const rename = useCallback(
    (chatId: string, title: string) =>
      void update((s) => {
        const c = s.chats.find((x) => x.id === chatId);
        if (c && title.trim()) c.title = title.trim();
      }),
    [update]
  );

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  // ---------- What the signed-in person does (wired by <ChatGPT>) ----------

  const send = useCallback(
    (text: string, attachments: ChatGPTFile[] = [], withTool: ChatGPTTool | null = null) => {
      const s0 = ref.current;
      if (genRef.current || (!text.trim() && !attachments.length)) return;
      let chatId = "";
      let messageId = "";
      let replyId = "";
      const fresh = !s0.chat;
      const next = update((s) => {
        let c = s.chats.find((x) => x.id === s.chat);
        if (!c) {
          c = { id: `c${++s.seq}`, title: "New chat", at: Date.now(), project: null, gpt: s.gpt, archived: false, temporary: s.temporary, messages: [] };
          s.chats.push(c);
          s.chat = c.id;
        }
        chatId = c.id;
        messageId = `m${++s.seq}`;
        replyId = `m${++s.seq}`;
        c.messages.push({ id: messageId, role: "user", v: 0, versions: [{ text: text.trim(), files: attachments, tail: null }] });
        c.messages.push({ id: replyId, role: "assistant", v: 0, versions: [{ text: "", model: s.model, tail: null }], feedback: null });
        c.at = Date.now();
      });
      pend(chatId, replyId);
      const c = next.chats.find((x) => x.id === chatId)!;
      emit({ type: "prompt", chatId, messageId, text: text.trim(), model: next.model, tool: withTool, attachments, gpt: c.gpt, project: c.project, temporary: c.temporary, fresh });
    },
    [update, pend, emit]
  );

  const edit = useCallback(
    (messageId: string, text: string) => {
      const chatId = ref.current.chat;
      const value = text.trim();
      if (!chatId || !value || genRef.current) return;
      const found = findMessage(ref.current, chatId, messageId);
      if (!found || found.m.role !== "user" || textOf(found.m) === value) return;
      let replyId = "";
      const next = update((s) => {
        const { c, m, i } = findMessage(s, chatId, messageId)!;
        if (m.role !== "user") return;
        cur(m).tail = c.messages.slice(i + 1);
        m.versions.push({ text: value, files: cur(m).files, tail: null });
        m.v = m.versions.length - 1;
        c.messages.length = i + 1;
        replyId = `m${++s.seq}`;
        c.messages.push({ id: replyId, role: "assistant", v: 0, versions: [{ text: "", model: s.model, tail: null }], feedback: null });
        c.at = Date.now();
      });
      pend(chatId, replyId);
      emit({ type: "edit", chatId, messageId, text: value, model: next.model });
    },
    [update, pend, emit]
  );

  const regenerate = useCallback(
    (messageId: string, mode: ChatGPTRegenerate) => {
      const chatId = ref.current.chat;
      if (!chatId || genRef.current) return;
      let prompt = "";
      const next = update((s) => {
        const found = findMessage(s, chatId, messageId);
        if (!found || found.m.role !== "assistant") return;
        const { c, m, i } = found;
        const prev = c.messages[i - 1];
        prompt = prev ? textOf(prev) : "";
        cur(m).tail = c.messages.slice(i + 1);
        c.messages.length = i + 1;
        m.versions.push({ text: "", model: s.model, tail: null });
        m.v = m.versions.length - 1;
        m.feedback = null;
      });
      pend(chatId, messageId);
      emit({ type: "regenerate", chatId, messageId, prompt, mode, model: next.model });
    },
    [update, pend, emit]
  );

  const stop = useCallback(() => {
    const run = genRef.current;
    if (!run) return;
    const { chatId, messageId } = run.g;
    finish(true);
    emit({ type: "stop", chatId, messageId });
  }, [finish, emit]);

  /** Show another version of a message: the conversation after it switches to that version's branch. */
  const switchVersion = useCallback(
    (messageId: string, dir: -1 | 1) => {
      const chatId = ref.current.chat;
      if (!chatId || genRef.current) return;
      update((s) => {
        const found = findMessage(s, chatId, messageId);
        if (!found) return;
        const { c, m, i } = found;
        const w = m.v + dir;
        if (w < 0 || w >= m.versions.length) return;
        cur(m).tail = c.messages.slice(i + 1);
        m.v = w;
        c.messages.length = i + 1;
        c.messages.push(...(cur(m).tail ?? []));
      });
    },
    [update]
  );

  const feedback = useCallback(
    (messageId: string, value: "up" | "down" | null, reason?: string) => {
      const chatId = ref.current.chat;
      if (!chatId) return;
      update((s) => {
        const found = findMessage(s, chatId, messageId);
        if (found?.m.role === "assistant") found.m.feedback = value;
      });
      emit({ type: "feedback", chatId, messageId, value, ...(reason ? { reason } : {}) });
    },
    [update, emit]
  );

  const openChat = useCallback(
    (chatId: string) => {
      open(chatId);
      emit({ type: "open", chatId });
    },
    [open, emit]
  );

  const newChat = useCallback(
    (gpt: string | null = null) => {
      update((s) => {
        s.chat = null;
        s.gpt = gpt;
        s.temporary = false;
      });
      setTool(null);
      emit({ type: "new-chat", gpt, temporary: false });
    },
    [update, emit]
  );

  const setTemporary = useCallback(
    (on: boolean) => {
      update((s) => void (s.temporary = on));
      if (on) emit({ type: "new-chat", gpt: ref.current.gpt, temporary: true });
    },
    [update, emit]
  );

  const renameChat = useCallback(
    (chatId: string, title: string) => {
      const c = ref.current.chats.find((x) => x.id === chatId);
      if (!c || !title.trim() || c.title === title.trim()) return;
      rename(chatId, title);
      emit({ type: "rename", chatId, title: title.trim() });
    },
    [rename, emit]
  );

  const archive = useCallback(
    (chatId: string) => {
      update((s) => {
        const c = s.chats.find((x) => x.id === chatId);
        if (c) c.archived = true;
        if (s.chat === chatId) s.chat = null;
      });
      toast("Chat archived", "archive");
      emit({ type: "archive", chatId });
    },
    [update, toast, emit]
  );

  const remove = useCallback(
    (chatId: string) => {
      if (genRef.current?.g.chatId === chatId) {
        const run = genRef.current;
        genRef.current = null;
        setGenState(null);
        run.resolve?.({ messageId: run.g.messageId, stopped: true });
      }
      update((s) => {
        s.chats = s.chats.filter((x) => x.id !== chatId);
        if (s.chat === chatId) s.chat = null;
      });
      toast("Chat deleted", "trash");
      emit({ type: "delete", chatId });
    },
    [update, toast, emit]
  );

  const move = useCallback(
    (chatId: string, project: string | null) => {
      const p = project ? ref.current.projects.find((x) => x.id === project) : null;
      update((s) => {
        const c = s.chats.find((x) => x.id === chatId);
        if (c) c.project = project;
        const sp = s.projects.find((x) => x.id === project);
        if (sp) sp.open = true;
      });
      toast(p ? `Moved to ${p.name}` : "Removed from project", p ? "folder" : undefined);
      emit({ type: "move", chatId, project });
    },
    [update, toast, emit]
  );

  const setModel = useCallback(
    (model: string) => {
      update((s) => void (s.model = model));
      emit({ type: "model", model });
    },
    [update, emit]
  );

  const pinGpt = useCallback(
    (gpt: string) => {
      const pinned = !ref.current.pinned.includes(gpt);
      update((s) => void (s.pinned = pinned ? [...s.pinned, gpt] : s.pinned.filter((x) => x !== gpt)));
      toast(pinned ? "Added to sidebar" : "Hidden from sidebar");
      emit({ type: "pin-gpt", gpt, pinned });
    },
    [update, toast, emit]
  );

  const toggleSidebar = useCallback((open?: boolean) => void update((s) => void (s.sidebar = open ?? !s.sidebar)), [update]);
  const toggleSection = useCallback(
    (key: string) => void update((s) => void (s.closed = s.closed.includes(key) ? s.closed.filter((k) => k !== key) : [...s.closed, key])),
    [update]
  );
  const toggleProject = useCallback(
    (id: string) =>
      void update((s) => {
        const p = s.projects.find((x) => x.id === id);
        if (p) p.open = !p.open;
      }),
    [update]
  );

  const chat = state.chat ? (state.chats.find((c) => c.id === state.chat) ?? null) : null;

  return {
    seed,
    models,
    /** Save this and pass it back as `restore`. */
    state,
    /** The chat on screen, or null on a new chat. */
    chat,
    /** The answer being written, if any. */
    generating: gen,
    toasts,
    composer: { text: draft, files, tool },
    // The world
    respond,
    appendChat,
    open,
    rename,
    /** Put text in the composer (dictation, a suggestion). */
    draft: setDraft,
    toast,
    setTheme,
    // The signed-in person (wired by <ChatGPT>)
    ui: {
      send, edit, regenerate, stop, switchVersion, feedback, openChat, newChat, setTemporary, renameChat, archive, remove, move,
      setModel, pinGpt, toggleSidebar, toggleSection, toggleProject, setFiles, setTool, emit,
    },
  };
}

export type ChatGPTApp = ReturnType<typeof useChatGPT>;
