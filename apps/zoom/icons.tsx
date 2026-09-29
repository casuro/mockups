import { useId, type ReactNode, type SVGProps } from "react";

// Zoom's outlined icons, as drawn in apps/zoom.html. Decorative: the button
// around each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function S(d: ReactNode, strokeWidth = 1.7) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}
function F(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" {...props}>
        {d}
      </svg>
    );
  };
}

export const Search = S(<><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>);
export const ChevDown = S(<path d="M6 9l6 6 6-6" />, 2);
export const ChevUp = S(<path d="M6 15l6-6 6 6" />, 2.2);
export const Close = S(<path d="M6 6l12 12M18 6L6 18" />, 1.9);
export const Plus = S(<path d="M12 5v14M5 12h14" />, 2);
export const Check = S(<path d="M5 12.5l4.5 4.5L19 7.5" />, 2.2);
export const Video = S(<><rect x="2.8" y="6" width="13" height="12" rx="2.6" /><path d="M15.8 10.3l4.4-2.8c.4-.3.9 0 .9.5v8c0 .5-.5.8-.9.5l-4.4-2.8" /></>);
export const VideoOff = S(<><path d="M15.8 13v2.4c0 1.4-1.2 2.6-2.6 2.6H5.4c-1.4 0-2.6-1.2-2.6-2.6V8.6C2.8 7.2 4 6 5.4 6h1.4M10.6 6h2.6c1.4 0 2.6 1.2 2.6 2.6v1.7l4.4-2.8c.4-.3.9 0 .9.5v8c0 .5-.5.8-.9.5" /><path d="M3 3l18 18" strokeWidth="1.9" /></>);
export const Mic = S(<><rect x="8.8" y="3" width="6.4" height="11.5" rx="3.2" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>);
export const MicOff = S(<><path d="M15.2 10.5V6.2a3.2 3.2 0 0 0-6-1.5M8.8 9v2.3a3.2 3.2 0 0 0 5.2 2.5M5.5 11.5a6.5 6.5 0 0 0 10.4 5.2M18.3 13.2c.1-.5.2-1.1.2-1.7M12 18v3" /><path d="M3.5 3.5l17 17" strokeWidth="1.9" /></>);
export function MicLevel(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" {...props}>
      <rect x="8.8" y="3" width="6.4" height="11.5" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect className="fill" x="9.9" y="8" width="4.2" height="5.4" rx="1.6" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
export const Headphones = S(<><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3.5" y="14" width="4" height="6" rx="1.5" /><rect x="16.5" y="14" width="4" height="6" rx="1.5" /></>);
export const Shield = S(<path d="M12 3l7.5 3v5.3c0 4.7-3.2 8.4-7.5 9.7-4.3-1.3-7.5-5-7.5-9.7V6z" />);
export const ShieldCheck = F(<><path d="M12 2.2l8 3.2v5.9c0 5-3.4 9.1-8 10.5-4.6-1.4-8-5.5-8-10.5V5.4z" /><path d="M8.2 12.1l2.6 2.6 5-5" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>);
export const People = S(<><circle cx="9" cy="8.5" r="3.3" /><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><circle cx="16.5" cy="7.5" r="2.6" /><path d="M16.5 12.6c2.4 0 4.2 1.4 4.6 4" /></>);
export const Chat = S(<path d="M20.5 11.6c0 4.2-3.8 7.4-8.5 7.4-1.2 0-2.4-.2-3.4-.6L3.5 20l1.3-3.8c-.8-1.3-1.3-2.9-1.3-4.6C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z" />);
export const ArrowUp = S(<path d="M12 18V6M6.5 11.5L12 6l5.5 5.5" />, 2.4);
export const CC = S(<><rect x="2.8" y="5" width="18.4" height="14" rx="2.6" /><path d="M10.4 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6" /></>);
export const Smile = S(<><circle cx="11" cy="12.5" r="8" /><path d="M7.8 14.5c.8 1.3 1.9 2 3.2 2s2.4-.7 3.2-2M8.5 10.3h.01M13.5 10.3h.01" strokeWidth="2" /><path d="M19.5 2.5v5M17 5h5" strokeWidth="1.8" /></>);
export const SmileS = S(<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14c.8 1.4 2 2.1 3.5 2.1s2.7-.7 3.5-2.1M9 9.6h.01M15 9.6h.01" strokeWidth="2" /></>);
export const Apps = S(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><path d="M17 13.5v7M13.5 17h7" /></>);
export const Whiteboard = S(<><rect x="3" y="4" width="18" height="12.5" rx="2" /><path d="M8 20.5l2.2-4M16 20.5l-2.2-4M7 12.5l3-3 2.5 2.5 4-4.5" /></>);
export const Dots = F(<><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></>);
export const Grid = S(<><rect x="3.5" y="4.5" width="7.5" height="6.5" rx="1.4" /><rect x="13" y="4.5" width="7.5" height="6.5" rx="1.4" /><rect x="3.5" y="13" width="7.5" height="6.5" rx="1.4" /><rect x="13" y="13" width="7.5" height="6.5" rx="1.4" /></>);
export const Fullscreen = S(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const ExitFullscreen = S(<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />);
export const Copy = S(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>);
export const Trash = S(<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5c.1.8.7 1.5 1.5 1.5h6c.8 0 1.4-.7 1.5-1.5l1-12.5M10 11v6M14 11v6" />);
export const Cloud = S(<path d="M7 18.5h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.5 9.2 4.7 4.7 0 0 0 7 18.5z" />);
export const Computer = S(<><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8.5 20h7M12 16.5V20" /></>);
export const Pause = F(<><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></>);
export const Play = F(<path d="M7 4.8v14.4c0 .8.9 1.3 1.5.8l11-7.2c.6-.4.6-1.2 0-1.6l-11-7.2C7.9 3.5 7 4 7 4.8z" />);
export const Stop = F(<rect x="6" y="6" width="12" height="12" rx="2" />);
export const Pen = S(<><path d="M4 20l1.2-4.4L15.5 5.3a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z" /><path d="M13.8 7l3.2 3.2" /></>);
export const Send = F(<path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.4-1.1 1.1L5 11l8 1-8 1-2.7 6.3c-.3.7.4 1.4 1.1 1.1z" />);
export const File = S(<><path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" /><path d="M14 3.5v5h5" /></>);
export const Bg = S(<><rect x="3" y="4.5" width="18" height="15" rx="2.2" /><circle cx="12" cy="10.5" r="2.8" /><path d="M6.5 19.5c.8-2.8 3-4.5 5.5-4.5s4.7 1.7 5.5 4.5" /></>);
export const PersonAdd = S(<><circle cx="9.5" cy="8" r="3.5" /><path d="M3 19.5c.6-3.4 3.2-5.5 6.5-5.5 1.5 0 2.8.4 3.9 1.1M18 14v6M15 17h6" /></>);
export const Info = S(<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.1" strokeWidth="2" /></>);
export const Pin = S(<path d="M9 3.5h6M10 3.5v5.5L7 12.5h10L14 9V3.5M12 12.5V20.5" />);
export const Star = S(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />);
export const Cursor = S(<path d="M5 3.5l13 7.2-5.8 1.5-2.6 5.6z" />);
export const Eraser = S(<path d="M8.5 20h11M4.7 15.3l9.9-9.9a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8L10 18.4a2 2 0 0 1-1.4.6H7.3a2 2 0 0 1-1.4-.6l-1.2-1.2a1.4 1.4 0 0 1 0-1.9zM9 11l4.5 4.5" />);
export const Undo = S(<><path d="M8.5 5L4 9.5 8.5 14" /><path d="M4 9.5h10a6 6 0 0 1 0 12h-3" /></>);
export const Download = S(<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15" />);
export const Sticky = S(<><path d="M5 4h14v10l-5 6H5z" /><path d="M14 20v-6h5" /></>);
export const Volume = S(<><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>);
export const Note = S(<><path d="M6 3.5h9l4 4v13H6z" /><path d="M9 11h7M9 14.5h7M9 18h4" /></>);
export const Poll = S(<path d="M5 20V11M12 20V5M19 20v-7" />, 2);
export const Timer = S(<><circle cx="12" cy="13.5" r="7" /><path d="M12 10v3.5l2 1.5M9.5 3h5" /></>);
export const Bot = S(<><rect x="4.5" y="8" width="15" height="11" rx="3" /><path d="M12 4.5V8M9 13h.01M15 13h.01" strokeWidth="2" /></>);
export const Docs = S(<><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" /><path d="M9 12h6M9 15.5h6" /></>);
export const Sparkle = S(<path d="M12 4l1.8 4.6L18.5 10l-4.7 1.6L12 16l-1.8-4.4L5.5 10l4.7-1.4z" />);
export function RecordDot({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" fill={on ? "#ff4d4d" : "currentColor"} />
    </svg>
  );
}

/** Icons an app in the Apps panel can use, by name. */
export const APP_ICONS = { notes: Note, poll: Poll, docs: Docs, timer: Timer, bot: Bot, apps: Apps, whiteboard: Whiteboard, sparkle: Sparkle } as const;

/** Zoom's logo (thesvg.org), with gradient ids unique to each copy. */
export function ZoomLogo() {
  const id = `zl${useId().replace(/:/g, "")}`;
  const stops: [string, string][] = [[".00006%", "#0845BF"], ["19.11%", "#0950DE"], ["38.23%", "#0B59F6"], ["50%", "#0B5CFF"], ["67.32%", "#0E5EFE"], ["77.74%", "#1665FC"], ["86.33%", "#246FF9"], ["93.88%", "#387FF4"], ["100%", "#4F90EE"]];
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="256" height="256" preserveAspectRatio="xMidYMid" viewBox="0 0 256 256">
      <defs>
        <linearGradient id={id} x1="23.666%" x2="76.334%" y1="95.6118%" y2="4.3882%">
          {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M256 128c0 13.568-1.024 27.136-3.328 40.192-6.912 43.264-41.216 77.568-84.48 84.48C155.136 254.976 141.568 256 128 256c-13.568 0-27.136-1.024-40.192-3.328-43.264-6.912-77.568-41.216-84.48-84.48C1.024 155.136 0 141.568 0 128c0-13.568 1.024-27.136 3.328-40.192 6.912-43.264 41.216-77.568 84.48-84.48C100.864 1.024 114.432 0 128 0c13.568 0 27.136 1.024 40.192 3.328 43.264 6.912 77.568 41.216 84.48 84.48C254.976 100.864 256 114.432 256 128Z" />
      <path fill="#FFF" d="M204.032 207.872H75.008c-8.448 0-16.64-4.608-20.48-12.032-4.608-8.704-2.816-19.2 4.096-26.112l89.856-89.856H83.968c-17.664 0-32-14.336-32-32h118.784c8.448 0 16.64 4.608 20.48 12.032 4.608 8.704 2.816 19.2-4.096 26.112l-89.6 90.112h74.496c17.664 0 32 14.08 32 31.744Z" />
    </svg>
  );
}
