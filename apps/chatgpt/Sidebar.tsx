import { useState, type MouseEvent, type ReactNode } from "react";
import { Ck, GptAvatar, Me, openClass, useUI } from "./context";
import * as I from "./icons";
import type { ChatGPTChat } from "./types";

// The sidebar: new chat, search, the GPTs and projects sections, the chat
// history grouped by date with each chat's menu, and the account button.
// Collapsed, it is a narrow rail; in a phone-sized box, a drawer.

const DAY = 86_400_000;

export function groupLabel(t: number) {
  const n = new Date();
  const day = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  if (t >= day) return "Today";
  if (t >= day - DAY) return "Yesterday";
  if (t >= day - 7 * DAY) return "Previous 7 days";
  if (t >= day - 30 * DAY) return "Previous 30 days";
  return new Date(t).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function Sidebar() {
  const ui = useUI();
  const { chatgpt, narrow, drawer } = ui;
  const { state, seed } = chatgpt;
  const act = (kind: string) => chatgpt.ui.emit({ type: "action", kind });
  const pinned = (seed.gpts ?? []).filter((g) => state.pinned.includes(g.id));
  const listed = state.chats.filter((c) => !c.archived && !c.temporary && !c.project).sort((a, b) => b.at - a.at);
  const groups: { label: string; items: ChatGPTChat[] }[] = [];
  for (const c of listed) {
    const label = groupLabel(c.at);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(c);
    else groups.push({ label, items: [c] });
  }
  const section = (key: string, label: string, body: ReactNode) => {
    const closed = state.closed.includes(key);
    return (
      <div className="sb-section">
        <button className={`sb-label${closed ? " closed" : ""}`} onClick={() => chatgpt.ui.toggleSection(key)}>{label}<I.ChevDown /></button>
        {closed ? null : body}
      </div>
    );
  };
  const newChat = () => {
    ui.setDrawer(false);
    chatgpt.ui.newChat();
    if (!narrow) ui.prompt.current?.focus();
  };
  const collapsed = !state.sidebar && !narrow;

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}${drawer && narrow ? " drawer-open" : ""}`} aria-label="Chat history">
      <div className="sb-full">
        <div className="sb-head">
          <button className="logo-btn" aria-label="ChatGPT home" data-tip="New chat" onClick={newChat}><I.Logo /></button>
          <div style={{ display: "flex", gap: 2 }}>
            <button className="icon-btn" aria-label="Close sidebar" data-tip="Close sidebar" data-kbd="Ctrl Shift S" onClick={ui.toggleSidebar}><I.Sidebar /></button>
          </div>
        </div>
        <div className="sb-scroll">
          <div className="sb-group">
            <button className="sb-item" onClick={newChat}><I.NewChat /><span className="lbl">New chat</span><span className="kbd">Ctrl Shift O</span></button>
            <button className="sb-item" onClick={ui.dialogs.search}><I.Search /><span className="lbl">Search chats</span><span className="kbd">Ctrl K</span></button>
            <button className="sb-item" onClick={() => act("library")}><I.Library /><span className="lbl">Library</span></button>
          </div>
          {seed.gpts?.length
            ? section("gpts", "GPTs", (
                <>
                  <button className="sb-item" onClick={() => act("explore")}><I.Explore /><span className="lbl">Explore GPTs</span></button>
                  {pinned.map((g) => (
                    <button key={g.id} className={`sb-item${state.gpt === g.id && !state.chat ? " active" : ""}`} onClick={() => { ui.setDrawer(false); chatgpt.ui.newChat(g.id); }}>
                      <GptAvatar gpt={g} />
                      <span className="lbl">{g.name}</span>
                    </button>
                  ))}
                </>
              ))
            : null}
          {state.projects.length || seed.projects
            ? section("projects", "Projects", (
                <>
                  <button className="sb-item" onClick={() => act("new-project")}><I.FolderPlus /><span className="lbl">New project</span></button>
                  {state.projects.map((p) => {
                    const chats = state.chats.filter((c) => c.project === p.id && !c.archived).sort((a, b) => b.at - a.at);
                    return (
                      <div key={p.id}>
                        <a
                          href="#"
                          className="sb-item proj"
                          onClick={(e) => {
                            e.preventDefault();
                            chatgpt.ui.toggleProject(p.id);
                            chatgpt.ui.emit({ type: "action", kind: "project", id: p.id, label: p.name });
                          }}
                        >
                          <I.Folder className="folder" />
                          <span className="lbl">{p.name}</span>
                          <button
                            className="dots"
                            aria-label={`${p.open ? "Collapse" : "Expand"} project`}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); chatgpt.ui.toggleProject(p.id); }}
                          >
                            <I.ChevRight className={`chev${p.open ? " open" : ""}`} />
                          </button>
                        </a>
                        {p.open ? chats.map((c) => <ChatRow key={c.id} chat={c} nested />) : null}
                      </div>
                    );
                  })}
                </>
              ))
            : null}
          {groups.length ? (
            groups.map((g) => (
              <div className="sb-section" key={g.label}>
                <div className="sb-label">{g.label}</div>
                {g.items.map((c) => <ChatRow key={c.id} chat={c} />)}
              </div>
            ))
          ) : (
            <div className="sb-section"><div className="sb-label">Chats</div><div className="sb-empty">No chats yet</div></div>
          )}
        </div>
        <div className="sb-foot">
          <AccountButton />
        </div>
      </div>
      <div className="sb-rail">
        <button className="icon-btn logo-toggle" aria-label="Open sidebar" data-tip="Open sidebar" data-tip-side="right" onClick={ui.toggleSidebar}>
          <span className="logo-ico"><I.Logo /></span>
          <span className="open-ico"><I.Sidebar /></span>
        </button>
        <button className="icon-btn" aria-label="New chat" data-tip="New chat" data-tip-side="right" style={{ marginTop: 6 }} onClick={newChat}><I.NewChat /></button>
        <button className="icon-btn" aria-label="Search chats" data-tip="Search chats" data-tip-side="right" onClick={ui.dialogs.search}><I.Search /></button>
        <button className="icon-btn" aria-label="Library" data-tip="Library" data-tip-side="right" onClick={() => act("library")}><I.Library /></button>
        <div className="grow" onClick={ui.toggleSidebar} />
        <AccountButton rail />
      </div>
    </aside>
  );
}

function ChatRow({ chat, nested }: { chat: ChatGPTChat; nested?: boolean }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const active = chatgpt.state.chat === chat.id;
  const cls = `sb-item chat${nested ? " nested" : ""}`;
  if (ui.renaming === chat.id) return <RenameRow chat={chat} cls={cls} />;
  const menu = (anchor: HTMLElement, point?: { x: number; y: number }) =>
    ui.openMenu({ key: `chat:${chat.id}`, anchor, content: <ChatMenu chat={chat} />, point });
  return (
    <a
      href="#"
      className={`${cls}${active ? " active" : ""}${openClass(ui, `chat:${chat.id}`)}`}
      draggable={false}
      onClick={(e) => {
        e.preventDefault();
        ui.setDrawer(false);
        chatgpt.ui.openChat(chat.id);
      }}
      onContextMenu={(e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        menu(e.currentTarget.querySelector<HTMLElement>(".dots") ?? e.currentTarget, { x: e.clientX, y: e.clientY });
      }}
    >
      <span className="lbl">{chat.title}</span>
      <button
        className="dots"
        aria-label="Open conversation options"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          menu(e.currentTarget);
        }}
      >
        <I.More />
      </button>
    </a>
  );
}

function RenameRow({ chat, cls }: { chat: ChatGPTChat; cls: string }) {
  const { chatgpt, setRenaming } = useUI();
  const [value, setValue] = useState(chat.title);
  const done = (save: boolean) => {
    if (save) chatgpt.ui.renameChat(chat.id, value);
    setRenaming(null);
  };
  return (
    <div className={`${cls} active`}>
      <input
        className="rename"
        value={value}
        maxLength={80}
        aria-label="Rename chat"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => done(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); done(true); }
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); }
        }}
      />
    </div>
  );
}

/** Share, rename, move to project, archive, delete. */
export function ChatMenu({ chat }: { chat: ChatGPTChat }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const [moving, setMoving] = useState(false);
  const run = (fn: () => void) => () => {
    ui.closeMenu();
    fn();
  };
  if (moving) {
    const c = chatgpt.state.chats.find((x) => x.id === chat.id) ?? chat;
    return (
      <>
        <button className="mi" onClick={() => setMoving(false)}><I.ChevLeft /><span className="grow" style={{ color: "var(--text-2)" }}>Move to project</span></button>
        <hr />
        {chatgpt.state.projects.map((p) => (
          <button key={p.id} className="mi" onClick={run(() => chatgpt.ui.move(chat.id, p.id))}><I.Folder /><span className="grow">{p.name}</span><Ck on={c.project === p.id} /></button>
        ))}
        {c.project ? (
          <>
            <hr />
            <button className="mi" onClick={run(() => chatgpt.ui.move(chat.id, null))}><I.X />Remove from project</button>
          </>
        ) : null}
      </>
    );
  }
  return (
    <>
      <button className="mi" onClick={run(() => ui.dialogs.share(chat.id))}><I.Share />Share</button>
      <button className="mi" onClick={run(() => ui.setRenaming(chat.id))}><I.Pencil />Rename</button>
      {chatgpt.state.projects.length ? (
        <button className="mi" onClick={() => setMoving(true)}><I.Move /><span className="grow">Move to project</span><I.ChevRight /></button>
      ) : null}
      <hr />
      <button className="mi" onClick={run(() => chatgpt.ui.archive(chat.id))}><I.Archive />Archive</button>
      <button className="mi danger" onClick={run(() => ui.dialogs.confirmDelete(chat.id))}><I.Trash />Delete</button>
    </>
  );
}

function AccountButton({ rail }: { rail?: boolean }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const { me, workspace, plan } = chatgpt.seed;
  const key = rail ? "account:rail" : "account";
  const open = (anchor: HTMLElement) =>
    ui.openMenu({ key, anchor, content: <AccountMenu width={rail ? 240 : Math.max(240, anchor.offsetWidth)} />, cls: "acct-menu", side: rail ? "right" : "top" });
  if (rail)
    return (
      <button className={`acct-rail${openClass(ui, key)}`} aria-label="Open profile menu" onClick={(e) => open(e.currentTarget)}>
        <Me />
      </button>
    );
  return (
    <button className={`acct${openClass(ui, key)}`} aria-label="Open profile menu" onClick={(e) => open(e.currentTarget)}>
      <Me className="avatar" />
      <span className="who">
        <div className="nm">{me.name}</div>
        {workspace ? <div className="plan">{workspace}</div> : null}
      </span>
      {plan ? <span className="badge">{plan}</span> : null}
    </button>
  );
}

function AccountMenu({ width }: { width: number }) {
  const ui = useUI();
  const { chatgpt } = ui;
  const { me, workspace } = chatgpt.seed;
  const [help, setHelp] = useState(false);
  const pick = (label: string) => () => {
    ui.closeMenu();
    ui.setDrawer(false);
    chatgpt.ui.emit({ type: "action", kind: "account", label });
  };
  if (help)
    return (
      <div style={{ minWidth: width - 12 }}>
        <button className="mi" onClick={() => setHelp(false)}><I.ChevLeft /><span className="grow" style={{ color: "var(--text-2)" }}>Help</span></button>
        <hr />
        <button className="mi" onClick={pick("Help center")}><I.Help />Help center</button>
        <button className="mi" onClick={pick("Release notes")}><I.Doc />Release notes</button>
        <button className="mi" onClick={pick("Terms & policies")}><I.Lock />Terms &amp; policies</button>
      </div>
    );
  return (
    <div style={{ minWidth: width - 12 }}>
      {me.email ? <div className="mh-user"><Me className="avatar small" />{me.email}</div> : null}
      {workspace ? (
        <button className="mi" onClick={pick("Workspace")}>
          <span className="gpt-ava ws">{workspace.charAt(0).toUpperCase()}</span>
          <span className="grow">{workspace.replace(/ workspace$/i, "")}</span>
          <I.Check className="ck" />
        </button>
      ) : null}
      <hr />
      <button className="mi" onClick={pick("Customize ChatGPT")}><I.Sparkle />Customize ChatGPT</button>
      <button className="mi" onClick={pick("Settings")}><I.Settings />Settings</button>
      <hr />
      <button className="mi" onClick={() => setHelp(true)}><I.Help /><span className="grow">Help</span><I.ChevRight /></button>
      <button className="mi" onClick={pick("Log out")}><I.Logout />Log out</button>
    </div>
  );
}
