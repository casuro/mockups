import { useState } from "react";
import { IconButton, useUI } from "./context";
import * as I from "./icons";

// The strip of Google apps on the right edge (Calendar, Keep, Tasks) and
// the panel each one opens next to the mail.

const APPS = [
  ["calendar", "Calendar", I.CalendarLogo],
  ["keep", "Keep", I.KeepLogo],
  ["tasks", "Tasks", I.TasksLogo],
] as const;

export function SideStrip() {
  const { gmail } = useUI();
  const side = gmail.state.side;
  return (
    <aside className="side" aria-label="Side panel">
      {APPS.map(([id, name, Logo]) => (
        <button key={id} className={`side-app${side === id ? " active" : ""}`} title={name} aria-label={name} aria-pressed={side === id} onClick={() => gmail.ui.set("side", side === id ? null : id)}>
          <Logo />
        </button>
      ))}
      <span className="side-sep" />
      <button className="side-app" title="Get add-ons" aria-label="Get add-ons" onClick={() => gmail.toast("Get add-ons")}>
        <I.Plus style={{ color: "var(--text-2)" }} />
      </button>
    </aside>
  );
}

export function SidePanel() {
  const { gmail } = useUI();
  const { state, seed, ui } = gmail;
  const [task, setTask] = useState("");
  const side = state.side;
  if (!side) return null;
  const title = APPS.find(([id]) => id === side)![1];
  return (
    <aside className="sidepanel" aria-label={title}>
      <div className="sp-head">
        <b>{title}</b>
        <IconButton className="icon-btn sm" tip="Close" onClick={() => ui.set("side", null)}><I.Close /></IconButton>
      </div>
      <div className="sp-body">
        {side === "calendar" ? (
          <>
            <div className="agenda-day">{new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</div>
            {(seed.agenda ?? []).map((e) => (
              <div key={`${e.time}${e.title}`} className={`ag${e.now ? " now" : ""}`}>
                <i />
                <div>
                  <b>{e.title}</b>
                  <small>{e.time}</small>
                </div>
              </div>
            ))}
          </>
        ) : side === "keep" ? (
          (seed.notes ?? []).map((n) => (
            <div key={n.title} className={`note${n.yellow ? " yellow" : ""}`}>
              <b>{n.title}</b>
              <p>{n.text}</p>
            </div>
          ))
        ) : (
          <>
            <div className="agenda-day" style={{ fontSize: 18 }}>My Tasks</div>
            <div className="add-task">
              <I.Task style={{ width: 20, height: 20 }} />
              <input
                placeholder="Add a task"
                aria-label="Add a task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && task.trim()) {
                    ui.addTask(task.trim());
                    setTask("");
                  }
                }}
              />
            </div>
            {state.tasks.map((t) => (
              <button key={t.id} className={`task${t.done ? " done" : ""}`} aria-pressed={t.done} onClick={() => ui.toggleTask(t.id)}>
                <span className="circ" />
                <span>{t.text}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
