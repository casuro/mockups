import { Avatar, Badge, useUI } from "./context";
import { cap } from "./format";
import * as I from "./icons";
import type { TicketStatus, ZendeskTicket } from "./types";

// Writing on a ticket: public reply or internal note, the editor and its
// toolbar, macros, and the "Submit as" split button with its status menu.

const TOOLS = [
  ["Bold", <>B</>],
  ["Italic", <i>I</i>],
  ["Bulleted list", <I.List />],
  ["Insert link", <I.Link />],
  ["Attach file", <I.Attach />],
  ["Emoji", <I.Emoji />],
] as const;
const SUBMIT: TicketStatus[] = ["open", "pending", "solved"];

export function Composer({ ticket: t }: { ticket: ZendeskTicket }) {
  const { zendesk, mode, setMode, menu, setMenu } = useUI();
  const note = mode === "note";
  const requester = zendesk.people[t.requester];
  const status: TicketStatus = t.status === "new" ? "open" : t.status;
  const submit = (s: TicketStatus) => {
    setMenu(null);
    setMode("public");
    zendesk.ui.submit(s, note);
  };
  return (
    <div className="composer">
      <div className="comp-top">
        <div className="seg" role="group" aria-label="Reply type">
          <button className={note ? "" : "on"} aria-pressed={!note} onClick={() => setMode("public")}>Public reply</button>
          <button className={`nt${note ? " on" : ""}`} aria-pressed={note} onClick={() => setMode("note")}>Internal note</button>
        </div>
        <span className="to">
          {note ? "Visible to agents only" : <>To <Avatar id={t.requester} size="sm" /> {requester?.name}</>}
        </span>
      </div>
      <div className={`editor${note ? " note" : ""}`}>
        <textarea
          placeholder={note ? "Add an internal note" : "Write a public reply"}
          aria-label={note ? "Internal note" : "Public reply"}
          value={zendesk.state.drafts[t.id] ?? ""}
          onChange={(e) => zendesk.ui.setDraft(t.id, e.target.value)}
        />
        <div className="toolbar">
          {TOOLS.map(([label, glyph]) => (
            <button key={label} className="icon-btn" aria-label={label} onClick={() => zendesk.ui.action(label)}>{glyph}</button>
          ))}
        </div>
      </div>
      <div className="comp-foot">
        <div className="split">
          <button className="btn" aria-expanded={menu === "macros"} onClick={() => setMenu(menu === "macros" ? null : "macros")}>
            <I.Bolt />Apply macro
          </button>
          {menu === "macros" ? (
            <div className="menu macros" role="menu">
              <div className="lbl">Macros</div>
              {zendesk.macros.map((m, i) => (
                <button key={m.name} role="menuitem" onClick={() => { setMenu(null); zendesk.ui.applyMacro(i); }}>{m.name}</button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grow" />
        <button className="btn close-tab" onClick={() => zendesk.ui.closeTab(t.id)}>Close tab</button>
        <div className="split">
          <button className="btn primary" onClick={() => submit(status)}>{`Submit as ${cap(status)}`}</button>
          <button className="btn primary caret" aria-label="More submit options" aria-expanded={menu === "submit"} onClick={() => setMenu(menu === "submit" ? null : "submit")}>
            <I.ChevronUp />
          </button>
          {menu === "submit" ? (
            <div className="menu" role="menu">
              {SUBMIT.map((s) => (
                <button key={s} role="menuitem" onClick={() => submit(s)}><Badge status={s} />{`Submit as ${cap(s)}`}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
