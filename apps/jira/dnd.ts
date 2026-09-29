import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

// Dragging cards between board columns and rows between sprints, with the
// mouse, a pen, or a long press on touch. A copy of the item follows the
// pointer; a placeholder shows where it will land. Drop zones are elements
// with data-drop-kind ("card" or "row") and data-zone (their id); the items
// in them carry data-dnd and data-key.

export interface DragState {
  key: string;
  kind: "card" | "row";
  /** The zone under the pointer, and the item the placeholder sits before (null: at the end). */
  zone: string | null;
  before: string | null;
  height: number;
}

interface Pending {
  key: string;
  kind: "card" | "row";
  item: HTMLElement;
  x0: number;
  y0: number;
  touch: boolean;
  timer?: ReturnType<typeof setTimeout>;
  started: boolean;
  dx: number;
  dy: number;
  ghost?: HTMLElement;
}

/** `onDrop(key, zone, before, after)`: `before`/`after` are the neighbours it landed between. */
export function useDnd(root: RefObject<HTMLDivElement | null>, onDrop: (key: string, zone: string, before: string | null, after: string | null) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pending = useRef<Pending | null>(null);
  const lastEnd = useRef(0);
  const drop = useRef(onDrop);
  drop.current = onDrop;

  const set = (d: DragState | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  const move = useCallback(
    (x: number, y: number) => {
      const p = pending.current;
      const box = root.current;
      if (!p?.ghost || !box) return;
      const r = box.getBoundingClientRect();
      p.ghost.style.transform = `translate(${x - r.left - p.dx}px, ${y - r.top - p.dy}px) rotate(${p.kind === "card" ? 2 : 0}deg)`;
      const hit = document.elementFromPoint(x, y);
      const zone = hit?.closest<HTMLElement>(`[data-drop-kind="${p.kind}"]`);
      const cur = dragRef.current!;
      if (zone && box.contains(zone)) {
        const items = [...zone.querySelectorAll<HTMLElement>(":scope > [data-dnd]")].filter((it) => it.dataset.key !== p.key);
        let before: string | null = null;
        for (const it of items) {
          const b = it.getBoundingClientRect();
          if (y < b.top + b.height / 2) {
            before = it.dataset.key!;
            break;
          }
        }
        const id = zone.dataset.zone!;
        if (cur.zone !== id || cur.before !== before) set({ ...cur, zone: id, before });
      }
      // Scroll the board or the page when the pointer nears an edge.
      for (const sc of [box.querySelector<HTMLElement>(".board-scroll"), box.querySelector<HTMLElement>(".main")]) {
        if (!sc) continue;
        const b = sc.getBoundingClientRect();
        const edge = 48;
        const sp = 14;
        if (x > b.right - edge && x < b.right + 4) sc.scrollLeft += sp;
        else if (x < b.left + edge && x > b.left - 4) sc.scrollLeft -= sp;
        if (y > b.bottom - edge && y < b.bottom + 4) sc.scrollTop += sp;
        else if (y < b.top + edge && y > b.top - 4) sc.scrollTop -= sp;
      }
    },
    [root]
  );

  const begin = useCallback(
    (x: number, y: number) => {
      const p = pending.current;
      const box = root.current;
      if (!p || !box) return;
      const r = p.item.getBoundingClientRect();
      const zone = p.item.closest<HTMLElement>("[data-zone]");
      const items = zone ? [...zone.querySelectorAll<HTMLElement>(":scope > [data-dnd]")] : [];
      const next = items[items.indexOf(p.item) + 1];
      p.started = true;
      p.dx = x - r.left;
      p.dy = y - r.top;
      const g = p.item.cloneNode(true) as HTMLElement;
      g.classList.add("drag-ghost");
      g.removeAttribute("data-dnd");
      g.removeAttribute("tabindex");
      g.setAttribute("aria-hidden", "true");
      g.style.width = `${r.width}px`;
      g.style.height = `${r.height}px`;
      // A layer React leaves empty, so the copy never gets in its way.
      (box.querySelector(".drag-layer") ?? box).appendChild(g);
      p.ghost = g;
      box.classList.add("is-dragging");
      set({ key: p.key, kind: p.kind, zone: zone?.dataset.zone ?? null, before: next?.dataset.key ?? null, height: r.height });
      move(x, y);
    },
    [root, move]
  );

  const end = useCallback(
    (commit: boolean) => {
      const p = pending.current;
      pending.current = null;
      if (!p) return;
      clearTimeout(p.timer);
      if (!p.started) return;
      p.ghost?.remove();
      root.current?.classList.remove("is-dragging");
      lastEnd.current = Date.now();
      const d = dragRef.current;
      set(null);
      if (!commit || !d?.zone) return;
      const zone = root.current?.querySelector<HTMLElement>(`[data-zone="${CSS.escape(d.zone)}"]`);
      const keys = zone ? [...zone.querySelectorAll<HTMLElement>(":scope > [data-dnd]")].map((it) => it.dataset.key!).filter((k) => k !== d.key) : [];
      const at = d.before ? keys.indexOf(d.before) : keys.length;
      drop.current(d.key, d.zone, d.before, at > 0 ? keys[at - 1] : null);
    },
    [root]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pending.current;
      if (!p) return;
      if (!p.started) {
        const dist = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
        if (p.touch) {
          if (dist > 10) end(false);
          return;
        }
        if (dist < 5) return;
        begin(e.clientX, e.clientY);
      }
      e.preventDefault();
      move(e.clientX, e.clientY);
    };
    const onUp = () => end(true);
    const onCancel = () => end(false);
    const onTouch = (e: TouchEvent) => {
      if (pending.current?.started) e.preventDefault();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
    document.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("touchmove", onTouch);
    };
  }, [begin, move, end]);

  const start = useCallback(
    (e: ReactPointerEvent<HTMLElement>, key: string, kind: "card" | "row") => {
      if (e.button !== 0 || (e.target as HTMLElement).closest("button, input, textarea, select, a")) return;
      const p: Pending = { key, kind, item: e.currentTarget, x0: e.clientX, y0: e.clientY, touch: e.pointerType === "touch", started: false, dx: 0, dy: 0 };
      if (p.touch) p.timer = setTimeout(() => pending.current === p && !p.started && begin(p.x0, p.y0), 380);
      pending.current = p;
    },
    [begin]
  );

  const justDragged = useCallback(() => Date.now() - lastEnd.current < 250, []);

  return { drag, start, justDragged };
}
