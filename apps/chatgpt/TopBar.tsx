import { useState } from "react";
import { Ck, Dialog, GptAvatar, openClass, useUI } from "./context";
import * as I from "./icons";

// The top bar: the model picker (or the GPT's menu), and on the right the
// share button and the conversation's menu, or the temporary-chat switch on
// a new chat.

export function TopBar({ shadowed }: { shadowed: boolean }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const { state, chat, seed } = chatgpt;
  const gpt = state.gpt ? seed.gpts?.find((g) => g.id === state.gpt) : null;
  const model = chatgpt.models.find((m) => m.id === state.model);

  let right = null;
  if (chat && chat.messages.length && !chat.temporary)
    right = (
      <>
        <button className="pill-btn share-btn" aria-label="Share" data-tip="Share" onClick={() => ui.dialogs.share(chat.id)}>
          <I.Share /><span className="lbl">Share</span>
        </button>
        <button
          className={`icon-btn${openClass(ui, "conv")}`}
          aria-label="Open conversation options"
          data-tip="More"
          onClick={(e) =>
            ui.openMenu({
              key: "conv",
              anchor: e.currentTarget,
              align: "end",
              content: (
                <>
                  <button className="mi" onClick={() => { ui.closeMenu(); chatgpt.ui.archive(chat.id); }}><I.Archive />Archive</button>
                  <button className="mi" onClick={() => { ui.closeMenu(); chatgpt.ui.emit({ type: "action", kind: "report", id: chat.id }); }}><I.Flag />Report</button>
                  <button className="mi danger" onClick={() => { ui.closeMenu(); ui.dialogs.confirmDelete(chat.id); }}><I.Trash />Delete</button>
                </>
              ),
            })
          }
        >
          <I.More />
        </button>
      </>
    );
  else if (chat?.temporary)
    right = <span className="temp-badge"><I.Temp /><span className="lbl">Temporary</span></span>;
  else if (!chat)
    right = (
      <button
        className={`icon-btn temp-btn${state.temporary ? " on" : ""}`}
        aria-pressed={state.temporary}
        aria-label={`Turn ${state.temporary ? "off" : "on"} temporary chat`}
        data-tip={state.temporary ? "Turn off temporary chat" : "Turn on temporary chat"}
        onClick={() => {
          chatgpt.ui.setTemporary(!state.temporary);
          ui.prompt.current?.focus();
        }}
      >
        <I.Temp />
      </button>
    );

  return (
    <header className={`topbar${shadowed ? " shadowed" : ""}`}>
      <button className="icon-btn menu-btn-m" aria-label="Open sidebar" onClick={() => ui.setDrawer(true)}><I.Menu /></button>
      {gpt ? (
        <button
          className={`model-btn${openClass(ui, "gpt")}`}
          onClick={(e) =>
            ui.openMenu({
              key: "gpt",
              anchor: e.currentTarget,
              content: (
                <>
                  <button className="mi" onClick={() => { ui.closeMenu(); chatgpt.ui.newChat(gpt.id); }}><I.NewChat />New chat</button>
                  <button className="mi" onClick={() => { ui.closeMenu(); ui.openModal(<AboutGpt id={gpt.id} />); }}><I.Info />About</button>
                  <button className="mi" onClick={() => { ui.closeMenu(); chatgpt.ui.pinGpt(gpt.id); }}>
                    {state.pinned.includes(gpt.id) ? <><I.EyeOff />Hide from sidebar</> : <><I.Pin />Keep in sidebar</>}
                  </button>
                </>
              ),
            })
          }
        >
          <GptAvatar gpt={gpt} />
          <span className="t">{gpt.name}</span>
          <I.ChevDown />
        </button>
      ) : (
        <button
          className={`model-btn${openClass(ui, "model")}`}
          aria-haspopup="menu"
          onClick={(e) => ui.openMenu({ key: "model", anchor: e.currentTarget, cls: "model-menu", content: <ModelMenu /> })}
        >
          <span className="t">ChatGPT <span className="v">{model?.label ?? model?.name ?? state.model}</span></span>
          <I.ChevDown />
        </button>
      )}
      <div className="grow" />
      <div className="top-actions">
        {right}
        <button className="icon-btn newchat-m" aria-label="New chat" onClick={() => chatgpt.ui.newChat()}><I.NewChat /></button>
      </div>
    </header>
  );
}

function ModelMenu() {
  const ui = useUI();
  const { chatgpt } = ui;
  const [legacy, setLegacy] = useState(false);
  const pick = (id: string) => {
    ui.closeMenu();
    chatgpt.ui.setModel(id);
  };
  const current = chatgpt.models.filter((m) => !m.legacy);
  const old = chatgpt.models.filter((m) => m.legacy);
  if (legacy)
    return (
      <>
        <button className="mi" onClick={() => setLegacy(false)}><I.ChevLeft /><span className="grow" style={{ color: "var(--text-2)" }}>Legacy models</span></button>
        <hr />
        {old.map((m) => (
          <button key={m.id} className="mi" onClick={() => pick(m.id)}><span className="grow">{m.name}</span><Ck on={chatgpt.state.model === m.id} /></button>
        ))}
      </>
    );
  return (
    <>
      <div className="mh">ChatGPT {current[0]?.label?.split(" ")[0] ?? ""}</div>
      {current.map((m) => (
        <button key={m.id} className="mi two" onClick={() => pick(m.id)}>
          <span className="tx">{m.name}{m.description ? <small>{m.description}</small> : null}</span>
          <span className="grow" />
          <Ck on={chatgpt.state.model === m.id} />
        </button>
      ))}
      {old.length ? (
        <>
          <hr />
          <button className="mi" onClick={() => setLegacy(true)}><span className="grow">Legacy models</span><I.ChevRight /></button>
        </>
      ) : null}
    </>
  );
}

function AboutGpt({ id }: { id: string }) {
  const { chatgpt, closeModal } = useUI();
  const gpt = chatgpt.seed.gpts?.find((g) => g.id === id);
  if (!gpt) return null;
  return (
    <Dialog
      title={gpt.name}
      label={gpt.name}
      footer={<button className="btn primary" style={{ width: "100%" }} onClick={closeModal}>Start chat</button>}
    >
      <div className="mbd">
        <div className="gpt-hero" style={{ margin: "0 0 8px" }}>
          <GptAvatar gpt={gpt} />
          {gpt.author ? <span className="by">{gpt.author.photo ? <img src={gpt.author.photo} alt="" /> : null}By {gpt.author.name}</span> : null}
          {gpt.description ? <p>{gpt.description}</p> : null}
        </div>
        {chatgpt.seed.workspace ? <p style={{ textAlign: "center" }}>Shared with everyone in the {chatgpt.seed.workspace}</p> : null}
      </div>
    </Dialog>
  );
}
