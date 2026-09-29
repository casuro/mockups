import { PLACEHOLDER_APPS, Windows, useWindows } from "../desktops/windows";

// desktops/windows.html's desktop, driving the React kit: the same Start,
// taskbar and placeholder windows (File Explorer, Edge, Notepad, Terminal,
// Settings), with Naman signed in.

export function WindowsPreview() {
  const desktop = useWindows({
    onEvent(event) {
      if (event.type === "power") console.info("Sleep from Start");
    },
  });
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Windows desktop={desktop} apps={PLACEHOLDER_APPS} user={{ name: "Naman Shukla" }} />
    </div>
  );
}
