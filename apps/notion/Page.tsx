import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { Block, flatten } from "./Blocks";
import { useUI } from "./context";
import { Database } from "./Database";
import { focusEl } from "./format";
import * as I from "./icons";

// The page: its cover, icon and title, then its blocks (or, for a
// database, its table).

const COVERS: Record<string, string> = {
  blueprint: "repeating-linear-gradient(0deg, rgba(255,255,255,.14) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(255,255,255,.14) 0 1px, transparent 1px 28px), linear-gradient(135deg, #1d4f91 0%, #2b6cb0 55%, #3a7bd5 100%)",
  nebula: "radial-gradient(circle at 18% 30%, rgba(255,154,158,.95) 0, transparent 42%), radial-gradient(circle at 78% 65%, rgba(161,140,209,.95) 0, transparent 46%), radial-gradient(circle at 55% 10%, rgba(250,208,196,.9) 0, transparent 40%), linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
};

function coverStyle(cover: string, y = 50): CSSProperties {
  const image = COVERS[cover] ?? (cover.includes("(") ? cover : `url("${cover.replace(/"/g, "%22")}")`);
  return { backgroundImage: image, ...(COVERS[cover] || cover.includes("(") ? {} : { backgroundSize: "cover" }), ["--cy" as string]: `${y}%` };
}

export function Page() {
  const { notion, pendingFocus, root } = useUI();
  const p = notion.page;
  const view = useRef<HTMLDivElement>(null);

  // A new page starts at the top.
  useEffect(() => {
    if (view.current) view.current.scrollTop = 0;
  }, [p.id]);

  // After a block is added or changed, the caret goes where the editor asked.
  useLayoutEffect(() => {
    const want = pendingFocus.current;
    if (!want) return;
    const el = root.current?.querySelector<HTMLElement>(`.blk[data-bid="${CSS.escape(want.id)}"] .tx`);
    if (!el) return;
    pendingFocus.current = null;
    focusEl(el, want.atEnd);
    want.then?.(el);
  });

  const cls = ["page", p.full && "full", p.cover && "has-cover", p.icon && "has-icon"].filter(Boolean).join(" ");
  const act = (name: string) => () => notion.ui.action(name);
  return (
    <div className="view" ref={view}>
      {p.cover ? (
        <div className="cover" style={coverStyle(p.cover, p.coverY)}>
          <div className="cover-wrap">
            <div className="cover-acts">
              <button onClick={act("Change cover")}>Change cover</button>
              <button onClick={act("Reposition")}>Reposition</button>
            </div>
          </div>
        </div>
      ) : null}
      <div className={cls}>
        <div className="page-head">
          {p.icon ? <div className="picon">{p.icon}</div> : null}
          <div className="page-ctrl">
            {p.icon ? null : <button onClick={act("Add icon")}><I.Smile /> Add icon</button>}
            {p.cover ? null : <button onClick={act("Add cover")}><I.Image /> Add cover</button>}
            <button onClick={act("Add comment")}><I.Comment /> Add comment</button>
          </div>
          <Title key={p.id} />
        </div>
        {p.database ? (
          <Database id={p.id} />
        ) : (
          <div className="blocks">
            {flatten(p.blocks).map((row) => <Block key={row.block.id} {...row} />)}
          </div>
        )}
        <div className="page-tail" />
      </div>
    </div>
  );
}

/** The title: edited in place, one line. */
function Title() {
  const { notion } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const title = notion.page.title;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== title) el.textContent = title;
  }, [title]);
  return (
    <div
      ref={ref}
      className="ptitle"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph="New page"
      role="textbox"
      aria-label="Page title"
      onInput={(e) => {
        const el = e.currentTarget;
        if (el.innerHTML === "<br>") el.innerHTML = "";
        notion.ui.editTitle(el.textContent ?? "");
      }}
      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
    />
  );
}
