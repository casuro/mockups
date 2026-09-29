import { useCallback, useMemo, useRef, useState } from "react";
import type { LinuxEvent, LinuxState, LinuxWindow, LinuxWindowInput } from "./types";

// The desktop behind <Linux>: which windows are open, where, and in what
// order. The world calls open / close / focus / toast; everything that
// happens is also reported through `onEvent`. Every function it returns is
// stable across renders, and each reads the latest state through a ref, so
// calls made between renders (timers, awaited replies) see what the last
// one wrote.

export interface LinuxOptions {
  /** Windows open from the start. */
  windows?: LinuxWindowInput[];
  /** Start in Dark Style (default false). */
  dark?: boolean;
  onEvent?: (event: LinuxEvent) => void;
}

export interface LinuxDesktop {
  state: LinuxState;
  /** Opens a window, or brings back the open one with the same id. */
  open: (window: LinuxWindowInput) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  /** Place and size in the desktop area, in pixels. */
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, width: number, height: number) => void;
  /** A GNOME notification banner at the top, gone after a few seconds. */
  toast: (title: string, body?: string) => void;
  setDark: (dark: boolean) => void;
  /** Reports a launch from the dock or app grid (used by <Linux>). */
  emit: (event: LinuxEvent) => void;
}

export function useLinux(options: LinuxOptions = {}): LinuxDesktop {
  const onEvent = useRef(options.onEvent);
  onEvent.current = options.onEvent;
  const [state, setState] = useState<LinuxState>(() => {
    const s: LinuxState = { windows: [], focused: null, dark: !!options.dark, toast: null };
    for (const w of options.windows ?? []) add(s, w);
    return s;
  });
  const ref = useRef(state);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const emit = useCallback((event: LinuxEvent) => onEvent.current?.(event), []);
  const update = useCallback((change: (s: LinuxState) => LinuxState) => {
    ref.current = change(ref.current);
    setState(ref.current);
  }, []);
  const find = (id: string) => ref.current.windows.find((w) => w.id === id);
  const patch = (id: string, p: Partial<LinuxWindow>) =>
    update((s) => ({ ...s, windows: s.windows.map((w) => (w.id === id ? { ...w, ...p } : w)) }));

  const focus = useCallback((id: string) => {
    const w = find(id);
    if (!w) return;
    const top = Math.max(0, ...ref.current.windows.map((x) => x.z));
    if (ref.current.focused === id && w.z === top && !w.minimized) return;
    update((s) => ({ ...s, focused: id, windows: s.windows.map((x) => (x.id === id ? { ...x, minimized: false, z: top + 1 } : x)) }));
    emit({ type: "focus", id });
  }, [emit, update]);

  const open = useCallback((input: LinuxWindowInput) => {
    if (find(input.id)) {
      patch(input.id, { title: input.title, icon: input.icon, content: input.content, headerStart: input.headerStart, headerEnd: input.headerEnd });
      return focus(input.id);
    }
    update((s) => {
      const next = { ...s, windows: [...s.windows] };
      add(next, input);
      return next;
    });
    emit({ type: "open", id: input.id });
  }, [emit, focus, update]);

  const close = useCallback((id: string) => {
    if (!find(id)) return;
    update((s) => {
      const windows = s.windows.filter((w) => w.id !== id);
      return { ...s, windows, focused: s.focused === id ? frontmost(windows) : s.focused };
    });
    emit({ type: "close", id });
  }, [emit, update]);

  const minimize = useCallback((id: string) => {
    if (!find(id)) return;
    update((s) => {
      const windows = s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
      return { ...s, windows, focused: s.focused === id ? frontmost(windows) : s.focused };
    });
    emit({ type: "minimize", id });
  }, [emit, update]);

  const toggleMaximize = useCallback((id: string) => {
    const w = find(id);
    if (!w) return;
    patch(id, { maximized: !w.maximized });
    emit({ type: "maximize", id, maximized: !w.maximized });
  }, [emit]);

  const move = useCallback((id: string, x: number, y: number) => patch(id, { x: Math.round(x), y: Math.round(y), maximized: false }), []);
  const resize = useCallback((id: string, width: number, height: number) => patch(id, { width: Math.round(width), height: Math.round(height), maximized: false }), []);

  const toast = useCallback((title: string, body?: string) => {
    clearTimeout(toastTimer.current);
    update((s) => ({ ...s, toast: { id: Date.now(), title, body } }));
    toastTimer.current = setTimeout(() => update((s) => ({ ...s, toast: null })), 3500);
  }, [update]);

  const setDark = useCallback((dark: boolean) => {
    update((s) => ({ ...s, dark }));
    emit({ type: "theme", dark });
  }, [emit, update]);

  return useMemo(
    () => ({ state, open, close, focus, minimize, toggleMaximize, move, resize, toast, setDark, emit }),
    [state, open, close, focus, minimize, toggleMaximize, move, resize, toast, setDark, emit]
  );
}

// New windows cascade from the top left of the desktop area and come to the front.
function add(s: LinuxState, input: LinuxWindowInput) {
  const n = s.windows.length % 6;
  s.windows.push({
    ...input,
    width: input.width ?? 720,
    height: input.height ?? 480,
    x: input.x ?? 80 + n * 32,
    y: input.y ?? 40 + n * 28,
    maximized: !!input.maximized,
    minimized: false,
    z: Math.max(0, ...s.windows.map((w) => w.z)) + 1,
  });
  s.focused = input.id;
}

function frontmost(windows: LinuxWindow[]) {
  const shown = windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z);
  return shown[0]?.id ?? null;
}
