import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChannelView } from "./Channel";
import { ChatView } from "./Chat";
import { TeamsContext, useUI, type PickerTarget, type TeamsUI } from "./context";
import type { FormatContext } from "./format";
import { AppBar, ListPane, TitleBar } from "./Frame";
import { MeetingWindow, MiniWindow, Prejoin, ReactPop } from "./Meeting";
import type { TeamsMeetingState, TeamsMessage } from "./types";
import type { TeamsApp } from "./use-teams";
import { ActivityView, AppsView, CalendarView, CallsView, FilesView } from "./Views";
import "./teams.css";

// Microsoft Teams, as in apps/teams.html. Give it an app from useTeams(); it
// fills the box it is put in (give that box a height), whether that is the
// whole screen or one pane of it, and narrows to Teams' mobile layout when
// the box is narrow.

export interface TeamsProps {
  teams: TeamsApp;
  /** Draws a message's `custom` part: a form, an approval, anything the kit does not have. */
  renderCustom?: (message: TeamsMessage) => ReactNode;
  /** Draws what someone presents in a meeting; a design file on a canvas by default. */
  renderScreen?: (meeting: TeamsMeetingState) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const EMOJI = ["👍", "❤️", "😆", "😮", "😢", "😡", "🎉", "🙌", "👀", "🔥", "✅", "🚀", "💯", "🙏", "🤔", "👏", "☕", "🎯", "💡", "⭐", "😅", "🫡", "🥳", "📌"];

export function Teams({ teams, renderCustom, renderScreen, className, style }: TeamsProps) {
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [picker, setPicker] = useState<{ target: PickerTarget; left: number; top: number } | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [callView, setCallView] = useState<"full" | "mini">("full");
  const [panel, setPanel] = useState<"chat" | "people" | null>(null);
  const [prejoin, setPrejoin] = useState<string | null>(null);
  const [reactPop, setReactPop] = useState<{ left: number; top: number } | null>(null);
  const [seen] = useState(() => new Set(Object.values(teams.state.conversations).flatMap((c) => c.messages.flatMap((m) => [m.id, ...m.replies.map((r) => r.id)]))));
  const { state } = teams;

  // Starting or joining a meeting opens it full size, with no panel.
  const inCall = state.inCall;
  useEffect(() => {
    if (!inCall) return;
    setCallView("full");
    setPanel(null);
  }, [inCall]);
  if (reactPop && (!inCall || callView !== "full")) setReactPop(null);
  // A meeting that ended while its pre-join screen was up takes the screen with it.
  if (prejoin && !state.meetings[prejoin]) setPrejoin(null);

  // A new conversation empties the composer.
  const current = state.view === "chat" ? state.chat : state.view === "teams" ? state.channel : null;
  const opened = useRef(current);
  useEffect(() => {
    if (opened.current === current) return;
    opened.current = current;
    setDraft("");
  }, [current]);

  const openPicker = useCallback((anchor: HTMLElement, target: PickerTarget) => {
    const box = root.current?.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    if (!box) return;
    const w = 8 * 34 + 7 * 2 + 12;
    const h = 3 * 34 + 2 * 2 + 12;
    const left = Math.max(8, Math.min(r.right - box.left - w, box.width - w - 8));
    const top = r.top - box.top - h - 6 < 52 ? r.bottom - box.top + 6 : r.top - box.top - h - 6;
    setPicker({ target, left, top });
  }, []);

  const react = useCallback(
    (id: string, emoji: string) => {
      teams.ui.toggleReaction(id, emoji);
      setPopped(`${id}:${emoji}`);
    },
    [teams.ui]
  );

  const pick = (emoji: string) => {
    const target = picker?.target;
    setPicker(null);
    if (!target) return;
    if (target.kind === "composer") {
      setDraft((d) => d + emoji);
      composer.current?.focus();
    } else react(target.id, emoji);
  };

  const openPrejoin = useCallback(
    (id: string) => {
      if (teams.state.inCall === id) setCallView("full");
      else setPrejoin(id);
    },
    [teams.state.inCall]
  );

  // Teams' shortcuts: ⌘E search, ⌘⇧M mute in a meeting, Esc closes the top-most thing (a full meeting shrinks).
  const escape = useRef<(e: KeyboardEvent) => void>(() => {});
  escape.current = (e) => {
    if (picker) setPicker(null);
    else if (reactPop) setReactPop(null);
    else if (prejoin) setPrejoin(null);
    else if (inCall && callView === "full" && !(e.target as HTMLElement | null)?.closest?.("input")) setCallView("mini");
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        search.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m" && inCall) {
        e.preventDefault();
        teams.ui.meetingControl("mic");
      }
      if (e.key === "Escape") escape.current(e);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [inCall, teams.ui]);

  const fmt = useMemo<FormatContext>(
    () => ({ people: teams.people, me: teams.me, onLink: (url) => teams.ui.emit({ type: "action", kind: "link", label: url }) }),
    [teams.people, teams.me, teams.ui]
  );

  const ui: TeamsUI = {
    teams,
    fmt,
    root,
    renderCustom,
    renderScreen,
    openPicker,
    popped,
    react,
    seen,
    composer,
    draft,
    setDraft,
    callView,
    setCallView,
    panel,
    setPanel,
    openPrejoin,
    reactPop,
    setReactPop,
  };

  return (
    <TeamsContext.Provider value={ui}>
      <div
        ref={root}
        className={`kit-teams${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          if (picker && !t.closest(".emoji-pop")) setPicker(null);
          if (reactPop && !t.closest(".react-pop, [data-react-button]")) setReactPop(null);
        }}
      >
        <div className="shell">
          <TitleBar search={search} />
          <div className={`main-grid${state.detail ? " detail" : ""}`}>
            <AppBar />
            <ListPane />
            <main className="content">
              <Content />
            </main>
          </div>
        </div>
        {inCall && callView === "full" ? <MeetingWindow /> : null}
        {reactPop ? <ReactPop left={reactPop.left} top={reactPop.top} /> : null}
        {prejoin ? <Prejoin id={prejoin} close={() => setPrejoin(null)} /> : null}
        {inCall && callView === "mini" ? <MiniWindow /> : null}
        {picker ? (
          <div className="emoji-pop show" style={{ left: picker.left, top: picker.top }}>
            {EMOJI.map((e) => (
              <button key={e} aria-label={e} onClick={() => pick(e)}>{e}</button>
            ))}
          </div>
        ) : null}
        <Toast />
      </div>
    </TeamsContext.Provider>
  );
}

function Content() {
  const { teams } = useUI();
  switch (teams.state.view) {
    case "chat":
      return teams.state.chat ? <ChatView key={teams.state.chat} id={teams.state.chat} /> : <ActivityView />;
    case "teams":
      return teams.state.channel ? <ChannelView key={teams.state.channel} id={teams.state.channel} /> : <ActivityView />;
    case "calendar":
      return <CalendarView />;
    case "calls":
      return <CallsView />;
    case "onedrive":
      return <FilesView />;
    case "apps":
      return <AppsView />;
    default:
      return <ActivityView />;
  }
}

function Toast() {
  const { teams } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!teams.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2000);
    return () => clearTimeout(t);
  }, [teams.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {teams.notice?.text ?? ""}
    </div>
  );
}
