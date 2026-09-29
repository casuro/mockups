import { useState, type CSSProperties } from "react";
import { AppIcon, MacOS, useMacOS, type DockItem, type MacWindowInput } from "../desktops/macos";
import "./macos.css";

// desktops/macos.html's desktop, driving the React version: the same Dock
// and placeholder windows (Finder, Safari, Notes, Terminal, System Settings).

const muted = "var(--text-3)";
const fill: CSSProperties = { position: "absolute", inset: 0, display: "flex" };
const side: CSSProperties = { width: 170, flex: "none", padding: "12px 10px", background: "var(--title)", borderRight: ".5px solid var(--sep)" };

function Finder({ trash }: { trash?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const files = trash ? [] : ["Casuro", "Contracts", "Q4 Roadmap", "Receipts"];
  return (
    <div style={fill}>
      <aside style={side}>
        <div style={{ fontSize: 11, fontWeight: 600, color: muted, margin: "0 8px 6px" }}>Favorites</div>
        {["Recents", "Applications", "Desktop", "Documents", "Downloads"].map((p) => (
          <div key={p} style={{ padding: "4px 8px", borderRadius: 6, background: !trash && p === "Documents" ? "rgba(127,127,127,.18)" : undefined }}>{p}</div>
        ))}
      </aside>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", alignContent: "start", gap: 14, padding: 18 }}>
        {files.length ? files.map((f) => (
          <button key={f} onClick={() => setSel(f)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ width: 62, height: 56, padding: 6, borderRadius: 10, background: sel === f ? "rgba(127,127,127,.18)" : undefined }}><AppIcon name="folder" bare /></span>
            <span style={{ padding: "0 5px", borderRadius: 4, background: sel === f ? "var(--accent)" : undefined, color: sel === f ? "#fff" : undefined }}>{f}</span>
          </button>
        )) : <p style={{ gridColumn: "1 / -1", textAlign: "center", color: muted, marginTop: "16%" }}>Trash is empty</p>}
      </div>
    </div>
  );
}

function Safari() {
  const favs: [string, string][] = [["Casuro", "#1d1d1f"], ["Apple", "#8e8e93"], ["GitHub", "#24292f"], ["Figma", "#a259ff"]];
  return (
    <div style={{ padding: "36px 44px" }}>
      <div style={{ height: 30, maxWidth: 460, margin: "0 auto 32px", borderRadius: 9, background: "rgba(127,127,127,.14)", display: "grid", placeItems: "center" }}>casuro.com</div>
      <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>Favorites</h2>
      <div style={{ display: "flex", gap: 22 }}>
        {favs.map(([n, c]) => (
          <span key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, fontSize: 11.5 }}>
            <b style={{ width: 64, height: 64, borderRadius: 14, background: c, color: "#fff", display: "grid", placeItems: "center", fontSize: 26 }}>{n[0]}</b>{n}
          </span>
        ))}
      </div>
    </div>
  );
}

const NOTES = ["Q4 planning\n\n- Ship the desktop mockups\n- Hire two engineers\n- Customer interviews every week", "Interview loop\n\nSystem design, then a pairing session.", "Groceries\n\nCoffee beans, oat milk, bananas"];
function Notes() {
  const [cur, setCur] = useState(0);
  return (
    <div style={fill}>
      <aside style={side}>
        {NOTES.map((n, i) => (
          <button key={i} onClick={() => setCur(i)} style={{ display: "block", width: "100%", padding: "7px 10px", borderRadius: 8, background: i === cur ? "#ffd52e" : undefined, color: i === cur ? "#1d1d1f" : undefined }}>
            <b>{n.split("\n")[0]}</b>
          </button>
        ))}
      </aside>
      <div style={{ flex: 1, padding: "24px 32px", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.55 }}>{NOTES[cur]}</div>
    </div>
  );
}

function Terminal() {
  const [lines, setLines] = useState([`Last login: ${new Date().toDateString()} on ttys000`]);
  const [input, setInput] = useState("");
  const PS1 = "naman@MacBook-Pro ~ % ";
  const run = (cmd: string) => ({ ls: "Desktop    Documents  Downloads  Projects", pwd: "/Users/naman", whoami: "naman" } as Record<string, string>)[cmd] ?? (cmd ? `zsh: command not found: ${cmd}` : "");
  return (
    <div style={{ padding: "6px 10px", minHeight: "100%", font: '12.5px/1.45 ui-monospace, "SF Mono", Menlo, monospace', userSelect: "text" }}>
      {lines.map((l, i) => <div key={i} style={{ whiteSpace: "pre-wrap" }}>{l}</div>)}
      <div style={{ display: "flex" }}>
        <span style={{ whiteSpace: "pre" }}>{PS1}</span>
        <input aria-label="Command" value={input} autoFocus spellCheck={false} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { const out = run(input.trim()); setLines((l) => [...l, PS1 + input, ...(out ? [out] : [])]); setInput(""); } }}
          style={{ flex: 1, border: 0, outline: 0, background: "none", font: "inherit", color: "inherit", padding: 0 }} />
      </div>
    </div>
  );
}

function Settings({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  const rows: [string, string][] = [["Wi-Fi", "Casuro"], ["Bluetooth", "On"], ["Account", "Naman Shukla"], ["macOS", "Tahoe 26.0"]];
  const row: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 40, borderTop: ".5px solid var(--sep)" };
  return (
    <div style={{ padding: 20 }}>
      <div style={{ borderRadius: 10, background: "rgba(127,127,127,.1)", padding: "2px 12px" }}>
        <div style={{ ...row, borderTop: 0 }}>Appearance
          <button onClick={toggle} style={{ padding: "4px 12px", borderRadius: 6, background: "var(--accent)", color: "#fff" }}>{dark ? "Dark" : "Light"}</button>
        </div>
        {rows.map(([a, b]) => <div key={a} style={row}>{a}<span style={{ color: muted }}>{b}</span></div>)}
      </div>
    </div>
  );
}

const WINDOWS: Record<string, MacWindowInput> = {
  finder: { id: "finder", title: "Documents", app: "Finder", dockId: "finder", width: 740, height: 440 },
  safari: { id: "safari", title: "casuro.com", app: "Safari", dockId: "safari", width: 860, height: 520 },
  notes: { id: "notes", title: "Notes", dockId: "notes", width: 700, height: 440 },
  terminal: { id: "terminal", title: "naman - -zsh - 80x24", app: "Terminal", dockId: "terminal", width: 600, height: 360 },
  settings: { id: "settings", title: "System Settings", dockId: "settings", width: 560, height: 340 },
};

export function MacOSPreview() {
  const mac = useMacOS({ windows: [WINDOWS.finder, WINDOWS.notes], onEvent: (e) => console.debug("macos", e) });
  const dock: DockItem[] = (["finder", "safari", "notes", "terminal", "settings"] as const).map((id) => ({
    id, name: id === "settings" ? "System Settings" : WINDOWS[id].app ?? WINDOWS[id].title, icon: <AppIcon name={id} />, onOpen: () => mac.open(WINDOWS[id]),
  }));
  const dark = mac.state.theme === "dark";
  return (
    <div style={{ height: "100vh" }}>
      <MacOS mac={mac} dock={dock} onTrash={() => mac.open({ id: "trash", title: "Trash", app: "Finder", dockId: "finder", width: 600, height: 380 })}
        renderWindow={(w) => (
          <div className="mac-sample">
            {w.id === "finder" ? <Finder /> : w.id === "trash" ? <Finder trash /> : w.id === "safari" ? <Safari /> : w.id === "notes" ? <Notes />
              : w.id === "terminal" ? <Terminal /> : <Settings dark={dark} toggle={() => mac.setTheme(dark ? "light" : "dark")} />}
          </div>
        )} />
    </div>
  );
}
