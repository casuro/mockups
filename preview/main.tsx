import { StrictMode, type JSX } from "react";
import { createRoot } from "react-dom/client";

// /preview/?app=slack: an app's React version with its mockup's sample data.
// Every preview/<app>.tsx that exports a `...Preview` component is listed
// here by file name, so adding an app never means editing this file. Only the
// app asked for is loaded, so no other kit's styles or fonts reach its page.
const loaders = import.meta.glob<Record<string, unknown>>(["./*.tsx", "!./main.tsx"]);
const names = Object.keys(loaders).map((path) => path.slice(2, -4)).sort();

const name = new URLSearchParams(location.search).get("app") ?? "slack";
const root = createRoot(document.getElementById("root")!);
const missing = () => root.render(<p>No preview for "{name}". Try one of: {names.join(", ")}.</p>);

const load = loaders[`./${name}.tsx`];
if (!load) missing();
else
  load().then((mod) => {
    const App = Object.entries(mod).find(([key, value]) => key.endsWith("Preview") && typeof value === "function")?.[1] as
      | (() => JSX.Element)
      | undefined;
    if (!App) return missing();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
