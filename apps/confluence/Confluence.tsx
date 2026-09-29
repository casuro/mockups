import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Comments } from "./Comments";
import { ConfluenceContext, useUI, type ConfluenceUI } from "./context";
import type { FormatContext } from "./format";
import { PageView } from "./Page";
import { Sidebar, TopNav } from "./Sidebar";
import type { ConfluenceBlock, ConfluencePage } from "./types";
import type { ConfluenceSpace } from "./use-confluence";
import "./confluence.css";

// Confluence, as in apps/confluence.html. Give it a space from
// useConfluence(); it fills the box it is put in (give that box a height),
// whether that is the whole screen or one pane of it, and narrows to the
// mobile layout, with the sidebar as a drawer, when the box is narrow.

export interface ConfluenceProps {
  confluence: ConfluenceSpace;
  /** Draws a `custom` block: a chart, an embed, anything the kit does not have. */
  renderBlock?: (block: Extract<ConfluenceBlock, { type: "custom" }>, page: ConfluencePage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Confluence({ confluence, renderBlock, className, style }: ConfluenceProps) {
  const root = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const reply = useRef<HTMLTextAreaElement>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const { state, page } = confluence;

  // A new page starts at its top, with the mobile drawer closed.
  useEffect(() => {
    setSideOpen(false);
    main.current?.scrollTo({ top: 0 });
  }, [state.current]);

  useEffect(() => {
    if (!sideOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSideOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sideOpen]);

  const fmt = useMemo<FormatContext>(
    () => ({
      people: confluence.people,
      me: confluence.me,
      issues: confluence.seed.issues ?? {},
      pageTitle: (id) => confluence.state.pages[id]?.title,
      onPage: (id) => {
        if (confluence.state.pages[id]) confluence.ui.open(id);
      },
      onIssue: (key) => confluence.ui.emit({ type: "action", kind: "jira", id: key, pageId: confluence.state.current }),
    }),
    [confluence.people, confluence.me, confluence.seed.issues, confluence.state, confluence.ui]
  );

  const ui: ConfluenceUI = { confluence, fmt, root, main, reply, renderBlock, toggleSide: () => setSideOpen((o) => !o) };

  return (
    <ConfluenceContext.Provider value={ui}>
      <div ref={root} className={`kit-confluence${sideOpen ? " side-open" : ""}${className ? ` ${className}` : ""}`} style={style} data-theme={state.theme}>
        <TopNav />
        <div className="app">
          <Sidebar />
          <div className="scrim" onClick={() => setSideOpen(false)} />
          <main className="main" ref={main}>
            <PageView key={page.id}>
              <Comments />
            </PageView>
          </main>
        </div>
        <Toast />
      </div>
    </ConfluenceContext.Provider>
  );
}

function Toast() {
  const { notice } = useUI().confluence;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(t);
  }, [notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {notice?.text ?? ""}
    </div>
  );
}

