import type { ComponentType, MouseEvent, ReactNode, SVGProps } from "react";
import { Avatar, IconButton, useUI } from "./context";
import { FileIcon, listDate, plain } from "./format";
import * as I from "./icons";
import { FOLDER_NAMES } from "./Nav";
import type { GmailMail, GmailMessage, GmailTab } from "./types";
import { lastAt, listFor, type GmailMailbox } from "./use-gmail";

// The list: its toolbar (select, bulk actions, range, split pane), the
// inbox tabs, the search chips, and a row per conversation with its star,
// importance marker, labels, attachments and hover actions.

const TABS: { id: GmailTab; name: string; icon: ComponentType<SVGProps<SVGSVGElement>>; color: string }[] = [
  { id: "primary", name: "Primary", icon: I.Inbox, color: "#0b57d0" },
  { id: "promotions", name: "Promotions", icon: I.Label, color: "#146c2e" },
  { id: "social", name: "Social", icon: I.People, color: "#0b57d0" },
  { id: "updates", name: "Updates", icon: I.Info, color: "#b3261e" },
];

export function ListToolbar({ list }: { list: GmailMail[] }) {
  const { gmail, pop, openPop, closePop } = useUI();
  const { state, ui } = gmail;
  const sel = state.selected;
  const all = list.length > 0 && list.every((m) => sel.includes(m.id));
  const bulk = (action: Parameters<typeof ui.act>[0]) => ui.act(action, sel);
  return (
    <div className="toolbar">
      <button
        className="cb-btn"
        aria-label="Select"
        data-pop-anchor
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".cb")) {
            closePop();
            ui.setSelected(all ? [] : list.map((m) => m.id));
          } else if (pop?.kind === "select") closePop();
          else openPop(e.currentTarget, { kind: "select" });
        }}
      >
        <span className={`cb${!sel.length ? "" : all ? " on" : " some"}`} />
        <I.ChevronDown />
      </button>
      {sel.length ? (
        <>
          <IconButton tip="Archive" onClick={() => bulk("archive")}><I.Archive /></IconButton>
          <IconButton tip="Report spam" onClick={() => bulk("spam")}><I.Spam /></IconButton>
          <IconButton tip="Delete" onClick={() => bulk("delete")}><I.Trash /></IconButton>
          <span className="sep" />
          <IconButton tip="Mark as read" onClick={() => bulk("read")}><I.Read /></IconButton>
          <IconButton className="icon-btn hide-m" tip="Snooze" onClick={() => bulk("snooze")}><I.Snooze /></IconButton>
          <IconButton className="icon-btn hide-m" tip="Add to Tasks" onClick={() => bulk("task")}><I.Task /></IconButton>
          <span className="sep" />
          <IconButton className="icon-btn hide-m" tip="Move to" onClick={() => gmail.toast("Move to…")}><I.MoveTo /></IconButton>
          <IconButton className="icon-btn hide-m" tip="Labels" onClick={() => gmail.toast("Labels")}><I.Label /></IconButton>
        </>
      ) : (
        <IconButton tip="Refresh" onClick={() => gmail.toast("Inbox is up to date.")}><I.Refresh /></IconButton>
      )}
      <IconButton tip="More" onClick={() => gmail.toast("More")}><I.More /></IconButton>
      <span className="grow" />
      <span className="range">{list.length ? `1-${list.length} of ${list.length}` : "0 of 0"}</span>
      <IconButton className="icon-btn sm" label="Newer" disabled style={{ opacity: 0.4 }}><I.ChevronLeft /></IconButton>
      <IconButton className="icon-btn sm" label="Older" disabled style={{ opacity: 0.4 }}><I.ChevronRight /></IconButton>
      <IconButton className="icon-btn hide-m" tip="Toggle split pane mode" onClick={() => ui.set("pane", state.pane === "right" ? "none" : "right")}>
        <I.SplitPane />
      </IconButton>
    </div>
  );
}

export function SelectMenu() {
  const { gmail, closePop } = useUI();
  const list = listOf(gmail);
  const pick: Record<string, (m: GmailMail) => boolean> = {
    All: () => true,
    None: () => false,
    Read: (m) => !m.unread,
    Unread: (m) => m.unread,
    Starred: (m) => m.starred,
    Unstarred: (m) => !m.starred,
  };
  return (
    <>
      {Object.entries(pick).map(([name, f]) => (
        <button
          key={name}
          className="opt"
          onClick={() => {
            gmail.ui.setSelected(list.filter(f).map((m) => m.id));
            closePop();
          }}
        >
          {name}
        </button>
      ))}
    </>
  );
}

const listOf = (gmail: GmailMailbox) => listFor(gmail.state, gmail.person);

export function Tabs() {
  const { gmail } = useUI();
  const { state, ui } = gmail;
  const v = state.view;
  if (v.folder !== "inbox" || v.query || v.label) return null;
  return (
    <div className="tabs" role="tablist">
      {TABS.map((t) => {
        const unread = state.mails.filter((m) => m.folder === "inbox" && m.tab === t.id && m.unread);
        const active = v.tab === t.id;
        const senders = t.id === "primary" ? "" : [...new Set(unread.map((m) => gmail.person(m.messages[m.messages.length - 1].from).name))].join(", ");
        return (
          <button key={t.id} role="tab" aria-selected={active} className={`tab${active ? " active" : ""}`} style={{ ["--tabc" as string]: t.color }} onClick={() => ui.show({ tab: t.id })}>
            <t.icon />
            <span className="t">
              <b>
                {t.name}
                {unread.length && !active && t.id !== "primary" ? (
                  <span className="badge" style={{ background: t.color }}>
                    {unread.length}
                    <span className="nw"> new</span>
                  </span>
                ) : null}
              </b>
              {senders && !active ? <small>{senders}</small> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SearchChips() {
  const { gmail } = useUI();
  const { state, ui } = gmail;
  if (!state.view.query) return null;
  const has = state.view.hasAttachment;
  const menu = (name: string) => (
    <button key={name} className="chip" onClick={() => gmail.toast(name)}>
      {name} <I.ChevronDown style={{ width: 16, height: 16 }} />
    </button>
  );
  return (
    <div className="chips">
      {menu("From")}
      {menu("Any time")}
      <button className={`chip${has ? " on" : ""}`} onClick={() => ui.show({ hasAttachment: !has })}>
        {has ? <I.Check /> : null}Has attachment
      </button>
      {menu("To")}
      <button className="chip" onClick={() => gmail.toast("Is unread")}>Is unread</button>
      <button className="chip" onClick={() => gmail.toast("Advanced search")}>Advanced search</button>
    </div>
  );
}

export function MailList({ list }: { list: GmailMail[] }) {
  const { gmail } = useUI();
  const v = gmail.state.view;
  if (!list.length) {
    const msg = v.query
      ? "No messages matched your search."
      : v.label
        ? `No conversations in ${v.label}.`
        : v.folder === "inbox"
          ? `Your ${TABS.find((t) => t.id === v.tab)?.name} tab is empty.`
          : `No conversations in ${FOLDER_NAMES[v.folder]}.`;
    return (
      <div className="list">
        <div className="empty">
          <I.Inbox style={{ width: 56, height: 56, color: "var(--line-2)" }} />
          <span>{msg}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="list" role="list">
      {list.map((m) => <Row key={m.id} mail={m} />)}
    </div>
  );
}

/** A message's text as one line, signature included, as the list and collapsed messages show it. */
export function useSnippet() {
  const { gmail } = useUI();
  return (x: GmailMessage) => {
    const sig = x.signed ? gmail.person(x.from).signature : undefined;
    return plain(x.body) + (sig ? ` -- ${sig.replace(/\n/g, " ")}` : "");
  };
}

/** "Dev, me" with the latest unread sender in bold, kept as few text runs as the mockup's markup. */
function senders(names: { name: string; bold: boolean }[]) {
  const out: ReactNode[] = [];
  names.forEach(({ name, bold }, i) => {
    const sep = i ? ", " : "";
    const prev = out[out.length - 1];
    if (bold) {
      if (sep) typeof prev === "string" ? (out[out.length - 1] = prev + sep) : out.push(sep);
      out.push(<b key={i}>{name}</b>);
    } else if (typeof prev === "string") out[out.length - 1] = prev + sep + name;
    else out.push(sep + name);
  });
  return out;
}

function Row({ mail: m }: { mail: GmailMail }) {
  const { gmail } = useUI();
  const { state, ui, me } = gmail;
  const snippet = useSnippet();
  const last = m.messages[m.messages.length - 1];
  const atts = m.messages.flatMap((x) => x.attachments.map((name) => ({ name, id: x.id })));
  const selected = state.selected.includes(m.id);
  const v = state.view;
  const first = (id: string) => (id === me ? "me" : gmail.person(id).name.split(" ")[0]);
  const outgoing = !v.query && !v.label && (v.folder === "sent" || v.folder === "drafts");
  const ids = [...new Set(m.messages.map((x) => x.from))];
  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      role="listitem"
      className={`row${m.unread ? " unread" : ""}${selected ? " selected" : ""}${atts.length || m.invite ? " has-att" : ""}`}
      onClick={() => gmail.open(m.id)}
    >
      <Avatar id={last.from === me ? (m.messages[0].to[0] ?? me) : last.from} className="av avatar" />
      <button className="ic cb-wrap" aria-label="Select" onClick={stop(() => ui.toggleSelected(m.id))}>
        <span className={`cb${selected ? " on" : ""}`} />
      </button>
      <button className={`ic star${m.starred ? " on" : ""}`} aria-label={m.starred ? "Starred" : "Not starred"} onClick={stop(() => ui.toggleStar(m.id))}>
        {m.starred ? <I.StarFilled /> : <I.Star />}
      </button>
      <button className={`ic imp${m.important ? " on" : ""}`} aria-label="Important" onClick={stop(() => ui.toggleImportant(m.id))}>
        {m.important ? <I.ImportantFilled /> : <I.Important />}
      </button>
      <span className="from">
        {outgoing ? (
          v.folder === "drafts" ? (
            <>
              <span style={{ color: "#d93025" }}>Draft</span>
              {` ${m.messages[0].to.map(first).join(", ")}`}
            </>
          ) : (
            `To: ${m.messages[0].to.map(first).join(", ")}`
          )
        ) : (
          <>
            {senders(ids.map((id) => ({ name: ids.length > 1 ? first(id) : id === me ? "me" : gmail.person(id).name, bold: m.unread && last.from === id })))}
            {m.messages.length > 1 ? <span className="cnt">{m.messages.length}</span> : null}
          </>
        )}
      </span>
      <span className="mid">
        <span className="line">
          {m.labels.filter((l) => state.labels[l]).map((l) => (
            <span key={l} className="lchip" style={{ background: state.labels[l] }}>{l.split("/").pop()}</span>
          ))}
          <span className="subj">{m.subject}</span>
          <span className="snip"><span className="sep-dash">- </span>{snippet(last).slice(0, 180)}</span>
        </span>
        {atts.length || m.invite ? (
          <span className="att">
            {m.invite ? (
              <span className="attchip">
                <I.CalendarLogo style={{ width: 16, height: 16 }} />
                <span>Invitation</span>
              </span>
            ) : null}
            {atts.map((a) => (
              <button key={`${a.id}:${a.name}`} className="attchip" onClick={stop(() => ui.attachment(m.id, a.name))}>
                <FileIcon name={a.name} />
                <span>{a.name}</span>
              </button>
            ))}
          </span>
        ) : null}
      </span>
      <span className="date">{listDate(lastAt(m))}</span>
      <span className="hov">
        <IconButton tip="Archive" onClick={stop(() => ui.act("archive", [m.id]))}><I.Archive /></IconButton>
        <IconButton tip="Delete" onClick={stop(() => ui.act("delete", [m.id]))}><I.Trash /></IconButton>
        <IconButton tip={`Mark as ${m.unread ? "read" : "unread"}`} onClick={stop(() => ui.act(m.unread ? "read" : "unread", [m.id]))}>
          {m.unread ? <I.Read /> : <I.Unread />}
        </IconButton>
        <IconButton tip="Snooze" onClick={stop(() => ui.act("snooze", [m.id]))}><I.Snooze /></IconButton>
      </span>
    </div>
  );
}
