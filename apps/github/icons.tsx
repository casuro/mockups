import type { ReactNode, SVGProps } from "react";
import type { Status } from "./types";

// GitHub's icons and its mark, as drawn in apps/github.html (the mark is from
// thesvg.org). Decorative: the button around each one carries its
// accessible name. Status icons say what they mean, since they stand alone.

type IconProps = SVGProps<SVGSVGElement>;

function icon(d: ReactNode) {
  return function Icon({ className, ...props }: IconProps) {
    return (
      <svg aria-hidden="true" className={className ? `ic ${className}` : "ic"} viewBox="0 0 16 16" {...props}>
        {d}
      </svg>
    );
  };
}

export const Menu = icon(<path d="M1.75 3.5h12.5M1.75 8h12.5M1.75 12.5h12.5" />);
export const Search = icon(<><circle cx="7" cy="7" r="4.75" /><path d="M10.5 10.5l3.75 3.75" /></>);
export const Plus = icon(<path d="M8 2.75v10.5M2.75 8h10.5" />);
export const Chev = icon(<path d="M6 3.75L10.25 8 6 12.25" />);
export const Left = icon(<path d="M7.25 3.5L2.75 8l4.5 4.5M3 8h10.25" />);
export const Bell = icon(<path d="M8 1.75a4.25 4.25 0 00-4.25 4.25v2.6L2.5 11.25h11L12.25 8.6V6A4.25 4.25 0 008 1.75zM6.4 13.4a1.7 1.7 0 003.2 0" />);
export const Code = icon(<path d="M5.25 4.25L1.5 8l3.75 3.75M10.75 4.25L14.5 8l-3.75 3.75" />);
export const Issue = icon(<><circle cx="8" cy="8" r="6.25" /><circle className="f" cx="8" cy="8" r="1.5" /></>);
export const Pull = icon(<><circle cx="3.75" cy="3.5" r="1.75" /><circle cx="3.75" cy="12.5" r="1.75" /><circle cx="12.25" cy="12.5" r="1.75" /><path d="M3.75 5.25v5.5M12.25 10.75V6.5a2 2 0 00-2-2H7.75M9.5 2.5l-2 2 2 2" /></>);
export const Merge = icon(<><circle cx="4" cy="3.5" r="1.75" /><circle cx="4" cy="12.5" r="1.75" /><circle cx="12" cy="8.25" r="1.75" /><path d="M4 5.25v5.5M4 5.25c.3 2.2 2.2 3 6.25 3" /></>);
export const Play = icon(<><circle cx="8" cy="8" r="6.25" /><path className="f" d="M6.5 5.4v5.2l4.2-2.6z" /></>);
export const Table = icon(<><rect x="1.75" y="1.75" width="12.5" height="12.5" rx="2" /><path d="M1.75 6h12.5M6 6v8.25" /></>);
export const Shield = icon(<path d="M8 1.5l5.25 2v4.1c0 3-2.1 5.4-5.25 6.9-3.15-1.5-5.25-3.9-5.25-6.9V3.5z" />);
export const Graph = icon(<path d="M1.75 1.75v12.5h12.5M4.5 10.5l3-3.5 2.5 2 3.5-4.75" />);
export const Gear = icon(<><circle cx="8" cy="8" r="2.25" /><path d="M8 1.5v1.9M8 12.6v1.9M1.5 8h1.9M12.6 8h1.9M3.4 3.4l1.35 1.35M11.25 11.25l1.35 1.35M3.4 12.6l1.35-1.35M11.25 4.75l1.35-1.35" /></>);
export const Commit = icon(<><circle cx="8" cy="8" r="2.75" /><path d="M1 8h4.25M10.75 8H15" /></>);
export const Eye = icon(<><path d="M1.5 8S3.9 3.5 8 3.5 14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></>);
export const Comment = icon(<path d="M2.25 2.75h11.5v7.75H8.25l-3 2.75V10.5h-3z" />);
export const Check = icon(<path d="M3 8.5l3.25 3.25L13 4.75" />);
export const X = icon(<path d="M4 4l8 8M12 4l-8 8" />);
export const Calendar = icon(<><rect x="1.75" y="2.75" width="12.5" height="11.5" rx="2" /><path d="M1.75 6.5h12.5M5 1.25v3M11 1.25v3" /></>);
export const Timer = icon(<><circle cx="8" cy="9" r="5.25" /><path d="M8 6v3M6.25 1.5h3.5M12.25 4.25l.9-.9" /></>);
export const Sync = icon(<path d="M2.5 7.5a5.5 5.5 0 019.7-3L13.5 6M13.5 2.5V6H10M13.5 8.5a5.5 5.5 0 01-9.7 3L2.5 10M2.5 13.5V10H6" />);
export const Moon = icon(<path d="M13.5 9.6A6 6 0 016.4 2.5a6 6 0 107.1 7.1z" />);
export const Person = icon(<><circle cx="8" cy="5" r="3" /><path d="M2.5 14c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" /></>);
export const SignOut = icon(<path d="M6.5 2.5h-4v11h4M10 5l3 3-3 3M13 8H6" />);
export const Workflow = icon(<><rect x="1.75" y="1.75" width="5" height="5" rx="1" /><rect x="9.25" y="9.25" width="5" height="5" rx="1" /><path d="M4.25 6.75v3a2 2 0 002 2h3" /></>);

// A status, as GitHub draws it: a filled circle with a check or a cross, a
// spinning ring while it runs, a ring with a dot while it is queued.
const STATUS: Record<Status, ReactNode> = {
  success: <><circle cx="8" cy="8" r="8" fill="currentColor" /><path className="on" d="M4.6 8.3l2.3 2.3 4.6-4.9" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
  failure: <><circle cx="8" cy="8" r="8" fill="currentColor" /><path className="on" d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" fill="none" strokeWidth="1.6" strokeLinecap="round" /></>,
  in_progress: <><circle cx="8" cy="8" r="6.75" fill="none" stroke="currentColor" strokeWidth="2" opacity=".3" /><path className="arc" d="M8 1.25A6.75 6.75 0 0114.75 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="8" cy="8" r="2.5" fill="currentColor" /></>,
  queued: <><circle cx="8" cy="8" r="6.75" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="8" cy="8" r="2.5" fill="currentColor" /></>,
  cancelled: <><path d="M5.1 1.5h5.8l3.6 3.6v5.8l-3.6 3.6H5.1l-3.6-3.6V5.1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 4.75v3.75M8 11v.01" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
};
export const STATUS_LABEL: Record<Status, string> = { success: "Success", failure: "Failure", in_progress: "In progress", queued: "Queued", cancelled: "Cancelled" };

export function StatusIcon({ status, large }: { status: Status; large?: boolean }) {
  return (
    <svg className={`st ${status}${large ? " lg" : ""}`} viewBox="0 0 16 16" role="img" aria-label={STATUS_LABEL[status]}>
      {STATUS[status]}
    </svg>
  );
}

/** GitHub's mark, in the color of the text around it; it fills the box it is put in. Pass `fill` for another color. */
export function GitHubLogo(props: IconProps) {
  return (
    <svg fill="currentColor" role="img" aria-label="GitHub" viewBox="0 0 16 16" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
    </svg>
  );
}

// ---------- For a launcher (a desktop's Dock, say) ----------

/** GitHub's mark in white, for the dark tile. No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return <GitHubLogo fill="#fff" {...props} />;
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = "#24292f";
