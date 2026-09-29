import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Composer, Queue, RunStatus } from "./Composer";
import { useUI } from "./context";
import { CreatePr } from "./Dialogs";
import { fmtK, MOD, stats } from "./format";
import * as I from "./icons";
import { Panes } from "./Panes";
import { Transcript } from "./Transcript";
import type { Item, SessionState } from "./types";

// A session: the header (title, repo and branch, model, context ring, pane
// toggles, pull request), the transcript, the composer, and the side panes.

function ContextRing({ pct }: { pct: number }) {
  const c = 2 * Math.PI * 6.5;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle className="track" cx="8" cy="8" r="6.5" fill="none" strokeWidth="2.2" />
      <circle className="fill" cx="8" cy="8" r="6.5" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeDasharray={`${((c * pct) / 100).toFixed(2)} ${c.toFixed(2)}`} />
    </svg>
  );
}

function Header({ s }: { s: SessionState }) {
  const ui = useUI();
  const { app } = ui;
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);
  useEffect(() => setEditing(false), [s.id]);
  const total = s.changes.reduce((acc, c) => {
    const x = stats(c.hunks);
    return { a: acc.a + x.a, d: acc.d + x.d };
  }, { a: 0, d: 0 });
  const n = s.changes.length;
  const ctxTip = `${s.context}% context used · ${fmtK(Math.round(s.context * 2000))} / 200k tokens`;
  const pr = [...s.items].reverse().find((i): i is Extract<Item, { type: "pr" }> => i.type === "pr");
  const prPass = !!pr?.checks?.length && pr.checks.every((c) => c.done);
  const { panes } = app.state;
  const commit = (v: string) => {
    setEditing(false);
    if (v.trim() && v.trim() !== s.title) app.ui.rename(s.id, v);
  };
  const toggle = (p: "diff" | "terminal" | "preview") => app.ui.togglePane(p, undefined, ui.narrow());

  return (
    <header className="s-head">
      <button className="icon-btn menu-btn" aria-label="Open sessions" onClick={() => ui.setDrawer(true)}>
        <I.Menu />
      </button>
      <div className="s-title">
        {editing ? (
          <input
            ref={input}
            defaultValue={s.title}
            aria-label="Session title"
            autoFocus
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget.value);
              if (e.key === "Escape") setEditing(false);
              e.stopPropagation();
            }}
          />
        ) : (
          <button className="t" data-tip="Rename session" onClick={() => setEditing(true)}>{s.title}</button>
        )}
      </div>
      <span className="h-chip repo" data-tip={s.env === "cloud" ? "Cloud environment" : "Local worktree"}>
        {s.env === "cloud" ? <I.Cloud /> : <I.Repo />}
        <span>{s.repo}</span>
        <span className="br" style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          <I.Branch />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.branch}</span>
        </span>
      </span>
      <span className="h-chip model">
        <I.Cpu />
        <span>{(app.models.find((m) => m.id === s.model) ?? app.models[0]).name}</span>
      </span>
      <span className="grow" />
      <button className="ctx" data-tip={ctxTip} aria-label={ctxTip}>
        <ContextRing pct={s.context} />
        <span className="pct">{s.context}%</span>
      </button>
      <div className="pane-toggles">
        <button
          className={`icon-btn${panes.diff ? " on" : ""}`}
          data-tip={n ? `Diff · ${n} file${n > 1 ? "s" : ""} +${total.a} -${total.d}` : "Diff"}
          aria-label="Toggle diff pane"
          aria-pressed={panes.diff}
          onClick={() => toggle("diff")}
        >
          <I.Diff />
          {n ? <span className="n">{n}</span> : null}
        </button>
        <button className={`icon-btn${panes.terminal ? " on" : ""}`} data-tip="Terminal" data-kbd={`${MOD} J`} aria-label="Toggle terminal pane" aria-pressed={panes.terminal} onClick={() => toggle("terminal")}>
          <I.Terminal />
        </button>
        <button className={`icon-btn${panes.preview ? " on" : ""}`} data-tip="Preview" aria-label="Toggle preview pane" aria-pressed={panes.preview} onClick={() => toggle("preview")}>
          <I.Globe />
        </button>
      </div>
      {pr ? (
        <button className="pr-link" data-tip={prPass ? "All checks passed" : "Checks running"} onClick={() => app.ui.emit({ type: "action", label: "View PR", sessionId: s.id })}>
          <span className="gh"><I.GitHub className="ghm" /></span>#{pr.number}
          <span className={`st${prPass ? "" : " run"}`} />
        </button>
      ) : n ? (
        <button className="btn primary create-pr" disabled={s.status === "running"} onClick={() => ui.openModal(<CreatePr session={s} />)}>
          <I.Pr />
          <span className="lbl">Create PR</span>
        </button>
      ) : null}
    </header>
  );
}

/** The transcript's scroller: it follows new content while the reader is near the end, and starts at the end. */
function Scroller({ s }: { s: SessionState }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
    pinned.current = true;
  }, [s.id]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [s.items]);
  return (
    <div
      ref={ref}
      className="scroller scroll-thin"
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      }}
    >
      <Transcript session={s} />
    </div>
  );
}

export function Session({ s }: { s: SessionState }) {
  const { app, composer } = useUI();
  const running = s.status === "running";
  return (
    <div className="session">
      <Header s={s} />
      <div className="sbody">
        <div className="work">
          <Scroller s={s} />
          <div className="composer-wrap">
            <div><RunStatus session={s} /></div>
            <Queue session={s} />
            <Composer
              textarea={composer}
              value={s.draft}
              placeholder={running ? "Queue a follow-up message..." : s.status === "input" ? "Answer the prompt above, or reply to Claude..." : "Reply to Claude..."}
              model={s.model}
              mode={s.mode}
              attachments={s.attachments}
              running={running}
              onSend={app.ui.send}
            />
            <div className="foot-hint">
              <span><kbd>↵</kbd> send</span>
              <span><kbd>⇧</kbd><kbd>↵</kbd> new line</span>
              <span><kbd>Esc</kbd> interrupt</span>
              <span><kbd>{MOD}</kbd><kbd>J</kbd> terminal</span>
            </div>
          </div>
        </div>
        <Panes s={s} />
      </div>
    </div>
  );
}
