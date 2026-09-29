import type { ReactNode } from "react";

// Dates as Linear writes them, and an issue's description: paragraphs,
// "- " lists and `code`.

const DAY = 86_400_000;

/** "Oct 2", or "Oct 2, 2026" with the year. */
export function shortDate(ms: number, year = false) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });
}

/** When an activity line happened: "just now", "5m ago", "5h ago", "2d ago", then "Sep 22". */
export function ago(ms: number, now = Date.now()) {
  const d = now - ms;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < DAY) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 3 * DAY) return `${Math.floor(d / DAY)}d ago`;
  return shortDate(ms);
}

/** Due within the next two days, or overdue: the date turns amber. */
export function dueSoon(ms: number, now = Date.now()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return ms <= end.getTime() + 2 * DAY;
}

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1 ? <code key={i}>{part.slice(1, -1)}</code> : part
  );
}

export function Description({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => l.startsWith("- ")))
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </>
  );
}
