import type { ComponentType, SVGProps } from "react";
import { ProjectMark, useUI } from "./context";
import * as I from "./icons";
import type { JiraView } from "./types";

// The project sidebar: the project, its planning and development pages,
// shortcuts and settings. On a phone it is a drawer over the page.

export function Sidebar({ hidden }: { hidden: boolean }) {
  const { jira } = useUI();
  const { seed, state } = jira;
  const v = state.fullPage ? "issue" : state.view;
  const item = (view: JiraView, Icon: ComponentType<SVGProps<SVGSVGElement>>, label: string, className = "") => (
    <button key={view} className={`sb-item${v === view ? " on" : ""}${className}`} aria-current={v === view ? "page" : undefined} onClick={() => jira.ui.navigate(view)}>
      <Icon />
      <span>{label}</span>
    </button>
  );
  const act = (label: string, Icon: ComponentType<SVGProps<SVGSVGElement>>) => (
    <button className="sb-item" onClick={() => jira.ui.emit({ type: "action", kind: "sidebar", label })}>
      <Icon />
      <span>{label}</span>
    </button>
  );
  return (
    <aside className="sidebar" aria-label="Project navigation" aria-hidden={hidden} inert={hidden}>
      <div className="sidebar-inner">
        <div className="proj">
          <ProjectMark />
          <div style={{ minWidth: 0 }}>
            <b>{seed.project.name}</b>
            <small>{seed.project.kind ?? "Software project"}</small>
          </div>
        </div>
        {item("yourwork", I.Work, "Your work", " sb-only-phone")}
        <div className="sb-h">Planning</div>
        {item("timeline", I.Timeline, "Timeline")}
        {item("backlog", I.Backlog, "Backlog")}
        {item("board", I.Board, "Board")}
        {item("reports", I.Reports, "Reports")}
        {item("list", I.List, "Issues")}
        {item("components", I.Components, "Components")}
        <div className="sb-h">Development</div>
        {item("code", I.Code, "Code")}
        {item("releases", I.Releases, "Releases")}
        <div className="sb-sep" />
        {item("pages", I.Pages, "Project pages")}
        {act("Add shortcut", I.Shortcut)}
        {act("Project settings", I.Gear)}
        <div className="sb-foot">
          You're in a team-managed project
          <br />
          <a onClick={() => jira.ui.emit({ type: "action", kind: "sidebar", label: "Learn more" })}>Learn more</a>
        </div>
      </div>
    </aside>
  );
}
