import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarContext, useUI, type CalendarUI, type Draft } from "./context";
import { ymd } from "./format";
import { Header } from "./Header";
import { MonthView } from "./MonthView";
import { EventPopover, QuickCreate, relRect, ViewMenu } from "./Popovers";
import { SidePanel } from "./SidePanel";
import { TimeGrid } from "./TimeGrid";
import type { CalendarEntry } from "./types";
import type { GoogleCalendarApp } from "./use-google-calendar";
import "./calendar.css";

// Google Calendar, as in apps/calendar.html. Give it a calendar from
// useGoogleCalendar(); it fills the box it is put in (give that box a
// height), whether that is the whole screen or one pane of it, and narrows
// to the phone layout (three days, the side panel as a drawer) when the
// box is narrow.

export interface GoogleCalendarProps {
  calendar: GoogleCalendarApp;
  /** Draws an entry's `custom` part in its popover: an agenda, attachments, anything the kit does not have. */
  renderDetails?: (entry: CalendarEntry) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const NARROW = 760;
const HOUR = 48;

export function GoogleCalendar({ calendar, renderDetails, className, style }: GoogleCalendarProps) {
  const root = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [side, setSide] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const scrollTop = useRef(HOUR * 7.5);
  const { state, ui, now } = calendar;

  // Narrow is the box, not the window, so it also works as one pane. Crossing the line closes what floats.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => setNarrow(el.getBoundingClientRect().width <= NARROW);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const wasNarrow = useRef(narrow);
  useEffect(() => {
    if (wasNarrow.current === narrow) return;
    wasNarrow.current = narrow;
    setDrawer(false);
    setDraft(null);
    calendar.open(null);
  }, [narrow, calendar.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const closePop = useCallback(() => {
    setDraft(null);
    calendar.open(null);
  }, [calendar.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => {
    setDraft(null);
    ui.select(id);
  };

  // Clicking an empty slot: a ghost event there and the quick-create popover beside it.
  const slot = (date: string, s: number, col: HTMLElement) => {
    const r = relRect(root.current, col);
    calendar.open(null);
    setDraft({ date, s, title: "", ghost: true, anchor: r ? new DOMRect(r.left, r.top + s * HOUR, r.width - 8, HOUR) : null });
  };

  // Create: today in the week view, the next hour.
  const create = (button: HTMLElement) => {
    const anchor = relRect(root.current, button);
    const today = ymd(now);
    if (state.anchor !== today || state.view === "month") ui.navigate(today, state.view === "month" ? "week" : undefined);
    setDrawer(false);
    calendar.open(null);
    setDraft({ date: today, s: Math.min(22, now.getHours() + 1), title: "", ghost: false, anchor });
  };

  // Shortcuts, as in Calendar: D, W, M switch the view, T goes to today, Esc closes what floats.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (e.key === "Escape") {
      closePop();
      setMenu(null);
      return;
    }
    const t = e.target as HTMLElement | null;
    if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]")) return;
    const view = ({ d: "day", w: "week", m: "month" } as const)[e.key as "d" | "w" | "m"];
    if (view) ui.setView(view);
    if (e.key === "t") ui.step(0, narrow);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const shared: CalendarUI = {
    calendar,
    root,
    narrow,
    renderDetails,
    draft,
    setDraft,
    toggleSide: () => (narrow ? setDrawer((d) => !d) : setSide((s) => !s)),
    closeDrawer: () => setDrawer(false),
    openViews: (anchor) => setMenu(relRect(root.current, anchor)),
    scrollTop,
  };

  const popOpen = !!draft || !!state.selected;
  const appClass = ["app", !side && "side-closed", drawer && "drawer"].filter(Boolean).join(" ");

  return (
    <CalendarContext.Provider value={shared}>
      <div
        ref={root}
        className={`kit-calendar${className ? ` ${className}` : ""}`}
        style={style}
        data-theme={state.theme}
        onClickCapture={(e) => {
          // A click outside what floats only closes it, as in the mockup; an event still opens its own popover.
          const t = e.target as HTMLElement;
          if (menu && !t.closest(".menu")) {
            setMenu(null);
            e.stopPropagation();
            return;
          }
          if (popOpen && !t.closest(".pop") && !t.closest("[data-ev]")) {
            closePop();
            e.stopPropagation();
          }
        }}
      >
        <div className={appClass}>
          <Header />
          <div className="body">
            <SidePanel onCreate={create} />
            <div className="scrim" onClick={() => setDrawer(false)} />
            <main className="main">{state.view === "month" ? <MonthView onPick={pick} /> : <TimeGrid onPick={pick} onSlot={slot} />}</main>
          </div>
        </div>
        {draft ? <QuickCreate /> : state.selected ? <EventPopover /> : null}
        {menu ? <ViewMenu anchor={menu} onClose={() => setMenu(null)} /> : null}
        <Toast />
      </div>
    </CalendarContext.Provider>
  );
}

function Toast() {
  const { calendar } = useUI();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!calendar.notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 4000);
    return () => clearTimeout(t);
  }, [calendar.notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {calendar.notice?.text ?? ""}
    </div>
  );
}
