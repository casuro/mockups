import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Composer, ScrollToEnd, Thread } from "./Composer";
import { Avatar, SlackContext, useUI, type PickerTarget, type SlackUI } from "./context";
import { InlineMrkdwn, type FormatContext } from "./format";
import { Dock, HuddleSlot, HuddleWindow } from "./Huddle";
import * as I from "./icons";
import { MessageList } from "./Messages";
import { Rail, Sidebar, TopBar } from "./Sidebar";
import type { SlackMessage } from "./types";
import type { SlackWorkspace } from "./use-slack";
import "./slack.css";

// Slack, as in apps/slack.html. Give it a workspace from useSlack(); it
// fills the box it is put in (give that box a height), whether that is the
// whole screen or one pane of it, and narrows to Slack's mobile layout when
// the box is narrow.

export interface SlackProps {
  slack: SlackWorkspace;
  /** Draws a message's `custom` part: a form, an approval, anything the kit does not have. */
  renderCustom?: (message: SlackMessage) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const EMOJI = ["👍", "❤️", "😂", "🎉", "🙌", "👀", "🔥", "✅", "🚀", "💯", "🙏", "😅", "🤔", "👏", "😍", "🫡", "☕", "🌮", "🐛", "⭐", "💡", "📌", "🎯", "🥳"];

export function Slack({ slack, renderCustom, className, style }: SlackProps) {
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const threadComposer = useRef<HTMLTextAreaElement>(null);
  const [huddleWindow, setHuddleWindow] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [picker, setPicker] = useState<{ target: PickerTarget; left: number; top: number } | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [seen] = useState(() => new Set(Object.values(slack.state.conversations).flatMap((c) => c.messages.flatMap((m) => [m.id, ...m.replies.map((r) => r.id)]))));
  const [grown] = useState(() => new Set<string>());
  const { state } = slack;

  // A huddle window only makes sense while in a huddle; one joined with a screen already shared opens it.
  const inHuddle = state.inHuddle;
  useEffect(() => {
    setHuddleWindow(!!inHuddle && !!slack.state.huddles[inHuddle]?.sharing && slack.state.huddles[inHuddle]?.sharing?.by !== slack.me);
    // Only when joining or leaving, not on every change to the huddle.
  }, [inHuddle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switching conversation closes the mobile sidebar and puts the cursor in the composer
  // (not on first load: the page around the app decides where focus starts).
  const opened = useRef(state.current);
  useEffect(() => {
    if (opened.current === state.current) return;
    opened.current = state.current;
    setSideOpen(false);
    composer.current?.focus({ preventScroll: true });
  }, [state.current]);
  useEffect(() => {
    if (state.thread) threadComposer.current?.focus({ preventScroll: true });
  }, [state.thread]);

  const openPicker = useCallback((anchor: HTMLElement, target: PickerTarget) => {
    const box = root.current?.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    if (!box) return;
    const w = 8 * 32 + 7 * 2 + 16 + 2;
    const h = 3 * 32 + 2 * 2 + 16 + 2;
    const left = Math.max(8, Math.min(r.right - box.left - w, box.width - w - 8));
    const top = r.top - box.top - h - 6 < 48 ? r.bottom - box.top + 6 : r.top - box.top - h - 6;
    setPicker({ target, left, top });
  }, []);

  const react = useCallback(
    (id: string, emoji: string) => {
      slack.ui.toggleReaction(id, emoji);
      setPopped(`${id}:${emoji}`);
    },
    [slack.ui]
  );

  const floatEmoji = (emoji: string) => {
    const host = root.current?.querySelector(huddleWindow ? '[data-huddle-host="window"]' : '[data-huddle-host="dock"]');
    if (!host) return;
    const el = document.createElement("span");
    el.className = "float-emoji";
    el.textContent = emoji;
    el.style.left = `${10 + Math.random() * 75}%`;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2700);
  };

  const pick = (emoji: string) => {
    const target = picker?.target;
    setPicker(null);
    if (!target) return;
    if (target.kind === "composer") {
      setDraft((d) => d + emoji);
      composer.current?.focus();
    } else if (target.kind === "huddle") floatEmoji(emoji);
    else react(target.id, emoji);
  };

  // Slack's shortcuts: ⌘K search, ⌘⇧Space mute in a huddle, Esc closes the top-most thing.
  const escape = useRef<() => void>(() => {});
  escape.current = () => {
    if (picker) setPicker(null);
    else if (huddleWindow) setHuddleWindow(false);
    else if (state.thread) slack.ui.openThread(null);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        search.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Space" && inHuddle) {
        e.preventDefault();
        slack.ui.huddleControl("mic");
      }
      if (e.key === "Escape") escape.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [inHuddle, slack.ui]);

  const fmt = useMemo<FormatContext>(
    () => ({
      people: slack.people,
      me: slack.me,
      onChannel: (id) => {
        if (slack.seed.channels.some((c) => c.id === id)) slack.open({ channel: id });
      },
      onLink: (url) => slack.ui.emit({ type: "action", kind: "link", label: url }),
    }),
    [slack.people, slack.me, slack.seed.channels, slack.open, slack.ui]
  );

  const ui: SlackUI = {
    slack,
    fmt,
    root,
    renderCustom,
    openPicker,
    huddleWindow,
    setHuddleWindow,
    popped,
    react,
    seen,
    grown,
    composer,
    threadComposer,
    draft,
    setDraft,
    toggleSide: () => setSideOpen((o) => !o),
  };

  const bodyClass = ["body", state.thread ? "thread-open" : "", inHuddle ? "in-huddle" : "", sideOpen ? "side-open" : ""].filter(Boolean).join(" ");

  return (
    <SlackContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-slack${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseDown={(e) => {
          if (picker && !(e.target as HTMLElement).closest(".emoji-pop")) setPicker(null);
        }}
      >
        <div className="app">
          <TopBar search={search} />
          <div className={bodyClass}>
            <Rail />
            <Sidebar />
            <Main />
            <Thread />
          </div>
        </div>
        <Dock />
        <HuddleWindow />
        {picker ? (
          <div className="emoji-pop show" style={{ left: picker.left, top: picker.top }}>
            {EMOJI.map((e) => (
              <button key={e} aria-label={e} onClick={() => pick(e)}>{e}</button>
            ))}
          </div>
        ) : null}
        <Toast />
      </div>
    </SlackContext.Provider>
  );
}

function Main() {
  const { slack, fmt } = useUI();
  const { state, people, seed } = slack;
  const key = state.current;
  const conv = state.conversations[key];
  const channel = key.startsWith("channel:") ? seed.channels.find((c) => `channel:${c.id}` === key) : null;
  const dm = channel ? null : people[key.slice(3)];
  const last = conv.messages[conv.messages.length - 1];
  const count = channel ? (channel.memberCount ?? (channel.members?.length ?? 0) + 1) : 0;

  return (
    <main className="main">
      <div className="ch-head">
        <button className="ch-name">
          {channel ? (
            <>
              <span style={{ fontWeight: 400, opacity: 0.8 }}>#</span>
              {channel.id}
            </>
          ) : dm ? (
            <>
              <span className="dm-av" style={{ width: 24, height: 24, marginRight: 4 }}>
                <Avatar id={dm.id} style={{ width: 24, height: 24, borderRadius: 5, fontSize: 11, background: dm.color }} />
              </span>
              {dm.name}
            </>
          ) : null}
          <I.Caret />
        </button>
        <div className="ch-topic">
          {channel ? <InlineMrkdwn text={channel.topic ?? ""} ctx={fmt} /> : dm ? `${dm.online ? "Active" : "Away"}${dm.status ? ` · ${dm.status}` : ""}${dm.title ? ` · ${dm.title}` : ""}` : null}
        </div>
        {channel ? (
          <button className="members" aria-label={`${count} members`}>
            <span className="stack">{(channel.members ?? []).slice(0, 3).map((id) => <Avatar key={id} id={id} />)}</span>
            <span className="n">{count}</span>
          </button>
        ) : null}
        <div><HuddleSlot /></div>
        <button className="icon-btn" aria-label="Conversation details"><I.MoreV /></button>
      </div>
      <div className="tabs">
        <button className="tab active"><I.Bubble />Messages</button>
        <button className="tab"><I.CanvasDoc />Canvas</button>
        <button className="tab"><I.Files />Files</button>
        <button className="tab" aria-label="Add a tab"><I.Plus /></button>
      </div>
      {channel?.bookmarks?.length ? (
        <div className="bookmarks">
          {channel.bookmarks.map((b) => (
            <button key={b.label} onClick={() => slack.ui.emit({ type: "action", kind: "bookmark", label: b.label })}>
              <span className="fav" style={{ background: b.color ?? "#1d1c1d" }}>{b.letter ?? b.label.charAt(0)}</span>
              {b.label}
            </button>
          ))}
        </div>
      ) : null}
      <ScrollToEnd className="messages" reset={key} watch={`${key}:${conv.messages.length}:${last?.id}:${slack.typing?.key ?? ""}`} label={`Messages in ${slack.label(key)}`}>
        {channel ? (
          <div className="intro">
            <h2># {channel.id}</h2>
            <p>This is the very beginning of the <b>#{channel.id}</b> channel. {(channel.topic ?? "").replace(/@\w+/g, "")}</p>
            <div className="actions">
              <button className="pill">✏️ Add description</button>
              <button className="pill">👤 Add coworkers</button>
            </div>
          </div>
        ) : dm ? (
          <div className="intro" style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar id={dm.id} style={{ width: 72, height: 72, borderRadius: 12, fontSize: 28, background: dm.color }} />
            <div>
              <h2 style={{ fontSize: 22 }}>{dm.name}</h2>
              <p>{dm.id === slack.me ? "This is your space. Draft messages, list your to-dos, or keep links and files handy." : "This conversation is just between you two. Say hi 👋"}</p>
            </div>
          </div>
        ) : null}
        <MessageList messages={conv.messages} newFrom={conv.newFrom} />
      </ScrollToEnd>
      <Composer />
    </main>
  );
}

function Toast() {
  const { slack } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!slack.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(t);
  }, [slack.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {slack.notice?.text ?? ""}
    </div>
  );
}
