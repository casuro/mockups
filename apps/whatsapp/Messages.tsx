import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Avatar, useUI } from "./context";
import { clock, dayLabel, dayStart, duration } from "./format";
import * as I from "./icons";
import type { WhatsAppImage, WhatsAppMessage } from "./types";

// A chat's messages: the day separators, and each bubble with its tail,
// group sender name, quote, picture, document, voice note, reactions, time
// and ticks.

export function MessageList({ chat, messages }: { chat: string; messages: WhatsAppMessage[] }) {
  const group = useUI().whatsapp.chat(chat).group;
  let prev: WhatsAppMessage | null = null;
  return (
    <>
      {messages.map((m) => {
        const before = prev;
        prev = m;
        const newDay = !before || dayStart(before.at) !== dayStart(m.at);
        const first = newDay || before?.from !== m.from;
        return [
          newDay ? <div key={`d${m.id}`} className="sys">{dayLabel(m.at)}</div> : null,
          <Bubble key={m.id} message={m} first={first} group={group} />,
        ];
      })}
    </>
  );
}

function Bubble({ message: m, first, group }: { message: WhatsAppMessage; first: boolean; group: boolean }) {
  const { whatsapp, renderCustom } = useUI();
  const { people, me } = whatsapp;
  const out = m.from === me;
  const sender = people[m.from];
  const kind = m.voice ? " is-voice" : m.image ? " is-img" : m.document ? " is-doc" : "";
  const quoteColor = m.quote ? (m.quote.from === me ? "#06cf9c" : (people[m.quote.from]?.color ?? "var(--teal)")) : "";
  return (
    <div className={`m ${out ? "out" : "in"}${first ? " first" : ""}${m.reactions.length ? " has-react" : ""}`} data-id={m.id}>
      <div className={`b${kind}`}>
        {group && !out && first ? <div className="sender" style={{ color: sender?.color }}>{sender?.name ?? m.from}</div> : null}
        {m.quote ? (
          <div className="quote" style={{ "--qc": quoteColor } as CSSProperties}>
            <b>{m.quote.from === me ? "You" : (people[m.quote.from]?.name ?? m.quote.from)}</b>
            <span>{m.quote.text}</span>
          </div>
        ) : null}
        {m.image ? <Photo image={m.image} /> : null}
        {m.document ? <Document message={m} /> : null}
        {m.voice ? <Voice message={m} /> : null}
        {m.text ? <span className="txt">{m.text}</span> : null}
        {m.custom && renderCustom ? renderCustom(m) : null}
        <span className="meta">
          {clock(m.at)}
          {out ? <I.Tick ticks={m.ticks} /> : null}
        </span>
        <Reactions message={m} />
      </div>
    </div>
  );
}

const BARS = [38, 52, 44, 66, 58, 80, 72, 90];
// The mockup's line, exactly.
const LINE_POINTS = "0,32 14,28 28,30 42,20 56,22 70,12 84,14 100,4";

function Photo({ image }: { image: WhatsAppImage }) {
  if (image.src) return <div className="photo"><img src={image.src} alt={image.alt ?? ""} /></div>;
  const bars = image.bars ?? BARS;
  const line = image.line;
  const points = line ? line.map((v, i) => `${line.length > 1 ? Math.round((i / (line.length - 1)) * 100) : 0},${40 - v * 0.4}`).join(" ") : LINE_POINTS;
  return (
    <div className="photo" role="img" aria-label={image.alt ?? image.title ?? "Chart"}>
      <div className="chart">{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg>
      {image.title ? <span className="ph-t">{image.title}</span> : null}
    </div>
  );
}

function Document({ message: m }: { message: WhatsAppMessage }) {
  const { whatsapp } = useUI();
  const doc = m.document!;
  return (
    <div className="doc">
      <div className="pdf">{doc.ext ?? "PDF"}</div>
      <div className="dmeta"><b>{doc.name}</b><small>{doc.meta}</small></div>
      <button
        className="ibtn dl"
        title="Download"
        aria-label={`Download ${doc.name}`}
        onClick={() => {
          whatsapp.toast(`Downloading ${doc.name}`);
          whatsapp.ui.emit({ type: "download", id: m.id, name: doc.name });
        }}
      >
        <I.Download />
      </button>
    </div>
  );
}

const WAVE = Array.from({ length: 34 }, (_, k) => 4 + Math.round(Math.abs(Math.sin(k * 1.7) * 14 + Math.sin(k * 0.5) * 6)));

/** A voice note; play runs the waveform through once, as the mockup does. */
function Voice({ message: m }: { message: WhatsAppMessage }) {
  const { whatsapp } = useUI();
  const [k, setK] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  const play = () => {
    if (timer.current) return;
    whatsapp.ui.emit({ type: "play", id: m.id });
    let n = 0;
    setK(0);
    timer.current = setInterval(() => {
      n++;
      if (n >= WAVE.length) {
        clearInterval(timer.current!);
        timer.current = null;
        setK(null);
      } else setK(n);
    }, 120);
  };
  const playing = k !== null;
  return (
    <div className="voice">
      <Avatar person={m.from} />
      <button className="play" title={playing ? "Pause" : "Play"} aria-label={playing ? "Playing" : "Play voice message"} onClick={play}>
        {playing ? <I.Pause /> : <I.Play />}
      </button>
      <div className="wave">
        {WAVE.map((h, j) => <i key={j} className={playing && j < k ? "on" : undefined} style={{ height: h }} />)}
        <span className="dot" style={{ left: `${playing ? (k / WAVE.length) * 100 : 0}%` }} />
      </div>
      <small className="dur">{duration(m.voice!.seconds)}</small>
    </div>
  );
}

/** One pill under the bubble with every emoji and the total; clicking it adds or takes back yours. */
function Reactions({ message: m }: { message: WhatsAppMessage }) {
  const { whatsapp } = useUI();
  if (!m.reactions.length) return null;
  const total = m.reactions.reduce((n, r) => n + r.count, 0);
  const emoji = (m.reactions.find((r) => r.mine) ?? m.reactions[0]).emoji;
  return (
    <button
      className={`react${m.reactions.some((r) => r.mine) ? " mine" : ""}`}
      aria-label={`Reactions: ${m.reactions.map((r) => `${r.emoji} ${r.count}`).join(", ")}`}
      onClick={() => whatsapp.ui.toggleReaction(m.id, emoji)}
    >
      {m.reactions.map((r) => r.emoji).join("")}
      {total > 1 ? <span>{total}</span> : null}
    </button>
  );
}
