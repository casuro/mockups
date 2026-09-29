import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { edit, markComment, markSuggestion, marksOf, plainText, settle, toHtml } from "./content";
import type { DocsContent, DocsEvent, DocsMode, DocsReply, DocsReplyInput, DocsSeed, DocsState, DocsThread } from "./types";

// The document behind <GoogleDocs>: its state, what the world does to it
// (a collaborator comments, replies, suggests an edit, moves their cursor)
// and what the signed-in person does (types, comments, resolves, accepts,
// renames, shares). Every change goes through `update`, which keeps a ref in
// step with React state, so calls made between renders (timers, awaited
// replies) see what the last one wrote. Every function it returns is stable.

export interface Person {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  photo?: string;
}

export interface DocsOptions {
  /** A state saved from `docs.state`, to pick up where it was left. */
  restore?: DocsState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: DocsEvent) => void;
  /** How long after the last keystroke the `edit` event is sent, in ms (default 800). */
  editDelay?: number;
}

const PALETTE = ["#e8710a", "#1e8e3e", "#9334e6", "#d93025", "#1a73e8", "#e52592", "#12b5cb", "#f9ab00"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

function normalizePeople(seed: DocsSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    out[id] = {
      id,
      name: p.name,
      email: p.email ?? "",
      color: p.color ?? colorFor(id),
      initials: p.initials ?? p.name.trim().charAt(0).toUpperCase(),
      photo: p.photo,
    };
  if (!out[seed.me]) throw new Error(`Google Docs: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function initialState(seed: DocsSeed): DocsState {
  let seq = 0;
  const reply = (r: DocsReplyInput): DocsReply => ({ id: `r${++seq}`, from: r.from, at: toTime(r.at), text: r.text });
  const threads: DocsThread[] = [];
  const html = edit(toHtml(seed.document.content), (root) => {
    for (const c of seed.comments ?? []) {
      const id = c.id ?? `c${++seq}`;
      if (markComment(root, c.anchor, id))
        threads.push({ id, kind: "comment", from: c.from, at: toTime(c.at), text: c.text, replies: (c.replies ?? []).map(reply), status: "open" });
    }
    for (const s of seed.suggestions ?? []) {
      const id = s.id ?? `s${++seq}`;
      if (markSuggestion(root, s.replace, s.with, id))
        threads.push({ id, kind: "suggestion", from: s.from, at: toTime(s.at), text: "", replace: s.replace, with: s.with, replies: (s.replies ?? []).map(reply), status: "open" });
    }
  });
  const cursors: Record<string, string> = {};
  for (const c of seed.collaborators ?? []) if (c.cursor) cursors[c.id] = c.cursor;
  return {
    version: 1,
    title: seed.document.title,
    html,
    starred: !!seed.document.starred,
    mode: seed.mode ?? "Editing",
    threads,
    present: (seed.collaborators ?? []).map((c) => c.id),
    cursors,
    theme: seed.theme ?? "light",
    seq,
  };
}

export function useGoogleDocs(seed: DocsSeed, options: DocsOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<DocsState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback((event: DocsEvent) => opts.current.onEvent?.(event), []);

  // Typing lands here first (no render per keystroke); the state and the `edit` event follow when they pause.
  const commitEdit = useCallback(
    (silent = false) => {
      if (editTimer.current) clearTimeout(editTimer.current);
      editTimer.current = null;
      setState(ref.current);
      if (!silent) emit({ type: "edit", html: ref.current.html, text: plainText(ref.current.html) });
    },
    [emit]
  );
  useEffect(() => () => void (editTimer.current && clearTimeout(editTimer.current)), []);

  const update = useCallback((fn: (draft: DocsState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  const thread = (s: DocsState, id: string) => {
    const t = s.threads.find((x) => x.id === id);
    if (!t) throw new Error(`Google Docs: there is no comment or suggestion ${id}`);
    return t;
  };

  // ---------- What the world does ----------

  /** `from` comments on the first match of `anchor`. Returns the comment's id. */
  const comment = useCallback(
    (anchor: string, from: string, text: string, o: { at?: number | string; id?: string } = {}) => {
      let id = "";
      update((s) => {
        id = o.id ?? `c${++s.seq}`;
        let found = false;
        s.html = edit(s.html, (root) => void (found = markComment(root, anchor, id)));
        if (!found) throw new Error(`Google Docs: "${anchor}" is not in the document`);
        s.threads.push({ id, kind: "comment", from, at: toTime(o.at), text, replies: [], status: "open" });
      });
      return id;
    },
    [update]
  );

  /** `from` replies to a comment or suggestion. */
  const reply = useCallback(
    (id: string, from: string, text: string) =>
      void update((s) => void thread(s, id).replies.push({ id: `r${++s.seq}`, from, at: Date.now(), text })),
    [update]
  );

  /** `from` suggests replacing the first match of `replace` with `replacement` ("" to delete it). Returns its id. */
  const suggest = useCallback(
    (from: string, replace: string, replacement: string) => {
      let id = "";
      update((s) => {
        id = `s${++s.seq}`;
        let found = false;
        s.html = edit(s.html, (root) => void (found = markSuggestion(root, replace, replacement, id)));
        if (!found) throw new Error(`Google Docs: "${replace}" is not in the document`);
        s.threads.push({ id, kind: "suggestion", from, at: Date.now(), text: "", replace, with: replacement, replies: [], status: "open" });
      });
      return id;
    },
    [update]
  );

  /** Someone else resolves a comment, or accepts or rejects a suggestion. */
  const settleBy = useCallback(
    (id: string, how: "resolve" | "accept" | "reject") =>
      void update((s) => {
        const t = thread(s, id);
        t.status = how === "resolve" ? "resolved" : how === "accept" ? "accepted" : "rejected";
        s.html = edit(s.html, (root) => settle(root, id, how));
      }),
    [update]
  );

  /** A collaborator opens the document (their face shows at the top), with their cursor after `cursor`. */
  const join = useCallback(
    (id: string, cursor?: string) =>
      void update((s) => {
        if (!s.present.includes(id)) s.present.push(id);
        if (cursor) s.cursors[id] = cursor;
      }),
    [update]
  );

  const leave = useCallback(
    (id: string) =>
      void update((s) => {
        s.present = s.present.filter((p) => p !== id);
        delete s.cursors[id];
      }),
    [update]
  );

  /** A collaborator's cursor moves to just after `after` (its first match), or goes away (null). */
  const moveCursor = useCallback(
    (id: string, after: string | null) =>
      void update((s) => {
        if (after === null) delete s.cursors[id];
        else {
          s.cursors[id] = after;
          if (!s.present.includes(id)) s.present.push(id);
        }
      }),
    [update]
  );

  /** Replaces the document's body. Comments whose text is gone drop out of the margin. */
  const setContent = useCallback((content: DocsContent) => void update((s) => void (s.html = toHtml(content))), [update]);

  /** Puts what was typed into the state now; `silent` skips the edit event (a draft comment's highlight is not an edit). */
  const flush = useCallback((silent = false) => void (editTimer.current && commitEdit(silent)), [commitEdit]);

  const setTitle = useCallback((title: string) => void update((s) => void (s.title = title)), [update]);

  // ---------- What the signed-in person does (wired by <GoogleDocs>) ----------

  const input = useCallback(
    (html: string) => {
      ref.current = { ...ref.current, html };
      if (editTimer.current) clearTimeout(editTimer.current);
      editTimer.current = setTimeout(() => commitEdit(), opts.current.editDelay ?? 800);
    },
    [commitEdit]
  );

  /** Posts the draft comment whose highlight (data-c=id) is already in the page. */
  const postComment = useCallback(
    (id: string, text: string) => {
      let anchor = "";
      update((s) => {
        edit(s.html, (root) => void (anchor = marksOf(root, id).map((el) => el.textContent).join("")));
        s.threads.push({ id, kind: "comment", from: me, at: Date.now(), text, replies: [], status: "open" });
      });
      emit({ type: "comment", id, anchor, text });
    },
    [update, emit, me]
  );

  const replyAsMe = useCallback(
    (id: string, text: string) => {
      reply(id, me, text);
      emit({ type: "reply", id, text });
    },
    [reply, me, emit]
  );

  const settleAsMe = useCallback(
    (id: string, how: "resolve" | "accept" | "reject") => {
      settleBy(id, how);
      toast(how === "resolve" ? "Comment resolved" : how === "accept" ? "Suggestion accepted" : "Suggestion rejected");
      emit({ type: how, id });
    },
    [settleBy, toast, emit]
  );

  const setMode = useCallback(
    (mode: DocsMode) => {
      update((s) => void (s.mode = mode));
      toast(mode === "Suggesting" ? "Suggesting: your edits will appear as suggestions" : `Switched to ${mode.toLowerCase()} mode`);
      emit({ type: "mode", mode });
    },
    [update, toast, emit]
  );

  const rename = useCallback(
    (title: string) => {
      if (title === ref.current.title) return;
      setTitle(title);
      toast("Document renamed");
      emit({ type: "rename", title });
    },
    [setTitle, toast, emit]
  );

  const star = useCallback(() => {
    const { starred } = update((s) => void (s.starred = !s.starred));
    toast(starred ? "Starred in Drive" : "Removed from Starred");
    emit({ type: "star", starred });
  }, [update, toast, emit]);

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    // The world
    comment,
    reply,
    suggest,
    resolve: useCallback((id: string) => settleBy(id, "resolve"), [settleBy]),
    accept: useCallback((id: string) => settleBy(id, "accept"), [settleBy]),
    reject: useCallback((id: string) => settleBy(id, "reject"), [settleBy]),
    join,
    leave,
    moveCursor,
    setContent,
    setTitle,
    toast,
    // The signed-in person (wired by <GoogleDocs>)
    ui: useMemo(
      () => ({ input, flush, postComment, reply: replyAsMe, settle: settleAsMe, setMode, rename, star, emit }),
      [input, flush, postComment, replyAsMe, settleAsMe, setMode, rename, star, emit]
    ),
  };
}

export type GoogleDocsApp = ReturnType<typeof useGoogleDocs>;
