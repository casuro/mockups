import { useEffect, useState, type CSSProperties } from "react";
import { Pipeline } from "./Board";
import { GreenhouseContext, useUI, type GreenhouseUI } from "./context";
import { Drawer } from "./Drawer";
import { JobHeader, TopNav } from "./Header";
import type { GreenhouseApp } from "./use-greenhouse";
import "./greenhouse.css";

// Greenhouse Recruiting, as in apps/greenhouse.html: a job's pipeline and a
// candidate's drawer. Give it an app from useGreenhouse(); it fills the box
// it is put in (give that box a height), whether that is the whole screen or
// one pane of it, and narrows to the mobile layout when the box is narrow.

export interface GreenhouseProps {
  greenhouse: GreenhouseApp;
  className?: string;
  style?: CSSProperties;
}

export function Greenhouse({ greenhouse, className, style }: GreenhouseProps) {
  const open = greenhouse.state.open;
  const close = greenhouse.ui.close;

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const ui: GreenhouseUI = { greenhouse };
  return (
    <GreenhouseContext.Provider value={ui}>
      <div className={`kit-greenhouse${className ? ` ${className}` : ""}`} style={style} data-theme={greenhouse.state.theme}>
        <div className="page">
          <TopNav />
          <JobHeader />
          <Pipeline />
        </div>
        <Drawer />
        <Toast />
      </div>
    </GreenhouseContext.Provider>
  );
}

function Toast() {
  const { greenhouse } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!greenhouse.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(t);
  }, [greenhouse.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {greenhouse.notice?.text ?? ""}
    </div>
  );
}
