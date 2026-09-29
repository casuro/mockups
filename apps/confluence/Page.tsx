import { Fragment, type ReactNode } from "react";
import { headingKey, Blocks } from "./Blocks";
import { Avatar, useUI } from "./context";
import { ago, plain, readTime } from "./format";
import * as I from "./icons";
import { ancestors } from "./use-confluence";

// The page on screen: breadcrumbs and actions, title, byline, content,
// and the "On this page" list of its headings. `children` (the likes and
// comments) goes under the content.

export function PageView({ children }: { children?: ReactNode }) {
  const { confluence, main } = useUI();
  const { state, page, people, seed, ui } = confluence;
  const crumbs = ancestors(state, page.id);
  const act = (kind: "edit" | "share" | "more") => ui.emit({ type: "action", kind, pageId: page.id });
  const headings = page.blocks.flatMap((b, i) => (b.type === "heading" && b.level !== 3 ? [{ key: headingKey(b, i), text: plain(b.text) }] : []));

  const jump = (key: string) => {
    const el = main.current?.querySelector(`[data-h="${CSS.escape(key)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="wrap">
      <article className="doc">
        <div className="bar">
          <nav className="crumbs" aria-label="Breadcrumbs">
            <a href="#" onClick={(e) => { e.preventDefault(); ui.emit({ type: "action", kind: "overview" }); }}>{seed.space.name}</a>
            <span className="sep">/</span>
            {crumbs.map((id) => (
              <Fragment key={id}>
                <a href="#" onClick={(e) => { e.preventDefault(); ui.open(id); }}>{state.pages[id].title}</a>
                <span className="sep">/</span>
              </Fragment>
            ))}
          </nav>
          <div className="acts">
            <button className="btn" onClick={() => act("edit")}><I.Edit />Edit</button>
            <button className={`ibtn star${page.starred ? " on" : ""}`} title="Star" aria-label="Star" aria-pressed={page.starred} onClick={ui.toggleStar}>
              <I.Star on={page.starred} />
            </button>
            <button className="btn pri" onClick={() => act("share")}>Share</button>
            <button className="ibtn" title="More actions" aria-label="More actions" onClick={() => act("more")}><I.More /></button>
          </div>
        </div>
        <h1 className="title">{page.title}</h1>
        <div className="byline">
          <Avatar id={page.author} />
          <span>By <b>{people[page.author]?.name ?? page.author}</b></span>
          <span className="sep">&middot;</span>
          <span>{`Last updated ${ago(page.updated)}`}</span>
          <span className="sep">&middot;</span>
          <span>{page.readTime ?? readTime(page.blocks)}</span>
        </div>
        <Blocks page={page} />
        {children}
      </article>
      <aside className="toc">
        {headings.length ? (
          <>
            <h4>On this page</h4>
            {headings.map((h) => (
              <a key={h.key} href="#" onClick={(e) => { e.preventDefault(); jump(h.key); }}>{h.text}</a>
            ))}
          </>
        ) : null}
      </aside>
    </div>
  );
}
