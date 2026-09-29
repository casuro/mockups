import { useState, type ReactNode } from "react";
import { Avatar, useUI, type MenuKind } from "./context";
import * as I from "./icons";
import type { Priority } from "./types";
import { PRIORITIES, type LinearWorkspace } from "./use-linear";

// The two floating menus: a property menu (status, priority, assignee)
// under the button that opened it, and the Cmd+K command menu.

export interface MenuState {
  kind: MenuKind;
  id: string;
  left: number;
  top: number;
}

export interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  current: boolean;
  pick: () => void;
}

/** What a property menu lists for an issue; number keys pick by position. */
export function menuItems(linear: LinearWorkspace, menu: MenuState | null): { title: string; items: MenuItem[] } {
  const issue = menu ? linear.state.issues.find((i) => i.id === menu.id) : undefined;
  if (!menu || !issue) return { title: "", items: [] };
  if (menu.kind === "status")
    return {
      title: "Change status...",
      items: linear.statuses.map((s) => ({
        key: s.id,
        label: s.name,
        icon: <I.StatusIcon status={s} />,
        current: s.id === issue.status,
        pick: () => linear.ui.setStatus(issue.id, s.id),
      })),
    };
  if (menu.kind === "priority")
    return {
      title: "Change priority...",
      items: ([0, 1, 2, 3, 4] as Priority[]).map((p) => ({
        key: String(p),
        label: PRIORITIES[p],
        icon: <I.PriorityIcon priority={p} />,
        current: p === issue.priority,
        pick: () => linear.ui.setPriority(issue.id, p),
      })),
    };
  return {
    title: "Assign to...",
    items: [null, ...Object.keys(linear.people)].map((id) => ({
      key: id ?? "none",
      label: id ? linear.people[id].name : "No assignee",
      icon: <Avatar id={id} />,
      current: id === issue.assignee,
      pick: () => linear.ui.setAssignee(issue.id, id),
    })),
  };
}

export function PropertyMenu({ menu, close }: { menu: MenuState; close: () => void }) {
  const { title, items } = menuItems(useUI().linear, menu);
  return (
    <div className="pop" role="menu" style={{ left: menu.left, top: menu.top }}>
      <div className="pop-search">{title}</div>
      {items.map((item, n) => (
        <button
          key={item.key}
          role="menuitem"
          className="pop-item"
          onClick={() => {
            item.pick();
            close();
          }}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.current ? (
            <span className="chk"><I.Check /></span>
          ) : n < 9 ? (
            <span className="kbd">{n + 1}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function CommandMenu({ close }: { close: () => void }) {
  const { linear } = useUI();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const team = linear.teams.find((t) => t.id === linear.state.team) ?? linear.teams[0];
  const needle = q.trim().toLowerCase();
  const items = linear.state.issues.filter((i) => !needle || `${i.id} ${i.title}`.toLowerCase().includes(needle)).slice(0, 8);
  const status = (id: string) => linear.statuses.find((s) => s.id === id) ?? linear.statuses[0];
  const open = (id: string) => {
    close();
    linear.open(id);
  };

  return (
    <div className="cmdk-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="cmdk" role="dialog" aria-label="Command menu">
        <span className="cmdk-ctx">{team.name}</span>
        <input
          autoFocus
          placeholder="Type a command or search..."
          aria-label="Type a command or search"
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAt(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % Math.max(items.length, 1));
            } else if (e.key === "Enter" && items[at]) open(items[at].id);
            else return;
            e.stopPropagation();
          }}
        />
        <div className="cmdk-list">
          {q ? null : (
            <>
              <div className="cmdk-h">Actions</div>
              <button
                className="pop-item"
                onClick={() => {
                  close();
                  linear.ui.create();
                }}
              >
                <I.Edit />
                <span>Create new issue</span>
                <span className="kbd">C</span>
              </button>
              <button
                className="pop-item"
                onClick={() => {
                  close();
                  linear.ui.navigate("mine");
                }}
              >
                <I.Mine />
                <span>Go to my issues</span>
                <span className="kbd">G then M</span>
              </button>
            </>
          )}
          <div className="cmdk-h">Issues</div>
          {items.length ? (
            items.map((i, n) => (
              <button key={i.id} className={`pop-item${n === at ? " on" : ""}`} onClick={() => open(i.id)}>
                <I.StatusIcon status={status(i.status)} />
                <span className="iid">{i.id}</span>
                <span className="ttl" style={{ fontWeight: 450 }}>{i.title}</span>
              </button>
            ))
          ) : (
            <div className="cmdk-h" style={{ padding: 10 }}>No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
