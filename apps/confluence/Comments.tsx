import { useState } from "react";
import { Avatar, useUI } from "./context";
import { ago, Rich } from "./format";
import * as I from "./icons";

// Under the page: Like, the emoji reactions and who likes it, then the
// comments and the box to add one.

export function Comments() {
  const { confluence, fmt, reply } = useUI();
  const { page, people, me, ui } = confluence;
  const [draft, setDraft] = useState("");

  const liked = page.likes.includes(me);
  const others = page.likes.filter((k) => k !== me).map((k) => (people[k]?.name ?? k).split(" ")[0]);
  const who = liked ? ["You", ...others] : others;
  const rest = who.length - 2;

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    ui.comment(text);
    setDraft("");
  };
  const cancel = () => {
    setDraft("");
    reply.current?.blur();
  };

  return (
    <>
      <div className="react">
        <button className={`pill${liked ? " on" : ""}`} aria-pressed={liked} onClick={ui.toggleLike}>
          <I.Like />
          {liked ? "Liked" : "Like"}
        </button>
        {page.reactions.map((r) => (
          <button key={r.emoji} className={`pill${r.mine ? " on" : ""}`} aria-pressed={!!r.mine} onClick={() => ui.toggleReaction(r.emoji)}>
            {`${r.emoji} ${r.count}`}
          </button>
        ))}
        {page.likes.length ? (
          <>
            <span className="likers">{page.likes.slice(0, 4).map((k) => <Avatar key={k} id={k} />)}</span>
            <small>{`${who.slice(0, 2).join(", ")}${rest > 0 ? ` and ${rest} other${rest > 1 ? "s" : ""}` : ""} like this`}</small>
          </>
        ) : (
          <small>Be the first to like this</small>
        )}
      </div>
      <section className="cmts">
        <h3>{`${page.comments.length} comment${page.comments.length === 1 ? "" : "s"}`}</h3>
        {page.comments.map((c) => (
          <div key={c.id} className="cmt">
            <Avatar id={c.from} />
            <div>
              <div className="cmt-h">
                <b>{people[c.from]?.name ?? c.from}</b>
                <span>{ago(c.at)}</span>
              </div>
              <p><Rich text={c.text} ctx={fmt} /></p>
              <div className="cmt-a">
                <button
                  onClick={() => {
                    ui.emit({ type: "action", kind: "reply", pageId: page.id, id: c.id });
                    reply.current?.focus();
                  }}
                >
                  Reply
                </button>
                <button onClick={() => ui.emit({ type: "action", kind: "like-comment", pageId: page.id, id: c.id })}>Like</button>
              </div>
            </div>
          </div>
        ))}
        <div className="reply">
          <Avatar id={me} />
          <div className="reply-box">
            <textarea
              ref={reply}
              placeholder="Add a comment..."
              aria-label="Add a comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  save();
                }
                if (e.key === "Escape") cancel();
              }}
            />
            <div className="reply-acts">
              <button className="btn pri" disabled={!draft.trim()} onClick={save}>Save</button>
              <button className="btn" onClick={cancel}>Cancel</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
