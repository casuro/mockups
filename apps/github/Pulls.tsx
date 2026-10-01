import type { ReactNode } from "react";
import { Label, useUI } from "./context";
import { ago } from "./format";
import * as I from "./icons";
import { approved, checksOf, rollup } from "./use-github";

// The pull request list: Open and Closed, and a row per pull request with
// its labels, the state of its checks and how many comments it has.

export function Pulls() {
  const { github } = useUI();
  const { state, seed, ui } = github;
  const open = state.pulls.filter((p) => p.state === "open").length;
  const filter = (id: "open" | "closed", icon: ReactNode, n: number, name: string) => (
    <button className={state.pullFilter === id ? "on" : ""} aria-pressed={state.pullFilter === id} onClick={() => ui.setFilter(id)}>{icon}{n} {name}</button>
  );
  return (
    <div className="container">
      <div className="box">
        <div className="box-h">
          {filter("open", <I.Pull />, open, "Open")}
          {filter("closed", <I.Check />, state.pulls.length - open, "Closed")}
        </div>
        <div>
          {state.pulls.filter((p) => (state.pullFilter === "open") === (p.state === "open")).map((p) => {
            const checks = rollup(checksOf(state, seed, p).map((c) => c.status));
            const comments = p.timeline.filter((t) => t.type === "comment").length;
            const go = () => ui.go({ page: "pull", pull: p.number });
            return (
              <div key={p.number} className="pr-row" role="link" tabIndex={0} aria-label={`#${p.number}: ${p.title}`} onClick={go} onKeyDown={(e) => e.key === "Enter" && go()}>
                {p.state === "open" ? <I.Pull className="open" /> : <I.Merge className="merged" />}
                <div className="grow">
                  <b>{p.title}</b>
                  {p.labels.map((l) => <Label key={l} name={l} />)}
                  {checks ? <I.StatusIcon status={checks} /> : null}
                  <div className="sub">
                    #{p.number} {p.state === "open" ? `opened ${ago(p.at)} by ${p.author} · ${approved(p) ? "Approved" : "Review required"}` : `by ${p.author} was merged ${ago(p.mergedAt ?? p.at)}`}
                  </div>
                </div>
                {comments ? <span className="rt"><I.Comment />{comments}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
