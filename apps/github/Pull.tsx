import type { ComponentType } from "react";
import { Avatar, Branch, Label, useUI } from "./context";
import { ago, diffRows, dur, Inline, Markdown } from "./format";
import * as I from "./icons";
import type { GitHubCheckRow, GitHubDiffFile, GitHubPull, GitHubTimelineEntry, TimelineIcon } from "./types";
import { approved, checksOf, commitStatus, mergeable, rollup } from "./use-github";

// A pull request: its title and state, the Conversation (description,
// timeline, the merge box with its checks, the comment box, reviewers and
// labels beside it) and Files changed (unified diffs).

const ICON: Record<TimelineIcon, ComponentType> = { eye: I.Eye, check: I.Check, merge: I.Merge, commit: I.Commit, comment: I.Comment, sync: I.Sync, x: I.X };

export function Pull() {
  const { github } = useUI();
  const { state, ui } = github;
  const pr = state.pulls.find((p) => p.number === state.view.pull);
  if (!pr) return null;
  const tab = state.view.tab;
  const tabButton = (id: "conversation" | "files", Icon: ComponentType, name: string, n: number) => (
    <button className={`tab${tab === id ? " on" : ""}`} role="tab" aria-selected={tab === id} onClick={() => ui.go({ page: "pull", pull: pr.number, tab: id })}>
      <span><Icon />{name}<span className="counter">{n}</span></span>
    </button>
  );
  return (
    <div className="container">
      <h1 className="pr-title">{pr.title} <span>#{pr.number}</span></h1>
      <div className="pr-meta">
        <span className={`state ${pr.state}`}>{pr.state === "open" ? <I.Pull /> : <I.Merge />}{pr.state === "open" ? "Open" : "Merged"}</span>
        <span><b>{pr.state === "open" ? pr.author : pr.mergedBy}</b> {pr.state === "open" ? "wants to merge" : "merged"} into <Branch name={pr.base} /> from <Branch name={pr.branch} /></span>
      </div>
      <div className="pr-tabs" role="tablist">
        {tabButton("conversation", I.Comment, "Conversation", pr.timeline.filter((t) => t.type === "comment").length)}
        {tabButton("files", I.Code, "Files changed", pr.files.length)}
        <span className="grow" />
        <Diffstat files={pr.files} />
      </div>
      {tab === "files" ? <Files pr={pr} /> : <Conversation pr={pr} />}
    </div>
  );
}

function Diffstat({ files }: { files: GitHubDiffFile[] }) {
  const rows = files.flatMap((f) => diffRows(f.diff));
  return (
    <span className="diffstat">
      <span className="a">+{rows.filter((r) => r.type === "add").length}</span> <span className="d">−{rows.filter((r) => r.type === "del").length}</span>
    </span>
  );
}

function Files({ pr }: { pr: GitHubPull }) {
  if (!pr.files.length) return <p>No files to show.</p>;
  return (
    <>
      {pr.files.map((f) => (
        <div key={f.path} className="box diff">
          <div className="diff-h"><span className="grow">{f.path}</span><Diffstat files={[f]} /></div>
          <div className="diff-body">
            <table>
              <tbody>
                {diffRows(f.diff).map((r, i) =>
                  r.type === "hunk" ? (
                    <tr key={i} className="hunk"><td className="n" colSpan={2} /><td>{r.text}</td></tr>
                  ) : (
                    <tr key={i} className={r.type}><td className="n">{r.o}</td><td className="n">{r.n}</td><td>{r.text}</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

function Comment({ pr, by, at, text }: { pr: GitHubPull; by: string; at: number; text: string }) {
  const { github } = useUI();
  return (
    <div className="tl-item">
      <Avatar id={by} size="s40" />
      <div className={`comment${by === github.me ? " mine" : ""}`}>
        <div className="comment-h"><b>{by}</b> commented {ago(at)}<span className="grow" />{by === pr.author ? <span className="pill">Author</span> : null}</div>
        <div className="comment-b"><Markdown text={text} /></div>
      </div>
    </div>
  );
}

function TimelineItem({ pr, entry: t }: { pr: GitHubPull; entry: GitHubTimelineEntry }) {
  const { github } = useUI();
  if (t.type === "comment") return <Comment pr={pr} by={t.by} at={t.at} text={t.text} />;
  if (t.type === "commit") {
    const status = t.sha ? commitStatus(github.state, t.sha) : null;
    return (
      <div className="ev commit">
        <span className="dot plain"><I.Commit /></span>
        <div className="body"><Avatar id={t.by} /><span className="msg">{t.text}</span>{status ? <I.StatusIcon status={status} /> : null}<span className="sha">{t.sha}</span></div>
      </div>
    );
  }
  const Icon = ICON[t.icon ?? "commit"];
  return (
    <div className="ev">
      <span className={`dot ${t.color ?? ""}`}><Icon /></span>
      <div className="body"><Avatar id={t.by} /> <b>{t.by}</b> <Inline text={t.text} /> {ago(t.at)}</div>
    </div>
  );
}

const checkText = (c: GitHubCheckRow) =>
  c.text ?? (c.status === "success" ? `Successful in ${dur(c.secs ?? 0)}` : c.status === "failure" ? `Failing after ${dur(c.secs ?? 0)}` : c.status === "cancelled" ? "Cancelled" : c.status === "queued" ? "Queued" : "In progress");

function MergeBox({ pr }: { pr: GitHubPull }) {
  const { github } = useUI();
  const { state, seed, me, ui } = github;
  if (pr.state === "merged")
    return (
      <div className="mergebox merged">
        <div className="mb-sec">
          <span className="i purple"><I.Merge /></span>
          <div className="grow"><h4>Pull request successfully merged and closed</h4><p>The <Branch name={pr.branch} /> branch can be safely deleted.</p></div>
        </div>
      </div>
    );
  const checks = checksOf(state, seed, pr);
  const all = rollup(checks.map((c) => c.status));
  const ok = approved(pr);
  const can = mergeable(state, seed, pr);
  const head = all === "failure" ? "Some checks were not successful" : all === "cancelled" ? "Some checks were cancelled" : all === "success" ? "All checks have passed" : "Some checks haven't completed yet";
  return (
    <div className={`mergebox${can ? " ok" : ""}`}>
      <div className="mb-sec">
        <span className={`i ${ok ? "ok" : "bad"}`}>{ok ? <I.Check /> : <I.X />}</span>
        <div className="grow">
          <h4>{ok ? "Changes approved" : "Review required"}</h4>
          <p>{ok ? "1 approving review by a reviewer with write access." : "At least 1 approving review is required by reviewers with write access."}</p>
        </div>
        {!ok && pr.author !== me ? <button className="btn" onClick={ui.approvePull}><I.Check />Approve</button> : null}
      </div>
      {all ? (
        <>
          <div className="mb-sec">
            {all === "success" ? <span className="i ok"><I.Check /></span> : all === "failure" ? <span className="i bad"><I.X /></span> : <span className="i"><I.StatusIcon status={all} large /></span>}
            <div className="grow"><h4>{head}</h4><p>{checks.filter((c) => c.status === "success").length} of {checks.length} checks successful</p></div>
          </div>
          <div className="checks">
            {checks.map((c) => (
              <div key={c.name} className="check">
                <I.StatusIcon status={c.status} />
                <span className="nm"><b>{c.name}</b> {checkText(c)}</span>
                {c.run != null ? <button className="link" aria-label={`Details of ${c.name}`} onClick={() => ui.go({ page: "run", run: c.run!, job: c.job })}>Details</button> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
      <div className="mb-sec mb-foot">
        <button className="btn primary" disabled={!can} onClick={ui.mergePull}>Merge pull request</button>
        <p>{can ? "This branch has no conflicts with the base branch." : `Merging is blocked: ${ok ? "every check has to pass" : "an approving review is required"}.`}</p>
      </div>
    </div>
  );
}

const REVIEWER = { approved: [I.Check, "green"], requested: [I.Issue, "amber"], commented: [I.Comment, "muted"] } as const;

function Conversation({ pr }: { pr: GitHubPull }) {
  const { github } = useUI();
  const { state, me, ui } = github;
  const reviewers = Object.entries(pr.reviewers);
  return (
    <div className="pr-grid">
      <div className="tl">
        <Comment pr={pr} by={pr.author} at={pr.at} text={pr.body} />
        {pr.timeline.map((t) => <TimelineItem key={t.id} pr={pr} entry={t} />)}
        <div className="tl-end">
          <MergeBox pr={pr} />
          <div className="tl-item composer">
            <Avatar id={me} size="s40" />
            <h4>Add a comment</h4>
            <div className="box">
              <textarea
                rows={4}
                aria-label="Add a comment"
                placeholder="Use Markdown to format your comment"
                value={state.drafts[pr.number] ?? ""}
                onChange={(e) => ui.setDraft(pr.number, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
                  e.preventDefault();
                  ui.postComment();
                }}
              />
              <button className="btn primary" onClick={ui.postComment}>Comment</button>
            </div>
          </div>
        </div>
      </div>
      <aside>
        <div className="side-sec">
          <h4>Reviewers</h4>
          {reviewers.length ? reviewers.map(([id, s]) => {
            const [Icon, color] = REVIEWER[s];
            return <div key={id} className="p"><Avatar id={id} /><span className="grow">{id}</span><span title={s} style={{ color: `var(--${color})` }}><Icon /></span></div>;
          }) : "None yet"}
        </div>
        <div className="side-sec">
          <h4>Labels</h4>
          {pr.labels.length ? pr.labels.map((l) => <Label key={l} name={l} />) : "None yet"}
        </div>
      </aside>
    </div>
  );
}
