import { Children, isValidElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import "./tile.css";

// The app icon tile of macOS Tahoe: a squircle of glass with a light rim, a
// soft shadow, and any logo inside. Give it a logo and it makes an icon of it;
// the Dock, the phone's home screen, notifications and the Window menu all
// draw their apps with it.

export interface AppTileProps {
  /**
   * The logo: an <svg>, an <img>, a component that renders one, an emoji
   * ("📊"), or a letter or short word ("A", "Ops"). Text is set to fit the tile.
   */
  children?: ReactNode;
  /**
   * What the logo sits on. Leave it out for Tahoe's white glass tile (`"#fff"`
   * and `"white"` mean the same). Any CSS color or gradient gives a tile of
   * that color, still glass. `"full"`: the logo is already a whole square
   * icon (Zoom, Teams); it is cut to the tile's shape, edge to edge.
   * `"none"`: the logo alone, no tile (like the Trash in the Dock).
   */
  tile?: string;
  /** Room around the logo, as a share of the tile (default "19%"; 0 for `"full"` and `"none"`). */
  inset?: string | number;
  className?: string;
  style?: CSSProperties;
}

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const WHITE = new Set(["", "default", "#fff", "#ffffff", "white"]);

/** A macOS Tahoe app icon around any logo. Fills its parent's width and stays square. */
export function AppTile({ children, tile, inset, className, style }: AppTileProps) {
  // A tile given a tile, or a built-in icon, is drawn once: never a tile on a tile.
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  if (isValidElement(only) && TILED.has(only.type as ElementType)) return only;

  // Text (a string, or a plain element holding one) is set to fit: an emoji
  // fills the logo's box, a letter or word is bold and shrinks as it grows.
  const text = typeof only === "string" || typeof only === "number" ? String(only)
    : isValidElement<{ children?: unknown }>(only) && typeof only.type === "string" && typeof only.props.children === "string" ? only.props.children : null;
  const art = text === null ? children
    : <span className={EMOJI.test(text) ? "mt-emoji" : "mt-text"} data-len={Math.min([...text.trim()].length, 5)}>{text.trim()}</span>;

  const t = (tile ?? "").trim();
  const kind = t === "none" || t === "full" ? t : WHITE.has(t.toLowerCase()) ? "default" : "color";
  const pad = inset ?? (kind === "default" || kind === "color" ? undefined : 0);
  const vars = {
    ...(kind === "color" ? { "--mt-bg": t } : null),
    ...(pad !== undefined ? { "--mt-inset": typeof pad === "number" ? `${pad}%` : pad } : null),
    ...style,
  } as CSSProperties;
  return (
    <span className={["mac-tile", className].filter(Boolean).join(" ")} data-tile={kind} data-ink={kind === "color" && light(t) ? "dark" : undefined} style={vars}>
      <span className="mt-body">
        {/* A whole icon drawn rounder than the tile: a larger copy behind fills the corners with its own edge. */}
        {kind === "full" && <span className="mt-under" aria-hidden="true">{art}</span>}
        <span className="mt-art">{art}</span>
      </span>
    </span>
  );
}

/** Whether a tile color is light, judged by its first hex color: text on it is then dark. */
function light(color: string) {
  const hex = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i.exec(color)?.[1];
  if (!hex) return false;
  const [r, g, b] = (hex.length === 3 ? [...hex].map((c) => c + c) : hex.match(/../g)!).map((c) => parseInt(c, 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.75;
}

/** Components that already draw a whole tile; AppTile passes them through untouched. */
export const TILED = new Set<ElementType>([AppTile]);
