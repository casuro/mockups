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

// ---------- For a launcher (a desktop's Dock, say) ----------

/** Calendly's mark in Calendly blue, for the white tile. No fixed size: it fills the box it is put in. */
export function AppLogo(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="#006BFF" {...props}>
      <path d="M19.655 14.262c.281 0 .557.023.828.064 0 .005-.005.01-.005.014-.105.267-.234.534-.381.786l-1.219 2.106c-1.112 1.936-3.177 3.127-5.411 3.127h-2.432c-2.23 0-4.294-1.191-5.412-3.127l-1.218-2.106a6.251 6.251 0 0 1 0-6.252l1.218-2.106C6.736 4.832 8.8 3.641 11.035 3.641h2.432c2.23 0 4.294 1.191 5.411 3.127l1.219 2.106c.147.252.271.519.381.786 0 .004.005.009.005.014-.267.041-.543.064-.828.064-1.816 0-2.501-.607-3.291-1.306-.764-.676-1.711-1.517-3.44-1.517h-1.029c-1.251 0-2.387.455-3.2 1.278-.796.805-1.233 1.904-1.233 3.099v1.411c0 1.196.437 2.295 1.233 3.099.813.823 1.949 1.278 3.2 1.278h1.034c1.729 0 2.676-.841 3.439-1.517.791-.703 1.471-1.306 3.287-1.301Zm.005-3.237c.399 0 .794-.036 1.179-.11-.002-.004-.002-.01-.002-.014-.073-.414-.193-.823-.349-1.218.731-.12 1.407-.396 1.986-.819 0-.004-.005-.013-.005-.018-.331-1.085-.832-2.101-1.489-3.03-.649-.915-1.435-1.719-2.331-2.395-1.867-1.398-4.088-2.138-6.428-2.138-1.448 0-2.855.28-4.175.841-1.273.543-2.423 1.315-3.407 2.299S2.878 6.552 2.341 7.83c-.557 1.324-.842 2.726-.842 4.175 0 1.448.281 2.855.842 4.174.542 1.274 1.314 2.423 2.298 3.407s2.129 1.761 3.407 2.299c1.324.556 2.727.841 4.175.841 2.34 0 4.561-.74 6.428-2.137a10.815 10.815 0 0 0 2.331-2.396c.652-.929 1.158-1.949 1.489-3.03 0-.004.005-.014.005-.018-.579-.423-1.255-.699-1.986-.819.161-.395.276-.804.349-1.218.005-.009.005-.014.005-.023.869.166 1.692.506 2.404 1.035.685.505.552 1.075.446 1.416C22.184 20.437 17.619 24 12.221 24c-6.625 0-12-5.375-12-12s5.37-12 12-12c5.398 0 9.963 3.563 11.471 8.464.106.341.239.915-.446 1.421-.717.529-1.535.873-2.404 1.034.128.716.128 1.45 0 2.166-.387-.074-.782-.11-1.182-.11-4.184 0-3.968 2.823-6.736 2.823h-1.029c-1.899 0-3.15-1.357-3.15-3.095v-1.411c0-1.738 1.251-3.094 3.15-3.094h1.034c2.768 0 2.552 2.823 6.731 2.827Z" />
    </svg>
  );
}

/** The Dock tile behind AppLogo: undefined is the plain white tile, a CSS color or gradient is a tile in that color, "full" means AppLogo is itself the whole icon. */
export const appTile: string | undefined = undefined;
