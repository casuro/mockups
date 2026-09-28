import { useEffect, useState } from "react";
import { CandidateAvatar, StaffAvatar, useUI } from "./context";
import { ago, when } from "./format";
import * as I from "./icons";
import type { GreenhouseActivityKind, GreenhouseCandidate, GreenhouseRecommendation } from "./types";

// A candidate's drawer: who they are, where they are in the pipeline (with
// move and reject), their scorecards, the activity feed with a note box,
// upcoming interviews and the job's details.

const REC: Record<Exclude<GreenhouseRecommendation, null>, [string, string]> = {
  "strong-yes": ["Strong Yes", "sy"],
  yes: ["Yes", "y"],
  no: ["No", "n"],
};
const ACT_ICON: Record<GreenhouseActivityKind, typeof I.Note> = { note: I.Note, move: I.Move, mail: I.Mail };

export function Drawer() {
  const { greenhouse } = useUI();
  const c = greenhouse.candidates.find((x) => x.id === greenhouse.state.open);
  if (!c) return null;
  return (
    <>
      <div className="scrim" onClick={greenhouse.ui.close} />
      <aside className="drawer" role="dialog" aria-label={c.name}>
        {/* A new key per candidate resets the stage picker and the note box. */}
        <Head key={`h:${c.id}:${c.stage}`} c={c} />
        <div className="d-body">
          <div>
            <Scorecards c={c} />
            <Activity key={`a:${c.id}`} c={c} />
          </div>
          <div>
            <Interviews c={c} />
            <Details c={c} />
          </div>
        </div>
      </aside>
    </>
  );
}

function Head({ c }: { c: GreenhouseCandidate }) {
  const { greenhouse } = useUI();
  const { stages, ui } = greenhouse;
  const at = stages.indexOf(c.stage);
  const [to, setTo] = useState(stages[Math.min(at + 1, stages.length - 1)]);
  return (
    <div className="d-head">
      <button className="d-close" aria-label="Close" onClick={ui.close}><I.Close /></button>
      <div className="d-id">
        <CandidateAvatar c={c} size="lg" />
        <div>
          <h2>{c.name}</h2>
          <div className="hl">{c.title ? `${c.title} at ${c.company}` : c.company}</div>
        </div>
      </div>
      <div className="d-info">
        {c.email ? (
          <span>
            <I.Mail />{" "}
            <a href={`mailto:${c.email}`} onClick={(e) => { e.preventDefault(); ui.emit({ type: "action", kind: "email", label: c.email! }); }}>
              {c.email}
            </a>
          </span>
        ) : null}
        {c.phone ? <span><I.Phone /> {c.phone}</span> : null}
        <span>Source: <b>{c.source}</b></span>
      </div>
      {c.tags.length ? (
        <div className="tags">
          {c.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      ) : null}
      <div className="steps">
        {stages.map((s, i) => <i key={s} className={i <= at ? "on" : ""} />)}
      </div>
      <div className="stagebar">
        <span className="cur">Stage: <b>{c.stage}</b> &middot; {c.days}d in stage</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Move to stage">
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn primary" onClick={() => ui.move(c.id, to)}>Move stage</button>
        <button className="btn danger" onClick={() => ui.reject(c.id)}>Reject</button>
      </div>
    </div>
  );
}

function Scorecards({ c }: { c: GreenhouseCandidate }) {
  const { staff } = useUI().greenhouse;
  const done = c.scorecards.filter((s) => s.recommendation !== null).length;
  return (
    <section className="panel">
      <h3>Scorecards <span className="count">{done} of {c.scorecards.length} submitted</span></h3>
      {c.scorecards.length ? (
        c.scorecards.map((s, i) => {
          const [label, cls] = s.recommendation ? REC[s.recommendation] : ["Awaiting", "p"];
          return (
            <div key={`${s.by}:${s.step}:${i}`} className="sc">
              <div className="sc-h">
                <StaffAvatar id={s.by} />
                <div className="who">
                  <b>{staff[s.by]?.name ?? s.by}</b>
                  <small>{s.step}</small>
                </div>
                <span className={`rec ${cls}`}>{label}</span>
              </div>
              {s.recommendation && s.attributes?.length ? (
                <div className="attrs">
                  {s.attributes.map(([name, v]) => (
                    <div key={name} className="attr">
                      {name}
                      <span className="dots">{[1, 2, 3, 4].map((n) => <i key={n} className={v >= n ? "on" : ""} />)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="empty">No scorecards yet</div>
      )}
    </section>
  );
}

function Activity({ c }: { c: GreenhouseCandidate }) {
  const { greenhouse } = useUI();
  const [text, setText] = useState("");
  // "Just now" turns into "1 minute ago" while the drawer stays open.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const save = () => {
    const v = text.trim();
    if (!v) return;
    greenhouse.ui.addNote(c.id, v);
    setText("");
  };
  return (
    <section className="panel">
      <h3>Activity Feed</h3>
      <div className="note-box">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Add a note about ${c.name.split(" ")[0]}...`}
          aria-label="Note"
        />
        <button className="btn primary" onClick={save}>Save note</button>
      </div>
      {c.activity.map((a) => {
        const Icon = ACT_ICON[a.kind];
        return (
          <div key={a.id} className="act">
            <span className="ai"><Icon /></span>
            <div>
              <b>{greenhouse.nameOf(a.by)}</b> <span className="when">{ago(a.at)}</span>
              <p>{a.text}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Interviews({ c }: { c: GreenhouseCandidate }) {
  const { ui } = useUI().greenhouse;
  return (
    <section className="panel">
      <h3>Upcoming Interviews</h3>
      {c.interviews.length ? (
        c.interviews.map((v, i) => (
          <div key={`${v.title}:${i}`} className="iv">
            <b>{v.title}</b>
            <small>{when(v.when)}</small>
            <div className="ppl">{v.with.map((id) => <StaffAvatar key={id} id={id} size="sm" />)}</div>
          </div>
        ))
      ) : (
        <div className="empty">Nothing scheduled</div>
      )}
      <div className="side-pad">
        <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => ui.requestInterview(c.id)}>
          Schedule interview
        </button>
      </div>
    </section>
  );
}

function Details({ c }: { c: GreenhouseCandidate }) {
  const { seed, nameOf } = useUI().greenhouse;
  const { job } = seed;
  const coordinator = job.coordinator ?? job.recruiter;
  return (
    <section className="panel">
      <h3>Details</h3>
      <div className="kv">
        <div><span>Job</span>{job.title}</div>
        {job.recruiter ? <div><span>Recruiter</span>{nameOf(job.recruiter)}</div> : null}
        {coordinator ? <div><span>Coordinator</span>{nameOf(coordinator)}</div> : null}
        {c.applied ? <div><span>Applied</span>{c.applied}</div> : null}
      </div>
    </section>
  );
}
