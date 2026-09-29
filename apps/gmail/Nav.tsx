import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { IconButton, useUI, type DialogKind } from "./context";
import * as I from "./icons";
import type { GmailView } from "./types";
import { inLabel, LABEL_COLORS } from "./use-gmail";

// The sidebar: Compose, the folders (with More / Less), the labels (nested,
// colored, each with a menu), and the dialogs that name and remove labels.
// It collapses to icons from the menu button and peeks open on hover; in a
// narrow box it is a drawer.

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
const FOLDERS: { id: GmailView; name: string; icon: Icon; on?: Icon; more?: boolean }[] = [
  { id: "inbox", name: "Inbox", icon: I.Inbox },
  { id: "starred", name: "Starred", icon: I.Star, on: I.StarFilled },
  { id: "snoozed", name: "Snoozed", icon: I.Snooze },
  { id: "sent", name: "Sent", icon: I.Send },
  { id: "drafts", name: "Drafts", icon: I.Draft },
  { id: "important", name: "Important", icon: I.Important, on: I.ImportantFilled, more: true },
  { id: "scheduled", name: "Scheduled", icon: I.Scheduled, more: true },
  { id: "all", name: "All Mail", icon: I.AllMail, more: true },
  { id: "spam", name: "Spam", icon: I.Spam, more: true },
  { id: "trash", name: "Trash", icon: I.Trash, more: true },
];
export const FOLDER_NAMES = Object.fromEntries(FOLDERS.map((f) => [f.id, f.name])) as Record<GmailView, string>;
const short = (l: string) => l.split("/").pop() ?? l;

export function Nav() {
  const { gmail, pop, openPop, drawer, setDrawer, openDialog } = useUI();
  const { state, ui } = gmail;
  const [peek, setPeek] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const el = useRef<HTMLElement>(null);
  const menuOpen = pop?.kind === "label";
  useEffect(() => () => clearTimeout(timer.current), []);
  // A label's menu keeps the peeked sidebar open; closing it away from the sidebar folds it back.
  useEffect(() => {
    if (!menuOpen && !el.current?.matches(":hover")) setPeek(false);
  }, [menuOpen]);
  useEffect(() => {
    if (!state.navCollapsed) setPeek(false);
  }, [state.navCollapsed]);

  const v = state.view;
  const inView = (id: GmailView) => !v.query && !v.label && v.folder === id;
  const mails = state.mails;
  const count = (id: GmailView) =>
    id === "inbox" ? mails.filter((m) => m.folder === "inbox" && m.unread).length
    : id === "drafts" ? mails.filter((m) => m.folder === "drafts").length
    : id === "spam" ? mails.filter((m) => m.folder === "spam" && m.unread).length
    : id === "scheduled" ? mails.filter((m) => m.folder === "scheduled").length
    : 0;
  const more = state.more || FOLDERS.some((f) => f.more && inView(f.id));
  const go = (view: Parameters<typeof ui.show>[0]) => {
    ui.show(view);
    setDrawer(false);
  };

  const item = (f: (typeof FOLDERS)[number]) => {
    const c = count(f.id);
    const active = inView(f.id);
    const Ico = active && f.on ? f.on : f.icon;
    return (
      <button
        key={f.id}
        className={`nav-item${active ? " active" : ""}${c && (f.id === "inbox" || f.id === "spam") ? " bold" : ""}`}
        aria-label={`${f.name}${c ? `, ${c}` : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={() => go({ folder: f.id, label: null, query: "" })}
      >
        <span className="ico">
          <Ico />
          {f.id === "inbox" && c ? <i className="badge">{c}</i> : null}
        </span>
        <span className="lbl">{f.name}</span>
        {c ? <span className="n">{c}</span> : null}
      </button>
    );
  };

  const labels = Object.keys(state.labels).sort((a, b) => a.localeCompare(b));
  const cls = ["nav", state.navCollapsed ? "collapsed" : "", peek ? "peek" : "", drawer ? "open" : ""].filter(Boolean).join(" ");

  return (
    <nav
      ref={el}
      className={cls}
      aria-label="Mail folders and labels"
      onMouseEnter={() => {
        if (!state.navCollapsed) return;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setPeek(true), 180);
      }}
      onMouseLeave={() => {
        clearTimeout(timer.current);
        if (!menuOpen) setPeek(false);
      }}
    >
      <div className="nav-panel">
        <div className="drawer-head">
          <I.GmailLogo />
          <span className="word">Gmail</span>
        </div>
        <button className="compose-btn" onClick={() => ui.compose()}>
          <I.Pencil />
          <span>Compose</span>
        </button>
        {FOLDERS.filter((f) => !f.more).map(item)}
        <button className="nav-item more" aria-expanded={more} onClick={() => ui.set("more", !state.more)}>
          <span className="ico">{more ? <I.ChevronUp /> : <I.ChevronDown />}</span>
          <span className="lbl">{more ? "Less" : "More"}</span>
        </button>
        {more ? (
          <div className="nav-sub">
            {FOLDERS.filter((f) => f.more).map(item)}
            <button className="nav-item" onClick={() => gmail.toast("Manage labels in Settings > Labels")}>
              <span className="ico"><I.Gear /></span>
              <span className="lbl">Manage labels</span>
            </button>
            <button className="nav-item" onClick={() => openDialog({ kind: "newLabel" })}>
              <span className="ico"><I.Plus /></span>
              <span className="lbl">Create new label</span>
            </button>
          </div>
        ) : null}
        <div className="nav-sep" />
        <div className="nav-head">
          <span>Labels</span>
          <IconButton className="icon-btn sm" tip="Create new label" onClick={() => openDialog({ kind: "newLabel" })}>
            <I.Plus />
          </IconButton>
        </div>
        {labels.map((l) => {
          const n = mails.filter((m) => m.unread && m.folder !== "trash" && m.folder !== "spam" && inLabel(m.labels, l)).length;
          const active = v.label === l;
          return (
            <div
              key={l}
              className={`nav-item${active ? " active" : ""}${n ? " bold" : ""}`}
              role="button"
              tabIndex={0}
              style={{ ["--depth" as string]: l.split("/").length - 1 }}
              aria-label={`${short(l)}${n ? `, ${n} unread` : ""}`}
              onClick={() => go({ label: l, query: "" })}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  go({ label: l, query: "" });
                }
              }}
            >
              <span className="ico"><I.LabelIcon color={state.labels[l]} /></span>
              <span className="lbl">{short(l)}</span>
              {n ? <span className="n hide-on-hover">{n}</span> : null}
              <button
                className={`kebab${menuOpen && pop.name === l ? " open" : ""}`}
                aria-label={`Options for ${short(l)}`}
                data-pop-anchor
                onClick={(e) => {
                  e.stopPropagation();
                  openPop(e.currentTarget, { kind: "label", name: l });
                }}
              >
                <I.More />
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export function LabelMenu({ name }: { name: string }) {
  const { gmail, closePop, openDialog } = useUI();
  const color = gmail.state.labels[name];
  const then = (dialog: DialogKind) => {
    closePop();
    openDialog(dialog);
  };
  return (
    <div className="label-menu">
      <div className="menu-cap">Label color</div>
      <div className="swatches">
        {LABEL_COLORS.map((c) => (
          <button
            key={c}
            className={color === c ? "on" : ""}
            style={{ background: c }}
            aria-label={`Set color ${c}`}
            onClick={() => {
              gmail.ui.colorLabel(name, c);
              closePop();
            }}
          />
        ))}
      </div>
      <hr />
      <button className="opt" onClick={() => then({ kind: "editLabel", name })}><I.Pencil />Edit</button>
      <button className="opt" onClick={() => then({ kind: "newLabel", parent: name })}><I.Plus />Add sublabel</button>
      <button className="opt" onClick={() => then({ kind: "removeLabel", name })}><I.Trash />Remove label</button>
    </div>
  );
}

export function LabelDialog({ dialog, onClose }: { dialog: DialogKind; onClose: () => void }) {
  const { gmail } = useUI();
  const labels = gmail.state.labels;
  const editing = dialog.kind === "editLabel" ? dialog.name : null;
  const cut = editing ? editing.lastIndexOf("/") : -1;
  const [name, setName] = useState(editing ? short(editing) : "");
  const [nest, setNest] = useState(dialog.kind === "newLabel" ? !!dialog.parent : cut > 0);
  const parents = Object.keys(labels).filter((l) => l !== editing && !(editing && l.startsWith(`${editing}/`))).sort();
  const [parent, setParent] = useState((dialog.kind === "newLabel" ? dialog.parent : editing && cut > 0 ? editing.slice(0, cut) : "") || parents[0] || "");
  const input = useRef<HTMLInputElement>(null);
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (input.current) input.current.select();
    else ok.current?.focus();
  }, []);

  const removing = dialog.kind === "removeLabel";
  const v = name.trim();
  const full = (nest && parent ? `${parent}/` : "") + v;
  const error = removing ? "" : !v ? "empty" : v.includes("/") ? 'Label names can\'t contain "/".' : full !== editing && labels[full] ? `The label "${v}" already exists.` : "";
  const submit = () => {
    if (error) return;
    onClose();
    if (removing) gmail.ui.deleteLabel(dialog.name);
    else if (editing) gmail.ui.renameLabel(editing, full);
    else gmail.ui.createLabel(full);
  };
  const title = removing ? "Remove label" : editing ? "Edit label" : "New label";

  return (
    <div className="dialog-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && !error) {
            e.preventDefault();
            submit();
          }
          e.stopPropagation();
        }}
      >
        <h2>{title}</h2>
        {removing ? (
          <p style={{ color: "var(--text-2)" }}>
            Delete the label "{short(dialog.name)}"{Object.keys(labels).some((x) => x.startsWith(`${dialog.name}/`)) ? " and its sublabels" : ""}? Conversations with this label won't be deleted.
          </p>
        ) : (
          <>
            <label className="f" htmlFor="gmail-label-name">Please enter a new label name:</label>
            <input ref={input} type="text" id="gmail-label-name" value={name} autoComplete="off" maxLength={40} onChange={(e) => setName(e.target.value)} />
            <label className="check">
              <input type="checkbox" checked={nest} onChange={(e) => setNest(e.target.checked)} /> Nest label under:
            </label>
            <select className="parent" value={parent} disabled={!nest} onChange={(e) => setParent(e.target.value)}>
              {parents.map((l) => <option key={l}>{l}</option>)}
            </select>
          </>
        )}
        <div className="err">{error && error !== "empty" ? error : ""}</div>
        <div className="acts">
          <button className="text-btn" onClick={onClose}>Cancel</button>
          <button ref={ok} className="text-btn" disabled={!!error} onClick={submit}>{removing ? "Delete" : editing ? "Save" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
