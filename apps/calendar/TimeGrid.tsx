import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { useUI } from "./context";
import { addDays, DOW, fmtH, fmtRange, gmtLabel, toHours, ymd } from "./format";
import * as I from "./icons";
import type { CalendarEntry } from "./types";
import { daysOnScreen } from "./use-google-calendar";

// The day and week views: the day headings, the all-day row, the hours,
// the columns of events (overlaps side by side, the past dimmed), the red
// current-time line, and the ghost of an event being made.

interface Timed {
  e: CalendarEntry;
  s: number;
  end: number;
  i: number;
  n: number;
}

/** Overlapping events side by side: greedy columns per cluster of overlaps. */
function layout(entries: CalendarEntry[]): Timed[] {
  const evs = entries
    .map((e) => {
      const s = toHours(e.start);
      return { e, s, end: toHours(e.end, s + 1) };
    })
    .sort((x, y) => x.s - y.s || y.end - x.end);
  const out: Timed[] = [];
  let cluster: Timed[] = [];
  let cols: number[] = [];
  let end = -1;
  const flush = () => {
    cluster.forEach((c) => (c.n = cols.length));
    out.push(...cluster);
    cluster = [];
    cols = [];
  };
  for (const ev of evs) {
    if (ev.s >= end && cluster.length) flush();
    let i = cols.findIndex((c) => c <= ev.s);
    if (i < 0) {
      i = cols.length;
      cols.push(0);
    }
    cols[i] = ev.end;
    cluster.push({ ...ev, i, n: 0 });
    end = Math.max(end, ev.end);
  }
  if (cluster.length) flush();
  return out;
}

const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function TimeGrid({ onPick, onSlot }: { onPick: (id: string) => void; onSlot: (date: string, s: number, col: HTMLElement) => void }) {
  const { calendar, narrow, draft, scrollTop } = useUI();
  const { state, ui, now, seed } = calendar;
  const [start, n] = daysOnScreen(state.view, state.anchor, narrow);
  const days = Array.from({ length: n }, (_, i) => addDays(start, i));
  const today = ymd(now);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const colorOf = (e: CalendarEntry) => e.color ?? seed.calendars.find((c) => c.id === e.calendar)?.color ?? "#039be5";
  const shown = state.entries.filter((e) => state.visible[e.calendar]);

  // The hours open at 7:30am; after that they stay where they were left.
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scrollTop.current;
  }, [scrollTop]);

  return (
    <>
      <div className={`cols-head${n === 1 ? " one" : ""}`} style={vars({ "--n": n })}>
        <div className="tz">{gmtLabel(now)}</div>
        {days.map((d) => {
          const k = ymd(d);
          return (
            <div key={k} className={`dayhead${k === today ? " today" : ""}`}>
              <div className="dw">{DOW[d.getDay()]}</div>
              <button className="dn" onClick={() => ui.navigate(k, "day")}>{d.getDate()}</button>
            </div>
          );
        })}
      </div>
      <div className="allday" style={vars({ "--n": n })}>
        <div />
        {days.map((d) => {
          const k = ymd(d);
          return (
            <div key={k}>
              {shown.filter((e) => e.allDay && e.date === k).map((e) => (
                <button key={e.id} className={`ad-ev${e.task ? " task" : ""}`} style={vars({ "--c": colorOf(e) })} data-ev={e.id} onClick={() => onPick(e.id)}>
                  {e.task ? <I.Task /> : null}
                  {e.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="scroller" ref={scroller} onScroll={(e) => (scrollTop.current = e.currentTarget.scrollTop)}>
        <div className="grid" style={vars({ "--n": n })}>
          <div className="hours">
            {Array.from({ length: 23 }, (_, i) => (
              <span key={i} style={{ top: `calc(var(--hour) * ${i + 1})` }}>
                {fmtH(i + 1).replace(/(\d+)(am|pm)/, "$1 $2").toUpperCase()}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const k = ymd(d);
            const evs = layout(shown.filter((e) => !e.allDay && e.date === k));
            return (
              <div
                key={k}
                className="col"
                onClick={(ev) => {
                  if ((ev.target as HTMLElement).closest(".ev")) return;
                  const r = ev.currentTarget.getBoundingClientRect();
                  const hour = parseFloat(getComputedStyle(ev.currentTarget).getPropertyValue("--hour")) || 48;
                  onSlot(k, Math.min(23, Math.floor(((ev.clientY - r.top) / hour) * 2) / 2), ev.currentTarget);
                }}
              >
                {evs.map(({ e, s, end, i, n: cols }) => {
                  const dur = end - s;
                  const short = dur <= 0.5;
                  const past = k < today || (k === today && end <= nowH);
                  const w = 100 / cols;
                  const left = i * w;
                  const width = i === cols - 1 ? w : w * 1.7;
                  const cls = ["ev", short && "short", dur <= 0.25 && "tiny", past && "past", state.selected === e.id && "sel"].filter(Boolean).join(" ");
                  return (
                    <button
                      key={e.id}
                      className={cls}
                      data-ev={e.id}
                      onClick={() => onPick(e.id)}
                      style={vars({
                        "--c": colorOf(e),
                        top: `calc(var(--hour) * ${s})`,
                        height: `calc(var(--hour) * ${dur} - 1px)`,
                        left: `${left}%`,
                        width: `calc(${Math.min(width, 100 - left)}% - 8px)`,
                        zIndex: i + 1,
                      })}
                    >
                      <b>{e.title}{short ? "," : ""}</b>
                      <span>{fmtRange(s, end)}</span>
                      {!short && dur >= 1 && e.location ? <span>{e.location}</span> : null}
                    </button>
                  );
                })}
                {draft?.ghost && draft.date === k ? (
                  <div className="ghost" style={{ top: `calc(var(--hour) * ${draft.s})`, height: "calc(var(--hour) - 1px)" }}>
                    <b style={{ fontWeight: 500 }}>{draft.title || "(No title)"}</b>
                    <br />
                    {fmtRange(draft.s, draft.s + 1)}
                  </div>
                ) : null}
                {k === today ? <div className="now" style={{ top: `calc(var(--hour) * ${nowH})` }} /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
