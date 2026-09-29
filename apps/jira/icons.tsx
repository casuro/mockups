import { useId, type ReactNode, type SVGProps } from "react";
import type { IssueType, Priority } from "./types";

// Jira's icons, as drawn in apps/jira.html. Decorative: the button around
// each one carries its accessible name. Brand marks are the mockup's inline
// SVGs (from thesvg.org).

type IconProps = SVGProps<SVGSVGElement>;

function stroke(d: ReactNode, strokeWidth = 1.8) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}
function fill(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" {...props}>
        {d}
      </svg>
    );
  };
}

export const Sidebar = stroke(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" /></>);
export const Apps = fill(<><rect x="3.5" y="3.5" width="4" height="4" rx="1" /><rect x="10" y="3.5" width="4" height="4" rx="1" /><rect x="16.5" y="3.5" width="4" height="4" rx="1" /><rect x="3.5" y="10" width="4" height="4" rx="1" /><rect x="10" y="10" width="4" height="4" rx="1" /><rect x="16.5" y="10" width="4" height="4" rx="1" /><rect x="3.5" y="16.5" width="4" height="4" rx="1" /><rect x="10" y="16.5" width="4" height="4" rx="1" /><rect x="16.5" y="16.5" width="4" height="4" rx="1" /></>);
export const Search = stroke(<><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>, 2);
export const Bell = stroke(<><path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15zM10 20.5a2 2 0 004 0" /></>);
export const Help = stroke(<><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9.6a2.4 2.4 0 014.6.9c0 1.6-2.3 1.9-2.3 3.5M12 16.8v.1" /></>);
export const Gear = stroke(<><circle cx="12" cy="12" r="3" /><path d="M12 2.8l1.7 2.1 2.7-.5.9 2.6 2.6.9-.5 2.7 2.1 1.7-2.1 1.7.5 2.7-2.6.9-.9 2.6-2.7-.5L12 21.2l-1.7-2.1-2.7.5-.9-2.6-2.6-.9.5-2.7L2.8 12l2.1-1.7-.5-2.7 2.6-.9.9-2.6 2.7.5z" /></>);
export const Plus = stroke(<><path d="M12 5v14M5 12h14" /></>, 2);
export const ChevD = stroke(<><path d="M7 10l5 5 5-5" /></>, 2);
export const More = fill(<><circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18.5" cy="12" r="1.8" /></>);
export const Close = stroke(<><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></>, 2);
export const Check = stroke(<><path d="M5 12.5l4.5 4.5L19 7.5" /></>, 2);
export const CheckCircle = fill(<><path fillRule="evenodd" d="M12 21a9 9 0 100-18 9 9 0 000 18zm4.3-11.3a1 1 0 00-1.5-1.3l-4 4.6-1.6-1.6a1 1 0 10-1.4 1.4l2.4 2.4a1 1 0 001.5-.1z" /></>);
export const InfoCircle = fill(<><path fillRule="evenodd" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-11a1 1 0 00-1 1v5a1 1 0 102 0v-5a1 1 0 00-1-1zm0-3.5a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" /></>);
export const Warn = fill(<><path fillRule="evenodd" d="M13.3 3.8a1.5 1.5 0 00-2.6 0l-8 14A1.5 1.5 0 004 20h16a1.5 1.5 0 001.3-2.2zM12 8.5a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1zm0 7a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" /></>);
export const ErrIc = fill(<><path fillRule="evenodd" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-13.5a1 1 0 00-1 1v4.5a1 1 0 102 0V8.5a1 1 0 00-1-1zm0 7.5a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" /></>);
export const Star = stroke(<><path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" /></>);
export const StarF = fill(<><path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" /></>);
export const Timeline = stroke(<><path d="M4 6.5h9M8 12h12M6 17.5h8" /></>, 2.2);
export const Backlog = stroke(<><rect x="4" y="4.5" width="16" height="4" rx="1" /><rect x="4" y="10.5" width="16" height="4" rx="1" /><path d="M4 18.5h10" /></>);
export const Board = stroke(<><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M9.2 4v16M14.8 4v10" /></>);
export const Reports = stroke(<><path d="M5 19.5v-7M10 19.5V5.5M15 19.5v-9M20 19.5v-12" /></>, 2.2);
export const List = stroke(<><path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" /></>, 2.2);
export const Components = stroke(<><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><path d="M16.75 13.5v6.5M13.5 16.75H20" /></>);
export const Code = stroke(<><path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14" /></>);
export const Releases = stroke(<><path d="M12 3.5l8 4.3v8.4l-8 4.3-8-4.3V7.8zM12 12l8-4.2M12 12L4 7.8M12 12v8.5" /></>);
export const Pages = stroke(<><path d="M7 3.5h7l4.5 4.5v12a.5.5 0 01-.5.5H7a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5zM14 3.5V8h4.5M9.5 12.5h6M9.5 16h6" /></>);
export const Shortcut = stroke(<><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>);
export const Person = fill(<><circle cx="12" cy="8.5" r="4" /><path d="M4 20c.8-4 4-6 8-6s7.2 2 8 6z" /></>);
export const People = stroke(<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2M15.5 5.5a3 3 0 010 6M17.5 14.5c2 .6 3.5 2.2 3.5 5" /></>);
export const Flag = fill(<><path d="M5 3.5a1 1 0 011 1v.3c3-1.4 5.3-.7 7.2 0 1.8.6 3.4 1.2 5.8-.2a.6.6 0 01.9.5v8.2a1 1 0 01-.5.8c-2.9 1.6-5 .9-7 .2-1.9-.6-3.6-1.2-6.4.2v5.9a1 1 0 01-2 0v-16a1 1 0 011-1z" /></>);
export const FlagO = stroke(<><path d="M5.5 21V4.5M5.5 5c3-1.6 5.3-.8 7.3-.1 1.9.7 3.6 1.3 6.2-.2v8.6c-2.6 1.5-4.3.9-6.2.2-2-.7-4.3-1.5-7.3.1" /></>);
export const Link = stroke(<><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>);
export const Trash = stroke(<><path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13M10 11v6M14 11v6" /></>);
export const Eye = stroke(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeF = fill(<><path fillRule="evenodd" d="M12 5c6.5 0 10 7 10 7s-3.5 7-10 7S2 12 2 12s3.5-7 10-7zm0 3.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" /></>);
export const Share = stroke(<><circle cx="17.5" cy="5.5" r="2.5" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="17.5" cy="18.5" r="2.5" /><path d="M8.7 10.8l6.6-3.9M8.7 13.2l6.6 3.9" /></>);
export const Attach = stroke(<><path d="M16.5 6.5v10a4.5 4.5 0 01-9 0V5.5a3 3 0 016 0v10a1.5 1.5 0 01-3 0V7" /></>);
export const Child = stroke(<><rect x="3.5" y="3.5" width="9" height="7" rx="1.5" /><rect x="11.5" y="13.5" width="9" height="7" rx="1.5" /><path d="M8 10.5v6.5h3.5" /></>);
export const Expand = stroke(<><path d="M14 4.5h5.5V10M19.5 4.5L13 11M10 19.5H4.5V14M4.5 19.5L11 13" /></>);
export const Collapse = stroke(<><path d="M19.5 4.5L13.5 10.5M13.5 5.5v5h5M4.5 19.5l6-6M10.5 18.5v-5h-5" /></>);
export const Clock = stroke(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const Branch = stroke(<><circle cx="6.5" cy="5.5" r="2" /><circle cx="6.5" cy="18.5" r="2" /><circle cx="17.5" cy="7.5" r="2" /><path d="M6.5 7.5v9M17.5 9.5c0 4-5 3.5-9.5 7" /></>);
export const Commit = stroke(<><circle cx="12" cy="12" r="3.5" /><path d="M3 12h5.5M15.5 12H21" /></>);
export const Bold = stroke(<><path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z" /></>, 2.2);
export const Italic = stroke(<><path d="M10 5h8M6 19h8M14 5l-4 14" /></>, 2);
export const Ul = stroke(<><path d="M10 6.5h10M10 12h10M10 17.5h10" /><circle cx="5" cy="6.5" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="17.5" r="1" fill="currentColor" /></>);
export const Ol = stroke(<><path d="M10 6.5h10M10 12h10M10 17.5h10M4 5l1.5-1v5M4 14.5a1.5 1.5 0 013 0c0 1-3 2-3 3.5h3" /></>);
export const CodeI = stroke(<><path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5" /></>);
export const At = stroke(<><circle cx="12" cy="12" r="3.5" /><path d="M15.5 12v1.5a2.5 2.5 0 005 0V12a8.5 8.5 0 10-3.4 6.8" /></>);
export const Emoji = stroke(<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14a4 4 0 007 0" /><circle cx="9" cy="9.8" r=".6" fill="currentColor" /><circle cx="15" cy="9.8" r=".6" fill="currentColor" /></>);
export const Table = stroke(<><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M3.5 10h17M3.5 14.8h17M9.5 4.5v15" /></>);
export const Image = stroke(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 16l5-5 4 4 2.5-2.5 5 5" /><circle cx="15.5" cy="9" r="1.5" /></>);
export const Lightning = fill(<><path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z" /></>);
export const SortUp = stroke(<><path d="M12 19V5M6 11l6-6 6 6" /></>, 2.2);
export const SortDown = stroke(<><path d="M12 5v14M6 13l6 6 6-6" /></>, 2.2);
export const MoveTo = stroke(<><path d="M4 12h14M13 6l6 6-6 6" /></>);
export const UserPlus = stroke(<><circle cx="10" cy="8" r="3.5" /><path d="M3.5 19.5c0-3.3 2.9-5.5 6.5-5.5 1.4 0 2.6.3 3.7.9M18 14v6M15 17h6" /></>);
export const Copy = stroke(<><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" /></>);
export const Filter = stroke(<><path d="M4 5.5h16l-6.2 7.2v5.8l-3.6 1.8v-7.6z" /></>);
export const Insights = stroke(<><path d="M12 3.5a6 6 0 00-3.5 10.9V17h7v-2.6A6 6 0 0012 3.5zM9.5 20.5h5" /></>);
export const Logout = stroke(<><path d="M14 4.5h4a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5h-4M10 16.5L5.5 12 10 7.5M5.5 12H15" /></>);
export const Sun = stroke(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>);
export const Moon = stroke(<><path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z" /></>);
export const Keyboard = stroke(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.1M9.5 10h.1M13 10h.1M16.5 10h.1M7.5 14h9" /></>);
export const Book = stroke(<><path d="M4.5 5.5A1.5 1.5 0 016 4h5.5v16H6a1.5 1.5 0 01-1.5-1.5zM19.5 5.5A1.5 1.5 0 0018 4h-5.5v16H18a1.5 1.5 0 001.5-1.5z" /></>);
export const Sparkle = stroke(<><path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8zM18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>);
export const Chat = stroke(<><path d="M4.5 5.5h15a1 1 0 011 1v9a1 1 0 01-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 01-1-1v-9a1 1 0 011-1z" /></>);
export const Dashboard = stroke(<><rect x="3.5" y="4" width="7" height="9" rx="1.5" /><rect x="13.5" y="4" width="7" height="5" rx="1.5" /><rect x="13.5" y="12" width="7" height="8" rx="1.5" /><rect x="3.5" y="16" width="7" height="4" rx="1.5" /></>);
export const Folder = stroke(<><path d="M3.5 6.5a1 1 0 011-1h5l2 2h8a1 1 0 011 1v10a1 1 0 01-1 1h-15a1 1 0 01-1-1z" /></>);
export const Work = stroke(<><rect x="3.5" y="7" width="17" height="12.5" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17" /></>);

// ---------- Issue types and priorities ----------

export const TYPE_NAMES: Record<IssueType, string> = { story: "Story", bug: "Bug", task: "Task", epic: "Epic", subtask: "Subtask" };

const TYPE_ART: Record<IssueType, ReactNode> = {
  story: <><rect width="16" height="16" rx="3" fill="#22a06b" /><path d="M5 3.8h6a.6.6 0 01.6.6v8.1L8 10.2l-3.6 2.3V4.4a.6.6 0 01.6-.6z" fill="#fff" /></>,
  bug: <><rect width="16" height="16" rx="3" fill="#e2483d" /><circle cx="8" cy="8" r="3.4" fill="#fff" /></>,
  task: <><rect width="16" height="16" rx="3" fill="#4bade8" /><path d="M4.6 8.3l2.3 2.3 4.5-4.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
  epic: <><rect width="16" height="16" rx="3" fill="#8f7ee7" /><path d="M9.2 2.8L4.6 9h3l-.8 4.2L11.4 7h-3z" fill="#fff" /></>,
  subtask: <><rect width="16" height="16" rx="3" fill="#4bade8" /><rect x="3.6" y="3.6" width="5.4" height="5.4" rx="1" fill="none" stroke="#fff" strokeWidth="1.4" /><rect x="7" y="7" width="5.4" height="5.4" rx="1" fill="#fff" /></>,
};

export function TypeIcon({ type, label = true }: { type: IssueType; label?: boolean }) {
  return (
    <svg className="ti" viewBox="0 0 16 16" {...(label ? { role: "img", "aria-label": TYPE_NAMES[type] } : { "aria-hidden": true })}>
      {TYPE_ART[type]}
    </svg>
  );
}

export const PRIORITY_NAMES: Record<Priority, string> = { highest: "Highest", high: "High", medium: "Medium", low: "Low", lowest: "Lowest" };
export const PRIORITY_ORDER: Priority[] = ["highest", "high", "medium", "low", "lowest"];

const PRIORITY_ART: Record<Priority, [string, string]> = {
  highest: ["#c9372c", "M3.5 8L8 4l4.5 4M3.5 12.5L8 8.5l4.5 4"],
  high: ["#e2483d", "M3.5 10.5L8 6.5l4.5 4"],
  medium: ["#e56910", "M3.5 6h9M3.5 10h9"],
  low: ["#1d7afc", "M3.5 5.5L8 9.5l4.5-4"],
  lowest: ["#579dff", "M3.5 3.5L8 7.5l4.5-4M3.5 8L8 12l4.5-4"],
};

export function PriorityIcon({ priority }: { priority: Priority }) {
  const [color, d] = PRIORITY_ART[priority];
  return (
    <svg className="pri" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={`${PRIORITY_NAMES[priority]} priority`}>
      <path d={d} />
    </svg>
  );
}

/** The project's default avatar: mountains on `color`. */
export function ProjectAvatar({ color = "#ff8b00", style }: { color?: string; style?: IconProps["style"] }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" style={style}>
      <rect width="32" height="32" rx="6" fill={color} />
      <path d="M6 23l7.5-11 5 7 3-4L27 23z" fill="#fff" />
      <circle cx="21.5" cy="10" r="2.6" fill="#ffe2bd" />
    </svg>
  );
}

// ---------- Brand marks ----------

export function JiraLogo() {
  return (
    <svg aria-hidden="true" fill="#0052CC" viewBox="0 0 24 24"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z" /></svg>
  );
}

export function GitHubLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1024 1024" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" transform="scale(64)" fill="currentColor" /></svg>
  );
}

export function ConfluenceLogo() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path d="M.87 18.257c-.248.382-.53.875-.763 1.245a.764.764 0 0 0 .255 1.04l4.965 3.054a.764.764 0 0 0 1.058-.26c.199-.332.454-.763.733-1.221 1.967-3.247 3.945-2.853 7.508-1.146l4.957 2.337a.764.764 0 0 0 1.028-.382l2.364-5.346a.764.764 0 0 0-.382-1 599.851 599.851 0 0 1-4.965-2.361C10.911 10.97 5.224 11.185.87 18.257zM23.131 5.743c.249-.405.531-.875.764-1.25a.764.764 0 0 0-.256-1.034L18.675.404a.764.764 0 0 0-1.058.26c-.195.335-.451.763-.734 1.225-1.966 3.246-3.945 2.85-7.508 1.146L4.437.694a.764.764 0 0 0-1.027.382L1.046 6.422a.764.764 0 0 0 .382 1c1.039.49 3.105 1.467 4.965 2.361 6.698 3.246 12.392 3.029 16.738-4.04z" /></svg>
  );
}

export function BitbucketLogo() {
  return (
    <svg aria-hidden="true" fill="#0052CC" viewBox="0 0 24 24"><path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" /></svg>
  );
}

export function TrelloLogo() {
  return (
    <svg aria-hidden="true" fill="#0052CC" viewBox="0 0 24 24"><path d="M21.147 0H2.853A2.86 2.86 0 000 2.853v18.294A2.86 2.86 0 002.853 24h18.294A2.86 2.86 0 0024 21.147V2.853A2.86 2.86 0 0021.147 0zM10.34 17.287a.953.953 0 01-.953.953h-4a.954.954 0 01-.954-.953V5.38a.953.953 0 01.954-.953h4a.954.954 0 01.953.953zm9.233-5.467a.944.944 0 01-.953.947h-4a.947.947 0 01-.953-.947V5.38a.953.953 0 01.953-.953h4a.954.954 0 01.953.953z" /></svg>
  );
}

export function LoomLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 256 256" preserveAspectRatio="xMidYMid"><path fill="#625DF5" d="M256 113.765h-74.858l64.83-37.43-14.237-24.667-64.83 37.43 37.421-64.825-24.667-14.246-37.421 64.826V0h-28.476v74.86L76.326 10.027 51.667 24.266 89.096 89.09 24.265 51.668l-14.238 24.66 64.83 37.43H0v28.477h74.85l-64.823 37.43 14.238 24.667 64.824-37.423-37.43 64.825 24.667 14.239 37.429-64.832V256h28.476v-74.853l37.422 64.826 24.665-14.239-37.428-64.832 64.83 37.43 14.24-24.667-64.825-37.423h74.85v-28.477H256ZM128 166.73c-21.472 0-38.876-17.403-38.876-38.876 0-21.472 17.404-38.876 38.876-38.876 21.472 0 38.875 17.404 38.875 38.876 0 21.473-17.403 38.876-38.875 38.876Z" /></svg>
  );
}

export function SlackLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 2447.6 2452.5"><g clipRule="evenodd" fillRule="evenodd"><path d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z" fill="#36c5f0" /><path d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z" fill="#2eb67d" /><path d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z" fill="#ecb22e" /><path d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0" fill="#e01e5a" /></g></svg>
  );
}

export function AtlassianLogo() {
  const id = useId();
  return (
    <svg aria-hidden="true" preserveAspectRatio="xMidYMid" viewBox="0 0 256 256"><defs><linearGradient x1="99.7%" y1="15.8%" x2="39.8%" y2="97.4%" id={id}><stop stopColor="#0052CC" offset="0%" /><stop stopColor="#2684FF" offset="92.3%" /></linearGradient></defs><path d="M76 118c-4-4-10-4-13 1L1 245a7 7 0 0 0 6 10h88c3 0 5-1 6-4 19-39 8-98-25-133Z" fill={`url(#${id})`} /><path d="M122 4c-35 56-33 117-10 163l42 84c1 3 4 4 7 4h87a7 7 0 0 0 7-10L134 4c-2-5-9-5-12 0Z" fill="#2681FF" /></svg>
  );
}
