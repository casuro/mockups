import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormatContext } from "./format";
import type {
  NotionBlock,
  NotionBlockData,
  NotionBlockInput,
  NotionBlockType,
  NotionComment,
  NotionEvent,
  NotionPage,
  NotionPageSeed,
  NotionSeed,
  NotionState,
  NotionTeamspace,
} from "./types";

// The workspace behind <Notion>: its state, what the world does to it
// (edit a page, add blocks, someone opens the page, a comment arrives) and
// what the signed-in person does (open, type, insert, check, share). Every
// change goes through `update`, which keeps a ref in step with React
// state, so calls made between renders (timers, awaited replies) see what
// the last one wrote. Every function it returns is stable across renders.

export interface Person {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  photo?: string;
}

export interface NotionOptions {
  /** A state saved from `notion.state`, to pick up where it was left. */
  restore?: NotionState | null;
  /** Everything the signed-in person does. */
  onEvent?: (event: NotionEvent) => void;
}

/** A page's fields to change. `blocks` replaces all of them. */
export type PagePatch = Partial<Omit<NotionPageSeed, "id">>;

export type CommentTarget = { block: string; quote: string } | { thread: string };

const PALETTE = ["#e8a33d", "#e01e5a", "#1264a3", "#2bac76", "#7c3085", "#0b4c8c", "#d4582b", "#36c5f0"];
const colorFor = (id: string) => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const toTime = (at: number | string | undefined, fallback = Date.now()) =>
  typeof at === "number" ? at : at ? Date.parse(at) || fallback : fallback;

/** Blocks that hold text the person types into. */
export const TEXT_TYPES: NotionBlockType[] = ["text", "h1", "h2", "h3", "bullet", "number", "todo", "toggle", "quote", "callout", "code"];
export const hasText = (b: NotionBlock) => TEXT_TYPES.includes(b.type);
export const textOf = (b: NotionBlock) => ("text" in b ? (b.text ?? "") : "");

/** Where a block sits: the list it is in (a page's blocks or a block's children) and its index there. */
export function locate(state: NotionState, id: string, prefer = state.current) {
  const search = (list: NotionBlock[]): { list: NotionBlock[]; index: number; block: NotionBlock } | null => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return { list, index: i, block: list[i] };
      const inner = search(list[i].children);
      if (inner) return inner;
    }
    return null;
  };
  for (const pid of [prefer, ...Object.keys(state.pages).filter((p) => p !== prefer)]) {
    const page = state.pages[pid];
    const found = page && search(page.blocks);
    if (found) return { page, ...found };
  }
  return null;
}

function makeBlock(input: NotionBlockInput, next: () => string): NotionBlock {
  const { children, id, ...rest } = input;
  return { ...(rest as NotionBlockData), id: id ?? next(), children: (children ?? []).map((c) => makeBlock(c, next)) } as NotionBlock;
}

function makePage(p: NotionPageSeed, me: string, next: () => string): NotionPage {
  return {
    ...p,
    title: p.title ?? "",
    parent: p.parent ?? "private",
    by: p.by ?? me,
    edited: toTime(p.edited, Date.now() - 3_600_000),
    presence: p.presence ?? [],
    share: p.share ?? [{ person: me, access: "Full access" }],
    access: p.access ?? "Can edit",
    blocks: (p.blocks ?? []).map((b) => makeBlock(b, next)),
  };
}

function normalizePeople(seed: NotionSeed): Record<string, Person> {
  const out: Record<string, Person> = {};
  for (const [id, p] of Object.entries(seed.people))
    out[id] = { id, name: p.name, email: p.email ?? "", photo: p.photo, color: p.color ?? colorFor(id), initials: p.initials ?? p.name.trim().charAt(0).toUpperCase() };
  if (!out[seed.me]) throw new Error(`Notion: seed.me "${seed.me}" is not one of seed.people`);
  return out;
}

function initialState(seed: NotionSeed): NotionState {
  let seq = 0;
  const next = () => `b${++seq}`;
  const pages: NotionState["pages"] = {};
  for (const p of seed.pages) pages[p.id] = makePage(p, seed.me, next);
  const comments: NotionState["comments"] = {};
  for (const [id, list] of Object.entries(seed.comments ?? {})) comments[id] = list.map((c) => ({ ...c, at: toTime(c.at) }));
  const teamspaces = seed.teamspaces ?? [];
  return {
    version: 1,
    current: seed.open ?? seed.pages[0]?.id ?? "",
    pages,
    order: seed.pages.map((p) => p.id),
    favorites: seed.favorites ?? [],
    expanded: teamspaces.map((t) => t.id),
    collapsed: false,
    comments,
    theme: seed.theme ?? "light",
    seq,
  };
}

function touched(s: NotionState, pageId: string, me: string) {
  s.pages[pageId].edited = Date.now();
  s.pages[pageId].by = me;
}

/** Turns a block into another type, keeping its id, colors, children and text. */
export function converted(b: NotionBlock, to: NotionBlockType): NotionBlock {
  const base = { id: b.id, color: b.color, background: b.background, children: b.children };
  const text = to === "code" ? textOf(b).replace(/\\(.)/g, "$1") : textOf(b);
  switch (to) {
    case "todo": return { ...base, type: to, text, checked: false };
    case "toggle": return { ...base, type: to, text, open: false };
    case "callout": return { ...base, type: to, text, icon: "💡" };
    case "code": return { ...base, type: to, text, language: "plain" };
    case "divider": return { ...base, type: to };
    case "text": case "h1": case "h2": case "h3": case "bullet": case "number": case "quote":
      return { ...base, type: to, text };
    default: return b;
  }
}

export function useNotion(seed: NotionSeed, options: NotionOptions = {}) {
  const people = useMemo(() => normalizePeople(seed), [seed]);
  const me = seed.me;
  const teamspaces: NotionTeamspace[] = useMemo(() => seed.teamspaces ?? [], [seed]);
  const [state, setState] = useState<NotionState>(() => (options.restore?.version === 1 ? options.restore : initialState(seed)));
  const ref = useRef(state);
  const opts = useRef(options);
  opts.current = options;
  const [toasts, setToasts] = useState<{ id: number; text: string; out: boolean }[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const t = timers.current;
    const p = pending.current;
    return () => {
      t.forEach(clearTimeout);
      p.forEach(clearTimeout);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  }, []);

  const update = useCallback((fn: (draft: NotionState) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const emit = useCallback((event: NotionEvent) => opts.current.onEvent?.(event), []);

  /** Typing is reported once it pauses, not on every key. */
  const emitSoon = useCallback((key: string, event: NotionEvent) => {
    clearTimeout(pending.current.get(key));
    pending.current.set(key, setTimeout(() => {
      pending.current.delete(key);
      emit(event);
    }, 600));
  }, [emit]);

  const nextId = (s: NotionState) => () => `b${++s.seq}`;

  const fmt = useMemo<FormatContext>(() => ({
    me,
    person: (id) => people[id],
    page: (id) => ref.current.pages[id],
  }), [me, people]);

  const toastSeq = useRef(0);
  const toast = useCallback((text: string) => {
    const id = ++toastSeq.current;
    setToasts((list) => [...list, { id, text, out: false }].slice(-3));
    later(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, out: true } : t)));
      later(() => setToasts((list) => list.filter((t) => t.id !== id)), 220);
    }, 2600);
  }, [later]);

  const needPage = useCallback((id: string) => {
    if (!ref.current.pages[id]) throw new Error(`Notion: there is no page "${id}"`);
    return id;
  }, []);

  // ---------- What the world does ----------

  /** Show a page. */
  const open = useCallback((id: string) => {
    needPage(id);
    update((s) => void (s.current = id));
  }, [needPage, update]);

  /** Change a page: its title, icon, cover, who edited it and when, its sharing, or (with `blocks`) all its content. */
  const updatePage = useCallback((id: string, patch: PagePatch) => {
    needPage(id);
    update((s) => {
      const p = s.pages[id];
      const { blocks, edited, ...rest } = patch;
      Object.assign(p, rest);
      if (edited !== undefined) p.edited = toTime(edited);
      if (blocks) p.blocks = blocks.map((b) => makeBlock(b, nextId(s)));
    });
  }, [needPage, update]);

  /** A new page appears (in the sidebar, or as a row when its parent is a database). */
  const addPage = useCallback((page: NotionPageSeed) => {
    update((s) => {
      s.pages[page.id] = makePage(page, me, nextId(s));
      if (!s.order.includes(page.id)) s.order.push(page.id);
    });
  }, [update, me]);

  /** Blocks land at the end of a page, or right after block `after`. Returns their ids. */
  const appendBlocks = useCallback((pageId: string, blocks: NotionBlockInput[], o: { after?: string; by?: string } = {}) => {
    needPage(pageId);
    const ids: string[] = [];
    update((s) => {
      const made = blocks.map((b) => makeBlock(b, nextId(s)));
      ids.push(...made.map((b) => b.id));
      const at = o.after ? locate(s, o.after, pageId) : null;
      if (at) at.list.splice(at.index + 1, 0, ...made);
      else s.pages[pageId].blocks.push(...made);
      s.pages[pageId].edited = Date.now();
      if (o.by) s.pages[pageId].by = o.by;
    });
    return ids;
  }, [needPage, update]);

  /** Change one block: its text, whether it is checked or open, its rows... */
  const updateBlock = useCallback((id: string, patch: Partial<NotionBlockInput>) => {
    update((s) => {
      const at = locate(s, id);
      if (!at) throw new Error(`Notion: there is no block "${id}"`);
      const { children, ...rest } = patch;
      Object.assign(at.block, rest);
      if (children) at.block.children = children.map((c) => makeBlock(c, nextId(s)));
    });
  }, [update]);

  const removeBlock = useCallback((id: string) => {
    update((s) => {
      const at = locate(s, id);
      if (at) at.list.splice(at.index, 1, ...at.block.children);
    });
  }, [update]);

  /** Who is viewing a page now (the faces at the top right); the page on screen by default. */
  const setPresence = useCallback((ids: string[], pageId?: string) => {
    update((s) => void (s.pages[pageId ?? s.current].presence = [...ids]));
  }, [update]);

  /**
   * Someone comments: on words of a block (they get the yellow highlight), or in a thread
   * already there. Returns the thread's id.
   */
  const comment = useCallback((target: CommentTarget, message: Omit<NotionComment, "at">) => {
    let thread = "thread" in target ? target.thread : "";
    update((s) => {
      if (!("thread" in target)) {
        const at = locate(s, target.block);
        if (!at || !("text" in at.block)) throw new Error(`Notion: there is no text block "${target.block}"`);
        const text = at.block.text ?? "";
        const i = text.indexOf(target.quote);
        if (i < 0) throw new Error(`Notion: "${target.quote}" is not in block "${target.block}"`);
        thread = `c${++s.seq}`;
        at.block.text = `${text.slice(0, i)}[${target.quote}](comment:${thread})${text.slice(i + target.quote.length)}`;
      }
      (s.comments[thread] ??= []).push({ ...message, at: Date.now() });
    });
    toast(`${people[message.from]?.name ?? message.from} commented: ${message.text}`);
    return thread;
  }, [update, toast, people]);

  // ---------- What the signed-in person does (wired by <Notion>) ----------

  const go = useCallback((id: string) => {
    if (!ref.current.pages[id]) return;
    update((s) => void (s.current = id));
    emit({ type: "open", page: id });
  }, [update, emit]);

  const editText = useCallback((id: string, text: string) => {
    let pageId = "";
    update((s) => {
      const at = locate(s, id);
      if (!at || !hasText(at.block)) return;
      (at.block as { text?: string }).text = text;
      pageId = at.page.id;
      touched(s, pageId, me);
    });
    if (pageId) emitSoon(id, { type: "edit", page: pageId, block: id, text });
  }, [update, emitSoon, me]);

  const editCaption = useCallback((id: string, caption: string) => {
    let pageId = "";
    update((s) => {
      const at = locate(s, id);
      if (at?.block.type !== "image") return;
      at.block.caption = caption;
      pageId = at.page.id;
    });
    if (pageId) emitSoon(id, { type: "edit", page: pageId, block: id, text: caption });
  }, [update, emitSoon]);

  const editCell = useCallback((id: string, row: number, col: number, text: string) => {
    let pageId = "";
    update((s) => {
      const at = locate(s, id);
      if (at?.block.type !== "table") return;
      at.block.rows[row][col] = text;
      pageId = at.page.id;
      touched(s, pageId, me);
    });
    if (pageId) emitSoon(`${id}:${row}:${col}`, { type: "edit", page: pageId, block: id, text, cell: [row, col] });
  }, [update, emitSoon, me]);

  const editTitle = useCallback((title: string) => {
    const page = ref.current.current;
    update((s) => {
      s.pages[page].title = title;
      touched(s, page, me);
    });
    emitSoon(`title:${page}`, { type: "rename", page, title });
  }, [update, emitSoon, me]);

  /** A new block right after `after`. Returns its id. */
  const insertAfter = useCallback((after: string, input: NotionBlockInput) => {
    let id = "";
    let pageId = "";
    update((s) => {
      const at = locate(s, after);
      if (!at) return;
      const b = makeBlock(input, nextId(s));
      id = b.id;
      pageId = at.page.id;
      at.list.splice(at.index + 1, 0, b);
      touched(s, pageId, me);
    });
    if (id) emit({ type: "insert", page: pageId, block: id, blockType: input.type, after });
    return id;
  }, [update, emit, me]);

  const turnInto = useCallback((id: string, to: NotionBlockType, text?: string) => {
    let from: NotionBlockType | null = null;
    let pageId = "";
    update((s) => {
      const at = locate(s, id);
      if (!at) return;
      from = at.block.type;
      pageId = at.page.id;
      const b = converted(at.block, to);
      if (text !== undefined && "text" in b) b.text = text;
      at.list[at.index] = b;
      touched(s, pageId, me);
    });
    if (from) emit({ type: "turn-into", page: pageId, block: id, from, to });
  }, [update, emit, me]);

  const remove = useCallback((id: string) => {
    const at = locate(ref.current, id);
    if (!at) return;
    removeBlock(id);
    emit({ type: "delete", page: at.page.id, block: id });
  }, [removeBlock, emit]);

  const check = useCallback((id: string) => {
    let checked = false;
    let pageId = "";
    update((s) => {
      const at = locate(s, id);
      if (at?.block.type !== "todo") return;
      checked = at.block.checked = !at.block.checked;
      pageId = at.page.id;
    });
    if (pageId) emit({ type: "todo", page: pageId, block: id, checked });
  }, [update, emit]);

  const flip = useCallback((id: string) => {
    let open = false;
    let pageId = "";
    update((s) => {
      const at = locate(s, id);
      if (at?.block.type !== "toggle") return;
      open = at.block.open = !at.block.open;
      pageId = at.page.id;
    });
    if (pageId) emit({ type: "toggle", page: pageId, block: id, open });
  }, [update, emit]);

  const favorite = useCallback(() => {
    const page = ref.current.current;
    const on = !ref.current.favorites.includes(page);
    update((s) => void (s.favorites = on ? [...s.favorites, page] : s.favorites.filter((f) => f !== page)));
    toast(on ? "Added to Favorites" : "Removed from Favorites");
    emit({ type: "favorite", page, on });
  }, [update, toast, emit]);

  const linkTo = useCallback(
    (page: string) => `${(seed.workspace.url ?? `https://www.notion.so/${seed.workspace.name.toLowerCase().replace(/\W+/g, "-")}`).replace(/\/$/, "")}/${page}`,
    [seed.workspace.url, seed.workspace.name]
  );

  const invite = useCallback((email: string) => {
    const domain = seed.workspace.domain;
    if (domain && !email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) {
      toast(`Only people with a ${domain} email can be invited`);
      return false;
    }
    toast(`Invited ${email}`);
    emit({ type: "share", page: ref.current.current, action: "invite", email });
    return true;
  }, [seed.workspace.domain, toast, emit]);

  const copyLink = useCallback(() => {
    const url = linkTo(ref.current.current);
    navigator.clipboard?.writeText(url).catch(() => {});
    toast("Copied link to clipboard");
    emit({ type: "share", page: ref.current.current, action: "copy-link", url });
  }, [linkTo, toast, emit]);

  const openComment = useCallback((thread: string) => {
    const last = ref.current.comments[thread]?.at(-1);
    if (last) toast(`${people[last.from]?.name ?? last.from}: ${last.text}`);
    emit({ type: "comment", page: ref.current.current, thread });
  }, [toast, emit, people]);

  const action = useCallback((name: string, id?: string) => emit({ type: "action", name, page: ref.current.current, ...(id ? { id } : {}) }), [emit]);
  const setTheme = useCallback((theme: "light" | "dark") => void update((s) => void (s.theme = theme)), [update]);
  const expand = useCallback((key: string) => void update((s) => void (s.expanded = s.expanded.includes(key) ? s.expanded.filter((k) => k !== key) : [...s.expanded, key])), [update]);
  const setCollapsed = useCallback((collapsed: boolean) => void update((s) => void (s.collapsed = collapsed)), [update]);

  const ui = useMemo(() => ({
    go, editText, editCaption, editCell, editTitle, insertAfter, turnInto, remove, check, flip,
    favorite, invite, copyLink, openComment, action, setTheme, expand, setCollapsed, emit,
  }), [go, editText, editCaption, editCell, editTitle, insertAfter, turnInto, remove, check, flip, favorite, invite, copyLink, openComment, action, setTheme, expand, setCollapsed, emit]);

  return {
    seed,
    people,
    me,
    teamspaces,
    /** Save this and pass it back as `restore`. */
    state,
    /** The page on screen. */
    page: state.pages[state.current],
    toasts,
    fmt,
    // The world
    open,
    updatePage,
    addPage,
    appendBlocks,
    updateBlock,
    removeBlock,
    setPresence,
    comment,
    toast,
    // The signed-in person (wired by <Notion>)
    ui,
  };
}

export type NotionWorkspace = ReturnType<typeof useNotion>;
