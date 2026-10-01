import type { ReactNode } from "react";

// What the desktop holds. Windows carry any React content: a placeholder,
// another kit (<Slack>, <Gmail>), or a whole app.

/** A window to open: `open({ id: "notes", title: "Notes", content: <Notes /> })`. */
export interface MacWindowInput {
  id: string;
  title: string;
  /** The window's icon in the Window menu: a logo, drawn on a tile (default: its Dock item's icon). */
  icon?: ReactNode;
  /** What the window shows. Leave it out and pass `renderWindow` to <MacOS> instead. */
  content?: ReactNode;
  /** The app name the menu bar shows while the window is focused (default: `title`). */
  app?: string;
  /** Dock item this window belongs to: it gets the running dot. */
  dockId?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface MacWindow extends Required<Pick<MacWindowInput, "id" | "title" | "width" | "height" | "x" | "y">> {
  icon?: ReactNode;
  content?: ReactNode;
  app: string;
  dockId?: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface DockItem {
  id: string;
  name: string;
  /**
   * The app's logo: an <svg>, an <img> or a component (`<SlackLogo />`). The
   * Dock puts it on a macOS app icon tile and sizes it; pass the logo, not a tile.
   */
  icon: ReactNode;
  /**
   * What the logo sits on (see AppTile): leave it out for the white glass tile,
   * a CSS color or gradient for a tile of that color, `"full"` for a logo that
   * is already a whole square icon, `"none"` for no tile.
   */
  tile?: string;
  /** Called on click. A window whose `dockId` is this item is restored first, if there is one. */
  onOpen?: () => void;
}

export interface MacToast {
  id: number;
  title: string;
  body?: string;
  /** The Dock id of the app it comes from: its icon is shown. */
  app?: string;
  /** An icon of its own, drawn on a tile like a Dock icon (`tile` as in DockItem). */
  icon?: ReactNode;
  tile?: string;
}

/** Where a notification comes from: `toast(title, body, { app: "slack" })`. */
export type MacToastFrom = Pick<MacToast, "app" | "icon" | "tile">;

export type MacTheme = "light" | "dark";

export interface MacState {
  windows: MacWindow[];
  focused: string | null;
  toasts: MacToast[];
  theme: MacTheme;
}

/** Everything the person using the desktop does. */
export type MacEvent =
  | { type: "open"; id: string }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "restore"; id: string }
  | { type: "maximize"; id: string; maximized: boolean }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "resize"; id: string; width: number; height: number }
  | { type: "dock"; id: string }
  | { type: "menu"; item: string }
  | { type: "theme"; theme: MacTheme };
