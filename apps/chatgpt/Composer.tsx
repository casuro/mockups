import { useEffect, useLayoutEffect, useState } from "react";
import { Ck, FileChip, useUI } from "./context";
import * as I from "./icons";
import type { ChatGPTTool } from "./types";

// The composer: attachments above, the + menu and the tool pill on the
// left, the prompt (or the dictation waves), and the mic and the
// voice/send/stop button on the right. It grows to two rows once the
// prompt wraps or something is attached.

export const TOOLS: Record<ChatGPTTool, { label: string; menu: string; Icon: typeof I.Image; placeholder: string }> = {
  image: { label: "Image", menu: "Create image", Icon: I.Image, placeholder: "Describe or edit an image" },
  research: { label: "Research", menu: "Deep research", Icon: I.Research, placeholder: "Get a detailed report" },
  search: { label: "Search", menu: "Web search", Icon: I.Globe, placeholder: "Search the web" },
};

const WAVES = Array.from({ length: 36 }, (_, i) => (i * 97) % 1000);

export function Composer({ docked }: { docked?: boolean }) {
  const ui = useUI();
  const { chatgpt, prompt, dictating, setDictating } = ui;
  const { text, files, tool } = chatgpt.composer;
  const [expanded, setExpanded] = useState(false);
  const generating = !!chatgpt.generating;
  const gpt = chatgpt.state.gpt && !chatgpt.chat ? chatgpt.seed.gpts?.find((g) => g.id === chatgpt.state.gpt) : null;
  const t = tool ? TOOLS[tool] : null;
  const has = !!text.trim() || files.length > 0;

  // A fresh composer (a new chat, the first prompt sent) takes the cursor; not on first load.
  useEffect(() => {
    if (ui.mounted.current && !ui.narrow) prompt.current?.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Grows with the prompt up to 40% of the screen; two rows once it wraps.
  useLayoutEffect(() => {
    const el = prompt.current;
    if (!el) return;
    el.style.height = "auto";
    const multi = el.scrollHeight > 40 || text.includes("\n");
    if (!text) setExpanded(false);
    else if (multi) setExpanded(true);
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.4)}px`;
  });

  const send = () => {
    if (generating || !has) return;
    chatgpt.ui.send(text, files, tool);
    chatgpt.draft("");
    chatgpt.ui.setFiles([]);
    chatgpt.ui.setTool(null);
    setExpanded(false);
  };

  const plusMenu = (anchor: HTMLElement) =>
    ui.openMenu({
      key: "plus",
      anchor,
      cls: "plus-menu",
      side: docked ? "top" : "bottom",
      content: (
        <>
          <button className="mi" onClick={() => { ui.closeMenu(); ui.dialogs.files(); }}><I.Clip /><span className="grow">Add photos &amp; files</span></button>
          <hr />
          {(Object.keys(TOOLS) as ChatGPTTool[]).map((k) => {
            const { Icon, menu } = TOOLS[k];
            return (
              <button key={k} className="mi" onClick={() => { ui.closeMenu(); chatgpt.ui.setTool(chatgpt.composer.tool === k ? null : k); prompt.current?.focus(); }}>
                <Icon /><span className="grow">{menu}</span><ToolCheck tool={k} />
              </button>
            );
          })}
        </>
      ),
    });

  return (
    <form
      className={`composer${expanded || files.length || tool || dictating ? " expanded" : ""}`}
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement;
        if (el === e.currentTarget || el.classList.contains("c-main")) {
          e.preventDefault();
          prompt.current?.focus();
        }
      }}
    >
      <div className="c-files">
        {files.map((f, i) => (
          <FileChip key={`${f.name}:${i}`} file={f} onRemove={() => { chatgpt.ui.setFiles(files.filter((_, j) => j !== i)); prompt.current?.focus(); }} />
        ))}
      </div>
      <div className="c-lead">
        <button type="button" className={`c-btn${ui.menu?.key === "plus" ? " menu-open" : ""}`} aria-label="Add photos, files, and tools" onClick={(e) => plusMenu(e.currentTarget)}><I.Plus /></button>
        <span>
          {t ? (
            <button type="button" className="tool-pill" aria-label={`Remove ${t.label}`} onClick={() => { chatgpt.ui.setTool(null); prompt.current?.focus(); }}>
              <span className="ico"><t.Icon /></span>
              <span className="x"><I.X /></span>
              {t.label}
            </button>
          ) : null}
        </span>
      </div>
      <div className="c-main">
        <textarea
          ref={prompt}
          rows={1}
          value={text}
          hidden={dictating}
          placeholder={t ? t.placeholder : gpt ? `Message ${gpt.name}` : "Ask anything"}
          aria-label="Message ChatGPT"
          onChange={(e) => chatgpt.draft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        {dictating ? (
          <div className="dictate">
            {WAVES.map((d, i) => <i key={i} style={{ animationDelay: `${d / 1000}s` }} />)}
            <span className="lbl">Listening...</span>
          </div>
        ) : null}
      </div>
      <div className="c-trail">
        {generating ? null : (
          <button
            type="button"
            className="c-btn"
            aria-label={dictating ? "Submit dictation" : "Dictate"}
            data-tip={dictating ? "Submit dictation" : "Dictate"}
            onClick={() => {
              if (dictating) {
                setDictating(false);
                chatgpt.ui.emit({ type: "dictate" });
                prompt.current?.focus();
              } else setDictating(true);
            }}
          >
            {dictating ? <I.Check /> : <I.Mic />}
          </button>
        )}
        {generating ? (
          <button type="button" className="c-send" aria-label="Stop streaming" data-tip="Stop" onClick={chatgpt.ui.stop}><I.Stop /></button>
        ) : has ? (
          <button type="submit" className="c-send" aria-label="Send prompt" data-tip="Send"><I.Send /></button>
        ) : (
          <button type="button" className="c-send" aria-label="Start voice mode" data-tip="Use voice mode" onClick={() => ui.setVoice(true)}><I.Voice /></button>
        )}
      </div>
    </form>
  );
}

function ToolCheck({ tool }: { tool: ChatGPTTool }) {
  return <Ck on={useUI().chatgpt.composer.tool === tool} />;
}
