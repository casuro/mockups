import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Avatar, useUI } from "./context";
import { dateLabel, fmtRange, fromHours, toHours } from "./format";
import * as I from "./icons";
import type { Rsvp } from "./types";

// What floats over the calendar: an event's popover (Join with Meet,
// guests and their answers, Going?, delete), the quick-create popover, and
// the Day / Week / Month menu. Each is placed next to what opened it,
// inside the calendar's own box.

/** Beside the anchor, flipping to its left when there is no room; like the mockup's place(). */
function usePlace(pop: RefObject<HTMLDivElement | null>, anchor: () => DOMRect | null, deps: unknown[]) {
  const { root } = useUI();
  useLayoutEffect(() => {
    const el = pop.current;
    const box = root.current?.getBoundingClientRect();
    if (!el || !box) return;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const W = box.width;
    const H = box.height;
    const r = anchor() ?? new DOMRect(W / 2, H / 3, 0, 0);
    let x = r.right + 8 + pw <= W - 8 ? r.right + 8 : r.left - pw - 8;
    if (x < 8) x = Math.max(8, (W - pw) / 2);
    const y = Math.min(Math.max(8, r.top - 40), H - ph - 8);
    el.style.left = `${x}px`;
    el.style.top = `${Math.max(8, y)}px`;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** An element's box relative to the root. */
export function relRect(root: HTMLElement | null, el: Element | null) {
  if (!root || !el) return null;
  const b = root.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return new DOMRect(r.left - b.left, r.top - b.top, r.width, r.height);
}

const RSVP_MARK: Record<Rsvp, ReactNode> = { yes: <I.Tick />, no: "×", maybe: "?", awaiting: "?" };

export function EventPopover() {
  const { calendar, root, renderDetails } = useUI();
  const { state, ui, people, me, seed, primary } = calendar;
  const e = state.entries.find((x) => x.id === state.selected);
  const pop = useRef<HTMLDivElement>(null);
  usePlace(pop, () => relRect(root.current, root.current?.querySelector(`[data-ev="${CSS.escape(state.selected ?? "")}"]`) ?? null), [e, state.view, state.anchor]);
  if (!e) return null;

  const cal = seed.calendars.find((c) => c.id === e.calendar);
  const own = e.calendar === primary;
  const s = toHours(e.start);
  const end = toHours(e.end, s + 1);
  const when = e.allDay ? dateLabel(e.date) : `${dateLabel(e.date)} · ${fmtRange(s, end)}`;
  const counts = { yes: 0, no: 0, maybe: 0, awaiting: 0 };
  e.guests.forEach((g) => counts[g.rsvp]++);
  const summary = (["yes", "no", "maybe", "awaiting"] as const).filter((k) => counts[k]).map((k) => `${counts[k]} ${k}`).join(", ");
  const mine = e.guests.find((g) => g.person === me)?.rsvp;
  const custom = e.custom && renderDetails ? renderDetails(e) : null;

  return (
    <div className="pop" ref={pop} role="dialog" aria-label={e.title}>
      <div className="pop-tools">
        {own ? (
          <>
            <button className="icon-btn" aria-label="Edit event"><I.Edit /></button>
            <button className="icon-btn" aria-label="Delete event" onClick={() => ui.remove(e.id)}><I.Trash /></button>
          </>
        ) : null}
        {e.guests.length ? <button className="icon-btn" aria-label="Email guests"><I.Mail /></button> : null}
        <button className="icon-btn" aria-label="Options"><I.More /></button>
        <button className="icon-btn" aria-label="Close" onClick={() => calendar.open(null)}><I.Close /></button>
      </div>
      <div className="prow">
        <span><i className="swatch" style={{ "--c": e.color ?? cal?.color } as CSSProperties} /></span>
        <div>
          <h2>{e.title}</h2>
          <div className="sub">
            {when}
            {e.recurrence ? <small>{e.recurrence}</small> : null}
          </div>
        </div>
      </div>
      {e.focus ? (
        <div className="prow">
          <span><I.Headset /></span>
          <div className="sub">Focus time · Do not disturb<small>Declining new invitations during this time</small></div>
        </div>
      ) : null}
      {e.meet ? (
        <div className="prow">
          <span />
          <div>
            <button className="meet-btn" onClick={() => ui.join(e.id)}><I.MeetLogo />Join with Google Meet</button>
            <span className="meet-link">meet.google.com/{e.meet}</span>
          </div>
        </div>
      ) : null}
      {e.location ? (
        <div className="prow">
          <span><I.Pin /></span>
          <div className="sub">{e.location}</div>
        </div>
      ) : null}
      {e.guests.length ? (
        <div className="prow">
          <span><I.People /></span>
          <div>
            <div className="sub" style={{ color: "var(--text)" }}>
              {e.guests.length} guests<small>{summary}</small>
            </div>
            {e.guests.map((g, i) => {
              const p = g.person ? people[g.person] : undefined;
              return (
                <div key={g.person ?? g.email ?? i} className="guest">
                  <span className="g-ava">
                    <Avatar id={p?.id} email={g.email} />
                    <i className={`rsvp ${g.rsvp}`}>{RSVP_MARK[g.rsvp]}</i>
                  </span>
                  <div>
                    {p?.name ?? g.email}
                    {p?.id === me ? " (you)" : ""}
                    {g.organizer ? <small>Organizer</small> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {e.description ? (
        <div className="prow">
          <span><I.Notes /></span>
          <div className="desc">{e.description}</div>
        </div>
      ) : null}
      {custom ? (
        <div className="prow">
          <span />
          <div>{custom}</div>
        </div>
      ) : null}
      {!e.allDay && own ? (
        <div className="prow">
          <span><I.Bell /></span>
          <div className="sub">10 minutes before</div>
        </div>
      ) : null}
      <div className="prow">
        <span><I.Cal /></span>
        <div className="sub">{cal?.name ?? e.calendar}</div>
      </div>
      {mine ? (
        <div className="going">
          <span>Going?</span>
          {(["yes", "no", "maybe"] as const).map((r) => (
            <button key={r} className={`rsvp-btn${mine === r ? " on" : ""}`} aria-pressed={mine === r} onClick={() => ui.answer(e.id, r)}>
              {r[0].toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function QuickCreate() {
  const { calendar, draft, setDraft } = useUI();
  const { seed, primary, ui } = calendar;
  const pop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  usePlace(pop, () => draft?.anchor ?? null, [draft?.anchor]);
  useLayoutEffect(() => input.current?.focus({ preventScroll: true }), [draft?.anchor]);
  if (!draft) return null;

  const save = () => {
    ui.create({ title: draft.title.trim() || "(No title)", date: draft.date, start: fromHours(draft.s), end: fromHours(draft.s + 1) });
    setDraft(null);
  };

  return (
    <div className="pop quick" ref={pop} role="dialog" aria-label="New event">
      <div className="pop-tools">
        <button className="icon-btn" aria-label="Close" onClick={() => setDraft(null)}><I.Close /></button>
      </div>
      <input
        ref={input}
        className="title"
        placeholder="Add title"
        aria-label="Add title"
        autoComplete="off"
        value={draft.title}
        onChange={(e) => {
          const title = e.currentTarget.value;
          setDraft((d) => (d ? { ...d, title } : d));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
      />
      <div className="qtabs"><span className="on">Event</span><span>Task</span><span>Appointment schedule</span></div>
      <div className="prow">
        <span><I.Clock /></span>
        <div className="sub">{dateLabel(draft.date)} · {fmtRange(draft.s, draft.s + 1)}<small>Time zone · Does not repeat</small></div>
      </div>
      <div className="prow">
        <span><I.People /></span>
        <div className="sub">Add guests</div>
      </div>
      <div className="prow">
        <span><I.Cal /></span>
        <div className="sub">{seed.calendars.find((c) => c.id === primary)?.name}<small>Busy · Default visibility · Notify 10 minutes before</small></div>
      </div>
      <div className="q-actions">
        <button className="text-btn">More options</button>
        <button className="fill-btn" onClick={save}>Save</button>
      </div>
    </div>
  );
}

export function ViewMenu({ anchor, onClose }: { anchor: DOMRect; onClose: () => void }) {
  const { calendar, narrow, root } = useUI();
  const { state, ui } = calendar;
  const menu = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = menu.current;
    const W = root.current?.getBoundingClientRect().width ?? 0;
    if (!el) return;
    el.style.top = `${anchor.bottom + 4}px`;
    el.style.left = `${Math.min(anchor.left, W - el.offsetWidth - 8)}px`;
  }, [anchor, root]);
  const views = [
    ["day", "Day", "D"],
    ["week", narrow ? "3 days" : "Week", "W"],
    ["month", "Month", "M"],
  ] as const;
  return (
    <div className="menu" ref={menu} role="menu">
      {views.map(([v, label, key]) => (
        <button
          key={v}
          role="menuitemradio"
          aria-checked={state.view === v}
          className={state.view === v ? "on" : undefined}
          onClick={() => {
            ui.setView(v);
            onClose();
          }}
        >
          {label}
          <kbd>{key}</kbd>
        </button>
      ))}
    </div>
  );
}
