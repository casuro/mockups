import { useId, type ReactNode, type SVGProps } from "react";

// Google Calendar's icons and the Calendar and Meet logos, as drawn in
// apps/calendar.html. Decorative: the button around each one carries its
// accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function stroke(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}
function solid(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" {...props}>
        {d}
      </svg>
    );
  };
}

export const Menu = stroke(<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />);
export const Left = stroke(<path d="M14.5 6l-6 6 6 6" />);
export const Right = stroke(<path d="M9.5 6l6 6-6 6" />);
export const Caret = solid(<path d="M7 10l5 5 5-5z" />);
export const Search = stroke(<><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5" /></>);
export const Help = stroke(<><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 014.8.9c0 1.7-2.4 2-2.4 3.6M12 16.8v.1" /></>);
export const Gear = stroke(<><circle cx="12" cy="12" r="3" /><path d="M12 2.8l1.7 2.1 2.7-.5.9 2.6 2.6.9-.5 2.7 2.1 1.7-2.1 1.7.5 2.7-2.6.9-.9 2.6-2.7-.5L12 21.2l-1.7-2.1-2.7.5-.9-2.6-2.6-.9.5-2.7L2.8 12l2.1-1.7-.5-2.7 2.6-.9.9-2.6 2.7.5z" /></>);
export const Check = stroke(<path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.6} />);
export const People = stroke(<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><circle cx="16.5" cy="9" r="2.6" /><path d="M16.5 14c2.4 0 4 1.5 4.5 4.3" /></>);
export const More = solid(<><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></>);
export const Task = stroke(<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></>);
export const Edit = stroke(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>);
export const Trash = stroke(<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />);
export const Mail = stroke(<><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="M4 7l8 6 8-6" /></>);
export const Close = stroke(<path d="M6 6l12 12M18 6L6 18" />);
export const Pin = stroke(<><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>);
export const Notes = stroke(<path d="M4 6h16M4 10h16M4 14h16M4 18h10" />);
export const Cal = stroke(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8.5 3v4M15.5 3v4" /></>);
export const Bell = stroke(<><path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 004 0" /></>);
export const Clock = stroke(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const Headset = stroke(<><path d="M4 15v-3a8 8 0 0116 0v3" /><rect x="3.5" y="14" width="4" height="6" rx="1.5" /><rect x="16.5" y="14" width="4" height="6" rx="1.5" /></>);
export const Tick = stroke(<path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={3.4} />);

/** The four-color plus on the Create button. */
export function Plus(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" {...props}>
      <path fill="#34A853" d="M16 16v14h4V20z" />
      <path fill="#4285F4" d="M30 16H20l-4 4h14z" />
      <path fill="#FBBC05" d="M6 16v4h10l4-4z" />
      <path fill="#EA4335" d="M20 16V6h-4v14z" />
      <path fill="none" d="M0 0h36v36H0z" />
    </svg>
  );
}

/** The Google Calendar logo (thesvg.org). */
export function CalendarLogo(props: IconProps) {
  const clip = useId();
  return (
    <svg aria-hidden="true" viewBox="0 0 512 512" fill="none" {...props}>
      <g clipPath={`url(#${CSS.escape(clip)})`}>
        <path d="M390.736 121.264H121.264V390.736H390.736V121.264Z" fill="white" />
        <path d="M390.736 512L512 390.736L451.368 380.392L390.736 390.736L379.67 446.196L390.736 512Z" fill="#EA4335" />
        <path d="M0 390.736V471.578C0 493.912 18.088 512 40.42 512H121.264L133.714 451.368L121.264 390.736L55.198 380.392L0 390.736Z" fill="#188038" />
        <path d="M512 121.264V40.42C512 18.088 493.912 0 471.58 0H390.736C383.36 30.072 379.671 52.2027 379.67 66.392C379.67 80.58 383.359 98.8707 390.736 121.264C417.556 128.944 437.767 132.784 451.368 132.784C464.969 132.784 485.18 128.945 512 121.264Z" fill="#1967D2" />
        <path d="M512 121.264H390.736V390.736H512V121.264Z" fill="#FBBC04" />
        <path d="M390.736 390.736H121.264V512H390.736V390.736Z" fill="#34A853" />
        <path d="M390.736 0H40.422C18.088 0 0 18.088 0 40.42V390.736H121.264V121.264H390.736V0Z" fill="#4285F4" />
        <path d="M176.54 330.308C166.468 323.504 159.494 313.568 155.688 300.428L179.066 290.796C181.186 298.88 184.891 305.145 190.182 309.592C195.436 314.038 201.836 316.228 209.314 316.228C216.959 316.228 223.527 313.903 229.018 309.254C234.51 304.606 237.272 298.678 237.272 291.504C237.272 284.16 234.375 278.164 228.582 273.516C222.788 268.868 215.512 266.544 206.822 266.544H193.314V243.404H205.44C212.917 243.404 219.216 241.382 224.336 237.338C229.456 233.298 232.016 227.772 232.016 220.732C232.016 214.468 229.726 209.482 225.146 205.744C220.566 202.004 214.77 200.118 207.73 200.118C200.858 200.118 195.402 201.938 191.36 205.608C187.319 209.289 184.282 213.937 182.534 219.116L159.394 209.482C162.458 200.792 168.084 193.112 176.336 186.476C184.588 179.84 195.132 176.506 207.932 176.506C217.398 176.506 225.92 178.326 233.466 181.996C241.01 185.668 246.938 190.754 251.216 197.222C255.496 203.722 257.616 210.998 257.616 219.082C257.616 227.334 255.63 234.308 251.656 240.034C247.682 245.76 242.796 250.138 237.002 253.204V254.584C244.483 257.669 250.982 262.735 255.798 269.238C260.682 275.806 263.142 283.654 263.142 292.818C263.142 301.978 260.816 310.164 256.168 317.338C251.52 324.514 245.088 330.172 236.934 334.282C228.75 338.392 219.554 340.482 209.348 340.482C197.524 340.514 186.612 337.112 176.54 330.308ZM320.132 214.298L294.466 232.858L281.632 213.39L327.678 180.176H345.328V336.842H320.132V214.298Z" fill="#4285F4" />
      </g>
      <defs>
        <clipPath id={clip}>
          <rect width="512" height="512" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

/** The Google Meet logo (thesvg.org), on the Join button. */
export function MeetLogo(props: IconProps) {
  const clip = useId();
  return (
    <svg aria-hidden="true" viewBox="0 0 622 512" fill="none" {...props}>
      <g clipPath={`url(#${CSS.escape(clip)})`}>
        <path d="M351.419 255.568L411.978 324.79L493.418 376.827L507.584 256.005L493.418 137.908L410.418 183.621L351.419 255.568Z" fill="#00832D" />
        <path d="M0.00283051 365.583V468.541C0.00283051 492.049 19.0851 511.136 42.5983 511.136H145.556L166.876 433.344L145.556 365.583L74.9198 344.263L0.00283051 365.583Z" fill="#0066DA" />
        <path d="M145.556 -7.62939e-06L0.00283051 145.554L74.9247 166.822L145.556 145.554L166.488 78.7145L145.556 -7.62939e-06Z" fill="#E94235" />
        <path d="M0.00526047 365.629H145.556V145.551H0.00526047V365.629Z" fill="#2684FC" />
        <path d="M586.398 61.6293L493.416 137.91V376.827L586.782 453.404C600.758 464.352 621.204 454.374 621.204 436.607V78.0861C621.204 60.1224 600.271 50.193 586.396 61.6317" fill="#00AC47" />
        <path d="M351.419 255.568V365.583H145.556V511.136H450.825C474.338 511.136 493.418 492.049 493.418 468.541V376.827L351.419 255.568Z" fill="#00AC47" />
        <path d="M450.825 -7.62939e-06H145.556V145.554H351.419V255.568L493.42 137.905V42.5979C493.42 19.0847 474.338 0.00241891 450.825 0.00241891" fill="#FFBA00" />
      </g>
      <defs>
        <clipPath id={clip}>
          <rect width="621.2" height="512" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
