import type { ReactNode } from "react";

/** What `open()` takes: any React content, shown in a GNOME window. */
export interface LinuxWindowInput {
  /** One window per id: opening an id that is already open brings it back. */
  id: string;
  /** Centered in the header bar. */
  title: ReactNode;
  /** Used where the window is listed; the dock uses the app's own icon. */
  icon?: ReactNode;
  /** Anything: an app kit, an iframe, a form. It fills the window below the header. */
  content: ReactNode;
  /** Header bar extras, left of the title and right of it (before the window buttons). */
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
  /** Size and place in the desktop area (right of the dock, below the top bar). Defaults: 720x480, cascaded. */
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

export interface LinuxWindow extends LinuxWindowInput {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
  minimized: boolean;
  /** Stacking order: higher is in front. */
  z: number;
}

/** An app in the dock and the app grid. */
export interface LinuxApp {
  id: string;
  name: string;
  icon: ReactNode;
  /** Pinned to the dock (default true). Every app is in the app grid. */
  dock?: boolean;
  /** The window it opens (its title defaults to the app's name). Without it, launching only sends a `launch` event for you to handle. */
  window?: () => Omit<LinuxWindowInput, "id" | "title"> & { title?: ReactNode };
}

export interface LinuxToast {
  id: number;
  title: string;
  body?: string;
}

export interface LinuxState {
  /** In the order they were opened; `z` says which is in front. */
  windows: LinuxWindow[];
  focused: string | null;
  dark: boolean;
  toast: LinuxToast | null;
}

/** Everything that happens on the desktop, from the person or from your calls. */
export type LinuxEvent =
  | { type: "launch"; app: string }
  | { type: "open"; id: string }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "maximize"; id: string; maximized: boolean }
  | { type: "theme"; dark: boolean };
