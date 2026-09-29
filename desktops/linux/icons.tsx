import { useId, type ReactNode, type SVGProps } from "react";

// Symbolic icons (Adwaita style) for the shell, and simple Yaru-style app
// icons for the dock. Decorative: the button around each one carries its
// accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function symbolic(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}

export const Wifi = symbolic(<><path d="M1.5 6.2a9.5 9.5 0 0 1 13 0M3.7 8.6a6.3 6.3 0 0 1 8.6 0M5.9 11a3.2 3.2 0 0 1 4.2 0" /><circle cx="8" cy="13.2" r=".9" fill="currentColor" /></>);
export const Volume = symbolic(<><path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" stroke="none" /><path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9" /></>);
export const Battery = symbolic(<><rect x="4.5" y="2.5" width="7" height="12" rx="1.5" /><path d="M6.5 1h3" /><rect x="6" y="7" width="4" height="6" rx=".5" fill="currentColor" stroke="none" /></>);
export const Power = symbolic(<path d="M8 1.8v6M4.4 4a5.3 5.3 0 1 0 7.2 0" />);
export const Bluetooth = symbolic(<path d="m4.5 5 7 6L8 14V2l3.5 3-7 6" />);
export const Moon = symbolic(<path d="M13.5 9.6A5.6 5.6 0 1 1 6.4 2.5a4.5 4.5 0 0 0 7.1 7.1z" />);
export const Gear = symbolic(<><circle cx="8" cy="8" r="2.2" /><path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M3.4 12.6l1.2-1.2M11.4 4.6l1.2-1.2" /></>);
export const Lock = symbolic(<><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5 7V5a3 3 0 0 1 6 0v2" /></>);
export const Minimize = symbolic(<path d="M4.5 8.5h7" />);
export const Maximize = symbolic(<rect x="4.5" y="4.5" width="7" height="7" rx="1" />);
export const Restore = symbolic(<><rect x="4" y="6" width="6" height="6" rx="1" /><path d="M6 4h5a1 1 0 0 1 1 1v5" /></>);
export const Close = symbolic(<path d="m5 5 6 6m0-6-6 6" />);
export const Search = symbolic(<><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" /></>);
export const Back = symbolic(<path d="m10 3-5 5 5 5" />);
export const Forward = symbolic(<path d="m6 3 5 5-5 5" />);
export const Reload = symbolic(<path d="M13.5 8A5.5 5.5 0 1 1 11.6 3.8M12 1.5v3h-3" />);
export const Menu = symbolic(<path d="M2.5 4h11M2.5 8h11M2.5 12h11" />);
export const Grid = symbolic(<><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></>);
export const Plus = symbolic(<path d="M8 3v10M3 8h10" />);
export const Down = symbolic(<path d="m4 6 4 4 4-4" />);
export const Home = symbolic(<path d="M2.5 7.5 8 2.5l5.5 5M4 6.5v7h8v-7" />);
export const Clock = symbolic(<><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>);
export const Star = symbolic(<path d="m8 1.8 1.9 4 4.3.5-3.2 3 .9 4.3L8 11.4l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" />);
export const Doc = symbolic(<path d="M4 1.5h5l3.5 3.5v9.5H4zM9 1.5V5h3.5" />);
export const Download = symbolic(<path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M2.5 13.5h11" />);
export const Picture = symbolic(<><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><circle cx="5.5" cy="6" r="1.2" /><path d="m2 12 4-4 3 3 2-2 3.5 3.5" /></>);
export const Trash = symbolic(<path d="M2.5 4h11M6 4V2.5h4V4M3.8 4l.8 10h6.8l.8-10" />);

export function ShowApps(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" {...props}>
      {[5, 12, 19].map((y) => [5, 12, 19].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.1" />))}
    </svg>
  );
}

// An id safe inside url(#...), whatever characters useId() picks.
const useSvgId = () => "g" + useId().replace(/[^\w-]/g, "");

// App icons, drawn full bleed at 64x64 like Yaru's.
export function FolderIcon(props: IconProps) {
  const g = useSvgId();
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" {...props}>
      <defs><linearGradient id={g} x2="0" y2="1"><stop offset="0" stopColor="#f58a52" /><stop offset="1" stopColor="#e45f25" /></linearGradient></defs>
      <path d="M6 14a4 4 0 0 1 4-4h14.5l5 5H54a4 4 0 0 1 4 4v4H6z" fill="#b8431b" />
      <rect x="6" y="19" width="52" height="37" rx="4" fill={`url(#${g})`} />
    </svg>
  );
}
export function FilesIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" {...props}>
      <rect x="6" y="5" width="52" height="55" rx="9" fill="#dcdcdc" />
      <rect x="11" y="10" width="42" height="21" rx="4.5" fill="#fff" />
      <rect x="11" y="34" width="42" height="21" rx="4.5" fill="#fff" />
      <rect x="24" y="16.5" width="16" height="6" rx="3" fill="#e95420" />
      <rect x="24" y="40.5" width="16" height="6" rx="3" fill="#77216f" />
    </svg>
  );
}
export function FirefoxIcon(props: IconProps) {
  const g = useSvgId();
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" {...props}>
      <defs>
        <radialGradient id={`${g}a`} cx=".35" cy=".35"><stop offset="0" stopColor="#b58cff" /><stop offset="1" stopColor="#3b1d8f" /></radialGradient>
        <linearGradient id={`${g}b`} x2="1" y2="1"><stop offset="0" stopColor="#ffbd4f" /><stop offset=".55" stopColor="#ff7139" /><stop offset="1" stopColor="#e31587" /></linearGradient>
      </defs>
      <circle cx="32" cy="33" r="23" fill={`url(#${g}a)`} />
      <path d="M32 7C21 7 12 13 8.5 22c3-2.5 6.5-3.5 10-3.5-1.5 2-2.3 4.4-2.3 6.8 3.2-3 7.6-4.3 12-3.4 7.4 1.5 12.2 8.6 10.8 16-1.5 7.8-9.2 12.6-17 11 4.6 4.3 11 6.2 17.3 4.8C51 51.3 58.4 41 57 29.7 55.3 16.8 44.6 7 32 7z" fill={`url(#${g}b)`} />
    </svg>
  );
}
export function TextEditorIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" {...props}>
      <rect x="10" y="6" width="44" height="54" rx="6" fill="#fafafa" />
      <path d="M10 12a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v5H10z" fill="#3584e4" />
      <path d="M18 26h28M18 33h22M18 40h26M18 47h16" stroke="#9a9a9a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
export function TerminalIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" {...props}>
      <rect x="6" y="9" width="52" height="46" rx="8" fill="#3d3d3d" />
      <rect x="8" y="11" width="48" height="42" rx="6" fill="#300a24" />
      <path d="m17 25 9 7-9 7M30 40h14" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function SettingsIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="26" fill="#77767b" />
      <path d="M29 12h6l1.2 6.2 4 1.7 5.2-3.6 4.3 4.3-3.6 5.2 1.7 4 6.2 1.2v6l-6.2 1.2-1.7 4 3.6 5.2-4.3 4.3-5.2-3.6-4 1.7L35 52h-6l-1.2-6.2-4-1.7-5.2 3.6-4.3-4.3 3.6-5.2-1.7-4L12 35v-6l6.2-1.2 1.7-4-3.6-5.2 4.3-4.3 5.2 3.6 4-1.7z" fill="#deddda" />
      <circle cx="32" cy="32" r="7" fill="#77767b" />
    </svg>
  );
}

// The Ubuntu-style wallpaper: aubergine into orange, with soft abstract shapes.
export function Wallpaper() {
  const g = useSvgId();
  return (
    <svg aria-hidden="true" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${g}0`} x2="1" y2="1"><stop offset="0" stopColor="#1c0014" /><stop offset=".45" stopColor="#4a0f3d" /><stop offset=".78" stopColor="#9e2a3a" /><stop offset="1" stopColor="#e95420" /></linearGradient>
        <radialGradient id={`${g}1`} cx="1320" cy="880" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#ff8a3d" stopOpacity=".95" /><stop offset=".4" stopColor="#e95420" stopOpacity=".55" /><stop offset="1" stopColor="#e95420" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${g}2`} y1="1" x2="1"><stop offset="0" stopColor="#ff9a52" stopOpacity="0" /><stop offset=".5" stopColor="#ff7a3d" stopOpacity=".55" /><stop offset="1" stopColor="#c7365f" stopOpacity=".15" /></linearGradient>
        <linearGradient id={`${g}3`} x2="1" y2="1"><stop offset="0" stopColor="#a0307a" stopOpacity=".05" /><stop offset=".6" stopColor="#d9445b" stopOpacity=".5" /><stop offset="1" stopColor="#ffb070" stopOpacity=".35" /></linearGradient>
      </defs>
      <rect width="1600" height="1000" fill={`url(#${g}0)`} />
      <rect width="1600" height="1000" fill={`url(#${g}1)`} />
      <path d="M-100 1000C220 760 520 700 800 760s600 40 900-260V1000z" fill={`url(#${g}2)`} />
      <path d="M300 1000c180-300 480-420 780-400s440-160 620-420V1000z" fill={`url(#${g}3)`} opacity=".75" />
      <path d="M-50 820C300 640 640 610 980 650s520-60 700-300" fill="none" stroke="#ffd2a8" strokeOpacity=".18" strokeWidth="3" />
      <g transform="translate(1180 330) rotate(18)" opacity=".2">
        <path d="M0-190 164.5-95v190L0 190-164.5 95v-190z" fill="none" stroke="#ffc49a" strokeWidth="2" />
        <path d="M0-120 104-60v120L0 120-104 60v-120z" fill="#ff8a4a" fillOpacity=".35" />
      </g>
    </svg>
  );
}
