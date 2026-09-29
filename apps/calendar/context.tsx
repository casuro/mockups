import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { CalendarEntry } from "./types";
import type { GoogleCalendarApp } from "./use-google-calendar";

// What every part of <GoogleCalendar> reads: the calendar, whether the box
// is narrow, and the bits of screen state the parts share (the side panel,
// the quick-create draft, the view menu).

/** A new event being made in the quick-create popover. */
export interface Draft {
  date: string;
  /** Start hour; it lasts an hour. */
  s: number;
  title: string;
  /** Made by clicking the grid: shows as a ghost event there. */
  ghost: boolean;
  /** Where the popover points, relative to the root. */
  anchor: DOMRect | null;
}

export interface CalendarUI {
  calendar: GoogleCalendarApp;
  root: RefObject<HTMLDivElement | null>;
  /** The box is phone-width: three days, a drawer for the side panel. */
  narrow: boolean;
  renderDetails?: (entry: CalendarEntry) => ReactNode;
  draft: Draft | null;
  setDraft: (next: Draft | null | ((d: Draft | null) => Draft | null)) => void;
  toggleSide: () => void;
  closeDrawer: () => void;
  openViews: (anchor: HTMLElement) => void;
  /** Where the time grid was scrolled, kept while the month view is up. */
  scrollTop: RefObject<number>;
}

export const CalendarContext = createContext<CalendarUI | null>(null);

export function useUI() {
  const ui = useContext(CalendarContext);
  if (!ui) throw new Error("GoogleCalendar parts must be inside <GoogleCalendar>");
  return ui;
}

/** A person's photo, or their initial on a colored circle. Outside guests (an email, no person) get the email's first letter. */
export function Avatar({ id, email, className }: { id?: string; email?: string; className?: string }) {
  const people = useUI().calendar.people;
  const p = id ? people[id] : undefined;
  if (p?.photo) return <img className={className} src={p.photo} alt="" />;
  const letter = p?.initials ?? (email ?? "?").charAt(0).toUpperCase();
  return (
    <span className={`ini${className ? ` ${className}` : ""}`} style={p ? { background: p.color } : undefined} aria-hidden="true">
      {letter}
    </span>
  );
}
