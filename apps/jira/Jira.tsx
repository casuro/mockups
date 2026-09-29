import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Backlog } from "./Backlog";
import { Board } from "./Board";
import { JiraContext, useUI, type BoardFilters, type JiraUI, type ListFilters, type Pop, type PopOptions } from "./context";
import { ConfirmDialog, CreateDialog, ShortcutsDialog } from "./Dialogs";
import { useDnd } from "./dnd";
import * as I from "./icons";
import { IssueView } from "./Issue";
import { IssueList } from "./IssueList";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import type { JiraIssue, JiraView } from "./types";
import type { JiraProject } from "./use-jira";
import "./jira.css";

// Jira, as in apps/jira.html. Give it a project from useJira(); it fills
// the box it is put in (give that box a height), whether that is the whole
// screen or one pane of it, and narrows to Jira's phone layout when the box
// is narrow.

export interface JiraProps {
  jira: JiraProject;
  /** Draws an issue's `custom` part under its description: a form, an approval, anything the kit does not have. */
  renderCustom?: (issue: JiraIssue) => ReactNode;
  /** Draws the pages the kit does not have (Timeline, Reports, Code...). An empty page with the title otherwise. */
  renderPage?: (view: JiraView) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const NO_FILTERS: BoardFilters = { assignees: [], mine: false, recent: false, boardQuery: "", backlogQuery: "", groupBy: "none", closedLanes: [], closedSections: [], inline: null };
const NO_LIST: ListFilters = { type: [], status: [], assignee: [], text: "", sort: { col: "key", dir: "desc" }, jql: false };

export function Jira({ jira, renderCustom, renderPage, className, style }: JiraProps) {
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState<Pop | null>(null);
  const [dialog, setDialog] = useState<ReactNode>(null);
  const [filters, setFilters] = useState<BoardFilters>(NO_FILTERS);
  const [list, setList] = useState<ListFilters>(NO_LIST);
  const dialogReturn = useRef<Element | null>(null);
  const { state } = jira;

  // Phone layout follows the box, not the window.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPhone(el.clientWidth < 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { drag, start: dragStart, justDragged } = useDnd(root, (key, zone, before, after) => {
    const [target, lane] = zone.split("|");
    jira.ui.drop(key, target, lane ?? "", before, after);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-dnd][data-key="${key}"]`)?.focus({ preventScroll: true }));
  });

  const closePop = useCallback(() => setPop(null), []);
  const openPop = useCallback((anchor: HTMLElement, content: ReactNode, o: PopOptions) => {
    setPop((p) => (p && p.id === o.id && o.toggle !== false ? null : { ...o, anchor, content }));
  }, []);
  const openDialog = useCallback((d: ReactNode) => {
    setPop(null);
    dialogReturn.current = document.activeElement;
    setDialog(d);
  }, []);
  const closeDialog = useCallback(() => {
    setDialog(null);
    const r = dialogReturn.current as HTMLElement | null;
    dialogReturn.current = null;
    if (r?.isConnected) r.focus({ preventScroll: true });
  }, []);
  const confirm = useCallback((o: { title: string; body: string; ok: string; run: () => void }) => openDialog(<ConfirmDialog {...o} />), [openDialog]);
  const create = useCallback((preset: { type?: string; status?: string } = {}) => openDialog(<CreateDialog preset={preset} />), [openDialog]);
  const toggleSidebar = useCallback(() => (phone ? setDrawer((d) => !d) : setCollapsed((c) => !c)), [phone]);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  // Moving to another page closes the drawer and the "Create issue" box.
  useEffect(() => {
    setDrawer(false);
    setFilters((f) => (f.inline ? { ...f, inline: null } : f));
  }, [state.view]);

  // Popovers close on a press anywhere else.
  useEffect(() => {
    if (!pop) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const host = root.current?.querySelector(".pop");
      if (host?.contains(t) || pop.anchor.contains(t)) return;
      setPop(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [pop]);

  // Jira's shortcuts: c create, / search, ? help, [ sidebar, j/k cards, i m e on an issue, Esc closes the top-most thing.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const t = e.target as HTMLElement;
    const box = root.current;
    if (!box || (!box.contains(t) && t !== document.body)) return;
    if (e.key === "Escape") {
      if (pop) {
        const a = pop.anchor;
        setPop(null);
        if (a.isConnected) a.focus();
      } else if (dialog) closeDialog();
      else if (state.open && !state.fullPage) jira.ui.closeIssue();
      else if (drawer) setDrawer(false);
      return;
    }
    if (pop && (e.key === "ArrowDown" || e.key === "ArrowUp") && box.querySelector(".pop")?.contains(t)) {
      const items = [...box.querySelectorAll<HTMLElement>(".pop .mi:not([disabled]):not([hidden]), .pop .np-item, .pop .sw-item, .pop .mi-foot")];
      const i = items.indexOf(t.closest(".mi, .np-item, .sw-item, .mi-foot") as HTMLElement);
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      return;
    }
    if (e.key === "Enter" && t.matches(".card, .bl-row, tr[data-key], .desc")) {
      e.preventDefault();
      t.click();
      return;
    }
    const typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    if (typing || e.metaKey || e.ctrlKey || e.altKey || dialog) return;
    const issueOpen = !!state.open;
    const act = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    switch (e.key) {
      case "c": return act(() => create());
      case "/": return act(() => {
        if (state.open && !state.fullPage) jira.ui.closeIssue();
        box.querySelector<HTMLInputElement>(".search input")?.focus();
      });
      case "?": return act(() => openDialog(<ShortcutsDialog />));
      case "[": return act(toggleSidebar);
      case "i": return issueOpen ? act(() => jira.ui.assign(state.open!, jira.me, true)) : undefined;
      case "m": return issueOpen ? act(() => box.querySelector<HTMLElement>(".issue-view [data-open-composer]")?.click()) : undefined;
      case "e": return issueOpen ? act(() => box.querySelector<HTMLElement>(".issue-view .im-summary")?.click()) : undefined;
      case "j":
      case "k": {
        if (issueOpen) return;
        const cards = [...box.querySelectorAll<HTMLElement>(".main .card, .main .bl-row")];
        if (!cards.length) return;
        e.preventDefault();
        const i = cards.indexOf(t.closest(".card, .bl-row") as HTMLElement);
        const n = i < 0 ? cards[0] : cards[Math.max(0, Math.min(cards.length - 1, i + (e.key === "j" ? 1 : -1)))];
        n.focus();
        n.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: JiraUI = {
    jira, root, phone, pop, openPop, closePop, openDialog, closeDialog, confirm, create,
    filters, setFilters, list, setList, drag, dragStart, justDragged, toggleSidebar, closeDrawer, renderCustom, renderPage,
  };

  const appClass = ["app", !phone && collapsed ? "sb-collapsed" : "", phone && drawer ? "drawer-open" : ""].filter(Boolean).join(" ");

  return (
    <JiraContext.Provider value={ui}>
      <div ref={root} className={`kit-jira${className ? ` ${className}` : ""}`} style={style} data-theme={state.theme}>
        <div className={appClass}>
          <TopNav />
          <div className="shell">
            <Sidebar hidden={phone ? !drawer : collapsed} />
            <Main />
          </div>
        </div>
        {phone && drawer ? <div className="scrim" onClick={closeDrawer} /> : null}
        {state.open && !state.fullPage ? (
          <div className="blanket" onMouseDown={(e) => e.target === e.currentTarget && jira.ui.closeIssue()}>
            <IssueView key={state.open} issueKey={state.open} />
          </div>
        ) : null}
        {dialog ? (
          <div className="blanket" onMouseDown={(e) => e.target === e.currentTarget && closeDialog()}>
            {dialog}
          </div>
        ) : null}
        <PopHost />
        <div className="drag-layer" />
        <Flags />
      </div>
    </JiraContext.Provider>
  );
}

const TITLES: Record<string, string> = { timeline: "Timeline", reports: "Reports", components: "Components", code: "Code", releases: "Releases", pages: "Project pages", yourwork: "Your work" };

function Main() {
  const { jira, renderPage } = useUI();
  const { state } = jira;
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [state.view, state.fullPage]);
  const view = state.fullPage && state.open ? "issue" : state.view;
  const page =
    view === "issue" ? (
      <div className="page issue-page" style={{ paddingTop: 16 }}>
        <IssueView key={state.open!} issueKey={state.open!} full />
      </div>
    ) : view === "board" ? <Board />
    : view === "backlog" ? <Backlog />
    : view === "list" ? <IssueList />
    : (renderPage?.(view) ?? (
        <div className="page">
          <div className="empty-state">
            <h2>{TITLES[view] ?? view}</h2>
          </div>
        </div>
      ));
  return (
    <main ref={main} className={`main${view === "board" ? " fixed" : ""}`}>
      {page}
    </main>
  );
}

function PopHost() {
  const { pop, root } = useUI();
  const el = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!pop || !el.current || !root.current) return setPos(null);
    const place = () => {
      const box = root.current!.getBoundingClientRect();
      const r = pop.anchor.getBoundingClientRect();
      const pw = el.current!.offsetWidth;
      const ph = el.current!.offsetHeight;
      let left = pop.align === "right" ? r.right - box.left - pw : r.left - box.left;
      left = Math.max(8, Math.min(left, box.width - pw - 8));
      let top = r.bottom - box.top + 4;
      if (top + ph > box.height - 8) top = r.top - box.top - ph - 4 > 8 ? r.top - box.top - ph - 4 : Math.max(8, box.height - ph - 8);
      setPos({ left, top });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el.current);
    return () => ro.disconnect();
  }, [pop, root]);

  // A fresh popover puts the keyboard on its first item.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!pop) return void (opened.current = null);
    if (opened.current === pop.id) return;
    opened.current = pop.id;
    if (pop.focus === false) return;
    el.current?.querySelector<HTMLElement>("input, .mi:not([disabled]), button")?.focus({ preventScroll: true });
  }, [pop]);

  if (!pop) return null;
  return (
    <div className="pop-host">
      <div
        ref={el}
        className={`pop ${pop.cls ?? ""}`}
        role="menu"
        tabIndex={-1}
        style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden", left: 0, top: 0 }}
      >
        {pop.content}
      </div>
    </div>
  );
}

const FLAG_ICONS = { success: I.CheckCircle, info: I.InfoCircle, warning: I.Warn, error: I.ErrIc };

function Flags() {
  const { jira } = useUI();
  return (
    <div className="flags" aria-live="polite">
      {jira.flags.map((f) => <FlagView key={f.id} id={f.id} />)}
    </div>
  );
}

function FlagView({ id }: { id: number }) {
  const { jira } = useUI();
  const f = jira.flags.find((x) => x.id === id)!;
  const { dismiss } = jira.ui;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    timer.current = setTimeout(() => dismiss(id), 6000);
    return () => clearTimeout(timer.current);
  }, [id, dismiss]);
  const Icon = FLAG_ICONS[f.type ?? "success"];
  return (
    <div
      className="flag"
      role={f.type === "error" ? "alert" : "status"}
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={() => (timer.current = setTimeout(() => dismiss(id), 2500))}
    >
      <span className={`f-ic ${f.type ?? "success"}`}><Icon width={24} height={24} style={{ width: 24, height: 24 }} /></span>
      <div className="f-body">
        <div className="f-title">{f.title}</div>
        {f.body ? <div className="f-desc">{f.body}</div> : null}
        {f.actions?.length ? (
          <div className="f-acts">
            {f.actions.map((a) => (
              <button key={a.label} onClick={() => (dismiss(id), a.run())}>{a.label}</button>
            ))}
          </div>
        ) : null}
      </div>
      <button className="f-x" aria-label="Dismiss" onClick={() => dismiss(id)}><I.Close /></button>
    </div>
  );
}
