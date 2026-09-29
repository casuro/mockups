import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Switch, useUI } from "./context";
import * as I from "./icons";
import { copyLink } from "./Panels";
import type { MeetLayout } from "./types";

// The dialogs: Adjust view (layout), Settings, Report a problem, Add people.

function Dialog({ label, className = "", title, children, footer }: { label: string; className?: string; title: string; children: ReactNode; footer?: ReactNode }) {
  const { openDialog } = useUI();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("input, textarea, select, .btn.filled")?.focus();
  }, []);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && openDialog(null)}>
      <div className={`dlg ${className}`} role="dialog" aria-label={label} ref={box}>
        <div className="dlg-h">
          <h2>{title}</h2>
          <button className="ib" aria-label="Close" onClick={() => openDialog(null)}><I.Close /></button>
        </div>
        {children}
        {footer ? <div className="dlg-f">{footer}</div> : null}
      </div>
    </div>
  );
}

const LAYOUTS: [MeetLayout, string, string][] = [
  ["auto", "Auto (dynamic)", "Let Meet choose the layout"],
  ["tiled", "Tiled", "Everyone in an evenly sized grid"],
  ["spotlight", "Spotlight", "The active speaker or shared screen fills the window"],
  ["sidebar", "Sidebar", "The active speaker with everyone else on the side"],
];

function LayoutDialog() {
  const { meet, openDialog } = useUI();
  const { layout, hideNoVideo } = meet.state;
  return (
    <Dialog label="Adjust view" title="Adjust view" footer={<button className="btn filled" onClick={() => openDialog(null)}>Done</button>}>
      <div className="dlg-b">
        <div className="p-sec" style={{ marginTop: 4 }}>Layout</div>
        {LAYOUTS.map(([v, b, s]) => (
          <div key={v} className="radio-row" role="radio" aria-checked={layout === v} tabIndex={0} onClick={() => meet.ui.setLayout(v)} onKeyDown={(e) => e.key === "Enter" && meet.ui.setLayout(v)}>
            <span className={`radio${layout === v ? " on" : ""}`} />
            <span className="lbl"><b style={{ color: "var(--text)" }}>{b}</b><small>{s}</small></span>
            <span className="lay-ic"><I.LayoutPicture layout={v} /></span>
          </div>
        ))}
        <div className="switch-row" style={{ borderTop: "1px solid var(--line-2)", marginTop: 8 }}>
          <span className="lbl"><b>Hide tiles without video</b><small>Only people with their camera on appear on the stage</small></span>
          <Switch on={hideNoVideo} label="Hide tiles without video" onChange={() => meet.ui.toggleHideNoVideo()} />
        </div>
      </div>
    </Dialog>
  );
}

function SettingsDialog() {
  const { meet, settingsTab: tab, openDialog } = useUI();
  const { state, devices } = meet;
  const select = (k: "mic" | "speaker" | "camera", label: string) => (
    <>
      <label className="sl" htmlFor={`meet-set-${k}`}>{label}</label>
      <div className="ctl-row">
        <select id={`meet-set-${k}`} value={state.device[k]} onChange={(e) => meet.ui.setDevice(k, +e.target.value)}>
          {devices[k].map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        {k === "speaker" ? <button className="btn outlined" onClick={() => meet.ui.testSpeaker()}><I.Speaker />Test</button> : null}
      </div>
    </>
  );
  const toggle = (k: "dark" | "chimes" | "leaveEmpty", b: string, s: string) => {
    const on = k === "dark" ? state.theme === "dark" : state[k];
    return (
      <div className="switch-row">
        <span className="lbl"><b>{b}</b><small>{s}</small></span>
        <Switch on={on} label={b} onChange={() => meet.ui.setSetting(k, !on)} />
      </div>
    );
  };
  const tb = (id: "audio" | "video" | "general", icon: ReactNode, label: string) => (
    <button className={tab === id ? "on" : ""} onClick={() => openDialog("settings", id)}>{icon}{label}</button>
  );
  return (
    <Dialog label="Settings" title="Settings" className="wide">
      <div className="set-wrap">
        <nav className="set-tabs">
          {tb("audio", <I.Speaker />, "Audio")}
          {tb("video", <I.Cam />, "Video")}
          {tb("general", <I.Settings />, "General")}
        </nav>
        <div className="set-body">
          {tab === "audio" ? (
            <>{select("mic", "Microphone")}{select("speaker", "Speakers")}</>
          ) : tab === "video" ? (
            <>
              {select("camera", "Camera")}
              <label className="sl" htmlFor="meet-set-res">Send resolution (maximum)</label>
              <select id="meet-set-res"><option>Auto</option><option>High definition (720p)</option><option>Standard definition (360p)</option></select>
              <label className="sl" htmlFor="meet-set-rres">Receive resolution (maximum)</label>
              <select id="meet-set-rres"><option>Auto</option><option>High definition (720p)</option><option>Audio only</option></select>
            </>
          ) : (
            <>
              {toggle("dark", "Dark theme", "Use dark panels, menus and dialogs")}
              {toggle("chimes", "Play chime when people join or leave", "Only plays when fewer than 5 people are in the call")}
              {toggle("leaveEmpty", "Leave empty calls", "Leave the call automatically when you're the only one left")}
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function ReportDialog() {
  const { meet, openDialog } = useUI();
  const [text, setText] = useState("");
  const send = () => {
    openDialog(null);
    meet.ui.snack("Thanks for your report. It helps improve Google Meet.");
    meet.ui.emit({ type: "action", kind: "report", label: text });
  };
  return (
    <Dialog
      label="Report a problem"
      title="Report a problem"
      className="rp"
      footer={<><button className="btn text" onClick={() => openDialog(null)}>Cancel</button><button className="btn filled" onClick={send}>Send</button></>}
    >
      <div className="dlg-b">
        <p>Describe what went wrong. Your report helps improve Google Meet.</p>
        <textarea placeholder="For example: the audio kept cutting out during the presentation" value={text} onChange={(e) => setText(e.target.value)} />
        <label className="cbx"><input type="checkbox" defaultChecked /> Include diagnostic logs</label>
      </div>
    </Dialog>
  );
}

function AddPeopleDialog() {
  const { meet, openDialog } = useUI();
  const { state, people, seed, me } = meet;
  const pool = seed.invitable ?? Object.keys(people);
  const out = pool.filter((p) => p !== me && !state.inCall.includes(p) && people[p]);
  return (
    <Dialog label="Add people" title="Add people" className="sm" footer={<button className="btn text" onClick={() => openDialog(null)}>Done</button>}>
      <div className="dlg-b">
        {out.length ? (
          <>
            <p>Invite people{seed.meeting.org ? ` from ${seed.meeting.org}` : ""}. They&apos;ll get a call and an email.</p>
            {out.map((p) => (
              <div className="prow" style={{ paddingLeft: 0 }} key={p}>
                <Avatar id={p} size={32} />
                <span className="who"><b style={{ color: "var(--text)" }}>{people[p].name}</b><small>{people[p].email}</small></span>
                <button className="btn tonal" style={{ height: 32, padding: "0 16px" }} onClick={() => { openDialog(null); meet.ui.invite(p); }}>Invite</button>
              </div>
            ))}
          </>
        ) : (
          <p>Everyone on your team is already in this call.</p>
        )}
        <div className="linkbox" style={{ marginTop: 12 }}>
          <span>meet.google.com/{seed.meeting.code}</span>
          <button className="ib sm" data-tip="Copy joining info" aria-label="Copy joining info" onClick={() => copyLink(meet)}><I.Copy /></button>
        </div>
      </div>
    </Dialog>
  );
}

export function Dialogs() {
  const { dialog } = useUI();
  if (dialog === "layout") return <LayoutDialog />;
  if (dialog === "settings") return <SettingsDialog />;
  if (dialog === "report") return <ReportDialog />;
  if (dialog === "add") return <AddPeopleDialog />;
  return null;
}
