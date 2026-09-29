import { useEffect, useRef, useState, type ReactNode, type RefObject, type SVGProps } from "react";
import { FormatButtons } from "./Compose";
import { Avatar, useUI, type MenuItem } from "./context";
import { fmtDay, fmtTime, Highlight, listTime } from "./format";
import * as I from "./icons";
import type { CategoryColor } from "./types";
import { BUILT_IN, CATEGORY_COLORS, lastOf, type OutlookMailbox } from "./use-outlook";

// The top of the app: the header with search, and the simplified ribbon
// with its Home, View, Help (and, while writing, Message) tabs.

export function TopBar({ search }: { search: RefObject<HTMLInputElement | null> }) {
  const { outlook, menu, menuAnchor, setDrawer, drawer, settings, setSettings } = useUI();
  const { state, people, me, seed } = outlook;
  const [q, setQ] = useState(state.query);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const [seenBell, setSeenBell] = useState(false);
  const bell = useRef<HTMLButtonElement>(null);
  useEffect(() => setQ(state.query), [state.query]);

  const run = (value: string) => {
    const v = value.trim();
    setQ(v);
    setFocused(false);
    search.current?.blur();
    if (v) setRecent((r) => [v, ...r.filter((x) => x !== v)].slice(0, 3));
    outlook.ui.search(v);
  };
  const needle = q.trim().toLowerCase();
  const matches = Object.values(people)
    .filter((p) => p.id !== me && (!needle || p.name.toLowerCase().split(" ").some((w) => w.startsWith(needle))))
    .slice(0, needle ? 4 : 3);

  const unread = state.conversations.filter((c) => c.folder === "inbox" && c.unread).sort((a, b) => lastOf(b).at - lastOf(a).at).slice(0, 3);
  const openBell = (el: HTMLElement) => {
    setSeenBell(true);
    menu(
      el,
      <>
        <div className="nh">Notifications</div>
        {unread.length ? (
          unread.map((c) => (
            <button key={c.id} className="ni" onClick={() => outlook.open(c.id)}>
              <Avatar id={lastOf(c).from} />
              <span>
                <b style={{ fontWeight: 600 }}>{outlook.person(lastOf(c).from).name}</b> {c.subject}
                <small>{listTime(lastOf(c).at)}</small>
              </span>
            </button>
          ))
        ) : (
          <div className="ni">You're all caught up.</div>
        )}
      </>,
      { className: "notif-list", align: "right" }
    );
  };
  const openMe = (el: HTMLElement) => {
    const p = people[me];
    menu(
      el,
      <>
        <div className="ah">
          <b>{seed.account?.organization ?? ""}</b>
          <button className="link" onClick={() => outlook.ui.showDialog({ title: "Sign out?", body: "You'll stay signed in here. In Outlook this would end your session on this device.", ok: "OK", cancel: "" })}>Sign out</button>
        </div>
        <div className="ab">
          <Avatar id={me} size="s72" />
          <div style={{ minWidth: 0 }}>
            <b>{p.name}</b>
            <small>{p.email}</small>
            <button className="link" style={{ fontSize: 13, marginTop: 6 }} onClick={() => outlook.toast("Opening your account settings...")}>View account</button>
          </div>
        </div>
      </>,
      { className: "acct", align: "right" }
    );
  };

  return (
    <header className="top">
      <div className="brand">
        <button className="ib drawer-btn" aria-label="Open navigation" onClick={() => setDrawer(!drawer)}><I.Menu /></button>
        <span className="logo" aria-label="Outlook"><I.Logo name="outlook" /><span>Outlook</span></span>
      </div>
      <div
        className="search"
        ref={box}
        onBlur={(e) => {
          if (!box.current?.contains(e.relatedTarget as Node)) setFocused(false);
        }}
      >
        <I.Search />
        <input
          ref={search}
          value={q}
          placeholder="Search"
          autoComplete="off"
          aria-label="Search mail and people"
          onFocus={() => setFocused(true)}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              run(q);
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              if (q) setQ("");
              else {
                setFocused(false);
                e.currentTarget.blur();
              }
            }
          }}
        />
        {q || state.query ? (
          <button className="ib" aria-label="Clear search" onClick={() => (state.query ? run("") : (setQ(""), search.current?.focus()))}><I.Close /></button>
        ) : null}
        {focused ? (
          <div className="suggest" role="listbox">
            {needle ? (
              <button onClick={() => run(q)}><I.Search /><span>Search for "<b>{q.trim()}</b>"</span></button>
            ) : recent.length ? (
              <>
                <div className="cap">Recent searches</div>
                {recent.map((r) => <button key={r} onClick={() => run(r)}><I.History /><span>{r}</span></button>)}
              </>
            ) : null}
            {matches.length ? (
              <>
                <div className="cap">People</div>
                {matches.map((p) => (
                  <button key={p.id} onClick={() => run(p.name)}>
                    <Avatar id={p.id} size="s24" />
                    <span><Highlight text={p.name} q={q.trim()} /><small>{p.email}</small></span>
                  </button>
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="top-right">
        <button ref={bell} className={`ib${menuAnchor && menuAnchor === bell.current ? " open" : ""}`} data-tip="Notifications" aria-label="Notifications" onClick={(e) => openBell(e.currentTarget)}>
          <I.Bell />
          {!seenBell && unread.length ? <i className="dot-badge" /> : null}
        </button>
        <button className={`ib${settings ? " on" : ""}`} data-settings data-tip="Settings" aria-label="Settings" onClick={() => setSettings(!settings)}><I.Gear /></button>
        <button className="ib tip-l" data-tip="Help" aria-label="Help" onClick={() => shortcutsDialog(outlook)}><I.Help /></button>
        <button className="me" aria-label={`Account manager for ${people[me].name}`} onClick={(e) => openMe(e.currentTarget)}><Avatar id={me} /></button>
      </div>
    </header>
  );
}

export function shortcutsDialog(outlook: OutlookMailbox) {
  const rows = [["New mail", "N"], ["Reply", "R"], ["Reply all", "Shift R"], ["Forward", "Shift F"], ["Send", "Ctrl Enter"], ["Delete", "Delete"], ["Archive", "E"], ["Mark as read", "Q"], ["Mark as unread", "U"], ["Flag", "Insert"], ["Next / previous message", "↓ ↑"], ["Search", "/"], ["Undo", "Ctrl Z"], ["Close or go back", "Esc"], ["Show shortcuts", "?"]];
  outlook.ui.showDialog({
    title: "Keyboard shortcuts",
    ok: "",
    cancel: "Close",
    body: (
      <table className="kbd-table">
        <tbody>
          {rows.map(([n, k]) => (
            <tr key={n}><td>{n}</td><td>{k.split(" ").map((x) => <kbd key={x}>{x}</kbd>)}</td></tr>
          ))}
        </tbody>
      </table>
    ),
  });
}

// ---------- Ribbon ----------

type Tab = "home" | "view" | "help" | "message";

function Rb({ icon, label, onClick, lv, drop, disabled, on, cls = "", tip }: { icon: ReactNode; label: string; onClick: (el: HTMLElement) => void; lv?: 1 | 2; drop?: boolean; disabled?: boolean; on?: boolean; cls?: string; tip?: string }) {
  const { menuAnchor } = useUI();
  const ref = useRef<HTMLButtonElement>(null);
  const open = !!menuAnchor && menuAnchor === ref.current;
  return (
    <button
      ref={ref}
      className={`rb ${cls}${disabled ? " dis" : ""}${on ? " on" : ""}${open ? " open" : ""}`}
      data-lv={lv}
      data-tip={lv ? (tip ?? label) : undefined}
      aria-label={tip ?? label}
      aria-disabled={disabled || undefined}
      onClick={(e) => onClick(e.currentTarget)}
    >
      {icon}
      {label ? <span className="lbl">{label}</span> : null}
      {drop ? <I.ChevD className="cv" /> : null}
    </button>
  );
}

/** The Home tab's commands, shared by the ribbon and its overflow menu. */
function useHomeCommands() {
  const ui = useUI();
  const { outlook, targets, menu } = ui;
  const { state } = outlook;
  const ts = targets.map((id) => state.conversations.find((c) => c.id === id)).filter((c) => !!c);
  const none = !ts.length;
  const one = ts.length === 1;
  const inJunk = !state.query && state.folder === "junk";
  const allFlagged = !none && ts.every((c) => c.flagged);
  const allPinned = !none && ts.every((c) => c.pinned);
  const anyUnread = ts.some((c) => c.unread);
  type Cmd = { key: string; icon: ReactNode; label: string; run: (el: HTMLElement) => void; lv: 1 | 2; drop?: boolean; disabled?: boolean; cls?: string; tip?: string } | "|";
  const cmds: Cmd[] = [
    { key: "delete", icon: <I.Trash />, label: "Delete", lv: 1, disabled: none, run: () => outlook.ui.remove(targets) },
    { key: "archive", icon: <I.Archive />, label: "Archive", lv: 1, disabled: none || (state.folder === "archive" && !state.query), run: () => outlook.ui.archive(targets) },
    inJunk
      ? { key: "notjunk", icon: <I.Inbox />, label: "Not junk", lv: 1, disabled: none, run: () => outlook.ui.junk(targets, false) }
      : { key: "report", icon: <I.Shield />, label: "Report", lv: 1, drop: true, disabled: none, run: (el) => menu(el, [
          { label: "Report junk", icon: <I.Junk />, run: () => outlook.ui.junk(targets) },
          { label: "Report phishing", icon: <I.Shield />, run: () => outlook.ui.junk(targets, true, true) },
        ]) },
    { key: "move", icon: <I.MoveTo />, label: "Move to", lv: 1, drop: true, disabled: none, run: (el) => openMoveMenu(ui, el, targets) },
    "|",
    { key: "reply", icon: <I.Reply />, label: "Reply", lv: 2, disabled: !one, run: () => outlook.ui.respond("reply", targets[0]) },
    { key: "replyAll", icon: <I.ReplyAll />, label: "Reply all", lv: 2, disabled: !one, run: () => outlook.ui.respond("replyAll", targets[0]) },
    { key: "forward", icon: <I.Forward />, label: "Forward", lv: 2, disabled: !one, cls: "ov", run: () => outlook.ui.respond("forward", targets[0]) },
    "|",
    { key: "read", icon: anyUnread ? <I.Read /> : <I.Mail />, label: "Read / Unread", tip: anyUnread ? "Mark as read" : "Mark as unread", lv: 1, disabled: none, run: () => outlook.ui.markRead(targets) },
    { key: "flag", icon: allFlagged ? <I.FlagF className="red" /> : <I.Flag />, label: allFlagged ? "Unflag" : "Flag", lv: 2, disabled: none, run: () => outlook.ui.flag(targets) },
    { key: "pin", icon: allPinned ? <I.PinF /> : <I.Pin />, label: allPinned ? "Unpin" : "Pin", lv: 2, disabled: none, cls: "ov", run: () => outlook.ui.pin(targets) },
    { key: "snooze", icon: <I.Snooze />, label: "Snooze", lv: 2, drop: true, disabled: none, cls: "ov", run: (el) => openSnoozeMenu(ui, el, targets) },
    { key: "categorize", icon: <I.Tag />, label: "Categorize", lv: 1, drop: true, disabled: none, cls: "ov2", run: (el) => openCategoryMenu(ui, el, targets) },
    "|",
    { key: "undo", icon: <I.Undo />, label: "Undo", lv: 2, disabled: !outlook.canUndo, cls: "ov2", run: () => outlook.ui.undo() },
  ];
  return cmds;
}

export function Ribbon() {
  const { outlook, menu } = useUI();
  const { state } = outlook;
  const composing = !!state.compose;
  const [tab, setTab] = useState<Tab>("home");
  const home = useHomeCommands();
  // Writing brings up the Message tab; it goes away with the composer.
  const key = state.compose?.key;
  useEffect(() => setTab(key ? "message" : (t) => (t === "message" ? "home" : t)), [key]);
  const tabs: [Tab, string][] = [["home", "Home"], ["view", "View"], ["help", "Help"], ...(composing ? [["message", "Message"] as [Tab, string]] : [])];
  const dark = state.theme === "dark";
  const check = (on: boolean) => (on ? { checked: true } : {});

  let bar: ReactNode;
  if (tab === "home") {
    bar = (
      <>
        <span className="split">
          <button className="main" onClick={() => outlook.ui.startCompose()}><I.NewMail /><span>New mail</span></button>
          <button className="drop" aria-label="More new items" onClick={(e) => menu(e.currentTarget, [
            { label: "Mail", icon: <I.Mail />, run: () => outlook.ui.startCompose() },
            { label: "Event", icon: <I.Calendar />, run: () => outlook.toast("New event: it opens in Calendar with your mail still a click away.") },
            { label: "Group", icon: <I.Group />, run: () => outlook.toast("New group: name it, add members, and it gets a shared inbox and calendar.") },
          ])}><I.ChevD /></button>
        </span>
        {home.map((c, i) =>
          c === "|" ? <span key={i} className="rsep" /> : <Rb key={c.key} icon={c.icon} label={c.label} tip={c.tip} lv={c.lv} drop={c.drop} disabled={c.disabled} cls={c.cls} onClick={c.run} />
        )}
      </>
    );
  } else if (tab === "view") {
    bar = (
      <>
        <Rb icon={<I.LayoutR />} label="Layout" drop onClick={(el) => menu(el, [
          { caption: "Reading pane" },
          { label: "Show on the right", icon: <I.LayoutR />, run: () => outlook.ui.setView({ pane: "right" }), ...check(state.pane === "right") },
          { label: "Show on the bottom", icon: <I.LayoutB />, run: () => outlook.ui.setView({ pane: "bottom" }), ...check(state.pane === "bottom") },
          { label: "Hide reading pane", icon: <I.LayoutOff />, run: () => outlook.ui.setView({ pane: "off" }), ...check(state.pane === "off") },
        ])} />
        <Rb icon={<I.Density />} label="Density" drop onClick={(el) => menu(el, (["roomy", "cozy", "compact"] as const).map((d) => (
          { label: d[0].toUpperCase() + d.slice(1), icon: <I.Density />, run: () => outlook.ui.setView({ density: d }), ...check(state.density === d) }
        )))} />
        <Rb icon={<I.Inbox />} label="Focused Inbox" on={state.focusedInbox} onClick={() => {
          outlook.ui.setView({ focusedInbox: !state.focusedInbox });
          outlook.toast(!state.focusedInbox ? "Focused Inbox is on." : "Focused Inbox is off. All mail shows in one list.");
        }} />
        <Rb icon={<I.Sidebar />} label="Folder pane" on={!state.navHidden} onClick={() => outlook.ui.setView({ navHidden: !state.navHidden })} />
        <span className="rsep" />
        <Rb icon={dark ? <I.Sun /> : <I.Moon />} label={dark ? "Light mode" : "Dark mode"} onClick={() => outlook.ui.setView({ theme: dark ? "light" : "dark" })} />
      </>
    );
  } else if (tab === "help") {
    bar = (
      <>
        <Rb icon={<I.Help />} label="Help" onClick={() => outlook.toast("Help: search for answers or contact support from the Help pane.")} />
        <Rb icon={<I.Keyboard />} label="Keyboard shortcuts" onClick={() => shortcutsDialog(outlook)} />
        <Rb icon={<I.Feedback />} label="Feedback" onClick={() => outlook.ui.showDialog({
          title: "Give feedback to Microsoft", body: "Tell us what you like or what we could do better.", ok: "Submit",
          input: { placeholder: "Share your feedback", multiline: true, valid: (v) => !!v.trim() }, onOk: () => outlook.toast("Thanks for your feedback!", { ok: true }),
        })} />
      </>
    );
  } else bar = <FormatButtons ribbon />;

  return (
    <div className="ribbon">
      <div className="rtabs">
        <button className="ib" data-tip={`${state.navHidden ? "Show" : "Hide"} navigation pane`} aria-label="Toggle navigation pane" style={{ marginLeft: 4 }} onClick={() => outlook.ui.setView({ navHidden: !state.navHidden })}><I.Menu /></button>
        {tabs.map(([id, n]) => (
          <button key={id} className={`rtab${tab === id ? " active" : ""}`} data-label={n} onClick={() => setTab(id)}>{n}</button>
        ))}
      </div>
      <div className="rbar" role="toolbar" aria-label={`${tabs.find((t) => t[0] === tab)?.[1] ?? "Home"} commands`}>
        <div className="rbi">{bar}</div>
        {tab === "home" ? (
          <Rb cls="rb-more" icon={<I.More />} label="" tip="More options" onClick={(el) => menu(el, home.filter((c) => c !== "|").map((c) => ({
            label: c.label, icon: c.icon, disabled: c.disabled, hint: c.drop ? <I.ChevR style={{ width: 12, height: 12 }} /> : undefined, run: () => c.run(el),
          })), { align: "right" })} />
        ) : null}
      </div>
    </div>
  );
}

// ---------- Menus shared with the list and the reading pane ----------

type UI = ReturnType<typeof useUI>;

export function openMoveMenu(ui: UI, anchor: HTMLElement | { x: number; y: number }, ids: string[]) {
  ui.menu(anchor, <MoveMenu ids={ids} />);
}

function MoveMenu({ ids }: { ids: string[] }) {
  const { outlook, closeMenu, setDrawer, phone, setNewFolder } = useUI();
  const { state } = outlook;
  const [filter, setFilter] = useState("");
  const current = state.query ? null : state.folder;
  const list = [...BUILT_IN, ...state.folders]
    .filter((f) => !["drafts", "scheduled", "sent"].includes(f.id) && f.id !== current && f.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <div className="msearch">
        <I.Search />
        <input autoFocus placeholder="Search for a folder" aria-label="Search for a folder" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {list.length ? (
        list.map((f) => (
          <button key={f.id} className="mi" role="menuitem" onClick={() => { closeMenu(); outlook.ui.move(ids, f.id); }}>
            <FolderIcon id={f.id} />
            <span>{f.name}</span>
          </button>
        ))
      ) : (
        <div className="mcap" style={{ fontWeight: 400, padding: 8 }}>No folders found</div>
      )}
      <div className="mdiv" />
      <button className="mi" role="menuitem" onClick={() => {
        closeMenu();
        outlook.ui.setView({ navHidden: false });
        if (phone) setDrawer(true);
        setNewFolder(true);
      }}>
        <I.FolderAdd />
        <span>Create new folder</span>
      </button>
    </>
  );
}


const FOLDER_ICONS: Record<string, (p: SVGProps<SVGSVGElement>) => ReactNode> = {
  inbox: I.Inbox, drafts: I.Drafts, sent: I.Send, scheduled: I.Clock, deleted: I.Trash, junk: I.Junk, archive: I.Archive, notes: I.Note, history: I.History,
};
export function FolderIcon({ id }: { id: string }) {
  const Icon = FOLDER_ICONS[id] ?? I.Folder;
  return <Icon />;
}

/** The next few sensible times to come back to mail: later today, tomorrow, the weekend, next week. */
function snoozeOptions(): [string, number][] {
  const now = new Date();
  const at = (days: number, h: number) => { const d = new Date(now); d.setDate(now.getDate() + days); d.setHours(h, 0, 0, 0); return d.getTime(); };
  const later = new Date(now);
  later.setHours(Math.max(17, now.getHours() + 3), 0, 0, 0);
  const sat = (6 - now.getDay() + 7) % 7 || 7;
  const mon = (8 - now.getDay()) % 7 || 7;
  const opts: [string, number][] = [["Later today", later.getTime()], ["Tomorrow", at(1, 8)], ["This weekend", at(sat, 9)], ["Next week", at(mon, 8)]];
  return later.getDate() === now.getDate() ? opts : opts.slice(1);
}

export function openSnoozeMenu(ui: UI, anchor: HTMLElement | { x: number; y: number }, ids: string[]) {
  const items: MenuItem[] = [{ caption: "Snooze until" }, ...snoozeOptions().map(([n, t]) => ({ label: n, icon: <I.Clock />, hint: `${fmtDay(t)} ${fmtTime(t)}`, run: () => ui.outlook.ui.snooze(ids, t) }))];
  ui.menu(anchor, items);
}

export function openCategoryMenu(ui: UI, anchor: HTMLElement | { x: number; y: number }, ids: string[]) {
  const { state } = ui.outlook;
  const ts = ids.map((id) => state.conversations.find((c) => c.id === id)).filter((c) => !!c);
  const items: MenuItem[] = [
    ...Object.entries(state.categories).map(([name, color]) => ({
      label: name,
      icon: <I.CategoryTag color={CATEGORY_COLORS[color]} />,
      checked: ts.length > 0 && ts.every((c) => c.categories.includes(name)),
      run: () => ui.outlook.ui.categorize(ids, name),
    })),
    "-",
    { label: "New category", icon: <I.Plus />, run: () => newCategory(ui, ids) },
    { label: "Clear categories", icon: <I.Clear />, run: () => ui.outlook.ui.categorize(ids, null) },
    { label: "Manage categories", icon: <I.Gear />, run: () => ui.outlook.toast("Manage categories: rename, recolor or delete categories from Settings.") },
  ];
  ui.menu(anchor, items);
}

function newCategory(ui: UI, ids: string[]) {
  const { outlook } = ui;
  const pick = { color: "teal" as CategoryColor };
  outlook.ui.showDialog({
    title: "New category",
    ok: "Save",
    input: { placeholder: "Name your category", valid: (v) => !!v.trim() && !outlook.state.categories[v.trim()] },
    after: <Swatches pick={pick} />,
    onOk: (v) => outlook.ui.addCategory(v.trim(), pick.color, ids),
  });
}

function Swatches({ pick }: { pick: { color: CategoryColor } }) {
  const [color, setColor] = useState(pick.color);
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
      {(Object.entries(CATEGORY_COLORS) as [CategoryColor, string][]).map(([n, c]) => (
        <button
          key={n}
          className="ib"
          aria-label={n}
          aria-pressed={n === color}
          style={{ background: c, borderRadius: "50%", width: 26, height: 26, boxShadow: n === color ? `0 0 0 2px var(--surface),0 0 0 4px ${c}` : undefined }}
          onClick={() => setColor((pick.color = n))}
        />
      ))}
    </div>
  );
}
