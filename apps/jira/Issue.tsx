import { useEffect, useRef, useState } from "react";
import { confirmDelete } from "./Board";
import { Activity } from "./Activity";
import { Avatar, Lozenge, MenuItem, useUI } from "./context";
import { Details, Picker, StatusMenu } from "./Details";
import { sanitize } from "./format";
import * as I from "./icons";
import type { JiraIssue } from "./types";
import { childrenOf, epicOf } from "./use-jira";

// An issue, as a dialog over the page or as a full page: the summary and
// description, child and linked issues, then Activity (Activity.tsx) and,
// on the right, the status and Details (Details.tsx).

export function IssueView({ issueKey, full = false }: { issueKey: string; full?: boolean }) {
  const { jira, openPop, pop, confirm, closePop } = useUI();
  const { state, me } = jira;
  const is = state.issues[issueKey];
  const close = useRef<HTMLButtonElement>(null);

  // The dialog puts the keyboard on its close button, like Jira.
  useEffect(() => {
    if (!full) close.current?.focus({ preventScroll: true });
  }, [full]);

  if (!is)
    return (
      <div className="empty-state">
        <h2>Issue not found</h2>
        <p>It may have been deleted.</p>
        <button className="btn primary" onClick={() => jira.ui.navigate("board")}>Back to board</button>
      </div>
    );

  const ep = epicOf(state, is);
  const parent = is.parent ? state.issues[is.parent] : null;
  const watching = is.watchers.includes(me);
  const moreId = `issue-more:${is.key}`;
  const menu = (
    <>
      <MenuItem label={is.flagged ? "Remove flag" : "Add flag"} icon={<I.FlagO />} onClick={() => (closePop(), jira.ui.toggleFlag(is.key))} />
      <MenuItem label="Log work" icon={<I.Clock />} onClick={() => (closePop(), jira.ui.logWork(is.key))} />
      <MenuItem
        label="Clone"
        icon={<I.Copy />}
        onClick={() => {
          closePop();
          const { type, status, assignee, priority, points, labels, sprint, epic, parent, fixVersions, description, color } = is;
          jira.ui.create({ type, summary: `CLONE - ${is.summary}`, status, assignee, priority, points, labels, sprint, epic, parent, fixVersions, description, color }, { after: is.key }, "short");
        }}
      />
      <MenuItem label="Copy link" icon={<I.Link />} onClick={() => (closePop(), jira.ui.copyLink(is.key))} />
      <div className="mi-sep" />
      <MenuItem label="Delete" icon={<I.Trash />} danger onClick={() => (closePop(), confirmDelete(jira, confirm, is.key))} />
    </>
  );

  const body = (
    <>
      <div className="im-top">
        <nav className="im-crumbs" aria-label="Issue breadcrumbs">
          {ep && !parent ? (
            <>
              <a onClick={() => jira.ui.openIssue(ep.key)}><I.TypeIcon type="epic" />{ep.key}</a>
              <span className="slash">/</span>
            </>
          ) : null}
          {parent ? (
            <>
              <a onClick={() => jira.ui.openIssue(parent.key)}><I.TypeIcon type={parent.type} />{parent.key}</a>
              <span className="slash">/</span>
            </>
          ) : null}
          {!ep && !parent && is.type !== "epic" ? (
            <>
              <button className="btn subtle sm" onClick={(e) => openPop(e.currentTarget, <Picker issueKey={is.key} field="epic" />, { id: `pick:epic`, cls: "wide" })}><I.Plus />Add epic</button>
              <span className="slash">/</span>
            </>
          ) : null}
          <a title="Copy link" onClick={() => jira.ui.copyLink(is.key)}><I.TypeIcon type={is.type} />{is.key}</a>
        </nav>
        <div className="im-actions">
          <button className={`icon-btn watch-btn${watching ? " on" : ""}`} aria-pressed={watching} title={watching ? "Stop watching" : "Start watching"} onClick={() => jira.ui.toggleWatch(is.key)}>
            {watching ? <I.EyeF /> : <I.Eye />}
            <span>{is.watchers.length}</span>
          </button>
          <button className="icon-btn" aria-label="Share" title="Share" onClick={() => jira.ui.copyLink(is.key)}><I.Share /></button>
          <button className="icon-btn" aria-label="More actions" aria-haspopup="menu" aria-expanded={pop?.id === moreId} title="Actions" onClick={(e) => openPop(e.currentTarget, menu, { id: moreId, align: "right" })}>
            <I.More />
          </button>
          <button
            className="icon-btn"
            data-act="issue-full"
            aria-label={full ? "Open as dialog" : "Open as full page"}
            title={full ? "Open as dialog" : "Open as full page"}
            onClick={() => jira.ui.setFullPage(!full)}
          >
            {full ? <I.Collapse /> : <I.Expand />}
          </button>
          {full ? null : <button ref={close} className="icon-btn" aria-label="Close" title="Close (Esc)" onClick={jira.ui.closeIssue}><I.Close /></button>}
        </div>
      </div>
      <div className="im-body">
        <div className="im-main">
          <Main is={is} />
        </div>
        <aside className="im-side">
          <Details is={is} />
        </aside>
      </div>
    </>
  );

  return full ? (
    <div className="issue-full issue-view">{body}</div>
  ) : (
    <div className="issue-modal issue-view" role="dialog" aria-modal="true" aria-label={`${is.key} ${is.summary}`}>
      {body}
    </div>
  );
}

function Main({ is }: { is: JiraIssue }) {
  const { jira, renderCustom } = useUI();
  const [child, setChild] = useState(false);
  const [link, setLink] = useState(false);
  return (
    <>
      <Summary is={is} />
      <div className="im-quick">
        <button className="btn" onClick={() => jira.ui.emit({ type: "action", kind: "attach", label: "Attach", key: is.key })}><I.Attach />Attach</button>
        {is.type !== "subtask" && is.type !== "epic" ? <button className="btn" onClick={() => setChild(true)}><I.Child />Add a child issue</button> : null}
        <button className="btn" onClick={() => setLink(true)}><I.Link />Link issue</button>
      </div>
      <section className="im-sec">
        <div className="im-sec-h"><h2>Description</h2></div>
        <Description is={is} />
      </section>
      {is.custom && renderCustom ? <section className="im-sec">{renderCustom(is)}</section> : null}
      {is.type === "subtask" ? null : <Children is={is} adding={child} setAdding={setChild} />}
      <Links is={is} adding={link} setAdding={setLink} />
      <Activity is={is} />
    </>
  );
}

function Summary({ is }: { is: JiraIssue }) {
  const { jira } = useUI();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(is.summary);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);
  const save = () => {
    const v = value.trim();
    if (!v) return setInvalid(true);
    jira.ui.setField(is.key, "summary", v);
    setEditing(false);
  };
  if (!editing)
    return (
      <h1 className="im-summary" title="Click to edit" onClick={() => (setValue(is.summary), setInvalid(false), setEditing(true))}>
        {is.summary}
      </h1>
    );
  return (
    <div className="inline-edit">
      <input
        ref={input}
        className={`text${invalid ? " invalid" : ""}`}
        value={value}
        aria-label="Summary"
        maxLength={255}
        autoFocus
        onChange={(e) => (setValue(e.target.value), setInvalid(false))}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.preventDefault(), save());
          if (e.key === "Escape") (e.stopPropagation(), setEditing(false));
        }}
      />
      <div className="ie-btns">
        <button aria-label="Save" onClick={save}><I.Check /></button>
        <button aria-label="Cancel" onClick={() => setEditing(false)}><I.Close /></button>
      </div>
    </div>
  );
}

function Description({ is }: { is: JiraIssue }) {
  const { jira } = useUI();
  const [editing, setEditing] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = editor.current;
    if (!editing || !d) return;
    d.focus();
    const r = document.createRange();
    r.selectNodeContents(d);
    r.collapse(false);
    const s = getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }, [editing]);
  const fmt = (cmd: string, val?: string) => () => {
    editor.current?.focus();
    try {
      document.execCommand(cmd, false, val ? (val === "P" ? "<p>" : `<${val.toLowerCase()}>`) : undefined);
    } catch {
      // An unsupported command does nothing.
    }
  };
  const act = (label: string) => () => jira.ui.emit({ type: "action", kind: "editor", label, key: is.key });
  if (!editing)
    return (
      <div
        className={`desc rich${is.description ? "" : " placeholder"}`}
        role="button"
        tabIndex={0}
        aria-label="Edit description"
        onClick={() => setEditing(true)}
        {...(is.description ? { dangerouslySetInnerHTML: { __html: sanitize(is.description) } } : { children: "Add a description..." })}
      />
    );
  const save = () => {
    jira.ui.setField(is.key, "description", sanitize(editor.current?.innerHTML ?? ""));
    setEditing(false);
  };
  return (
    <>
      <div className="rte">
        <div className="ed-toolbar" role="toolbar" aria-label="Formatting">
          <button className="tb-btn txt" onClick={fmt("formatBlock", "P")}>Normal text<I.ChevD /></button>
          <span className="tb-sep" />
          <button className="tb-btn" aria-label="Bold" onClick={fmt("bold")}><I.Bold /></button>
          <button className="tb-btn" aria-label="Italic" onClick={fmt("italic")}><I.Italic /></button>
          <span className="tb-sep" />
          <button className="tb-btn" aria-label="Bullet list" onClick={fmt("insertUnorderedList")}><I.Ul /></button>
          <button className="tb-btn" aria-label="Numbered list" onClick={fmt("insertOrderedList")}><I.Ol /></button>
          <span className="tb-sep" />
          <button className="tb-btn" aria-label="Code block" onClick={fmt("formatBlock", "PRE")}><I.CodeI /></button>
          <button className="tb-btn" aria-label="Heading" onClick={fmt("formatBlock", "H3")}>H</button>
          <button className="tb-btn" aria-label="Mention" onClick={act("Mention")}><I.At /></button>
          <button className="tb-btn" aria-label="Image" onClick={act("Image")}><I.Image /></button>
          <button className="tb-btn" aria-label="Table" onClick={act("Table")}><I.Table /></button>
        </div>
        <div
          ref={editor}
          className="rte-area rich"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Description"
          dangerouslySetInnerHTML={{ __html: sanitize(is.description) || "<p><br></p>" }}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setEditing(false))}
        />
      </div>
      <div className="edit-btns">
        <button className="btn primary" onClick={save}>Save</button>
        <button className="btn subtle" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </>
  );
}

function ChildRow({ c, link }: { c: JiraIssue; link?: { from: string } }) {
  const { jira, openPop, pop } = useUI();
  const done = jira.statuses.find((s) => s.id === c.status)?.tone === "done";
  const id = `status:${c.key}`;
  return (
    <div className="child-row" onClick={() => jira.ui.openIssue(c.key)}>
      <I.TypeIcon type={c.type} />
      <span className={`k${done ? " done" : ""}`}>{c.key}</span>
      <span className="s">{c.summary}</span>
      <I.PriorityIcon priority={c.priority} />
      <Avatar id={c.assignee} size={24} />
      {link ? (
        <>
          <Lozenge status={c.status} />
          <button
            className="icon-btn sm"
            aria-label={`Remove link to ${c.key}`}
            title="Unlink"
            onClick={(e) => (e.stopPropagation(), jira.ui.removeLink(link.from, c.key))}
          >
            <I.Close />
          </button>
        </>
      ) : (
        <button
          className={`lz lz-${jira.statuses.find((s) => s.id === c.status)?.tone ?? "todo"}`}
          aria-haspopup="menu"
          aria-expanded={pop?.id === id}
          onClick={(e) => (e.stopPropagation(), openPop(e.currentTarget, <StatusMenu issueKey={c.key} />, { id }))}
        >
          {jira.statusName(c.status)}
        </button>
      )}
    </div>
  );
}

function Children({ is, adding, setAdding }: { is: JiraIssue; adding: boolean; setAdding: (on: boolean) => void }) {
  const { jira } = useUI();
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const kids = childrenOf(jira.state, is);
  const tone = (c: JiraIssue) => jira.statuses.find((s) => s.id === c.status)?.tone;
  const done = kids.filter((k) => tone(k) === "done").length;
  const prog = kids.filter((k) => tone(k) === "inprogress" || tone(k) === "review").length;
  const pct = kids.length ? Math.round((done / kids.length) * 100) : 0;
  useEffect(() => {
    if (adding) input.current?.focus();
  }, [adding]);
  const save = () => {
    const v = text.trim();
    if (!v) return input.current?.focus();
    jira.ui.create({ type: "subtask", summary: v, parent: is.key, priority: "medium" }, {}, "short");
    setText("");
  };
  return (
    <section className="im-sec">
      <div className="im-sec-h">
        <h2>Child issues</h2>
        {is.type !== "epic" ? <button className="icon-btn" aria-label="Add child issue" title="Add child issue" onClick={() => setAdding(true)}><I.Plus /></button> : null}
      </div>
      {kids.length ? (
        <>
          <div className="prog-row">
            <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i className="p-done" style={{ width: `${(done / kids.length) * 100}%` }} />
              <i className="p-prog" style={{ width: `${(prog / kids.length) * 100}%` }} />
            </div>
            <span>{pct}% Done</span>
          </div>
          <div className="child-list">{kids.map((c) => <ChildRow key={c.key} c={c} />)}</div>
        </>
      ) : adding ? null : (
        <p className="sub">{is.type === "epic" ? "No child issues yet." : "Break this issue into smaller pieces of work."}</p>
      )}
      {adding ? (
        <div className="add-row">
          <input
            ref={input}
            className="text"
            placeholder="What needs to be done?"
            aria-label="Child issue summary"
            maxLength={255}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.preventDefault(), save());
              if (e.key === "Escape") (e.stopPropagation(), setAdding(false));
            }}
          />
          <button className="btn primary" onClick={save}>Create</button>
          <button className="btn subtle" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : null}
    </section>
  );
}

const LINK_TYPES = ["blocks", "is blocked by", "relates to", "duplicates", "is caused by"];

function Links({ is, adding, setAdding }: { is: JiraIssue; adding: boolean; setAdding: (on: boolean) => void }) {
  const { jira } = useUI();
  const { state } = jira;
  const type = useRef<HTMLSelectElement>(null);
  const other = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (adding) type.current?.focus();
  }, [adding]);
  if (!is.links.length && !adding) return null;
  const groups = new Map<string, JiraIssue[]>();
  for (const l of is.links) if (state.issues[l.key]) groups.set(l.type, [...(groups.get(l.type) ?? []), state.issues[l.key]]);
  const candidates = Object.values(state.issues)
    .filter((x) => x.key !== is.key && x.type !== "subtask" && !is.links.some((l) => l.key === x.key))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
  return (
    <section className="im-sec">
      <div className="im-sec-h">
        <h2>Linked issues</h2>
        <button className="icon-btn" aria-label="Link issue" title="Link issue" onClick={() => setAdding(true)}><I.Plus /></button>
      </div>
      {[...groups].map(([t, list]) => (
        <div key={t}>
          <div className="link-group">{t}</div>
          <div className="child-list" style={{ marginBottom: 8 }}>
            {list.map((c) => <ChildRow key={c.key} c={c} link={{ from: is.key }} />)}
          </div>
        </div>
      ))}
      {adding ? (
        <div className="add-row">
          <select ref={type} className="text" aria-label="Link type">
            {LINK_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select ref={other} className="text" aria-label="Issue to link" style={{ flex: 1, minWidth: 180 }}>
            {candidates.map((x) => <option key={x.key} value={x.key}>{x.key} {x.summary}</option>)}
          </select>
          <button
            className="btn primary"
            onClick={() => {
              if (!other.current?.value) return;
              jira.ui.addLink(is.key, type.current!.value, other.current.value);
              setAdding(false);
            }}
          >
            Link
          </button>
          <button className="btn subtle" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : null}
    </section>
  );
}
