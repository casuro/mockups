import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { plain } from "./format";
import type {
  GmailAction,
  GmailCompose,
  GmailEvent,
  GmailMail,
  GmailMailInput,
  GmailMessage,
  GmailMessageInput,
  GmailRsvp,
  GmailSeed,
  GmailState,
} from "./types";

// The mailbox behind <Gmail>: its state, what the world does to it (mail
// arrives, someone replies, a notice) and what the signed-in person does
// (send, reply, archive, star, label, RSVP). Every change goes through
// `update`, which keeps a ref in step with React state, so calls made
// between renders (timers, awaited replies) see what the last one wrote.
// Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  email: string;
  color: string;
  photo?: string;
  signature?: string;
}

export interface GmailOptions {
  /** A state saved from `gmail.state`, to pick up where it was left. */
  restore?: GmailState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: GmailEvent) => void;
}

export interface NoticeAction {
  label: string;
  run: () => void;
}

/** The snackbar at the bottom left: a line of text and up to two actions (Undo, Open). */
export interface Notice {
  text: string;
  actions: NoticeAction[];
  n: number;
}

const PALETTE = ["#1a73e8", "#a142f4", "#188038", "#e37400", "#d93025", "#e52592", "#12a4af", "#f9ab00", "#3949ab", "#795548", "#5f6368", "#9aa0a6"];
/** The label colors offered in a label's menu. */
export const LABEL_COLORS = PALETTE;
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

export const lastAt = (m: GmailMail) => m.messages[m.messages.length - 1]?.at ?? 0;
/** A label and its sublabels. */
export const inLabel = (labels: string[], label: string) => labels.some((l) => l === label || l.startsWith(`${label}/`));
const HIDDEN = ["trash", "spam"];

/** The conversations the list shows for the current view, newest first. */
export function listFor(s: GmailState, people: (id: string) => Person): GmailMail[] {
  const v = s.view;
  return s.mails
    .filter((m) => {
      if (v.query) {
        const q = v.query.toLowerCase();
        const hay = [m.subject, ...m.messages.map((x) => `${people(x.from).name} ${people(x.from).email} ${plain(x.body)} ${x.attachments.join(" ")}`)].join(" ").toLowerCase();
        if (!hay.includes(q) || HIDDEN.includes(m.folder)) return false;
      } else if (v.label) {
        if (!inLabel(m.labels, v.label) || HIDDEN.includes(m.folder)) return false;
      } else if (v.folder === "inbox") {
        if (m.folder !== "inbox" || m.tab !== v.tab) return false;
      } else if (v.folder === "starred") {
        if (!m.starred || HIDDEN.includes(m.folder)) return false;
      } else if (v.folder === "important") {
        if (!m.important || HIDDEN.includes(m.folder)) return false;
      } else if (v.folder === "all") {
        if (HIDDEN.includes(m.folder)) return false;
      } else if (m.folder !== v.folder) return false;
      if (v.hasAttachment && !m.messages.some((x) => x.attachments.length)) return false;
      return true;
    })
    .sort((a, b) => lastAt(b) - lastAt(a));
}

function normalizePeople(seed: GmailSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    out[id] = { id, name: p.name, email: p.email, color: p.color ?? colorFor(id), photo: p.photo, signature: p.signature };
  if (!out[seed.me]) throw new Error(`Gmail: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function makeMessage(input: GmailMessageInput, id: string): GmailMessage {
  return { ...input, id: input.id ?? id, at: toTime(input.at), body: input.body ?? "", attachments: input.attachments ?? [], signed: input.signed !== false };
}

function makeMail(input: GmailMailInput, next: () => string): GmailMail {
  const messages = input.messages.map((m) => makeMessage(m, next())).sort((a, b) => a.at - b.at);
  const inv = input.invite;
  return {
    id: input.id ?? next(),
    subject: input.subject,
    folder: input.folder ?? "inbox",
    tab: input.tab ?? "primary",
    labels: input.labels ?? [],
    unread: !!input.unread,
    starred: !!input.starred,
    important: !!input.important,
    invite: inv ? { ...inv, start: toTime(inv.start), end: toTime(inv.end), rsvp: inv.rsvp ?? null } : null,
    messages,
  };
}

function initialState(seed: GmailSeed): GmailState {
  let seq = 0;
  const next = () => `g${++seq}`;
  const mails = seed.mails.map((m) => makeMail(m, next));
  const open = seed.open && mails.some((m) => m.id === seed.open) ? seed.open : null;
  if (open) mails.find((m) => m.id === open)!.unread = false;
  return {
    version: 1,
    view: { folder: "inbox", tab: "primary", label: null, query: "", hasAttachment: false },
    open,
    selected: [],
    expanded: [],
    reply: null,
    compose: null,
    labels: { ...(seed.labels ?? {}) },
    mails,
    tasks: (seed.tasks ?? []).map((t) => ({ id: next(), text: t.text, done: !!t.done })),
    side: null,
    navCollapsed: false,
    more: false,
    density: seed.density ?? "default",
    pane: seed.pane ?? "none",
    theme: seed.theme ?? "light",
    seq,
  };
}

export function useGmail(seed: GmailSeed, options: GmailOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<GmailState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<Notice | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const update = useCallback((fn: (draft: GmailState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: GmailEvent) => opts.current.onEvent?.(event), []);

  /** A person by id or address; someone outside `people` is shown by their address. */
  const person = useCallback(
    (id: string): Person =>
      people[id] ?? Object.values(people).find((p) => p.email === id) ?? { id, name: id, email: id, color: "#5f6368" },
    [people]
  );

  // ---------- What the world does ----------

  /** A notice at the bottom left, with optional actions ("Undo", "Open"). */
  const toast = useCallback(
    (text: string, actions: NoticeAction[] = []) => setNotice((n) => ({ text, actions, n: (n?.n ?? 0) + 1 })),
    []
  );

  /** Show a conversation (marks it read). */
  const open = useCallback(
    (id: string) => {
      const mail = ref.current.mails.find((m) => m.id === id);
      if (!mail) return;
      if (mail.folder === "drafts") {
        const first = mail.messages[0];
        update((s) => void (s.compose = { to: first?.to ?? [], subject: mail.subject, body: plain(first?.body ?? "", true), mode: "normal", draftOf: id }));
        return;
      }
      update((s) => {
        const m = s.mails.find((x) => x.id === id)!;
        m.unread = false;
        s.open = id;
        if (s.reply?.mail !== id) s.reply = null;
      });
      emit({ type: "open", id });
    },
    [update, emit]
  );

  /** Takes the list to the inbox (and a conversation's tab), then opens it. */
  const reveal = useCallback(
    (id: string) => {
      const mail = ref.current.mails.find((m) => m.id === id);
      update((s) => {
        s.view = { folder: "inbox", tab: mail?.tab ?? "primary", label: null, query: "", hasAttachment: false };
        s.selected = [];
      });
      open(id);
    },
    [update, open]
  );

  /** A new conversation arrives (in the inbox, unread, by default). Resolves with its id. */
  const receive = useCallback(
    (mail: GmailMailInput, o: { notify?: boolean } = {}) => {
      let id = "";
      const s = update((d) => {
        const m = makeMail({ unread: true, ...mail }, () => `m${++d.seq}`);
        id = m.id;
        d.mails.push(m);
      });
      const m = s.mails.find((x) => x.id === id)!;
      const from = m.messages[m.messages.length - 1]?.from;
      if (o.notify ?? m.folder === "inbox") toast(`New message from ${person(from).name}`, [{ label: "Open", run: () => reveal(id) }]);
      return id;
    },
    [update, toast, person, reveal]
  );

  /**
   * A message lands in an existing conversation, after `delay` ms: it moves
   * back to the inbox's Primary tab, unread unless it is on screen, and a
   * notice offers to open it. Resolves with the message's id, or "" when the
   * conversation no longer exists.
   */
  const reply = useCallback(
    (mailId: string, message: Omit<GmailMessageInput, "to"> & { to?: string[] }, o: { delay?: number; notify?: boolean } = {}) => {
      // An empty message (a reply nobody needed to write) delivers nothing.
      if (!message.body?.trim() && !message.attachments?.length && !message.custom) return Promise.resolve("");
      const land = () => {
        // The conversation may be gone by now (its sending undone): then nothing lands.
        if (!ref.current.mails.some((x) => x.id === mailId)) return "";
        let id = "";
        update((s) => {
          const m = s.mails.find((x) => x.id === mailId)!;
          const msg = makeMessage({ to: [me], ...message }, `m${++s.seq}`);
          id = msg.id;
          m.messages.push(msg);
          m.folder = "inbox";
          m.tab = "primary";
          m.unread = s.open !== mailId;
        });
        if (o.notify !== false) toast(`New message from ${person(message.from).name}`, [{ label: "Open", run: () => reveal(mailId) }]);
        return id;
      };
      if (o.delay && o.delay > 0)
        return new Promise<string>((resolve) => {
          const t = setTimeout(() => {
            timers.current.delete(t);
            resolve(land());
          }, o.delay);
          timers.current.add(t);
        });
      return Promise.resolve(land());
    },
    [update, me, toast, person, reveal]
  );

  /** Changes a conversation from outside: move it, flag it, relabel it. */
  const modify = useCallback(
    (id: string, patch: Partial<Pick<GmailMail, "folder" | "tab" | "labels" | "unread" | "starred" | "important">>) =>
      void update((s) => {
        const m = s.mails.find((x) => x.id === id);
        if (m) Object.assign(m, patch);
      }),
    [update]
  );

  // ---------- What the signed-in person does (wired by <Gmail>) ----------

  /** Changes what the list shows: `{ folder }`, `{ label }`, `{ tab }`, `{ query }` (search) or `{ hasAttachment }`. */
  const show = useCallback(
    (view: Partial<GmailState["view"]>) => {
      const s = update((d) => {
        d.view = { ...d.view, ...view };
        if (!d.view.query) d.view.hasAttachment = false;
        if ("folder" in view || "label" in view || "query" in view) d.open = null;
        d.selected = [];
      });
      if (view.query) emit({ type: "search", query: view.query });
      else if ("folder" in view || "label" in view || "tab" in view) emit({ type: "view", folder: s.view.folder, label: s.view.label, tab: s.view.tab });
    },
    [update, emit]
  );

  const close = useCallback(() => void update((s) => ((s.open = null), (s.reply = null))), [update]);

  /** Archive, delete, spam, snooze, read, unread, or add to Tasks; the moves can be undone. */
  const act = useCallback(
    (action: GmailAction, ids: string[]) => {
      const before = ref.current.mails.filter((m) => ids.includes(m.id)).map((m) => ({ id: m.id, folder: m.folder, unread: m.unread }));
      const n = before.length;
      if (!n) return;
      const conv = n === 1 ? "Conversation" : `${n} conversations`;
      update((s) => {
        const items = s.mails.filter((m) => ids.includes(m.id));
        for (const m of items) {
          if (action === "archive") m.folder = "archive";
          if (action === "delete") m.folder = "trash";
          if (action === "spam") m.folder = "spam";
          if (action === "snooze") m.folder = "snoozed";
          if (action === "read") m.unread = false;
          if (action === "unread") m.unread = true;
          if (action === "task") s.tasks.unshift({ id: `t${++s.seq}`, text: m.subject, done: false });
        }
        if (action === "unread" && s.open && ids.includes(s.open)) s.open = null;
        if (["archive", "delete", "spam", "snooze"].includes(action) && s.open && ids.includes(s.open)) s.open = null;
        if (action !== "task") s.selected = [];
      });
      emit({ type: "action", action, ids });
      const undo = {
        label: "Undo",
        run: () => {
          update((s) => {
            for (const b of before) {
              const m = s.mails.find((x) => x.id === b.id);
              if (m) Object.assign(m, { folder: b.folder, unread: b.unread });
            }
          });
          emit({ type: "undo", action, ids });
        },
      };
      if (action === "archive") toast(`${conv} archived.`, [undo]);
      if (action === "delete") toast(`${conv} moved to Trash.`, [undo]);
      if (action === "spam") toast(`${conv} marked as spam.`, [undo]);
      if (action === "snooze") toast(`${conv} snoozed until tomorrow, 8:00 AM.`, [undo]);
      if (action === "task") toast("Added to Tasks.", [{ label: "View", run: () => update((s) => void (s.side = "tasks")) }]);
    },
    [update, emit, toast]
  );

  const toggleStar = useCallback(
    (id: string) => {
      let starred = false;
      update((s) => {
        const m = s.mails.find((x) => x.id === id);
        if (m) starred = m.starred = !m.starred;
      });
      emit({ type: "star", id, starred });
    },
    [update, emit]
  );

  const toggleImportant = useCallback(
    (id: string) => {
      let important = false;
      update((s) => {
        const m = s.mails.find((x) => x.id === id);
        if (m) important = m.important = !m.important;
      });
      toast(important ? "Marked as important." : "Marked as not important.");
      emit({ type: "important", id, important });
    },
    [update, emit, toast]
  );

  const setSelected = useCallback((ids: string[]) => void update((s) => void (s.selected = ids)), [update]);
  const toggleSelected = useCallback(
    (id: string) => void update((s) => void (s.selected = s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id])),
    [update]
  );
  const expand = useCallback((messageId: string) => void update((s) => void s.expanded.push(messageId)), [update]);

  // Inline reply
  const replyTo = useCallback(
    (m: GmailMail) => [...m.messages].reverse().find((x) => x.from !== me)?.from ?? m.messages[0]?.to[0] ?? me,
    [me]
  );
  const startReply = useCallback((id: string) => void update((s) => void (s.reply = { mail: id, text: s.reply?.mail === id ? s.reply.text : "" })), [update]);
  const setReplyText = useCallback((text: string) => void update((s) => void (s.reply && (s.reply.text = text))), [update]);
  const cancelReply = useCallback(() => {
    update((s) => void (s.reply = null));
    toast("Draft discarded.");
  }, [update, toast]);
  const sendReply = useCallback(() => {
    const r = ref.current.reply;
    const text = r?.text.trim();
    if (!r) return;
    if (!text) return toast("Your reply is empty.");
    const mail = ref.current.mails.find((m) => m.id === r.mail);
    if (!mail) return;
    const to = replyTo(mail);
    let id = "";
    update((s) => {
      const m = s.mails.find((x) => x.id === r.mail)!;
      const msg = makeMessage({ from: me, to: [to], body: text }, `m${++s.seq}`);
      id = msg.id;
      m.messages.push(msg);
      s.reply = null;
    });
    emit({ type: "reply", mail: r.mail, id, to: [to], body: text });
    toast("Message sent.", [
      {
        label: "Undo",
        run: () => {
          update((s) => {
            const m = s.mails.find((x) => x.id === r.mail);
            if (m) m.messages = m.messages.filter((x) => x.id !== id);
            s.reply = { mail: r.mail, text };
          });
          emit({ type: "undo", action: "reply", ids: [id] });
        },
      },
    ]);
  }, [update, emit, toast, me, replyTo]);

  const rsvp = useCallback(
    (id: string, answer: GmailRsvp) => {
      update((s) => {
        const m = s.mails.find((x) => x.id === id);
        if (m?.invite) m.invite.rsvp = answer;
      });
      toast(`RSVP sent: ${answer.charAt(0).toUpperCase()}${answer.slice(1)}`);
      emit({ type: "rsvp", id, answer });
    },
    [update, toast, emit]
  );

  /** Removes a label from a conversation; "Inbox" archives it. */
  const removeLabel = useCallback(
    (id: string, label: string) => {
      if (label === "Inbox") return act("archive", [id]);
      update((s) => {
        const m = s.mails.find((x) => x.id === id);
        if (m) m.labels = m.labels.filter((l) => l !== label);
      });
      toast(`Removed label "${label}".`);
      emit({ type: "label", id, label, added: false });
    },
    [act, update, toast, emit]
  );

  // Label management, from the sidebar
  const short = (l: string) => l.split("/").pop() ?? l;
  const createLabel = useCallback(
    (name: string) => {
      update((s) => void (s.labels[name] = PALETTE[Object.keys(s.labels).length % PALETTE.length]));
      toast(`Label "${short(name)}" was created.`);
      emit({ type: "manageLabel", action: "create", label: name });
    },
    [update, toast, emit]
  );
  const renameLabel = useCallback(
    (from: string, to: string) => {
      if (from === to) return;
      const map = (l: string) => (l === from ? to : l.startsWith(`${from}/`) ? to + l.slice(from.length) : l);
      update((s) => {
        s.labels = Object.fromEntries(Object.entries(s.labels).map(([k, v]) => [map(k), v]));
        s.mails.forEach((m) => (m.labels = m.labels.map(map)));
        if (s.view.label) s.view.label = map(s.view.label);
      });
      toast(`Label renamed to "${short(to)}".`);
      emit({ type: "manageLabel", action: "rename", label: from, to });
    },
    [update, toast, emit]
  );
  const colorLabel = useCallback(
    (name: string, color: string) => {
      update((s) => void (s.labels[name] = color));
      emit({ type: "manageLabel", action: "color", label: name, color });
    },
    [update, emit]
  );
  const deleteLabel = useCallback(
    (name: string) => {
      const saved = { labels: ref.current.labels, mails: ref.current.mails.map((m) => [m.id, m.labels] as const), current: ref.current.view.label };
      update((s) => {
        const doomed = Object.keys(s.labels).filter((l) => l === name || l.startsWith(`${name}/`));
        doomed.forEach((l) => delete s.labels[l]);
        s.mails.forEach((m) => (m.labels = m.labels.filter((l) => !doomed.includes(l))));
        if (s.view.label && doomed.includes(s.view.label)) s.view.label = null;
      });
      emit({ type: "manageLabel", action: "remove", label: name });
      toast(`Label "${short(name)}" was removed.`, [
        {
          label: "Undo",
          run: () => {
            update((s) => {
              s.labels = saved.labels;
              for (const [id, labels] of saved.mails) {
                const m = s.mails.find((x) => x.id === id);
                if (m) m.labels = [...labels];
              }
              s.view.label = saved.current;
            });
            emit({ type: "undo", action: "removeLabel", ids: [name] });
          },
        },
      ]);
    },
    [update, emit, toast]
  );

  // Compose
  const compose = useCallback(
    (pre: Partial<GmailCompose> = {}) =>
      void update((s) => void (s.compose = { to: [], subject: "", body: "", mode: "normal", draftOf: null, ...pre })),
    [update]
  );
  const editCompose = useCallback((patch: Partial<GmailCompose>) => void update((s) => void (s.compose && Object.assign(s.compose, patch))), [update]);
  const forward = useCallback(
    (id: string) => {
      const m = ref.current.mails.find((x) => x.id === id);
      if (!m) return;
      const last = m.messages[m.messages.length - 1];
      compose({
        subject: `Fwd: ${m.subject}`,
        body: `\n\n---------- Forwarded message ---------\nFrom: ${person(last.from).name}\nSubject: ${m.subject}\n\n${plain(last.body, true)}`,
      });
    },
    [compose, person]
  );
  /** Closes the window, keeping what was written as a draft. */
  const closeCompose = useCallback(() => {
    const c = ref.current.compose;
    if (!c) return;
    let id = "";
    update((s) => {
      s.compose = null;
      if (!c.to.length && !c.subject && !c.body) return;
      const existing = c.draftOf && s.mails.find((m) => m.id === c.draftOf);
      if (existing) {
        existing.subject = c.subject || "(no subject)";
        existing.messages[0] = { ...existing.messages[0], to: c.to, body: c.body, at: Date.now() };
        id = existing.id;
        return;
      }
      const m = makeMail({ folder: "drafts", subject: c.subject || "(no subject)", messages: [{ from: me, to: c.to, body: c.body }] }, () => `m${++s.seq}`);
      id = m.id;
      s.mails.push(m);
    });
    if (!id) return;
    toast("Draft saved.");
    emit({ type: "draft", id, to: c.to, subject: c.subject, body: c.body });
  }, [update, toast, emit, me]);
  const discardCompose = useCallback(() => {
    update((s) => void (s.compose = null));
    toast("Draft discarded.");
  }, [update, toast]);
  /** Sends what is in the compose window (`pending` is a half-typed address in the To field). */
  const sendCompose = useCallback(
    (pending = "") => {
      const c = ref.current.compose;
      if (!c) return;
      const to = pending.trim() ? [...c.to, pending.trim()] : c.to;
      if (!to.length) return toast("Please specify at least one recipient.");
      let id = "";
      update((s) => {
        if (c.draftOf) s.mails = s.mails.filter((m) => m.id !== c.draftOf);
        const m = makeMail({ folder: "sent", subject: c.subject || "(no subject)", messages: [{ from: me, to, body: c.body }] }, () => `m${++s.seq}`);
        id = m.id;
        s.mails.push(m);
        s.compose = null;
      });
      emit({ type: "send", id, to, subject: c.subject, body: c.body });
      toast("Message sent.", [
        {
          label: "Undo",
          run: () => {
            update((s) => {
              s.mails = s.mails.filter((m) => m.id !== id);
              s.compose = { ...c, to, mode: "normal", draftOf: null };
            });
            toast("Sending undone.");
            emit({ type: "undo", action: "send", ids: [id] });
          },
        },
        {
          label: "View message",
          run: () => {
            update((s) => void (s.view = { folder: "sent", tab: s.view.tab, label: null, query: "", hasAttachment: false }));
            open(id);
          },
        },
      ]);
    },
    [update, emit, toast, me, open]
  );

  // Tasks side panel
  const addTask = useCallback(
    (text: string) => {
      update((s) => void s.tasks.unshift({ id: `t${++s.seq}`, text, done: false }));
      emit({ type: "task", text, done: false });
    },
    [update, emit]
  );
  const toggleTask = useCallback(
    (id: string) => {
      let task = { text: "", done: false };
      update((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (t) {
          t.done = !t.done;
          task = { ...t };
        }
      });
      emit({ type: "task", text: task.text, done: task.done });
    },
    [update, emit]
  );

  const attachment = useCallback(
    (mail: string, name: string) => {
      toast(`Previewing ${name}`);
      emit({ type: "attachment", mail, name });
    },
    [toast, emit]
  );

  const set = useCallback(
    <K extends "side" | "navCollapsed" | "more" | "density" | "pane" | "theme">(key: K, value: GmailState[K]) =>
      void update((s) => void (s[key] = value)),
    [update]
  );

  const ui = useMemo(
    () => ({
      show, close, act, toggleStar, toggleImportant, setSelected, toggleSelected, expand,
      startReply, setReplyText, cancelReply, sendReply, replyTo, rsvp, removeLabel,
      createLabel, renameLabel, colorLabel, deleteLabel,
      compose, editCompose, forward, closeCompose, discardCompose, sendCompose,
      addTask, toggleTask, attachment, set, emit,
    }),
    [show, close, act, toggleStar, toggleImportant, setSelected, toggleSelected, expand, startReply, setReplyText, cancelReply, sendReply, replyTo, rsvp, removeLabel, createLabel, renameLabel, colorLabel, deleteLabel, compose, editCompose, forward, closeCompose, discardCompose, sendCompose, addTask, toggleTask, attachment, set, emit]
  );

  return {
    seed,
    people,
    me,
    person,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    // The world
    receive,
    reply,
    modify,
    toast,
    open,
    // The signed-in person (wired by <Gmail>)
    ui,
  };
}

export type GmailMailbox = ReturnType<typeof useGmail>;
