import type { CSSProperties } from "react";
import { useUI } from "./context";
import { addDays, MONTHS, monday, parseDay, ymd } from "./format";
import * as I from "./icons";
import { daysOnScreen } from "./use-google-calendar";

// The panel on the left: Create, the mini month, "Search for people", and
// the calendars with their checkboxes. A drawer when the box is narrow.

export function SidePanel({ onCreate }: { onCreate: (anchor: HTMLElement) => void }) {
  const { calendar, narrow, closeDrawer } = useUI();
  const { state, ui, seed, now } = calendar;
  const a = parseDay(state.anchor);
  const gridStart = monday(new Date(a.getFullYear(), a.getMonth(), 1));
  const [ws, n] = daysOnScreen(state.view, state.anchor, narrow);
  const from = ymd(ws);
  const to = ymd(addDays(ws, n - 1));
  const today = ymd(now);
  const month = (dir: -1 | 1) => ui.navigate(ymd(new Date(a.getFullYear(), a.getMonth() + dir, 1)));

  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const groups = [
    ["mine", "My calendars"],
    ["other", "Other calendars"],
  ] as const;

  return (
    <aside className="side">
      <button className="create" onClick={(e) => onCreate(e.currentTarget)}>
        <I.Plus />
        Create
        <I.Caret className="caret" />
      </button>
      <div className="mini">
        <div className="mini-head">
          <b>{MONTHS[a.getMonth()]} {a.getFullYear()}</b>
          <span>
            <button className="icon-btn" aria-label="Previous month" onClick={() => month(-1)}><I.Left /></button>
            <button className="icon-btn" aria-label="Next month" onClick={() => month(1)}><I.Right /></button>
          </span>
        </div>
        <div className="mini-grid">
          {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <span key={i} className="dow">{x}</span>)}
          {days.map((d) => {
            const k = ymd(d);
            const cls = [d.getMonth() !== a.getMonth() && "out", k === today && "today", state.view !== "month" && k >= from && k <= to && "inweek"].filter(Boolean).join(" ");
            return (
              <button
                key={k}
                className={cls || undefined}
                onClick={() => {
                  closeDrawer();
                  ui.navigate(k);
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
      <label className="meet-with">
        <I.People />
        <input placeholder="Search for people" />
      </label>
      {groups.map(([group, title]) => {
        const cals = seed.calendars.filter((c) => (c.group ?? "mine") === group);
        if (!cals.length) return null;
        return (
          <div key={group} className="cal-group">
            <h3>{title}<span><I.Caret /></span></h3>
            {cals.map((c) => (
              <button
                key={c.id}
                className={`cal-item${state.visible[c.id] ? " on" : ""}`}
                style={{ "--c": c.color } as CSSProperties}
                role="checkbox"
                aria-checked={!!state.visible[c.id]}
                onClick={() => ui.toggleCalendar(c.id)}
              >
                <span className="check"><I.Check /></span>
                {c.name}
              </button>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
