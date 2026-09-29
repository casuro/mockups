import { useState } from "react";
import { useUI } from "./context";
import * as I from "./icons";

// The bar at the bottom of a chat: emoji, attach, the message field, and
// the mic that turns into send once something is typed.

export function Composer() {
  const { whatsapp, composer, press } = useUI();
  const [draft, setDraft] = useState("");
  const ready = !!draft.trim();
  const send = () => {
    if (!ready) return;
    whatsapp.ui.send(draft.trim());
    setDraft("");
    composer.current?.focus();
  };
  return (
    <footer className="comp">
      <button className="ibtn" title="Emoji" aria-label="Emoji" onClick={() => press("Emoji")}><I.Emoji /></button>
      <button className="ibtn" title="Attach" aria-label="Attach" onClick={() => press("Attach")}><I.Plus /></button>
      <div className="field">
        <input
          ref={composer}
          value={draft}
          placeholder="Type a message"
          aria-label="Type a message"
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
      </div>
      {ready ? (
        <button className="ibtn send go" title="Send" aria-label="Send" onClick={send}><I.Send /></button>
      ) : (
        <button
          className="ibtn send"
          title="Voice message"
          aria-label="Voice message"
          onClick={() => {
            whatsapp.toast("Hold to record a voice message");
            whatsapp.ui.emit({ type: "action", label: "Voice message", chat: whatsapp.state.open });
          }}
        >
          <I.Mic />
        </button>
      )}
    </footer>
  );
}
