import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Avatar, useUI } from "./context";
import { Diff } from "./Diff";
import { baseName, DiffStat, highlight, inlineMd, Markdown, stats, TermOutput } from "./format";
import * as I from "./icons";
import type { Item, Lang, SessionState } from "./types";
import { commandKey } from "./use-claude-code";

// A session's transcript: the person's messages, Claude's markdown, and
// the cards for thinking, tool calls (read, search, edit, bash, subagent),
// todos, permission prompts, plans, pull requests and notes.

export function Transcript({ session }: { session: SessionState }) {
  return (
    <div className="transcript">
      {session.items.map((it) => (
        <div key={it.id} className={`it it-${it.type}`} style={it.type === "user" ? { display: "flex", justifyContent: "flex-end" } : undefined}>
          <Entry item={it} session={session} />
        </div>
      ))}
    </div>
  );
}

const toggle = (app: ReturnType<typeof useUI>["app"], id: string) => app.updateItem(id, (it) => void (it.open = !it.open));

function Entry({ item: it, session }: { item: Item; session: SessionState }) {
  const ui = useUI();
  const { app } = ui;
  switch (it.type) {
    case "user":
      return (
        <div className="msg-user">
          {it.attachments?.length ? (
            <div className="atts">
              {it.attachments.map((a) => <span className="att" key={a}><I.File /><span>{a}</span></span>)}
            </div>
          ) : null}
          {it.text}
        </div>
      );
    case "text":
      return <div className="md"><Markdown text={it.text} caret={it.streaming} /></div>;
    case "thinking":
      if (it.live)
        return (
          <div className="thinking">
            <I.Brain />
            <span className="shimmer">{it.verb ?? "Thinking"}...</span>
          </div>
        );
      return (
        <>
          <button className={`thinking${it.open ? " open" : ""}`} aria-expanded={!!it.open} onClick={() => toggle(app, it.id)}>
            <I.Brain />
            <span>Thought for {it.seconds ?? 1}s</span>
            <I.ChevR className="chev" />
          </button>
          {it.open ? <div className="think-body">{it.text}</div> : null}
        </>
      );
    case "read": {
      const start = it.start ?? 1;
      return (
        <ToolCard item={it} icon={<I.FileText />} name="Read" summary={it.path} meta={it.running ? "Reading..." : `lines ${start}-${start + it.lines.length - 1}`}>
          <div className="tb-h"><span className="p">{it.path}</span></div>
          <CodeLines lines={it.lines} start={start} lang={it.lang ?? "ts"} />
        </ToolCard>
      );
    }
    case "search": {
      const files = [...new Set(it.matches.map((m) => m.file))];
      const pat = it.pattern.replace(/\\/g, "");
      return (
        <ToolCard
          item={it}
          icon={<I.Search />}
          name="Search"
          summary={`"${it.pattern}" in ${it.path}`}
          meta={it.running ? "Searching..." : `${it.matches.length} match${it.matches.length === 1 ? "" : "es"} in ${files.length} file${files.length === 1 ? "" : "s"}`}
        >
          {files.map((f) => (
            <div key={f}>
              <div className="grep-file"><I.File />{f}</div>
              <div className="code-lines">
                {it.matches.filter((m) => m.file === f).map((m, i) => (
                  <div className="ln-row" key={i}>
                    <span className="ln">{m.line}</span>
                    <span className="lc">{m.text.split(pat).flatMap((part, k) => (k ? [<mark key={k}>{pat}</mark>, part] : [part]))}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </ToolCard>
      );
    }
    case "edit": {
      const isNew = it.hunks[0]?.oldStart === 0;
      return (
        <ToolCard
          item={it}
          icon={it.deleted ? <I.Trash /> : <I.Edit />}
          name={isNew ? "Create" : it.deleted ? "Delete" : "Edit"}
          summary={it.path}
          meta={it.running ? "Editing..." : <DiffStat {...stats(it.hunks)} />}
        >
          <div className="tb-h">
            <span className="p">{it.path}</span>
            <span className="grow" />
            <button
              className="btn ghost"
              style={{ height: 24, fontSize: 12, padding: "0 8px" }}
              onClick={() => {
                app.ui.edit((d) => void (d.sessions.find((s) => s.id === session.id)!.diffFile = it.path));
                app.ui.togglePane("diff", true, ui.narrow());
              }}
            >
              <I.Diff />
              Open in diff
            </button>
          </div>
          <Diff hunks={it.hunks} lang={it.lang ?? "ts"} />
        </ToolCard>
      );
    }
    case "bash": {
      const meta = it.running ? (
        "Running..."
      ) : it.exit === 130 ? (
        <span className="exit bad">Interrupted</span>
      ) : it.exit === 0 ? (
        <><span className="exit ok"><I.Check />exit 0</span>{it.seconds ? ` ${it.seconds}s` : ""}</>
      ) : it.exit !== undefined ? (
        <><span className="exit bad"><I.X />exit {it.exit}</span>{it.seconds ? ` ${it.seconds}s` : ""}</>
      ) : null;
      return (
        <ToolCard item={it} icon={<I.Terminal />} name="Bash" summary={it.command} meta={meta}>
          <BashOutput command={it.command} output={it.output ?? ""} running={!!it.running} />
        </ToolCard>
      );
    }
    case "task":
      return (
        <ToolCard
          item={it}
          icon={<I.Bot />}
          name="Task"
          tag={<span className="agent-tag">{it.agent}</span>}
          summary={it.description}
          meta={it.running ? `${it.steps.length} steps...` : `${it.steps.length} steps · ${it.seconds ?? 0}s`}
        >
          <div className="task-steps">
            {it.steps.map((st, i) => (
              <div className="tool-head" key={i}>
                <span className="ti">{st.kind === "search" ? <I.Search /> : st.kind === "bash" ? <I.Terminal /> : <I.FileText />}</span>
                <span className="tn">{st.kind === "search" ? "Search" : st.kind === "bash" ? "Bash" : "Read"}</span>
                <span className="ts">{st.text}</span>
              </div>
            ))}
          </div>
          {it.result ? <div className="task-res"><b>Result:</b> {inlineMd(it.result)}</div> : null}
        </ToolCard>
      );
    case "todo": {
      const done = it.todos.filter((x) => x.status === "done").length;
      return (
        <div className="todo">
          <div className="th">
            <I.Todo />
            <span>Todos</span>
            <span className="grow" />
            <span className="prog">{done} of {it.todos.length}</span>
          </div>
          <div className="todo-bar"><i style={{ width: `${it.todos.length ? ((100 * done) / it.todos.length).toFixed(0) : 0}%` }} /></div>
          <ul>
            {it.todos.map((x, i) => (
              <li key={i} className={x.status}>
                <span className="cb" role="checkbox" aria-checked={x.status === "done"}>{x.status === "done" ? <I.Check /> : null}</span>
                <span className="tx">{x.text}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "permission":
      return <Permission item={it} session={session} />;
    case "plan":
      return (
        <div className={`plan${it.answer ? "" : " pending"}`}>
          <div className="plh"><I.Map /><span>Proposed plan</span></div>
          <div className="plb md"><Markdown text={it.text} /></div>
          {it.answer ? (
            <div className="pla">
              <div className="note-line" style={{ padding: 0 }}>
                {it.answer === "approve" ? (
                  <><span style={{ color: "var(--ok)", display: "inline-flex" }}><I.CheckC /></span><span>Approved · switched to Auto-accept edits</span></>
                ) : it.answer === "cancel" ? (
                  <><I.XC /><span>Cancelled</span></>
                ) : (
                  <><I.Pencil /><span>Kept planning</span></>
                )}
              </div>
            </div>
          ) : (
            <div className="pla">
              <button className="btn teal" onClick={() => app.ui.answer(session.id, it.id, "approve")}>Approve plan <kbd>1</kbd></button>
              <button className="btn" onClick={() => app.ui.answer(session.id, it.id, "keep")}>Keep planning <kbd>2</kbd></button>
              <span className="note">Approving switches to Auto-accept edits</span>
            </div>
          )}
        </div>
      );
    case "pr":
      return <PrCard item={it} session={session} />;
    case "note": {
      const Icon = { hand: I.Hand, undo: I.Undo, alert: I.Alert, check: I.CheckC }[it.icon ?? "alert"];
      return (
        <div className={`note-line${it.tone === "error" ? " err" : ""}`}>
          <Icon />
          <span>{inlineMd(it.text)}</span>
        </div>
      );
    }
    case "custom":
      return <>{ui.renderItem?.(it, session) ?? null}</>;
  }
}

function ToolCard({ item, icon, name, tag, summary, meta, children }: { item: Item; icon: ReactNode; name: string; tag?: ReactNode; summary: string; meta: ReactNode; children: ReactNode }) {
  const { app } = useUI();
  return (
    <div className={`tool${item.open ? " open" : ""}${item.running ? " tool-running" : ""}`}>
      <button className="tool-head" aria-expanded={!!item.open} onClick={() => toggle(app, item.id)}>
        <span className="ti">{item.running ? <span className="ring-spin" /> : icon}</span>
        <span className="tn">{name}</span>
        {tag}
        <span className="ts">{summary}</span>
        <span className="grow" />
        <span className="tm">{item.interrupted ? <span className="exit bad">Interrupted</span> : meta}</span>
        <I.ChevR className="chev" />
      </button>
      {item.open ? <div className="tool-body">{children}</div> : null}
    </div>
  );
}

export function CodeLines({ lines, start, lang }: { lines: string[]; start: number; lang: Lang }) {
  return (
    <div className="code-lines max-h scroll-thin">
      {lines.map((l, i) => (
        <div className="ln-row" key={i}>
          <span className="ln">{start + i}</span>
          <span className="lc">{highlight(l, lang)}</span>
        </div>
      ))}
    </div>
  );
}

/** A command's output, following new lines while it runs unless scrolled up. */
function BashOutput({ command, output, running }: { command: string; output: string; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && atEnd.current) el.scrollTop = el.scrollHeight;
  }, [output]);
  return (
    <div
      ref={ref}
      className="term-out scroll-thin"
      onScroll={(e) => {
        const el = e.currentTarget;
        atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
      }}
    >
      <span className="pr">$ </span>
      <span className="cmdline">{command}</span>
      {"\n"}
      <TermOutput text={output} />
      {running ? <span className="t-dim">▍</span> : null}
    </div>
  );
}

function Permission({ item: it, session }: { item: Extract<Item, { type: "permission" }>; session: SessionState }) {
  const { app } = useUI();
  const r = it.request;
  const bash = r.kind === "bash";
  const key = r.kind === "bash" ? commandKey(r.command) : "";
  if (it.answer) {
    const verb = it.answer === "deny" ? "Denied" : it.answer === "cancel" ? "Cancelled" : "Allowed";
    const ok = it.answer === "once" || it.answer === "always";
    return (
      <div className="perm answered">
        <div className="res">
          {ok ? <span className="ok"><I.CheckC /></span> : <span className="no"><I.XC /></span>}
          <span>
            {verb} {r.kind === "bash" ? <code>{r.command}</code> : <>edit to <code>{baseName(r.path)}</code></>}
            {it.answer === "always" ? (
              <span style={{ color: "var(--text-3)" }}> · {bash ? <>always allowing <code>{key}</code></> : "edits auto-accepted for this session"}</span>
            ) : null}
          </span>
        </div>
      </div>
    );
  }
  const answer = (a: "once" | "always" | "deny") => app.ui.answer(session.id, it.id, a);
  return (
    <div className="perm" role="alertdialog" aria-label="Permission request">
      <div className="ph">
        <span className="ic">{bash ? <I.Terminal /> : <I.Edit />}</span>
        <span>{r.kind === "bash" ? <>Claude wants to run <code>{key}</code></> : <>Claude wants to edit <code>{baseName(r.path)}</code></>}</span>
      </div>
      {r.kind === "bash" ? (
        <>
          <div className="pcmd"><span className="pr">$ </span>{r.command}</div>
          <div className="pdesc">{r.why ?? ""}</div>
        </>
      ) : (
        <>
          <div className="pdesc">{r.path} · <DiffStat {...stats(r.hunks)} /></div>
          <div className="pdiff scroll-thin"><Diff hunks={r.hunks} lang={r.lang ?? "ts"} /></div>
        </>
      )}
      <div className="acts">
        <button className="btn primary" onClick={() => answer("once")}>Allow once <kbd>1</kbd></button>
        <button className="btn" onClick={() => answer("always")}>
          {bash ? <>Always allow <code style={{ fontSize: 12 }}>{key}</code></> : "Allow all edits this session"} <kbd>2</kbd>
        </button>
        <button className="btn ghost" onClick={() => answer("deny")}>Deny <kbd>3</kbd></button>
      </div>
    </div>
  );
}

function PrCard({ item: it, session }: { item: Extract<Item, { type: "pr" }>; session: SessionState }) {
  const { app } = useUI();
  const checks = it.checks ?? [];
  const done = checks.filter((c) => c.done).length;
  const pass = checks.length > 0 && done === checks.length;
  const reviewers = (it.reviewers ?? []).map((id) => app.people[id]).filter(Boolean);
  const running = checks.length - done;
  return (
    <div className="prc">
      <div className="top">
        <span className="gh"><I.GitHub /></span>
        <div className="info">
          <div className="tt">{it.title} <span className="num">#{it.number}</span></div>
          <div className="meta">
            <span className={`open-badge${it.draft ? " draft" : ""}`}><I.Pr />{it.draft ? "Draft" : "Open"}</span>
            <code>{it.head}</code>
            <span>into</span>
            <code>{it.base}</code>
            {reviewers.length ? (
              <span className="revs" style={{ marginLeft: 4 }}>
                {reviewers.map((p) => <Avatar key={p.id} photo={p.photo} name={p.name} size={20} />)}
              </span>
            ) : null}
          </div>
        </div>
        <button className="btn" style={{ height: 28, fontSize: 12 }} onClick={() => app.ui.emit({ type: "action", label: "View PR", sessionId: session.id })}>
          <I.Ext />
          View
        </button>
      </div>
      {checks.length ? (
        <>
          <div className="checks">
            {checks.map((c) => (
              <div className="chk" key={c.name}>
                <span className={`ci${c.done ? " pass" : ""}`}>{c.done ? <I.CheckC /> : <span className="ring-spin" style={{ width: 12, height: 12 }} />}</span>
                <span>{c.name}</span>
                <span className="dur">{c.done ? c.duration : "In progress"}</span>
              </div>
            ))}
          </div>
          <div className={`sum${pass ? " pass" : ""}`}>
            {pass ? <><I.CheckC /><span>All checks have passed</span></> : <><span className="ring-spin" /><span>{running} check{running === 1 ? "" : "s"} running</span></>}
            <span className="grow" />
            {reviewers.length ? (
              <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: 12 }}>Review requested from {reviewers.map((p) => p.name.split(" ")[0]).join(", ")}</span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
