import { useId, type ReactNode, type SVGProps } from "react";

// The booking page's icons, as drawn in apps/calendly.html, and Google
// Meet's logo (from thesvg.org). Decorative: the text or button next to each
// one carries the meaning.

type IconProps = SVGProps<SVGSVGElement>;

function icon(viewBox: string, d: ReactNode, attrs: IconProps = {}) {
  return function Icon(props: IconProps) {
    return (
      <svg aria-hidden="true" viewBox={viewBox} {...attrs} {...props}>
        {d}
      </svg>
    );
  };
}
const line = (width: number, round = false): IconProps => ({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: width,
  ...(round ? { strokeLinecap: "round", strokeLinejoin: "round" } : {}),
});

export const Back = icon("0 0 20 20", <path d="M16 10H4M9 5l-5 5 5 5" />, line(1.8, true));
export const Calendar = icon("0 0 20 20", <><rect x="2.5" y="3.5" width="15" height="14" rx="2" /><path d="M2.5 8h15M6.5 1.5v4M13.5 1.5v4" /></>, line(1.6));
export const GlobeLarge = icon("0 0 20 20", <><circle cx="10" cy="10" r="8" /><path d="M2 10h16M10 2c2.2 2.2 3.2 5 3.2 8s-1 5.8-3.2 8M10 2C7.8 4.2 6.8 7 6.8 10s1 5.8 3.2 8" /></>, line(1.5));
export const User = icon("0 0 20 20", <><circle cx="10" cy="6.5" r="3.5" /><path d="M3 18c.6-3.6 3.5-6 7-6s6.4 2.4 7 6" strokeLinecap="round" /></>, line(1.6));
export const Check = icon("0 0 24 24", <><circle cx="12" cy="12" r="12" fill="#038164" /><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></>);
export const ChevronLeft = icon("0 0 16 16", <path d="M10 3 5 8l5 5" />, line(2, true));
export const ChevronRight = icon("0 0 16 16", <path d="m6 3 5 5-5 5" />, line(2, true));
export const Globe = icon("0 0 16 16", <><circle cx="8" cy="8" r="6.5" /><path d="M1.5 8h13M8 1.5c1.8 1.8 2.6 4 2.6 6.5S9.8 12.7 8 14.5M8 1.5C6.2 3.3 5.4 5.5 5.4 8s.8 4.7 2.6 6.5" /></>, line(1.3));
export const Caret = icon("0 0 16 16", <path d="M4 6h8l-4 5z" />, { fill: "currentColor" });
export const Clock = icon("0 0 20 20", <><circle cx="10" cy="10" r="8" /><path d="M10 5.5V10l3 2" strokeLinecap="round" /></>, line(1.6));
export const Pin = icon("0 0 20 20", <><path d="M10 18s-5.5-5.2-5.5-9.5a5.5 5.5 0 0 1 11 0C15.5 12.8 10 18 10 18z" /><circle cx="10" cy="8.5" r="2" /></>, line(1.6));

/** Google Meet's logo. Each one gets its own clip path id. */
export function Meet(props: IconProps) {
  const clip = `gm-${useId().replace(/:/g, "")}`;
  return (
    <svg aria-hidden="true" viewBox="0 0 622 512" fill="none" {...props}>
      <g clipPath={`url(#${clip})`}>
        <path d="M351.419 255.568L411.978 324.79L493.418 376.827L507.584 256.005L493.418 137.908L410.418 183.621L351.419 255.568Z" fill="#00832D" />
        <path d="M0.00283051 365.583V468.541C0.00283051 492.049 19.0851 511.136 42.5983 511.136H145.556L166.876 433.344L145.556 365.583L74.9198 344.263L0.00283051 365.583Z" fill="#0066DA" />
        <path d="M145.556 -7.62939e-06L0.00283051 145.554L74.9247 166.822L145.556 145.554L166.488 78.7145L145.556 -7.62939e-06Z" fill="#E94235" />
        <path d="M0.00526047 365.629H145.556V145.551H0.00526047V365.629Z" fill="#2684FC" />
        <path d="M586.398 61.6293L493.416 137.91V376.827L586.782 453.404C600.758 464.352 621.204 454.374 621.204 436.607V78.0861C621.204 60.1224 600.271 50.193 586.396 61.6317" fill="#00AC47" />
        <path d="M351.419 255.568V365.583H145.556V511.136H450.825C474.338 511.136 493.418 492.049 493.418 468.541V376.827L351.419 255.568Z" fill="#00AC47" />
        <path d="M450.825 -7.62939e-06H145.556V145.554H351.419V255.568L493.42 137.905V42.5979C493.42 19.0847 474.338 0.00241891 450.825 0.00241891" fill="#FFBA00" />
      </g>
      <defs>
        <clipPath id={clip}>
          <rect width="621.2" height="512" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
