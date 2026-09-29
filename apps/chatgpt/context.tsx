import { createContext, useContext, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import * as I from "./icons";
import type { ChatGPTFile, ChatGPTGpt } from "./types";
import { fileType, type ChatGPTApp } from "./use-chatgpt";

// What every part of <ChatGPT> reads: the app, and the bits of screen state
// the parts share (the open menu or dialog, the mobile drawer, which message
// is being edited). Also the small pieces several parts draw: avatars, file
// chips, the menu and the dialog frame.

export interface MenuSpec {
  /** Opening the menu with the same key again closes it; the anchor shows it is open. */
  key: string;
  anchor: HTMLElement;
  content: ReactNode;
  cls?: string;
  align?: "start" | "end" | "center";
  side?: "bottom" | "top" | "right";
  /** Open at a point instead of under the anchor (a right-click). */
  point?: { x: number; y: number };
}

export interface ChatGPTUI {
  chatgpt: ChatGPTApp;
  root: RefObject<HTMLDivElement | null>;
  prompt: RefObject<HTMLTextAreaElement | null>;
  /** Past the first render: parts that appear later may take focus. */
  mounted: RefObject<boolean>;
  /** The box is phone-sized: the sidebar is a drawer. */
  narrow: boolean;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  menu: MenuSpec | null;
  openMenu: (spec: MenuSpec) => void;
  closeMenu: () => void;
  modal: ReactNode;
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
  renaming: string | null;
  setRenaming: (id: string | null) => void;
  editing: string | null;
  setEditing: (id: string | null) => void;
  dictating: boolean;
  setDictating: (on: boolean) => void;
  setVoice: (on: boolean) => void;
  /** The empty screen's heading this time. */
  greeting: string;
  /** Opens the share dialog, the delete confirmation, search, the file picker. */
  dialogs: {
    share: (chatId: string) => void;
    confirmDelete: (chatId: string) => void;
    search: () => void;
    files: () => void;
  };
  toggleSidebar: () => void;
}

export const ChatGPTContext = createContext<ChatGPTUI | null>(null);

export function useUI() {
  const ui = useContext(ChatGPTContext);
  if (!ui) throw new Error("ChatGPT parts must be inside <ChatGPT>");
  return ui;
}

/** `menu-open` on the button whose menu is showing. */
export const openClass = (ui: ChatGPTUI, key: string) => (ui.menu?.key === key ? " menu-open" : "");

export function Me({ className = "avatar" }: { className?: string }) {
  const me = useUI().chatgpt.seed.me;
  return me.photo ? (
    <img className={className} src={me.photo} alt="" />
  ) : (
    <span className={`${className} initials`} style={{ background: me.color ?? "#10a37f" }} aria-hidden="true">
      {me.initials ?? me.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function GptAvatar({ gpt, className = "" }: { gpt: ChatGPTGpt; className?: string }) {
  const G = I.GLYPHS[gpt.glyph ?? "sparkle"];
  return (
    <span className={`gpt-ava ${className}`} style={{ background: gpt.color ?? "#0d0d0d" }}>
      <G />
    </span>
  );
}

const FILE_KIND: Record<string, [string, "doc" | "sheet" | "image" | "code", string]> = {
  pdf: ["#fa423e", "doc", "PDF"],
  csv: ["#10a37f", "sheet", "Spreadsheet"],
  xlsx: ["#10a37f", "sheet", "Spreadsheet"],
  docx: ["#0285ff", "doc", "Document"],
  png: ["#8b5cf6", "image", "Image"],
  jpg: ["#8b5cf6", "image", "Image"],
  jpeg: ["#8b5cf6", "image", "Image"],
  md: ["#5d5d5d", "doc", "Markdown"],
  txt: ["#5d5d5d", "doc", "Text"],
  js: ["#f59e0b", "code", "JavaScript"],
  sql: ["#f59e0b", "code", "SQL"],
};
const KIND_ICON = { doc: I.Doc, sheet: I.Sheet, image: I.Image, code: I.Code };
export const fileLabel = (f: ChatGPTFile) => FILE_KIND[fileType(f)]?.[2] ?? "File";

export function FileIcon({ file }: { file: ChatGPTFile }) {
  const [color, kind] = FILE_KIND[fileType(file)] ?? ["#5d5d5d", "doc"];
  const Icon = KIND_ICON[kind];
  return <span className="fi" style={{ background: color }}><Icon /></span>;
}

export function FileChip({ file, onRemove }: { file: ChatGPTFile; onRemove?: () => void }) {
  return (
    <div className="fchip" title={file.name}>
      <FileIcon file={file} />
      <div className="meta">
        <div className="fn">{file.name}</div>
        <div className="ft">{fileLabel(file)}</div>
      </div>
      {onRemove ? (
        <button type="button" className="rm" aria-label="Remove file" onClick={(e) => { e.stopPropagation(); onRemove(); }}><I.X /></button>
      ) : null}
    </div>
  );
}

/** A check at the end of a menu row, on the picked option. */
export const Ck = ({ on }: { on: boolean }) => (on ? <I.Check className="ck" /> : null);

/** The open menu, placed next to its anchor inside the app's box and kept on screen. */
export function Menu({ spec }: { spec: MenuSpec }) {
  const { root } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = root.current;
    if (!el || !box) return;
    const place = () => {
      const b = box.getBoundingClientRect();
      const a = spec.anchor.getBoundingClientRect();
      const r = spec.point
        ? { left: spec.point.x - b.left, right: spec.point.x - b.left, top: spec.point.y - b.top, bottom: spec.point.y - b.top, width: 0 }
        : { left: a.left - b.left, right: a.right - b.left, top: a.top - b.top, bottom: a.bottom - b.top, width: a.width };
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const pad = 8;
      const side = spec.side ?? "bottom";
      const align = spec.align ?? "start";
      let x = align === "end" ? r.right - w : align === "center" ? r.left + r.width / 2 - w / 2 : r.left;
      let y: number;
      if (side === "right") {
        x = r.right + 6;
        y = r.top;
      } else if (side === "top") y = r.top - h - 6;
      else y = r.bottom + 6;
      if (side === "bottom" && y + h > b.height - pad && r.top - h - 6 > pad) y = r.top - h - 6;
      if (side === "top" && y < pad) y = r.bottom + 6;
      x = Math.max(pad, Math.min(b.width - w - pad, x));
      y = Math.max(pad, Math.min(b.height - h - pad, y));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    place();
    // A menu that turns a page (Move to project, Legacy models) changes size.
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [spec, root]);
  return (
    <div ref={ref} className={`menu ${spec.cls ?? ""}`} role="menu" style={{ left: 0, top: 0 }}>
      {spec.content}
    </div>
  );
}

/** A dialog: the title row with its close button, a body and a footer. */
export function Dialog({ title, cls = "", label, close = true, children, footer }: { title?: ReactNode; cls?: string; label: string; close?: boolean; children: ReactNode; footer?: ReactNode }) {
  const { closeModal } = useUI();
  return (
    <div className={`modal ${cls}`} role="dialog" aria-modal="true" aria-label={label}>
      {title !== undefined ? (
        <div className="mhd">
          <h2>{title}</h2>
          {close ? <button className="icon-btn" aria-label="Close" onClick={closeModal}><I.X /></button> : null}
        </div>
      ) : null}
      {children}
      {footer ? <div className="mft">{footer}</div> : null}
    </div>
  );
}
