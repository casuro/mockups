import { useEffect, useRef, useState } from "react";
import { Avatar, IconButton, useUI } from "./context";
import * as I from "./icons";

// The compose window at the bottom right: recipients as chips with
// suggestions from `people`, subject, body, and the send bar. It minimizes
// to its title bar and opens full screen.

export function Compose() {
  const { gmail } = useUI();
  const { state, ui, people, me } = gmail;
  const c = state.compose;
  const [typed, setTyped] = useState("");
  const [hl, setHl] = useState(0);
  const toInput = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLTextAreaElement>(null);
  const isOpen = !!c;

  // Opening puts the cursor in To, or in the body when there are recipients already.
  useEffect(() => {
    if (!isOpen) return setTyped("");
    const t = setTimeout(() => (gmail.state.compose?.to.length ? body.current : toInput.current)?.focus(), 30);
    return () => clearTimeout(t);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return null;
  const q = typed.trim().toLowerCase();
  const matches = q
    ? Object.values(people)
        .filter((p) => p.id !== me && !c.to.includes(p.id) && (p.name.toLowerCase().includes(q) || p.email.includes(q)))
        .slice(0, 5)
    : [];
  const add = (id: string) => {
    ui.editCompose({ to: [...c.to, id] });
    setTyped("");
    setHl(0);
    toInput.current?.focus();
  };
  const commit = () => {
    const v = typed.trim().replace(/,$/, "");
    if (!v) return false;
    add(matches[hl]?.id ?? v);
    return true;
  };
  const send = () => {
    ui.sendCompose(typed);
    setTyped("");
  };
  const mode = (m: "normal" | "min" | "full") => ui.editCompose({ mode: m });

  return (
    <>
      {c.mode === "full" ? <div className="compose-backdrop" onClick={() => mode("normal")} /> : null}
      <div className={`compose${c.mode === "normal" ? "" : ` ${c.mode}`}`} role="dialog" aria-label="New Message">
        <div className="c-head" onClick={() => mode(c.mode === "min" ? "normal" : "min")}>
          <span className="t">{c.subject || "New Message"}</span>
          <IconButton label="Minimize" onClick={(e) => (e.stopPropagation(), mode(c.mode === "min" ? "normal" : "min"))}><I.Minimize /></IconButton>
          <IconButton label="Full screen" onClick={(e) => (e.stopPropagation(), mode(c.mode === "full" ? "normal" : "full"))}>
            {c.mode === "full" ? <I.ExitFullScreen /> : <I.FullScreen />}
          </IconButton>
          <IconButton label="Save & close" onClick={(e) => (e.stopPropagation(), ui.closeCompose())}><I.Close /></IconButton>
        </div>
        <div className="c-field">
          <span className="k">To</span>
          {c.to.map((id, i) => (
            <span key={`${id}:${i}`} className="rchip">
              {people[id] ? <Avatar id={id} /> : null}
              {gmail.person(id).name}
              <button aria-label="Remove" onClick={() => ui.editCompose({ to: c.to.filter((_, j) => j !== i) })}><I.Close /></button>
            </span>
          ))}
          <input
            ref={toInput}
            aria-label="To recipients"
            autoComplete="off"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setHl(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && matches.length) {
                e.preventDefault();
                setHl((hl + 1) % matches.length);
              } else if (e.key === "ArrowUp" && matches.length) {
                e.preventDefault();
                setHl((hl - 1 + matches.length) % matches.length);
              } else if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                if (typed.trim()) {
                  e.preventDefault();
                  commit();
                }
              } else if (e.key === "Backspace" && !typed && c.to.length) ui.editCompose({ to: c.to.slice(0, -1) });
            }}
          />
          <button className="cc" onClick={() => gmail.toast("Cc")}>Cc</button>
          <button className="cc" onClick={() => gmail.toast("Bcc")}>Bcc</button>
          <div>
          {matches.length ? (
            <div className="suggest">
              {matches.map((p, i) => (
                <button key={p.id} className={i === hl ? "hl" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => add(p.id)}>
                  <Avatar id={p.id} />
                  <span>
                    <b style={{ fontWeight: 500 }}>{p.name}</b>
                    <small>{p.email}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          </div>
        </div>
        <div className="c-field">
          <input placeholder="Subject" aria-label="Subject" value={c.subject} onChange={(e) => ui.editCompose({ subject: e.target.value })} />
        </div>
        <textarea
          ref={body}
          aria-label="Message Body"
          value={c.body}
          onChange={(e) => ui.editCompose({ body: e.target.value })}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
          }}
        />
        <div className="send-bar">
          <span className="send">
            <button onClick={send}>Send</button>
            <span className="more" title="More send options"><I.ChevronDown /></span>
          </span>
          <IconButton className="icon-btn sm" tip="Formatting options"><I.Format /></IconButton>
          <IconButton className="icon-btn sm" tip="Attach files"><I.Attach /></IconButton>
          <IconButton className="icon-btn sm" tip="Insert link"><I.Link /></IconButton>
          <IconButton className="icon-btn sm" tip="Insert emoji"><I.Emoji /></IconButton>
          <IconButton className="icon-btn sm" tip="Insert files using Drive"><I.Drive /></IconButton>
          <IconButton className="icon-btn sm" tip="Insert photo"><I.Image /></IconButton>
          <IconButton className="icon-btn sm" tip="Toggle confidential mode"><I.Lock /></IconButton>
          <IconButton className="icon-btn sm" tip="Insert signature"><I.Signature /></IconButton>
          <span className="grow" />
          <IconButton className="icon-btn sm" tip="Discard draft" onClick={ui.discardCompose}><I.Trash /></IconButton>
        </div>
      </div>
    </>
  );
}
