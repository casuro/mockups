import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DesktopWindow, Theme, Toast, WindowSpec, WindowsEvent } from "./types";

// The desktop's state: open windows with their boxes and stacking order, the
// focused one, toasts and the theme. <Windows> draws it and calls these for
// the person; the world calls the same ones (open, close, focus, toast).

export interface WindowsOptions {
  /** Windows open at the start. */
  windows?: WindowSpec[];
  theme?: Theme;
  onEvent?: (event: WindowsEvent) => void;
}

export interface WindowsDesktop {
  windows: DesktopWindow[];
  activeId: string | null;
  theme: Theme;
  toasts: Toast[];
  startOpen: boolean;
  open(spec: WindowSpec): void;
  close(id: string): void;
  focus(id: string): void;
  minimize(id: string): void;
  restore(id: string): void;
  toggleMaximize(id: string): void;
  /** Moves and sizes a window (drag, resize). */
  place(id: string, box: Partial<Pick<DesktopWindow, "x" | "y" | "width" | "height" | "maximized">>): void;
  toast(toast: Omit<Toast, "id"> & { id?: string }): string;
  dismissToast(id: string): void;
  setTheme(theme: Theme): void;
  setStartOpen(open: boolean): void;
  /** Reports a person's action as an event without changing anything. */
  emit(event: WindowsEvent): void;
  /** Set by <Windows>: the desktop's size, for placing new windows. */
  setBounds(width: number, height: number): void;
}

interface State {
  windows: DesktopWindow[];
  activeId: string | null;
  theme: Theme;
  toasts: Toast[];
  startOpen: boolean;
}

const topmost = (wins: DesktopWindow[], except?: string) =>
  wins.filter((w) => !w.minimized && w.id !== except).sort((a, b) => b.z - a.z)[0]?.id ?? null;

export function useWindows(options: WindowsOptions = {}): WindowsDesktop {
  const onEvent = useRef(options.onEvent);
  useEffect(() => {
    onEvent.current = options.onEvent;
  });
  const bounds = useRef({ width: 1280, height: 752 });
  const counter = useRef({ z: 0, cascade: 0, toast: 0 });

  const place = useCallback((spec: WindowSpec): DesktopWindow => {
    const { width: bw, height: bh } = bounds.current;
    const width = Math.min(spec.width ?? 900, bw - 80);
    const height = Math.min(spec.height ?? 600, bh - 48);
    const n = counter.current.cascade++ % 6;
    return {
      ...spec,
      app: spec.app ?? spec.id,
      width,
      height,
      x: spec.x ?? Math.max(8, Math.round((bw - width) / 2) - 80 + n * 32),
      y: spec.y ?? Math.max(8, Math.min(40 + n * 30, bh - height - 8)),
      maximized: !!spec.maximized,
      minimized: false,
      z: ++counter.current.z,
    };
  }, []);

  const [state, setState] = useState<State>(() => {
    const windows = (options.windows ?? []).map(place);
    return { windows, activeId: topmost(windows), theme: options.theme ?? "light", toasts: [], startOpen: false };
  });
  const current = useRef(state);
  current.current = state;

  const emit = useCallback((event: WindowsEvent) => onEvent.current?.(event), []);
  const edit = useCallback(
    (id: string, change: (w: DesktopWindow) => Partial<DesktopWindow>, active?: (s: State) => string | null) =>
      setState((s) => {
        const windows = s.windows.map((w) => (w.id === id ? { ...w, ...change(w) } : w));
        return { ...s, windows, activeId: active ? active({ ...s, windows }) : s.activeId };
      }),
    []
  );

  const focus = useCallback(
    (id: string) => {
      if (current.current.activeId === id) return;
      edit(id, () => ({ z: ++counter.current.z, minimized: false }), () => id);
      emit({ type: "focus", id });
    },
    [edit, emit]
  );
  const restore = useCallback(
    (id: string) => {
      edit(id, () => ({ z: ++counter.current.z, minimized: false }), () => id);
      emit({ type: "restore", id });
    },
    [edit, emit]
  );
  const minimize = useCallback(
    (id: string) => {
      edit(id, () => ({ minimized: true }), (s) => (s.activeId === id ? topmost(s.windows) : s.activeId));
      emit({ type: "minimize", id });
    },
    [edit, emit]
  );
  const open = useCallback(
    (spec: WindowSpec) => {
      const existing = current.current.windows.find((w) => w.id === spec.id);
      if (existing) return existing.minimized ? restore(spec.id) : focus(spec.id);
      const win = place(spec);
      setState((s) => ({ ...s, windows: [...s.windows, win], activeId: win.id, startOpen: false }));
      emit({ type: "open", id: spec.id });
    },
    [place, focus, restore, emit]
  );
  const close = useCallback(
    (id: string) => {
      setState((s) => {
        const windows = s.windows.filter((w) => w.id !== id);
        return { ...s, windows, activeId: s.activeId === id ? topmost(windows) : s.activeId };
      });
      emit({ type: "close", id });
    },
    [emit]
  );
  const toggleMaximize = useCallback(
    (id: string) => {
      const max = !current.current.windows.find((w) => w.id === id)?.maximized;
      edit(id, () => ({ maximized: max }));
      emit({ type: max ? "maximize" : "unmaximize", id });
    },
    [edit, emit]
  );
  const dismissToast = useCallback((id: string) => setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })), []);
  const toast = useCallback(
    (t: Omit<Toast, "id"> & { id?: string }) => {
      const id = t.id ?? `toast-${++counter.current.toast}`;
      setState((s) => ({ ...s, toasts: [...s.toasts.filter((x) => x.id !== id), { ...t, id }] }));
      if (t.duration !== 0) setTimeout(() => dismissToast(id), t.duration ?? 5000);
      return id;
    },
    [dismissToast]
  );

  const actions = useMemo(
    () => ({
      open,
      close,
      focus,
      minimize,
      restore,
      toggleMaximize,
      toast,
      dismissToast,
      emit,
      place: (id: string, box: Partial<DesktopWindow>) => edit(id, () => box),
      setTheme: (theme: Theme) => {
        setState((s) => ({ ...s, theme }));
        emit({ type: "theme", theme });
      },
      setStartOpen: (startOpen: boolean) => {
        if (current.current.startOpen === startOpen) return;
        setState((s) => ({ ...s, startOpen }));
        emit({ type: "start", open: startOpen });
      },
      setBounds: (width: number, height: number) => {
        bounds.current = { width, height };
      },
    }),
    [open, close, focus, minimize, restore, toggleMaximize, toast, dismissToast, emit, edit]
  );

  return { ...state, ...actions };
}
