import { useEffect, useRef, type ReactNode } from "react";
import { useUI } from "./context";

// "Enter Details": name, email, guests behind Add Guests, the event's
// questions, and Schedule Event. Errors show under their field, and the
// first one takes the cursor.

export function Details() {
  const { calendly, scroller, idPrefix } = useUI();
  const { state, questions, ui } = calendly;
  const { form, errors } = state;

  // Add Guests puts the cursor in the field it opens (not when the page opens with it shown).
  const shown = useRef(state.showGuests);
  useEffect(() => {
    if (state.showGuests && !shown.current) document.getElementById(`${idPrefix}guests`)?.focus();
    shown.current = state.showGuests;
  }, [state.showGuests, idPrefix]);

  const field = (key: string, label: string, value: string, input: "text" | "email" | "textarea", extra?: ReactNode) => {
    const id = `${idPrefix}${key}`;
    const onChange = (e: { target: { value: string } }) => ui.setField(key, e.target.value);
    return (
      <div key={key} className={`field${errors[key] ? " err" : ""}`}>
        <label htmlFor={id}>{label}</label>
        {input === "textarea" ? (
          <textarea id={id} value={value} onChange={onChange} aria-invalid={!!errors[key]} />
        ) : (
          <input id={id} type={input} value={value} onChange={onChange} autoComplete={key === "name" ? "name" : "email"} aria-invalid={!!errors[key]} />
        )}
        {errors[key] ? <div className="msg">{errors[key]}</div> : null}
        {extra}
      </div>
    );
  };

  const link = (kind: "terms" | "privacy", text: string) => (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        ui.emit({ type: "link", link: kind });
      }}
    >
      {text}
    </a>
  );

  return (
    <div className="right">
      <h2>Enter Details</h2>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const errs = ui.submit();
          scroller.current?.scrollTo(0, 0);
          const order = ["name", "email", "guests", ...questions.map((q) => q.id)];
          const first = order.find((k) => errs[k]);
          if (first) document.getElementById(`${idPrefix}${first}`)?.focus({ preventScroll: true });
        }}
      >
        {field("name", "Name *", form.name, "text")}
        {field("email", "Email *", form.email, "email")}
        {state.showGuests ? (
          field("guests", "Guest Email(s)", form.guests, "text", <div className="hint">Notify up to 10 additional guests of the scheduled event.</div>)
        ) : (
          <button type="button" className="guests-btn" onClick={ui.addGuests}>
            Add Guests
          </button>
        )}
        {questions.map((q) => field(q.id, q.required ? `${q.label} *` : q.label, form.answers[q.id] ?? "", q.multiline ? "textarea" : "text"))}
        <p className="legal">
          By proceeding, you confirm that you have read and agree to {link("terms", "Calendly's Terms of Use")} and {link("privacy", "Privacy Notice")}.
        </p>
        <button type="submit" className="primary">
          Schedule Event
        </button>
      </form>
    </div>
  );
}
