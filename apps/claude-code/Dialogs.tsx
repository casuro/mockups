import { useState, type KeyboardEvent } from "react";
import { Avatar, useUI } from "./context";
import { DiffStat, stats } from "./format";
import * as I from "./icons";
import type { SessionState } from "./types";

// The two dialogs: delete a session, and create a pull request from a
// session's changes.

export function ConfirmDelete({ session: s }: { session: SessionState }) {
  const { app, closeModal } = useUI();
  return (
    <>
      <div className="modal-h">
        <I.Trash className="lead" style={{ color: "var(--err)" }} />
        <h2>Delete session?</h2>
      </div>
      <div className="modal-b">
        <p style={{ color: "var(--text-2)", lineHeight: "21px" }}>
          "{s.title}" and its transcript will be permanently deleted. Changes already pushed to <code>{s.branch}</code> are not affected.
        </p>
      </div>
      <div className="modal-f">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button
          className="btn danger"
          autoFocus
          onClick={() => {
            closeModal();
            app.ui.remove(s.id);
          }}
        >
          Delete
        </button>
      </div>
    </>
  );
}

export function CreatePr({ session: s }: { session: SessionState }) {
  const { app, closeModal } = useUI();
  const branches = (app.seed.repos[s.repo]?.branches ?? ["main"]).filter((b) => b !== s.branch);
  const total = s.changes.reduce((acc, c) => {
    const x = stats(c.hunks);
    return { a: acc.a + x.a, d: acc.d + x.d };
  }, { a: 0, d: 0 });
  const last = [...s.items].reverse().find((i) => i.type === "text");
  const summary = last && last.type === "text" ? last.text.split("\n")[0].replace(/\*\*/g, "") : s.title;
  const bullets = s.changes.map((c) => `- \`${c.path}\` (+${stats(c.hunks).a} -${stats(c.hunks).d})`).join("\n");
  const [title, setTitle] = useState(s.title);
  const [base, setBase] = useState(branches.includes("main") ? "main" : (branches[0] ?? "main"));
  const [description, setDescription] = useState(
    `## Summary\n${summary}\n\n## Changes\n${bullets}\n\n## Testing\n- Ran the affected test suites locally, all passing\n\nCreated with Claude Code`
  );
  const [reviewers, setReviewers] = useState<string[]>(() => app.seed.defaults?.reviewers ?? Object.keys(app.people).slice(0, 2));
  const [draft, setDraft] = useState(false);
  const submit = () => {
    closeModal();
    app.ui.createPr(s.id, { title: title.trim() || s.title, base, description, reviewers, draft });
  };
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };
  const n = s.changes.length;
  return (
    <>
      <div className="modal-h">
        <span style={{ display: "inline-flex", width: 22, height: 22 }} className="gh"><I.GitHub /></span>
        <h2>Create pull request</h2>
        <button className="icon-btn" aria-label="Close" onClick={closeModal}><I.X /></button>
      </div>
      <div className="modal-b scroll-thin">
        <div className="field">
          <label htmlFor="cc-pr-title">Title</label>
          <input className="input" id="cc-pr-title" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} onKeyDown={onKey} />
        </div>
        <div className="field">
          <span className="lab">Branches</span>
          <div className="branches">
            <select className="select" aria-label="Base branch" value={base} onChange={(e) => setBase(e.target.value)}>
              {branches.map((b) => <option key={b}>{b}</option>)}
            </select>
            <span className="arrow"><I.Back /></span>
            <span className="cmp"><I.Branch /><span>{s.branch}</span></span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
            {n} file{n > 1 ? "s" : ""} changed · <DiffStat {...total} /> · {s.repo}
          </div>
        </div>
        <div className="field">
          <label htmlFor="cc-pr-desc">Description</label>
          <textarea className="textarea" id="cc-pr-desc" value={description} onChange={(e) => setDescription(e.target.value)} onKeyDown={onKey} />
        </div>
        {Object.keys(app.people).length ? (
          <div className="field">
            <span className="lab">Reviewers</span>
            <div className="revpick">
              {Object.values(app.people).map((p) => {
                const on = reviewers.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`rev${on ? " on" : ""}`}
                    aria-pressed={on}
                    onClick={() => setReviewers(on ? reviewers.filter((r) => r !== p.id) : [...reviewers, p.id])}
                  >
                    <Avatar photo={p.photo} name={p.name} size={26} />
                    <span>{p.name}</span>
                    <I.Check className="ck" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <label className="check-row">
          <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} /> Open as draft
        </label>
      </div>
      <div className="modal-f">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" onClick={submit}><I.Pr />Create pull request</button>
      </div>
    </>
  );
}
