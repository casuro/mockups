import { useEffect, useRef, useState } from "react";
import { useUI } from "./context";
import { DAYS, MONTHS, clock, dayOf, longDay, monthParts, nowIn, partsOf } from "./format";
import * as I from "./icons";

// "Select a Date & Time": the month, the time zone picker, and once a day is
// picked, its times. Picking a time turns it into the two-step time + Next.

export function Picker() {
  return (
    <div className="right">
      <h2>Select a Date &amp; Time</h2>
      <div className="picker">
        <Month />
        <Slots />
      </div>
    </div>
  );
}

function Month() {
  const { calendly } = useUI();
  const { state, today, ui } = calendly;
  const { year, month } = monthParts(state.month);
  const lead = partsOf(dayOf(year, month, 1)).weekday;
  const count = partsOf(dayOf(year, month + 1, 0)).date;
  const atStart = state.month <= today.slice(0, 7);

  return (
    <div className="cal">
      <div className="month">
        <button className="nav" aria-label="Previous month" disabled={atStart} onClick={() => ui.showMonth(-1)}>
          <I.ChevronLeft />
        </button>
        <div className="t">
          {MONTHS[month]} {year}
        </div>
        <button className="nav" aria-label="Next month" onClick={() => ui.showMonth(1)}>
          <I.ChevronRight />
        </button>
      </div>
      <div className="grid">
        {DAYS.map((d) => (
          <div key={d} className="dow">
            {d.slice(0, 3)}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = dayOf(year, month, i + 1);
          const open = calendly.slotsFor(day).length > 0;
          const cls = ["day", open && "av", day === state.day && "sel", day === today && "today"].filter(Boolean).join(" ");
          return open ? (
            <button key={day} className={cls} aria-label={longDay(day)} aria-pressed={day === state.day} onClick={() => ui.pickDay(day)}>
              {i + 1}
            </button>
          ) : (
            <div key={day} className={cls}>
              {i + 1}
            </div>
          );
        })}
      </div>
      <TimeZone />
    </div>
  );
}

function TimeZone() {
  const { calendly } = useUI();
  const { seed, zone, ui } = calendly;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Any click outside the picker, or Escape, closes the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="tz" ref={box}>
      <div className="lbl">Time zone</div>
      {open ? (
        <div className="tz-menu" role="listbox" aria-label="Time zone">
          <div className="h">Time zone</div>
          {seed.timeZones.map((z) => (
            <button
              key={z.id}
              className={`tz-opt${z.id === zone.id ? " on" : ""}`}
              role="option"
              aria-selected={z.id === zone.id}
              onClick={() => {
                setOpen(false);
                if (z.id !== zone.id) ui.setTimeZone(z.id);
              }}
            >
              <span>{z.label}</span>
              <span>{nowIn(z)}</span>
            </button>
          ))}
        </div>
      ) : null}
      <button className="tz-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <I.Globe />
        <span>{`${zone.label} (${nowIn(zone)})`}</span>
        <I.Caret />
      </button>
    </div>
  );
}

function Slots() {
  const { calendly } = useUI();
  const { state, ui } = calendly;
  const day = state.day;
  if (!day) return null;

  return (
    <div className="slots">
      <div className="dt">{longDay(day)}</div>
      <div className="slot-list">
        {calendly.slotsFor(day).map((time) => {
          const label = clock(calendly.localMinutes(day, time));
          return time === state.slot ? (
            <div key={time} className="slot-pair">
              <div className="time">{label}</div>
              <button className="go" aria-label={`Next: ${label}`} onClick={ui.next}>
                Next
              </button>
            </div>
          ) : (
            <button key={time} className="slot" onClick={() => ui.pickSlot(time)}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
