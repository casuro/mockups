import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LinearContext, useUI, type LinearUI, type MenuKind } from "./context";
import * as I from "./icons";
import { DetailHeader, IssueDetail } from "./IssueDetail";
import { IssueList, ListHeader } from "./IssueList";
import { CommandMenu, PropertyMenu, menuItems, type MenuState } from "./Menus";
import { Sidebar } from "./Sidebar";
import type { LinearActivity } from "./types";
import type { LinearWorkspace } from "./use-linear";
import "./linear.css";

// Linear, as in apps/linear.html. Give it a workspace from useLinear(); it
// fills the box it is put in (give that box a height), whether that is the
// whole screen or one pane of it, and narrows to the mobile layout (the
// sidebar in a drawer) when the box is narrow.

export interface LinearProps {
  linear: LinearWorkspace;
  /** Draws an activity line's `custom` part: an attachment, a pull request, anything the kit does not have. */
  renderCustom?: (entry: LinearActivity) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const MENU_WIDTH = 216;

export function Linear({ linear, renderCustom, className, style }: LinearProps) {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [command, setCommand] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { state } = linear;

  // Picking a sidebar item closes the mobile drawer.
  useEffect(() => setDrawer(false), [state.nav]);

  const openMenu = useCallback((anchor: HTMLElement, kind: MenuKind, id: string) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    const r = anchor.getBoundingClientRect();
    const rows = kind === "status" ? linear.statuses.length : kind === "priority" ? 5 : Object.keys(linear.people).length + 1;
    const height = 40 + rows * 30;
    setMenu((m) =>
      m && m.kind === kind && m.id === id
        ? null
        : {
            kind,
            id,
            left: Math.max(8, Math.min(r.left - box.left, box.width - MENU_WIDTH)),
            top: Math.max(8, Math.min(r.bottom - box.top + 4, box.height - height - 8)),
          }
    );
  }, [linear.statuses.length, linear.people]);

  const items = menuItems(linear, menu).items;

  // Linear's keys: Cmd+K the command menu, j/k or the arrows move, Enter opens,
  // Esc closes the menu or the issue, 1-9 pick in an open menu.
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setMenu(null);
      setCommand((c) => !c);
      return;
    }
    if (command) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest?.("input, textarea, select, [contenteditable='true']")) {
      if (e.key === "Escape") t.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      if (menu) setMenu(null);
      else if (state.open) linear.open(null);
      else return;
    } else if (menu && /^[1-9]$/.test(e.key)) {
      const item = items[+e.key - 1];
      if (!item) return;
      item.pick();
      setMenu(null);
    } else if (e.key === "j" || e.key === "ArrowDown") linear.ui.step(1);
    else if (e.key === "k" || e.key === "ArrowUp") linear.ui.step(-1);
    else if (e.key === "Enter" && !state.open && state.selected) linear.open(state.selected);
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey.current(e);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  const ui: LinearUI = {
    linear,
    root,
    renderCustom,
    openMenu,
    openCommand: () => {
      setDrawer(false);
      setCommand(true);
    },
    toggleDrawer: () => setDrawer((d) => !d),
  };

  return (
    <LinearContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-linear${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onClickCapture={(e) => {
          // Like the mockup, a click outside an open menu only closes it.
          const t = e.target as HTMLElement;
          if (menu && !t.closest(".pop") && !t.closest("[data-menu]")) {
            e.stopPropagation();
            e.preventDefault();
            setMenu(null);
          }
        }}
      >
        <div className={`app${drawer ? " drawer-open" : ""}`}>
          <Sidebar />
          <Main />
          {drawer ? <div className="scrim" onClick={() => setDrawer(false)} /> : null}
        </div>
        {menu ? <PropertyMenu menu={menu} close={() => setMenu(null)} /> : null}
        {command ? <CommandMenu close={() => setCommand(false)} /> : null}
        <Toast />
      </div>
    </LinearContext.Provider>
  );
}

function Main() {
  const { linear, toggleDrawer } = useUI();
  const issue = linear.state.open ? linear.state.issues.find((i) => i.id === linear.state.open) : undefined;
  return (
    <main className="main">
      <div className="hdr">
        <button className="icon-btn menu-btn" aria-label="Open sidebar" onClick={toggleDrawer}>
          <I.Menu />
        </button>
        {issue ? <DetailHeader issue={issue} /> : <ListHeader />}
      </div>
      {issue ? (
        <IssueDetail key={issue.id} issue={issue} />
      ) : (
        <div className="scroll">
          <IssueList />
        </div>
      )}
    </main>
  );
}

function Toast() {
  const { linear } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!linear.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(t);
  }, [linear.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {linear.notice?.text ?? ""}
    </div>
  );
}
