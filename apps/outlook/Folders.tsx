import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUI } from "./context";
import { FolderIcon } from "./Header";
import * as I from "./icons";
import { BUILT_IN, type OutlookMailbox } from "./use-outlook";

// The folder pane: Favorites, the mailbox's folders (built-in, then custom,
// then "Create new folder"), and Groups. On a phone it is a drawer.

function counts(outlook: OutlookMailbox, id: string): { n: number; unread?: boolean } {
  const all = outlook.state.conversations.filter((c) => c.folder === id);
  if (id === "drafts") return { n: all.length };
  if (["scheduled", "sent", "notes", "history", "archive"].includes(id)) return { n: 0 };
  return { n: all.filter((c) => c.unread).length, unread: true };
}

function Section({ id, label, open, toggle, children }: { id: string; label: string; open: boolean; toggle: (id: string) => void; children: ReactNode }) {
  return (
    <>
      <button className={`fsec${open ? "" : " shut"}`} aria-expanded={open} onClick={() => toggle(id)}>
        <I.ChevD />
        <span>{label}</span>
      </button>
      {open ? children : null}
    </>
  );
}

function Folder({ id, name }: { id: string; name: string }) {
  const { outlook, setDrawer } = useUI();
  const { state } = outlook;
  const active = !state.query && state.folder === id;
  const { n, unread } = counts(outlook, id);
  const fav = state.favorites.includes(id);
  return (
    <div
      className={`fi${active ? " active" : ""}${n && unread ? " bold" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${name}${n ? `, ${n} ${unread ? "unread" : "items"}` : ""}`}
      aria-current={active || undefined}
      onClick={() => {
        setDrawer(false);
        outlook.ui.openFolder(id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
    >
      <FolderIcon id={id} />
      <span className="nm">{name}</span>
      {n ? <span className={`ct hov-hide${unread ? " unread" : ""}`}>{n}</span> : null}
      <FolderMenuButton id={id} name={name} fav={fav} />
    </div>
  );
}

function FolderMenuButton({ id, name, fav }: { id: string; name: string; fav: boolean }) {
  const { outlook, menu, menuAnchor, setNewFolder } = useUI();
  const ref = useRef<HTMLButtonElement>(null);
  const open = !!menuAnchor && menuAnchor === ref.current;
  const { state } = outlook;
  return (
    <button
      ref={ref}
      className={`ib fmore${open ? " open" : ""}`}
      aria-label={`More options for ${name}`}
      onClick={(e) => {
        e.stopPropagation();
        const unread = state.conversations.filter((c) => c.folder === id && c.unread).map((c) => c.id);
        menu(e.currentTarget, [
          { label: fav ? "Remove from Favorites" : "Add to Favorites", icon: fav ? <I.StarF /> : <I.Star />, run: () => outlook.ui.setView({ favorites: fav ? state.favorites.filter((f) => f !== id) : [...state.favorites, id] }) },
          {
            label: "Mark all as read",
            icon: <I.Read />,
            run: () => {
              if (unread.length) outlook.ui.markRead(unread, true);
              outlook.toast(unread.length ? `Marked ${unread.length} ${unread.length === 1 ? "item" : "items"} in ${name} as read.` : `Everything in ${name} is already read.`);
            },
          },
          "-",
          { label: "Create new folder", icon: <I.FolderAdd />, run: () => setNewFolder(true) },
        ]);
      }}
    >
      <I.More style={{ width: 16, height: 16 }} />
    </button>
  );
}

function NewFolder() {
  const { outlook, setNewFolder } = useUI();
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const taken = (v: string) => [...BUILT_IN, ...outlook.state.folders].some((f) => f.name.toLowerCase() === v.trim().toLowerCase());
  const bad = name.trim() && taken(name) ? "A folder with this name already exists." : "";
  const done = useRef(false);
  const finish = (create: boolean) => {
    if (done.current) return;
    done.current = true;
    if (create && name.trim() && !bad) outlook.ui.createFolder(name.trim());
    setNewFolder(false);
  };
  useEffect(() => input.current?.focus(), []);
  return (
    <>
      <div className="fi-input">
        <I.Folder />
        <input
          ref={input}
          className={bad ? "bad" : undefined}
          placeholder="New folder name"
          maxLength={60}
          aria-label="New folder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!bad) finish(true);
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              finish(false);
            }
          }}
          onBlur={() => finish(!bad)}
        />
      </div>
      {bad ? <div className="fi-err">{bad}</div> : null}
    </>
  );
}

export function Folders() {
  const { outlook, drawer, setDrawer, phone, newFolder, setNewFolder } = useUI();
  const { state, seed, people, me } = outlook;
  const [shut, setShut] = useState<Set<string>>(() => new Set(["groups"]));
  const toggle = (id: string) => setShut((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = [...BUILT_IN, ...state.folders];
  useEffect(() => {
    if (newFolder) setShut((s) => { const n = new Set(s); n.delete("acct"); return n; });
  }, [newFolder]);

  return (
    <aside className={`folders${state.navHidden && !phone ? " collapsed" : ""}${drawer ? " open" : ""}`} aria-label="Folder pane">
      <div className="drawer-head"><I.Logo name="outlook" />Outlook</div>
      {phone ? (
        <button className="btn primary drawer-new" style={{ display: "flex" }} onClick={() => { setDrawer(false); outlook.ui.startCompose(); }}><I.NewMail />New mail</button>
      ) : null}
      <Section id="fav" label="Favorites" open={!shut.has("fav")} toggle={toggle}>
        {state.favorites.map((id) => all.find((f) => f.id === id)).filter((f) => !!f).map((f) => <Folder key={f.id} id={f.id} name={f.name} />)}
      </Section>
      <Section id="acct" label={people[me].email} open={!shut.has("acct")} toggle={toggle}>
        {all.map((f) => <Folder key={f.id} id={f.id} name={f.name} />)}
        {newFolder ? (
          <NewFolder />
        ) : (
          <div className="fi add" role="button" tabIndex={0} onClick={() => setNewFolder(true)} onKeyDown={(e) => e.key === "Enter" && setNewFolder(true)}>
            <I.FolderAdd />
            <span className="nm">Create new folder</span>
          </div>
        )}
      </Section>
      {seed.groups?.length ? (
        <Section id="groups" label="Groups" open={!shut.has("groups")} toggle={toggle}>
          {seed.groups.map((g) => (
            <div key={g.name} className="fi" role="button" tabIndex={0} onClick={() => outlook.toast(`${g.name} is a Microsoft 365 group. Group mail opens in its own view.`)}>
              <span className="av s20" style={{ background: g.color ?? "#0f6cbd", color: "#fff", borderRadius: 4 }}>{g.name[0]}</span>
              <span className="nm">{g.name}</span>
            </div>
          ))}
          <div className="fi add" role="button" tabIndex={0} onClick={() => outlook.toast("New group: name it, add members, and it gets a shared inbox and calendar.")}>
            <I.Plus />
            <span className="nm">New group</span>
          </div>
        </Section>
      ) : null}
    </aside>
  );
}
