import type { ReactNode } from "react";

// The desktop's data. A window is any React content in a Windows 11 frame;
// launchers are what the taskbar and Start menu show.

export type Theme = "light" | "dark";

/** What `open` takes: any React content, framed as a window. */
export interface WindowSpec {
  /** Opening an id that is already open restores and focuses that window. */
  id: string;
  title: string;
  /** 16px in the title bar, 24px on the taskbar when the window has no launcher. */
  icon?: ReactNode;
  /** The window's body. Without it, `<Windows renderWindow>` draws it. */
  content?: ReactNode;
  /** The launcher it belongs to, so its taskbar button shows it running. Defaults to `id`. */
  app?: string;
  width?: number;
  height?: number;
  /** Top-left corner in the desktop's box; cascaded from the center when left out. */
  x?: number;
  y?: number;
  maximized?: boolean;
}

/** An open window, as the desktop holds it. */
export interface DesktopWindow extends WindowSpec {
  app: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  minimized: boolean;
  /** Stacking order: higher is in front. */
  z: number;
}

/** An app on the taskbar and in Start. */
export interface Launcher {
  id: string;
  name: string;
  icon: ReactNode;
  /** The window it opens. Leave it out to only get a `launch` event and open something yourself. */
  window?: () => Omit<WindowSpec, "id" | "title" | "icon"> & Partial<Pick<WindowSpec, "id" | "title" | "icon">>;
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  /** The app name shown above the title. */
  app?: string;
  icon?: ReactNode;
  /** Milliseconds on screen. Default 5000; 0 keeps it until dismissed. */
  duration?: number;
}

export interface User {
  name: string;
  /** A picture URL; initials on a gradient when missing. */
  photo?: string;
  initials?: string;
}

/** Everything the person does, for the world to react to. */
export type WindowsEvent =
  | { type: "launch"; app: string }
  | { type: "open" | "close" | "focus" | "minimize" | "restore" | "maximize" | "unmaximize"; id: string }
  | { type: "start"; open: boolean }
  | { type: "search"; query: string }
  | { type: "theme"; theme: Theme }
  | { type: "power" }
  | { type: "toast-click"; id: string };
