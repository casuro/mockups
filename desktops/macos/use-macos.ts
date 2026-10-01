import { useCallback, useMemo, useRef, useState } from "react";
import type { MacEvent, MacState, MacTheme, MacToastFrom, MacWindow, MacWindowInput } from "./types";

// The desktop behind <MacOS>: which windows are open, where, and in what
// order. What the world does (open a window, toast) and what the person does
// (drag, close, minimize) both go through here; the person's actions are also
// reported through `onEvent`. Every function returned is stable.

export interface MacOSOptions {
  /** Windows open at the start. */
  windows?: MacWindowInput[];
  theme?: MacTheme;
  onEvent?: (event: MacEvent) => void;
}

export interface MacOSDesktop {
  state: MacState;
  /** Opens a window, or brings it back to the front when one with this id is open. */
  open: (win: MacWindowInput) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveTo: (id: string, x: number, y: number) => void;
  resizeTo: (id: string, width: number, height: number) => void;
  /**
   * A notification banner in the top right corner, gone after a few seconds.
   * `from` names the app it comes from, by Dock id (`{ app: "slack" }`), or
   * gives an icon (`{ icon: <SlackLogo /> }`); without it, the Apple logo.
   */
  toast: (title: string, body?: string, from?: MacToastFrom) => void;
  dismissToast: (id: number) => void;
  setTheme: (theme: MacTheme) => void;
  /** Reports a person's action to `onEvent` (used by <MacOS>). */
  emit: (event: MacEvent) => void;
}

let cascade = 0;
function place(win: MacWindowInput, z: number): MacWindow {
  const n = cascade++ % 6;
  return {
    id: win.id,
    title: win.title,
    icon: win.icon,
    content: win.content,
    app: win.app ?? win.title,
    dockId: win.dockId,
    width: win.width ?? 720,
    height: win.height ?? 440,
    x: win.x ?? 120 + n * 26,
    y: win.y ?? 50 + n * 26,
    z,
    minimized: false,
    maximized: false,
  };
}

export function useMacOS(options: MacOSOptions = {}): MacOSDesktop {
  const [state, setState] = useState<MacState>(() => ({
    windows: (options.windows ?? []).map((w, i) => place(w, i + 1)),
    focused: options.windows?.at(-1)?.id ?? null,
    toasts: [],
    theme: options.theme ?? "light",
  }));
  const onEvent = useRef(options.onEvent);
  onEvent.current = options.onEvent;
  const toastId = useRef(0);

  const emit = useCallback((event: MacEvent) => onEvent.current?.(event), []);
  const top = (s: MacState) => Math.max(0, ...s.windows.map((w) => w.z)) + 1;
  // The window in front that is not minimized, after `s` changed.
  const front = (s: MacState) => s.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null;
  const patch = useCallback((id: string, fn: (w: MacWindow) => Partial<MacWindow>) =>
    setState((s) => ({ ...s, windows: s.windows.map((w) => (w.id === id ? { ...w, ...fn(w) } : w)) })), []);

  const focus = useCallback((id: string) =>
    setState((s) => {
      if (s.focused === id) return s;
      const z = top(s);
      return { ...s, focused: id, windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)) };
    }), []);

  const open = useCallback((win: MacWindowInput) =>
    setState((s) => {
      const z = top(s);
      const exists = s.windows.some((w) => w.id === win.id);
      const windows = exists
        ? s.windows.map((w) => (w.id === win.id ? { ...w, z, minimized: false, content: win.content ?? w.content } : w))
        : [...s.windows, place(win, z)];
      return { ...s, windows, focused: win.id };
    }), []);

  const close = useCallback((id: string) =>
    setState((s) => {
      const next = { ...s, windows: s.windows.filter((w) => w.id !== id) };
      return { ...next, focused: s.focused === id ? front(next) : s.focused };
    }), []);

  const minimize = useCallback((id: string) =>
    setState((s) => {
      const next = { ...s, windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) };
      return { ...next, focused: s.focused === id ? front(next) : s.focused };
    }), []);

  const restore = useCallback((id: string) => focus(id), [focus]);
  const toggleMaximize = useCallback((id: string) => patch(id, (w) => ({ maximized: !w.maximized })), [patch]);
  const moveTo = useCallback((id: string, x: number, y: number) => patch(id, () => ({ x, y })), [patch]);
  const resizeTo = useCallback((id: string, width: number, height: number) => patch(id, () => ({ width, height })), [patch]);

  const dismissToast = useCallback((id: number) => setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })), []);
  const toast = useCallback((title: string, body?: string, from?: MacToastFrom) => {
    const id = ++toastId.current;
    setState((s) => ({ ...s, toasts: [{ id, title, body, ...from }, ...s.toasts] }));
    setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast]);
  const setTheme = useCallback((theme: MacTheme) => setState((s) => ({ ...s, theme })), []);

  return useMemo(
    () => ({ state, open, close, focus, minimize, restore, toggleMaximize, moveTo, resizeTo, toast, dismissToast, setTheme, emit }),
    [state, open, close, focus, minimize, restore, toggleMaximize, moveTo, resizeTo, toast, dismissToast, setTheme, emit]
  );
}
