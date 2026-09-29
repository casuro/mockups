import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useUI, type Selection } from "./context";
import * as I from "./icons";

// The toolbar: undo and redo, zoom, paragraph style, font and size, the
// formatting commands (they act on the page's selection), comment, alignment,
// lists, and the Editing / Suggesting / Viewing mode. `p2` and `p3` buttons
// drop out as the box narrows; `keep` ones stay on a phone.

export const MODES = [
  { k: "Editing", icon: I.Edit, d: "Edit document directly" },
  { k: "Suggesting", icon: I.Suggest, d: "Edits become suggestions" },
  { k: "Viewing", icon: I.View, d: "Read or print final document" },
] as const;

type Cmd = keyof Omit<Selection, "style" | "size"> | "undo" | "redo" | "outdent" | "indent" | "removeFormat";

export function Toolbar() {
  const ui = useUI();
  const { docs, sel, cmd, menu, toggleMenu } = ui;
  const say = (text: string, label: string) => () => {
    docs.toast(text);
    docs.ui.emit({ type: "action", label });
  };
  const mode = MODES.find((m) => m.k === docs.state.mode) ?? MODES[0];

  // The size box follows the selection; changing it only says so, as in the mockup.
  const [size, setSize] = useState(String(sel.size));
  useEffect(() => setSize(String(sel.size)), [sel.size]);
  const bump = (d: number) => setSize((v) => String(Math.max(1, (parseInt(v, 10) || sel.size) + d)));
  const link = () => {
    if (window.getSelection()?.isCollapsed ?? true) return docs.toast("Select text to add a link");
    cmd("createLink", "https://casuro.com/onboarding");
    docs.toast("Link added");
  };

  return (
    <div
      className="toolbar"
      onMouseDown={(e) => {
        // Keep the selection in the page while pressing toolbar buttons.
        if (!(e.target as HTMLElement).closest("input")) e.preventDefault();
      }}
    >
      <T icon={I.Search} title="Search the menus" onClick={say("Search the menus (Alt+/)", "Search the menus")} />
      <T icon={I.Undo} c="undo" title="Undo (Ctrl+Z)" className="keep" />
      <T icon={I.Redo} c="redo" title="Redo (Ctrl+Y)" className="keep" />
      <T icon={I.Print} title="Print (Ctrl+P)" className="p3" onClick={() => window.print()} />
      <T icon={I.Spell} title="Spelling and grammar check" className="p2" onClick={say("No spelling or grammar suggestions", "Spelling and grammar check")} />
      <T icon={I.Paint} title="Paint format" className="p2" onClick={say("Paint format: click text to apply", "Paint format")} />
      <Dd name="Zoom" className="zoom p3" title="Zoom">{ui.zoom}</Dd>
      <span className="sep" />
      <Dd name="Style" className="style keep" title="Styles">{sel.style}</Dd>
      <span className="sep" />
      <Dd name="Font" className="font p3" title="Font">{ui.font}</Dd>
      <span className="sep" />
      <span className="fsize">
        <T icon={I.Remove} title="Decrease font size" onClick={() => bump(-1)} />
        <input
          value={size}
          aria-label="Font size"
          onChange={(e) => setSize(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            if (e.target.value !== String(sel.size)) docs.toast(`Font size set to ${e.target.value}`);
          }}
        />
        <T icon={I.Add} title="Increase font size" onClick={() => bump(1)} />
      </span>
      <span className="sep" />
      <T icon={I.Bold} c="bold" title="Bold (Ctrl+B)" className="keep" />
      <T icon={I.Italic} c="italic" title="Italic (Ctrl+I)" className="keep" />
      <T icon={I.Underline} c="underline" title="Underline (Ctrl+U)" className="keep" />
      <button className="t color-a" title="Text color" aria-label="Text color" onClick={() => cmd("foreColor", "#0b57d0")}>
        <i><I.TextA /></i>
        <i />
      </button>
      <T icon={I.Highlight} title="Highlight color" className="p3" onClick={() => cmd("hiliteColor", "#fff2cc")} />
      <span className="sep" />
      <T icon={I.Link} title="Insert link (Ctrl+K)" className="p3" onClick={link} />
      <T icon={I.AddComment} title="Add comment (Ctrl+Alt+M)" className="keep" onClick={ui.addComment} />
      <T icon={I.Image} title="Insert image" className="p3" onClick={say("Insert image: upload from computer, Drive, or URL", "Insert image")} />
      <span className="sep" />
      <T icon={I.AlignL} c="justifyLeft" title="Left align" />
      <T icon={I.AlignC} c="justifyCenter" title="Center align" className="p3" />
      <T icon={I.AlignR} c="justifyRight" title="Right align" className="p2" />
      <T icon={I.Justify} c="justifyFull" title="Justify" className="p2" />
      <T icon={I.Spacing} title="Line & paragraph spacing" className="p2" onClick={say("Line and paragraph spacing: 1.15", "Line & paragraph spacing")} />
      <span className="sep" />
      <T icon={I.Bullets} c="insertUnorderedList" title="Bulleted list" className="keep" />
      <T icon={I.Numbers} c="insertOrderedList" title="Numbered list" className="p3" />
      <T icon={I.Outdent} c="outdent" title="Decrease indent" className="p2" />
      <T icon={I.Indent} c="indent" title="Increase indent" className="p3" />
      <T icon={I.Clear} c="removeFormat" title="Clear formatting" className="p2" />
      <span className="spacer" />
      <button data-menu="Mode" className={`mode${menu?.name === "Mode" ? " open" : ""}`} title="Editing mode" onClick={(e) => toggleMenu("Mode", e.currentTarget)}>
        <i><mode.icon /></i>
        <span className="lbl">{mode.k}</span>
        <i><I.Drop /></i>
      </button>
      <T icon={I.Less} title="Hide the menus (Ctrl+Shift+F)" className="hide-menus" onClick={ui.toggleMenus} />
    </div>
  );
}

function T({ icon: Icon, c, title, className = "", onClick }: { icon: ComponentType; c?: Cmd; title: string; className?: string; onClick?: () => void }) {
  const { sel, cmd } = useUI();
  const on = !!c && c in sel && sel[c as keyof Selection] === true;
  return (
    <button className={`t ${className}${on ? " on" : ""}`} title={title} aria-label={title} onClick={onClick ?? (() => c && cmd(c))}>
      <Icon />
    </button>
  );
}

function Dd({ name, className, title, children }: { name: string; className: string; title: string; children: ReactNode }) {
  const { menu, toggleMenu } = useUI();
  return (
    <button data-menu={name} className={`t dd ${className}${menu?.name === name ? " open" : ""}`} title={title} onClick={(e) => toggleMenu(name, e.currentTarget)}>
      <span className="lbl">{children}</span>
      <i><I.Drop /></i>
    </button>
  );
}
