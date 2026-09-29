import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Composer } from "./Composer";
import { Avatar, useUI } from "./context";
import * as I from "./icons";
import { MessageList } from "./Messages";

// The open chat: its header with the call buttons, the wallpaper with the
// messages, and the composer.

export function Conversation() {
  const { whatsapp, convOpen, setConvOpen, press } = useUI();
  const { state, people } = whatsapp;
  const id = state.open;
  const c = state.chats[id];
  const info = whatsapp.chat(id);
  const typist = c.typing ? people[c.typing] : null;
  const subtitle = typist ? (
    <span style={{ color: "var(--teal)" }}>{`${info.group ? `${typist.first} is ` : ""}typing...`}</span>
  ) : info.group ? (
    [...info.members.map((m) => people[m]?.first ?? m), "You"].join(", ")
  ) : state.online[info.with!] ? (
    "online"
  ) : (
    (state.lastSeen[info.with!] ?? "")
  );
  const call = (video: boolean) => {
    whatsapp.toast(video ? "Video call" : "Voice call");
    whatsapp.ui.emit({ type: "call", chat: id, video });
  };
  const last = c.messages[c.messages.length - 1];

  return (
    <main className="main">
      <header className="conv-head">
        <button className="ibtn back" title="Back" aria-label="Back to chats" onClick={() => setConvOpen(false)}><I.Back /></button>
        <Avatar chat={id} />
        <div className="who" role="button" tabIndex={0} onClick={() => press("Contact info")} onKeyDown={(e) => e.key === "Enter" && press("Contact info")}>
          <b>{info.name}</b>
          <small aria-live="polite">{subtitle}</small>
        </div>
        <button className="ibtn" title="Video call" aria-label="Video call" onClick={() => call(true)}><I.Video /></button>
        <button className="ibtn" title="Voice call" aria-label="Voice call" onClick={() => call(false)}><I.Call /></button>
        <button className="ibtn find" title="Search" aria-label="Search" onClick={() => press("Search")}><I.Search /></button>
        <button className="ibtn" title="Menu" aria-label="Menu" onClick={() => press("Menu")}><I.Menu /></button>
      </header>
      <ScrollToEnd className="msgs" reset={`${id}:${convOpen}`} watch={`${id}:${c.messages.length}:${last?.id}`} label={`Messages with ${info.name}`}>
        <div className="enc">🔒 Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.</div>
        <MessageList chat={id} messages={c.messages} />
      </ScrollToEnd>
      <Composer key={id} />
    </main>
  );
}

/**
 * A scrolling feed that follows new messages: it jumps to the end when
 * `watch` changes, unless the reader has scrolled up to read something
 * (then it stays where they are). `reset` changing always jumps: another
 * chat, or the phone layout showing the conversation it had hidden.
 */
function ScrollToEnd({ className, watch, reset, label, children }: { className: string; watch: string; reset: string; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
    pinned.current = true;
  }, [reset]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [watch]);
  return (
    <div
      ref={ref}
      className={className}
      role="log"
      aria-label={label}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      {children}
    </div>
  );
}
