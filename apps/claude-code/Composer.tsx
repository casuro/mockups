import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { useUI } from "./context";
import { fmtK, MOD } from "./format";
import * as I from "./icons";
import type { PermissionMode, SessionState } from "./types";
import { MODES, pendingOf } from "./use-claude-code";

// Writing to Claude: the composer (the big one on the new-session screen
// and the one under a transcript), with attachments, the permission-mode
// and model pickers and send or stop; plus the run status line and the
// queue of messages waiting for Claude.

export const ModeIcon = ({ mode }: { mode: PermissionMode }) => (mode === "auto" ? <I.Zap /> : mode === "plan" ? <I.Map /> : <I.Hand />);

interface ComposerProps {
  big?: boolean;
  textarea: RefObject<HTMLTextAreaElement | null>;
  value: string;
  placeholder: string;
  model: string;
  mode: PermissionMode;
  attachments: string[];
  /** Claude is running: the send button becomes stop. */
  running?: boolean;
  onSend: () => void;
}

export function Composer({ big = false, textarea, value, placeholder, model, mode, attachments, running = false, onSend }: ComposerProps) {
  const { app, openMenu, menuAnchor } = useUI();
  const inSession = !!app.state.active;
  const m = MODES.find((x) => x.id === mode) ?? MODES[0];
  const modelName = (app.models.find((x) => x.id === model) ?? app.models[0]).name;

  // Under a transcript it grows with what is typed, up to 240px.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el || big) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value, big, textarea]);

  const setAttachments = (fn: (list: string[]) => void) =>
    app.ui.edit((d) => {
      const s = d.active ? d.sessions.find((x) => x.id === d.active) : null;
      fn(s ? s.attachments : d.draft.attachments);
    });

  const attach = (btn: HTMLElement) =>
    openMenu(
      btn,
      [
        { label: "Upload a file", icon: <I.File />, desc: "Images, logs, PDFs", run: () => app.ui.emit({ type: "attach", sessionId: app.state.active, kind: "file" }) },
        { label: "Add a screenshot", icon: <I.Monitor />, run: () => app.ui.emit({ type: "attach", sessionId: app.state.active, kind: "screenshot" }) },
        {
          label: "Mention a file in the repo",
          icon: <I.At />,
          kbd: "@",
          run: () => {
            app.ui.setDraft(value + (value && !/\s$/.test(value) ? " " : "") + "@");
            textarea.current?.focus();
          },
        },
      ],
      { above: inSession, width: 250 }
    );

  const pickMode = (btn: HTMLElement) =>
    openMenu(
      btn,
      [
        { header: "Permission mode" },
        ...MODES.map((x) => ({ label: x.name, desc: x.desc, icon: <ModeIcon mode={x.id} />, checked: x.id === mode, run: () => app.ui.setMode(x.id) })),
      ],
      { width: 300, above: inSession }
    );

  const pickModel = (btn: HTMLElement) =>
    openMenu(
      btn,
      [{ header: "Model" }, ...app.models.map((x) => ({ label: x.name, desc: x.desc, checked: x.id === model, run: () => app.ui.setModel(x.id) }))],
      { width: 290, above: inSession, alignRight: true }
    );

  const isOpen = (kind: string) => !!menuAnchor && menuAnchor.dataset.picker === kind;
  const ready = !!value.trim();

  return (
    <div className={`composer${big ? " big" : ""}`}>
      <div className="attachments">
        {attachments.map((a, i) => (
          <span className="att" key={`${a}${i}`}>
            <I.File />
            <span>{a}</span>
            <button className="icon-btn sm" aria-label={`Remove ${a}`} onClick={() => setAttachments((list) => void list.splice(i, 1))}>
              <I.X />
            </button>
          </span>
        ))}
      </div>
      <textarea
        ref={textarea}
        rows={big ? 3 : 1}
        value={value}
        placeholder={placeholder}
        aria-label={big ? "Prompt" : "Message Claude"}
        onChange={(e) => app.ui.setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && ((!e.shiftKey && !e.nativeEvent.isComposing) || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <div className="tools">
        <button className={`c-btn${isOpen("attach") ? " open" : ""}`} data-picker="attach" data-tip="Attach files" aria-label="Attach" onClick={(e) => attach(e.currentTarget)}>
          <I.Clip />
        </button>
        <button className={`c-btn mode-${mode}${isOpen("mode") ? " open" : ""}`} data-picker="mode" aria-label={`Permission mode: ${m.name}`} onClick={(e) => pickMode(e.currentTarget)}>
          <ModeIcon mode={mode} />
          <span className="lbl">{m.short}</span>
          <I.ChevD className="chev" />
        </button>
        <span className="grow" />
        <button className={`c-btn${isOpen("model") ? " open" : ""}`} data-picker="model" aria-label={`Model: ${modelName}`} onClick={(e) => pickModel(e.currentTarget)}>
          <span>{modelName}</span>
          <I.ChevD className="chev" />
        </button>
        {running ? (
          <button className="send stop" aria-label="Stop" data-tip="Stop" data-kbd="Esc" onClick={() => app.state.active && app.ui.stop(app.state.active)}>
            <I.Stop />
          </button>
        ) : big ? (
          <button className="send" aria-label="Start session" data-tip="Start session" data-kbd={`${MOD} ↵`} disabled={!ready} onClick={onSend}>
            <I.Up />
          </button>
        ) : (
          <button className="send" aria-label="Send" data-tip="Send" data-kbd="↵" disabled={!ready} onClick={onSend}>
            <I.Up />
          </button>
        )}
      </div>
    </div>
  );
}

/** "Clauding... (12s · 3.4k tokens · esc to interrupt)", or waiting on the person. */
export function RunStatus({ session: s }: { session: SessionState }) {
  const [, tick] = useState(0);
  const running = s.status === "running" && !!s.run;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (running && s.run) {
    const secs = Math.round((Date.now() - s.run.startedAt) / 1000);
    return (
      <div className="run-status">
        <I.ClaudeMark current className="star" />
        <span className="verb">{s.run.verb}...</span>
        <span className="meta">({secs}s · {fmtK(s.run.tokens)} tokens · esc to interrupt)</span>
      </div>
    );
  }
  if (s.status === "input")
    return (
      <div className="run-status waiting">
        <I.ClaudeMark current className="star" />
        <span className="verb">Waiting for you</span>
        <span className="meta">· answer the {pendingOf(s)?.type === "plan" ? "plan" : "permission prompt"} above to continue</span>
      </div>
    );
  return null;
}

export function Queue({ session: s }: { session: SessionState }) {
  const { app } = useUI();
  return (
    <div className="queue">
      {s.queue.map((q, i) => (
        <div className="queued" key={i}>
          <span className="lab">Queued</span>
          <span className="q">{q}</span>
          <button
            className="icon-btn sm"
            aria-label="Remove queued message"
            data-tip="Remove"
            onClick={() => app.ui.edit((d) => void d.sessions.find((x) => x.id === s.id)!.queue.splice(i, 1))}
          >
            <I.X />
          </button>
        </div>
      ))}
    </div>
  );
}
