import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ck, Dialog, FileIcon, useUI } from "./context";
import * as I from "./icons";
import { plain } from "./markdown";
import { groupLabel } from "./Sidebar";
import type { ChatGPTFile } from "./types";
import { cur, textOf } from "./use-chatgpt";

// The dialogs: sharing a chat, confirming a delete, searching the history,
// picking files to attach; and the voice mode screen.

const shortDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function ShareDialog({ chatId }: { chatId: string }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const [access, setAccess] = useState<"workspace" | "private">("workspace");
  const copyRef = useRef<HTMLButtonElement>(null);
  useEffect(() => copyRef.current?.focus(), []);
  const c = chatgpt.state.chats.find((x) => x.id === chatId);
  if (!c) return null;
  const workspace = chatgpt.seed.workspace;
  const slug = `${c.id.replace(/[^a-z0-9]/gi, "").slice(-8)}-${(c.title.length * 7919).toString(16)}`;
  const link = `https://chatgpt.com/share/${slug}`;
  const first = c.messages.find((m) => m.role === "user");
  const answer = c.messages.find((m) => m.role === "assistant");
  const priv = access === "private";
  const accessMenu = (anchor: HTMLElement) =>
    ui.openMenu({
      key: "share-access",
      anchor,
      align: "end",
      content: (
        <>
          <button className="mi two" onClick={() => { setAccess("workspace"); ui.closeMenu(); }}>
            <I.Users /><span className="tx">{workspace ?? "Anyone with the link"}<small>{workspace ? "Only members of your workspace" : "Anyone who has the link"}</small></span><Ck on={!priv} />
          </button>
          <button className="mi two" onClick={() => { setAccess("private"); ui.closeMenu(); }}>
            <I.Lock /><span className="tx">Private<small>Only you have access</small></span><Ck on={priv} />
          </button>
        </>
      ),
    });
  return (
    <Dialog title={`Share "${c.title}"`} label="Share chat">
      <div className="mbd">
        <p>Messages you send after creating your link won't be shared. {workspace ? `Anyone in the ${workspace} with the URL can view the shared chat.` : "Anyone with the URL can view the shared chat."}</p>
        <div className="share-preview">
          {first ? <div className="q">{textOf(first).slice(0, 140)}</div> : null}
          {answer ? plain(textOf(answer).split("\n").filter((l) => !/^\s*\|/.test(l)).join("\n")).slice(0, 260) : c.messages.some((m) => m.role === "assistant" && cur(m).image) ? "[Image]" : ""}
        </div>
        <div className="share-access">
          <span className="ic">{priv ? <I.Lock /> : <I.Users />}</span>
          <span className="tx">
            <b>{priv ? "Private" : (workspace ?? "Anyone with the link")}</b>
            <span>{priv ? "Only you can view this link" : workspace ? "Only members of your workspace can view" : "Anyone who has the link can view"}</span>
          </span>
          <button className={`dd${ui.menu?.key === "share-access" ? " menu-open" : ""}`} onClick={(e) => accessMenu(e.currentTarget)}>Can view<I.ChevDown /></button>
        </div>
        <div className="share-link">
          <input value={link} readOnly aria-label="Share link" />
          <button
            ref={copyRef}
            className="btn primary"
            onClick={() => {
              void navigator.clipboard?.writeText(link).catch(() => {});
              ui.closeModal();
              chatgpt.toast("Link copied", "check");
              chatgpt.ui.emit({ type: "share", chatId, access });
            }}
          >
            <I.Copy />Copy link
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function ConfirmDelete({ chatId }: { chatId: string }) {
  const { chatgpt, closeModal } = useUI();
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => ok.current?.focus(), []);
  const c = chatgpt.state.chats.find((x) => x.id === chatId);
  if (!c) return null;
  return (
    <Dialog
      title="Delete chat?"
      label="Delete chat?"
      close={false}
      footer={
        <>
          <button className="btn secondary" onClick={closeModal}>Cancel</button>
          <button ref={ok} className="btn danger" onClick={() => { closeModal(); chatgpt.ui.remove(chatId); }}>Delete</button>
        </>
      }
    >
      <div className="mbd">
        <p>This will delete <strong>{c.title}</strong>.</p>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-3)" }}>Visit <u>settings</u> to delete any memories saved during this chat.</p>
      </div>
    </Dialog>
  );
}

function mark(s: string, q: string): ReactNode {
  if (!q) return s;
  const i = s.toLowerCase().indexOf(q);
  return i < 0 ? s : <>{s.slice(0, i)}<mark>{s.slice(i, i + q.length)}</mark>{s.slice(i + q.length)}</>;
}

export function SearchDialog() {
  const ui = useUI();
  const { chatgpt } = ui;
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();
  const pool = chatgpt.state.chats.filter((c) => !c.temporary && !c.archived).sort((a, b) => b.at - a.at);

  type Row = { chat: string | null; group?: string; title: string; snip?: string; project?: boolean; at?: number };
  const rows: Row[] = [];
  if (!q) {
    rows.push({ chat: null, title: "New chat" });
    let last = "";
    for (const c of pool) {
      const g = groupLabel(c.at);
      rows.push({ chat: c.id, title: c.title, project: !!c.project, at: c.at, group: g !== last ? g : undefined });
      last = g;
    }
  } else {
    for (const c of pool) {
      const inTitle = c.title.toLowerCase().includes(q);
      let snip = "";
      for (const m of c.messages) {
        const t = plain(textOf(m)).replace(/\s+/g, " ");
        const i = t.toLowerCase().indexOf(q);
        if (i >= 0) {
          const s = Math.max(0, i - 40);
          snip = (s ? "..." : "") + t.slice(s, i + q.length + 70);
          break;
        }
      }
      if (inTitle || snip) rows.push({ chat: c.id, title: c.title, snip, project: !!c.project, at: c.at });
    }
  }
  const at = Math.min(sel, Math.max(0, rows.length - 1));
  useEffect(() => {
    list.current?.querySelector(".sr.sel")?.scrollIntoView({ block: "nearest" });
  }, [at, query]);
  const go = (i: number) => {
    const r = rows[i];
    if (!r) return;
    ui.closeModal();
    ui.setDrawer(false);
    if (r.chat) chatgpt.ui.openChat(r.chat);
    else chatgpt.ui.newChat();
  };
  return (
    <Dialog cls="search-modal" label="Search chats">
      <div className="sh">
        <I.Search style={{ color: "var(--text-3)" }} />
        <input
          autoFocus
          placeholder="Search chats..."
          aria-label="Search chats"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(rows.length - 1, at + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(0, at - 1)); }
            if (e.key === "Enter") { e.preventDefault(); go(at); }
          }}
        />
        <button className="icon-btn" aria-label="Close" onClick={ui.closeModal}><I.X /></button>
      </div>
      <div className="sl" ref={list}>
        {q && !rows.length ? (
          <div className="none">No results for "{query.trim()}"</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.chat ?? "new"} style={{ display: "contents" }}>
              {r.group ? <div className="sg">{r.group}</div> : null}
              <button className={`sr${i === at ? " sel" : ""}`} onMouseMove={() => i !== at && setSel(i)} onClick={() => go(i)}>
                {r.chat === null ? <I.NewChat /> : r.project ? <I.Folder /> : <I.Chat />}
                <span className="tx">
                  <div className="tt">{mark(r.title, q)}</div>
                  {r.snip ? <div className="sn">{mark(r.snip, q)}</div> : null}
                </span>
                {r.at ? <span className="dt">{shortDate(r.at)}</span> : null}
              </button>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}

export function FilesDialog() {
  const ui = useUI();
  const { chatgpt } = ui;
  const input = useRef<HTMLInputElement>(null);
  const add = (list: ChatGPTFile[]) => {
    const now = chatgpt.composer.files;
    chatgpt.ui.setFiles([...now, ...list.filter((f) => !now.some((x) => x.name === f.name))]);
    ui.closeModal();
    ui.prompt.current?.focus();
  };
  return (
    <Dialog
      title="Add files"
      label="Add files"
      footer={
        <>
          <input
            ref={input}
            type="file"
            aria-label="Upload files"
            multiple
            hidden
            onChange={(e) => add([...(e.target.files ?? [])].map((f) => ({ name: f.name, type: (f.name.split(".").pop() ?? "").toLowerCase() })))}
          />
          <button className="btn secondary" onClick={() => input.current?.click()}><I.Clip />Upload from computer</button>
        </>
      }
    >
      <div className="mbd">
        {chatgpt.seed.recentFiles?.length ? (
          <>
            <div style={{ marginBottom: 4 }}>Recent files</div>
            <div className="picker-list">
              {chatgpt.seed.recentFiles.map((f) => (
                <button key={f.name} onClick={() => add([{ name: f.name, type: f.type }])}>
                  <FileIcon file={f} />
                  <span><b>{f.name}</b>{f.when ? <small>{f.when}</small> : null}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p>Upload a file from your computer.</p>
        )}
      </div>
    </Dialog>
  );
}

export function Voice() {
  const { chatgpt, setVoice } = useUI();
  const [muted, setMuted] = useState(false);
  return (
    <div className="voice">
      <div className="orb" />
      <div className="vt">{muted ? "Microphone muted" : "Voice mode is listening. Start talking."}</div>
      <div className="vb">
        <button
          className={muted ? "on" : ""}
          aria-label="Mute"
          onClick={() => {
            setMuted(!muted);
            chatgpt.ui.emit({ type: "voice", action: muted ? "unmute" : "mute" });
          }}
        >
          <I.Mic />
        </button>
        <button
          className="end"
          aria-label="End voice mode"
          onClick={() => {
            setVoice(false);
            chatgpt.toast("Voice chat ended");
          }}
        >
          <I.X />
        </button>
      </div>
    </div>
  );
}
