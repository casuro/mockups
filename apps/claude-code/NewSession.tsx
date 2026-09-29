import { useEffect } from "react";
import { Composer } from "./Composer";
import { useUI } from "./context";
import * as I from "./icons";

// The new-session screen: pick a repository, branch and environment,
// describe the task (or pick a suggestion), and start.

export function NewSession() {
  const { app, openMenu, menuAnchor, composer, setDrawer } = useUI();
  const n = app.state.draft;
  const first = app.seed.me.name.trim().split(/\s+/)[0];
  const repo = app.seed.repos[n.repo];
  const path = repo?.path ?? `~/${n.repo.split("/").pop()}`;
  const isOpen = (kind: string) => !!menuAnchor && menuAnchor.dataset.picker === kind;

  // Ready to type, on a device with a pointer (a phone keyboard would cover the screen).
  useEffect(() => {
    if (matchMedia("(hover: hover)").matches) composer.current?.focus({ preventScroll: true });
  }, [composer, n.repo, n.branch, n.env]);

  const pickRepo = (btn: HTMLElement) =>
    openMenu(
      btn,
      [{ header: "Repository" }, ...Object.keys(app.seed.repos).map((r) => ({ label: r, icon: <I.Repo />, checked: n.repo === r, run: () => app.ui.setChoice({ repo: r }) }))],
      { width: 240 }
    );
  const pickBranch = (btn: HTMLElement) =>
    openMenu(
      btn,
      [{ header: "Base branch" }, ...(repo?.branches ?? ["main"]).map((b) => ({ label: b, icon: <I.Branch />, checked: n.branch === b, run: () => app.ui.setChoice({ branch: b }) }))],
      { width: 260 }
    );

  return (
    <div className="ns scroll-thin">
      <div className="top-bar">
        <button className="icon-btn menu-btn" aria-label="Open sessions" onClick={() => setDrawer(true)}><I.Menu /></button>
        <span className="grow" />
      </div>
      <div className="ns-inner">
        <div className="ns-hero">
          <I.ClaudeMark />
          <h1>What should we build, {first}?</h1>
        </div>
        <div className="ns-pickers">
          <button className={`pill${isOpen("repo") ? " open" : ""}`} data-picker="repo" aria-label="Repository" onClick={(e) => pickRepo(e.currentTarget)}>
            <I.Repo />
            <span className="v">{n.repo}</span>
            <I.ChevD className="chev" />
          </button>
          <button className={`pill${isOpen("branch") ? " open" : ""}`} data-picker="branch" aria-label="Branch" onClick={(e) => pickBranch(e.currentTarget)}>
            <I.Branch />
            <span className="v">{n.branch}</span>
            <I.ChevD className="chev" />
          </button>
          <span style={{ flex: 1 }} />
          <div className="seg" role="radiogroup" aria-label="Environment">
            <button role="radio" aria-checked={n.env === "local"} className={n.env === "local" ? "on" : ""} onClick={() => app.ui.setChoice({ env: "local" })}>
              <I.Laptop />Local
            </button>
            <button role="radio" aria-checked={n.env === "cloud"} className={n.env === "cloud" ? "on" : ""} onClick={() => app.ui.setChoice({ env: "cloud" })}>
              <I.Cloud />Cloud
            </button>
          </div>
        </div>
        <Composer
          big
          textarea={composer}
          value={n.text}
          placeholder={`Describe a task, paste an error, or ask about ${n.repo}`}
          model={n.model}
          mode={n.mode}
          attachments={n.attachments}
          onSend={app.ui.start}
        />
        {app.seed.examples?.length ? (
          <div className="ns-chips">
            {app.seed.examples.map((ex) => (
              <button
                key={ex.text}
                className="chip"
                onClick={() => {
                  app.ui.setChoice({ repo: ex.repo, text: ex.text });
                  requestAnimationFrame(() => {
                    const ta = composer.current;
                    if (!ta) return;
                    ta.focus();
                    ta.setSelectionRange(ta.value.length, ta.value.length);
                  });
                }}
              >
                <I.Sparkle />
                <span>{ex.text}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="ns-foot">
          {n.env === "local" ? (
            <><I.Laptop /><span>Runs on this Mac in <code>{path}</code></span></>
          ) : (
            <><I.Cloud /><span>Runs in an isolated cloud environment and pushes to a new branch</span></>
          )}
        </div>
      </div>
    </div>
  );
}
