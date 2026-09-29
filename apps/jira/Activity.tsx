import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Lozenge, useUI } from "./context";
import { fmtDateTime, Mentions, rel } from "./format";
import * as I from "./icons";
import type { JiraIssue } from "./types";

// An issue's Activity: comments, history and work log, newest or oldest
// first, with the comment box and its @-mention picker.

/** The @-mention picker under a comment box. */
function useMentions(input: React.RefObject<HTMLTextAreaElement | null>, setText: (t: string) => void) {
  const { jira, openPop, closePop, pop } = useUI();
  const [m, setM] = useState<{ start: number; list: string[]; sel: number } | null>(null);
  const people = Object.values(jira.people);

  const insert = (id: string, at = m) => {
    const t = input.current;
    if (!t || !at) return;
    const name = `@${jira.people[id].name} `;
    const next = t.value.slice(0, at.start) + name + t.value.slice(t.selectionStart);
    setText(next);
    setM(null);
    closePop();
    const pos = at.start + name.length;
    requestAnimationFrame(() => (t.focus(), t.setSelectionRange(pos, pos)));
  };

  const draw = (s: { start: number; list: string[]; sel: number }) =>
    openPop(
      input.current!,
      <>
        <div className="menu-h">People</div>
        {s.list.map((id, n) => (
          <button key={id} className={`mi${n === s.sel ? " on" : ""}`} role="menuitem" tabIndex={-1} onMouseDown={(e) => (e.preventDefault(), insert(id, s))}>
            <span className="mi-ic"><Avatar id={id} size={24} /></span>
            <span className="t">{jira.people[id].name}<small>{jira.people[id].role}</small></span>
          </button>
        ))}
      </>,
      { id: "mention", cls: "mention-pop", focus: false, toggle: false }
    );

  const check = () => {
    const t = input.current;
    if (!t) return;
    const hit = t.value.slice(0, t.selectionStart).match(/(^|\s)@([A-Za-z]*)$/);
    const q = hit?.[2].toLowerCase() ?? "";
    const list = hit ? people.filter((p) => p.name.toLowerCase().split(" ").some((w) => w.startsWith(q))).map((p) => p.id) : [];
    if (!list.length) {
      if (m) (setM(null), pop?.id === "mention" && closePop());
      return;
    }
    const s = { start: t.selectionStart - q.length - 1, list, sel: 0 };
    setM(s);
    draw(s);
  };

  /** Arrow keys, Enter/Tab and Esc while the picker is open; true when the key was used. */
  const key = (e: React.KeyboardEvent) => {
    if (!m || pop?.id !== "mention") return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const s = { ...m, sel: (m.sel + (e.key === "ArrowDown" ? 1 : -1) + m.list.length) % m.list.length };
      setM(s);
      draw(s);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") return e.preventDefault(), insert(m.list[m.sel]), true;
    if (e.key === "Escape") return e.preventDefault(), e.stopPropagation(), setM(null), closePop(), true;
    return false;
  };

  return { check, key };
}

function CommentBox({ initial, onSave, onCancel, label, id }: { initial: string; onSave: (t: string) => void; onCancel: () => void; label: string; id?: string }) {
  const [text, setText] = useState(initial);
  const input = useRef<HTMLTextAreaElement>(null);
  const mentions = useMentions(input, setText);
  useEffect(() => {
    const t = input.current;
    if (t) (t.focus(), t.setSelectionRange(t.value.length, t.value.length));
  }, []);
  const save = () => text.trim() && onSave(text.trim());
  return (
    <>
      <div className="fake-editor">
        {id === "commentInput" ? (
          <div className="ed-toolbar" aria-hidden="true">
            <span className="tb-btn"><I.Bold /></span>
            <span className="tb-btn"><I.Italic /></span>
            <span className="tb-sep" />
            <span className="tb-btn"><I.Ul /></span>
            <span className="tb-btn"><I.CodeI /></span>
            <span className="tb-btn"><I.At /></span>
            <span className="tb-btn"><I.Emoji /></span>
          </div>
        ) : null}
        <div className="ta-wrap">
          <textarea
            ref={input}
            placeholder={id === "commentInput" ? "Add a comment... Type @ to mention a teammate" : undefined}
            aria-label={label}
            value={text}
            onChange={(e) => (setText(e.target.value), requestAnimationFrame(mentions.check))}
            onKeyDown={(e) => {
              if (mentions.key(e)) return;
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.preventDefault(), save());
              if (e.key === "Escape") (e.stopPropagation(), onCancel());
            }}
          />
        </div>
      </div>
      <div className="edit-btns">
        <button className="btn primary" disabled={!text.trim()} onClick={save}>Save</button>
        <button className="btn subtle" onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

const QUICK = ["Looks good!", "Need help?", "This is blocked...", "Can you clarify...?", "This is on track"];
type Tab = "all" | "comments" | "history" | "worklog";

export function Activity({ is }: { is: JiraIssue }) {
  const { jira, confirm } = useUI();
  const { me, people } = jira;
  const [tab, setTab] = useState<Tab>("all");
  const [newest, setNewest] = useState(true);
  const [composer, setComposer] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const now = jira.now();
  type Item = { at: number; node: ReactNode };
  const items: Item[] = [];
  if (tab === "all" || tab === "comments")
    for (const c of is.comments)
      items.push({
        at: c.at,
        node:
          editing === c.id ? (
            <div className="comment" key={c.id}>
              <Avatar id={c.from} size={32} />
              <div className="c-body">
                <CommentBox initial={c.text} label="Edit comment" onCancel={() => setEditing(null)} onSave={(t) => (jira.ui.editComment(is.key, c.id, t), setEditing(null))} />
              </div>
            </div>
          ) : (
            <div className="comment" key={c.id}>
              <Avatar id={c.from} size={32} />
              <div className="c-body">
                <div className="c-head">
                  <b>{jira.pname(c.from)}</b>
                  <span className="sub" title={fmtDateTime(c.at)}>{rel(c.at, now)}</span>
                  {c.edited ? <span className="sub">(edited)</span> : null}
                </div>
                <div className="c-text"><Mentions text={c.text} people={people} me={me} /></div>
                <div className="c-acts">
                  {c.from === me ? (
                    <>
                      <button onClick={() => setEditing(c.id)}>Edit</button>
                      <span>·</span>
                      <button onClick={() => confirm({ title: "Delete this comment?", body: "Once you delete, it's gone for good.", ok: "Delete", run: () => jira.ui.deleteComment(is.key, c.id) })}>Delete</button>
                    </>
                  ) : (
                    <button onClick={() => setComposer(`@${jira.pname(c.from)} `)}>Reply</button>
                  )}
                </div>
              </div>
            </div>
          ),
      });
  if (tab === "all" || tab === "history")
    is.history.forEach((h, n) =>
      items.push({
        at: h.at,
        node:
          h.field === "created" ? (
            <div className="comment hist" key={`h${n}`}>
              <Avatar id={h.by} size={32} />
              <div className="c-body"><div className="c-head"><b>{jira.pname(h.by)}</b><span>created the {I.TYPE_NAMES[is.type]}</span><span className="sub">{rel(h.at, now)}</span></div></div>
            </div>
          ) : (
            <div className="comment hist" key={`h${n}`}>
              <Avatar id={h.by} size={32} />
              <div className="c-body">
                <div className="c-head"><b>{jira.pname(h.by)}</b><span>changed the <b>{h.field}</b></span><span className="sub" title={fmtDateTime(h.at)}>{rel(h.at, now)}</span></div>
                <div className="c-text"><HistVal field={h.field} v={h.from} /><span className="arrow"><I.MoveTo /></span><HistVal field={h.field} v={h.to} /></div>
              </div>
            </div>
          ),
      })
    );
  if (tab === "worklog")
    is.worklog.forEach((w, n) =>
      items.push({
        at: w.at,
        node: (
          <div className="comment" key={`w${n}`}>
            <Avatar id={w.by} size={32} />
            <div className="c-body">
              <div className="c-head"><b>{jira.pname(w.by)}</b><span>logged <b>{Math.floor(w.minutes / 60)}h{w.minutes % 60 ? ` ${w.minutes % 60}m` : ""}</b></span><span className="sub">{rel(w.at, now)}</span></div>
              <div className="c-text">{w.text}</div>
            </div>
          </div>
        ),
      })
    );
  items.sort((a, b) => (newest ? b.at - a.at : a.at - b.at));
  const empty = { comments: "There are no comments yet on this issue.", history: "No history yet.", worklog: "No work has been logged on this issue yet.", all: "" }[tab];
  const tb = (id: Tab, label: string) => (
    <button key={id} className={`btn ${tab === id ? "selected" : "subtle"}`} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
  );

  return (
    <section className="im-sec" aria-label="Activity">
      <div className="act-h">
        <h2>Activity</h2>
        <div className="act-tabs" role="group" aria-label="Show">
          <span className="lbl">Show:</span>
          {tb("all", "All")}
          {tb("comments", "Comments")}
          {tb("history", "History")}
          {tb("worklog", "Work log")}
        </div>
        <button className="btn subtle act-sort" onClick={() => setNewest(!newest)}>
          {newest ? "Newest first" : "Oldest first"}
          {newest ? <I.SortDown /> : <I.SortUp />}
        </button>
      </div>
      {tab === "all" || tab === "comments" ? (
        <div className="composer">
          <Avatar id={me} size={32} />
          <div className="composer-body">
            {composer !== null ? (
              <CommentBox
                key={composer}
                id="commentInput"
                initial={composer}
                label="Add a comment"
                onCancel={() => setComposer(null)}
                onSave={(t) => (jira.ui.addComment(is.key, t), setComposer(null))}
              />
            ) : (
              <>
                <button className="fake-input" data-open-composer onClick={() => setComposer("")}>Add a comment...</button>
                <div className="quick-replies">
                  {QUICK.map((q) => <button key={q} className="btn" onClick={() => setComposer(q)}>{q}</button>)}
                </div>
                <div className="tip"><b>Pro tip:</b> press <span className="kbd">M</span> to comment</div>
              </>
            )}
          </div>
        </div>
      ) : null}
      {tab === "worklog" ? (
        <div style={{ marginBottom: 16 }}>
          <button className="btn" onClick={() => jira.ui.logWork(is.key)}><I.Clock />Log time</button>
        </div>
      ) : null}
      {items.length ? items.map((it) => it.node) : <p className="empty-note">{empty}</p>}
    </section>
  );
}

function HistVal({ field, v }: { field: string; v: string }) {
  const { jira } = useUI();
  if (!v) return <span className="sub">None</span>;
  const s = field === "Status" ? jira.statuses.find((x) => x.name === v) : null;
  return s ? <Lozenge status={s.id} /> : <span className="val">{v}</span>;
}

