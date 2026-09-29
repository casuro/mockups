import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ConfluenceCommentInput,
  ConfluenceEvent,
  ConfluencePage,
  ConfluencePageSeed,
  ConfluenceSeed,
  ConfluenceState,
} from "./types";

// The space behind <Confluence>: its state, what the world does to it
// (comment, like, edit a page, add one) and what the signed-in person does
// (open, like, react, comment, tick, star). Every change goes through
// `update`, which keeps a ref in step with React state, so calls made
// between renders (timers, awaited replies) see what the last one wrote.
// Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: string;
}

export interface ConfluenceOptions {
  /** A state saved from `confluence.state`, to pick up where it was left. */
  restore?: ConfluenceState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: ConfluenceEvent) => void;
}

/** What `updatePage` can change. */
export type PagePatch = Partial<Pick<ConfluencePage, "title" | "author" | "readTime" | "blocks" | "likes" | "reactions" | "starred">> & {
  updated?: number | string;
};

const PALETTE = ["#0c66e4", "#6e5dc6", "#22a06b", "#d97008", "#c9372c", "#1d7afc", "#943d73", "#216e4e"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");

export const toTime = (at: number | string | undefined) =>
  typeof at === "number" ? at : at ? Date.parse(at) || Date.now() : Date.now();

function normalizePeople(seed: ConfluenceSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    out[id] = { id, name: p.name, photo: p.photo, color: p.color ?? colorFor(id), initials: p.initials ?? initialsOf(p.name) };
  if (!out[seed.me]) throw new Error(`Confluence: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

/** The page ids from the top of the tree down to `id`'s parent. */
export function ancestors(s: ConfluenceState, id: string) {
  const out: string[] = [];
  for (let p = s.pages[id]?.parent ?? null; p; p = s.pages[p]?.parent ?? null) out.unshift(p);
  return out;
}

function addPages(s: ConfluenceState, list: ConfluencePageSeed[], parent: string | null, me: string) {
  const ids: string[] = [];
  for (const p of list) {
    if (s.pages[p.id]) throw new Error(`Confluence: there are two pages with the id "${p.id}"`);
    s.pages[p.id] = {
      id: p.id,
      title: p.title,
      parent,
      children: [],
      author: p.author ?? me,
      updated: toTime(p.updated),
      readTime: p.readTime,
      blocks: structuredClone(p.blocks ?? []),
      likes: [...(p.likes ?? [])],
      reactions: (p.reactions ?? []).map((r) => ({ ...r })),
      comments: (p.comments ?? []).map((c) => newComment(s, c)),
      starred: !!p.starred,
    };
    s.pages[p.id].children = addPages(s, p.children ?? [], p.id, me);
    ids.push(p.id);
  }
  return ids;
}

function newComment(s: ConfluenceState, c: ConfluenceCommentInput) {
  return { id: c.id ?? `c${++s.seq}`, from: c.from, at: toTime(c.at), text: c.text };
}

function initialState(seed: ConfluenceSeed): ConfluenceState {
  const s: ConfluenceState = { version: 1, current: "", roots: [], pages: {}, expanded: [], notifications: seed.notifications ?? 0, theme: seed.theme ?? "light", seq: 0 };
  s.roots = addPages(s, seed.pages, null, seed.me);
  s.current = seed.open && s.pages[seed.open] ? seed.open : s.roots[0];
  s.expanded = seed.expanded ?? ancestors(s, s.current);
  return s;
}

export function useConfluence(seed: ConfluenceSeed, options: ConfluenceOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const [state, setState] = useState<ConfluenceState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [notice, setNotice] = useState<{ text: string; n: number } | null>(null);

  const update = useCallback((fn: (draft: ConfluenceState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: ConfluenceEvent) => opts.current.onEvent?.(event), []);

  const toast = useCallback((text: string) => setNotice((n) => ({ text, n: (n?.n ?? 0) + 1 })), []);

  const need = useCallback((pageId: string) => {
    const p = ref.current.pages[pageId];
    if (!p) throw new Error(`Confluence: there is no page "${pageId}"`);
    return p;
  }, []);

  const name = useCallback((id: string) => people[id]?.name ?? id, [people]);

  // ---------- What the world does ----------

  /** Show a page, opening its parents in the sidebar. */
  const show = useCallback(
    (pageId: string) => {
      need(pageId);
      update((s) => {
        s.current = pageId;
        for (const a of ancestors(s, pageId)) if (!s.expanded.includes(a)) s.expanded.push(a);
      });
    },
    [need, update]
  );

  /** Someone comments on a page. Resolves with the comment's id. A toast says so when it is someone else. */
  const addComment = useCallback(
    (pageId: string, from: string, text: string, o: { notify?: boolean } = {}) => {
      const page = need(pageId);
      let id = "";
      update((s) => {
        const c = newComment(s, { from, text });
        id = c.id;
        s.pages[pageId].comments.push(c);
      });
      if (o.notify ?? from !== me) toast(`${name(from)} commented on "${page.title}"`);
      return id;
    },
    [need, update, toast, name, me]
  );

  /** Change a page: its title, its blocks, its author. "Last updated" moves to now unless `updated` is given. */
  const updatePage = useCallback(
    (pageId: string, patch: PagePatch) => {
      need(pageId);
      update((s) => {
        const p = s.pages[pageId];
        const { updated, ...rest } = structuredClone(patch);
        // New content has a new read time, unless the patch sets one.
        if (patch.blocks !== undefined && !("readTime" in patch)) delete p.readTime;
        Object.assign(p, rest);
        if (updated !== undefined) p.updated = toTime(updated);
        else if (patch.title !== undefined || patch.blocks !== undefined) p.updated = Date.now();
      });
    },
    [need, update]
  );

  /** A new page under `parent` (at the top level when left out), last among its siblings. */
  const addPage = useCallback(
    (page: ConfluencePageSeed, parent?: string) => {
      if (parent) need(parent);
      update((s) => {
        const ids = addPages(s, [page], parent ?? null, me);
        if (parent) s.pages[parent].children.push(...ids);
        else s.roots.push(...ids);
      });
    },
    [need, update, me]
  );

  /** Someone likes a page (or stops, with `liked: false`). */
  const like = useCallback(
    (pageId: string, personId: string, liked = true) => {
      need(pageId);
      update((s) => {
        const p = s.pages[pageId];
        p.likes = p.likes.filter((k) => k !== personId);
        if (liked) p.likes.push(personId);
      });
    },
    [need, update]
  );

  /** Someone other than the signed-in person reacts to a page. */
  const react = useCallback(
    (pageId: string, emoji: string) => {
      need(pageId);
      update((s) => {
        const list = s.pages[pageId].reactions;
        const r = list.find((x) => x.emoji === emoji);
        if (r) r.count += 1;
        else list.push({ emoji, count: 1 });
      });
    },
    [need, update]
  );

  /** The red count on the bell. */
  const notify = useCallback((count: number) => void update((s) => void (s.notifications = count)), [update]);

  // ---------- What the signed-in person does (wired by <Confluence>) ----------

  const open = useCallback(
    (pageId: string) => {
      show(pageId);
      emit({ type: "open", pageId });
    },
    [show, emit]
  );

  const toggleExpanded = useCallback(
    (pageId: string) =>
      void update((s) => {
        s.expanded = s.expanded.includes(pageId) ? s.expanded.filter((k) => k !== pageId) : [...s.expanded, pageId];
      }),
    [update]
  );

  const toggleLike = useCallback(() => {
    const pageId = ref.current.current;
    const liked = !ref.current.pages[pageId].likes.includes(me);
    update((s) => {
      const p = s.pages[pageId];
      p.likes = liked ? [me, ...p.likes] : p.likes.filter((k) => k !== me);
    });
    emit({ type: "like", pageId, liked });
  }, [update, emit, me]);

  const toggleReaction = useCallback(
    (emoji: string) => {
      const pageId = ref.current.current;
      let added = true;
      update((s) => {
        const r = s.pages[pageId].reactions.find((x) => x.emoji === emoji);
        if (!r) return;
        added = !r.mine;
        r.mine = added;
        r.count += added ? 1 : -1;
      });
      emit({ type: "react", pageId, emoji, added });
    },
    [update, emit]
  );

  const comment = useCallback(
    (text: string) => {
      const pageId = ref.current.current;
      const id = addComment(pageId, me, text, { notify: false });
      emit({ type: "comment", pageId, text, id });
    },
    [addComment, emit, me]
  );

  const check = useCallback(
    (block: number, item: number) => {
      const pageId = ref.current.current;
      const b = ref.current.pages[pageId].blocks[block];
      if (b?.type !== "tasks" || !b.items[item]) return;
      const done = !b.items[item].done;
      update((s) => {
        const t = s.pages[pageId].blocks[block];
        if (t.type === "tasks") t.items[item].done = done;
      });
      emit({ type: "check", pageId, block, item, text: b.items[item].text, done });
    },
    [update, emit]
  );

  const toggleStar = useCallback(() => {
    const pageId = ref.current.current;
    const starred = !ref.current.pages[pageId].starred;
    update((s) => void (s.pages[pageId].starred = starred));
    emit({ type: "star", pageId, starred });
  }, [update, emit]);

  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);

  const ui = useMemo(
    () => ({ open, toggleExpanded, toggleLike, toggleReaction, comment, check, toggleStar, setTheme, emit }),
    [open, toggleExpanded, toggleLike, toggleReaction, comment, check, toggleStar, setTheme, emit]
  );

  return {
    seed,
    people,
    me,
    /** Save this and pass it back as `restore`. */
    state,
    notice,
    /** The page on screen. */
    page: state.pages[state.current],
    // The world
    open: show,
    addComment,
    updatePage,
    addPage,
    like,
    react,
    notify,
    toast,
    // The signed-in person (wired by <Confluence>)
    ui,
  };
}

export type ConfluenceSpace = ReturnType<typeof useConfluence>;

