import type { ReactNode, SVGProps } from "react";

// Greenhouse's icons, as drawn in apps/greenhouse.html. Decorative: the
// button or text around each one carries its meaning.

type IconProps = SVGProps<SVGSVGElement>;

function icon(d: ReactNode, size?: number) {
  return function Icon({ style, ...props }: IconProps) {
    return (
      <svg aria-hidden="true" className="ic" viewBox="0 0 24 24" style={size ? { width: size, height: size, ...style } : style} {...props}>
        {d}
      </svg>
    );
  };
}

export const Search = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const Bell = icon(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>);
export const Menu = icon(<path d="M4 6h16M4 12h16M4 18h16" />);
export const Pin = icon(<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>, 14);
export const Bag = icon(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>, 14);
export const Close = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const Mail = icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>, 14);
export const Phone = icon(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />, 14);
export const Note = icon(<path d="M4 20h4L19 9l-4-4L4 16z" />, 14);
export const Move = icon(<path d="M5 12h14M13 6l6 6-6 6" />, 14);
export const Clock = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 13);

export function GreenhouseLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" className="gh-logo" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M16.279 7.13c0 1.16-.49 2.185-1.293 2.987-.891.891-2.184 1.114-2.184 1.872 0 1.025 1.65.713 3.231 2.295 1.048 1.047 1.694 2.43 1.694 4.034C17.727 21.482 15.187 24 12 24c-3.187 0-5.727-2.518-5.727-5.68 0-1.607.646-2.989 1.694-4.036 1.582-1.582 3.23-1.27 3.23-2.295 0-.758-1.292-.98-2.183-1.872-.802-.802-1.293-1.827-1.293-3.03 0-2.318 1.895-4.19 4.212-4.19.446 0 .847.067 1.181.067.602 0 .914-.268.914-.691 0-.245-.112-.557-.112-.891 0-.758.647-1.382 1.427-1.382s1.404.646 1.404 1.426c0 .825-.647 1.204-1.137 1.382-.401.134-.713.312-.713.713 0 .758 1.382 1.493 1.382 3.61zm-.446 11.19c0-2.206-1.627-3.99-3.833-3.99-2.206 0-3.833 1.784-3.833 3.99 0 2.184 1.627 3.989 3.833 3.989 2.206 0 3.833-1.808 3.833-3.99zM14.518 7.086c0-1.404-1.136-2.562-2.518-2.562S9.482 5.682 9.482 7.086 10.618 9.65 12 9.65s2.518-1.159 2.518-2.563z" />
    </svg>
  );
}

// ---------- For a launcher (a desktop's Dock, say) ----------

/** Greenhouse's mark in its green, for the dark green tile (as the mockup's top bar). No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return <GreenhouseLogo fill="#3ccf9f" {...props} />;
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = "#23443b";
