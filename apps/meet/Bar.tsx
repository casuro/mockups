import { useEffect, useState, type ReactNode } from "react";
import { clock, useUI, type MenuItem } from "./context";
import * as I from "./icons";

// The control bar along the bottom of the call: the clock and meeting
// code, the call controls with their menus, and the panel buttons.

export const EMOJI = ["\u{1F496}", "\u{1F44D}", "\u{1F389}", "\u{1F44F}", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F914}", "\u{1F44E}"];
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? "⌘" : "Ctrl";

function Clock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);
  return <span>{clock(now)}</span>;
}

export function ReactBar() {
  const { meet, reactOpen } = useUI();
  if (!reactOpen) return null;
  return (
    <div className="reactbar">
      {EMOJI.map((e) => (
        <button key={e} aria-label={`Send ${e}`} onClick={() => meet.ui.react(e)}>{e}</button>
      ))}
    </div>
  );
}

export function Bar() {
  const ui = useUI();
  const { meet, openMenu, openDialog, phone, reactOpen, setReactOpen, toggleFullscreen } = ui;
  const { state, me, devices } = meet;
  const hand = state.hands.includes(me);
  const presenting = state.presenter === me;

  const deviceMenu = (anchor: HTMLElement, kinds: ("mic" | "speaker" | "camera")[]) => {
    const items: MenuItem[] = [];
    kinds.forEach((k, j) => {
      if (j) items.push("-");
      items.push({ head: k === "mic" ? "Microphone" : k === "speaker" ? "Speakers" : "Camera" });
      devices[k].forEach((d, i) => items.push({ label: d, check: state.device[k] === i, run: () => meet.ui.setDevice(k, i) }));
    });
    items.push("-", { icon: <I.Settings />, label: "Settings", run: () => openDialog("settings", kinds[0] === "camera" ? "video" : "audio") });
    openMenu({ anchor, items, up: true, align: "center" });
  };

  const presentMenu = (anchor: HTMLElement) => {
    if (presenting) return meet.ui.stopPresenting();
    openMenu({
      anchor,
      up: true,
      align: "center",
      items: [
        { head: "Present" },
        { icon: <I.Present />, label: "Your entire screen", run: () => meet.ui.present("screen") },
        { icon: <I.Window />, label: "A window", run: () => meet.ui.present("window") },
        { icon: <I.Tab />, label: "A tab", sub: "Best for video and animation", run: () => meet.ui.present("tab") },
      ],
    });
  };

  const moreMenu = (anchor: HTMLElement) => {
    const items: MenuItem[] = [];
    if (phone) {
      items.push(
        { icon: <I.Cc />, label: state.captions ? "Turn off captions" : "Turn on captions", run: () => meet.ui.toggleCaptions() },
        { icon: <I.Hand />, label: hand ? "Lower hand" : "Raise hand", run: () => meet.ui.toggleHand() },
        { icon: presenting ? <I.StopPresent /> : <I.Present />, label: presenting ? "Stop presenting" : "Present now", run: () => (presenting ? meet.ui.stopPresenting() : meet.ui.present("screen")) },
        "-",
        { icon: <I.People />, label: `People (${state.inCall.length + 1})`, run: () => meet.ui.openPanel("people") },
        { icon: <I.Chat />, label: "In-call messages", sub: state.unread ? `${state.unread} new` : "", run: () => meet.ui.openPanel("chat") },
        { icon: <I.Info />, label: "Meeting details", run: () => meet.ui.openPanel("info") },
        { icon: <I.Shapes />, label: "Activities", run: () => meet.ui.openPanel("activities") },
        { icon: <I.LockPerson />, label: "Host controls", run: () => meet.ui.openPanel("host") },
        "-"
      );
    }
    const full = typeof document !== "undefined" && !!document.fullscreenElement;
    items.push(
      { icon: <I.Record />, label: state.recording ? "Stop recording" : "Manage recording", run: () => meet.ui.toggleRecording() },
      { icon: <I.Layout />, label: "Change layout", run: () => openDialog("layout") },
      { icon: full ? <I.FullscreenExit /> : <I.Fullscreen />, label: full ? "Exit full screen" : "Full screen", run: toggleFullscreen },
      { icon: <I.Sparkle />, label: "Apply visual effects", run: () => meet.ui.openPanel("effects") },
      "-",
      { icon: <I.Settings />, label: "Settings", run: () => openDialog("settings") },
      {
        icon: <I.Help />,
        label: "Troubleshooting & help",
        run: () => {
          meet.ui.snack("Your connection looks good. Audio and video are running normally.");
          meet.ui.emit({ type: "action", kind: "help", label: "Troubleshooting & help" });
        },
      },
      { icon: <I.Flag />, label: "Report a problem", run: () => openDialog("report") }
    );
    openMenu({ anchor, items, up: true, align: "center" });
  };

  const micTip = `${state.mic ? "Turn off" : "Turn on"} microphone (${MOD} + d)`;
  const camTip = `${state.camera ? "Turn off" : "Turn on"} camera (${MOD} + e)`;
  const handTip = `${hand ? "Lower hand" : "Raise hand"} (${isMac ? "Ctrl + ⌘" : "Ctrl + Alt"} + h)`;
  const rb = (panel: "info" | "people" | "chat" | "activities" | "host", tip: string, icon: ReactNode, badge?: ReactNode) => (
    <button className={`rbtn${state.panel === panel ? " on" : ""}`} data-tip={tip} aria-label={tip} aria-pressed={state.panel === panel} onClick={() => meet.ui.openPanel(panel)}>
      {icon}
      {badge}
    </button>
  );

  return (
    <footer className="bar">
      <div className="bar-l">
        <Clock />
        <span className="sep" />
        <span className="code">{meet.seed.meeting.code}</span>
      </div>
      <div className="bar-c">
        <div className="sbtn">
          <button className="chev" data-tip="Audio settings" aria-label="Audio settings" onClick={(e) => deviceMenu(e.currentTarget, ["mic", "speaker"])}><I.ExpandLess /></button>
          <button className={`cb${state.mic ? "" : " off"}`} data-tip={micTip} aria-label={micTip} aria-pressed={!state.mic} onClick={() => meet.ui.setMic(!state.mic)}>
            {state.mic ? <I.Mic /> : <I.MicOff />}
          </button>
        </div>
        <div className="sbtn">
          <button className="chev" data-tip="Video settings" aria-label="Video settings" onClick={(e) => deviceMenu(e.currentTarget, ["camera"])}><I.ExpandLess /></button>
          <button className={`cb${state.camera ? "" : " off"}`} data-tip={camTip} aria-label={camTip} aria-pressed={!state.camera} onClick={() => meet.ui.setCamera(!state.camera)}>
            {state.camera ? <I.Cam /> : <I.CamOff />}
          </button>
        </div>
        <button className={`cb desk${state.captions ? " on" : ""}`} data-tip={`${state.captions ? "Turn off" : "Turn on"} captions (c)`} aria-label={`${state.captions ? "Turn off" : "Turn on"} captions (c)`} onClick={() => meet.ui.toggleCaptions()}><I.Cc /></button>
        <button className={`cb${reactOpen ? " on" : ""}`} data-react-toggle="" data-tip="Send a reaction" aria-label="Send a reaction" onClick={() => setReactOpen(!reactOpen)}><I.Mood /></button>
        <button className={`cb desk${presenting ? " on" : ""}`} data-tip={presenting ? "Stop presenting" : "Present now"} aria-label={presenting ? "Stop presenting" : "Present now"} onClick={(e) => presentMenu(e.currentTarget)}>
          {presenting ? <I.StopPresent /> : <I.Present />}
        </button>
        <button className={`cb desk${hand ? " on" : ""}`} data-tip={handTip} aria-label={handTip} onClick={() => meet.ui.toggleHand()}><I.Hand /></button>
        <button className="cb" data-tip="More options" aria-label="More options" onClick={(e) => moreMenu(e.currentTarget)}><I.More /></button>
        <button className="leave" data-tip="Leave call" aria-label="Leave call" onClick={() => meet.ui.leave()}><I.CallEnd /></button>
      </div>
      <div className="bar-r">
        {rb("info", "Meeting details", <I.Info />)}
        {rb("people", "Show everyone", <I.People />, <span className="count">{state.inCall.length + 1}</span>)}
        {rb("chat", "Chat with everyone", <I.Chat />, state.unread && state.panel !== "chat" ? <span className="dot" /> : null)}
        {rb("activities", "Activities", <I.Shapes />)}
        {rb("host", "Host controls", <I.LockPerson />)}
      </div>
    </footer>
  );
}
