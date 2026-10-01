import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Actions } from "./Actions";
import { GitHubContext, useUI } from "./context";
import { Header } from "./Header";
import { Pull } from "./Pull";
import { Pulls } from "./Pulls";
import { Run } from "./Run";
import type { GitHubRepository } from "./use-github";
import "./github.css";

// A GitHub repository's pull requests and Actions, as in apps/github.html.
// Give it a repository from useGitHub(); it fills the box it is put in (give
// that box a height), whether that is the whole screen or one pane of it,
// and narrows to the phone layout when the box is narrow.

export interface GitHubProps {
  github: GitHubRepository;
  className?: string;
  style?: CSSProperties;
}

export function GitHub({ github, className, style }: GitHubProps) {
  const [menu, setMenu] = useState(false);
  const [, tick] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const { view, theme } = github.state;

  // "5 minutes ago" keeps moving.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // The user menu closes on Esc (when focus is in the kit or nowhere) and on a press anywhere else, the page around the kit included.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      const at = document.activeElement;
      if (e.key === "Escape" && (!at || at === document.body || root.current?.contains(at))) setMenu(false);
    };
    const down = (e: PointerEvent) => {
      const inside = (sel: string) => root.current?.querySelector(sel)?.contains(e.target as Node);
      if (!inside(".me-pop") && !inside(".me-btn")) setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", down);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", down);
    };
  }, [menu]);

  return (
    <GitHubContext.Provider value={{ github, menu, setMenu }}>
      <div ref={root} className={`kit-github${className ? ` ${className}` : ""}`} style={style} data-theme={theme}>
        <div className="app">
          <Header />
          {/* A new page starts at the top. */}
          <main key={[view.page, view.pull, view.tab, view.run, view.workflow].join()} className={`main${view.page === "run" ? " fixed" : ""}`}>
            {view.page === "pull" ? <Pull /> : view.page === "actions" ? <Actions /> : view.page === "run" ? <Run /> : <Pulls />}
          </main>
          <Toast />
        </div>
      </div>
    </GitHubContext.Provider>
  );
}

function Toast() {
  const { github } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!github.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2400);
    return () => clearTimeout(t);
  }, [github.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {github.notice?.text ?? ""}
    </div>
  );
}
