import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MessageList, Message } from "./Messages";
import { useUI } from "./context";
import * as I from "./icons";

// Writing: the main composer with its formatting bar and typing line, and
// the thread pane with its own composer.

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
}

export function Composer() {
  const { slack, composer, openPicker, draft, setDraft } = useUI();
  const label = slack.label(slack.state.current);
  const typing = slack.typing?.key === slack.state.current ? slack.people[slack.typing.from] : null;
  const ready = !!draft.trim();
  const send = () => {
    if (!ready) return;
    slack.ui.send(draft.trim());
    setDraft("");
  };
  // Grows with what is typed; empty, it is back to one line.
  useLayoutEffect(() => {
    const el = composer.current;
    if (!el) return;
    if (draft) autosize(el);
    else el.style.height = "";
  }, [draft, composer]);
  return (
    <div className={`composer-wrap${ready ? " typing" : ""}`}>
      <div className="typing-ind" aria-live="polite">
        {typing ? (
          <>
            <span className="dots"><span /><span /><span /></span> <b>{typing.name}</b> is typing...
          </>
        ) : null}
      </div>
      <div className={`composer${ready ? " ready" : ""}`}>
        <div className="fmt">
          <button aria-label="Bold"><b>B</b></button>
          <button aria-label="Italic"><i style={{ fontFamily: "Georgia,serif" }}>I</i></button>
          <button aria-label="Strikethrough"><s>S</s></button>
          <span className="sep" />
          <button aria-label="Link"><I.Link /></button>
          <button aria-label="Bulleted list"><I.List /></button>
          <span className="sep" />
          <button aria-label="Code"><I.Code /></button>
          <button aria-label="Code block"><I.CodeBlock /></button>
        </div>
        <textarea
          ref={composer}
          rows={1}
          value={draft}
          placeholder={`Message ${label}`}
          aria-label={`Message ${label}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="comp-foot">
          <button className="icon-btn circle" aria-label="Attach"><I.PlusBold /></button>
          <button className="icon-btn" aria-label="Formatting">
            <span style={{ fontWeight: 700, fontSize: 13, textDecoration: "underline" }}>Aa</span>
          </button>
          <button className="icon-btn" aria-label="Emoji" onClick={(e) => openPicker(e.currentTarget, { kind: "composer" })}><I.Emoji /></button>
          <button className="icon-btn" aria-label="Mention"><I.At /></button>
          <button className="icon-btn" aria-label="Record video"><I.Video /></button>
          <button className="icon-btn" aria-label="Record audio"><I.Audio /></button>
          <span className="grow" />
          <div className="send">
            <button className="go" aria-label="Send" onClick={send}><I.Send /></button>
            <button className="more" aria-label="Schedule"><I.Caret style={{ width: 12, height: 12 }} /></button>
          </div>
        </div>
      </div>
      <div className="hint"><b>Shift + Return</b> to add a new line</div>
    </div>
  );
}

export function Thread() {
  const { slack, threadComposer } = useUI();
  const [also, setAlso] = useState(false);
  const id = slack.state.thread;
  const parent = id ? findMessage(slack.state.conversations, id) : null;
  const label = slack.label(slack.state.current);
  const send = () => {
    const el = threadComposer.current;
    const text = el?.value.trim();
    if (!el || !text || !id) return;
    slack.ui.send(text, id, also);
    el.value = "";
    autosize(el);
  };
  if (!parent) return null;
  const n = parent.replies.length;
  return (
    <section className="thread" aria-label="Thread">
      <div className="th-head">
        <h3>Thread</h3>
        <small>{label}</small>
        <button className="icon-btn" aria-label="Close thread" onClick={() => slack.ui.openThread(null)}><I.Close /></button>
      </div>
      <ScrollToEnd className="messages" watch={`${id}:${n}`} label="Thread replies">
        <Message message={parent} prev={null} inThread />
        {n ? <div className="th-count">{n} {n === 1 ? "reply" : "replies"}</div> : null}
        <MessageList messages={parent.replies} inThread />
      </ScrollToEnd>
      <div className="composer-wrap">
        <div className="composer">
          <textarea
            ref={threadComposer}
            rows={1}
            placeholder="Reply..."
            aria-label="Reply in thread"
            onChange={(e) => autosize(e.target)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="comp-foot">
            <button className="icon-btn circle" aria-label="Attach"><I.PlusBold /></button>
            <button className="icon-btn" aria-label="Emoji"><I.Emoji /></button>
            <span className="grow" />
            <div className="send"><button className="go" aria-label="Send reply" onClick={send}><I.Send /></button></div>
          </div>
        </div>
        <label className="also" style={{ paddingTop: 8 }}>
          <input type="checkbox" aria-label={`Also send to ${label}`} checked={also} onChange={(e) => setAlso(e.target.checked)} /> Also send to <b>{label}</b>
        </label>
      </div>
    </section>
  );
}

function findMessage(conversations: ReturnType<typeof useUI>["slack"]["state"]["conversations"], id: string) {
  for (const c of Object.values(conversations)) {
    const m = c.messages.find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}

/**
 * A scrolling feed that follows new content: it jumps to the end when
 * `watch` changes, unless the reader has scrolled up to read something
 * (then it stays where they are). `reset` changing always jumps.
 */
export function ScrollToEnd({ className, watch, reset, label, children }: { className: string; watch: string; reset?: string; label: string; children: ReactNode }) {
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
