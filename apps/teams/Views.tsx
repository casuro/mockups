import { useLayoutEffect, useRef, type ReactNode } from "react";
import { BackButton } from "./Composer";
import { AvatarPresence, useUI } from "./context";
import { clockTime, dayLabel, toTime } from "./format";
import { CallButtons } from "./Frame";
import * as I from "./icons";
import { keyOf } from "./use-teams";

// The simpler views: Activity's empty state, the week calendar, call
// history, OneDrive's files and the Apps store.

export function ActivityView() {
  return (
    <div className="empty">
      <I.Activity style={{ width: 48, height: 48, color: "var(--brand-fg)" }} />
      <b style={{ fontSize: 16, color: "var(--text)" }}>Catch up on your activity</b>
      <span>Pick a notification to jump to the conversation.</span>
    </div>
  );
}

const START = 8;
const END = 19;
const H = 48;
const hours = (d: Date) => d.getHours() + d.getMinutes() / 60;

export function CalendarView() {
  const { teams, openPrejoin } = useUI();
  const scroll = useRef<HTMLDivElement>(null);
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const todayIdx = (today.getDay() + 6) % 7;
  const md = (d: Date) => d.toLocaleDateString([], { month: "long", day: "numeric" });
  const title =
    days[0].getMonth() === days[4].getMonth()
      ? `${md(days[0])} - ${days[4].getDate()}, ${days[4].getFullYear()}`
      : `${md(days[0])} - ${md(days[4])}, ${days[4].getFullYear()}`;
  const nowTop = (hours(today) - START) * H;
  const events = (teams.seed.events ?? []).map((e) => {
    const start = new Date(toTime(e.start));
    const end = new Date(toTime(e.end));
    const day = Math.floor((new Date(start).setHours(0, 0, 0, 0) - monday.getTime()) / 86400000 + 0.5);
    const meeting = e.meeting ? teams.state.meetings[typeof e.meeting === "string" ? e.meeting : keyOf(e.meeting)] : undefined;
    return { ...e, day, s: hours(start), e: hours(end), live: meeting?.id };
  });

  // Opens on the current hour.
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = Math.max(0, (new Date().getHours() - 9) * H);
  }, []);

  return (
    <>
      <div className="cal-head">
        <button className="btn-secondary" style={{ height: 30 }} onClick={() => teams.toast("Jumped to today")}>Today</button>
        <button className="tb-btn" aria-label="Previous week"><I.ChevLeft /></button>
        <button className="tb-btn" aria-label="Next week"><I.ChevRight /></button>
        <h2>{title}</h2>
        <span style={{ flex: 1 }} />
        <button className="hbtn" onClick={() => teams.ui.startMeeting(null, { video: true })}><I.Video /><span className="lbl">Meet now</span></button>
        <button className="btn-primary" onClick={() => teams.toast("New meeting")}><I.Plus /><span className="lbl">New meeting</span></button>
      </div>
      <div className="scroll" ref={scroll}>
        <div className="cal">
          <div className="cal-corner" />
          {days.map((d, i) => (
            <div key={i} className={`cal-dayhead${i === todayIdx ? " today" : " wk"}`}>
              <b>{d.getDate()}</b>
              <span>{d.toLocaleDateString([], { weekday: "long" })}</span>
            </div>
          ))}
          <div className="cal-hours">
            {Array.from({ length: END - START }, (_, i) => (
              <div key={i} className="cal-hour">{i ? new Date(2000, 0, 1, START + i).toLocaleTimeString([], { hour: "numeric" }) : ""}</div>
            ))}
          </div>
          {days.map((_, i) => (
            <div key={i} className={`cal-col${i === todayIdx ? " today" : " wk"}`} style={{ height: (END - START) * H }}>
              {events.filter((e) => e.day === i).map((e) => (
                <button
                  key={`${e.title}${e.s}`}
                  className={`ev${e.color && e.color !== "brand" ? ` ${e.color}` : ""}`}
                  style={{ top: (e.s - START) * H, height: Math.max(18, (e.e - e.s) * H - 2) }}
                  onClick={() => {
                    if (e.live) openPrejoin(e.live);
                    else {
                      teams.toast(e.title);
                      teams.ui.emit({ type: "action", kind: "event", label: e.title });
                    }
                  }}
                >
                  {e.live ? <span className="jn">{teams.state.inCall === e.live ? "Joined" : "Join"}</span> : null}
                  <b>{e.title}</b>
                  {e.e - e.s >= 0.75 && e.where ? <span style={{ color: "var(--text-2)" }}>{e.where}</span> : null}
                </button>
              ))}
              {i === todayIdx && nowTop > 0 && nowTop < (END - START) * H ? <div className="nowline" style={{ top: nowTop }} /> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="c-head">
        <BackButton />
        <div className="c-title"><b>{title}</b></div>
        {action ? <><span className="grow" />{action}</> : null}
      </div>
      <div className="scroll"><div className="panel">{children}</div></div>
    </>
  );
}

export function CallsView() {
  const { teams } = useUI();
  const calls = teams.seed.calls ?? [];
  return (
    <Page title="History">
      <div className="table">
        <div className="tr th"><span>Name</span><span>Type</span><span>Date</span><span /></div>
        {calls.filter((c) => teams.people[c.with]).map((c, i) => {
          const at = toTime(c.at);
          const missed = c.kind === "missed";
          return (
            <div key={i} className="tr">
              <span className="who">
                <AvatarPresence id={c.with} />
                <span className={missed ? "missed" : ""}>{teams.people[c.with].name}</span>
              </span>
              <span className={missed ? "missed" : ""}>{missed ? "Missed" : `${c.kind === "outgoing" ? "Outgoing" : "Incoming"}${c.duration ? ` · ${c.duration}` : ""}`}</span>
              <span style={{ color: "var(--text-2)" }}>{dayLabel(at)} {clockTime(at)}</span>
              <span className="acts"><CallButtons id={c.with} /></span>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

export function FilesView() {
  const { teams } = useUI();
  const open = (name: string) => {
    teams.toast(`Opening ${name}`);
    teams.ui.emit({ type: "action", kind: "file", label: name });
  };
  return (
    <Page title="My files" action={<button className="hbtn" onClick={() => teams.toast("Upload")}><I.Plus /><span className="lbl">Upload</span></button>}>
      <div className="table">
        <div className="tr th"><span>Name</span><span>Shared by</span><span>Modified</span><span /></div>
        {(teams.seed.files ?? []).map((f) => (
          <div key={f.name} className="tr">
            <span className="who"><span className="fi-ic" style={{ background: f.color ?? "#185abd" }}>{f.ext ?? "F"}</span><span>{f.name}</span></span>
            <span>{teams.people[f.by]?.name ?? f.by}</span>
            <span style={{ color: "var(--text-2)" }}>{dayLabel(toTime(f.modified))}</span>
            <span className="acts"><button className="tb-btn" aria-label={`Open ${f.name}`} onClick={() => open(f.name)}><I.More /></button></span>
          </div>
        ))}
      </div>
    </Page>
  );
}

const APPS: [string, string, string, () => ReactNode][] = [
  ["Planner", "Plan and track team tasks", "#31752f", () => <I.Check />],
  ["Forms", "Surveys and quizzes", "#008272", () => <I.Format />],
  ["Approvals", "Request and track sign-offs", "#0078d4", () => <I.Check />],
  ["Whiteboard", "Collaborate on a canvas", "#5b5fc7", () => <I.Pencil />],
  ["Lists", "Track information", "#c239b3", () => <I.Filter />],
  ["Shifts", "Manage schedules", "#8764b8", () => <I.Calendar />],
  ["Polls", "Quick polls in chats and meetings", "#ca5010", () => <I.People />],
  ["Wiki", "Team knowledge base", "#038387", () => <I.Info />],
];

export function AppsView() {
  const { teams } = useUI();
  return (
    <Page title="Discover">
      <div className="apps-grid">
        {APPS.map(([name, desc, color, icon]) => (
          <button
            key={name}
            className="app-card"
            onClick={() => {
              teams.toast(`Adding ${name}`);
              teams.ui.emit({ type: "action", kind: "app", label: name });
            }}
          >
            <span className="ic" style={{ background: color }}>{icon()}</span>
            <span><b>{name}</b><small>{desc}</small></span>
          </button>
        ))}
      </div>
    </Page>
  );
}
