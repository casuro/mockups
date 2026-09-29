import type { CSSProperties } from "react";
import { useUI } from "./context";
import { addDays, fmtH, MONTHS, monday, parseDay, toHours, ymd } from "./format";

// The month view: a week per row, up to three entries a day, "N more".

export function MonthView({ onPick }: { onPick: (id: string) => void }) {
  const { calendar } = useUI();
  const { state, ui, now, seed } = calendar;
  const a = parseDay(state.anchor);
  const first = new Date(a.getFullYear(), a.getMonth(), 1);
  const gs = monday(first);
  const today = ymd(now);
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate()) / 7);
  const colorOf = (c: string, color?: string) => color ?? seed.calendars.find((x) => x.id === c)?.color ?? "#039be5";
  const rank = (e: { allDay?: boolean; start?: string }) => (e.allDay ? -1 : toHours(e.start));

  return (
    <div className="month">
      <div className="m-dow">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => <span key={x}>{x}</span>)}
      </div>
      <div className="m-grid">
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const d = addDays(gs, i);
          const k = ymd(d);
          const evs = state.entries.filter((e) => e.date === k && state.visible[e.calendar]).sort((x, y) => rank(x) - rank(y));
          return (
            <div key={k} className={["m-cell", d.getMonth() !== a.getMonth() && "out", k === today && "today"].filter(Boolean).join(" ")}>
              <button className="dn" onClick={() => ui.navigate(k, "day")}>
                {d.getDate() === 1 ? `${MONTHS[d.getMonth()].slice(0, 3)} 1` : d.getDate()}
              </button>
              {evs.slice(0, 3).map((e) => {
                const style = { "--c": colorOf(e.calendar, e.color) } as CSSProperties;
                return e.allDay ? (
                  <button key={e.id} className="m-ev fill" style={style} data-ev={e.id} onClick={() => onPick(e.id)}>
                    <span>{e.title}</span>
                  </button>
                ) : (
                  <button key={e.id} className="m-ev" style={style} data-ev={e.id} onClick={() => onPick(e.id)}>
                    <i />
                    <em>{fmtH(toHours(e.start))}</em>
                    <span>{e.title}</span>
                  </button>
                );
              })}
              {evs.length > 3 ? <div className="m-more">{evs.length - 3} more</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
