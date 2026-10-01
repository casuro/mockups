import type { ReactNode, SVGProps } from "react";

// Confluence's icons, as drawn in apps/confluence.html. Decorative: the
// button around each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function solid(d: ReactNode, size = 16) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
        {d}
      </svg>
    );
  };
}

/** The Confluence mark (thesvg.org). */
export function Logo(props: IconProps) {
  return (
    <svg className="logo" fill="#1868DB" aria-hidden="true" viewBox="0 0 24 24" {...props}>
      <path d="M.87 18.257c-.248.382-.53.875-.763 1.245a.764.764 0 0 0 .255 1.04l4.965 3.054a.764.764 0 0 0 1.058-.26c.199-.332.454-.763.733-1.221 1.967-3.247 3.945-2.853 7.508-1.146l4.957 2.337a.764.764 0 0 0 1.028-.382l2.364-5.346a.764.764 0 0 0-.382-1 599.851 599.851 0 0 1-4.965-2.361C10.911 10.97 5.224 11.185.87 18.257zM23.131 5.743c.249-.405.531-.875.764-1.25a.764.764 0 0 0-.256-1.034L18.675.404a.764.764 0 0 0-1.058.26c-.195.335-.451.763-.734 1.225-1.966 3.246-3.945 2.85-7.508 1.146L4.437.694a.764.764 0 0 0-1.027.382L1.046 6.422a.764.764 0 0 0 .382 1c1.039.49 3.105 1.467 4.965 2.361 6.698 3.246 12.392 3.029 16.738-4.04z" />
    </svg>
  );
}

export const Menu = solid(<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />, 20);
export const Apps = solid(
  <>
    {[4, 10, 16].flatMap((y) => [4, 10, 16].map((x) => <rect key={`${x}.${y}`} x={x} y={y} width="4" height="4" rx="1" />))}
  </>,
  20
);
export const Chevron = solid(<path d="M8.3 10.3a1 1 0 0 1 1.4 0L12 12.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 0-1.4z" />);
export const Plus = solid(<path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />);
export const Search = solid(<path d="M10 4a6 6 0 1 0 3.6 10.8l4.3 4.3a1 1 0 0 0 1.4-1.4l-4.3-4.3A6 6 0 0 0 10 4zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0z" />);
export const Bell = solid(<path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.3A1 1 0 0 0 5 17h14a1 1 0 0 0 .7-1.7L18 12.6V9a6 6 0 0 0-6-6zm-2 15a2 2 0 0 0 4 0z" />, 20);
export const Theme = solid(<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2v14a7 7 0 0 1 0-14z" />, 18);
export const Caret = solid(<path d="M10.3 8.3a1 1 0 0 1 1.4 0l3 3a1 1 0 0 1 0 1.4l-3 3a1 1 0 0 1-1.4-1.4l2.3-2.3-2.3-2.3a1 1 0 0 1 0-1.4z" />);
export const Page = solid(<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h10V9h-4V5zm2 7h6v2H9zm0 3h6v2H9z" />);
export const Home = solid(<path d="M12 3.5 3 10v10a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1V10zM5 11l7-5 7 5v8h-2v-6H7v6H5z" />);
export const Blog = solid(<path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v12h12V6zm2 2h8v2H8zm0 4h8v2H8z" />);
export const Edit = solid(<path d="M15.3 4.3a2.4 2.4 0 0 1 3.4 3.4L8.5 17.9 4 19l1.1-4.5zm2 1.4a.4.4 0 0 0-.6 0L7 15.4l-.3 1.3 1.3-.3 9.7-9.7a.4.4 0 0 0 0-.6z" />);
export const More = solid(
  <>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </>,
  18
);
export const Like = solid(<path d="M9 10V20H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zm2 0 3.4-6.3a1.5 1.5 0 0 1 2.7 1.2L16 9h3.3a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 18 20h-7z" />);

const STAR = "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z";
export function Star({ on }: { on: boolean }) {
  return on ? (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={STAR} /></svg>
  ) : (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d={STAR} /></svg>
  );
}

export function Check() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** The Jira issue-type square on a smart link. */
export function JiraIssue() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#4bade8" />
      <path d="M8 12.5l2.6 2.5L16 9.5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Panel icons, by tone. */
export const PanelIcon = {
  info: solid(<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 8a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-5a1 1 0 0 0-1-1zm0-4a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 12 6z" />, 18),
  note: solid(<path d="M5 3h10l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 7h8v2H8zm0 4h6v2H8z" />, 18),
  warning: solid(<path d="M13.7 3.4 22 18.5A2 2 0 0 1 20.3 21H3.7A2 2 0 0 1 2 18.5l8.3-15.1a2 2 0 0 1 3.4 0zM12 15.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM12 8a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1z" />, 18),
  success: solid(<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm4.3 6.3L10.5 14l-2.8-2.7a1 1 0 0 0-1.4 1.4l3.5 3.5a1 1 0 0 0 1.4 0l6.5-6.5a1 1 0 0 0-1.4-1.4z" />, 18),
};

// ---------- For a launcher (a desktop's Dock, say) ----------

/** The Confluence mark in white, for the Confluence blue tile. No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return <Logo fill="#fff" {...props} />;
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = "#1868DB";
