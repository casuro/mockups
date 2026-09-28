import { useState, type KeyboardEvent } from "react";
import { CandidateAvatar, useUI } from "./context";
import * as I from "./icons";
import type { GreenhouseCandidate } from "./types";

// The pipeline: the toolbar with the stage chips and the bulk move, and the
// board of stage columns and candidate cards.

export function Pipeline() {
  const { greenhouse } = useUI();
  const { stages, candidates, state, ui } = greenhouse;
  const { filter, selected } = state;
  return (
    <main className="pipe-wrap">
      <div className="toolbar">
        <h2>Pipeline</h2>
        <div className="chips">
          <button className={`chip${filter === null ? " on" : ""}`} onClick={() => ui.setFilter(null)}>
            All stages ({candidates.length})
          </button>
          {stages.map((s) => (
            <button key={s} className={`chip${filter === s ? " on" : ""}`} onClick={() => ui.setFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        {selected.length ? <Bulk count={selected.length} /> : null}
      </div>
      <div className="board">
        {stages.map((s) => {
          if (filter !== null && filter !== s) return null;
          const list = candidates.filter((c) => c.stage === s);
          return (
            <section key={s} className="col" aria-label={s}>
              <div className="col-h">
                {s}
                <span className="count">{list.length}</span>
              </div>
              <div className="col-b">
                {list.length ? list.map((c) => <Card key={c.id} c={c} />) : <div className="empty">No candidates</div>}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Bulk({ count }: { count: number }) {
  const { greenhouse } = useUI();
  const { stages, ui } = greenhouse;
  const [to, setTo] = useState(stages[0]);
  return (
    <div className="bulk">
      <b>{count} selected</b>
      <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Move to stage">
        {stages.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button className="btn primary" onClick={() => ui.bulkMove(to)}>Move stage</button>
      <button className="btn" onClick={ui.clearSelection}>Clear</button>
    </div>
  );
}

function Card({ c }: { c: GreenhouseCandidate }) {
  const { greenhouse } = useUI();
  const { ui, state } = greenhouse;
  const sel = state.selected.includes(c.id);
  const needs = c.scorecards.some((s) => s.recommendation === null);
  const open = () => ui.openCandidate(c.id);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.target === e.currentTarget) open();
  };
  return (
    <div className={`card${sel ? " sel" : ""}`} role="button" tabIndex={0} onClick={open} onKeyDown={onKey}>
      <div className="card-top">
        <CandidateAvatar c={c} size="sm" />
        <div className="nmw">
          <div className="nm">{c.name}</div>
          <div className="co">{c.company}</div>
        </div>
        <input
          type="checkbox"
          className="chk"
          checked={sel}
          aria-label={`Select ${c.name}`}
          onClick={(e) => e.stopPropagation()}
          onChange={() => ui.toggleSelect(c.id)}
        />
      </div>
      <div className="card-meta">
        <span>{c.source}</span>
        <span className="dots" title="Scorecards">
          {[1, 2, 3].map((n) => <i key={n} className={c.rating >= n ? "on" : ""} />)}
        </span>
        <span><I.Clock /> {c.days}d</span>
      </div>
      {needs ? <span className="flag">Needs scorecard</span> : null}
    </div>
  );
}
