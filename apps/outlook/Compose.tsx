import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, useUI } from "./context";
import { escapeHtml, fmtDay, fmtSize, fmtTime, Highlight, isEmail } from "./format";
import * as I from "./icons";
import type { OutlookCompose } from "./types";

// Writing: a new message in the reading pane, or a reply under its
// conversation. Recipients are chips with contact suggestions; the body is
// rich text, formatted by the bar under it or the ribbon's Message tab.

type Field = "to" | "cc" | "bcc";
const LABEL: Record<Field, string> = { to: "To", cc: "Cc", bcc: "Bcc" };

// The editor's last selection, so formatting from a button applies where the caret was.
const ranges = new WeakMap<HTMLElement, Range>();

function keepRange(el: HTMLElement) {
  const s = getSelection();
  if (s?.rangeCount && el.contains(s.anchorNode)) ranges.set(el, s.getRangeAt(0).cloneRange());
}

function restoreRange(el: HTMLElement) {
  const s = getSelection();
  // Still in the editor: the caret is already where it should be.
  if (document.activeElement === el && s?.rangeCount && el.contains(s.anchorNode)) return;
  el.focus();
  const r = ranges.get(el);
  if (r && s && el.contains(r.startContainer)) {
    s.removeAllRanges();
    s.addRange(r);
  }
}

function Chip({ field, id, onRemove }: { field: Field; id: string; onRemove: () => void }) {
  const { outlook } = useUI();
  const known = !!outlook.people[id] || Object.values(outlook.people).some((p) => p.email === id);
  const p = outlook.person(id);
  const bad = !known && !isEmail(id);
  return (
    <span className={`chip${known ? "" : " ext"}${bad ? " bad" : ""}`} title={p.email}>
      {known ? <Avatar id={id} /> : null}
      <span className="t">{p.name}</span>
      <button aria-label={`Remove ${p.name} from ${LABEL[field]}`} onClick={onRemove}><I.Close /></button>
    </span>
  );
}

function RecipientField({ c, field, typed, setTyped }: { c: OutlookCompose; field: Field; typed: string; setTyped: (v: string) => void }) {
  const { outlook, scheduleSave } = useUI();
  const { people, me, seed } = outlook;
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [hl, setHl] = useState(0);
  const used = new Set([...c.to, ...c.cc, ...c.bcc]);
  const q = typed.trim().toLowerCase();
  const pool = (seed.suggested ?? Object.keys(people)).filter((id) => id !== me && !used.has(id) && people[id]);
  const matches = q
    ? Object.keys(people)
        .filter((id) => id !== me && !used.has(id))
        .filter((id) => { const p = people[id]; const n = p.name.toLowerCase(); return n.split(" ").some((w) => w.startsWith(q)) || p.email.toLowerCase().startsWith(q); })
        .slice(0, 6)
    : pool.slice(0, 5);

  const add = (value: string) => {
    const id = resolveRecipient(outlook.people, value);
    if (!id) return;
    if (!used.has(id)) outlook.ui.editCompose({ [field]: [...c[field], id] });
    setTyped("");
    setHl(0);
    scheduleSave();
  };
  const commit = () => {
    const v = typed.trim().replace(/[;,]+$/, "");
    if (!v) return false;
    add(matches[hl] && q ? matches[hl] : v);
    return true;
  };
  const open = focused && matches.length > 0;
  /** Shows the Cc or Bcc line and puts the cursor in it. */
  const reveal = (from: HTMLElement, f: "cc" | "bcc") => {
    const form = from.closest(".compose");
    outlook.ui.editCompose(f === "cc" ? { showCc: true } : { showBcc: true });
    requestAnimationFrame(() => form?.querySelector<HTMLInputElement>(`input[data-field="${f}"]`)?.focus());
  };

  return (
    <div className="cfield">
      <button className="lab" aria-label={`Choose ${LABEL[field]} recipients`} onClick={() => input.current?.focus()}>{LABEL[field]}</button>
      <div className="chips">
        {c[field].map((id, i) => (
          <Chip key={`${id}:${i}`} field={field} id={id} onRemove={() => { outlook.ui.editCompose({ [field]: c[field].filter((_, j) => j !== i) }); scheduleSave(); }} />
        ))}
        <input
          ref={input}
          className="in"
          autoComplete="off"
          aria-label={LABEL[field]}
          data-field={field}
          value={typed}
          onFocus={() => { setFocused(true); setHl(0); }}
          onChange={(e) => { setTyped(e.target.value); setHl(0); }}
          onBlur={() => { setFocused(false); commit(); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && open) { e.preventDefault(); setHl((hl + 1) % matches.length); }
            else if (e.key === "ArrowUp" && open) { e.preventDefault(); setHl((hl - 1 + matches.length) % matches.length); }
            else if (e.key === "Enter" || e.key === ";" || e.key === "," || (e.key === "Tab" && typed.trim())) {
              if (typed.trim()) { e.preventDefault(); commit(); }
              else if (e.key === "Enter") { e.preventDefault(); if (open && matches[hl]) add(matches[hl]); }
            } else if (e.key === "Backspace" && !typed && c[field].length) {
              outlook.ui.editCompose({ [field]: c[field].slice(0, -1) });
              scheduleSave();
            } else if (e.key === "Escape" && open) { e.stopPropagation(); setFocused(false); }
          }}
        />
      </div>
      {field === "to" ? (
        <>
          {c.showCc ? null : <button className="ccb" onClick={(e) => reveal(e.currentTarget, "cc")}>Cc</button>}
          {c.showBcc ? null : <button className="ccb" onClick={(e) => reveal(e.currentTarget, "bcc")}>Bcc</button>}
        </>
      ) : null}
      <div className="sug-host">
      {open ? (
        <div className="psug" role="listbox" aria-label="Suggested contacts">
          <div className="cap">Suggested contacts</div>
          {matches.map((id, i) => (
            <button
              key={id}
              className={i === hl ? "hl" : undefined}
              role="option"
              aria-selected={i === hl}
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); add(id); }}
            >
              <Avatar id={id} />
              <span style={{ minWidth: 0 }}>
                <span><Highlight text={people[id].name} q={typed.trim()} /></span>
                <small>{people[id].email}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      </div>
    </div>
  );
}

/** A typed name or address as a person's id when it is someone in the address book. */
function resolveRecipient(people: ReturnType<typeof useUI>["outlook"]["people"], value: string) {
  const v = value.trim().replace(/[;,]+$/, "");
  const lower = v.toLowerCase();
  return Object.values(people).find((p) => p.email.toLowerCase() === lower || p.name.toLowerCase() === lower)?.id ?? v;
}

export function Compose() {
  const { outlook, editor, scheduleSave, menu } = useUI();
  const c = outlook.state.compose!;
  const inline = c.kind !== "new";
  const box = useRef<HTMLDivElement>(null);
  const [typed, setTypedState] = useState<Record<Field, string>>({ to: "", cc: "", bcc: "" });
  const setTyped = (f: Field) => (v: string) => setTypedState((t) => ({ ...t, [f]: v }));

  // A fresh compose starts from its own text, with the cursor where writing starts.
  useLayoutEffect(() => {
    const el = editor.current;
    if (!el) return;
    el.innerHTML = c.html;
    if (inline) box.current?.scrollIntoView({ block: "nearest" });
    if (!c.to.length) box.current?.querySelector<HTMLInputElement>('input[data-field="to"]')?.focus();
    else {
      el.focus();
      const r = document.createRange();
      r.setStart(el, 0);
      r.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(r);
    }
    // Only when a new compose starts.
  }, [c.key]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Recipients still being typed become chips before the message goes anywhere. */
  const commitTyped = () => {
    const patch: Partial<OutlookCompose> = {};
    for (const f of ["to", "cc", "bcc"] as Field[]) {
      const v = typed[f].trim();
      if (v) patch[f] = [...c[f], resolveRecipient(outlook.people, v)];
    }
    if (Object.keys(patch).length) outlook.ui.editCompose(patch);
    setTypedState({ to: "", cc: "", bcc: "" });
  };
  const send = (at?: number) => {
    commitTyped();
    outlook.ui.send(at);
  };
  const future = (days: number, h: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d.getTime(); };
  const monday = () => { const d = new Date(); return future((8 - d.getDay()) % 7 || 7, 8); };

  return (
    <div
      ref={box}
      className={`compose ${inline ? "inline" : "full"}`}
      role="form"
      aria-label={inline ? "Reply" : "New message"}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          send();
        }
      }}
    >
      <div className="ctop">
        <span className="split">
          <button className="main" onClick={() => send()}><I.Send /><span>Send</span></button>
          <button className="drop" aria-label="More send options" onClick={(e) => menu(e.currentTarget, [
            { label: "Send", icon: <I.Send />, run: () => send() },
            "-",
            { caption: "Schedule send" },
            ...[["Tomorrow morning", future(1, 8)], ["Monday morning", monday()]].map(([label, t]) => ({ label: label as string, icon: <I.Clock />, hint: `${fmtDay(t as number)} ${fmtTime(t as number)}`, run: () => send(t as number) })),
          ])}><I.ChevD /></button>
        </span>
        <button className="btn subtle" onClick={() => outlook.ui.discardCompose()}><I.Trash />Discard</button>
        <AttachButton className="ib" />
        <span className="grow" />
        {inline ? <button className="ib" data-tip="Open in new window" aria-label="Open in new window" onClick={() => outlook.toast("Opened in a new window")}><I.Popout /></button> : null}
        <button className="ib tip-l" data-tip="Close" aria-label="Close and save draft" onClick={() => { commitTyped(); outlook.ui.closeCompose(); }}><I.Close /></button>
      </div>
      <RecipientField c={c} field="to" typed={typed.to} setTyped={setTyped("to")} />
      {c.showCc ? <RecipientField c={c} field="cc" typed={typed.cc} setTyped={setTyped("cc")} /> : null}
      {c.showBcc ? <RecipientField c={c} field="bcc" typed={typed.bcc} setTyped={setTyped("bcc")} /> : null}
      {inline ? null : (
        <div className="cfield">
          <input
            className="csubj"
            placeholder="Add a subject"
            maxLength={255}
            aria-label="Subject"
            value={c.subject}
            onChange={(e) => { outlook.ui.editCompose({ subject: e.target.value }); scheduleSave(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                editor.current?.focus();
              }
            }}
          />
        </div>
      )}
      <div
        ref={editor}
        className="cbody"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        data-ph={inline ? "Type your reply" : "Write your message"}
        onInput={(e) => {
          outlook.ui.setBody(e.currentTarget.innerHTML);
          scheduleSave();
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        onKeyUp={(e) => keepRange(e.currentTarget)}
        onMouseUp={(e) => keepRange(e.currentTarget)}
        onBlur={(e) => keepRange(e.currentTarget)}
      />
      {c.attachments.length ? (
        <div className="catts">
          {c.attachments.map((a, i) => (
            <span key={i} className="attcard" style={{ height: 44, width: 220 }}>
              <I.FileIcon name={a.name} />
              <span className="t"><b>{a.name}</b><small>{fmtSize(a.size)}</small></span>
              <button className="ib" aria-label={`Remove ${a.name}`} onClick={() => { outlook.ui.editCompose({ attachments: c.attachments.filter((_, j) => j !== i) }); scheduleSave(); }}>
                <I.Close style={{ width: 14, height: 14 }} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="fmtbar"><FormatButtons /></div>
      <div className="cfoot"><span>{c.savedAt ? `Draft saved at ${fmtTime(c.savedAt)}` : ""}</span></div>
    </div>
  );
}

/** A paperclip that picks files from the computer and adds them (by name and size) to what is being written. */
function AttachButton({ className, ribbon }: { className: string; ribbon?: boolean }) {
  const { outlook, scheduleSave } = useUI();
  const pick = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className={className} data-lv={ribbon ? 1 : undefined} data-tip="Attach file" aria-label="Attach file" onMouseDown={(e) => e.preventDefault()} onClick={() => pick.current?.click()}>
        <I.Attach />
        {ribbon ? <span className="lbl">Attach file</span> : null}
      </button>
      <input
        ref={pick}
        type="file"
        aria-label="Attach files"
        multiple
        hidden
        onChange={(e) => {
          const c = outlook.state.compose;
          if (!c) return;
          outlook.ui.editCompose({ attachments: [...c.attachments, ...[...(e.target.files ?? [])].map((f) => ({ name: f.name, size: f.size }))] });
          e.target.value = "";
          scheduleSave();
        }}
      />
    </>
  );
}

const EMOJI = ["😀", "😂", "😊", "😍", "🎉", "👍", "👏", "🙏", "🔥", "✅", "🚀", "💡", "☕", "📅", "📎", "❤️"];

/** The formatting commands, as the compose bar's small buttons or the ribbon's Message tab. */
export function FormatButtons({ ribbon = false }: { ribbon?: boolean }) {
  const { outlook, editor, scheduleSave, menu, closeMenu } = useUI();
  const changed = () => {
    if (!editor.current) return;
    outlook.ui.setBody(editor.current.innerHTML);
    scheduleSave();
  };
  const exec = (cmd: string, arg?: string) => {
    const el = editor.current;
    if (!el) return;
    restoreRange(el);
    document.execCommand("styleWithCSS", false, String(cmd === "foreColor" || cmd === "hiliteColor"));
    document.execCommand(cmd, false, arg);
    changed();
  };
  const link = () => {
    const el = editor.current;
    if (!el) return;
    keepRange(el);
    const r = ranges.get(el);
    outlook.ui.showDialog({
      title: "Insert link",
      ok: "Insert",
      input: { label: "Web address (URL)", placeholder: "https://", valid: (v) => /^https?:\/\/\S+\.\S+/.test(v.trim()) },
      onOk: (url) => {
        if (r) ranges.set(el, r);
        restoreRange(el);
        const u = url.trim();
        if (getSelection()?.isCollapsed) document.execCommand("insertHTML", false, `<a href="${escapeHtml(u)}">${escapeHtml(u)}</a>`);
        else document.execCommand("createLink", false, u);
        changed();
      },
    });
  };
  const emoji = (anchor: HTMLElement) =>
    menu(
      anchor,
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,32px)", gap: 2, padding: 4 }}>
        {EMOJI.map((e) => (
          <button key={e} className="ib" style={{ fontSize: 18 }} aria-label={`Insert ${e}`} onMouseDown={(ev) => ev.preventDefault()} onClick={() => { closeMenu(); exec("insertText", e); }}>{e}</button>
        ))}
      </div>
    );

  const LABELLED = ["link", "emoji"];
  const b = (key: string, icon: ReactNode, tip: string, run: (el: HTMLElement) => void, swatch?: string) => (
    <button
      key={key}
      className={ribbon ? "rb" : "ib"}
      data-lv={ribbon && LABELLED.includes(key) ? 1 : undefined}
      data-tip={tip}
      aria-label={tip}
      style={swatch && ribbon ? { position: "relative" } : undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => run(e.currentTarget)}
    >
      {icon}
      {ribbon && LABELLED.includes(key) ? <span className="lbl">{tip}</span> : null}
      {swatch ? <i className="fmt-swatch" style={{ background: swatch }} /> : null}
    </button>
  );
  const sep = (k: string) => <span key={k} className={ribbon ? "rsep" : "sep"} />;
  return (
    <>
      {b("bold", <I.Bold />, "Bold", () => exec("bold"))}
      {b("italic", <I.Italic />, "Italic", () => exec("italic"))}
      {b("underline", <I.Underline />, "Underline", () => exec("underline"))}
      {b("strike", <I.Strike />, "Strikethrough", () => exec("strikeThrough"))}
      {sep("s1")}
      {b("color", <I.FontColor />, "Font color", () => exec("foreColor", "#d13438"), "#d13438")}
      {b("hilite", <I.Highlight />, "Highlight", () => exec("hiliteColor", "#fff100"), "#fff100")}
      {sep("s2")}
      {b("bullets", <I.Bullets />, "Bullets", () => exec("insertUnorderedList"))}
      {b("numbers", <I.Numbers />, "Numbering", () => exec("insertOrderedList"))}
      {b("indent", <I.Indent />, "Increase indent", () => exec("indent"))}
      {sep("s3")}
      {b("alignL", <I.AlignL />, "Align left", () => exec("justifyLeft"))}
      {b("alignC", <I.AlignC />, "Center", () => exec("justifyCenter"))}
      {sep("s4")}
      {b("link", <I.Link />, "Insert link", link)}
      <AttachButton className={ribbon ? "rb" : "ib"} ribbon={ribbon} />
      {b("emoji", <I.Emoji />, "Emoji", emoji)}
      {b("clear", <I.Clear />, "Clear formatting", () => exec("removeFormat"))}
    </>
  );
}
