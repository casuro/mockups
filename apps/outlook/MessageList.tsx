import { useState, type MouseEvent } from "react";
import { Avatar, useUI } from "./context";
import { bodyText, fmtDay, fmtTime, groupOf, Highlight, listTime, plural } from "./format";
import { openCategoryMenu, openMoveMenu, openSnoozeMenu } from "./Header";
import * as I from "./icons";
import type { OutlookConversation } from "./types";
import { CATEGORY_COLORS, folderName, lastOf, listOf } from "./use-outlook";

// The message list: Focused and Other (or the folder's name, or search
// results), the filter, the checkboxes, date groups, and each conversation's
// row with its hover actions.

const FILTERS = [["all", "All"], ["unread", "Unread"], ["flagged", "Flagged"], ["tome", "To me"], ["files", "Has files"], ["mentions", "Mentions me"]] as const;

export function CategoryChip({ name }: { name: string }) {
  const { outlook } = useUI();
  const color = outlook.state.categories[name];
  if (!color) return null;
  return <span className="cat" style={{ ["--c" as string]: CATEGORY_COLORS[color] }}>{name}</span>;
}

/** The thread menu: on a right-click in the list, and behind "More actions" in the reading pane. */
export function useThreadMenu() {
  const ui = useUI();
  const { outlook, menu } = ui;
  return (anchor: HTMLElement | { x: number; y: number }, c: OutlookConversation, align: "left" | "right" = "left") => {
    const ids = [c.id];
    const at = (fn: typeof openMoveMenu) => (from: DOMRect) => fn(ui, { x: from.left, y: from.top }, ids);
    menu(anchor, [
      { label: "Reply", icon: <I.Reply />, run: () => outlook.ui.respond("reply", c.id) },
      { label: "Reply all", icon: <I.ReplyAll />, run: () => outlook.ui.respond("replyAll", c.id) },
      { label: "Forward", icon: <I.Forward />, run: () => outlook.ui.respond("forward", c.id) },
      "-",
      { label: "Delete", icon: <I.Trash />, hint: "Del", run: () => outlook.ui.remove(ids) },
      { label: "Archive", icon: <I.Archive />, hint: "E", run: () => outlook.ui.archive(ids) },
      { label: "Move to", icon: <I.MoveTo />, run: at(openMoveMenu) },
      "-",
      { label: c.unread ? "Mark as read" : "Mark as unread", icon: c.unread ? <I.Read /> : <I.Mail />, hint: c.unread ? "Q" : "U", run: () => outlook.ui.markRead(ids) },
      { label: c.flagged ? "Unflag" : "Flag", icon: c.flagged ? <I.FlagF /> : <I.Flag />, hint: "Insert", run: () => outlook.ui.flag(ids) },
      { label: c.pinned ? "Unpin" : "Pin", icon: c.pinned ? <I.PinF /> : <I.Pin />, run: () => outlook.ui.pin(ids) },
      { label: "Snooze", icon: <I.Snooze />, run: at(openSnoozeMenu) },
      { label: "Categorize", icon: <I.Tag />, run: at(openCategoryMenu) },
      "-",
      c.folder === "junk"
        ? { label: "Not junk", icon: <I.Inbox />, run: () => outlook.ui.junk(ids, false) }
        : { label: "Report junk", icon: <I.Shield />, run: () => outlook.ui.junk(ids) },
      { label: "Print", icon: <I.Print />, run: () => outlook.toast(`Printing "${c.subject}"`) },
      { label: "View message source", icon: <I.Eye />, run: () => outlook.toast("Message source opened in a new window.") },
    ], { align });
  };
}

function senders(ui: ReturnType<typeof useUI>, c: OutlookConversation) {
  const { outlook } = ui;
  const me = outlook.me;
  const name = (id: string) => outlook.person(id).name;
  if (c.folder === "drafts" || (["sent", "scheduled"].includes(c.folder) && lastOf(c).from === me)) {
    const to = [...new Set(c.messages.flatMap((m) => m.to))].filter((x) => x !== me);
    return (
      <>
        {c.folder === "drafts" ? <span className="draft">[Draft] </span> : null}
        {to.map(name).join("; ") || "(No recipients)"}
      </>
    );
  }
  return [...new Set(c.messages.map((m) => m.from).reverse())].slice(0, 3).map(name).join("; ");
}

function avatarFor(me: string, c: OutlookConversation) {
  const m = lastOf(c);
  if (m.from !== me) return m.from;
  const other = [...c.messages].reverse().find((x) => x.from !== me);
  return other ? other.from : (m.to.find((x) => x !== me) ?? me);
}

function Row({ c }: { c: OutlookConversation }) {
  const ui = useUI();
  const { outlook } = ui;
  const { state, me } = outlook;
  const threadMenu = useThreadMenu();
  const m = lastOf(c);
  const atts = c.messages.flatMap((x) => x.attachments);
  const checked = state.selected.includes(c.id);
  const sel = state.open === c.id && !state.selected.length;
  const q = state.query;
  const preview = bodyText(m) || (c.folder === "drafts" ? "This message has no content." : "");
  const snoozed = c.folder === "scheduled" && c.snoozedUntil;
  const act = (e: MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };
  const hasL4 = c.categories.length || atts.length || (q && c.folder !== "inbox");
  return (
    <div
      className={`mrow${c.unread ? " unread" : ""}${c.flagged ? " flagged" : ""}${sel ? " selected" : ""}${checked ? " checked" : ""}`}
      role="option"
      aria-selected={sel || checked}
      tabIndex={sel ? 0 : -1}
      data-row={c.id}
      onClick={(e) => {
        if (state.selectMode || e.metaKey || e.ctrlKey) outlook.ui.toggleSelect(c.id);
        else if (e.shiftKey && state.open) outlook.ui.toggleSelect(c.id, true);
        else outlook.ui.openConversation(c.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        threadMenu({ x: e.clientX, y: e.clientY }, c);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          outlook.ui.openConversation(c.id);
        }
      }}
    >
      <div className="mlead">
        <Avatar id={avatarFor(me, c)} />
        <button className="mcheck" tabIndex={-1} aria-label="Select conversation" onClick={(e) => act(e, () => outlook.ui.toggleSelect(c.id, e.shiftKey))}>
          <span className={`cbx${checked ? " on" : ""}`}><I.CheckB /></span>
        </button>
      </div>
      <div className="mtext">
        <div className="l1">
          <span className="snd">{senders(ui, c)}</span>
          <span className="ind">
            {c.pinned ? <span className="pini" title="Pinned"><I.PinF /></span> : null}
            {c.flagged ? <span className="flagi" title="Flagged"><I.FlagF /></span> : null}
          </span>
          <span className="hov">
            <button className="ib" data-tip="Delete" aria-label="Delete" onClick={(e) => act(e, () => outlook.ui.remove([c.id]))}><I.Trash /></button>
            <button className="ib" data-tip={`Mark as ${c.unread ? "read" : "unread"}`} aria-label={`Mark as ${c.unread ? "read" : "unread"}`} onClick={(e) => act(e, () => outlook.ui.markRead([c.id]))}>
              {c.unread ? <I.Read /> : <I.Mail />}
            </button>
            <button className={`ib${c.flagged ? " flagon" : ""}`} data-tip={`${c.flagged ? "Unflag" : "Flag"} this message`} aria-label={c.flagged ? "Unflag" : "Flag"} onClick={(e) => act(e, () => outlook.ui.flag([c.id]))}>
              {c.flagged ? <I.FlagF /> : <I.Flag />}
            </button>
            <button className={`ib tip-l${c.pinned ? " pinon" : ""}`} data-tip={`${c.pinned ? "Unpin" : "Pin"} this message`} aria-label={c.pinned ? "Unpin" : "Pin"} onClick={(e) => act(e, () => outlook.ui.pin([c.id]))}>
              {c.pinned ? <I.PinF /> : <I.Pin />}
            </button>
          </span>
        </div>
        <div className="l2">
          <span className="subj"><Highlight text={c.subject || "(No subject)"} q={q} /></span>
          <span className="meta">
            {c.importance === "high" ? <span className="imp" title="High importance"><I.Important /></span> : null}
            {c.invite ? <I.Calendar /> : null}
            {atts.length ? <I.Attach /> : null}
            {snoozed ? <I.Clock /> : null}
            <span className="time">{snoozed ? `${fmtDay(c.snoozedUntil!)} ${fmtTime(c.snoozedUntil!)}` : listTime(m.at)}</span>
          </span>
        </div>
        <div className="l3"><Highlight text={preview.slice(0, 220)} q={q} /></div>
        {hasL4 ? (
          <div className="l4">
            {c.categories.map((n) => <CategoryChip key={n} name={n} />)}
            {atts.slice(0, 2).map((a, i) => (
              <button key={i} className="fchip" tabIndex={-1} onClick={(e) => act(e, () => ui.outlook.ui.emit({ type: "attachment", id: c.id, name: a.name, action: "open" }))}>
                <I.FileIcon name={a.name} />
                <span>{a.name}</span>
              </button>
            ))}
            {atts.length > 2 ? <span className="fchip" style={{ padding: "0 8px" }}>{`+${atts.length - 2}`}</span> : null}
            {q && c.folder !== "inbox" ? <span className="foldertag">{folderName(state, c.folder)}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MessageList() {
  const ui = useUI();
  const { outlook, menu } = ui;
  const { state, people, me } = outlook;
  const [shut, setShut] = useState<Set<string>>(() => new Set());
  const list = listOf(state, people, me);
  const q = state.query;

  // Pinned first (outside search), then by date group.
  const groups: [string, OutlookConversation[]][] = [];
  const pinned = q ? [] : list.filter((c) => c.pinned);
  if (pinned.length) groups.push(["Pinned", pinned]);
  for (const c of list) {
    if (c.pinned && !q) continue;
    const g = groupOf(lastOf(c).at);
    const last = groups[groups.length - 1];
    if (last && last[0] === g) last[1].push(c);
    else groups.push([g, [c]]);
  }

  const inbox = state.folder === "inbox" && state.focusedInbox;
  const fav = state.favorites.includes(state.folder);
  const allChecked = list.length > 0 && list.every((c) => state.selected.includes(c.id));
  const some = state.selected.length > 0 && !allChecked;

  let empty: [string, string] | null = null;
  if (!list.length)
    empty = q
      ? ["We didn't find anything", "Try different keywords, or check the spelling."]
      : state.filter !== "all"
        ? ["Nothing matches this filter", "Try another filter to see more mail."]
        : state.folder === "inbox"
          ? [state.pivot === "focused" || !state.focusedInbox ? "All done for the day" : "Nothing in Other", "Enjoy your empty inbox."]
          : [`Nothing in ${folderName(state, state.folder)}`, state.folder === "deleted" ? "Items you delete will show up here." : "Looks empty over here."];

  return (
    <section className={`list${state.selectMode ? " selmode" : ""}`} aria-label="Message list">
      <div className="lhead">
        <button className={`ib${state.selectMode ? " on" : ""}`} data-tip="Select" aria-label="Select" aria-pressed={state.selectMode} onClick={() => outlook.ui.setSelection([], !state.selectMode)}>
          <I.Multiselect />
        </button>
        {q ? (
          <>
            <button className="ib" data-tip="Exit search" aria-label="Exit search" onClick={() => outlook.ui.search("")}><I.Back /></button>
            <div className="title">Results<small>{plural(list.length, "result")}</small></div>
          </>
        ) : inbox ? (
          (["focused", "other"] as const).map((p) => (
            <button key={p} className={`pivot${state.pivot === p ? " active" : ""}`} data-label={p === "focused" ? "Focused" : "Other"} aria-pressed={state.pivot === p} onClick={() => outlook.ui.setView({ pivot: p })}>
              {p === "focused" ? "Focused" : "Other"}
            </button>
          ))
        ) : (
          <>
            <div className="title">{folderName(state, state.folder)}</div>
            <button
              className={`ib sm fav${fav ? " on" : ""}`}
              data-tip={`${fav ? "Remove from" : "Add to"} Favorites`}
              aria-label="Toggle favorite"
              onClick={() => outlook.ui.setView({ favorites: fav ? state.favorites.filter((f) => f !== state.folder) : [...state.favorites, state.folder] })}
            >
              {fav ? <I.StarF /> : <I.Star />}
            </button>
          </>
        )}
        <span className="grow" />
        <button
          className="ib tip-l"
          data-tip="Filter"
          aria-label="Filter"
          style={{ marginRight: 4 }}
          onClick={(e) => menu(e.currentTarget, [{ caption: "Filter" }, ...FILTERS.map(([id, n]) => ({ label: n, icon: <span style={{ width: 20, flex: "none" }} />, checked: state.filter === id, run: () => outlook.ui.setView({ filter: id }) }))], { align: "right" })}
        >
          <I.Filter />
        </button>
      </div>
      {state.selectMode ? (
        <div className="selbar">
          <button aria-label="Select all" onClick={() => outlook.ui.setSelection(allChecked ? [] : list.map((c) => c.id))}>
            <span className={`cbx${allChecked ? " on" : some ? " some" : ""}`}><I.CheckB /></span>
          </button>
          <span>{state.selected.length ? `${state.selected.length} selected` : "Select all"}</span>
          <span className="grow" />
          <button className="link" onClick={() => outlook.ui.setSelection([], false)}>Cancel</button>
        </div>
      ) : null}
      {state.filter !== "all" ? (
        <span className="filterchip">
          {`Filter: ${FILTERS.find((f) => f[0] === state.filter)?.[1]}`}
          <button aria-label="Clear filter" onClick={() => outlook.ui.setView({ filter: "all" })}><I.Close /></button>
        </span>
      ) : null}
      <div className="lbody" role="listbox" aria-label="Messages" aria-multiselectable="true">
        {empty ? (
          <div className="empty">
            <I.EmptyArt />
            <div><b>{empty[0]}</b>{empty[1]}</div>
          </div>
        ) : (
          groups.map(([g, items]) => {
            const closed = shut.has(g);
            return (
              <div key={g} style={{ display: "contents" }}>
                <button className={`ghead${closed ? " shut" : ""}`} aria-expanded={!closed} onClick={() => setShut((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; })}>
                  <I.ChevD />
                  {g}
                  {closed ? <span className="n">{`(${items.length})`}</span> : null}
                </button>
                {closed ? null : items.map((c) => <Row key={c.id} c={c} />)}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
