import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { findText } from "./content";
import { Comments } from "./Comments";
import { useUI } from "./context";

// The canvas: the ruler, the Letter-size page (the document, editable in
// place), collaborators' cursors on it, and the comments column beside it.
// The page's HTML is set from the state only when it differs from what is
// on screen, so typing never re-renders it; what is typed goes back through
// docs.ui.input.

/** The page's HTML without collaborators' cursors and the "on" class the thread in focus gives its marks. */
export const serialize = (el: HTMLElement) =>
  el.innerHTML.replace(/<span class="cursor"[^>]*><\/span>/g, "").replace(/ class="(hl|sg-del|sg-ins) on"/g, ' class="$1"');

export function Canvas() {
  const { docs, page, active, zoom, layoutRef: relayoutRef } = useUI();
  const { state, people } = docs;
  const html = state.html;
  const comments = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLElement>(null);

  // Only a change from outside (a comment, an accepted suggestion, new content) rewrites the page.
  useLayoutEffect(() => {
    const el = page.current;
    if (el && serialize(el) !== html) el.innerHTML = html;
  }, [html, page]);

  // Collaborators' cursors sit in the text, just after where they are, like the mockup's (not part of the document).
  const cursors = state.cursors;
  useLayoutEffect(() => {
    const el = page.current;
    if (!el) return;
    el.querySelectorAll(".cursor").forEach((c) => c.remove());
    for (const [id, after] of Object.entries(cursors)) {
      const parts = findText(el, after);
      const last = parts?.[parts.length - 1];
      if (!last) continue;
      const c = document.createElement("span");
      c.className = "cursor";
      c.contentEditable = "false";
      c.dataset.name = people[id]?.name ?? id;
      c.style.setProperty("--cc", people[id]?.color ?? "");
      const range = document.createRange();
      range.setStart(last.node, last.end);
      range.insertNode(c);
    }
  }, [html, cursors, people, page]);

  // The marks of the thread in focus are darker.
  useLayoutEffect(() => {
    page.current?.querySelectorAll("[data-c], [data-s]").forEach((el) => {
      const h = el as HTMLElement;
      h.classList.toggle("on", (h.dataset.c ?? h.dataset.s) === active);
    });
  }, [active, html, page]);

  // Cards sit level with their text; the one in focus stays on its text and pushes the others away.
  const relayout = useCallback(() => {
    const el = page.current;
    const box = comments.current;
    if (!el || !box) return;
    const pageBox = el.getBoundingClientRect();
    const scale = pageBox.width / el.offsetWidth || 1;
    if (getComputedStyle(box).position === "relative") {
      const base = box.getBoundingClientRect().top;
      const cards = [...box.querySelectorAll<HTMLElement>(".card")]
        .map((c) => {
          const mark = el.querySelector(`[data-c="${c.dataset.card}"], [data-s="${c.dataset.card}"]`);
          return { c, y: mark ? (mark.getBoundingClientRect().top - base) / scale - 10 : 0 };
        })
        .sort((a, b) => a.y - b.y);
      const ai = Math.max(0, cards.findIndex((x) => x.c.dataset.card === active));
      let y = cards[ai]?.y ?? 0;
      for (let i = ai; i < cards.length; i++) {
        y = Math.max(y, cards[i].y);
        cards[i].c.style.top = `${y}px`;
        y += cards[i].c.offsetHeight + 8;
      }
      y = cards[ai]?.y ?? 0;
      for (let i = ai - 1; i >= 0; i--) {
        y = Math.min(cards[i].y, y - cards[i].c.offsetHeight - 8);
        cards[i].c.style.top = `${Math.max(0, y)}px`;
      }
    }
  }, [page, active]);
  relayoutRef.current = relayout;

  useLayoutEffect(relayout);
  useEffect(() => {
    const ro = new ResizeObserver(() => relayoutRef.current());
    if (scroller.current) ro.observe(scroller.current);
    if (page.current) ro.observe(page.current);
    document.fonts?.ready.then(() => relayoutRef.current());
    return () => ro.disconnect();
  }, [page, relayoutRef]);

  return (
    <main className="scroller" ref={scroller}>
      <div className="stage ruler-row">
        <Ruler />
        <div className="side-gap" />
      </div>
      <div className="stage" style={{ zoom: parseInt(zoom, 10) / 100 }}>
        <article
          ref={page}
          className="page"
          contentEditable={state.mode !== "Viewing"}
          suppressContentEditableWarning
          spellCheck={false}
          aria-label={`${state.title}, document`}
          onInput={(e) => {
            docs.ui.input(serialize(e.currentTarget));
            relayout();
          }}
        />
        <Comments ref={comments} relayout={relayout} />
      </div>
    </main>
  );
}

function Ruler() {
  return (
    <div className="ruler">
      <span className="mk" style={{ left: 96 }} />
      <span className="mk" style={{ left: 720 }} />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <span key={i} style={{ left: 96 + 96 * i }}>{i}</span>
      ))}
    </div>
  );
}
