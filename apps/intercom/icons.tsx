import type { ReactNode, SVGProps } from "react";

// Intercom's icons, as drawn in apps/intercom.html. Decorative: the button
// around each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function icon(size: number, d: ReactNode, attrs: SVGProps<SVGSVGElement> = {}) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" {...attrs} {...props}>
        {d}
      </svg>
    );
  };
}
const J = { strokeLinejoin: "round" } as const;

export const Info = icon(18, <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>);
export const X = icon(18, <path d="M6 6l12 12M18 6L6 18" />, { strokeWidth: 2 });
export const Emoji = icon(18, <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></>);
export const Clip = icon(18, <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7-7l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l8-8" />, J);
export const Bolt = icon(18, <path d="M13 2L4 14h7l-1 8 9-12h-7z" />, { strokeLinecap: undefined, ...J });
export const Inbox = icon(20, <><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" /></>, J);
export const Fin = icon(20, <><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" /></>, J);
export const Book = icon(20, <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5" /><path d="M8 7h7" /></>, J);
export const Chart = icon(20, <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />);
export const Send = icon(20, <path d="M3 11l18-8-8 18-2-8z" />, J);
export const Users = icon(20, <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>);
export const Gear = icon(
  20,
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>,
  J
);
export const Chat = icon(14, <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />, { strokeWidth: 2, ...J });
export const Mail = icon(14, <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>, { strokeWidth: 2, ...J });
export const Clock = icon(12, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, { strokeWidth: 2.2 });
export const Flag = icon(12, <path d="M5 3h2v18H5zM8 4h11l-2.5 4.5L19 13H8z" />, { fill: "currentColor", stroke: undefined });
export const Down = icon(14, <path d="M6 9l6 6 6-6" />, { strokeWidth: 2, ...J });
export const Plus = icon(16, <path d="M12 5v14M5 12h14" />, { strokeWidth: 2 });
export const Search = icon(16, <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>, { strokeWidth: 2 });
export const Check = icon(16, <path d="M5 12.5l4.5 4.5L19 7.5" />, { strokeWidth: 2.2, ...J });
export const Snooze = icon(18, <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3L2 6M19 3l3 3" /></>, J);
export const More = icon(18, <><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></>, { fill: "currentColor", stroke: undefined });
export const Seen = icon(14, <path d="M2 12.5l4 4L14 8.5M10 16.5l1 0L22 8.5" />, { strokeWidth: 2, ...J });
export const Back = icon(20, <path d="M15 18l-6-6 6-6" />, { strokeWidth: 2, ...J });
export const Menu = icon(20, <path d="M4 7h16M4 12h16M4 17h16" />, { strokeWidth: 2 });

/** Intercom's logo, from the mockup (thesvg.org). */
export function Logo(props: IconProps) {
  return (
    <svg aria-hidden="true" fill="currentColor" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.658 1.343 3 3 3h18c1.658 0 3-1.342 3-3V3c0-1.657-1.342-3-3-3zm-5.801 4.399c0-.44.36-.8.802-.8.44 0 .8.36.8.8v10.688c0 .442-.36.801-.8.801-.443 0-.802-.359-.802-.801V4.399zM11.2 3.994c0-.44.357-.799.8-.799s.8.359.8.799v11.602c0 .44-.357.8-.8.8s-.8-.36-.8-.8V3.994zm-4 .405c0-.44.359-.8.799-.8.443 0 .802.36.802.8v10.688c0 .442-.36.801-.802.801-.44 0-.799-.359-.799-.801V4.399zM3.199 6c0-.442.36-.8.802-.8.44 0 .799.358.799.8v7.195c0 .441-.359.8-.799.8-.443 0-.802-.36-.802-.8V6zM20.52 18.202c-.123.105-3.086 2.593-8.52 2.593-5.433 0-8.397-2.486-8.521-2.593-.335-.288-.375-.792-.086-1.128.285-.334.79-.375 1.125-.09.047.041 2.693 2.211 7.481 2.211 4.848 0 7.456-2.186 7.479-2.207.334-.289.839-.25 1.128.086.289.336.25.84-.086 1.128zm.281-5.007c0 .441-.36.8-.801.8-.441 0-.801-.36-.801-.8V6c0-.442.361-.8.801-.8.441 0 .801.357.801.8v7.195z" />
    </svg>
  );
}

// ---------- For a launcher (a desktop's Dock, say) ----------

/** Intercom's mark (the bars and smile) in white, for the black tile. No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="2.2 2.2 19.6 19.6" fill="#fff" {...props}>
      <path d="M15.199 4.399c0-.44.36-.8.802-.8.44 0 .8.36.8.8v10.688c0 .442-.36.801-.8.801-.443 0-.802-.359-.802-.801V4.399zM11.2 3.994c0-.44.357-.799.8-.799s.8.359.8.799v11.602c0 .44-.357.8-.8.8s-.8-.36-.8-.8V3.994zm-4 .405c0-.44.359-.8.799-.8.443 0 .802.36.802.8v10.688c0 .442-.36.801-.802.801-.44 0-.799-.359-.799-.801V4.399zM3.199 6c0-.442.36-.8.802-.8.44 0 .799.358.799.8v7.195c0 .441-.359.8-.799.8-.443 0-.802-.36-.802-.8V6zM20.52 18.202c-.123.105-3.086 2.593-8.52 2.593-5.433 0-8.397-2.486-8.521-2.593-.335-.288-.375-.792-.086-1.128.285-.334.79-.375 1.125-.09.047.041 2.693 2.211 7.481 2.211 4.848 0 7.456-2.186 7.479-2.207.334-.289.839-.25 1.128.086.289.336.25.84-.086 1.128zm.281-5.007c0 .441-.36.8-.801.8-.441 0-.801-.36-.801-.8V6c0-.442.361-.8.801-.8.441 0 .801.357.801.8v7.195z" />
    </svg>
  );
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = "#111";
