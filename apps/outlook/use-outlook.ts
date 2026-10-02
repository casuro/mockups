import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { bodyHtml, bodyText, clean, escapeHtml, fmtDay, fmtTime, fullTime, initialsOf, isEmail, strip } from "./format";
import type {
  BuiltInFolder,
  CategoryColor,
  ComposeKind,
  OutlookCompose,
  OutlookConversation,
  OutlookConversationInput,
  OutlookEvent,
  OutlookFolder,
  OutlookMessage,
  OutlookMessageInput,
  OutlookSeed,
  OutlookState,
  RsvpResponse,
} from "./types";

// The mailbox behind <Outlook>: its state, what the world does to it
// (mail arrives, someone replies, a notice pops up) and what the signed-in
// person does (open, send, delete, flag, answer an invite). Every change
// goes through `update`, which keeps a ref in step with React state, so
// calls made between renders (timers, awaited replies) see what the last
// one wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  email: string;
  initials: string;
  /** One of the eight avatar colors. */
  color: number;
  photo?: string;
}

export interface OutlookOptions {
  /** A state saved from `outlook.state`, to pick up where it was left. */
  restore?: OutlookState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: OutlookEvent) => void;
}

export interface ReceiveOptions {
  /** Show the new-mail notification card. Default true. */
  notify?: boolean;
}

export interface ReplyOptions extends ReceiveOptions {
  /** Wait this many ms before the reply lands. */
  delay?: number;
}

export interface ToastOptions {
  /** A green check instead of the info icon. */
  ok?: boolean;
  actions?: { label: string; run: () => void }[];
}

export interface DialogSpec {
  title: string;
  body?: ReactNode;
  /** The primary button; none when "". */
  ok?: string;
  cancel?: string;
  danger?: boolean;
  /** A one-line field; OK stays disabled until `valid` says yes. */
  input?: { label?: string; placeholder?: string; multiline?: boolean; valid?: (value: string) => boolean };
  /** Under the field. */
  after?: ReactNode;
  onOk?: (value: string) => void;
}

export interface ComposeOptions {
  kind?: ComposeKind;
  conversation?: string | null;
  to?: string[];
  cc?: string[];
  subject?: string;
  html?: string;
  attachments?: OutlookCompose["attachments"];
  draft?: string | null;
}

export const BUILT_IN: { id: BuiltInFolder; name: string }[] = [
  { id: "inbox", name: "Inbox" },
  { id: "drafts", name: "Drafts" },
  { id: "sent", name: "Sent Items" },
  { id: "scheduled", name: "Scheduled" },
  { id: "deleted", name: "Deleted Items" },
  { id: "junk", name: "Junk Email" },
  { id: "archive", name: "Archive" },
  { id: "notes", name: "Notes" },
  { id: "history", name: "Conversation History" },
];

export const CATEGORY_COLORS: Record<CategoryColor, string> = {
  red: "#d13438", orange: "#ca5010", yellow: "#c19c00", green: "#107c10", blue: "#0f6cbd", purple: "#8764b8", teal: "#038387", pink: "#e3008c",
};

const DEFAULT_CATEGORIES: Record<string, CategoryColor> = {
  "Red category": "red", "Orange category": "orange", "Yellow category": "yellow", "Green category": "green", "Blue category": "blue", "Purple category": "purple",
};

const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

const hashColor = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 8;

export const lastOf = (c: OutlookConversation) => c.messages[c.messages.length - 1];
const baseSubject = (s: string) => s.replace(/^(re|fw|fwd):\s*/i, "");
const hasContent = (c: OutlookCompose) => !!(c.to.length || c.cc.length || c.bcc.length || c.subject.trim() || strip(c.html) || c.attachments.length);

function normalizePeople(seed: OutlookSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    out[id] = { id, name: p.name, email: p.email, photo: p.photo, initials: p.initials ?? initialsOf(p.name), color: p.color ?? hashColor(p.name) };
  if (!out[seed.me]) throw new Error(`Outlook: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function makeMessage(m: OutlookMessageInput, id: string, me: string): OutlookMessage {
  return { ...m, id: m.id ?? id, at: toTime(m.at), to: m.to ?? [me], cc: m.cc ?? [], attachments: m.attachments ?? [] };
}

function makeConversation(c: OutlookConversationInput, next: () => string, me: string): OutlookConversation {
  const messages = c.messages.map((m) => makeMessage(m, next(), me)).sort((a, b) => a.at - b.at);
  const first = messages[0];
  const inv = c.invite;
  return {
    id: c.id ?? next(),
    subject: c.subject,
    folder: c.folder ?? "inbox",
    focused: c.focused !== false,
    unread: !!c.unread,
    flagged: !!c.flagged,
    pinned: !!c.pinned,
    importance: c.importance ?? "normal",
    categories: c.categories ?? [],
    snoozedUntil: c.snoozedUntil != null ? toTime(c.snoozedUntil) : null,
    messages,
    invite: inv
      ? {
          title: inv.title ?? c.subject,
          start: toTime(inv.start),
          end: toTime(inv.end),
          location: inv.location ?? "Microsoft Teams Meeting",
          organizer: inv.organizer ?? first?.from ?? me,
          attendees: inv.attendees ?? (first ? new Set([first.from, ...first.to, ...first.cc]).size : 1),
          busy: (inv.busy ?? []).map((b) => ({ title: b.title, start: toTime(b.start), end: toTime(b.end) })),
          response: inv.response ?? null,
        }
      : null,
  };
}

function initialState(seed: OutlookSeed): OutlookState {
  let seq = 0;
  const next = () => `s${++seq}`;
  const conversations = seed.conversations.map((c) => makeConversation(c, next, seed.me));
  const open = seed.open && conversations.some((c) => c.id === seed.open) ? seed.open : null;
  const opened = conversations.find((c) => c.id === open);
  if (opened) opened.unread = false;
  return {
    version: 1,
    conversations,
    folders: seed.folders ?? [],
    favorites: seed.favorites ?? ["inbox", "sent", "drafts"],
    categories: seed.categories ?? DEFAULT_CATEGORIES,
    folder: opened?.folder ?? "inbox",
    pivot: opened && !opened.focused ? "other" : "focused",
    query: "",
    filter: "all",
    open,
    selected: [],
    selectMode: false,
    compose: null,
    theme: seed.theme ?? "light",
    density: seed.density ?? "roomy",
    pane: seed.pane ?? "right",
    focusedInbox: seed.focusedInbox !== false,
    navHidden: false,
    seq,
  };
}

/** The folder's name: a built-in one, a custom one, or Inbox. */
export const folderName = (s: OutlookState, id: string) =>
  BUILT_IN.find((f) => f.id === id)?.name ?? s.folders.find((f) => f.id === id)?.name ?? "Inbox";

/** The conversations the message list shows, newest first: the folder (and Focused/Other tab), or a search across every folder, then the filter. */
export function listOf(s: OutlookState, people: Record<string, Person>, me: string) {
  const words = s.query.toLowerCase().split(/\s+/).filter(Boolean);
  const nameOf = (id: string) => `${people[id]?.name ?? id} ${people[id]?.email ?? ""}`;
  const firstName = (people[me]?.name ?? "").split(" ")[0].toLowerCase();
  return s.conversations
    .filter((c) => {
      if (words.length) {
        const hay = `${c.subject} ${c.messages.map((m) => `${nameOf(m.from)} ${m.to.map(nameOf).join(" ")} ${bodyText(m)} ${m.attachments.map((a) => a.name).join(" ")}`).join(" ")}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      } else {
        if (c.folder !== s.folder) return false;
        if (s.folder === "inbox" && s.focusedInbox && c.focused !== (s.pivot === "focused")) return false;
      }
      if (s.filter === "unread" && !c.unread) return false;
      if (s.filter === "flagged" && !c.flagged) return false;
      if (s.filter === "tome" && !lastOf(c).to.includes(me)) return false;
      if (s.filter === "files" && !c.messages.some((m) => m.attachments.length)) return false;
      if (s.filter === "mentions" && !(firstName && c.messages.some((m) => bodyText(m).toLowerCase().includes(firstName)))) return false;
      return true;
    })
    .sort((a, b) => lastOf(b).at - lastOf(a).at);
}

export function useOutlook(seed: OutlookSeed, options: OutlookOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<OutlookState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<({ text: string; n: number } & ToastOptions) | null>(null);
  const [alert, setAlert] = useState<{ id: string; from: string; n: number } | null>(null);
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const undoStack = useRef<{ label: string; run: () => void }[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const narrow = useRef(false);
  const anchor = useRef<string | null>(null);
  // The composer's body as last typed: kept out of state so typing never re-renders the app.
  const liveHtml = useRef<string | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const update = useCallback((fn: (draft: OutlookState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: OutlookEvent) => opts.current.onEvent?.(event), []);

  const toast = useCallback((text: string, o: ToastOptions = {}) => setNotice((n) => ({ text, ...o, n: (n?.n ?? 0) + 1 })), []);

  /** A person by id, or by email address; someone outside the address book is their address. */
  const person = useCallback(
    (key: string): Person => {
      if (people[key]) return people[key];
      const hit = Object.values(people).find((p) => p.email.toLowerCase() === key.toLowerCase());
      return hit ?? { id: key, name: key, email: key, initials: initialsOf(key.split("@")[0]), color: hashColor(key) };
    },
    [people]
  );

  const find = (s: OutlookState, id: string) => s.conversations.find((c) => c.id === id);

  // ---------- Undo ----------

  /** Remembers `ids` as they are now, so `undo` can put them back. */
  const pushUndo = useCallback(
    (label: string, ids: string[], after?: () => void) => {
      const s = ref.current;
      const saved = ids.map((id) => find(s, id)).filter(Boolean).map((c) => structuredClone(c!));
      const open = s.open;
      const entry = {
        label,
        run: () => {
          update((d) => {
            for (const c of saved) {
              const i = d.conversations.findIndex((x) => x.id === c.id);
              if (i >= 0) d.conversations[i] = c;
              else d.conversations.push(c);
            }
            d.open = open;
          });
          after?.();
        },
      };
      undoStack.current = [...undoStack.current.slice(-39), entry];
      setUndoCount(undoStack.current.length);
      return entry;
    },
    [update]
  );

  const runUndo = useCallback(
    (entry: { label: string; run: () => void }) => {
      const i = undoStack.current.indexOf(entry);
      if (i < 0) return;
      undoStack.current = undoStack.current.filter((e) => e !== entry);
      setUndoCount(undoStack.current.length);
      entry.run();
      emit({ type: "undo", label: entry.label });
    },
    [emit]
  );

  const undo = useCallback(() => {
    const e = undoStack.current[undoStack.current.length - 1];
    if (!e) return;
    runUndo(e);
    toast(`Undid: ${e.label.replace(/\.$/, "")}`);
  }, [runUndo, toast]);

  // ---------- Drafts and compose ----------

  const saveDraft = useCallback(
    (d: OutlookState) => {
      const c = d.compose;
      if (!c) return;
      if (liveHtml.current !== null) c.html = liveHtml.current;
      const msg: OutlookMessage = { id: `m${++d.seq}`, from: me, to: [...c.to], cc: [...c.cc], at: Date.now(), html: clean(c.html), attachments: [...c.attachments] };
      let draft = c.draft ? find(d, c.draft) : undefined;
      if (!draft) {
        draft = {
          id: `c${++d.seq}`, subject: "", folder: "drafts", focused: true, unread: false, flagged: false, pinned: false, importance: "normal",
          categories: [], invite: null, snoozedUntil: null, messages: [],
        };
        d.conversations.push(draft);
        c.draft = draft.id;
      }
      Object.assign(draft, { folder: "drafts", subject: c.subject || "(No subject)", messages: [msg], draft: { kind: c.kind, conversation: c.conversation } });
      c.savedAt = Date.now();
    },
    [me]
  );

  const startCompose = useCallback(
    (o: ComposeOptions = {}) => {
      update((d) => {
        if (d.compose) {
          if (liveHtml.current !== null) d.compose.html = liveHtml.current;
          if (hasContent(d.compose)) saveDraft(d);
          d.compose = null;
        }
        liveHtml.current = null;
        const cc = o.cc ?? [];
        d.compose = {
          key: ++d.seq, kind: o.kind ?? "new", conversation: o.conversation ?? null, to: [...(o.to ?? [])], cc: [...cc], bcc: [],
          showCc: cc.length > 0, showBcc: false, subject: o.subject ?? "", html: o.html ?? "", attachments: [...(o.attachments ?? [])],
          draft: o.draft ?? null, savedAt: null,
        };
        if (o.conversation) d.open = o.conversation;
        d.selected = [];
      });
    },
    [update, saveDraft]
  );

  /** Reply, reply all or forward the conversation `id`. */
  const respond = useCallback(
    (kind: Exclude<ComposeKind, "new">, id: string) => {
      const c = find(ref.current, id);
      if (!c) return;
      const last = lastOf(c);
      const m = [...c.messages].reverse().find((x) => x.from !== me) ?? last;
      const base = baseSubject(c.subject);
      if (kind === "forward") {
        const from = person(last.from);
        const quote =
          `<b>From:</b> ${escapeHtml(from.name)} &lt;${escapeHtml(from.email)}&gt;<br><b>Sent:</b> ${fullTime(last.at)}<br>` +
          `<b>To:</b> ${escapeHtml(last.to.map((x) => person(x).name).join("; "))}<br><b>Subject:</b> ${escapeHtml(c.subject)}<br><br>${escapeHtml(bodyText(last))}`;
        return startCompose({ kind, conversation: id, subject: `FW: ${base}`, html: `<div><br></div><div><br></div><blockquote>${quote}</blockquote>`, attachments: last.attachments });
      }
      const to = m.from === me ? m.to.filter((x) => x !== me) : [m.from];
      const cc = kind === "replyAll" ? [...new Set([...m.to, ...m.cc])].filter((x) => x !== me && !to.includes(x)) : [];
      startCompose({ kind, conversation: id, to, cc, subject: `RE: ${base}` });
    },
    [me, person, startCompose]
  );

  const openDraft = useCallback(
    (c: OutlookConversation) => {
      const m = c.messages[0];
      startCompose({
        kind: c.draft?.kind ?? "new", conversation: c.draft?.conversation ?? null, to: m?.to ?? [], cc: m?.cc ?? [],
        subject: c.subject === "(No subject)" ? "" : c.subject, html: m ? bodyHtml(m) : "", attachments: m?.attachments ?? [], draft: c.id,
      });
    },
    [startCompose]
  );

  /** Changes to what is being written (recipients, subject, attachments). */
  const editCompose = useCallback((patch: Partial<OutlookCompose>) => update((d) => void (d.compose && Object.assign(d.compose, patch))), [update]);

  /** The editor's body, as it is typed. */
  const setBody = useCallback((html: string) => void (liveHtml.current = html), []);

  /** Saves what is being written into Drafts, if there is anything to save. */
  const autosave = useCallback(
    () =>
      update((d) => {
        if (!d.compose) return;
        if (liveHtml.current !== null) d.compose.html = liveHtml.current;
        if (hasContent(d.compose)) saveDraft(d);
      }),
    [update, saveDraft]
  );

  /** Closes the composer, keeping what was written in Drafts. */
  const closeCompose = useCallback(
    ({ silent = false } = {}) => {
      let saved: string | null = null;
      update((d) => {
        const c = d.compose;
        if (!c) return;
        if (liveHtml.current !== null) c.html = liveHtml.current;
        if (hasContent(c)) {
          saveDraft(d);
          saved = c.draft;
        }
        d.compose = null;
      });
      liveHtml.current = null;
      const id = saved as string | null;
      if (!id) return;
      emit({ type: "draft", id, action: "save" });
      if (!silent)
        toast("Draft saved to Drafts.", {
          actions: [{ label: "Open", run: () => { const c = find(ref.current, id); if (c) openDraft(c); } }],
        });
    },
    [update, saveDraft, emit, toast, openDraft]
  );

  const discardCompose = useCallback(
    () => {
      const c = ref.current.compose;
      if (!c) return;
      const kept: OutlookCompose = { ...c, html: liveHtml.current ?? c.html };
      liveHtml.current = null;
      const draft = c.draft ? find(ref.current, c.draft) : undefined;
      update((d) => {
        if (c.draft) d.conversations = d.conversations.filter((x) => x.id !== c.draft);
        d.compose = null;
      });
      if (draft) emit({ type: "draft", id: draft.id, action: "discard" });
      toast("Draft discarded.", {
        actions: [
          {
            label: "Undo",
            run: () => {
              if (draft) update((d) => void d.conversations.push(structuredClone(draft)));
              startCompose(kept);
            },
          },
        ],
      });
    },
    [update, emit, toast, startCompose]
  );

  const deliverSend = useCallback(
    (c: OutlookCompose, at?: number) => {
      let convId = "";
      let msgId = "";
      let created = false;
      const html = clean(c.html).trim() || "<p></p>";
      const draft = c.draft ? find(ref.current, c.draft) : undefined;
      const before = c.conversation ? find(ref.current, c.conversation) : undefined;
      update((d) => {
        if (c.draft) d.conversations = d.conversations.filter((x) => x.id !== c.draft);
        const msg: OutlookMessage = { id: `m${++d.seq}`, from: me, to: [...c.to], cc: [...c.cc], at: Date.now(), html, attachments: [...c.attachments] };
        msgId = msg.id;
        const target = c.conversation && !at ? find(d, c.conversation) : undefined;
        if (target) {
          target.messages.push(msg);
          convId = target.id;
        } else {
          const conv: OutlookConversation = {
            id: `c${++d.seq}`, subject: c.subject || "(No subject)", folder: at ? "scheduled" : "sent", focused: true, unread: false, flagged: false, pinned: false,
            importance: "normal", categories: [], invite: null, snoozedUntil: at ?? null, messages: [msg],
          };
          d.conversations.push(conv);
          convId = conv.id;
          created = true;
        }
        d.compose = null;
      });
      liveHtml.current = null;
      emit({ type: "send", kind: c.kind, conversation: convId, id: msgId, to: c.to, cc: c.cc, bcc: c.bcc, subject: c.subject, text: strip(html), html, attachments: c.attachments, ...(at ? { scheduled: at } : {}) });
      toast(at ? `Scheduled to send ${fmtDay(at)} at ${fmtTime(at)}.` : "Sent", {
        ok: true,
        actions: [
          {
            label: "Undo",
            run: () => {
              update((d) => {
                if (created) d.conversations = d.conversations.filter((x) => x.id !== convId);
                else if (before) {
                  const t = find(d, convId);
                  if (t) t.messages = t.messages.filter((m) => m.id !== msgId);
                }
                if (draft) d.conversations.push(structuredClone(draft));
              });
              emit({ type: "undo", label: "Send" });
              startCompose(c);
              toast("Sending was undone. Your message is back in the draft.");
            },
          },
        ],
      });
    },
    [update, me, emit, toast, startCompose]
  );

  /** Sends what is being written (or schedules it for `at`), after checking it has good recipients and a subject, or the person's OK. */
  const send = useCallback(
    (at?: number) => {
      const s = update((d) => void (d.compose && liveHtml.current !== null && (d.compose.html = liveHtml.current)));
      const c = s.compose;
      if (!c) return;
      const all = [...c.to, ...c.cc, ...c.bcc];
      if (!all.length) return setDialog({ title: "Add a recipient", body: "This message must have at least one recipient.", ok: "OK", cancel: "" });
      const bad = all.filter((x) => !people[x] && !isEmail(x));
      if (bad.length)
        return setDialog({ title: "Check the recipients", body: `We can't send to ${bad.join(", ")}. Check that the address is typed correctly.`, ok: "OK", cancel: "" });
      if (c.kind === "new" && !c.subject.trim())
        return setDialog({ title: "Send without a subject?", body: "This message doesn't have a subject. Do you want to send it anyway?", ok: "Send", cancel: "Don't send", onOk: () => deliverSend(c, at) });
      deliverSend(c, at);
    },
    [update, people, deliverSend]
  );

  // ---------- What the person does to conversations ----------

  const openConversation = useCallback(
    (id: string) => {
      const c = find(ref.current, id);
      if (!c) return;
      if (c.folder === "drafts") return openDraft(c);
      if (ref.current.compose) closeCompose({ silent: true });
      update((d) => {
        d.selected = [];
        d.open = id;
        find(d, id)!.unread = false;
      });
      emit({ type: "open", id });
    },
    [openDraft, closeCompose, update, emit]
  );

  const closeConversation = useCallback(() => {
    if (ref.current.compose) closeCompose({ silent: ref.current.compose.kind !== "new" });
    update((d) => void (d.open = null));
  }, [closeCompose, update]);

  /** Moves conversations to a folder, opening the next one in the list if the open one went. */
  const moveTo = useCallback(
    (ids: string[], folder: string, message: string, extra?: (c: OutlookConversation) => void) => {
      const s = ref.current;
      if (!ids.length) return;
      if (s.compose?.conversation && ids.includes(s.compose.conversation)) closeCompose({ silent: true });
      const order = listOf(ref.current, people, me).map((c) => c.id);
      const entry = pushUndo(message, ids);
      update((d) => {
        for (const id of ids) {
          const c = find(d, id);
          if (!c) continue;
          c.folder = folder;
          extra?.(c);
        }
        if (d.open && ids.includes(d.open)) {
          let next: string | null = null;
          if (!narrow.current && d.pane !== "off") {
            const i = order.indexOf(d.open);
            next = order.slice(i + 1).find((x) => !ids.includes(x)) ?? order.slice(0, Math.max(0, i)).reverse().find((x) => !ids.includes(x)) ?? null;
          }
          d.open = next;
          const n = next ? find(d, next) : undefined;
          if (n) n.unread = false;
        }
        d.selected = [];
      });
      toast(message, { actions: [{ label: "Undo", run: () => runUndo(entry) }] });
    },
    [closeCompose, people, me, pushUndo, update, toast, runUndo]
  );

  /** Changes conversations in place (read, flag, pin, categories), undoably, without a notice. */
  const mutate = useCallback(
    (ids: string[], label: string, fn: (c: OutlookConversation) => void) => {
      pushUndo(label, ids);
      update((d) => ids.forEach((id) => { const c = find(d, id); if (c) fn(c); }));
    },
    [pushUndo, update]
  );

  const words = (n: number) => (n === 1 ? "Conversation" : `${n} conversations`);
  const existing = (ids: string[]) => ids.filter((id) => find(ref.current, id));

  const remove = useCallback(
    (raw: string[]) => {
      const ids = existing(raw);
      if (!ids.length) return;
      const all = ids.map((id) => find(ref.current, id)!);
      if (all.every((c) => c.folder === "deleted")) {
        const n = ids.length;
        return setDialog({
          title: "Permanently delete?",
          body: `${n === 1 ? "This item" : `These ${n} items`} will be permanently deleted. You won't be able to recover ${n === 1 ? "it" : "them"} later.`,
          ok: "OK",
          danger: true,
          onOk: () => {
            update((d) => {
              d.conversations = d.conversations.filter((c) => !ids.includes(c.id));
              if (d.open && ids.includes(d.open)) d.open = null;
              d.selected = [];
            });
            toast(`${n === 1 ? "Item" : `${n} items`} permanently deleted.`);
            emit({ type: "delete", ids, permanent: true });
          },
        });
      }
      moveTo(ids, "deleted", `${words(ids.length)} moved to Deleted Items.`, (c) => (c.pinned = false));
      emit({ type: "delete", ids, permanent: false });
    },
    [moveTo, update, toast, emit]
  );

  const archive = useCallback(
    (raw: string[]) => {
      const ids = existing(raw);
      if (!ids.length) return;
      moveTo(ids, "archive", `${words(ids.length)} moved to Archive.`);
      emit({ type: "archive", ids });
    },
    [moveTo, emit]
  );

  const move = useCallback(
    (raw: string[], folder: string) => {
      const ids = existing(raw);
      if (!ids.length) return;
      moveTo(ids, folder, `${words(ids.length)} moved to ${folderName(ref.current, folder)}.`);
      emit({ type: "move", ids, folder });
    },
    [moveTo, emit]
  );

  const junk = useCallback(
    (raw: string[], isJunk = true, phishing = false) => {
      const ids = existing(raw);
      if (!ids.length) return;
      if (phishing) moveTo(ids, "deleted", "Thanks for reporting phishing. The message was moved to Deleted Items.");
      else if (isJunk) moveTo(ids, "junk", `${words(ids.length)} reported as junk and moved to Junk Email.`);
      else moveTo(ids, "inbox", `${words(ids.length)} moved to Inbox. Messages from ${ids.length === 1 ? "this sender" : "these senders"} won't be marked as junk.`);
      emit({ type: "junk", ids, junk: isJunk, ...(phishing ? { phishing } : {}) });
    },
    [moveTo, emit]
  );

  const snooze = useCallback(
    (raw: string[], until: number) => {
      const ids = existing(raw);
      if (!ids.length) return;
      moveTo(ids, "scheduled", `${words(ids.length)} snoozed until ${fmtDay(until)} ${fmtTime(until)}.`, (c) => (c.snoozedUntil = until));
      emit({ type: "snooze", ids, until });
    },
    [moveTo, emit]
  );

  /** Marks read (true), unread (false), or flips them: all read if any is unread. */
  const markRead = useCallback(
    (raw: string[], read?: boolean) => {
      const ids = existing(raw);
      if (!ids.length) return;
      const to = read ?? ids.some((id) => find(ref.current, id)!.unread);
      mutate(ids, to ? "Mark read" : "Mark unread", (c) => (c.unread = !to));
      emit({ type: "read", ids, read: to });
    },
    [mutate, emit]
  );

  const flag = useCallback(
    (raw: string[]) => {
      const ids = existing(raw);
      if (!ids.length) return;
      const to = !ids.every((id) => find(ref.current, id)!.flagged);
      mutate(ids, "Flag", (c) => (c.flagged = to));
      emit({ type: "flag", ids, flagged: to });
    },
    [mutate, emit]
  );

  const pin = useCallback(
    (raw: string[]) => {
      const ids = existing(raw);
      if (!ids.length) return;
      const to = !ids.every((id) => find(ref.current, id)!.pinned);
      mutate(ids, "Pin", (c) => (c.pinned = to));
      emit({ type: "pin", ids, pinned: to });
    },
    [mutate, emit]
  );

  /** Adds a category to all of them, or takes it off if they all have it; null clears every category. */
  const categorize = useCallback(
    (raw: string[], category: string | null) => {
      const ids = existing(raw);
      if (!ids.length) return;
      if (category === null) {
        mutate(ids, "Clear categories", (c) => (c.categories = []));
        return emit({ type: "categorize", ids, category: null, added: false });
      }
      const has = ids.every((id) => find(ref.current, id)!.categories.includes(category));
      mutate(ids, "Categorize", (c) => {
        c.categories = has ? c.categories.filter((x) => x !== category) : c.categories.includes(category) ? c.categories : [...c.categories, category];
      });
      emit({ type: "categorize", ids, category, added: !has });
    },
    [mutate, emit]
  );

  /** A new category; `ids` get it straight away. */
  const addCategory = useCallback(
    (name: string, color: CategoryColor, ids: string[] = []) => {
      update((d) => void (d.categories[name] = color));
      if (ids.length) categorize(ids, name);
      toast(`Category "${name}" created.`);
    },
    [update, categorize, toast]
  );

  const rsvp = useCallback(
    (id: string, response: RsvpResponse) => {
      const c = find(ref.current, id);
      if (!c?.invite) return;
      update((d) => void (find(d, id)!.invite!.response = response));
      const who = person(c.invite.organizer).name;
      toast({ accept: `Accepted. Response sent to ${who}.`, tentative: `Tentatively accepted. Response sent to ${who}.`, decline: `Declined. Response sent to ${who}.` }[response], { ok: response !== "decline" });
      emit({ type: "rsvp", id, response });
    },
    [update, person, toast, emit]
  );

  // ---------- Where the person is ----------

  const openFolder = useCallback(
    (folder: string) => {
      if (ref.current.compose && ref.current.compose.kind !== "new") closeCompose({ silent: true });
      update((d) => Object.assign(d, { folder, query: "", open: null, filter: "all", selectMode: false, selected: [] }));
      emit({ type: "folder", folder });
    },
    [closeCompose, update, emit]
  );

  const search = useCallback(
    (raw: string) => {
      const query = raw.trim();
      if (ref.current.compose && ref.current.compose.kind !== "new") closeCompose({ silent: true });
      update((d) => Object.assign(d, { query, open: null, selectMode: false, selected: [] }));
      if (query) emit({ type: "search", query });
    },
    [closeCompose, update, emit]
  );

  /** Checks or unchecks a conversation; with `range`, everything between the last one checked and this one. */
  const toggleSelect = useCallback(
    (id: string, range = false) => {
      update((d) => {
        if (range && anchor.current) {
          const order = listOf(d, people, me).map((c) => c.id);
          const a = order.indexOf(anchor.current);
          const b = order.indexOf(id);
          if (a >= 0 && b >= 0) d.selected = order.slice(Math.min(a, b), Math.max(a, b) + 1);
          return;
        }
        if (!d.selected.length && d.open && d.open !== id && !d.selectMode) d.selected.push(d.open);
        d.selected = d.selected.includes(id) ? d.selected.filter((x) => x !== id) : [...d.selected, id];
      });
      if (!range) anchor.current = id;
    },
    [update, people, me]
  );

  const setSelection = useCallback(
    (ids: string[], selectMode?: boolean) =>
      update((d) => {
        d.selected = ids;
        if (selectMode !== undefined) {
          d.selectMode = selectMode;
          if (selectMode && d.open && !ids.length) d.selected = [d.open];
        }
      }),
    [update]
  );

  const createFolder = useCallback(
    (name: string) => {
      const folder: OutlookFolder = { id: `f-${Date.now().toString(36)}`, name };
      update((d) => void d.folders.push(folder));
      toast(`Folder "${name}" created.`, { ok: true, actions: [{ label: "Open", run: () => openFolder(folder.id) }] });
      emit({ type: "createFolder", folder });
    },
    [update, toast, openFolder, emit]
  );

  const setView = useCallback(
    (patch: Partial<Pick<OutlookState, "theme" | "density" | "pane" | "focusedInbox" | "navHidden" | "pivot" | "filter" | "favorites">>) =>
      update((d) => {
        Object.assign(d, patch);
        if (patch.focusedInbox !== undefined) d.pivot = "focused";
        if (patch.pivot) d.selected = [];
      }),
    [update]
  );

  // ---------- What the world does ----------

  /** New mail arrives: a conversation lands (in the inbox, unread, by default) with a notification card. Returns its id. */
  const receive = useCallback(
    (input: OutlookConversationInput, o: ReceiveOptions = {}) => {
      let id = "";
      update((d) => {
        const c = makeConversation({ unread: true, ...input }, () => `m${++d.seq}`, me);
        if (d.conversations.some((x) => x.id === c.id)) throw new Error(`Outlook: there is already a conversation ${c.id}`);
        d.conversations.push(c);
        id = c.id;
      });
      const last = input.messages[input.messages.length - 1];
      if (o.notify !== false && last) setAlert((a) => ({ id, from: last.from, n: (a?.n ?? 0) + 1 }));
      return id;
    },
    [update, me]
  );

  /** Someone answers in a conversation: after `delay` ms their message lands, the conversation moves to the inbox, and a card pops up. Resolves with the message id (or null if the conversation is gone). */
  const reply = useCallback(
    (conversation: string, message: OutlookMessageInput, o: ReplyOptions = {}): Promise<string | null> => {
      // An empty message (a reply nobody needed to write) delivers nothing.
      if (!message.text?.trim() && !message.html?.trim() && !message.attachments?.length && !message.custom) return Promise.resolve(null);
      const land = () => {
        if (!find(ref.current, conversation)) return null;
        let id = "";
        update((d) => {
          const c = find(d, conversation)!;
          const m = makeMessage(message, `m${++d.seq}`, me);
          id = m.id;
          c.messages.push(m);
          c.folder = "inbox";
          c.focused = true;
          c.unread = d.open !== conversation;
        });
        if (o.notify !== false) setAlert((a) => ({ id: conversation, from: message.from, n: (a?.n ?? 0) + 1 }));
        return id;
      };
      if (!o.delay) return Promise.resolve(land());
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          timers.current.delete(t);
          resolve(land());
        }, o.delay);
        timers.current.add(t);
      });
    },
    [update, me]
  );

  /** Shows a conversation, from wherever it is. */
  const open = useCallback(
    (id: string) => {
      const c = find(ref.current, id);
      if (!c) return;
      update((d) => Object.assign(d, { query: "", folder: c.folder, pivot: c.focused ? "focused" : "other", filter: "all" }));
      openConversation(id);
    },
    [update, openConversation]
  );

  const dismissAlert = useCallback(() => setAlert(null), []);
  /** Whether the app is laid out narrow (one pane at a time): moving the open conversation then goes back to the list. */
  const setNarrow = useCallback((v: boolean) => void (narrow.current = v), []);

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    alert,
    dialog,
    canUndo: undoCount > 0,
    person,
    // The world
    receive,
    reply,
    open,
    compose: startCompose,
    toast,
    // The signed-in person (wired by <Outlook>)
    ui: {
      openConversation, closeConversation, openFolder, search, toggleSelect, setSelection, setView, createFolder,
      remove, archive, move, junk, snooze, markRead, flag, pin, categorize, addCategory, rsvp, undo,
      respond, startCompose, editCompose, setBody, autosave, closeCompose, discardCompose, send,
      showDialog: setDialog, dismissAlert, setNarrow, emit,
    },
  };
}

export type OutlookMailbox = ReturnType<typeof useOutlook>;
