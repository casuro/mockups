import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Composer } from "./Composer";
import { ChatGPTContext, Menu, useUI, type ChatGPTUI, type MenuSpec } from "./context";
import { Hero, Thread } from "./Conversation";
import { ConfirmDelete, FilesDialog, SearchDialog, ShareDialog, Voice } from "./Dialogs";
import * as I from "./icons";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { ChatGPTApp } from "./use-chatgpt";
import "./chatgpt.css";

// ChatGPT, as in apps/chatgpt.html. Give it an app from useChatGPT(); it
// fills the box it is put in (give that box a height), whether that is the
// whole screen or one pane of it, and narrows to ChatGPT's mobile layout
// (the sidebar becomes a drawer) when the box is narrow.

export interface ChatGPTProps {
  chatgpt: ChatGPTApp;
  className?: string;
  style?: CSSProperties;
}

const NARROW = 760;

export function ChatGPT({ chatgpt, className, style }: ChatGPTProps) {
  const root = useRef<HTMLDivElement>(null);
  const prompt = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(false);
  const [narrow, setNarrow] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<MenuSpec | null>(null);
  const [modal, setModal] = useState<ReactNode>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [voice, setVoiceState] = useState(false);
  const { state, chat } = chatgpt;

  useEffect(() => {
    mounted.current = true;
  }, []);

  // Phone layout by the box's own width, not the window's.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const n = el.clientWidth < NARROW;
      setNarrow((was) => {
        if (was !== n) setDrawer(false);
        return n;
      });
      setMenu(null);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The empty screen's heading takes turns each time it shows.
  const greetings = (() => {
    const g = chatgpt.seed.greeting;
    if (typeof g === "string") return [g];
    if (g?.length) return g;
    return ["What can I help with?", "Ready when you are.", "What's on your mind today?", `Where should we begin, ${chatgpt.seed.me.name.split(" ")[0]}?`];
  })();
  const [greetN, setGreetN] = useState(0);
  const hero = !chat;
  const wasHero = useRef(hero);
  useEffect(() => {
    if (hero && !wasHero.current) setGreetN((n) => n + 1);
    wasHero.current = hero;
  }, [hero]);

  // Leaving a chat ends editing a prompt in it.
  useEffect(() => setEditing(null), [state.chat]);

  const openMenu = useCallback((spec: MenuSpec) => setMenu((m) => (m?.key === spec.key ? null : spec)), []);
  const closeMenu = useCallback(() => setMenu(null), []);
  const openModal = useCallback((content: ReactNode) => {
    setMenu(null);
    setModal(content);
  }, []);
  const closeModal = useCallback(() => {
    setModal(null);
    requestAnimationFrame(() => {
      if (!root.current?.contains(document.activeElement) || document.activeElement === document.body) prompt.current?.focus({ preventScroll: true });
    });
  }, []);
  const setVoice = useCallback(
    (on: boolean) => {
      setVoiceState(on);
      chatgpt.ui.emit({ type: "voice", action: on ? "start" : "end" });
    },
    [chatgpt.ui]
  );
  const toggleSidebar = useCallback(() => {
    if (narrow) setDrawer((d) => !d);
    else chatgpt.ui.toggleSidebar();
  }, [narrow, chatgpt.ui]);

  const dialogs = {
    share: (id: string) => openModal(<ShareDialog chatId={id} />),
    confirmDelete: (id: string) => openModal(<ConfirmDelete chatId={id} />),
    search: () => {
      setDrawer(false);
      openModal(<SearchDialog />);
    },
    files: () => openModal(<FilesDialog />),
  };

  // ChatGPT's shortcuts: ⌘⇧O new chat, ⌘K search, ⌘⇧S sidebar, Esc closes the top-most thing
  // (or stops the answer), and typing anywhere goes to the composer.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && e.shiftKey && k === "o") {
      e.preventDefault();
      setModal(null);
      chatgpt.ui.newChat();
      return;
    }
    if (mod && !e.shiftKey && k === "k") {
      e.preventDefault();
      if (modal) setModal(null);
      else dialogs.search();
      return;
    }
    if (mod && e.shiftKey && k === "s") {
      e.preventDefault();
      toggleSidebar();
      return;
    }
    if (e.key === "Escape") {
      if (menu) return setMenu(null);
      if (voice) return setVoice(false);
      if (modal) return closeModal();
      if (chatgpt.generating) return chatgpt.ui.stop();
      if (dictating) return setDictating(false);
      if (drawer) return setDrawer(false);
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    if (!mod && !e.altKey && e.key.length === 1 && !modal && !menu && !/INPUT|TEXTAREA|SELECT/.test(active?.tagName ?? "") && !active?.isContentEditable) prompt.current?.focus();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui: ChatGPTUI = {
    chatgpt,
    root,
    prompt,
    mounted,
    narrow,
    drawer,
    setDrawer,
    menu,
    openMenu,
    closeMenu,
    modal,
    openModal,
    closeModal,
    renaming,
    setRenaming,
    editing,
    setEditing,
    dictating,
    setDictating,
    setVoice,
    greeting: greetings[greetN % greetings.length],
    dialogs,
    toggleSidebar,
  };

  return (
    <ChatGPTContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-chatgpt${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          if (menu && !t.closest(".menu") && !menu.anchor.contains(t)) setMenu(null);
        }}
      >
        <div className="app">
          <Sidebar />
          <div className={`scrim${drawer && narrow ? " show" : ""}`} onClick={() => setDrawer(false)} />
          <main className="main">
            <ChatColumn />
          </main>
        </div>
        {modal ? (
          <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
            {modal}
          </div>
        ) : null}
        {voice ? <Voice /> : null}
        {menu ? <Menu spec={menu} /> : null}
        <Toasts />
        <Tip />
      </div>
    </ChatGPTContext.Provider>
  );
}

function ChatColumn() {
  const { chatgpt } = useUI();
  const { chat, generating } = chatgpt;
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [toBottom, setToBottom] = useState(false);
  const [shadowed, setShadowed] = useState(false);
  const count = useRef(chat?.messages.length ?? 0);

  const near = () => {
    const el = scroller.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };
  const sync = () => {
    const el = scroller.current;
    setToBottom(!!chat && !near());
    setShadowed(!!chat && !!el && el.scrollTop > 4);
  };

  // Opening a chat starts at its end.
  useLayoutEffect(() => {
    const el = scroller.current;
    pinned.current = true;
    count.current = chat?.messages.length ?? 0;
    if (el) el.scrollTop = chat ? el.scrollHeight : 0;
    sync();
  }, [chat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new prompt goes to the end; a streaming answer is followed unless the reader scrolled up.
  const n = chat?.messages.length ?? 0;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (n > count.current) {
      pinned.current = true;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else if (pinned.current) el.scrollTop = el.scrollHeight;
    count.current = n;
    sync();
  }, [n, generating?.shown, generating?.phase, chat?.messages[n - 1]?.v]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`chat-col${chat ? "" : " empty"}`}>
      <TopBar shadowed={shadowed} />
      <div
        className="scroller"
        ref={scroller}
        onScroll={() => {
          pinned.current = near();
          sync();
        }}
        onWheel={(e) => {
          if (e.deltaY < 0 && generating) pinned.current = false;
        }}
      >
        <div className="view">{chat ? <Thread chat={chat} /> : <Hero />}</div>
      </div>
      <div className="dock">
        <div className="dock-inner">
          <button
            className={`to-bottom${toBottom ? " show" : ""}`}
            aria-label="Scroll to bottom"
            onClick={() => {
              pinned.current = true;
              scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
            }}
          >
            <I.ArrowDown />
          </button>
          {chat ? <Composer docked /> : null}
          <div className="disclaimer">{chatgpt.seed.disclaimer ?? "ChatGPT can make mistakes. Check important info."}</div>
        </div>
      </div>
    </div>
  );
}

function Toasts() {
  const { chatgpt } = useUI();
  const icons = { check: I.Check, archive: I.Archive, trash: I.Trash, folder: I.Folder, download: I.Download };
  return (
    <div className="toast-host" aria-live="polite">
      {chatgpt.toasts.map((t) => {
        const Icon = t.icon ? icons[t.icon] : null;
        return <Toast key={t.id} text={t.text} icon={Icon ? <Icon /> : null} />;
      })}
    </div>
  );
}

function Toast({ text, icon }: { text: string; icon: ReactNode }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOut(true), 2600);
    return () => clearTimeout(t);
  }, []);
  return <div className={`toast${out ? " out" : ""}`}>{icon}<span>{text}</span></div>;
}

/** Tooltips from data-tip, placed inside the app's box so scrolling parts never clip them. */
function Tip() {
  const { root, menu } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ el: HTMLElement; text: string; kbd?: string } | null>(null);
  useEffect(() => {
    const box = root.current;
    if (!box) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const over = (e: globalThis.MouseEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      clearTimeout(timer);
      setTip(null);
      if (!t || matchMedia("(hover: none)").matches) return;
      timer = setTimeout(() => {
        if (t.isConnected && !t.classList.contains("menu-open")) setTip({ el: t, text: t.dataset.tip ?? "", kbd: t.dataset.kbd });
      }, 350);
    };
    const down = () => {
      clearTimeout(timer);
      setTip(null);
    };
    box.addEventListener("mouseover", over);
    box.addEventListener("mousedown", down, true);
    return () => {
      clearTimeout(timer);
      box.removeEventListener("mouseover", over);
      box.removeEventListener("mousedown", down, true);
    };
  }, [root]);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = root.current;
    if (!el || !box || !tip) return;
    const b = box.getBoundingClientRect();
    const r = tip.el.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const side = tip.el.dataset.tipSide ?? "bottom";
    let x: number;
    let y: number;
    if (side === "right") {
      x = r.right - b.left + 8;
      y = r.top - b.top + r.height / 2 - h / 2;
    } else {
      x = r.left - b.left + r.width / 2 - w / 2;
      y = side === "top" ? r.top - b.top - h - 6 : r.bottom - b.top + 6;
    }
    el.style.left = `${Math.max(8, Math.min(b.width - w - 8, x))}px`;
    el.style.top = `${Math.max(8, Math.min(b.height - h - 8, y))}px`;
  }, [tip, root]);
  const show = tip && tip.el.isConnected && !menu;
  return (
    <div ref={ref} className={`tip${show ? " show" : ""}`}>
      {tip?.text}
      {tip?.kbd ? <kbd>{tip.kbd}</kbd> : null}
    </div>
  );
}
