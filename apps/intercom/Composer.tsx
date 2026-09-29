import { useUI } from "./context";
import * as I from "./icons";
import type { IntercomConversationState } from "./types";

// The composer under the thread: Reply and Note tabs, the text, and the
// insert buttons (emoji, attachment, GIF, article, macro). Cmd+Enter sends.

export function Composer({ c }: { c: IntercomConversationState }) {
  const { intercom, composer, draft, setDraft, insert } = useUI();
  const { mode } = intercom.state;
  const note = mode === "note";
  const first = (intercom.customers[c.customer]?.name ?? c.customer).split(" ")[0];
  const inserts = intercom.seed.inserts ?? {};

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    intercom.ui.send(text);
    setDraft("");
    composer.current?.focus();
  };
  const setMode = (next: "reply" | "note") => {
    intercom.ui.setMode(next);
    composer.current?.focus();
  };
  const tool = (kind: "emoji" | "article" | "macro", text: string | undefined, label: string) => {
    if (!text) return intercom.ui.emit({ type: "action", label, conversation: c.id });
    insert(text);
    intercom.ui.emit({ type: "insert", conversation: c.id, tool: kind, text });
  };
  const action = (label: string) => intercom.ui.emit({ type: "action", label, conversation: c.id });

  return (
    <div className={`composer${note ? " note" : ""}`}>
      <div className="ctabs" role="tablist">
        <button className={`ctab${note ? "" : " on"}`} role="tab" aria-selected={!note} onClick={() => setMode("reply")}>Reply</button>
        <button className={`ctab${note ? " on" : ""}`} role="tab" aria-selected={note} onClick={() => setMode("note")}>Note</button>
      </div>
      <textarea
        ref={composer}
        rows={3}
        value={draft}
        placeholder={note ? "Write an internal note. Only teammates can see this." : `Reply to ${first}, use Cmd+K for shortcuts`}
        aria-label={note ? "Internal note" : `Reply to ${first}`}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
      />
      <div className="ctools">
        <button className="icon-btn" title="Insert emoji" aria-label="Emoji" onClick={() => tool("emoji", inserts.emoji ?? "\u{1F44B}", "Insert emoji")}><I.Emoji /></button>
        <button className="icon-btn" title="Attach a file" aria-label="Attach" onClick={() => action("Attach a file")}><I.Clip /></button>
        <button className="icon-btn" title="Insert GIF" aria-label="GIF" onClick={() => action("Insert GIF")}><span className="gif">GIF</span></button>
        <button className="icon-btn" title="Insert article" aria-label="Article" onClick={() => tool("article", inserts.article, "Insert article")}><I.Book /></button>
        <button className="icon-btn" title="Use macro" aria-label="Macros" onClick={() => tool("macro", inserts.macro, "Use macro")}><I.Bolt /></button>
        <span className="sp" />
        <span className="hint">Cmd+Enter</span>
        <button className="send-btn" onClick={send}>{note ? "Add note" : "Send"}</button>
      </div>
    </div>
  );
}
