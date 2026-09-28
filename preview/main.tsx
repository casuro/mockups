import { StrictMode, type JSX } from "react";
import { createRoot } from "react-dom/client";

// /preview/?app=slack: an app's React version with its mockup's sample data.
// Every preview/<app>.tsx that exports a `...Preview` component is listed
// here by file name, so adding an app never means editing this file.
const modules = import.meta.glob<Record<string, unknown>>(["./*.tsx", "!./main.tsx"], { eager: true });
const apps: Record<string, () => JSX.Element> = {};
for (const [path, mod] of Object.entries(modules)) {
  const preview = Object.entries(mod).find(([name, value]) => name.endsWith("Preview") && typeof value === "function");
  if (preview) apps[path.slice(2, -4)] = preview[1] as () => JSX.Element;
}

const name = new URLSearchParams(location.search).get("app") ?? "slack";
const App = apps[name];

createRoot(document.getElementById("root")!).render(
  <StrictMode>{App ? <App /> : <p>No preview for "{name}". Try one of: {Object.keys(apps).sort().join(", ")}.</p>}</StrictMode>
);
