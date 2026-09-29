import type { ReactNode, SVGProps } from "react";

// Zendesk's icons, as drawn in apps/zendesk.html (24px grid, stroked by the
// .ic class). Decorative: the button around each one carries its name.

type IconProps = SVGProps<SVGSVGElement>;

function icon(d: ReactNode) {
  return function Icon({ className = "ic", ...props }: IconProps) {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 24 24" {...props}>
        {d}
      </svg>
    );
  };
}

export const Home = icon(<path d="M3 11l9-7 9 7M5 10v10h14V10" />);
export const Views = icon(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 9v11" /></>);
export const Customers = icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.5c2 .6 3.2 2.4 3.5 5.5" /></>);
export const Orgs = icon(<><rect x="4" y="3" width="10" height="18" /><path d="M14 9h6v12h-6M7 7h1M10 7h1M7 11h1M10 11h1M7 15h1M10 15h1" /></>);
export const Reporting = icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />);
export const Admin = icon(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>);
export const Plus = icon(<path d="M12 5v14M5 12h14" />);
export const X = icon(<path d="M6 6l12 12M18 6L6 18" />);
export const Search = icon(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></>);
export const Bell = icon(<path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4" />);
export const Apps = icon(
  <>
    {[6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
  </>
);
export const Help = icon(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17h.01" /></>);
export const Menu = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const Email = icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
export const Chat = icon(<path d="M4 5h16v11H9l-5 4z" />);
export const Web = icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>);
export const Ticket = icon(<path d="M4 7a2 2 0 002-2h12a2 2 0 002 2v2a3 3 0 000 6v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a3 3 0 000-6z" />);
export const ChevronDown = icon(<path d="M6 9l6 6 6-6" />);
export const ChevronUp = icon(<path d="M6 15l6-6 6 6" />);
export const List = icon(<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />);
export const Link = icon(<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />);
export const Attach = icon(<path d="M20 11l-8.5 8.5a5 5 0 01-7-7L13 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L14 7" />);
export const Emoji = icon(<><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4 4 0 007 0M9 9.5h.01M15 9.5h.01" /></>);
export const Bolt = icon(<path d="M13 3L5 14h6l-1 7 8-11h-6z" />);

export const CHANNEL = { email: Email, web: Web, chat: Chat };

/** The Zendesk mark (thesvg.org), as in the mockup. */
export function ZendeskLogo() {
  return (
    <svg className="zd-logo" aria-label="Zendesk" fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.914 2.904V16.29L24 2.905H12.914zM0 2.906C0 5.966 2.483 8.45 5.543 8.45s5.542-2.484 5.543-5.544H0zm11.086 4.807L0 21.096h11.086V7.713zm7.37 7.84c-3.063 0-5.542 2.48-5.542 5.543H24c0-3.06-2.48-5.543-5.543-5.543z" />
    </svg>
  );
}
