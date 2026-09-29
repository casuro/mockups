import type { ReactNode, SVGProps } from "react";

// Teams' icons, as drawn in apps/teams.html. Decorative: the button around
// each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function line(d: ReactNode, strokeWidth = 1.5) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}
/** The title bar's few icons have square ends. */
function flat(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
        {d}
      </svg>
    );
  };
}
function solid(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" {...props}>
        {d}
      </svg>
    );
  };
}

const SLASH = <path d="M3 3l14 14" />;
const CAM = <><rect x="2.5" y="5.5" width="10.5" height="9" rx="2" /><path d="M13 9l4.5-2.5v7L13 11" /></>;
const MIC = <><rect x="7.5" y="2.5" width="5" height="9.5" rx="2.5" /><path d="M4.5 9.5a5.5 5.5 0 0011 0M10 15v2.5" /></>;
const PHONE = "M6.2 3.2l2 3.2-1.6 1.6a8.5 8.5 0 005.4 5.4l1.6-1.6 3.2 2-.9 2.3c-.3.7-1 1-1.7.8A13 13 0 013 6.9c-.2-.7.1-1.4.8-1.7z";
const SMILE = <><circle cx="10" cy="10" r="7" /><path d="M7 11.8a3.5 3.5 0 006 0" /><circle cx="7.6" cy="8.2" r=".4" fill="currentColor" /><circle cx="12.4" cy="8.2" r=".4" fill="currentColor" /></>;
const CLOUD = <path d="M5.8 15.5h9.4a3 3 0 00.3-6 4.6 4.6 0 00-8.8-1.2 3.6 3.6 0 00-.9 7.2z" />;

export const Activity = line(<path d="M10 3a4.5 4.5 0 014.5 4.5v3l1.5 3H4l1.5-3v-3A4.5 4.5 0 0110 3zM8 16a2 2 0 004 0" />);
export const Chat = line(<path d="M4 4h12a1 1 0 011 1v8a1 1 0 01-1 1H9l-4 3v-3H4a1 1 0 01-1-1V5a1 1 0 011-1z" />);
export const Teams = line(<><circle cx="7.5" cy="7" r="2.5" /><circle cx="14" cy="7.5" r="2" /><path d="M2.5 16c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2M12.8 12.1c2.4-.3 4.7.9 4.7 3.4" /></>);
export const Calendar = line(<><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" /></>);
export const Calls = line(<path d={PHONE} />);
export const OneDrive = line(CLOUD);
export const Apps = line(<><rect x="3" y="3" width="5.5" height="5.5" rx="1" /><rect x="3" y="11.5" width="5.5" height="5.5" rx="1" /><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" /><path d="M14.25 2.5v6.5M11 5.75h6.5" /></>);
export const Filter = line(<path d="M3 5.5h14M6 10h8M8.5 14.5h3" />);
export const Video = line(CAM);
export const VideoOff = line(<>{CAM}{SLASH}</>);
export const Mic = line(MIC);
export const MicOff = line(<>{MIC}{SLASH}</>);
export const Share = line(<><rect x="2.5" y="3.5" width="15" height="10.5" rx="1.5" /><path d="M10 11V6.5M8 8.5l2-2 2 2M7 17h6" /></>);
export const People = line(<><circle cx="8" cy="7" r="3" /><path d="M2.5 16.5c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8M13 4.2a2.8 2.8 0 010 5.6M15 11.8c1.6.5 2.8 1.9 2.8 4.2" /></>);
export const Hand = line(<path d="M7 10.5V5a1 1 0 012 0v4.5M9 9V3.8a1 1 0 012 0V9M11 9V4.8a1 1 0 012 0v5M13 10V7.3a1 1 0 012 0v4.9a5.3 5.3 0 01-5.3 5.3h-.3a5 5 0 01-4-2L3.6 13a1.1 1.1 0 011.7-1.4L7 13" />);
export const Smile = line(SMILE);
export const Emoji = Smile;
export const View = line(<><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" /><rect x="3" y="11" width="6" height="6" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" /></>);
export const More = solid(<><circle cx="4.5" cy="10" r="1.3" /><circle cx="10" cy="10" r="1.3" /><circle cx="15.5" cy="10" r="1.3" /></>);
export const Leave = line(<path d="M2.8 11.2c4.2-3.6 10.2-3.6 14.4 0l-1.4 2.3-2.8-1v-2.2a9.2 9.2 0 00-6 0v2.2l-2.8 1z" />);
export const Send = line(<><path d="M3 10.2L17 4l-4.6 13-2.6-5.4z" /><path d="M9.8 11.6L17 4" /></>);
export const Attach = line(<path d="M15.5 9.5l-5.8 5.8a3.5 3.5 0 01-5-5l6.4-6.4a2.3 2.3 0 013.3 3.3l-6.2 6.2a1.2 1.2 0 01-1.7-1.7l5.6-5.6" />);
export const Plus = line(<path d="M10 4v12M4 10h12" />);
export const Format = line(<path d="M4.5 14L8.5 4h1l4 10M6 10.5h6M3.5 17h13" />);
export const Pencil = line(<path d="M13.5 3.5l3 3L8 15H5v-3zM11.5 5.5l3 3" />);
export const Reply = line(<path d="M8 6L4 10l4 4M4 10h8a4 4 0 014 4v1" />);
export const Chev = solid(<path d="M5 7.5l5 5 5-5z" />);
export const ChevRight = line(<path d="M7.5 4.5L13 10l-5.5 5.5" />);
export const ChevLeft = line(<path d="M12.5 4.5L7 10l5.5 5.5" />);
export const Close = line(<path d="M5 5l10 10M15 5L5 15" />);
export const Expand = line(<path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5l-5.5 5.5M3.5 16.5L9 11" />);
export const Minimize = line(<path d="M11 4v5h5M9 16v-5H4M11 9l5.5-5.5M9 11l-5.5 5.5" />);
export const Eye = line(<><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" /><circle cx="10" cy="10" r="2.5" /></>);
export const Shield = line(<path d="M10 2.5l6 2.3v4.7c0 3.8-2.6 6.6-6 8-3.4-1.4-6-4.2-6-8V4.8z" />);
export const Speaker = line(<path d="M3 8h3l4-3.5v11L6 12H3zM13 7.5a3.5 3.5 0 010 5M15 5.5a6.5 6.5 0 010 9" />);
export const PhoneAudio = line(<><rect x="6" y="2.5" width="8" height="15" rx="1.5" /><path d="M9 15h2" /></>);
export const Room = line(<><rect x="2.5" y="4" width="15" height="9.5" rx="1.5" /><path d="M6.5 17h7M10 13.5V17" /></>);
export const NoAudio = line(<path d="M3 8h3l4-3.5v11L6 12H3zM13 8l4 4M17 8l-4 4" />);
export const Blur = line(<><circle cx="10" cy="7.5" r="3" /><path d="M4 17c.5-3 3-4.8 6-4.8s5.5 1.8 6 4.8" /><path d="M2.5 3.5h2M2.5 7h1M15.5 3.5h2M16.5 7h1" strokeDasharray="1 2" /></>);
export const Info = line(<><circle cx="10" cy="10" r="7" /><path d="M10 9v4.5M10 6.5v.1" /></>);
export const Check = line(<path d="M4.5 10.5l3.5 3.5 7.5-8" />);
export const Missed = line(<path d={`${PHONE}M12.5 3.5l4 4M16.5 3.5l-4 4`} />);
export const Back = flat(<path d="M12.5 4.5L7 10l5.5 5.5" />);
export const Forward = flat(<path d="M7.5 4.5L13 10l-5.5 5.5" />);
export const Search = flat(<><circle cx="8.5" cy="8.5" r="5" /><path d="M12.5 12.5l4 4" /></>);
export const Moon = flat(<path d="M16 12.5A6.5 6.5 0 017.5 4a6.5 6.5 0 108.5 8.5z" />);

/** The Microsoft Teams logo (thesvg.org), as in the mockup's title bar. */
export function TeamsLogo() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="4 4 36 38"><path fill="url(#tk-logo-a)" d="M22 20h12a6 6 0 0 1 6 6v10a6 6 0 0 1-12 0V26a6 6 0 0 0-6-6Z"/>
    <path fill="url(#tk-logo-b)" d="M8 24a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v12a6 6 0 0 0 6 6H18c-5.523 0-10-4.477-10-10v-8Z"/>
    <path fill="url(#tk-logo-c)" fillOpacity=".7" d="M8 24a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v12a6 6 0 0 0 6 6H18c-5.523 0-10-4.477-10-10v-8Z"/>
    <path fill="url(#tk-logo-d)" fillOpacity=".7" d="M8 24a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v12a6 6 0 0 0 6 6H18c-5.523 0-10-4.477-10-10v-8Z"/>
    <path fill="url(#tk-logo-e)" d="M33 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/>
    <path fill="url(#tk-logo-f)" fillOpacity=".46" d="M33 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/>
    <path fill="url(#tk-logo-g)" fillOpacity=".4" d="M33 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/>
    <path fill="url(#tk-logo-h)" d="M18 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>
    <path fill="url(#tk-logo-i)" fillOpacity=".6" d="M18 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>
    <path fill="url(#tk-logo-j)" fillOpacity=".5" d="M18 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>
    <rect width="16" height="16" x="4" y="23" fill="url(#tk-logo-k)" rx="3.25"/>
    <rect width="16" height="16" x="4" y="23" fill="url(#tk-logo-l)" fillOpacity=".7" rx="3.25"/>
    <path fill="#fff" d="M15.48 28.105h-2.448v7.466h-2.065v-7.466H8.52V26.43h6.96v1.676Z"/>
    <defs><radialGradient id="tk-logo-a" cx="0" cy="0" r="1" gradientTransform="matrix(13.4784 0 0 33.2694 39.797 22.174)" gradientUnits="userSpaceOnUse"><stop stopColor="#A98AFF"/>
    <stop offset=".14" stopColor="#8C75FF"/>
    <stop offset=".565" stopColor="#5F50E2"/>
    <stop offset=".9" stopColor="#3C2CB8"/>
    </radialGradient><radialGradient id="tk-logo-b" cx="0" cy="0" r="1" gradientTransform="matrix(12.1875 30.39997 -30.74442 12.3256 8.812 16.4)" gradientUnits="userSpaceOnUse"><stop stopColor="#85C2FF"/>
    <stop offset=".69" stopColor="#7588FF"/>
    <stop offset="1" stopColor="#6459FE"/>
    </radialGradient><radialGradient id="tk-logo-d" cx="0" cy="0" r="1" gradientTransform="rotate(113.326 8.093 17.645) scale(19.2186 15.4273)" gradientUnits="userSpaceOnUse"><stop stopColor="#BD96FF"/>
    <stop offset=".687" stopColor="#BD96FF" stopOpacity="0"/>
    </radialGradient><radialGradient id="tk-logo-e" cx="0" cy="0" r="1" gradientTransform="matrix(0 -10 12.6216 0 33 11.571)" gradientUnits="userSpaceOnUse"><stop offset=".268" stopColor="#6868F7"/>
    <stop offset="1" stopColor="#3923B1"/>
    </radialGradient><radialGradient id="tk-logo-f" cx="0" cy="0" r="1" gradientTransform="matrix(5.47024 4.59847 -6.65117 7.91208 28.867 10.544)" gradientUnits="userSpaceOnUse"><stop offset=".271" stopColor="#A1D3FF"/>
    <stop offset=".813" stopColor="#A1D3FF" stopOpacity="0"/>
    </radialGradient><radialGradient id="tk-logo-g" cx="0" cy="0" r="1" gradientTransform="rotate(-41.658 32.118 -43.42) scale(8.51275 20.8824)" gradientUnits="userSpaceOnUse"><stop stopColor="#E3ACFD"/>
    <stop offset=".816" stopColor="#9FA2FF" stopOpacity="0"/>
    </radialGradient><radialGradient id="tk-logo-h" cx="0" cy="0" r="1" gradientTransform="matrix(0 -12 15.146 0 18 8.286)" gradientUnits="userSpaceOnUse"><stop offset=".268" stopColor="#8282FF"/>
    <stop offset="1" stopColor="#3923B1"/>
    </radialGradient><radialGradient id="tk-logo-i" cx="0" cy="0" r="1" gradientTransform="rotate(40.052 -3.155 21.416) scale(8.57554 12.4035)" gradientUnits="userSpaceOnUse"><stop offset=".271" stopColor="#A1D3FF"/>
    <stop offset=".813" stopColor="#A1D3FF" stopOpacity="0"/>
    </radialGradient><radialGradient id="tk-logo-j" cx="0" cy="0" r="1" gradientTransform="rotate(-41.658 20.382 -26.516) scale(10.2153 25.0589)" gradientUnits="userSpaceOnUse"><stop stopColor="#E3ACFD"/>
    <stop offset=".816" stopColor="#9FA2FF" stopOpacity="0"/>
    </radialGradient><radialGradient id="tk-logo-k" cx="0" cy="0" r="1" gradientTransform="rotate(45 -25.763 16.328) scale(22.6274)" gradientUnits="userSpaceOnUse"><stop offset=".047" stopColor="#688EFF"/>
    <stop offset=".947" stopColor="#230F94"/>
    </radialGradient><radialGradient id="tk-logo-l" cx="0" cy="0" r="1" gradientTransform="matrix(0 11.2 -13.0702 0 12 32.6)" gradientUnits="userSpaceOnUse"><stop offset=".571" stopColor="#6965F6" stopOpacity="0"/>
    <stop offset="1" stopColor="#8F8FFF"/>
    </radialGradient><linearGradient id="tk-logo-c" x1="20.594" x2="20.594" y1="18" y2="42" gradientUnits="userSpaceOnUse"><stop offset=".801" stopColor="#6864F6" stopOpacity="0"/>
    <stop offset="1" stopColor="#5149DE"/>
    </linearGradient></defs></svg>
  );
}
