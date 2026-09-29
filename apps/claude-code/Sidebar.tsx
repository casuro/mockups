import { useEffect, useRef, useState, type RefObject } from "react";
import { Avatar, useUI } from "./context";
import { ConfirmDelete } from "./Dialogs";
import { groupOf, MOD } from "./format";
import * as I from "./icons";
import type { SessionState } from "./types";

// The sessions sidebar: the brand and collapse button, New session and
// search, the sessions grouped by day with their status, the archived
// ones, and the account button with its menu.

function Status({ s }: { s: SessionState }) {
  if (s.archived) return <span className="st"><I.Archive /></span>;
  if (s.status === "running") return <span className="st"><span className="ring-spin" /></span>;
  if (s.status === "input") return <span className="st" style={{ color: "var(--accent)" }}><I.Hand /></span>;
  if (s.status === "done") return <span className="st done"><I.Check /></span>;
  return <span className="st"><span className="dot" /></span>;
}

function Row({ s, renaming, setRenaming }: { s: SessionState; renaming: boolean; setRenaming: (id: string | null) => void }) {
  const { app, openMenu, openModal, menuAnchor, setDrawer } = useUI();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (renaming) input.current?.select();
  }, [renaming]);
  const label = s.status === "running" ? "Running" : s.status === "input" ? "Needs input" : s.archived ? "Archived" : s.status === "done" ? "Done" : "Idle";
  const commit = (v: string) => {
    setRenaming(null);
    if (v.trim() && v.trim() !== s.title) app.ui.rename(s.id, v);
  };
  const menu = (btn: HTMLElement) =>
    openMenu(
      btn,
      [
        { label: "Rename", icon: <I.Pencil />, run: () => setRenaming(s.id) },
        s.archived
          ? { label: "Unarchive", icon: <I.Unarchive />, run: () => app.ui.archive(s.id, false) }
          : { label: "Archive", icon: <I.Archive />, run: () => app.ui.archive(s.id, true) },
        { sep: true },
        { label: "Delete", icon: <I.Trash />, danger: true, run: () => openModal(<ConfirmDelete session={s} />, "sm") },
      ],
      { alignRight: true, width: 180 }
    );
  const kebabOpen = !!menuAnchor && menuAnchor.dataset.sessmenu === s.id;
  return (
    <div
      className={`sess${app.state.active === s.id ? " active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${s.title}, ${label}`}
      onClick={(e) => {
        if (renaming || (e.target as HTMLElement).closest(".kebab")) return;
        setDrawer(false);
        app.open(s.id);
      }}
      onKeyDown={(e) => {
        if (!renaming && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          app.open(s.id);
        }
      }}
    >
      <Status s={s} />
      <span className="txt">
        {renaming ? (
          <input
            ref={input}
            className="rename"
            defaultValue={s.title}
            aria-label="Session name"
            autoFocus
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget.value);
              if (e.key === "Escape") setRenaming(null);
              e.stopPropagation();
            }}
          />
        ) : (
          <span className="t">{s.title}</span>
        )}
        <span className="sub">
          {s.env === "cloud" ? <I.Cloud /> : <I.Laptop />}
          <span>{s.repo.split("/").pop()}</span>·<span>{s.branch}</span>
        </span>
      </span>
      {s.status === "input" && !s.archived && !renaming ? <span className="badge">Needs input</span> : null}
      {renaming ? null : (
        <button className={`icon-btn sm kebab${kebabOpen ? " open" : ""}`} data-sessmenu={s.id} aria-label="Session options" onClick={(e) => menu(e.currentTarget)}>
          <I.More />
        </button>
      )}
    </div>
  );
}

export function Sidebar({ search }: { search: RefObject<HTMLInputElement | null> }) {
  const { app, openMenu, setDrawer } = useUI();
  const { state, seed } = app;
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const query = q.trim().toLowerCase();
  const match = (s: SessionState) => !query || `${s.title} ${s.repo} ${s.branch}`.toLowerCase().includes(query);
  const live = state.sessions.filter((s) => !s.archived && match(s)).sort((a, b) => b.at - a.at);
  const archived = state.sessions.filter((s) => s.archived && match(s));
  const groups = (["Today", "Yesterday", "Previous 7 days"] as const)
    .map((g) => [g, live.filter((s) => groupOf(s.at) === g)] as const)
    .filter(([, list]) => list.length);
  const showArchived = state.showArchived || !!query;
  const collapsed = state.sidebarCollapsed;
  const dark = state.theme === "dark";

  const account = (btn: HTMLElement) =>
    openMenu(
      btn,
      [
        { header: <><b>{seed.me.name}</b>{seed.me.email}</> },
        { sep: true },
        { label: "Dark mode", icon: <I.Moon />, toggle: dark, run: () => app.ui.edit((d) => void (d.theme = dark ? "light" : "dark")) },
        { label: "Help & support", icon: <I.Help />, run: () => app.ui.emit({ type: "action", label: "Help & support" }) },
        { sep: true },
        { label: "Log out", icon: <I.Logout />, run: () => app.ui.emit({ type: "action", label: "Log out" }) },
      ],
      { above: true, width: 248 }
    );

  return (
    <aside className="sidebar" aria-label="Sessions">
      <div className="sb-top">
        <div className="brand">
          <I.ClaudeMark />
          <span>Claude</span>
          <span className="code-tag">Code</span>
        </div>
        <button
          className="icon-btn sb-collapse"
          data-tip={`${collapsed ? "Expand" : "Collapse"} sidebar`}
          data-kbd={`${MOD} B`}
          aria-label="Toggle sidebar"
          onClick={() => app.ui.edit((d) => void (d.sidebarCollapsed = !d.sidebarCollapsed))}
        >
          <I.Panel />
        </button>
      </div>
      <div className="sb-actions">
        <button
          className="sb-new"
          data-tip={collapsed ? "New session" : undefined}
          aria-label="New session"
          onClick={() => {
            setDrawer(false);
            app.open(null);
          }}
        >
          <span className="plus"><I.Plus /></span>
          <span className="lbl">New session</span>
          <kbd>{MOD}N</kbd>
        </button>
        <label className={`sb-search${q ? " has-q" : ""}`}>
          <I.Search />
          <input
            ref={search}
            placeholder="Search sessions"
            value={q}
            autoComplete="off"
            aria-label="Search sessions"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              e.stopPropagation();
              if (q) setQ("");
              else e.currentTarget.blur();
            }}
          />
          <kbd>{MOD}K</kbd>
          <button
            className="icon-btn sm x"
            aria-label="Clear search"
            onClick={(e) => {
              e.preventDefault();
              setQ("");
              search.current?.focus();
            }}
          >
            <I.X />
          </button>
        </label>
        <button
          className="icon-btn rail-only"
          data-tip="Search sessions"
          data-kbd={`${MOD} K`}
          aria-label="Search sessions"
          onClick={() => {
            app.ui.edit((d) => void (d.sidebarCollapsed = false));
            setTimeout(() => search.current?.focus(), 0);
          }}
        >
          <I.Search />
        </button>
      </div>
      <div className="sb-list scroll-thin">
        {groups.map(([g, list]) => (
          <div className="sb-group" key={g}>
            <div className="sb-group-h">{g}</div>
            {list.map((s) => <Row key={s.id} s={s} renaming={renaming === s.id} setRenaming={setRenaming} />)}
          </div>
        ))}
        {archived.length ? (
          <div className="sb-group">
            <button
              className={`sb-group-h${showArchived ? " open" : ""}`}
              aria-expanded={showArchived}
              onClick={() => app.ui.edit((d) => void (d.showArchived = !d.showArchived))}
            >
              <I.ChevR />
              Archived · {archived.length}
            </button>
            {showArchived ? archived.map((s) => <Row key={s.id} s={s} renaming={renaming === s.id} setRenaming={setRenaming} />) : null}
          </div>
        ) : null}
        {!live.length && !archived.length ? <div className="sb-empty">No sessions match "{q}"</div> : null}
      </div>
      <div className="sb-spacer" />
      <div className="sb-foot">
        <AccountButton onOpen={account} />
      </div>
    </aside>
  );
}

function AccountButton({ onOpen }: { onOpen: (btn: HTMLElement) => void }) {
  const { app, menuAnchor } = useUI();
  const { me } = app.seed;
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button ref={ref} className={`acct${menuAnchor && menuAnchor === ref.current ? " open" : ""}`} aria-label="Account menu" onClick={(e) => onOpen(e.currentTarget)}>
      <Avatar photo={me.photo} name={me.name} size={30} />
      <span className="who">
        <span className="nm">{me.name}</span>
        {me.plan ? <span className="pl">{me.plan}</span> : null}
      </span>
      <I.ChevD />
    </button>
  );
}
