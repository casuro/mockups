import { useState } from "react";
import { Avatar, useUI, type Modal } from "./context";
import * as I from "./icons";
import type { ZoomScreen } from "./types";
import type { ZoomMeetingApi } from "./use-zoom";

// The dialogs over the meeting: a confirm, the Share Screen picker and the
// Invite list. Plus the meeting's invite link and text, which the meeting
// info popover copies too.

export const linkOf = (zoom: ZoomMeetingApi) => zoom.seed.meeting.link ?? `https://zoom.us/j/${zoom.seed.meeting.id.replace(/\s/g, "")}`;

export function copy(zoom: ZoomMeetingApi, text: string, done: string) {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {});
  } catch {
    // The clipboard may be blocked in a preview.
  }
  zoom.toast(done);
}

function invitation(zoom: ZoomMeetingApi) {
  const m = zoom.seed.meeting;
  return `${zoom.nameOf(zoom.me)} is inviting you to a Zoom meeting.\n\nTopic: ${m.title}\n\nJoin Zoom Meeting\n${linkOf(zoom)}\n\nMeeting ID: ${m.id}\n${m.passcode ? `Passcode: ${m.passcode}\n` : ""}`;
}

function Head({ title }: { title: string }) {
  const { closeModal } = useUI();
  return (
    <div className="modal-h">
      <h2>{title}</h2>
      <button className="icon-btn" aria-label="Close" onClick={closeModal}><I.Close /></button>
    </div>
  );
}

export function Dialog({ modal }: { modal: Modal }) {
  const { closeModal } = useUI();
  return (
    <div className="modal-host" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
      {modal.type === "confirm" ? <Confirm modal={modal} /> : modal.type === "share" ? <SharePicker /> : <Invite />}
    </div>
  );
}

function Confirm({ modal }: { modal: Extract<Modal, { type: "confirm" }> }) {
  const { closeModal } = useUI();
  const [checked, setChecked] = useState(true);
  return (
    <div className="modal" role="alertdialog" aria-label={modal.title}>
      <Head title={modal.title} />
      <div className="modal-b">
        <p className="fine">{modal.body}</p>
        {modal.checkbox ? (
          <label className="chk" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> {modal.checkbox}
          </label>
        ) : null}
      </div>
      <div className="modal-f">
        <button className="btn m-sec" onClick={closeModal}>{modal.cancel ?? "Cancel"}</button>
        <button className={`btn ${modal.danger ? "btn-danger" : "btn-primary"}`} autoFocus onClick={() => { closeModal(); modal.onOk(checked); }}>{modal.ok}</button>
      </div>
    </div>
  );
}

const DEFAULT_SCREENS: ZoomScreen[] = [{ id: "screen", title: "Screen", thumb: "desktop" }];
const ADVANCED: [string, typeof I.Fullscreen][] = [["Portion of Screen", I.Fullscreen], ["Computer Audio", I.Volume], ["Content from 2nd Camera", I.Video]];

function SharePicker() {
  const { zoom, closeModal } = useUI();
  const screens = zoom.seed.screens?.length ? zoom.seed.screens : DEFAULT_SCREENS;
  // A whiteboard is always on offer, after the first screen.
  const items: (ZoomScreen & { board?: true })[] = [screens[0], { id: "__whiteboard", title: "Whiteboard", board: true }, ...screens.slice(1)];
  const [sel, setSel] = useState(screens[0].id);
  const [tab, setTab] = useState<"basic" | "adv">("basic");
  const go = () => {
    closeModal();
    if (!zoom.state.security.share && !zoom.canManage) return zoom.toast("The host has disabled screen sharing");
    if (sel === "__whiteboard") zoom.ui.startWhiteboard({ title: "Untitled whiteboard" });
    else zoom.ui.startShare(sel);
  };
  return (
    <div className="modal wide" role="dialog" aria-label="Share screen">
      <Head title="Select a window or an application that you want to share" />
      <div className="modal-b">
        <div className="shp-tabs">
          <button className={tab === "basic" ? "on" : ""} onClick={() => setTab("basic")}>Basic</button>
          <button className={tab === "adv" ? "on" : ""} onClick={() => setTab("adv")}>Advanced</button>
        </div>
        <div className="shp-grid">
          {tab === "adv"
            ? ADVANCED.map(([label, Icon]) => (
                <button key={label} className="shp-item" onClick={() => zoom.toast(`${label} sharing isn't available here`)}>
                  <div className="th"><Icon /></div>{label}
                </button>
              ))
            : items.map((s) => (
                <button key={s.id} className={`shp-item${sel === s.id ? " on" : ""}`} onClick={() => setSel(s.id)} onDoubleClick={go}>
                  <div className={`th ${s.board ? "whiteboard" : s.thumb === "document" ? "" : (s.thumb ?? "")}`}>
                    {s.board ? <I.Whiteboard /> : s.thumb === "document" ? <span className="mini-doc" /> : null}
                  </div>
                  {s.title}
                </button>
              ))}
        </div>
      </div>
      <div className="modal-f">
        <div className="shp-opts">
          <label className="chk"><input type="checkbox" /> Share sound</label>
          <label className="chk"><input type="checkbox" /> Optimize for video clip</label>
        </div>
        <span className="grow" />
        <button className="btn btn-primary" disabled={tab === "adv"} onClick={go}>Share</button>
      </div>
    </div>
  );
}

function Invite() {
  const { zoom, closeModal } = useUI();
  const s = zoom.state;
  const avail = (zoom.seed.contacts ?? []).filter((p) => zoom.people[p] && !s.people.includes(p) && !s.waiting.includes(p));
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div className="modal" role="dialog" aria-label="Invite">
      <Head title={`Invite people to join meeting ${zoom.seed.meeting.title}`} />
      <div className="modal-b">
        {avail.length ? (
          avail.map((p) => (
            <label key={p} className="chk" style={{ padding: "8px 0" }}>
              <input type="checkbox" checked={picked.includes(p)} onChange={(e) => setPicked((l) => (e.target.checked ? [...l, p] : l.filter((x) => x !== p)))} />
              <Avatar id={p} className="inv-av" />
              <span style={{ flex: 1 }}>
                {zoom.nameOf(p)}
                {zoom.people[p].status ? <><br /><span className="fine">{zoom.people[p].status}</span></> : null}
              </span>
            </label>
          ))
        ) : (
          <p className="fine">Everyone in your contacts is already in this meeting.</p>
        )}
      </div>
      <div className="modal-f">
        <button className="btn m-sec" onClick={() => copy(zoom, linkOf(zoom), "Invite link copied to clipboard")}>Copy Invite Link</button>
        <button className="btn m-sec" onClick={() => copy(zoom, invitation(zoom), "Meeting invitation copied to clipboard")}>Copy Invitation</button>
        <span className="grow" />
        <button
          className="btn btn-primary"
          disabled={!avail.length}
          onClick={() => {
            if (!picked.length) return zoom.toast("Select at least one person");
            closeModal();
            zoom.ui.invite(picked);
          }}
        >
          Invite
        </button>
      </div>
    </div>
  );
}
