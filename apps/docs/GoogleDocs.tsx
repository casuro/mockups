import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { unwrap } from "./content";
import { DocsContext, useUI, type DocsUI, type Selection } from "./context";
import { Menu, STYLES } from "./Menu";
import { Canvas, serialize } from "./Page";
import { ShareDialog } from "./Share";
import { Toolbar } from "./Toolbar";
import { TopBar } from "./TopBar";
import type { GoogleDocsApp } from "./use-google-docs";
import "./docs.css";

// Google Docs, as in apps/docs.html. Give it a document from useGoogleDocs();
// it fills the box it is put in (give that box a height), whether that is
// the whole screen or one pane of it, and narrows to Docs' mobile layout
// when the box is narrow. This file wires the editing: the selection, the
// formatting commands, comments on a selection, menus, Share and the toast.

export interface GoogleDocsProps {
  docs: GoogleDocsApp;
  className?: string;
  style?: CSSProperties;
}

const NO_SELECTION: Selection = {
  bold: false,
  italic: false,
  underline: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  justifyFull: false,
  style: "Normal text",
  size: 11,
};
const SIZES: Record<string, number> = { DIV: 26, H1: 20, H2: 16, H3: 14 };

export function GoogleDocs({ docs, className, style }: GoogleDocsProps) {
  const root = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLElement>(null);
  const layoutRef = useRef<() => void>(() => {});
  const saved = useRef<Range | null>(null);
  const [menu, setMenu] = useState<{ name: string; anchor: HTMLElement } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [sel, setSel] = useState<Selection>(NO_SELECTION);
  const [zoom, setZoom] = useState("100%");
  const [font, setFontLabel] = useState("Arial");
  const [share, setShare] = useState(false);
  const [menusHidden, setMenusHidden] = useState(false);
  const { state } = docs;
  const viewing = state.mode === "Viewing";

  const blockOf = (node: Node | null) => {
    for (let n = node; n && n !== page.current; n = n.parentNode)
      if (n instanceof HTMLElement && /^(P|H1|H2|H3|DIV|LI|TD|TH)$/.test(n.tagName)) return n;
    return null;
  };

  // The toolbar reads the selection: which formats are on, the paragraph's style and size.
  const readSelection = useCallback(() => {
    const next = { ...NO_SELECTION };
    for (const c of Object.keys(NO_SELECTION) as (keyof Selection)[])
      if (typeof next[c] === "boolean") (next as Record<string, unknown>)[c] = document.queryCommandState(c);
    const b = blockOf(window.getSelection()?.anchorNode ?? null);
    const tag = b ? (b.classList.contains("doc-t") ? "DIV" : b.tagName) : "P";
    next.style = (STYLES.find((s) => s[1] === tag) ?? STYLES[0])[0];
    next.size = SIZES[tag] ?? 11;
    setSel((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

  useEffect(() => {
    const onChange = () => {
      const s = window.getSelection();
      if (s?.rangeCount && page.current?.contains(s.anchorNode)) {
        saved.current = s.getRangeAt(0).cloneRange();
        readSelection();
      }
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [readSelection]);

  const restore = () => {
    const s = window.getSelection();
    if (!saved.current || !s) return;
    page.current?.focus({ preventScroll: true });
    s.removeAllRanges();
    s.addRange(saved.current);
  };
  const changed = () => {
    if (page.current) docs.ui.input(serialize(page.current));
    readSelection();
    layoutRef.current();
  };

  const cmd = (command: string, value?: string) => {
    if (viewing) return;
    restore();
    document.execCommand(command, false, value);
    changed();
  };

  const applyStyle = (tag: string) => {
    if (viewing) return;
    restore();
    document.execCommand("formatBlock", false, tag);
    const b = blockOf(window.getSelection()?.anchorNode ?? null);
    if (b && tag === "DIV") b.className = "doc-t";
    else b?.classList.remove("doc-t");
    changed();
  };

  const setFont = (name: string) => {
    restore();
    document.execCommand("fontName", false, name);
    setFontLabel(name);
    changed();
  };

  // A comment on the selection: its highlight goes in now, the card opens with only a box.
  const addComment = () => {
    const s = window.getSelection();
    if (!s?.rangeCount || s.isCollapsed || !page.current?.contains(s.anchorNode)) return docs.toast("Select some text to comment on");
    const id = `n${Date.now().toString(36)}`;
    const span = document.createElement("span");
    span.className = "hl";
    span.dataset.c = id;
    docs.ui.flush(); // what was typed before is an edit; the highlight is not
    try {
      s.getRangeAt(0).surroundContents(span);
    } catch {
      return docs.toast("Select text within a single paragraph to comment");
    }
    s.removeAllRanges();
    docs.ui.input(serialize(page.current));
    docs.ui.flush(true);
    setDraft(id);
    setActive(id);
  };

  const cancelDraft = () => {
    const el = page.current;
    docs.ui.flush();
    el?.querySelectorAll(`[data-c="${draft}"]`).forEach(unwrap);
    if (el) {
      docs.ui.input(serialize(el));
      docs.ui.flush(true);
    }
    setDraft(null);
    setActive(null);
  };

  // A posted draft is a thread now.
  if (draft && state.threads.some((t) => t.id === draft)) setDraft(null);

  const openShare = () => {
    setMenu(null);
    setShare(true);
    docs.ui.emit({ type: "share", action: "open" });
  };

  const toggleMenu = (name: string, anchor: HTMLElement) => setMenu((m) => (m?.anchor === anchor ? null : { name, anchor }));
  const closeMenu = useCallback(() => setMenu(null), []);

  // Esc closes menus and Share; Ctrl+Alt+M comments on the selection.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (e.key === "Escape") {
      setMenu(null);
      setShare(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyM") {
      e.preventDefault();
      addComment();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (root.current?.contains(e.target as Node) || e.target === document.body) keys.current(e);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: DocsUI = {
    docs,
    root,
    page,
    menu,
    toggleMenu,
    closeMenu,
    active,
    setActive,
    draft,
    cancelDraft,
    sel,
    zoom,
    setZoom,
    font,
    cmd,
    applyStyle,
    setFont,
    addComment,
    openShare,
    layoutRef,
    menusHidden,
    toggleMenus: () => setMenusHidden((h) => !h),
  };

  const classes = ["kit-docs", menusHidden ? "no-menus" : "", viewing ? "viewing" : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <DocsContext.Provider value={ui}>
      <div
        ref={root}
        className={classes}
        style={style}
        data-theme={state.theme}
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (menu && !t.closest(".menu, [data-menu]")) setMenu(null);
          // Only a plain click (on the page, the canvas) takes the focus off a comment.
          if (t.closest(".card, button, input, textarea, .menu, .scrim")) return;
          const mark = t.closest<HTMLElement>(".page [data-c], .page [data-s]");
          if (mark) return setActive(mark.dataset.c ?? mark.dataset.s ?? null);
          if (active && !draft) setActive(null);
        }}
      >
        <TopBar />
        <Toolbar />
        <Canvas />
        <Menu />
        {share ? <ShareDialog onClose={() => setShare(false)} /> : null}
        <Toast />
      </div>
    </DocsContext.Provider>
  );
}

function Toast() {
  const { docs } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!docs.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 3000);
    return () => clearTimeout(t);
  }, [docs.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {docs.notice?.text ?? ""}
    </div>
  );
}
