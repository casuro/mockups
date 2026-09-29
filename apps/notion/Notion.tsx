import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { NotionContext, type Box, type NotionUI, type PopKind } from "./context";
import { useEditor } from "./Editor";
import { Page } from "./Page";
import { Sidebar, WorkspaceMenu } from "./Sidebar";
import { SharePop, TopBar } from "./TopBar";
import type { NotionBlock } from "./types";
import type { NotionWorkspace } from "./use-notion";
import "./notion.css";

// Notion, as in apps/notion.html. Give it a workspace from useNotion(); it
// fills the box it is put in (give that box a height), whether that is the
// whole screen or one pane of it, and narrows to Notion's mobile layout
// (the sidebar as a drawer) when the box is narrow.

export interface NotionProps {
  notion: NotionWorkspace;
  /** Draws a `custom` block: an embed, a chart, anything the kit does not have. */
  renderBlock?: (block: NotionBlock) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Notion({ notion, renderBlock, className, style }: NotionProps) {
  const root = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<{ kind: PopKind; anchor: Box } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const pendingFocus = useRef<{ id: string; atEnd: boolean; then?: (el: HTMLElement) => void } | null>(null);
  const [, redraw] = useState(0);
  const { state, ui } = notion;

  const focus = useCallback((id: string, atEnd = true, then?: (el: HTMLElement) => void) => {
    pendingFocus.current = { id, atEnd, then };
    redraw((n) => n + 1);
  }, []);
  const closePop = useCallback(() => setPop(null), []);
  const editor = useEditor({ notion, root, focus, onOpen: closePop });
  const openPop = useCallback((kind: PopKind, from: Element | DOMRect) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    const r = from instanceof Element ? from.getBoundingClientRect() : from;
    editor.closeSlash();
    setPop((p) => (p?.kind === kind ? null : { kind, anchor: { left: r.left - box.left, top: r.top - box.top, right: r.right - box.left, bottom: r.bottom - box.top } }));
  }, [editor]);

  const phone = () => (root.current?.clientWidth ?? 1000) < 760;
  const toggleDrawer = useCallback((open?: boolean) => setDrawer((d) => open ?? !d), []);
  const toggleSidebar = () => (phone() ? setDrawer((d) => !d) : ui.setCollapsed(!notion.state.collapsed));

  // Opening a page closes the drawer.
  useEffect(() => setDrawer(false), [state.current]);

  const flash = useCallback((id: string) => {
    const el = root.current?.querySelector<HTMLElement>(`.blk[data-bid="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }, []);

  // Notion's shortcuts: ⌘\ the sidebar, ⌘⇧L light and dark, Esc closes the top-most thing.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "\\") {
      e.preventDefault();
      toggleSidebar();
    } else if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      ui.setTheme(state.theme === "dark" ? "light" : "dark");
    } else if (e.key === "Escape") {
      if (pop) setPop(null);
      else setDrawer(false);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const value: NotionUI = {
    notion,
    root,
    renderBlock,
    pop,
    openPop,
    closePop,
    focus,
    pendingFocus,
    onTextInput: editor.onTextInput,
    onTextKey: editor.onTextKey,
    startSlash: editor.startSlash,
    toggleDrawer,
    flash,
  };

  return (
    <NotionContext.Provider value={value}>
      <div
        ref={root}
        className={`kit-notion${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest(".pop")) return;
          if (pop && !t.closest(`[data-pop="${pop.kind}"]`)) setPop(null);
          if (editor.slashOpen) editor.closeSlash();
        }}
        onClick={(e) => {
          // Mentions of pages open them; comment highlights show their thread.
          const t = e.target as HTMLElement;
          const page = t.closest<HTMLElement>(".mn[data-pg]");
          if (page?.dataset.pg) return ui.go(page.dataset.pg);
          const thread = t.closest<HTMLElement>(".cm[data-th]");
          if (thread?.dataset.th) ui.openComment(thread.dataset.th);
        }}
      >
        <div className={`app${state.collapsed ? " sb-collapsed" : ""}${drawer ? " drawer-open" : ""}`}>
          <Sidebar onToggle={toggleSidebar} />
          <main className="main">
            <TopBar onToggle={toggleSidebar} />
            <Page />
          </main>
        </div>
        <div className="scrim" onClick={() => setDrawer(false)} />
        <div className="layer">
          {pop?.kind === "workspace" ? <WorkspaceMenu anchor={pop.anchor} /> : null}
          {pop?.kind === "share" ? <SharePop anchor={pop.anchor} /> : null}
          {editor.menu}
        </div>
        <div className="toasts" aria-live="polite">
          {notion.toasts.map((t) => (
            <div key={t.id} className={`toast${t.out ? " out" : ""}`}>{t.text}</div>
          ))}
        </div>
      </div>
    </NotionContext.Provider>
  );
}
