import { createContext, useContext, type ReactNode, type RefObject } from "react";
import * as I from "./icons";
import type { CalendlyPage } from "./use-calendly";

// What every part of <Calendly> reads: the page, the scrolling box, and the
// small pieces the parts share (the host's picture, a detail row).

export interface CalendlyUI {
  calendly: CalendlyPage;
  /** The box that scrolls: back to the top when the step changes. */
  scroller: RefObject<HTMLDivElement | null>;
  /** Prefix for the form's element ids, so two pages on one screen do not clash. */
  idPrefix: string;
}

export const CalendlyContext = createContext<CalendlyUI | null>(null);

export function useUI() {
  const ui = useContext(CalendlyContext);
  if (!ui) throw new Error("Calendly parts must be inside <Calendly>");
  return ui;
}

/** The host's round picture, or their initials. */
export function Avatar() {
  const { host } = useUI().calendly.seed;
  if (host.photo) return <img className="avatar" src={host.photo} alt="" />;
  const initials = host.name.split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase();
  return (
    <div className="avatar initials" aria-hidden="true">
      {initials}
    </div>
  );
}

/** A row of details: an icon, then text. */
export function Meta({ icon, className, children }: { icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={`meta${className ? ` ${className}` : ""}`}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

/** The event's location icon: Google Meet's logo or a pin. */
export function LocationIcon() {
  return useUI().calendly.seed.event.locationIcon === "pin" ? <I.Pin /> : <I.Meet />;
}
