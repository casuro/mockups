import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar, useUI } from "./context";
import * as I from "./icons";

// The top bar: the logo, the title (click to rename), star, move and saved
// status, the menu bar, who else is here, Meet, Share and the signed-in person.

export const MENUBAR = ["File", "Edit", "View", "Insert", "Format", "Tools", "Extensions", "Help"];

export function TopBar() {
  const { docs, menu, toggleMenu, openShare } = useUI();
  const { state, people, me, seed } = docs;
  const [title, setTitle] = useState(state.title);
  const input = useRef<HTMLInputElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const focused = useRef(false);
  const folder = seed.document.folder;
  const self = people[me];

  // A rename from outside shows, unless they are typing one.
  useLayoutEffect(() => {
    if (!focused.current) setTitle(state.title);
  }, [state.title]);

  // The box is as wide as its text, like Docs' (measured again once the font is in).
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => void document.fonts?.ready.then(() => setFontsReady(true)), []);
  useLayoutEffect(() => {
    const el = input.current;
    const m = measure.current;
    if (!el || !m) return;
    m.style.fontSize = getComputedStyle(el).fontSize;
    m.textContent = title || " ";
    el.style.width = `${m.offsetWidth + 16}px`;
  }, [title, fontsReady]);

  const commit = () => {
    focused.current = false;
    const next = title.trim() || state.title;
    setTitle(next);
    docs.ui.rename(next);
  };

  return (
    <header className="top">
      <a className="logo" href="#" aria-label="Docs home" onClick={(e) => e.preventDefault()}>
        <I.DocsLogo />
      </a>
      <div className="titles">
        <div className="title-row">
          <input
            ref={input}
            className="doc-title"
            value={title}
            aria-label="Rename"
            spellCheck={false}
            onFocus={() => (focused.current = true)}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <span ref={measure} className="title-measure" aria-hidden="true" />
          <button className={`ib tb-sm${state.starred ? " starred" : ""}`} title="Star" onClick={docs.ui.star}>
            <i>{state.starred ? <I.StarOn /> : <I.Star />}</i>
          </button>
          <button className="ib tb-sm" title="Move" onClick={() => docs.toast(`Move to: My Drive${folder ? ` / ${folder}` : ""}`)}>
            <i><I.Folder /></i>
          </button>
          <button className="ib tb-sm" title="See document status" onClick={() => docs.toast("All changes saved in Drive")}>
            <i><I.Cloud /></i>
          </button>
        </div>
        <nav className="menubar">
          {MENUBAR.map((name) => (
            <button key={name} data-menu={name} className={menu?.name === name ? "open" : undefined} onClick={(e) => toggleMenu(name, e.currentTarget)}>
              {name}
            </button>
          ))}
        </nav>
      </div>
      <div className="right">
        <div className="presence">
          {state.present.map((id) => (
            <Avatar key={id} id={id} className="av" title={people[id]?.name} style={{ ["--pc" as string]: people[id]?.color }} />
          ))}
        </div>
        <button
          className="ib"
          title="Open comment history"
          onClick={() => docs.toast(`${state.threads.filter((t) => t.status === "open").length} open comments and suggestions`)}
        >
          <i><I.CommentHist /></i>
        </button>
        <button
          className="meet"
          title="Join a call here or present this tab to the call"
          onClick={() => {
            docs.toast("Starting a Meet call for this document");
            docs.ui.emit({ type: "action", label: "Meet" });
          }}
        >
          <i><I.Video /></i>
          <i className="dd"><I.Drop /></i>
        </button>
        <button className="share" onClick={openShare}>
          <i><I.Lock /></i>
          <span>Share</span>
        </button>
        <Avatar id={me} className="me" title={`${self.name}${self.email ? `\n${self.email}` : ""}`} />
      </div>
    </header>
  );
}
