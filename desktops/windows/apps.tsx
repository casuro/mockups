import * as I from "./icons";
import type { Launcher } from "./types";
import { useDesktop } from "./Windows";

// The placeholder apps from desktops/windows.html: File Explorer, Edge,
// Notepad, Terminal and Settings. Use them as they are, mix them with your
// own launchers, or read them as examples of window content.

const FOLDERS: [string, string][] = [["Desktop", "#3a96dd"], ["Documents", "#6b7b8c"], ["Downloads", "#1f9e5a"], ["Pictures", "#c239b3"], ["Music", "#ca5010"], ["Videos", "#7a5af8"], ["Casuro", "#f5b52e"]];

export function Explorer() {
  return (
    <div className="kw-app">
      <div className="kw-bar">
        <button className="kw-btn" disabled aria-label="Back"><I.Back /></button>
        <button className="kw-btn" disabled aria-label="Forward"><I.Forward /></button>
        <button className="kw-btn" aria-label="Up"><I.Up /></button>
        <button className="kw-btn" aria-label="Refresh"><I.Refresh /></button>
        <div className="kw-field"><I.Home /><I.Chevron /><span>Home</span></div>
      </div>
      <div className="kw-files">
        {FOLDERS.map(([name, color]) => (
          <button key={name} className="kw-file kw-btn"><I.FolderIcon color={color} /><span>{name}</span></button>
        ))}
      </div>
      <div className="kw-status">{FOLDERS.length} items</div>
    </div>
  );
}

export function Edge() {
  return (
    <div className="kw-app">
      <div className="kw-bar">
        <button className="kw-btn" disabled aria-label="Back"><I.Back /></button>
        <button className="kw-btn" aria-label="Refresh"><I.Refresh /></button>
        <div className="kw-field"><I.Search /><span>Search or enter web address</span></div>
      </div>
      <div className="kw-page">
        <label className="kw-web-search"><I.Search /><input placeholder="Search the web" /></label>
      </div>
    </div>
  );
}

export function Notepad({ text = "Casuro - notes for this week\n\n- Review the Q4 roadmap draft\n- Record the episode builder demo\n- Send the hiring plan to the team\n\nAnything typed here stays in this window." }: { text?: string }) {
  return (
    <div className="kw-app">
      <div className="kw-menubar">{["File", "Edit", "View"].map((m) => <button key={m} className="kw-btn">{m}</button>)}</div>
      <textarea className="kw-notepad" spellCheck={false} aria-label="Text editor" defaultValue={text} />
      <div className="kw-status"><span>Ln 1, Col 1</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span></div>
    </div>
  );
}

export function Terminal({ prompt = "PS C:\\Users\\naman> " }: { prompt?: string }) {
  return (
    <div className="kw-app kw-term">
      <div className="kw-tabs"><span className="kw-tab"><I.TerminalIcon />Windows PowerShell</span></div>
      <pre tabIndex={0} aria-label="Terminal">{"Windows PowerShell\nCopyright (C) Microsoft Corporation. All rights reserved.\n\n" + prompt}<span className="kw-caret" /></pre>
    </div>
  );
}

export function Settings() {
  const desktop = useDesktop();
  return (
    <div className="kw-app kw-settings">
      <h1>Personalization</h1>
      <div className="kw-card">
        <I.Mode />
        <div>Choose your mode<small>Change the colors that appear in Windows</small></div>
        {(["light", "dark"] as const).map((t) => (
          <label key={t}>
            <input type="radio" checked={desktop.theme === t} onChange={() => desktop.setTheme(t)} />
            {t === "light" ? "Light" : "Dark"}
          </label>
        ))}
      </div>
      <div className="kw-card"><I.Picture /><div>Background<small>Bloom</small></div></div>
    </div>
  );
}

export const PLACEHOLDER_APPS: Launcher[] = [
  { id: "explorer", name: "File Explorer", icon: <I.ExplorerIcon />, window: () => ({ content: <Explorer />, width: 880, height: 540 }) },
  { id: "edge", name: "Microsoft Edge", icon: <I.EdgeIcon />, window: () => ({ content: <Edge />, width: 1040, height: 660 }) },
  { id: "notepad", name: "Notepad", icon: <I.NotepadIcon />, window: () => ({ content: <Notepad />, width: 720, height: 480 }) },
  { id: "terminal", name: "Terminal", icon: <I.TerminalIcon />, window: () => ({ content: <Terminal />, width: 760, height: 460 }) },
  { id: "settings", name: "Settings", icon: <I.SettingsIcon />, window: () => ({ content: <Settings />, width: 720, height: 400 }) },
];
