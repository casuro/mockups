import { createContext, useContext } from "react";
import { labelStyle } from "./format";
import type { GitHubRepository } from "./use-github";

// What every part of <GitHub> reads: the repository, and whether the user
// menu is open. Plus the small pieces drawn everywhere: avatars, usernames,
// labels and branch names.

export interface GitHubUI {
  github: GitHubRepository;
  menu: boolean;
  setMenu: (open: boolean) => void;
}

export const GitHubContext = createContext<GitHubUI | null>(null);

export function useUI() {
  const ui = useContext(GitHubContext);
  if (!ui) throw new Error("GitHub parts must be inside <GitHub>");
  return ui;
}

/** A person's picture, or their initials. `size` is "" (20px), "s32" or "s40". */
export function Avatar({ id, size = "" }: { id: string; size?: "s32" | "s40" | "" }) {
  const p = useUI().github.people[id];
  const className = size ? `av ${size}` : "av";
  return p?.photo ? (
    <span className={className}><img src={p.photo} alt="" /></span>
  ) : (
    <span className={className} style={{ background: p?.color }}>{p?.initials ?? "?"}</span>
  );
}

export function Label({ name }: { name: string }) {
  const color = useUI().github.seed.repo.labels?.[name] ?? "#d1d9e0";
  return <span className="label" style={labelStyle(color)}>{name}</span>;
}

export const Branch = ({ name }: { name: string }) => <span className="branch">{name}</span>;
