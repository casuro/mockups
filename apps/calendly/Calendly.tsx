import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Confirmation } from "./Confirmation";
import { CalendlyContext, useUI, type CalendlyUI } from "./context";
import { Details } from "./Details";
import { HostPanel } from "./HostPanel";
import { Picker } from "./Picker";
import type { CalendlyPage } from "./use-calendly";
import "./calendly.css";

// Calendly's booking page, as in apps/calendly.html. Give it a page from
// useCalendly(); it fills the box it is put in (give that box a height) and
// scrolls inside it, whether that is the whole screen or one pane of it, and
// switches to the phone layout when the box is narrow.

export interface CalendlyProps {
  calendly: CalendlyPage;
  className?: string;
  style?: CSSProperties;
}

export function Calendly({ calendly, className, style }: CalendlyProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const idPrefix = `cal${useId().replace(/:/g, "")}-`;
  const { state } = calendly;

  // A new step starts at the top.
  const step = useRef(state.step);
  useEffect(() => {
    if (step.current === state.step) return;
    step.current = state.step;
    scroller.current?.scrollTo(0, 0);
  }, [state.step]);

  const ui: CalendlyUI = { calendly, scroller, idPrefix };
  const card = ["card", state.day && state.step === "calendar" && "wide", state.step === "done" && "fin"].filter(Boolean).join(" ");

  return (
    <CalendlyContext.Provider value={ui}>
      <div className={`kit-calendly${className ? ` ${className}` : ""}`} style={style} data-theme={state.theme}>
        <div className="scroller" ref={scroller}>
          <div className="page">
            <div className={card}>
              {state.step === "done" ? (
                <Confirmation />
              ) : (
                <>
                  <HostPanel />
                  {state.step === "details" ? <Details /> : <Picker />}
                </>
              )}
              <Chrome />
            </div>
          </div>
        </div>
        <Toast />
      </div>
    </CalendlyContext.Provider>
  );
}

/** Cookie settings, bottom left, and the Powered by Calendly ribbon, top right. */
function Chrome() {
  const { emit } = useUI().calendly.ui;
  const go = (link: "cookies" | "powered-by") => (e: { preventDefault(): void }) => {
    e.preventDefault();
    emit({ type: "link", link });
  };
  return (
    <>
      <a className="cookie" href="#" onClick={go("cookies")}>
        Cookie settings
      </a>
      <div className="ribbon">
        <a href="#" onClick={go("powered-by")}>
          <span className="s">Powered by</span>
          <span className="b">Calendly</span>
        </a>
      </div>
    </>
  );
}

function Toast() {
  const { notice } = useUI().calendly;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!notice) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(t);
  }, [notice]);
  // The text stays while it fades out.
  return (
    <div className={`toast${shown ? " show" : ""}`} role="status" aria-live="polite">
      {notice?.text ?? ""}
    </div>
  );
}
