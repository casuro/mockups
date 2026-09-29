import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Elapsed, useUI } from "./context";
import * as I from "./icons";

// Writing, and the pieces every conversation shares: the composer with its
// typing line, the feed that follows new messages, the content header's
// back button, and the Join button of a meeting running in a conversation.

export function Composer({ post = false }: { post?: boolean }) {
  const { teams, composer, openPicker, draft, setDraft } = useUI();
  const [withSubject, setWithSubject] = useState(false);
  const subject = useRef<HTMLInputElement>(null);
  const key = teams.state.view === "chat" ? teams.state.chat : teams.state.channel;
  const typing = key && teams.typing?.key === key ? teams.people[teams.typing.from] : null;
  const ready = !!draft.trim();
  const send = () => {
    if (!ready) return;
    teams.ui.send(draft.trim(), post ? subject.current?.value.trim() || undefined : undefined);
    setDraft("");
    setWithSubject(false);
  };
  // Grows with what is typed, up to 200px; empty, it is back to one line.
  useLayoutEffect(() => {
    const el = composer.current;
    if (!el) return;
    el.style.height = "auto";
    if (draft) el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    else el.style.height = "";
  }, [draft, composer]);
  const placeholder = post ? "Start a post" : "Type a message";
  return (
    <div className="composer-wrap">
      <div className="typing" aria-live="polite">
        {typing ? (
          <>
            <span className="dots"><span /><span /><span /></span>
            {typing.name.split(" ")[0]} is typing
          </>
        ) : null}
      </div>
      <div className={`composer${ready ? " ready" : ""}`}>
        {post && withSubject ? <input ref={subject} className="subject" placeholder="Add a subject" aria-label="Subject" autoFocus /> : null}
        <textarea
          ref={composer}
          rows={1}
          value={draft}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="comp-tools">
          <button
            className="ct"
            title="Format"
            aria-label="Format"
            onClick={() => {
              if (!post) return;
              setWithSubject(!withSubject);
              if (withSubject) composer.current?.focus();
            }}
          >
            <I.Format />
          </button>
          <button className="ct" title="Emoji" aria-label="Emoji" onClick={(e) => openPicker(e.currentTarget, { kind: "composer" })}><I.Emoji /></button>
          <button className="ct" title="GIF" aria-label="GIF" onClick={() => teams.toast("GIFs")}>GIF</button>
          <button className="ct" title="Attach file" aria-label="Attach file" onClick={() => teams.toast("Attach a file")}><I.Attach /></button>
          <button className="ct" title="Actions and apps" aria-label="Actions and apps" onClick={() => teams.toast("Actions and apps")}><I.Plus /></button>
          <span className="grow" />
          <button className="ct send" title="Send (Enter)" aria-label="Send" onClick={send}><I.Send /></button>
        </div>
      </div>
    </div>
  );
}

/**
 * A scrolling feed that follows new content: it jumps to the end when
 * `watch` changes, unless the reader has scrolled up to read something
 * (then it stays where they are).
 */
export function ScrollToEnd({ watch, label, children }: { watch: string; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [watch]);
  return (
    <div
      ref={ref}
      className="scroll"
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

/** Back to the list, on a phone. */
export function BackButton() {
  const { teams } = useUI();
  return (
    <button className="tb-btn back-btn" aria-label="Back" onClick={teams.ui.back}>
      <I.ChevLeft />
    </button>
  );
}

/** The Join button (or the running clock, once in) of a meeting in this conversation; null when none runs. */
export function MeetButton({ id }: { id: string }) {
  const { teams, openPrejoin, setCallView } = useUI();
  const h = teams.state.meetings[id];
  if (!h) return null;
  if (teams.state.inCall === id)
    return (
      <button className="hbtn join" title="Return to meeting" aria-label="Return to meeting" onClick={() => setCallView("full")}>
        <I.Video />
        <span className="t"><Elapsed from={h.startedAt} /></span>
      </button>
    );
  return (
    <button className="hbtn join" onClick={() => openPrejoin(id)}>
      <I.Video />
      <span className="lbl">Join</span>
      <span className="t"><Elapsed from={h.startedAt} /></span>
    </button>
  );
}

/** The header's tabs: the first is the one showing. */
export function Tabs({ names }: { names: [string, string] }) {
  const { teams } = useUI();
  return (
    <div className="tabs">
      <button className="tab active" aria-label={names[0]}>{names[0]}</button>
      <button className="tab" aria-label={names[1]} onClick={() => teams.toast(names[0] === "Chat" ? "Shared files and links" : "Files")}>{names[1]}</button>
      <button className="tab" aria-label="Add a tab" onClick={() => teams.toast("Add a tab")}><I.Plus style={{ width: 16, height: 16 }} /></button>
    </div>
  );
}
