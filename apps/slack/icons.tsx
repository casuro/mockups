import type { ReactNode, SVGProps } from "react";

// Slack's icons, as drawn in apps/slack.html. Decorative: the button around
// each one carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function outline(d: ReactNode, strokeWidth = 1.6) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} {...props}>
        {d}
      </svg>
    );
  };
}
function rounded(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {d}
      </svg>
    );
  };
}
function solid(d: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" {...props}>
        {d}
      </svg>
    );
  };
}

export const Menu = solid(<path d="M3 5h14v1.5H3zm0 4.25h14v1.5H3zM3 13.5h14V15H3z" />);
export const Back = outline(<path d="M12 4l-6 6 6 6" />);
export const Forward = outline(<path d="M8 4l6 6-6 6" />);
export const History = outline(<><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></>);
export const Search = outline(<><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4" /></>, 1.8);
export const Moon = outline(<path d="M16 12.5A6.5 6.5 0 017.5 4a6.5 6.5 0 108.5 8.5z" />);
export const Help = outline(<><circle cx="10" cy="10" r="7.5" /><path d="M7.8 8a2.3 2.3 0 014.4.8c0 1.5-2.2 1.9-2.2 3.2M10 14.5v.1" /></>);
export const Home = solid(<path d="M10 2.5l7 5.5v9h-5v-5H8v5H3V8z" />);
export const Bubble = outline(<path d="M4 4h12v9H8l-4 3z" />);
export const Bell = outline(<path d="M10 3a5 5 0 015 5v3l1.5 3h-13L5 11V8a5 5 0 015-5zM8 16.5a2 2 0 004 0" />);
export const Dots = outline(<><circle cx="5" cy="10" r="1.3" /><circle cx="10" cy="10" r="1.3" /><circle cx="15" cy="10" r="1.3" /></>);
export const Pencil = outline(<path d="M13.5 3.5l3 3L8 15H5v-3z" />, 1.7);
export const At = outline(<><circle cx="10" cy="10" r="3" /><path d="M13 10v1.5a2 2 0 004 0V10a7 7 0 10-3 5.7" /></>);
export const Bookmark = outline(<path d="M6 3h8v14l-4-3-4 3z" />);
export const Caret = solid(<path d="M5 7l5 6 5-6z" />);
export const MoreV = solid(<><circle cx="10" cy="4.5" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="10" cy="15.5" r="1.4" /></>);
export const MoreH = solid(<><circle cx="4.5" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="15.5" cy="10" r="1.4" /></>);
export const CanvasDoc = outline(<><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M7 7h6M7 10h6M7 13h4" /></>);
export const Files = outline(<path d="M4 6h12M4 10h12M4 14h8" />);
export const Plus = outline(<path d="M10 4v12M4 10h12" />);
export const PlusBold = outline(<path d="M10 5v10M5 10h10" />, 1.8);
export const Link = outline(<path d="M8.5 11.5a3 3 0 004.2 0l2.5-2.5a3 3 0 00-4.2-4.2L10 5.8M11.5 8.5a3 3 0 00-4.2 0L4.8 11a3 3 0 004.2 4.2l1-1" />);
export const List = outline(<><path d="M8 6h9M8 10h9M8 14h9" /><circle cx="4" cy="6" r=".8" fill="currentColor" /><circle cx="4" cy="10" r=".8" fill="currentColor" /><circle cx="4" cy="14" r=".8" fill="currentColor" /></>);
export const Code = outline(<path d="M7 6l-4 4 4 4M13 6l4 4-4 4" />);
export const CodeBlock = outline(<><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M7 8l-2 2 2 2M13 8l2 2-2 2" /></>);
export const Emoji = outline(<><circle cx="10" cy="10" r="7" /><path d="M7 12a3.5 3.5 0 006 0" /><circle cx="7.5" cy="8" r=".6" fill="currentColor" /><circle cx="12.5" cy="8" r=".6" fill="currentColor" /></>);
export const Video = outline(<><rect x="3" y="6" width="10" height="8" rx="2" /><path d="M13 9l4-2v6l-4-2" /></>);
export const Audio = outline(<><rect x="7.5" y="3" width="5" height="9" rx="2.5" /><path d="M5 10a5 5 0 0010 0M10 15v2" /></>);
export const Send = solid(<path d="M3 3l15 7-15 7 2-7zm2 7h6" />);
export const Close = outline(<path d="M5 5l10 10M15 5L5 15" />, 1.8);

const SLASH = <path d="M3.5 3.5l13 13" />;
export const Headphones = rounded(<><path d="M3.5 12.5V10a6.5 6.5 0 0113 0v2.5" /><rect x="2.5" y="11.5" width="4" height="5.5" rx="1.5" /><rect x="13.5" y="11.5" width="4" height="5.5" rx="1.5" /></>);
export const Mic = rounded(<><rect x="7.5" y="2.5" width="5" height="9.5" rx="2.5" /><path d="M4.5 9.5a5.5 5.5 0 0011 0M10 15v2.5" /></>);
export const MicOff = rounded(<><rect x="7.5" y="2.5" width="5" height="9.5" rx="2.5" /><path d="M4.5 9.5a5.5 5.5 0 0011 0M10 15v2.5" />{SLASH}</>);
export const Cam = rounded(<><rect x="2.5" y="5.5" width="10.5" height="9" rx="2" /><path d="M13 9l4.5-2.5v7L13 11" /></>);
export const CamOff = rounded(<><rect x="2.5" y="5.5" width="10.5" height="9" rx="2" /><path d="M13 9l4.5-2.5v7L13 11" />{SLASH}</>);
export const Screen = rounded(<><rect x="2.5" y="3.5" width="15" height="10.5" rx="1.5" /><path d="M7 17.5h6M10 14v3.5" /></>);
export const Smile = rounded(<><circle cx="10" cy="10" r="7" /><path d="M7 12a3.5 3.5 0 006 0" /><circle cx="7.5" cy="8" r=".5" fill="currentColor" /><circle cx="12.5" cy="8" r=".5" fill="currentColor" /></>);
export const Expand = rounded(<path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5l-5.5 5.5M3.5 16.5L9 11" />);
export const Minimize = rounded(<path d="M4.5 10h11" />);
export const LinkRounded = rounded(<path d="M8.5 11.5a3 3 0 004.2 0l2.5-2.5a3 3 0 00-4.2-4.2L10 5.8M11.5 8.5a3 3 0 00-4.2 0L4.8 11a3 3 0 004.2 4.2l1-1" />);

export function SlackLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 2447.6 2452.5" xmlns="http://www.w3.org/2000/svg">
      <g clipRule="evenodd" fillRule="evenodd">
        <path d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z" fill="#36c5f0" />
        <path d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z" fill="#2eb67d" />
        <path d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z" fill="#ecb22e" />
        <path d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0" fill="#e01e5a" />
      </g>
    </svg>
  );
}
