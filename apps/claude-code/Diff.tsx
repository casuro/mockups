import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { Avatar, useUI } from "./context";
import { highlight, parseHunk, type DiffRow } from "./format";
import * as I from "./icons";
import type { Hunk, Lang } from "./types";

// A diff, unified or side by side. In the Diff pane the unified one is
// commentable: hover a line, press +, and leave a comment for Claude.

export interface Commenting {
  /** Comments already left, by line key ("0:n14"). */
  comments: Record<string, string[]>;
  /** The line key being commented on. */
  composing: string | null;
  onCompose: (key: string | null) => void;
  onSave: (key: string, line: number, text: string) => void;
}

export function Diff({ hunks, lang, commenting }: { hunks: Hunk[]; lang: Lang; commenting?: Commenting }) {
  return (
    <div className={`diff${commenting ? " commentable" : ""}`}>
      {hunks.map((h, hi) => {
        const { rows, header } = parseHunk(h);
        return (
          <Fragment key={hi}>
            <div className="row hunk">
              <span className="g" />
              <span className="g g2" />
              <span className="c">{header}</span>
            </div>
            {rows.map((r, ri) => {
              const key = `${hi}:${r.op === "-" ? `o${r.o}` : `n${r.n}`}`;
              const line = (r.n ?? r.o)!;
              const list = commenting?.comments[key] ?? [];
              const composing = commenting?.composing === key;
              return (
                <Fragment key={ri}>
                  <div className={`row${r.op === "+" ? " add" : r.op === "-" ? " del" : ""}`}>
                    <span className="g">{r.o ?? ""}</span>
                    <span className="g g2">{r.n ?? ""}</span>
                    <span className="sg">{r.op === " " ? "" : r.op}</span>
                    <span className="c">{highlight(r.text, lang)}</span>
                    {commenting ? (
                      <button className="add-cmt" aria-label={`Comment on line ${line}`} data-tip="Comment on this line" onClick={() => commenting.onCompose(key)}>
                        <I.Plus />
                      </button>
                    ) : null}
                  </div>
                  {commenting && (list.length || composing) ? (
                    <div className="row cmt-row">
                      {list.map((c, i) => <Comment key={i} text={c} />)}
                      {composing ? <CommentForm line={line} spaced={!!list.length} onCancel={() => commenting.onCompose(null)} onSave={(t) => commenting.onSave(key, line, t)} /> : null}
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}

function Comment({ text }: { text: string }) {
  const { me } = useUI().app.seed;
  return (
    <div className="cmt">
      <Avatar photo={me.photo} name={me.name} size={24} />
      <div className="b">
        <div className="h"><b>{me.name}</b> · for Claude</div>
        {text}
      </div>
    </div>
  );
}

function CommentForm({ line, spaced, onCancel, onSave }: { line: number; spaced: boolean; onCancel: () => void; onSave: (text: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const save = () => {
    const v = ref.current?.value.trim();
    if (v) onSave(v);
  };
  return (
    <div className="cmt-form" style={spaced ? { marginTop: 6 } : undefined}>
      <textarea
        ref={ref}
        placeholder={`Leave a comment for Claude on line ${line}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
      />
      <div className="acts">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={save}>Comment</button>
      </div>
    </div>
  );
}

/** Old on the left, new on the right; removed and added runs line up, with hatching where one side has no line. */
export function SplitDiff({ hunks, lang }: { hunks: Hunk[]; lang: Lang }) {
  const left: ReactNode[] = [];
  const right: ReactNode[] = [];
  let k = 0;
  const side = (r: DiffRow | undefined, which: "L" | "R") =>
    !r ? (
      <div className="row empty" key={k++}><span className="g" /><span className="c"> </span></div>
    ) : (
      <div className={`row${r.op === "+" ? " add" : r.op === "-" ? " del" : ""}`} key={k++}>
        <span className="g">{which === "L" ? r.o : r.n}</span>
        <span className="sg">{r.op === " " ? "" : r.op}</span>
        <span className="c">{highlight(r.text, lang)}</span>
      </div>
    );
  for (const h of hunks) {
    const { rows, header } = parseHunk(h);
    left.push(<div className="row hunk" key={k++}><span className="g" /><span className="c">{header}</span></div>);
    right.push(<div className="row hunk" key={k++}><span className="g" /><span className="c"> </span></div>);
    let i = 0;
    while (i < rows.length) {
      if (rows[i].op === " ") {
        left.push(side(rows[i], "L"));
        right.push(side(rows[i], "R"));
        i++;
        continue;
      }
      const dels: DiffRow[] = [];
      const adds: DiffRow[] = [];
      while (i < rows.length && rows[i].op === "-") dels.push(rows[i++]);
      while (i < rows.length && rows[i].op === "+") adds.push(rows[i++]);
      for (let n = 0; n < Math.max(dels.length, adds.length); n++) {
        left.push(side(dels[n], "L"));
        right.push(side(adds[n], "R"));
      }
    }
  }
  return (
    <div className="split">
      <div className="diff">{left}</div>
      <div className="diff">{right}</div>
    </div>
  );
}
