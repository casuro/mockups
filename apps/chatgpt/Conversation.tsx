import { useEffect, useRef, useState } from "react";
import { Composer } from "./Composer";
import { FileChip, GptAvatar, useUI } from "./context";
import * as I from "./icons";
import { Markdown } from "./markdown";
import type { ChatGPTAnswer, ChatGPTChat, ChatGPTMessage, ChatGPTSuggestion } from "./types";
import { cur, textOf, type Generation } from "./use-chatgpt";

// What is in the middle: the empty screen with its greeting and suggestions
// (or a GPT's start screen), and a conversation: the prompts with their
// edit box, and the answers with their status, thought, picture, markdown,
// action row, version switcher, feedback card and follow-ups.

const DEFAULT_SUGGESTIONS: ChatGPTSuggestion[] = [
  { label: "Summarize a doc", icon: "doc", insert: "Summarize this doc in five bullets for a leadership update: " },
  { label: "Write code", icon: "code", insert: "Write code for " },
  { label: "Brainstorm", icon: "bulb", insert: "Brainstorm ideas for " },
  { label: "Analyze data", icon: "chart", insert: "Analyze this data and tell me what stands out: " },
  { label: "Create image", icon: "image", tool: "image" },
];
const SUGGESTION_ICON = { doc: I.Doc, code: I.Code, bulb: I.Bulb, chart: I.Chart, image: I.Image, globe: I.Globe, sparkle: I.Sparkle };

export function Hero() {
  const { chatgpt, greeting, prompt } = useUI();
  const { state, seed } = chatgpt;
  const gpt = state.gpt ? seed.gpts?.find((g) => g.id === state.gpt) : null;
  const insert = (text: string) => {
    chatgpt.draft(text);
    requestAnimationFrame(() => {
      const el = prompt.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };
  let head;
  if (state.temporary)
    head = (
      <div className="hero-top">
        <h1>Temporary Chat</h1>
        <p className="sub">This chat won't appear in history, use or update ChatGPT's memory, or be used to train our models. For safety purposes, we may keep a copy for up to 30 days.</p>
      </div>
    );
  else if (gpt)
    head = (
      <div className="gpt-hero hero-top">
        <GptAvatar gpt={gpt} />
        <h1>{gpt.name}</h1>
        {gpt.author ? (
          <span className="by">{gpt.author.photo ? <img src={gpt.author.photo} alt="" /> : null}By {gpt.author.name}</span>
        ) : null}
        {gpt.description ? <p>{gpt.description}</p> : null}
      </div>
    );
  else head = <div className="hero-top"><h1>{greeting}</h1></div>;
  const suggestions = seed.suggestions ?? DEFAULT_SUGGESTIONS;
  return (
    <div className="hero-wrap">
      <div className={`hero${gpt ? " has-starters" : ""}`}>
        {head}
        <div className="slot"><Composer /></div>
        {gpt ? (
          <div className="starters">
            {(gpt.starters ?? []).map((s) => <button key={s} className="starter" onClick={() => insert(s)}>{s}</button>)}
          </div>
        ) : state.temporary || !suggestions.length ? null : (
          <div className="chips">
            {suggestions.map((s) => {
              const Icon = SUGGESTION_ICON[s.icon ?? "sparkle"];
              return (
                <button
                  key={s.label}
                  className="chip"
                  onClick={() => {
                    if (s.tool) {
                      chatgpt.ui.setTool(chatgpt.composer.tool === s.tool ? null : s.tool);
                      prompt.current?.focus();
                    } else insert(s.insert ?? s.label);
                  }}
                >
                  <Icon />{s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function Thread({ chat }: { chat: ChatGPTChat }) {
  return (
    <div className="thread">
      {chat.messages.map((m, i) =>
        m.role === "user" ? <UserTurn key={m.id} m={m} /> : <AssistantTurn key={m.id} chat={chat} m={m} last={i === chat.messages.length - 1} />
      )}
    </div>
  );
}

function Versions({ m }: { m: ChatGPTMessage }) {
  const { chatgpt } = useUI();
  if (m.versions.length < 2) return null;
  return (
    <span className="versions">
      <button className="act" aria-label={m.role === "user" ? "Previous version" : "Previous response"} disabled={m.v === 0} onClick={() => chatgpt.ui.switchVersion(m.id, -1)}><I.ChevLeft /></button>
      <span>{m.v + 1}/{m.versions.length}</span>
      <button className="act" aria-label={m.role === "user" ? "Next version" : "Next response"} disabled={m.v === m.versions.length - 1} onClick={() => chatgpt.ui.switchVersion(m.id, 1)}><I.ChevRight /></button>
    </span>
  );
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const { chatgpt } = useUI();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      className="act"
      aria-label="Copy"
      data-tip="Copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        chatgpt.ui.emit({ type: "action", kind: "copy", id });
      }}
    >
      {done ? <I.Check /> : <I.Copy />}
    </button>
  );
}

function UserTurn({ m }: { m: Extract<ChatGPTMessage, { role: "user" }> }) {
  const { chatgpt, editing, setEditing } = useUI();
  const v = cur(m);
  if (editing === m.id) return <Editor m={m} />;
  return (
    <div className="turn user">
      {v.files.length ? <div className="ufiles">{v.files.map((f) => <FileChip key={f.name} file={f} />)}</div> : null}
      {v.text ? <div className="bubble">{v.text}</div> : null}
      <div className="u-actions">
        <Versions m={m} />
        <CopyButton text={v.text} id={m.id} />
        <button
          className="act"
          aria-label="Edit message"
          data-tip="Edit message"
          onClick={() => (chatgpt.generating ? chatgpt.toast("Wait for the response to finish") : setEditing(m.id))}
        >
          <I.Pencil />
        </button>
      </div>
    </div>
  );
}

function Editor({ m }: { m: ChatGPTMessage }) {
  const { chatgpt, setEditing } = useUI();
  const [value, setValue] = useState(textOf(m));
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  const send = () => {
    if (!value.trim()) return;
    setEditing(null);
    chatgpt.ui.edit(m.id, value);
  };
  return (
    <div className="turn user">
      <div className="editor">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          aria-label="Edit message"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setEditing(null); }
          }}
        />
        <div className="row">
          <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn primary" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  );
}

const REASONS = ["Not factually correct", "Didn't follow instructions", "Too long", "Not what I asked for", "Being lazy", "Other..."];

function AssistantTurn({ chat, m, last }: { chat: ChatGPTChat; m: Extract<ChatGPTMessage, { role: "assistant" }>; last: boolean }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const gen = chatgpt.generating?.messageId === m.id ? chatgpt.generating : null;
  const v = cur(m);
  return (
    <div className={`turn asst${last ? " last" : ""}`}>
      {gen && (gen.phase === "waiting" || gen.phase === "status") ? (
        <Status gen={gen} />
      ) : (
        <Answer chat={chat} m={m} v={v} gen={gen} last={last} />
      )}
    </div>
  );
}

function Status({ gen }: { gen: Generation }) {
  return (
    <div className="status">
      <span className="shimmer">{gen.status}</span>
      {gen.sub ? <span className="sub">{gen.sub}</span> : null}
    </div>
  );
}

function Answer({ chat, m, v, gen, last }: { chat: ChatGPTChat; m: Extract<ChatGPTMessage, { role: "assistant" }>; v: ChatGPTAnswer; gen: Generation | null; last: boolean }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!speaking) return;
    const t = setTimeout(() => setSpeaking(false), 5000);
    return () => clearTimeout(t);
  }, [speaking]);
  const act = (kind: string, label?: string) => chatgpt.ui.emit({ type: "action", kind, id: m.id, ...(label ? { label } : {}) });
  const creating = gen?.phase === "image";
  const body = gen ? gen.shown : v.text;
  const fb = m.feedback;
  const model = chatgpt.models.find((x) => x.id === (v.model ?? "auto"));

  const thought = v.thought ? (
    <>
      <button className={`thought${thoughtOpen ? " open" : ""}`} onClick={() => setThoughtOpen((o) => !o)}>Thought for {v.thought.seconds}s<I.ChevRight /></button>
      {thoughtOpen && v.thought.notes?.length ? <div className="thought-body">{v.thought.notes.map((n, i) => <p key={i}>{n}</p>)}</div> : null}
    </>
  ) : null;

  const image = v.image ? (
    <>
      {creating ? <div className="status"><span className="shimmer">Creating image</span></div> : <div className="img-caption">Image created</div>}
      <div className={`gen-img${creating ? " creating" : ""}`}>
        <img className="art" src={v.image.src} alt={v.image.alt ?? ""} />
        {creating ? null : (
          <div className="img-tools">
            <button aria-label="Download" data-tip="Download" onClick={() => { act("image-download"); chatgpt.toast("Image downloaded", "download"); }}><I.Download /></button>
            <button aria-label="Edit image" data-tip="Edit" onClick={() => { chatgpt.ui.setTool("image"); chatgpt.draft("Edit the image: "); ui.prompt.current?.focus(); act("image-edit"); }}><I.Pencil /></button>
          </div>
        )}
      </div>
    </>
  ) : null;

  if (creating) return <>{thought}{image}</>;
  const content = body || gen ? (
    <Markdown
      text={body}
      streaming={!!gen}
      onCopyCode={() => act("copy-code")}
      onEditCode={(code, lang) => chatgpt.ui.emit({ type: "action", kind: "code-edit", id: m.id, label: `${lang}\n${code}` })}
    />
  ) : null;
  if (gen) return <>{thought}{image}{content}</>;

  const regenMenu = (anchor: HTMLElement) =>
    ui.openMenu({
      key: `regen:${m.id}`,
      anchor,
      content: (
        <>
          <div className="mh">Used ChatGPT {model?.label ?? model?.name ?? "5"}</div>
          {([["again", "Try again", I.Regen], ["details", "Add details", I.Plus], ["concise", "More concise", I.Menu]] as const).map(([mode, label, Icon]) => (
            <button key={mode} className="mi" onClick={() => { ui.closeMenu(); chatgpt.ui.regenerate(m.id, mode); }}><Icon /><span className="grow">{label}</span></button>
          ))}
          <hr />
          <button className="mi" onClick={() => { ui.closeMenu(); chatgpt.ui.regenerate(m.id, "search"); }}><I.Globe /><span className="grow">Search the web</span></button>
        </>
      ),
    });

  const sourcesMenu = (anchor: HTMLElement) =>
    ui.openMenu({
      key: `sources:${m.id}`,
      anchor,
      cls: "src-menu",
      content: (
        <>
          <div className="mh">Sources</div>
          {(v.sources ?? []).map((s) => (
            <button key={s.host} className="mi src" onClick={() => { ui.closeMenu(); act("source", s.host); }}>
              <span>{s.name}</span>
              <small>{s.host}</small>
            </button>
          ))}
        </>
      ),
    });

  return (
    <>
      {thought}
      {image}
      {content}
      {v.stopped ? <div className="stopped">You stopped this response</div> : null}
      <div className="a-actions">
        <Versions m={m} />
        <CopyButton text={v.text} id={m.id} />
        {fb !== "down" ? (
          <button
            className={`act${fb === "up" ? " on" : ""}`}
            aria-label="Good response"
            data-tip="Good response"
            onClick={() => {
              setFeedbackOpen(false);
              chatgpt.ui.feedback(m.id, fb === "up" ? null : "up");
              if (fb !== "up") chatgpt.toast("Thanks for your feedback!");
            }}
          >
            {fb === "up" ? <I.UpFill /> : <I.Up />}
          </button>
        ) : null}
        {fb !== "up" ? (
          <button
            className={`act${fb === "down" ? " on" : ""}`}
            aria-label="Bad response"
            data-tip="Bad response"
            onClick={() => {
              setFeedbackOpen(fb !== "down");
              chatgpt.ui.feedback(m.id, fb === "down" ? null : "down");
            }}
          >
            {fb === "down" ? <I.DownFill /> : <I.Down />}
          </button>
        ) : null}
        <button
          className={`act${speaking ? " on" : ""}`}
          aria-label={speaking ? "Stop" : "Read aloud"}
          data-tip={speaking ? "Stop" : "Read aloud"}
          onClick={() => {
            if (!speaking) act("read-aloud");
            setSpeaking((s) => !s);
          }}
        >
          {speaking ? <I.Stop /> : <I.Speaker />}
        </button>
        {!chat.temporary ? <button className="act" aria-label="Share" data-tip="Share" onClick={() => ui.dialogs.share(chat.id)}><I.Share /></button> : null}
        <button
          className={`act${ui.menu?.key === `regen:${m.id}` ? " menu-open" : ""}`}
          aria-label="Switch model"
          data-tip="Try again"
          onClick={(e) => !chatgpt.generating && regenMenu(e.currentTarget)}
        >
          <I.Regen />
        </button>
        {v.sources?.length ? (
          <button className="src-pill" onClick={(e) => sourcesMenu(e.currentTarget)}>
            <span className="fav">{v.sources.map((s) => <b key={s.host} style={{ background: s.color ?? "#5d5d5d" }}>{s.name.charAt(0)}</b>)}</span>
            Sources
          </button>
        ) : null}
      </div>
      {feedbackOpen && fb === "down" ? (
        <div className="fb-card">
          <div className="hd">
            <span>Tell us more:</span>
            <button className="act" aria-label="Close" onClick={() => setFeedbackOpen(false)}><I.X /></button>
          </div>
          <div className="opts">
            {REASONS.map((r) => (
              <button key={r} onClick={() => { setFeedbackOpen(false); chatgpt.ui.feedback(m.id, "down", r); chatgpt.toast("Thanks for your feedback!"); }}>{r}</button>
            ))}
          </div>
        </div>
      ) : null}
      {last && !chatgpt.generating && !v.stopped && v.followups?.length ? (
        <div className="followups">
          {v.followups.map((f) => (
            <button key={f} onClick={() => chatgpt.ui.send(f, [], null)}><I.ArrowDown style={{ transform: "rotate(-90deg)" }} />{f}</button>
          ))}
        </div>
      ) : null}
    </>
  );
}
