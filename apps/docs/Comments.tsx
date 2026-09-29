import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Avatar, useUI } from "./context";
import { Mentions, when } from "./format";
import * as I from "./icons";
import type { DocsThread } from "./types";

// The comments column: a card per open comment and suggested edit, level
// with its text, in the order they appear in the document. The card in focus
// shows every reply and a reply box; a comment's check resolves it, a
// suggestion's check and cross accept or reject it.

export function Comments({ ref, relayout }: { ref: Ref<HTMLElement>; relayout: () => void }) {
  const { docs, draft } = useUI();
  const { state, me } = docs;
  // Document order: the order the marks appear in the page's HTML.
  const order = useMemo(() => [...new Set([...state.html.matchAll(/data-[cs]="([^"]+)"/g)].map((m) => m[1]))], [state.html]);
  const byId = new Map(state.threads.filter((t) => t.status === "open").map((t) => [t.id, t]));
  if (draft) byId.set(draft, { id: draft, kind: "comment", from: me, at: Date.now(), text: "", replies: [], status: "open" });
  const list = order.map((id) => byId.get(id)).filter((t): t is DocsThread => !!t);

  return (
    <aside className="comments" ref={ref} aria-label="Comments">
      {list.map((t) => (
        <Card key={t.id} thread={t} isDraft={t.id === draft} relayout={relayout} />
      ))}
    </aside>
  );
}

function Card({ thread: t, isDraft, relayout }: { thread: DocsThread; isDraft: boolean; relayout: () => void }) {
  const { docs, active, setActive, cancelDraft } = useUI();
  const { people } = docs;
  const on = active === t.id;
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  // The reply box grows with what is typed.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    if (text) el.style.height = `${el.scrollHeight}px`;
    relayout();
  }, [text, relayout]);
  useLayoutEffect(() => {
    if (isDraft) box.current?.focus({ preventScroll: true });
  }, [isDraft]);

  const post = () => {
    const v = text.trim();
    if (!v) return;
    if (isDraft) docs.ui.postComment(t.id, v);
    else docs.ui.reply(t.id, v);
    setText("");
  };
  const cancel = () => {
    setText("");
    if (isDraft) cancelDraft();
    else setActive(null);
  };
  const settle = (how: "resolve" | "accept" | "reject") => {
    setActive(null);
    docs.ui.settle(t.id, how);
  };
  const who = (id: string) => people[id]?.name ?? id;
  const replies = on || t.replies.length <= 1 ? t.replies : [];

  return (
    <div
      className={`card${on ? " on" : ""}`}
      data-card={t.id}
      onClick={() => {
        if (!on) setActive(t.id);
      }}
    >
      <div className="c-head">
        <Avatar id={t.from} className="av" />
        <div className="c-who">
          <b>{who(t.from)}</b>
          <small>{isDraft ? "" : when(t.at)}</small>
        </div>
        {isDraft ? null : t.kind === "suggestion" ? (
          <>
            <Btn ok title="Accept suggestion" onClick={() => settle("accept")}><I.Check /></Btn>
            <Btn title="Reject suggestion" onClick={() => settle("reject")}><I.Close /></Btn>
          </>
        ) : (
          <>
            <Btn ok title="Mark as resolved and hide discussion" onClick={() => settle("resolve")}><I.Check /></Btn>
            <Btn title="More options" onClick={() => docs.toast("Edit, delete, or link to this comment")}><I.More /></Btn>
          </>
        )}
      </div>
      {isDraft ? null : (
        <div className="c-text">
          {t.kind === "suggestion" ? (
            t.with ? (
              <>
                Replace: <span className="q-del">"{t.replace}"</span>
                <br />
                with: <span className="q-ins">"{t.with}"</span>
              </>
            ) : (
              <>Delete: <span className="q-del">"{t.replace}"</span></>
            )
          ) : (
            <Mentions text={t.text} people={people} />
          )}
        </div>
      )}
      {replies.map((r) => (
        <div className="reply" key={r.id}>
          <div className="c-head">
            <Avatar id={r.from} className="av" />
            <div className="c-who">
              <b>{who(r.from)}</b>
              <small>{when(r.at)}</small>
            </div>
          </div>
          <div className="c-text"><Mentions text={r.text} people={people} /></div>
        </div>
      ))}
      {!on && t.replies.length > 1 ? <div className="c-more">{t.replies.length} replies</div> : null}
      <div className="c-box">
        <textarea
          ref={box}
          rows={1}
          value={text}
          placeholder={`${isDraft ? "Comment" : "Reply"} or add others with @`}
          aria-label={isDraft ? "Comment" : "Reply"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              post();
            }
          }}
        />
        <div className="c-acts">
          <button onClick={(e) => (e.stopPropagation(), cancel())}>Cancel</button>
          <button className="primary" disabled={!text.trim()} onClick={(e) => (e.stopPropagation(), post())}>
            {isDraft ? "Comment" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Btn({ ok, title, onClick, children }: { ok?: boolean; title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className={`c-btn${ok ? " ok" : ""}`}
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
