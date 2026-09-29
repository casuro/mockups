import { useId, type ReactNode, type SVGProps } from "react";

// Windows 11 icons in Fluent style, drawn by hand (as in desktops/windows.html).
// Decorative: the button around each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

/** A gradient id that is safe inside url(#...) and unique per copy. */
function useGid() {
  return "kw" + useId().replace(/[^a-zA-Z0-9]/g, "");
}
function Lin({ id, from, to, x2 = 1, y2 = 1 }: { id: string; from: string; to: string; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}
function line(d: string, strokeWidth = 1.1) {
  return function Glyph(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d={d} />
      </svg>
    );
  };
}
const svg = (props: IconProps, viewBox: string, children: ReactNode) => (
  <svg aria-hidden="true" viewBox={viewBox} {...props}>
    {children}
  </svg>
);

export function StartLogo(props: IconProps) {
  const g = useGid();
  return svg(props, "0 0 24 24", <>
    <defs><Lin id={g} from="#3ccbf4" to="#0067c0" /></defs>
    <path fill={`url(#${g})`} d="M2 2h9.5v9.5H2zM12.5 2H22v9.5h-9.5zM2 12.5h9.5V22H2zM12.5 12.5H22V22h-9.5z" />
  </>);
}
export function ExplorerIcon(props: IconProps) {
  const g = useGid();
  return svg(props, "0 0 24 24", <>
    <defs><Lin id={g} from="#ffd966" to="#f5b52e" x2={0} /></defs>
    <path fill="#e3a21a" d="M2 5.5A1.5 1.5 0 0 1 3.5 4h5.2l2.6 2h9.2A1.5 1.5 0 0 1 22 7.5V18a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18z" />
    <path fill={`url(#${g})`} d="M2 9a1.5 1.5 0 0 1 1.5-1.5h17A1.5 1.5 0 0 1 22 9v9a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18z" />
    <path fill="#1482dc" d="M2 15.5h20V18a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18z" />
  </>);
}
export function EdgeIcon(props: IconProps) {
  const a = useGid(), b = a + "b";
  return svg(props, "0 0 24 24", <>
    <defs><Lin id={a} from="#3fd0f5" to="#0a5fb4" /><Lin id={b} from="#2fa84f" to="#9be15d" y2={0} /></defs>
    <circle cx="12" cy="12" r="10" fill={`url(#${a})`} />
    <path fill={`url(#${b})`} d="M4.2 15.6C5 11 8.6 8.4 12.6 8.4c3.2 0 5.6 1.9 5.6 4.1 0 1.5-1.2 2.2-2.5 2.2h-4.3c.3 2.6 2.6 4.1 5.3 4.1 1.6 0 3.2-.5 4.6-1.4A10 10 0 0 1 4.2 15.6z" />
    <path fill="#fff" fillOpacity=".85" d="M11.3 12.8c.2-1.6 1.2-2.5 2.6-2.5s2.3.9 2.3 2.5z" />
  </>);
}
export function NotepadIcon(props: IconProps) {
  const g = useGid();
  return svg(props, "0 0 24 24", <>
    <defs><Lin id={g} from="#6cc4ff" to="#1f7fd6" x2={0} /></defs>
    <rect x="4" y="3" width="16" height="19" rx="2.2" fill={`url(#${g})`} />
    <rect x="6" y="6.5" width="12" height="13.5" rx="1" fill="#fff" />
    <path d="M8.5 10h7M8.5 13h7M8.5 16h4.5" stroke="#8aa4bd" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M8 2v3M12 2v3M16 2v3" stroke="#0f5aa6" strokeWidth="1.6" strokeLinecap="round" />
  </>);
}
export function TerminalIcon(props: IconProps) {
  const g = useGid();
  return svg(props, "0 0 24 24", <>
    <defs><Lin id={g} from="#4a4a4a" to="#1c1c1c" x2={0} /></defs>
    <rect x="2" y="4" width="20" height="16" rx="3" fill={`url(#${g})`} />
    <path d="M6.5 9l3 3-3 3M11.5 15.5h5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </>);
}
export function SettingsIcon(props: IconProps) {
  const g = useGid();
  return svg(props, "0 0 24 24", <>
    <defs><Lin id={g} from="#8d99a8" to="#5a6574" /></defs>
    <g fill={`url(#${g})`}>
      <circle cx="12" cy="12" r="7.4" />
      {[0, 45, 90, 135].map((r) => <rect key={r} x="10.3" y="1.6" width="3.4" height="20.8" rx="1" transform={`rotate(${r} 12 12)`} />)}
    </g>
    <circle cx="12" cy="12" r="3.6" fill="#1f86dc" />
    <circle cx="12" cy="12" r="1.7" fill="#e8f3ff" />
  </>);
}
export function FolderIcon({ color = "#f5b52e", ...props }: IconProps & { color?: string }) {
  return svg(props, "0 0 16 16", <>
    <path fill={color} d="M1.5 4a1 1 0 0 1 1-1h3.3l1.4 1.3h6.3a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />
    <path fill="#fff" fillOpacity=".28" d="M1.5 6h13v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />
  </>);
}

export const Search = line("M10.4 10.4l4 4M11.6 6.8a4.8 4.8 0 1 1-9.6 0 4.8 4.8 0 0 1 9.6 0z", 1.3);
export const Back = line("M13.5 8h-11M7 3.5L2.5 8 7 12.5");
export const Forward = line("M2.5 8h11M9 3.5L13.5 8 9 12.5");
export const Up = line("M8 13.5v-11M3.5 7L8 2.5 12.5 7");
export const Refresh = line("M13.5 8A5.5 5.5 0 1 1 11.7 3.9M12 1.2v3h-3");
export const Home = line("M2.5 7L8 2.5 13.5 7v6.5h-4v-4h-3v4h-4z");
export const Chevron = line("M6 3.5L10.5 8 6 12.5");
export const Power = line("M8 1.5v6M4.6 3.6a5.6 5.6 0 1 0 6.8 0", 1.2);
export const Mode = line("M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 2v12");
export const Picture = line("M1.5 4a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 14.5 4v8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 12zM1.5 11l4-4 3 3 2-2 4 4");
export const Wifi = line("M1.6 6.2a9.2 9.2 0 0 1 12.8 0M3.8 8.6a6 6 0 0 1 8.4 0M6 11a2.8 2.8 0 0 1 4 0M8 13.2h.01", 1.2);
export const Volume = line("M2 6h2.4L8 3v10L4.4 10H2zM10.5 5.6a3.4 3.4 0 0 1 0 4.8M12.4 3.8a6 6 0 0 1 0 8.4", 1.2);
export function Battery(props: IconProps) {
  return svg(props, "0 0 16 16", <>
    <rect x="1.5" y="4.5" width="11.5" height="7" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <rect x="3" y="6" width="6.4" height="4" rx=".6" fill="currentColor" />
    <path d="M14.4 6.8v2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </>);
}

// Caption buttons (10px, 1px strokes like Segoe Fluent Icons)
const cap = (children: ReactNode) => (props: IconProps) => svg({ fill: "none", stroke: "currentColor", ...props }, "0 0 10 10", children);
export const Minimize = cap(<path d="M0 5.5h10" />);
export const Maximize = cap(<rect x=".5" y=".5" width="9" height="9" rx="1.2" />);
export const RestoreDown = cap(<><rect x=".5" y="2.5" width="7" height="7" rx="1" /><path d="M2.5 2.5v-.8A1.2 1.2 0 0 1 3.7.5h4.6a1.2 1.2 0 0 1 1.2 1.2v4.6a1.2 1.2 0 0 1-1.2 1.2h-.8" /></>);
export const Close = cap(<path d="M.6.6l8.8 8.8M9.4.6L.6 9.4" strokeLinecap="round" />);
