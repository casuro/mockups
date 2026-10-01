import { AppTile, TILED } from "./tile";

// The desktop's own drawings: app icons for the Dock (100x100 squares drawn
// edge to edge on a tile) and the menu bar's glyphs. Plain SVG, no assets.

export function Apple() {
  return (
    <svg viewBox="0 0 814 1000" aria-hidden="true">
      <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

export const Wifi = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 15.6a1.5 1.5 0 1 1 0 .01zM5.7 11.7a6.1 6.1 0 0 1 8.6 0l-1.3 1.3a4.3 4.3 0 0 0-6 0zM3 9a9.9 9.9 0 0 1 14 0l-1.3 1.3a8.1 8.1 0 0 0-11.4 0zM.4 6.3a13.6 13.6 0 0 1 19.2 0L18.3 7.6a11.8 11.8 0 0 0-16.6 0z" />
  </svg>
);

export const Battery = () => (
  <svg className="batt" viewBox="0 0 27 13" fill="none" aria-hidden="true">
    <rect x=".6" y=".6" width="22.8" height="11.8" rx="3.4" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.1" />
    <rect x="2.2" y="2.2" width="16.9" height="8.6" rx="2" fill="currentColor" />
    <path d="M24.8 4.4v4.2c.9-.3 1.5-1.1 1.5-2.1s-.6-1.8-1.5-2.1z" fill="currentColor" fillOpacity=".45" />
  </svg>
);

export const ControlCenter = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2.5" y="4" width="15" height="5" rx="2.5" />
    <circle cx="6" cy="6.5" r="1.4" fill="currentColor" />
    <rect x="2.5" y="11" width="15" height="5" rx="2.5" />
    <circle cx="14" cy="13.5" r="1.4" fill="currentColor" />
  </svg>
);

/** The close, minimize and zoom glyphs that show on hover. */
export const Close = () => <svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" /></svg>;
export const Minimize = () => <svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1.2 4h5.6" /></svg>;
export const Zoom = () => <svg viewBox="0 0 8 8" aria-hidden="true"><path className="fill" d="M1.5 6.5V2.6l3.9 3.9zM6.5 1.5v3.9L2.6 1.5z" /></svg>;

/** A built-in app icon: its drawing on a tile (`bare`: the drawing alone, like the Trash). */
export function AppIcon({ name, background = TILES[name], bare }: { name: IconName; background?: string; bare?: boolean }) {
  // The drawings carry their own margins, so they go edge to edge.
  return <AppTile tile={bare || background === "none" ? "none" : background} inset={0}>{DRAWINGS[name]}</AppTile>;
}
TILED.add(AppIcon);

const DRAWINGS = {
  finder: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill="#1f8ef1" />
      <path d="M54 0H100V100H55C53 86 52 76 52.5 64H44C43.5 48 50 36 54 0Z" fill="#e9f3fd" />
      <path d="M54 0C50 36 43.5 48 44 64H52.5C52 76 53 86 55 100M31 28V40M69 28V40M21 70C36 82 64 82 79 70" fill="none" stroke="#1b2140" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  safari: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="#1a8cff" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="1 4.34" />
      <path d="M71 29L54.2 54.2 45.8 45.8Z" fill="#ff3b30" />
      <path d="M29 71L54.2 54.2 45.8 45.8Z" fill="#fff" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="28" fill="#fdd22e" />
      <path d="M14 46H86M14 60H86M14 74H86" stroke="#d6d6da" strokeWidth="2" />
    </svg>
  ),
  terminal: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="10" y="14" width="80" height="72" rx="8" fill="#111" stroke="#48484c" strokeWidth="2" />
      <path d="M24 38L36 48 24 58M40 60H56" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="33" fill="none" stroke="#5c5c61" strokeWidth="10" strokeDasharray="6.9 6.92" />
      <circle cx="50" cy="50" r="25" fill="#d1d1d6" stroke="#6e6e73" strokeWidth="8" />
      <circle cx="50" cy="50" r="9" fill="#7c7c81" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M20 20L27 92Q28 98 35 98H65Q72 98 73 92L80 20Z" fill="#e3e5ea" stroke="#9aa0aa" strokeWidth="1.3" />
      <path d="M30 26L35 92M40 26L42.5 92M50 26V92M60 26L57.5 92M70 26L65 92" stroke="#9aa0aa" strokeWidth="1.3" />
      <ellipse cx="50" cy="20" rx="31" ry="7" fill="#f4f5f7" stroke="#8d929c" strokeWidth="1.4" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 100 80" aria-hidden="true">
      <path d="M4 12a6 6 0 0 1 6-6h24l8 8h48a6 6 0 0 1 6 6v6H4z" fill="#3a9bf0" />
      <rect x="4" y="22" width="92" height="54" rx="6" fill="#62b5ff" />
    </svg>
  ),
};

/** Tile backgrounds that match each drawing ("none": drawn without a tile). */
export const TILES: Record<keyof typeof DRAWINGS, string> = {
  finder: "#1f8ef1",
  safari: "linear-gradient(#fff, #e8e8ed)",
  notes: "#fff",
  terminal: "linear-gradient(#4a4a4e, #1c1c1e)",
  settings: "linear-gradient(#e5e5ea, #a1a1a6)",
  trash: "none",
  folder: "none",
};
export type IconName = keyof typeof DRAWINGS;
