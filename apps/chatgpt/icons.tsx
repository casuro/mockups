import type { ReactNode, SVGProps } from "react";
import type { ChatGPTGlyph } from "./types";

// ChatGPT's icons, as drawn in apps/chatgpt.html. Decorative: the button
// around each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function line(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}
function solid(d: ReactNode, stroke = false) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" {...(stroke ? { stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" as const } : {})} {...props}>
        {d}
      </svg>
    );
  };
}

/** The OpenAI mark (thesvg.org). */
export function Logo(props: IconProps) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 260" {...props}>
      <path fill="currentColor" d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
    </svg>
  );
}

export const Sidebar = line(<><rect x="2.75" y="3.75" width="14.5" height="12.5" rx="3" /><path d="M7.5 3.75v12.5" /></>);
export const NewChat = line(<><path d="M9.5 3.75H6a3 3 0 0 0-3 3v7.5a3 3 0 0 0 3 3h7.5a3 3 0 0 0 3-3V10.5" /><path d="M14.9 3.1a1.6 1.6 0 0 1 2.26 2.26L10.4 12.1 7.6 12.7l.6-2.8z" /></>);
export const Search = line(<><circle cx="9" cy="9" r="5.5" /><path d="m13.2 13.2 3.8 3.8" /></>);
export const Library = line(<><rect x="2.75" y="3.75" width="14.5" height="12.5" rx="3" /><circle cx="7.3" cy="8.2" r="1.4" /><path d="m3 14 4-3.6a1.6 1.6 0 0 1 2.1 0l1.4 1.2 2.1-2a1.6 1.6 0 0 1 2.2 0L17 12" /></>);
export const Explore = line(<><rect x="3" y="3" width="5.5" height="5.5" rx="1.6" /><rect x="11.5" y="3" width="5.5" height="5.5" rx="1.6" /><rect x="3" y="11.5" width="5.5" height="5.5" rx="1.6" /><circle cx="14.25" cy="14.25" r="2.75" /></>);
export const Folder = line(<path d="M2.75 6.25a2 2 0 0 1 2-2h3.1l1.8 2h5.6a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H4.75a2 2 0 0 1-2-2z" />);
export const FolderPlus = line(<><path d="M2.75 6.25a2 2 0 0 1 2-2h3.1l1.8 2h5.6a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H4.75a2 2 0 0 1-2-2z" /><path d="M10 9v5M7.5 11.5h5" /></>);
export const More = solid(<><circle cx="4.5" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="15.5" cy="10" r="1.5" /></>);
export const Share = line(<><path d="M10 12.5V3M6.5 6.25 10 2.75l3.5 3.5" /><path d="M5.5 9H5a2 2 0 0 0-2 2v4.25a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-.5" /></>);
export const Pencil = line(<><path d="M13.3 3.45a1.9 1.9 0 0 1 2.7 2.7L7.2 14.9l-3.45.85.85-3.45z" /><path d="m12 4.8 2.7 2.7" /></>);
export const Archive = line(<><rect x="2.75" y="3.5" width="14.5" height="4" rx="1.2" /><path d="M4 7.5v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7M8.25 10.75h3.5" /></>);
export const Trash = line(<path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 5.5l.75 10a1.6 1.6 0 0 0 1.6 1.5h5.3a1.6 1.6 0 0 0 1.6-1.5l.75-10M8.5 9v4.5M11.5 9v4.5" />);
export const Move = line(<><path d="M2.75 6.25a2 2 0 0 1 2-2h3.1l1.8 2h5.6a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H4.75a2 2 0 0 1-2-2z" /><path d="M8 11.5h4.5M10.8 9.8l1.7 1.7-1.7 1.7" /></>);
export const Plus = line(<path d="M10 4v12M4 10h12" />);
export const Mic = line(<><rect x="7.25" y="2.75" width="5.5" height="9.5" rx="2.75" /><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.25" /></>);
export const Voice = solid(<><rect x="3" y="8" width="2" height="4" rx="1" /><rect x="6.5" y="5.5" width="2" height="9" rx="1" /><rect x="10" y="3" width="2" height="14" rx="1" /><rect x="13.5" y="6.5" width="2" height="7" rx="1" /><rect x="17" y="8.75" width="1.6" height="2.5" rx=".8" /></>);
export function Send(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 15.5V4.75M5.25 9.25 10 4.5l4.75 4.75" />
    </svg>
  );
}
export const Stop = solid(<rect x="6" y="6" width="8" height="8" rx="1.6" />);
export const Copy = line(<><rect x="6.75" y="6.75" width="10" height="10" rx="2.2" /><path d="M13.25 6.75V5.2a2 2 0 0 0-2-2H5.2a2 2 0 0 0-2 2v6.05a2 2 0 0 0 2 2h1.55" /></>);
export const Check = line(<path d="m4.5 10.5 3.5 3.5 7.5-8" />);
const THUMB = "M6.3 8.6 9 3.1a1.9 1.9 0 0 1 2.2 1.9l-.3 2.8h3.6a2 2 0 0 1 1.95 2.4l-1.1 5A2 2 0 0 1 13.4 16.8H6.3zM6.3 8.6H4a1 1 0 0 0-1 1v6.2a1 1 0 0 0 1 1h2.3";
const THUMB_DOWN = "M13.7 11.4 11 16.9a1.9 1.9 0 0 1-2.2-1.9l.3-2.8H5.5a2 2 0 0 1-1.95-2.4l1.1-5A2 2 0 0 1 6.6 3.2h7.1zM13.7 11.4H16a1 1 0 0 0 1-1V4.2a1 1 0 0 0-1-1h-2.3";
export const Up = line(<path d={THUMB} />);
export const UpFill = solid(<path d={`${THUMB}z`} />, true);
export const Down = line(<path d={THUMB_DOWN} />);
export const DownFill = solid(<path d={`${THUMB_DOWN}z`} />, true);
export const Speaker = line(<><path d="M3.5 8a1 1 0 0 1 1-1h2.3l3.7-3.2v12.4L6.8 13H4.5a1 1 0 0 1-1-1z" /><path d="M13.3 7.3a3.8 3.8 0 0 1 0 5.4M15.5 5.2a6.8 6.8 0 0 1 0 9.6" /></>);
export const Regen = line(<><path d="M16.25 10a6.25 6.25 0 1 1-1.83-4.42" /><path d="M16.5 3.5v3.25h-3.25" /></>);
export const ChevDown = line(<path d="m5.5 8 4.5 4.5L14.5 8" />);
export const ChevRight = line(<path d="m8 5.5 4.5 4.5L8 14.5" />);
export const ChevLeft = line(<path d="M12 5.5 7.5 10l4.5 4.5" />);
export const ArrowDown = line(<path d="M10 4v12M5.25 11.25 10 16l4.75-4.75" />);
export const X = line(<path d="M5 5l10 10M15 5 5 15" />);
export const Settings = line(<><circle cx="10" cy="10" r="2.5" /><path d="M10 2.75v1.5M10 15.75v1.5M17.25 10h-1.5M4.25 10h-1.5M15.13 4.87l-1.06 1.06M5.93 14.07l-1.06 1.06M15.13 15.13l-1.06-1.06M5.93 5.93 4.87 4.87" /></>);
export const Help = line(<><circle cx="10" cy="10" r="7.25" /><path d="M7.9 7.8a2.2 2.2 0 1 1 3.1 2c-.6.3-1 .8-1 1.45v.25" /><circle cx="10" cy="14" r=".5" fill="currentColor" /></>);
export const Logout = line(<path d="M8 3.25H5.5a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2H8M12.5 6.5 16 10l-3.5 3.5M16 10H7.5" />);
export const Globe = line(<><circle cx="10" cy="10" r="7.25" /><path d="M2.75 10h14.5M10 2.75c2 2.1 3 4.5 3 7.25s-1 5.15-3 7.25c-2-2.1-3-4.5-3-7.25s1-5.15 3-7.25z" /></>);
export const Research = line(<><circle cx="8.5" cy="8.5" r="5.25" /><path d="m12.5 12.5 4.5 4.5M8.5 5.75v5.5M5.75 8.5h5.5" /></>);
export const Image = line(<><rect x="2.75" y="2.75" width="14.5" height="14.5" rx="3.2" /><circle cx="7.5" cy="7.5" r="1.5" /><path d="m3 14.5 4.2-3.7a1.6 1.6 0 0 1 2.1 0l1.2 1.1 2.4-2.3a1.6 1.6 0 0 1 2.2 0l2.1 2" /></>);
export const Clip = line(<path d="m15.8 9.6-5.9 5.9a3.9 3.9 0 0 1-5.5-5.5l6.3-6.3a2.6 2.6 0 0 1 3.7 3.7l-6.2 6.2a1.3 1.3 0 0 1-1.85-1.85l5.7-5.7" />);
export const Temp = line(<><path d="M4.3 13.9A7.25 7.25 0 1 1 7 16.6" strokeDasharray="2.4 2.4" /><path d="M4.3 13.9 3 17l3.2-.9" /></>);
export const Flag = line(<path d="M4.5 17V3.5M4.5 4h9.2l-1.8 3.5 1.8 3.5H4.5" />);
export const Download = line(<path d="M10 3v9.5M6.25 9 10 12.75 13.75 9M4 16.5h12" />);
export const Chat = line(<path d="M10 3.25c4 0 7.25 2.75 7.25 6.25S14 15.75 10 15.75c-.9 0-1.75-.12-2.55-.36L3.5 16.75l1.2-3.1C3.8 12.6 2.75 11.1 2.75 9.5 2.75 6 6 3.25 10 3.25z" />);
export const Sparkle = line(<><path d="M10 3c.4 3.4 1.6 4.6 5 5-3.4.4-4.6 1.6-5 5-.4-3.4-1.6-4.6-5-5 3.4-.4 4.6-1.6 5-5z" /><path d="M15.5 13.5c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2z" /></>);
export const Code = line(<path d="m7 6-4 4 4 4M13 6l4 4-4 4M11.2 4.5 8.8 15.5" />);
export const Doc = line(<><path d="M11.5 2.75H6a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.25z" /><path d="M11.5 2.75v4.5H16M7 11h6M7 14h4" /></>);
export const Sheet = line(<><rect x="3" y="3" width="14" height="14" rx="2.5" /><path d="M3 8h14M3 12.5h14M8 8v9" /></>);
export const Chart = line(<path d="M3.5 16.5h13M6 13.5v-3M10 13.5V6M14 13.5V9" />);
export const Bulb = line(<path d="M7.5 14.5h5M8.25 17h3.5M10 3a5 5 0 0 0-3 9c.6.45 1 1.1 1 1.9v.1h4v-.1c0-.8.4-1.45 1-1.9A5 5 0 0 0 10 3z" />);
export const Lock = line(<><rect x="4" y="8.5" width="12" height="8.5" rx="2" /><path d="M6.75 8.5V6.25a3.25 3.25 0 0 1 6.5 0V8.5" /></>);
export const Users = line(<><circle cx="7.5" cy="7" r="3" /><path d="M2.5 16.5a5 5 0 0 1 10 0M13 4.3a3 3 0 0 1 0 5.4M14.5 12.2a5 5 0 0 1 3 4.3" /></>);
export const Menu = line(<path d="M3.5 6h13M3.5 10h9M3.5 14h13" />);
export const Info = line(<><circle cx="10" cy="10" r="7.25" /><path d="M10 9.25v4.5" /><circle cx="10" cy="6.6" r=".5" fill="currentColor" /></>);
export const Pin = line(<path d="M12.5 3 17 7.5l-2.2.8-3 3 .4 3.3-1.2 1.2-3-3L4 16l-.1-.1 3.2-4-3-3 1.2-1.2 3.3.4 3-3z" />);
export const EyeOff = line(<path d="M3 3l14 14M8.3 5.2A7.8 7.8 0 0 1 10 5c4.5 0 7.25 5 7.25 5a13 13 0 0 1-2.3 2.9M5.4 6.6A13 13 0 0 0 2.75 10S5.5 15 10 15a7.3 7.3 0 0 0 3.4-.8M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5" />);

/** The glyphs on GPT avatars. */
function glyph(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}
export const GLYPHS: Record<ChatGPTGlyph, (props: IconProps) => ReactNode> = {
  code: glyph(<path d="m8 7-5 5 5 5M16 7l5 5-5 5" />),
  pen: glyph(<><path d="M4 18c3-8 6-12 16-14-2 10-6 13-14 16" /><path d="M4 20 12 12" /></>),
  chart: glyph(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  headset: glyph(<path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4M4 13h4v6H6a2 2 0 0 1-2-2z" />),
  checklist: glyph(<><path d="M9 11l2 2 4-4" /><rect x="4" y="3" width="16" height="18" rx="3" /></>),
  sparkle: glyph(<path d="M12 3c.5 4.5 2.5 6.5 7 7-4.5.5-6.5 2.5-7 7-.5-4.5-2.5-6.5-7-7 4.5-.5 6.5-2.5 7-7z" />),
};
