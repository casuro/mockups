import { useState, type MouseEvent } from "react";
import { StaffAvatar, useUI } from "./context";
import * as I from "./icons";

// The frame above the pipeline: Greenhouse's top nav, and the job's header
// with its hiring team and tabs.

const NAV = ["Jobs", "Candidates", "Reports", "Integrations"];
const TABS = ["Dashboard", "Job Setup", "Pipeline", "Candidates"];

/** Links that stay on the page: they only tell the episode they were pressed. */
const stay = (e: MouseEvent) => e.preventDefault();

export function TopNav() {
  const { greenhouse } = useUI();
  const { seed, ui, me } = greenhouse;
  const [menu, setMenu] = useState(false);
  return (
    <header className="top">
      <button className="top-ic menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)}>
        <I.Menu />
      </button>
      <a className="brand" href="#" onClick={stay}>
        <I.GreenhouseLogo />
        <span>greenhouse</span>
      </a>
      <nav className={`nav${menu ? " open" : ""}`}>
        {NAV.map((n) => (
          <a
            key={n}
            href="#"
            className={n === "Jobs" ? "on" : ""}
            onClick={(e) => {
              stay(e);
              setMenu(false);
              ui.emit({ type: "action", kind: "nav", label: n });
            }}
          >
            {n}
          </a>
        ))}
      </nav>
      <span className="sp" />
      <label className="search">
        <I.Search />
        <input placeholder="Search candidates, jobs..." aria-label={`Search ${seed.company.name}`} />
      </label>
      <button className="add-btn" onClick={() => ui.emit({ type: "action", kind: "add", label: "Add a candidate" })}>
        Add<span className="long"> a candidate</span>
      </button>
      <button className="top-ic" aria-label="Notifications" onClick={() => ui.emit({ type: "action", kind: "notifications", label: "Notifications" })}>
        <I.Bell />
        {seed.notifications ? <span className="dot" /> : null}
      </button>
      <button className="top-ic" aria-label="Account">
        <StaffAvatar id={me} size="sm" />
      </button>
    </header>
  );
}

export function JobHeader() {
  const { greenhouse } = useUI();
  const { seed, staff, ui } = greenhouse;
  const { job } = seed;
  return (
    <section className="job">
      <div className="crumb">
        <a href="#" onClick={(e) => { stay(e); ui.emit({ type: "action", kind: "nav", label: "Jobs" }); }}>Jobs</a> / {job.department}
      </div>
      <div className="job-row">
        <div>
          <h1>{job.title}</h1>
          <div className="job-meta">
            <span><I.Bag />{job.department}</span>
            {job.location ? <span><I.Pin />{job.location}</span> : null}
            {job.req ? <span>Req #{job.req}</span> : null}
            <span className="pill">{job.status ?? "Open"}</span>
          </div>
        </div>
        {job.hiringTeam?.length ? (
          <div className="team">
            {job.hiringTeam.map((id) => (
              <div key={id} className="team-m">
                <StaffAvatar id={id} />
                <div>
                  {staff[id]?.name ?? id}
                  {staff[id]?.role ? <small>{staff[id].role}</small> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <nav className="tabs">
        {TABS.map((t) => (
          <a
            key={t}
            href="#"
            className={t === "Pipeline" ? "on" : ""}
            onClick={(e) => {
              stay(e);
              ui.emit({ type: "action", kind: "tab", label: t });
            }}
          >
            {t}
          </a>
        ))}
      </nav>
    </section>
  );
}
