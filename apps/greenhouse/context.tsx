import { createContext, useContext } from "react";
import type { GreenhouseCandidate } from "./types";
import type { GreenhouseApp } from "./use-greenhouse";
import { colorFor, initialsOf } from "./use-greenhouse";

// What every part of <Greenhouse> reads: the app, and the two kinds of
// avatar (staff with photos, candidates with initials on a color).

export interface GreenhouseUI {
  greenhouse: GreenhouseApp;
}

export const GreenhouseContext = createContext<GreenhouseUI | null>(null);

export function useUI() {
  const ui = useContext(GreenhouseContext);
  if (!ui) throw new Error("Greenhouse parts must be inside <Greenhouse>");
  return ui;
}

const size = (s?: "sm" | "lg") => `av${s ? ` ${s}` : ""}`;

/** A staff member's photo, or their initials on their color. */
export function StaffAvatar({ id, size: s }: { id: string; size?: "sm" | "lg" }) {
  const p = useUI().greenhouse.staff[id];
  if (!p) return null;
  return p.photo ? (
    <img className={size(s)} src={p.photo} alt={p.name} />
  ) : (
    <span className={size(s)} style={{ background: p.color }} role="img" aria-label={p.name}>
      {p.initials}
    </span>
  );
}

/** A candidate's initials on a color (or their photo, when they have one). */
export function CandidateAvatar({ c, size: s }: { c: GreenhouseCandidate; size?: "sm" | "lg" }) {
  return c.photo ? (
    <img className={size(s)} src={c.photo} alt="" />
  ) : (
    <span className={size(s)} style={{ background: c.color ?? colorFor(c.id) }}>
      {c.initials ?? initialsOf(c.name)}
    </span>
  );
}
