import type { ReactNode, SVGProps } from "react";
import type { Priority } from "./types";
import type { Status } from "./use-linear";

// Linear's icons, as drawn in apps/linear.html. Decorative: the button
// around each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function line(d: ReactNode, size = 16) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}

export const Chev = line(<path d="M4.5 6.5 8 10l3.5-3.5" />, 12);
export const Search = line(<><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></>);
export const Edit = line(<><path d="M13 8.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4.5" /><path d="m11.5 2 2.5 2.5L8 10.5H5.5V8z" /></>);
export const Inbox = line(<><path d="M2 9h3.5l1 2h3l1-2H14" /><path d="M3.5 3h9L14 9v4H2V9z" /></>);
export const Mine = line(<><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2.5" /></>);
export const Issues = line(<><path d="M3 3.5h10v9H3z" /><path d="M6 1.5h7.5V10" /></>);
export const Cycles = line(<><path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" /><path d="M8 5v3l2 1.5" /></>);
export const Projects = line(<><path d="m8 1.8 5.5 3v6.4L8 14.2l-5.5-3V4.8z" /><path d="M2.5 4.8 8 8l5.5-3.2M8 8v6.2" /></>);
export const Views = line(<><path d="m8 2 6 3-6 3-6-3z" /><path d="m2 8 6 3 6-3M2 11l6 3 6-3" /></>);
export const Filter = line(<path d="M2.5 4h11M4.5 8h7M6.5 12h3" />);
export const Display = line(<><path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" /></>);
export const Plus = line(<path d="M8 3v10M3 8h10" />, 14);
export const More = line(<><circle cx="3.5" cy="8" r=".6" fill="currentColor" /><circle cx="8" cy="8" r=".6" fill="currentColor" /><circle cx="12.5" cy="8" r=".6" fill="currentColor" /></>);
export const Menu = line(<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />);
export const Cal = line(<><rect x="2.5" y="3" width="11" height="10.5" rx="1.5" /><path d="M2.5 6.5h11M5.5 1.8v2.4M10.5 1.8v2.4" /></>, 12);
export const Help = line(<><circle cx="8" cy="8" r="6" /><path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1M8 11.2v.1" /></>, 14);
export const Back = line(<path d="M10 3.5 5.5 8l4.5 4.5" />);
export const Up = line(<path d="M4 10l4-4 4 4" />);
export const Down = line(<path d="M4 6l4 4 4-4" />);
export const Check = line(<path d="m3.5 8.5 3 3 6-7" />, 14);

export function Caret() {
  return (
    <svg aria-hidden="true" className="caret" width="10" height="10" viewBox="0 0 10 10">
      <path d="M2 3.5h6L5 7.5z" fill="currentColor" />
    </svg>
  );
}

/** Backlog is a dotted ring, unstarted an empty ring, started half filled, completed a check. */
export function StatusIcon({ status }: { status: Status }) {
  const c = status.color;
  if (status.type === "backlog")
    return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="1.4 1.75" /></svg>;
  if (status.type === "unstarted")
    return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke={c} strokeWidth="1.5" /></svg>;
  if (status.type === "started")
    return (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="6" fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill={c} />
      </svg>
    );
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="6.5" fill={c} />
      <path d="m4.4 7.1 1.8 1.8 3.5-3.6" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Three dashes for none, the red square for urgent, one to three bars for low to high. */
export function PriorityIcon({ priority }: { priority: Priority }) {
  if (priority === 0)
    return (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="var(--text-4)">
        <rect x="1.5" y="7.25" width="3" height="1.5" rx=".5" />
        <rect x="6.5" y="7.25" width="3" height="1.5" rx=".5" />
        <rect x="11.5" y="7.25" width="3" height="1.5" rx=".5" />
      </svg>
    );
  if (priority === 1)
    return (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
        <rect x="1" y="1" width="14" height="14" rx="3" fill="var(--urgent)" />
        <path d="M8 4v5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.6" r="1" fill="#fff" />
      </svg>
    );
  const on = { 2: 3, 3: 2, 4: 1 }[priority];
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1.5 + i * 5} y={9 - i * 3.5} width="3" height={5 + i * 3.5} rx="1" fill={i < on ? "var(--bar)" : "var(--bar-off)"} />
      ))}
    </svg>
  );
}

/** Linear's mark in Linear indigo; pass `fill` for another color. */
export function LinearLogo({ fill = "#5E6AD2", ...props }: IconProps) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" {...props}>
      <path
        fill={fill}
        d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z"
      />
    </svg>
  );
}

// ---------- For a launcher (a desktop's Dock, say) ----------

/** Linear's mark in white, for the dark tile (as Linear's app icon). No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return <LinearLogo fill="#fff" {...props} />;
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = "linear-gradient(#2b2c31, #0f1012)";
