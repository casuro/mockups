import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useUI } from "./context";
import { Diff, SplitDiff } from "./Diff";
import { baseName, DiffStat, stats, TermOutput } from "./format";
import * as I from "./icons";
import type { Pane, SessionState } from "./types";

// The side panes next to the transcript: the Diff pane (changed files,
// unified or split, line comments, revert), the Terminal and the Preview.
// On a wide box they sit beside the transcript with a drag handle; on a
// tablet-sized one they float over it; on a phone they fill the screen.

function PaneHead({ id, title, icon, dark = false, children }: { id: Pane; title: string; icon: ReactNode; dark?: boolean; children?: ReactNode }) {
  const { app } = useUI();
  const close = () => app.ui.togglePane(id, false);
  return (
    <div className={`pane-h${dark ? " dark" : ""}`}>
      <button className="icon-btn sm back" aria-label="Back to transcript" onClick={close}><I.Back /></button>
      <span className="pt">{icon}{title}</span>
      {children}
      <span className="grow" />
      <button className="icon-btn sm close-x" aria-label={`Close ${title}`} data-tip="Close" onClick={close}><I.X /></button>
    </div>
  );
}

export function Panes({ s }: { s: SessionState }) {
  const { app } = useUI();
  const { panes, paneWidth } = app.state;
  const section = useRef<HTMLElement>(null);
  if (!panes.diff && !panes.terminal && !panes.preview) return null;

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const handle = e.currentTarget;
    const body = handle.parentElement!;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("drag");
    body.style.cursor = "col-resize";
    body.style.userSelect = "none";
    let width = paneWidth;
    const move = (ev: PointerEvent) => {
      const rect = body.getBoundingClientRect();
      width = Math.round(Math.max(340, Math.min(rect.width - 380, rect.right - ev.clientX)));
      section.current?.style.setProperty("--pane-w", `${width}px`);
    };
    const up = () => {
      handle.classList.remove("drag");
      body.style.cursor = "";
      body.style.userSelect = "";
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      app.ui.edit((d) => void (d.paneWidth = width));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };

  return (
    <>
      <div className="resizer" role="separator" aria-orientation="vertical" aria-label="Resize panes" onPointerDown={startResize} />
      <div className="sheet-scrim" onClick={app.ui.closePanes} />
      <section ref={section} className="panes" style={{ "--pane-w": `${paneWidth}px` } as CSSProperties}>
        {panes.preview ? <PreviewPane s={s} /> : null}
        {panes.diff ? <DiffPane s={s} /> : null}
        {panes.terminal ? <TerminalPane s={s} /> : null}
      </section>
    </>
  );
}

// ---------- Diff ----------

function DiffPane({ s }: { s: SessionState }) {
  const { app } = useUI();
  const [composing, setComposing] = useState<{ path: string; key: string } | null>(null);
  const view = app.state.diffView;
  if (!s.changes.length)
    return (
      <div className="pane">
        <PaneHead id="diff" title="Changes" icon={<I.Diff />} />
        <div className="pane-empty">
          <div><I.Diff />No changes yet.<br />Edits Claude makes will show up here.</div>
        </div>
      </div>
    );
  const f = s.changes.find((c) => c.path === s.diffFile) ?? s.changes[0];
  const total = s.changes.reduce((acc, c) => {
    const x = stats(c.hunks);
    return { a: acc.a + x.a, d: acc.d + x.d };
  }, { a: 0, d: 0 });
  const dirs = new Map<string, typeof s.changes>();
  for (const c of s.changes) {
    const d = c.path.includes("/") ? c.path.slice(0, c.path.lastIndexOf("/")) : ".";
    dirs.set(d, [...(dirs.get(d) ?? []), c]);
  }
  const setFile = (path: string) => {
    setComposing(null);
    app.ui.edit((d) => void (d.sessions.find((x) => x.id === s.id)!.diffFile = path));
  };
  const setView = (v: "unified" | "split") => {
    setComposing(null);
    app.ui.edit((d) => void (d.diffView = v));
  };
  return (
    <div className="pane">
      <PaneHead id="diff" title="Changes" icon={<I.Diff />}><DiffStat {...total} /></PaneHead>
      <div className="pane-b diff-pane-b">
        <nav className="ftree scroll-thin" aria-label="Changed files">
          <div className="tot"><span>{s.changes.length} file{s.changes.length > 1 ? "s" : ""} changed</span></div>
          {[...dirs.keys()].sort().map((d) => (
            <div key={d}>
              <div className="dir"><I.Folder /><span>{d}</span></div>
              {dirs.get(d)!.map((c) => (
                <button key={c.path} className={`f${c.path === f.path ? " on" : ""}`} title={c.path} onClick={() => setFile(c.path)}>
                  <span className={`stt ${c.status}`}>{c.status}</span>
                  <span className="nm">{baseName(c.path)}</span>
                  <DiffStat {...stats(c.hunks)} />
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="dview">
          <div className="dview-h">
            <span className="p" title={f.path}>{f.path}</span>
            <div className="seg" role="radiogroup" aria-label="Diff layout">
              <button className={view === "unified" ? "on" : ""} role="radio" aria-checked={view === "unified"} onClick={() => setView("unified")}>Unified</button>
              <button className={view === "split" ? "on" : ""} role="radio" aria-checked={view === "split"} onClick={() => setView("split")}>Split</button>
            </div>
            <button className="btn" data-tip="Discard changes to this file" onClick={() => app.ui.revert(s.id, f.path)}>
              <I.Undo />
              <span className="rv-lbl">Revert file</span>
            </button>
          </div>
          <div className="dview-b scroll-thin">
            {view === "split" ? (
              <SplitDiff hunks={f.hunks} lang={f.lang} />
            ) : (
              <Diff
                hunks={f.hunks}
                lang={f.lang}
                commenting={{
                  comments: s.comments[f.path] ?? {},
                  composing: composing?.path === f.path ? composing.key : null,
                  onCompose: (key) => setComposing(key ? { path: f.path, key } : null),
                  onSave: (key, line, text) => {
                    setComposing(null);
                    app.ui.comment(s.id, f.path, key, line, text);
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Terminal ----------

export function repoPath(app: ReturnType<typeof useUI>["app"], s: SessionState) {
  const local = app.seed.repos[s.repo]?.path ?? `~/${s.repo.split("/").pop()}`;
  const dir = baseName(local);
  return { dir, cwd: s.env === "cloud" ? `/workspace/${dir}` : local };
}

function TerminalPane({ s }: { s: SessionState }) {
  const ui = useUI();
  const { app } = ui;
  const { dir, cwd } = repoPath(app, s);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const hist = useRef<number | null>(null);
  const [banner] = useState(() => app.seed.terminalBanner ?? `Last login: ${new Date(Date.now() - 3 * 3600e3).toDateString()} on ttys004`);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  useLayoutEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [s.terminal]);
  const prompt = (
    <>
      <span className="ps-path">{cwd}</span> <span className="ps-br">({s.branch})</span> ${" "}
    </>
  );
  const clear = () => app.ui.runInTerminal(s.id, "clear");
  return (
    <div className="pane">
      <PaneHead id="terminal" title="Terminal" icon={<I.Terminal />} dark>
        <span className="ttab">{s.env === "cloud" ? "cloud" : "zsh"} · {dir}</span>
        <button className="icon-btn sm" data-tip="Clear" aria-label="Clear terminal" onClick={clear}><I.Trash /></button>
      </PaneHead>
      <div className="pane-b">
        {ui.renderTerminal ? (
          ui.renderTerminal(s)
        ) : (
          <div
            ref={box}
            className="term scroll-thin"
            onClick={() => {
              if (!getSelection()?.toString()) input.current?.focus();
            }}
          >
            <div className="ln banner">{banner}</div>
            {s.terminal.map((e, i) => (
              <div key={i}>
                <div className="ln">{prompt}{e.command}</div>
                {e.output ? <div className="ln"><TermOutput text={e.output} /></div> : null}
              </div>
            ))}
            <div className="in-row">
              {prompt}
              <input
                ref={input}
                autoComplete="off"
                spellCheck={false}
                aria-label="Terminal input"
                onKeyDown={(e) => {
                  const t = e.currentTarget;
                  const past = s.terminal.map((x) => x.command);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    hist.current = null;
                    const v = t.value;
                    t.value = "";
                    app.ui.runInTerminal(s.id, v);
                  } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    if (!past.length) return;
                    const at = hist.current ?? past.length;
                    hist.current = Math.max(0, Math.min(past.length, at + (e.key === "ArrowUp" ? -1 : 1)));
                    t.value = past[hist.current] ?? "";
                  } else if (e.key === "l" && e.ctrlKey) {
                    e.preventDefault();
                    clear();
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Preview ----------

function PreviewPane({ s }: { s: SessionState }) {
  const ui = useUI();
  const { app } = ui;
  const url = app.seed.repos[s.repo]?.previewUrl ?? "localhost:3000/";
  const device = app.state.previewDevice;
  const [load, setLoad] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const reload = () => {
    setLoad("loading");
    app.ui.emit({ type: "preview", sessionId: s.id, action: "reload", url });
    timers.current.push(
      setTimeout(() => setLoad("done"), 650),
      setTimeout(() => setLoad("idle"), 900)
    );
  };
  const devices = [
    ["desktop", "Desktop", <I.Monitor key="d" />],
    ["tablet", "Tablet", <I.Tablet key="t" />],
    ["mobile", "Mobile", <I.Phone key="m" />],
  ] as const;
  return (
    <div className="pane">
      <PaneHead id="preview" title="Preview" icon={<I.Globe />} />
      <div className="pane-b">
        <div className="pv">
          <div className="pv-bar">
            <button className="icon-btn sm" data-tip="Reload" aria-label="Reload" onClick={reload}><I.Refresh /></button>
            <label className="pv-url">
              <I.Lock />
              <input key={url} defaultValue={url} aria-label="Preview URL" spellCheck={false} />
            </label>
            <div className="seg" role="radiogroup" aria-label="Device width">
              {devices.map(([id, label, icon]) => (
                <button
                  key={id}
                  className={device === id ? "on" : ""}
                  role="radio"
                  aria-checked={device === id}
                  data-tip={label}
                  aria-label={`${label} width`}
                  onClick={() => app.ui.edit((d) => void (d.previewDevice = id))}
                >
                  {icon}
                </button>
              ))}
            </div>
            <button className="icon-btn sm" data-tip="Open in browser" aria-label="Open in browser" onClick={() => app.ui.emit({ type: "preview", sessionId: s.id, action: "open", url })}>
              <I.Ext />
            </button>
          </div>
          <div className="pv-load" style={{ width: load === "loading" ? "70%" : load === "done" ? "100%" : 0 }} />
          <div className="pv-stage scroll-thin">
            <div className={`pv-frame${device !== "desktop" ? ` w-${device}` : ""}${load === "loading" ? " loading" : ""}`}>
              {ui.renderPreview?.(s) ?? (
                <div className="pane-empty">
                  <div><I.Globe />Nothing to preview yet.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
