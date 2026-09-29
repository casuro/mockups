import type { CSSProperties, ReactNode } from "react";
import { Linux, LinuxIcons as I, useLinux, type LinuxApp } from "../desktops/linux";

// desktops/linux.html's desktop, driving the React version: the same dock
// and the same placeholder windows (Files, Firefox, Text Editor, Terminal,
// Settings). Any React content can go in a window instead.

const FOLDERS = ["Desktop", "Documents", "Downloads", "Music", "Pictures", "Public", "Templates", "Videos"];
const PLACES: [ReactNode, string][] = [[<I.Clock />, "Recent"], [<I.Star />, "Starred"], [<I.Home />, "Home"], [<I.Doc />, "Documents"], [<I.Download />, "Downloads"], [<I.Picture />, "Pictures"], [<I.Trash />, "Trash"]];

const hbtn: CSSProperties = { height: 34, minWidth: 34, padding: "0 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 };
const side: CSSProperties = { width: 200, flex: "none", background: "var(--lx-side)", padding: "8px 6px", borderRight: "1px solid var(--lx-line)", overflow: "auto" };
const row = (on: boolean): CSSProperties => ({ width: "100%", height: 34, display: "flex", alignItems: "center", gap: 12, padding: "0 10px", borderRadius: 6, background: on ? "var(--lx-sel)" : "none", fontWeight: on ? 600 : 400, border: 0, color: "inherit", font: "inherit", textAlign: "left" });
const plain: CSSProperties = { border: 0, background: "none", color: "inherit", font: "inherit", padding: 0 };
const field: CSSProperties = { flex: 1, height: 34, border: 0, borderRadius: 8, padding: "0 12px", background: "var(--lx-btn)", color: "inherit", font: "inherit", outline: 0 };

const Btn = ({ label, children }: { label: string; children: ReactNode }) => (
  <button aria-label={label} style={{ ...plain, ...hbtn }}>{children}</button>
);

function Files() {
  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <nav style={side}>
        {PLACES.map(([icon, name]) => <button key={name} style={row(name === "Home")}>{icon}{name}</button>)}
      </nav>
      <div style={{ flex: 1, padding: 16, overflow: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", alignContent: "start", gap: 6 }}>
        {FOLDERS.map((f) => (
          <button key={f} style={{ ...plain, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px", borderRadius: 10 }}>
            <I.FolderIcon width={60} height={60} />{f}
          </button>
        ))}
      </div>
    </div>
  );
}

function Firefox() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--lx-line)" }}>
        <Btn label="Back"><I.Back /></Btn><Btn label="Forward"><I.Forward /></Btn><Btn label="Reload"><I.Reload /></Btn>
        <input placeholder="Search or enter address" aria-label="Address" style={field} />
        <Btn label="Menu"><I.Menu /></Btn>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 24 }}>
        <I.FirefoxIcon width={84} height={84} />
        <input placeholder="Search the web" aria-label="Search the web" style={{ ...field, flex: "none", width: "min(560px, 100%)", height: 48, borderRadius: 12, fontSize: 15, boxShadow: "0 1px 4px rgba(0, 0, 0, .12)" }} />
      </div>
    </div>
  );
}

function Terminal() {
  const prompt = <><b style={{ color: "#8ae234" }}>naman@casuro</b>:<b style={{ color: "#729fcf" }}>~</b>$ </>;
  return (
    <div style={{ flex: 1, padding: "8px 10px", background: "#300a24", color: "#eee", font: '14.5px/1.35 "Ubuntu Mono", ui-monospace, monospace', whiteSpace: "pre-wrap" }}>
      {"Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-45-generic x86_64)\n\n"}
      {prompt}ls{"\n" + FOLDERS.join("  ") + "\n"}
      {prompt}<span style={{ display: "inline-block", width: ".6em", height: "1.1em", verticalAlign: "text-bottom", background: "#eee" }} />
    </div>
  );
}

function Settings({ dark, setDark }: { dark: boolean; setDark: (dark: boolean) => void }) {
  const card = (name: "Light" | "Dark") => {
    const on = (name === "Dark") === dark;
    return (
      <button key={name} onClick={() => setDark(name === "Dark")} style={{ ...plain, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ position: "relative", width: 150, height: 96, borderRadius: 10, background: "linear-gradient(135deg, #e95420, #77216f)", boxShadow: on ? "0 0 0 3px var(--lx-accent)" : "0 0 0 1px var(--lx-line)" }}>
          <span style={{ position: "absolute", inset: "20px 26px 0", borderRadius: "6px 6px 0 0", background: name === "Dark" ? "#303030" : "#fafafa" }} />
        </span>
        {name}
      </button>
    );
  };
  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <nav style={side}>
        {["Wi-Fi", "Network", "Bluetooth", "Displays", "Sound", "Power", "Appearance", "Notifications", "Apps", "Privacy & Security", "System"].map((n) => (
          <button key={n} style={row(n === "Appearance")}>{n}</button>
        ))}
      </nav>
      <div style={{ flex: 1, padding: 16 }}>
        <h4 style={{ margin: "8px 0 12px", fontSize: 15 }}>Style</h4>
        <div style={{ display: "flex", gap: 18 }}>{card("Light")}{card("Dark")}</div>
      </div>
    </div>
  );
}

export function LinuxPreview() {
  const linux = useLinux({ onEvent: (e) => console.debug("linux", e) });
  const apps: LinuxApp[] = [
    { id: "files", name: "Files", icon: <I.FilesIcon />, window: () => ({
      width: 860, height: 540, content: <Files />,
      headerStart: <><Btn label="Back"><I.Back /></Btn><Btn label="Forward"><I.Forward /></Btn></>,
      headerEnd: <><Btn label="Search"><I.Search /></Btn><Btn label="View"><I.Grid /></Btn><Btn label="Menu"><I.Menu /></Btn></>,
      title: <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 8, background: "var(--lx-btn)" }}><I.Home />Home</span>,
    }) },
    { id: "firefox", name: "Firefox", icon: <I.FirefoxIcon />, window: () => ({ width: 1040, height: 680, title: "New Tab - Mozilla Firefox", content: <Firefox /> }) },
    { id: "editor", name: "Text Editor", icon: <I.TextEditorIcon />, window: () => ({
      width: 720, height: 500, title: "notes.md",
      headerStart: <Btn label="Open">Open<I.Down /></Btn>,
      content: <textarea spellCheck={false} aria-label="notes.md" defaultValue={"# Today\n\n- Review the onboarding flow\n- Reply to the design thread\n- Ship the dock tweaks\n"} style={{ flex: 1, resize: "none", border: 0, outline: 0, padding: "18px 22px", background: "var(--lx-bg)", color: "var(--lx-fg)", font: '15px/1.6 "Ubuntu Mono", ui-monospace, monospace' }} />,
    }) },
    { id: "terminal", name: "Terminal", icon: <I.TerminalIcon />, window: () => ({ width: 720, height: 440, title: "naman@casuro: ~", content: <Terminal /> }) },
    { id: "settings", name: "Settings", icon: <I.SettingsIcon />, window: () => ({ width: 880, height: 580, title: "Appearance", content: null }) },
  ];
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {/* Settings is drawn on every render so it follows Dark Style; the rest show their stored content */}
      <Linux linux={linux} apps={apps} renderWindow={(w) => (w.id === "settings" ? <Settings dark={linux.state.dark} setDark={linux.setDark} /> : w.content)} />
    </div>
  );
}
