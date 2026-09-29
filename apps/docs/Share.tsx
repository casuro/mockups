import { useEffect, useRef } from "react";
import { Avatar, useUI } from "./context";
import * as I from "./icons";
import type { DocsRole } from "./types";

// The Share dialog: the people with access and their roles, general access,
// Copy link and Done.

const CAN: Record<DocsRole, string> = { Owner: "edit", Editor: "edit", Commenter: "comment", Viewer: "view" };

export function ShareDialog({ onClose }: { onClose: () => void }) {
  const { docs } = useUI();
  const { seed, people, me, state } = docs;
  const add = useRef<HTMLInputElement>(null);
  useEffect(() => add.current?.focus(), []);

  const owner = seed.document.owner ?? me;
  const roles: [string, DocsRole][] = [[owner, "Owner"], ...Object.entries(seed.share?.people ?? {}).filter(([id]) => id !== owner)];
  const general = seed.share?.general;
  const done = () => {
    onClose();
    docs.ui.emit({ type: "share", action: "done" });
  };

  return (
    <div
      className="scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Share">
        <h2>Share "{state.title}"</h2>
        <input ref={add} className="add" placeholder="Add people, groups, and calendar events" />
        <h3>People with access</h3>
        {roles.map(([id, role]) => {
          const p = people[id];
          if (!p) return null;
          const fixed = role === "Owner";
          return (
            <div className="person" key={id}>
              <Avatar id={id} className="av" />
              <div className="pn">
                <b>{p.name}{id === me ? " (you)" : ""}</b>
                <small>{p.email}</small>
              </div>
              <button className={`role${fixed ? " static" : ""}`} onClick={fixed ? undefined : () => docs.toast(`Role options for ${p.name}`)}>
                {role}
                {fixed ? null : <I.Drop />}
              </button>
            </div>
          );
        })}
        {general ? (
          <>
            <h3>General access</h3>
            <div className="person">
              <span className="gi"><I.Domain /></span>
              <div className="pn">
                <b>{general.name}</b>
                <small>{general.description ?? `Anyone in this group with the link can ${CAN[general.role]}`}</small>
              </div>
              <button className="role" onClick={() => docs.toast("General access options")}>
                {general.role}
                <I.Drop />
              </button>
            </div>
          </>
        ) : null}
        <div className="d-foot">
          <button
            className="btn-o"
            onClick={() => {
              if (seed.document.url) navigator.clipboard?.writeText(seed.document.url).catch(() => {});
              docs.toast("Link copied");
              docs.ui.emit({ type: "share", action: "copy-link" });
            }}
          >
            <I.Link />
            Copy link
          </button>
          <button className="btn-p" onClick={done}>Done</button>
        </div>
      </div>
    </div>
  );
}
