import { Avatar, useUI } from "./context";
import { parseDay, periodLabel } from "./format";
import * as I from "./icons";
import { daysOnScreen } from "./use-google-calendar";

// The bar across the top: the menu, the logo, Today and the arrows, the
// period on screen, and the view switch.

export function Header() {
  const { calendar, narrow, toggleSide, openViews } = useUI();
  const { state, ui, me, people } = calendar;
  const [start, n] = daysOnScreen(state.view, state.anchor, narrow);
  const period = periodLabel(start, n, state.view, parseDay(state.anchor), narrow);
  const viewName = state.view === "week" && narrow ? "3 days" : state.view[0].toUpperCase() + state.view.slice(1);

  return (
    <header className="header">
      <button className="icon-btn" aria-label="Main menu" onClick={toggleSide}><I.Menu /></button>
      <div className="brand"><I.CalendarLogo /><span>Calendar</span></div>
      <button className="outline-btn" onClick={() => ui.step(0, narrow)}>Today</button>
      <button className="icon-btn step" aria-label="Previous" onClick={() => ui.step(-1, narrow)}><I.Left /></button>
      <button className="icon-btn step" aria-label="Next" onClick={() => ui.step(1, narrow)}><I.Right /></button>
      <h1 className="period">{period}</h1>
      <div className="spacer" />
      <button className="icon-btn" aria-label="Search"><I.Search /></button>
      <button className="icon-btn support" aria-label="Support"><I.Help /></button>
      <button className="icon-btn settings" aria-label="Settings"><I.Gear /></button>
      <button className="view-btn" aria-haspopup="menu" onClick={(e) => openViews(e.currentTarget)}>
        {viewName}
        <I.Caret />
      </button>
      <button className="avatar-btn" aria-label={`Google Account: ${people[me].name}`}>
        <Avatar id={me} className="avatar" />
      </button>
    </header>
  );
}
