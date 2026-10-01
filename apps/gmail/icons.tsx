import { useId, type ReactNode, type SVGProps } from "react";

// Gmail's icons (Material-style outlines) and the Google app logos, as drawn
// in apps/gmail.html. Decorative: the button around each one carries its
// accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function outline(d: ReactNode) {
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

const STAR = "M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z";
const IMPORTANT = "M3.5 6h12.5l4.5 6-4.5 6H3.5L8 12z";
const LABEL = <><path d="M3.5 5.5v6l9 9 7.5-7.5-9-9h-6.5a1 1 0 00-1 1z" /><circle cx="7.5" cy="8.5" r="1.1" /></>;
const GEAR = <><circle cx="12" cy="12" r="3" /><path d="M12 2.8l1.7 2.1 2.7-.5.9 2.6 2.6.9-.5 2.7 2.1 1.7-2.1 1.7.5 2.7-2.6.9-.9 2.6-2.7-.5L12 21.2l-1.7-2.1-2.7.5-.9-2.6-2.6-.9.5-2.7L2.8 12l2.1-1.7-.5-2.7 2.6-.9.9-2.6 2.7.5z" /></>;
const MAIL = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 12.5l8.5-6" /></>;

export const Menu = outline(<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />);
export const Search = outline(<><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5" /></>);
export const Tune = outline(<><path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1" /><circle cx="15" cy="6.5" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="17.5" r="2" /></>);
export const Help = outline(<><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 014.8.9c0 1.7-2.4 2-2.4 3.6M12 16.8v.1" /></>);
export const Gear = outline(GEAR);
export const Apps = solid(<>{[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="2" />))}</>);
export const Pencil = outline(<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />);
export const Inbox = outline(<path d="M3.5 13h5l1.5 2.5h4l1.5-2.5h5M3.5 13l2.3-7.5h12.4l2.3 7.5v6a1 1 0 01-1 1h-15a1 1 0 01-1-1z" />);
export const Star = outline(<path d={STAR} />);
export const StarFilled = solid(<path d={STAR} />);
export const Snooze = outline(<><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.5 2M4.5 4l-2 2M19.5 4l2 2" /></>);
export const Send = outline(<path d="M3.5 20.5l17-8.5-17-8.5 2.6 8.5zM6.1 12H13" />);
export const Draft = outline(<path d="M6 3h8.5L19 7.5V21H6zM14 3v5h5" />);
export const Important = outline(<path d={IMPORTANT} />);
export const ImportantFilled = solid(<path d={IMPORTANT} />);
export const ChevronDown = outline(<path d="M6.5 9.5l5.5 5.5 5.5-5.5" />);
export const ChevronUp = outline(<path d="M6.5 14.5L12 9l5.5 5.5" />);
export const ChevronLeft = outline(<path d="M14.5 6L8.5 12l6 6" />);
export const ChevronRight = outline(<path d="M9.5 6l6 6-6 6" />);
export const Label = outline(LABEL);
export const Archive = outline(<><rect x="3" y="4" width="18" height="4.5" rx="1" /><path d="M4.5 8.5V19a1 1 0 001 1h13a1 1 0 001-1V8.5M10 12.5h4" /></>);
export const Trash = outline(<path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />);
export const Unread = outline(MAIL);
export const Read = outline(<path d="M3 10l9-6 9 6v9a1 1 0 01-1 1H4a1 1 0 01-1-1zM3.5 10.5L12 16l8.5-5.5" />);
export const Spam = outline(<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8zM12 7.5V13M12 16.5v.1" />);
export const Refresh = outline(<path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4v5h-5" />);
export const More = solid(<><circle cx="12" cy="5.5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="18.5" r="1.7" /></>);
export const Back = outline(<path d="M20 12H4.5M10.5 6l-6 6 6 6" />);
export const Reply = outline(<path d="M10 7.5l-6 5 6 5M4 12.5h9a7 7 0 017 7" />);
export const ReplyAll = outline(<path d="M8 7.5l-5 5 5 5M13 7.5l-5 5 5 5M8 12.5h6a6.5 6.5 0 016.5 6.5" />);
export const Forward = outline(<path d="M14 7.5l6 5-6 5M20 12.5h-9a7 7 0 00-7 7" />);
export const Attach = outline(<path d="M16.5 6.5v10a4.5 4.5 0 01-9 0V5.5a3 3 0 016 0v10a1.5 1.5 0 01-3 0V7" />);
export const Close = outline(<path d="M6 6l12 12M18 6L6 18" />);
export const Minimize = outline(<path d="M6 17h12" />);
export const FullScreen = outline(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const ExitFullScreen = outline(<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />);
export const Format = outline(<path d="M6.5 16L12 4l5.5 12M8.5 11.5h7M4 20h16" />);
export const Emoji = outline(<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14a4 4 0 007 0" /><circle cx="9" cy="9.8" r=".6" fill="currentColor" /><circle cx="15" cy="9.8" r=".6" fill="currentColor" /></>);
export const Link = outline(<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />);
export const Image = outline(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 16l5-5 4 4 2.5-2.5 5 5" /><circle cx="15.5" cy="9" r="1.5" /></>);
export const Lock = outline(<><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>);
export const Signature = outline(<path d="M4 17c3-6 5-11 7-11s-1 9 1 9 2-4 4-4 1 3 3 3M4 20.5h16" />);
export const People = outline(<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2M15.5 5.5a3 3 0 010 6M17.5 14.5c2 .6 3.5 2.2 3.5 5" /></>);
export const Info = outline(<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.1" /></>);
export const Print = outline(<path d="M7 8V3.5h10V8M7 17H4.5V9.5a1.5 1.5 0 011.5-1.5h12a1.5 1.5 0 011.5 1.5V17H17M7 14h10v6.5H7z" />);
export const NewWindow = outline(<path d="M13.5 4.5h6v6M19.5 4.5L11 13M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />);
export const Plus = outline(<path d="M12 5v14M5 12h14" />);
export const Check = outline(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const Drive = outline(<path d="M8.5 4h7l6 10.5-3.5 6H6l-3.5-6z" />);
export const MoveTo = outline(<path d="M4 6.5h6l2 2h8v10a1 1 0 01-1 1H5a1 1 0 01-1-1zM11 14h6M14.5 11.5L17 14l-2.5 2.5" />);
export const Task = outline(<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>);
export const Scheduled = outline(<><path d="M11 18.3L3.5 20.5V3.5l17 8.5-3.2 1.6" /><path d="M3.5 12H10" /><circle cx="17" cy="17.5" r="3.8" /><path d="M17 15.8v1.9l1.2.9" /></>);
export const AllMail = outline(<><rect x="3" y="7.5" width="14.5" height="12" rx="1.5" /><path d="M3.5 8.5l6.75 5 6.75-5M6.5 4.5h13a1 1 0 011 1V16" /></>);
export const SplitPane = outline(<><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M12 4.5v15" /></>);

/** A label's tag, filled with its color. */
export function LabelIcon({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path fill={color} fillRule="evenodd" d="M3.5 5.5v6l9 9 7.5-7.5-9-9h-6.5a1 1 0 00-1 1zM7.5 7.2a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z" />
    </svg>
  );
}

// Google's app logos (thesvg.org), each with its own clip ids so copies never collide.

export function GmailLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 49.4 512 399.42" {...props}><g fill="none" fillRule="evenodd"><g fillRule="nonzero"><path fill="#4285f4" d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z"/><path fill="#34a853" d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z"/><path fill="#fbbc04" d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z"/></g><path fill="#ea4335" d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z"/><path fill="#c5221f" fillRule="nonzero" d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z"/></g></svg>
  );
}

export function CalendarLogo(props: IconProps) {
  const id = useId();
  return (
    <svg aria-hidden="true" {...props} viewBox="0 0 512 512" fill="none"><g clipPath={`url(#${id})`}><path d="M390.736 121.264H121.264V390.736H390.736V121.264Z" fill="white"/><path d="M390.736 512L512 390.736L451.368 380.392L390.736 390.736L379.67 446.196L390.736 512Z" fill="#EA4335"/><path d="M0 390.736V471.578C0 493.912 18.088 512 40.42 512H121.264L133.714 451.368L121.264 390.736L55.198 380.392L0 390.736Z" fill="#188038"/><path d="M512 121.264V40.42C512 18.088 493.912 0 471.58 0H390.736C383.36 30.072 379.671 52.2027 379.67 66.392C379.67 80.58 383.359 98.8707 390.736 121.264C417.556 128.944 437.767 132.784 451.368 132.784C464.969 132.784 485.18 128.945 512 121.264Z" fill="#1967D2"/><path d="M512 121.264H390.736V390.736H512V121.264Z" fill="#FBBC04"/><path d="M390.736 390.736H121.264V512H390.736V390.736Z" fill="#34A853"/><path d="M390.736 0H40.422C18.088 0 0 18.088 0 40.42V390.736H121.264V121.264H390.736V0Z" fill="#4285F4"/><path d="M176.54 330.308C166.468 323.504 159.494 313.568 155.688 300.428L179.066 290.796C181.186 298.88 184.891 305.145 190.182 309.592C195.436 314.038 201.836 316.228 209.314 316.228C216.959 316.228 223.527 313.903 229.018 309.254C234.51 304.606 237.272 298.678 237.272 291.504C237.272 284.16 234.375 278.164 228.582 273.516C222.788 268.868 215.512 266.544 206.822 266.544H193.314V243.404H205.44C212.917 243.404 219.216 241.382 224.336 237.338C229.456 233.298 232.016 227.772 232.016 220.732C232.016 214.468 229.726 209.482 225.146 205.744C220.566 202.004 214.77 200.118 207.73 200.118C200.858 200.118 195.402 201.938 191.36 205.608C187.319 209.289 184.282 213.937 182.534 219.116L159.394 209.482C162.458 200.792 168.084 193.112 176.336 186.476C184.588 179.84 195.132 176.506 207.932 176.506C217.398 176.506 225.92 178.326 233.466 181.996C241.01 185.668 246.938 190.754 251.216 197.222C255.496 203.722 257.616 210.998 257.616 219.082C257.616 227.334 255.63 234.308 251.656 240.034C247.682 245.76 242.796 250.138 237.002 253.204V254.584C244.483 257.669 250.982 262.735 255.798 269.238C260.682 275.806 263.142 283.654 263.142 292.818C263.142 301.978 260.816 310.164 256.168 317.338C251.52 324.514 245.088 330.172 236.934 334.282C228.75 338.392 219.554 340.482 209.348 340.482C197.524 340.514 186.612 337.112 176.54 330.308ZM320.132 214.298L294.466 232.858L281.632 213.39L327.678 180.176H345.328V336.842H320.132V214.298Z" fill="#4285F4"/></g><defs><clipPath id={id}><rect width="512" height="512" fill="white"/></clipPath></defs></svg>
  );
}

export function KeepLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" {...props} fill="#FFBB00" viewBox="0 0 24 24"><path d="M4.908 0c-.904 0-1.635.733-1.635 1.637v20.726c0 .904.732 1.637 1.635 1.637H19.09c.904 0 1.637-.733 1.637-1.637V6.5h-6.5V0H4.908zm9.819 0v6h6l-6-6zM11.97 8.229c.224 0 .571.031.765.072.2.04.576.185.842.312.828.414 1.467 1.164 1.774 2.088.168.511.188 1.34.05 1.865a3.752 3.752 0 0 1-1.277 1.952l-.25.193h-1.87c-2.134 0-1.931.042-2.478-.494a3.349 3.349 0 0 1-.984-1.844c-.148-.766-.053-1.437.32-2.203.19-.399.303-.556.65-.899.68-.679 1.513-1.037 2.458-1.042zm-1.866 7.863h3.781v1.328h-3.779v-1.328z"/></svg>
  );
}

export function TasksLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" {...props} fill="#2684FC" viewBox="0 0 24 24"><path d="M11.383.617C5.097.617 0 5.714 0 12c0 6.286 5.097 11.383 11.383 11.383 6.286 0 11.38-5.097 11.38-11.383a11.34 11.34 0 0 0-.878-4.389l-3.203 3.203c.062.387.1.782.1 1.186a7.398 7.398 0 1 1-7.4-7.398c1.499 0 2.889.448 4.054 1.214l2.857-2.857a11.325 11.325 0 0 0-6.91-2.342zm9.674.756c-.292 0-.583.112-.805.334-2.97 2.965-5.934 5.934-8.9 8.902L9.596 8.854a1.139 1.139 0 0 0-1.61 0l-1.775 1.773a1.139 1.139 0 0 0 0 1.61l4.166 4.163a1.421 1.421 0 0 0 2.012 0L23.666 5.121a1.136 1.136 0 0 0 0-1.61l-1.805-1.804a1.136 1.136 0 0 0-.804-.334z"/></svg>
  );
}

export function MeetLogo(props: IconProps) {
  const id = useId();
  return (
    <svg aria-hidden="true" {...props} viewBox="0 0 622 512" fill="none"><g clipPath={`url(#${id})`}><path d="M351.419 255.568L411.978 324.79L493.418 376.827L507.584 256.005L493.418 137.908L410.418 183.621L351.419 255.568Z" fill="#00832D"/><path d="M0.00283051 365.583V468.541C0.00283051 492.049 19.0851 511.136 42.5983 511.136H145.556L166.876 433.344L145.556 365.583L74.9198 344.263L0.00283051 365.583Z" fill="#0066DA"/><path d="M145.556 -7.62939e-06L0.00283051 145.554L74.9247 166.822L145.556 145.554L166.488 78.7145L145.556 -7.62939e-06Z" fill="#E94235"/><path d="M0.00526047 365.629H145.556V145.551H0.00526047V365.629Z" fill="#2684FC"/><path d="M586.398 61.6293L493.416 137.91V376.827L586.782 453.404C600.758 464.352 621.204 454.374 621.204 436.607V78.0861C621.204 60.1224 600.271 50.193 586.396 61.6317" fill="#00AC47"/><path d="M351.419 255.568V365.583H145.556V511.136H450.825C474.338 511.136 493.418 492.049 493.418 468.541V376.827L351.419 255.568Z" fill="#00AC47"/><path d="M450.825 -7.62939e-06H145.556V145.554H351.419V255.568L493.42 137.905V42.5979C493.42 19.0847 474.338 0.00241891 450.825 0.00241891" fill="#FFBA00"/></g><defs><clipPath id={id}><rect width="621.2" height="512" fill="white"/></clipPath></defs></svg>
  );
}

export function ChatLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" {...props} viewBox="0 0 311 320"><g strokeWidth="2" fill="none" strokeLinecap="butt"><path stroke="#7e916f" vectorEffect="non-scaling-stroke" d="M76.37.51l.01 76.47"/><path stroke="#1375eb" vectorEffect="non-scaling-stroke" d="M76.38 76.98 0 76.96"/><path stroke="#f3801d" vectorEffect="non-scaling-stroke" d="M235.08 1.09q-.16.06-.27.13-.17.09-.17.28l-.02 75.51"/><path stroke="#7eb426" vectorEffect="non-scaling-stroke" d="M234.62 77.01h-.05"/><path stroke="#91a080" vectorEffect="non-scaling-stroke" d="m76.41 77.01-.03-.03"/><path stroke="#75783e" vectorEffect="non-scaling-stroke" d="m310.53 76.77-75.91.24"/><path stroke="#138495" vectorEffect="non-scaling-stroke" d="M76.43 182.69 0 182.67"/><path stroke="#00983a" vectorEffect="non-scaling-stroke" d="m76.44 259.13-.01-38.28"/></g><path fill="#0066da" d="m76.37.51.01 76.47L0 76.96V20.77q.85-5.96 3.53-10.01Q10.14.74 22.75.67 49.41.53 76.37.51Z"/><path fill="#fbbc04" d="m76.37.51 157.42.02a1.61 1.57-26.7 0 1 .92.29l.37.27q-.16.06-.27.13-.17.09-.17.28l-.02 75.51h-.05l-158.16.01-.03-.03Z"/><path fill="#ea4335" d="m235.08 1.09 75.45 75.68-75.91.24.02-75.51q0-.19.17-.28.11-.07.27-.13Z"/><path fill="#2684fc" d="m0 76.96 76.38.02.03.03.02 105.68L0 182.67Z"/><path fill="#00ac47" d="m310.53 76.77.47.34v161.9q-2.66 14.53-15.06 18.77-4.42 1.52-13.03 1.5-55.89-.09-112.92-.17-8.28-.01-16.8.12-.47.01-.8.34-27.9 27.77-56 56.02c-2.87 2.89-6.12 4.5-10.24 3.89q-5.76-.85-8.49-5.94-1.15-2.16-1.17-7.88-.07-23.19-.05-46.53l-.01-38.28 37.78-37.78a1.79 1.77 22.3 0 1 1.26-.52l118.3.04a.83.83 0 0 0 .83-.83l-.03-104.75h.05Z"/><path fill="#00832d" d="m76.43 182.69v38.16l.01 38.28q-23.97.14-47.53.09-9.82-.02-14.15-1.54Q2.62 253.44 0 238.88v-56.21Z"/></svg>
  );
}

export function DriveLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" {...props} viewBox="0 0 87.3 78"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"/><path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"/></svg>
  );
}

// ---------- For a launcher (a desktop's Dock, say) ----------

/** Gmail's logo in a square box, for the white tile. No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return <GmailLogo viewBox="0 -6.89 512 512" {...props} />;
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = undefined;
