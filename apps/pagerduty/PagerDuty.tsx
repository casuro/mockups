import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PagerDutyContext, useUI, type Menu, type PagerDutyUI } from "./context";
import { IncidentDrawer } from "./Incident";
import { IncidentList } from "./IncidentList";
import { TopNav } from "./TopNav";
import type { PagerDutyIncident, PagerDutyTimelineEntry } from "./types";
import type { PagerDutyAccount } from "./use-pagerduty";
import "./pagerduty.css";

// PagerDuty's Incidents page, as in apps/pagerduty.html. Give it an account
// from usePagerDuty(); it fills the box it is put in (give that box a
// height), whether that is the whole screen or one pane of it, and narrows
// to the phone layout when the box is narrow.

export interface PagerDutyProps {
  pagerduty: PagerDutyAccount;
  /** Draws a timeline line's `custom` part: a runbook step, a status page update, anything the kit does not have. */
  renderCustom?: (entry: PagerDutyTimelineEntry, incident: PagerDutyIncident) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function PagerDuty({ pagerduty, renderCustom, className, style }: PagerDutyProps) {
  const [menu, setMenu] = useState<Menu>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [, tick] = useState(0);
  const { state } = pagerduty;

  // "12 min ago" and "Open for" keep moving.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Opening or closing an incident closes the menus.
  useEffect(() => {
    setMenu(null);
    setNavOpen(false);
  }, [state.open]);

  // Esc closes an open menu, then the incident.
  const escape = useRef(() => {});
  escape.current = () => {
    if (menu || navOpen) {
      setMenu(null);
      setNavOpen(false);
    } else if (state.open != null) pagerduty.ui.openIncident(null);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && escape.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: PagerDutyUI = { pagerduty, renderCustom, menu, setMenu, navOpen, setNavOpen };
  const appClass = ["app", pagerduty.current ? "detail-open" : ""].filter(Boolean).join(" ");

  return (
    <PagerDutyContext.Provider value={ui}>
      <div
        className={`kit-pagerduty${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          if (menu && !t.closest(".pop, .me-btn, .wrap, .anchor")) setMenu(null);
          if (navOpen && !t.closest(".mobile-nav, .menu-btn")) setNavOpen(false);
        }}
      >
        <div className={appClass}>
          <TopNav />
          <main className="page" aria-label="Incidents page">
            <IncidentList />
          </main>
          <IncidentDrawer />
        </div>
        <Toast />
      </div>
    </PagerDutyContext.Provider>
  );
}

function Toast() {
  const { pagerduty } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!pagerduty.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2400);
    return () => clearTimeout(t);
  }, [pagerduty.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {pagerduty.notice?.text ?? ""}
    </div>
  );
}
