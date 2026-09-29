import { createContext, useContext, type CSSProperties, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import * as I from "./icons";
import type { JiraIssue, JiraView } from "./types";
import type { DragState } from "./dnd";
import type { JiraProject } from "./use-jira";

// What every part of <Jira> reads: the project, the open popover and
// dialog, the board's filters, the drag in progress, and the small pieces
// drawn everywhere (avatars, lozenges, epic chips, menu items).

export interface PopOptions {
  /** Names the popover: opening the same id again closes it, and its anchor shows as expanded. */
  id: string;
  align?: "left" | "right";
  cls?: string;
  /** Focus the first item on open (default true). */
  focus?: boolean;
  /** Opening the same id again closes it (default true). */
  toggle?: boolean;
}
export interface Pop extends PopOptions {
  anchor: HTMLElement;
  content: ReactNode;
}

export interface BoardFilters {
  /** Person ids ("none" for unassigned) whose issues show. */
  assignees: string[];
  mine: boolean;
  recent: boolean;
  boardQuery: string;
  backlogQuery: string;
  groupBy: "none" | "assignee" | "epic";
  closedLanes: string[];
  closedSections: string[];
  /** The "Create issue" box open in a column or sprint: where it creates, the swimlane, and the type. */
  inline: { where: string; lane: string; type: "story" | "task" | "bug" } | null;
}

export interface ListFilters {
  type: string[];
  status: string[];
  assignee: string[];
  text: string;
  sort: { col: string; dir: "asc" | "desc" };
  jql: boolean;
}

export interface JiraUI {
  jira: JiraProject;
  root: RefObject<HTMLDivElement | null>;
  /** The box is phone-sized (under 760px). */
  phone: boolean;
  pop: Pop | null;
  openPop: (anchor: HTMLElement, content: ReactNode, options: PopOptions) => void;
  closePop: () => void;
  openDialog: (dialog: ReactNode) => void;
  closeDialog: () => void;
  confirm: (o: { title: string; body: string; ok: string; run: () => void }) => void;
  /** Opens the Create issue dialog, prefilled. */
  create: (preset?: { type?: string; status?: string }) => void;
  filters: BoardFilters;
  setFilters: Dispatch<SetStateAction<BoardFilters>>;
  list: ListFilters;
  setList: Dispatch<SetStateAction<ListFilters>>;
  drag: DragState | null;
  /** Starts a possible drag of a card ("card") or backlog row ("row"). */
  dragStart: (e: React.PointerEvent<HTMLElement>, key: string, kind: "card" | "row") => void;
  /** A drag just ended: the click that follows it must not open the issue. */
  justDragged: () => boolean;
  toggleSidebar: () => void;
  closeDrawer: () => void;
  renderCustom?: (issue: JiraIssue) => ReactNode;
  renderPage?: (view: JiraView) => ReactNode;
}

export const JiraContext = createContext<JiraUI | null>(null);

export function useUI() {
  const ui = useContext(JiraContext);
  if (!ui) throw new Error("Jira parts must be inside <Jira>");
  return ui;
}

/** Whether issue `i` passes the board's filters. */
export function matches(ui: JiraUI, i: JiraIssue, scope: "board" | "backlog") {
  const f = ui.filters;
  if (f.assignees.length && !f.assignees.includes(i.assignee ?? "none")) return false;
  if (f.mine && i.assignee !== ui.jira.me) return false;
  if (f.recent && ui.jira.now() - i.updated > 86_400_000) return false;
  const q = (scope === "backlog" ? f.backlogQuery : f.boardQuery).trim().toLowerCase();
  return !q || i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q);
}

export function Avatar({ id, size = 24, className = "" }: { id: string | null | undefined; size?: number; className?: string }) {
  const p = useUI().jira.people[id ?? ""];
  const style = { "--s": `${size}px` } as CSSProperties;
  if (!p)
    return (
      <span className={`av av-none ${className}`} style={style} title="Unassigned" role="img" aria-label="Unassigned">
        <I.Person />
      </span>
    );
  if (p.photo) return <img className={`av ${className}`} style={style} src={p.photo} alt={p.name} title={p.name} />;
  return (
    <span className={`av ${className}`} style={{ ...style, background: p.color, color: "#fff", fontSize: Math.round(size * 0.4), fontWeight: 600 }} title={p.name} role="img" aria-label={p.name}>
      {p.initials}
    </span>
  );
}

export function Lozenge({ status }: { status: string }) {
  const { jira } = useUI();
  const s = jira.statuses.find((x) => x.id === status);
  return <span className={`lz lz-${s?.tone ?? "todo"}`}>{s?.name ?? status}</span>;
}

export function EpicChip({ epic }: { epic: string }) {
  const e = useUI().jira.state.issues[epic];
  if (!e) return null;
  return <span className={`epic-chip ep-${e.color ?? "blue"}`} title={`Epic: ${e.summary}`}>{e.summary}</span>;
}

export function MenuItem({
  label, sub, icon, on, disabled, danger, kbd, onClick, role = "menuitem", children,
}: {
  label: ReactNode; sub?: ReactNode; icon?: ReactNode; on?: boolean; disabled?: boolean; danger?: boolean; kbd?: string;
  onClick?: () => void; role?: string; children?: ReactNode;
}) {
  return (
    <button className={`mi${on ? " on" : ""}${danger ? " danger" : ""}`} role={role} disabled={disabled} onClick={onClick} {...(role !== "menuitem" ? { "aria-checked": !!on } : {})}>
      {icon ? <span className="mi-ic">{icon}</span> : null}
      <span className="t">{label}{sub ? <small>{sub}</small> : null}</span>
      {kbd ? <span className="kbd">{kbd}</span> : null}
      {children}
    </button>
  );
}

/** A checkbox row in a multi-select menu. */
export function CheckItem({ checked, label, icon, onClick }: { checked: boolean; label: ReactNode; icon?: ReactNode; onClick: () => void }) {
  return (
    <button className="mi" role="menuitemcheckbox" aria-checked={checked} onClick={onClick}>
      <span className="mi-ic"><input type="checkbox" aria-hidden="true" aria-label={typeof label === "string" ? label : "Selected"} tabIndex={-1} checked={checked} readOnly style={{ pointerEvents: "none", accentColor: "var(--brand)" }} /></span>
      {icon ? <span className="mi-ic">{icon}</span> : null}
      <span className="t">{label}</span>
    </button>
  );
}

/** The project's avatar: the seed's picture, or the mountains. */
export function ProjectMark({ size }: { size?: number }) {
  const { project } = useUI().jira.seed;
  const style = size ? { width: size, height: size, borderRadius: size > 20 ? 6 : 3 } : undefined;
  return project.avatar ? <img src={project.avatar} alt="" style={{ width: size ?? 32, height: size ?? 32, borderRadius: 6, objectFit: "cover", flex: "none" }} /> : <I.ProjectAvatar color={project.color} style={style} />;
}
