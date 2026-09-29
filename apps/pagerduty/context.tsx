import { createContext, useContext, type ReactNode } from "react";
import * as I from "./icons";
import type { IncidentStatus, PagerDutyIncident, PagerDutyTimelineEntry, Priority, Urgency } from "./types";
import type { PagerDutyAccount } from "./use-pagerduty";

// What every part of <PagerDuty> reads: the account, and the bits of screen
// state the parts share (which menu is open, the phone nav). Plus the small
// pieces drawn everywhere: avatars, status badges, urgency and priority tags,
// and the people menu.

/** The open menu: the avatar's, the drawer's Reassign or Add Responders, or the bulk bar's Reassign. */
export type Menu = "me" | "reassign" | "responders" | "bulk" | null;

export interface PagerDutyUI {
  pagerduty: PagerDutyAccount;
  renderCustom?: (entry: PagerDutyTimelineEntry, incident: PagerDutyIncident) => ReactNode;
  menu: Menu;
  setMenu: (menu: Menu) => void;
  /** The phone layout's nav menu. */
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
}

export const PagerDutyContext = createContext<PagerDutyUI | null>(null);

export function useUI() {
  const ui = useContext(PagerDutyContext);
  if (!ui) throw new Error("PagerDuty parts must be inside <PagerDuty>");
  return ui;
}

/** A person's picture, or their initials. `size` is "sm" (20px), "" (24px) or "lg" (36px). */
export function Avatar({ id, size = "" }: { id: string; size?: "sm" | "lg" | "" }) {
  const p = useUI().pagerduty.people[id];
  const className = size ? `av ${size}` : "av";
  if (!p) return <span className={className}>?</span>;
  return p.photo ? (
    <span className={className}>
      <img src={p.photo} alt="" />
    </span>
  ) : (
    <span className={className} style={{ background: p.color }}>
      {p.initials}
    </span>
  );
}

/** A face and a name. */
export function Who({ id, size = "sm" }: { id: string; size?: "sm" | "" }) {
  const p = useUI().pagerduty.people[id];
  return (
    <span className="who">
      <Avatar id={id} size={size} />
      {p?.name ?? id}
    </span>
  );
}

const STATUS: Record<IncidentStatus, string> = { triggered: "Triggered", acknowledged: "Acknowledged", resolved: "Resolved" };

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`status ${status}`}>
      {status === "triggered" ? <I.Alert /> : <I.Check />}
      {STATUS[status]}
    </span>
  );
}
export const statusLabel = (s: IncidentStatus) => STATUS[s];

export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`urgency ${urgency}`}>
      {urgency === "high" ? <I.Up /> : <I.Down />}
      {urgency === "high" ? "High" : "Low"}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: Priority | null }) {
  return priority ? <span className={`prio ${priority}`}>{priority}</span> : <span className="muted">-</span>;
}

/** A menu of everyone, less `exclude`, that calls `pick` with a person id. */
export function PeopleMenu({ label, exclude = [], pick }: { label: string; exclude?: string[]; pick: (id: string) => void }) {
  const { pagerduty } = useUI();
  return (
    <div className="pop people-pop" role="menu" aria-label={label}>
      <div className="lbl">{label}</div>
      {Object.values(pagerduty.people)
        .filter((p) => !exclude.includes(p.id))
        .map((p) => (
          <button key={p.id} role="menuitem" aria-label={`${label}: ${p.name}`} onClick={() => pick(p.id)}>
            <Avatar id={p.id} size="sm" />
            {p.name}
            {p.id === pagerduty.me ? <span className="sub">You</span> : null}
          </button>
        ))}
    </div>
  );
}
