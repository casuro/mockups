import { useLayoutEffect, useRef } from "react";
import { useUI } from "./context";
import { MODES } from "./Toolbar";
import { plainText } from "./content";
import type { DocsMode } from "./types";

// The drop-down menus: the menu bar's, and the toolbar's zoom, style, font
// and mode. Undo, redo, select all, share, print, comment, rename, word
// count, zoom, style and font work; the rest say they are not available and
// are reported as an `action` event.

export const STYLES: [label: string, tag: string, className: string][] = [
  ["Normal text", "P", ""],
  ["Title", "DIV", "sty-title"],
  ["Heading 1", "H1", "sty-h1"],
  ["Heading 2", "H2", "sty-h2"],
  ["Heading 3", "H3", "sty-h3"],
];

const MENUS: Record<string, string[]> = {
  File: ["New|", "Open|Ctrl+O", "Make a copy|", "-", "Share|", "Email|", "Download|", "-", "Rename|", "Move|", "Add a shortcut to Drive|", "-", "Version history|Ctrl+Alt+Shift+H", "-", "Print|Ctrl+P"],
  Edit: ["Undo|Ctrl+Z", "Redo|Ctrl+Y", "-", "Cut|Ctrl+X", "Copy|Ctrl+C", "Paste|Ctrl+V", "-", "Select all|Ctrl+A", "-", "Find and replace|Ctrl+H"],
  View: ["Mode|", "-", "Show print layout|", "Show ruler|", "Show outline|Ctrl+Alt+A H", "-", "Full screen|"],
  Insert: ["Image|", "Table|", "Drawing|", "Chart|", "-", "Link|Ctrl+K", "Comment|Ctrl+Alt+M", "-", "Page break|", "Footnote|Ctrl+Alt+F"],
  Format: ["Text|", "Paragraph styles|", "Align & indent|", "Line & paragraph spacing|", "Bullets & numbering|", "-", "Clear formatting|Ctrl+\\"],
  Tools: ["Spelling and grammar|", "Word count|Ctrl+Shift+C", "Review suggested edits|Ctrl+Alt+O Ctrl+Alt+U", "Compare documents|", "-", "Voice typing|Ctrl+Shift+S", "Preferences|"],
  Extensions: ["Add-ons|", "Apps Script|"],
  Help: ["Search the menus|Alt+/", "Docs Help|", "Training|", "Updates|", "-", "Keyboard shortcuts|Ctrl+/"],
  Zoom: ["50%|", "75%|", "90%|", "100%|", "125%|", "150%|"],
  Font: ["Arial|", "Roboto|", "Georgia|", "Times New Roman|", "Courier New|", "Verdana|"],
};

export function Menu() {
  const ui = useUI();
  const { docs, menu, root, closeMenu, sel } = ui;
  const el = useRef<HTMLDivElement>(null);

  // Hangs under its button, kept inside the app's box.
  useLayoutEffect(() => {
    const m = el.current;
    const box = root.current?.getBoundingClientRect();
    if (!m || !box || !menu) return;
    const r = menu.anchor.getBoundingClientRect();
    m.style.top = `${r.bottom - box.top + 2}px`;
    m.style.left = `${Math.max(8, Math.min(r.left - box.left, box.width - m.offsetWidth - 8))}px`;
  }, [menu, root]);

  if (!menu) return null;
  const { name } = menu;

  const pick = (label: string) => {
    closeMenu();
    if (name === "Zoom") return ui.setZoom(label);
    if (name === "Font") return ui.setFont(label);
    const acts: Record<string, () => void> = {
      Undo: () => ui.cmd("undo"),
      Redo: () => ui.cmd("redo"),
      "Select all": () => {
        ui.page.current?.focus();
        ui.cmd("selectAll");
      },
      Share: ui.openShare,
      Print: () => window.print(),
      Comment: ui.addComment,
      Rename: () => root.current?.querySelector<HTMLInputElement>(".doc-title")?.select(),
      "Word count": () => docs.toast(`${plainText(docs.state.html).split(/\s+/).filter(Boolean).length} words`),
    };
    if (acts[label]) return acts[label]();
    docs.toast(`${label} is not available`);
    docs.ui.emit({ type: "action", label, menu: name });
  };

  let items;
  if (name === "Mode")
    items = MODES.map((m) => (
      <button key={m.k} className={`two${m.k === docs.state.mode ? " cur" : ""}`} onClick={() => (closeMenu(), docs.ui.setMode(m.k as DocsMode))}>
        <span className="mi"><m.icon /></span>
        <span className="ml">{m.k}<small>{m.d}</small></span>
      </button>
    ));
  else if (name === "Style")
    items = STYLES.map(([label, tag, cls]) => (
      <button key={tag} className={sel.style === label ? "cur" : undefined} onClick={() => (closeMenu(), ui.applyStyle(tag))}>
        <span className={`ml ${cls}`}>{label}</span>
      </button>
    ));
  else
    items = MENUS[name].map((x, i) => {
      if (x === "-") return <hr key={i} />;
      const [label, keys] = x.split("|");
      return (
        <button key={i} onClick={() => pick(label)}>
          <span className="ml">{label}</span>
          {keys ? <kbd>{keys}</kbd> : null}
        </button>
      );
    });

  return (
    <div className="menu" role="menu" ref={el} onMouseDown={(e) => e.preventDefault()}>
      {items}
    </div>
  );
}
