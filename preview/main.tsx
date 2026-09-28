import { StrictMode, type JSX } from "react";
import { createRoot } from "react-dom/client";
import { SlackPreview } from "./slack";

// /preview/?app=slack: an app's React version with its mockup's sample data.
const apps: Record<string, () => JSX.Element> = { slack: SlackPreview };
const name = new URLSearchParams(location.search).get("app") ?? "slack";
const App = apps[name];

createRoot(document.getElementById("root")!).render(
  <StrictMode>{App ? <App /> : <p>No preview for "{name}". Try one of: {Object.keys(apps).join(", ")}.</p>}</StrictMode>
);
