import type { ReactNode, SVGProps } from "react";

// Notion's icons, as drawn in apps/notion.html. Decorative: the button
// around each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

const Dot = ({ x, y, r = 1.3 }: { x: number; y: number; r?: number }) => <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />;

function icon(d: ReactNode, strokeWidth = 1.5) {
  return function Icon(props: IconProps) {
    return (
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {d}
      </svg>
    );
  };
}

export const Search = icon(<><circle cx="8.75" cy="8.75" r="5" /><path d="m12.5 12.5 4 4" /></>);
export const ChevDown = icon(<path d="m6 8 4 4 4-4" />);
export const ChevRight = icon(<path d="m8 6 4 4-4 4" />);
export const DblLeft = icon(<path d="m10 6-4 4 4 4M15.5 6l-4 4 4 4" />);
export const Menu = icon(<path d="M4 6h12M4 10h12M4 14h12" />);
export const Compose = icon(<><path d="M9 4.25H5.75a1.5 1.5 0 0 0-1.5 1.5v8.5a1.5 1.5 0 0 0 1.5 1.5h8.5a1.5 1.5 0 0 0 1.5-1.5V11" /><path d="M14.6 3.6a1.4 1.4 0 0 1 2 2L10.2 12l-2.6.6.6-2.6z" /></>);
export const Plus = icon(<path d="M10 4.5v11M4.5 10h11" />);
export const More = icon(<><Dot x={4.75} y={10} /><Dot x={10} y={10} /><Dot x={15.25} y={10} /></>);
export const Star = icon(<path d="m10 3.5 2 4.1 4.5.6-3.3 3.1.8 4.5-4-2.1-4 2.1.8-4.5-3.3-3.1 4.5-.6z" />);
export const StarFill = icon(<path d="m10 3.5 2 4.1 4.5.6-3.3 3.1.8 4.5-4-2.1-4 2.1.8-4.5-3.3-3.1 4.5-.6z" fill="currentColor" />);
export const Clock = icon(<><circle cx="10" cy="10" r="6.5" /><path d="M10 6.5V10l2.5 1.5" /></>);
export const Comment = icon(<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9.2L6 15.5V13h-.5A1.5 1.5 0 0 1 4 11.5z" />);
export const Link = icon(<><path d="M8.6 11.4a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.8.8" /><path d="M11.4 8.6a3 3 0 0 0-4.2 0l-2.3 2.3a3 3 0 0 0 4.2 4.2l.8-.8" /></>);
export const Copy = icon(<><rect x="7" y="7" width="9" height="9" rx="1.5" /><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" /></>);
export const Check = icon(<path d="m4.5 10.5 3.5 3.5 7.5-8" />, 2);
export const Text = icon(<path d="M5 5.5h10M10 5.5V15.5" />);
export const Bullet = icon(<><Dot x={4.5} y={6} r={1.2} /><Dot x={4.5} y={10} r={1.2} /><Dot x={4.5} y={14} r={1.2} /><path d="M8 6h8M8 10h8M8 14h8" /></>);
export const Numbered = icon(<><path d="M8.5 6h7.5M8.5 10h7.5M8.5 14h7.5" /><path d="M3.6 4.4 4.6 4v3.5M3.4 12.2c.3-.5.8-.7 1.2-.7.6 0 1 .4 1 .9 0 .9-2.2 1.6-2.2 2.6h2.3" strokeWidth="1.1" /></>);
export const Todo = icon(<><rect x="4" y="4" width="12" height="12" rx="2.5" /><path d="m7 10.2 2 2 4-4.2" /></>);
export const Toggle = icon(<><path d="M5 6.5 8 9 5 11.5z" fill="currentColor" /><path d="M10.5 9h6M10.5 13h6M5 15h11.5" opacity=".45" /></>);
export const Quote = icon(<><path d="M5 4.5v11" /><path d="M8.5 7h7.5M8.5 10h7.5M8.5 13h5" /></>);
export const Callout = icon(<><rect x="3.25" y="4.25" width="13.5" height="11.5" rx="2" /><path d="M7.5 8h6M7.5 11.5h4" /><Dot x={5.5} y={8} r={0.9} /></>);
export const Divider = icon(<><path d="M3.5 10h13" /><path d="M6.5 6h7M6.5 14h7" opacity=".35" /></>);
export const Code = icon(<path d="m7.5 6-4 4 4 4M12.5 6l4 4-4 4" />);
export const Table = icon(<><rect x="3.25" y="4.25" width="13.5" height="11.5" rx="1.5" /><path d="M3.25 8.25h13.5M3.25 12h13.5M8.25 8.25v7.5" /></>);
export const Board = icon(<><rect x="3.5" y="4" width="4" height="12" rx="1" /><rect x="8.5" y="4" width="4" height="8" rx="1" /><rect x="13.5" y="4" width="3" height="10" rx="1" /></>);
export const Filter = icon(<path d="M4 6h12M6.5 10h7M9 14h2" />);
export const Sort = icon(<path d="M7 4.5v11M4.5 13 7 15.5 9.5 13M13 15.5v-11M10.5 7 13 4.5 15.5 7" />);
export const Image = icon(<><rect x="3.25" y="4.25" width="13.5" height="11.5" rx="1.5" /><circle cx="7.5" cy="8.3" r="1.3" /><path d="m3.5 14 4-3.5 3 2.5 2-1.6 4 2.8" /></>);
export const Page = icon(<><path d="M5.75 3.25h5.5l3.5 3.5v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V3.75a.5.5 0 0 1 .5-.5z" /><path d="M11 3.5v3.5h3.5M7.75 10.5h4.5M7.75 13h4.5" /></>);
export const Calendar = icon(<><rect x="3.5" y="4.5" width="13" height="12" rx="1.5" /><path d="M3.5 8.5h13M7 3v3M13 3v3" /></>);
export const Person = icon(<><circle cx="10" cy="7" r="3" /><path d="M4.5 16c.8-2.7 3-4 5.5-4s4.7 1.3 5.5 4" /></>);
export const Status = icon(<><circle cx="10" cy="10" r="6.25" /><path d="M10 3.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" stroke="none" /></>);
export const Select = icon(<><circle cx="10" cy="10" r="6.25" /><path d="m7.5 9 2.5 2.5L12.5 9" /></>);
export const Multi = icon(<><path d="M4 6h7M4 10h7M4 14h5" /><path d="m12.5 11.5 1.8 1.8 3.2-3.6" /></>);
export const TitleProp = icon(<><path d="M3.5 15 7 5l3.5 10M4.8 11.5h4.4" /><path d="M13 9.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM15 9v6" /></>, 1.3);
export const TextProp = icon(<path d="M4 6h12M4 10h12M4 14h8" />);
export const Expand = icon(<path d="M11.5 4.5h4v4M15.5 4.5 11 9M8.5 15.5h-4v-4M4.5 15.5 9 11" />);
export const Sun = icon(<><circle cx="10" cy="10" r="3.2" /><path d="M10 2.75v1.5M10 15.75v1.5M2.75 10h1.5M15.75 10h1.5M4.9 4.9l1 1M14.1 14.1l1 1M4.9 15.1l1-1M14.1 5.9l1-1" /></>);
export const Moon = icon(<path d="M15.5 12.4A6.5 6.5 0 0 1 7.6 4.5a6.5 6.5 0 1 0 7.9 7.9z" />);
export const Logout = icon(<path d="M8 4.5H5.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H8M12 7l3 3-3 3M15 10H8" />);
export const Smile = icon(<><circle cx="10" cy="10" r="6.5" /><path d="M7.4 11.8a3.2 3.2 0 0 0 5.2 0" /><Dot x={7.8} y={8.4} r={0.9} /><Dot x={12.2} y={8.4} r={0.9} /></>);
export const Question = icon(<><circle cx="10" cy="10" r="6.5" /><path d="M8.2 8.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" /><Dot x={10} y={13.6} r={0.9} /></>);
export const Home = icon(<path d="M4 9.5 10 4.5l6 5V15a1 1 0 0 1-1 1h-3v-4H8v4H5a1 1 0 0 1-1-1z" />);
export const Inbox = icon(<><path d="M3.5 11.5 5.5 5h9l2 6.5V15a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" /><path d="M3.5 11.5h4l1 1.5h3l1-1.5h4" /></>);

export function Grip(props: IconProps) {
  return (
    <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" fill="currentColor" {...props}>
      <circle cx="2.5" cy="3" r="1.4" /><circle cx="7.5" cy="3" r="1.4" /><circle cx="2.5" cy="8" r="1.4" />
      <circle cx="7.5" cy="8" r="1.4" /><circle cx="2.5" cy="13" r="1.4" /><circle cx="7.5" cy="13" r="1.4" />
    </svg>
  );
}

export function Tri(props: IconProps) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" {...props}>
      <path d="M4 2.5 8.5 6 4 9.5z" fill="currentColor" />
    </svg>
  );
}

/** "H1", "H2", "H3" in the "/" menu. */
export const Heading = ({ n }: { n: number }) => <b className="hic">H<sub>{n}</sub></b>;

/** The Notion mark, from thesvg.org (slug: notion). */
export function NotionLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 256 268" preserveAspectRatio="xMidYMid" {...props}>
      <path fill="#FFF" d="M16.092 11.538 164.09.608c18.179-1.56 22.85-.508 34.28 7.801l47.243 33.282C253.406 47.414 256 48.975 256 55.207v182.527c0 11.439-4.155 18.205-18.696 19.24L65.44 267.378c-10.913.517-16.11-1.043-21.825-8.327L8.826 213.814C2.586 205.487 0 199.254 0 191.97V29.726c0-9.352 4.155-17.153 16.092-18.188Z" />
      <path d="M164.09.608 16.092 11.538C4.155 12.573 0 20.374 0 29.726v162.245c0 7.284 2.585 13.516 8.826 21.843l34.789 45.237c5.715 7.284 10.912 8.844 21.825 8.327l171.864-10.404c14.532-1.035 18.696-7.801 18.696-19.24V55.207c0-5.911-2.336-7.614-9.21-12.66l-1.185-.856L198.37 8.409C186.94.1 182.27-.952 164.09.608ZM69.327 52.22c-14.033.945-17.216 1.159-25.186-5.323L23.876 30.778c-2.06-2.086-1.026-4.69 4.163-5.207l142.274-10.395c11.947-1.043 18.17 3.12 22.842 6.758l24.401 17.68c1.043.525 3.638 3.637.517 3.637L71.146 52.095l-1.819.125Zm-16.36 183.954V81.222c0-6.767 2.077-9.887 8.3-10.413L230.02 60.93c5.724-.517 8.31 3.12 8.31 9.879v153.917c0 6.767-1.044 12.49-10.387 13.008l-161.487 9.361c-9.343.517-13.489-2.594-13.489-10.921ZM212.377 89.53c1.034 4.681 0 9.362-4.681 9.897l-7.783 1.542v114.404c-6.758 3.637-12.981 5.715-18.18 5.715-8.308 0-10.386-2.604-16.609-10.396l-50.898-80.079v77.476l16.1 3.646s0 9.362-12.989 9.362l-35.814 2.077c-1.043-2.086 0-7.284 3.63-8.318l9.351-2.595V109.823l-12.98-1.052c-1.044-4.68 1.55-11.439 8.826-11.965l38.426-2.585 52.958 81.113v-71.76l-13.498-1.552c-1.043-5.733 3.111-9.896 8.3-10.404l35.84-2.087Z" />
    </svg>
  );
}

// ---------- For a launcher (a desktop's Dock, say) ----------

/** Notion's logo in a square box, for the white tile. No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return <NotionLogo viewBox="-17 -11 290 290" {...props} />;
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = undefined;
