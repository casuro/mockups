import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Switch, clock, useUI } from "./context";
import * as I from "./icons";
import { FILTERS, Feed, SCENES } from "./Stage";
import type { MeetHostControls } from "./types";

// The side panel: people, in-call messages, meeting details, activities
// (with polls and Q&A), host controls and visual effects.

function Head({ title, back }: { title: string; back?: boolean }) {
  const { meet } = useUI();
  return (
    <div className="p-head">
      {back ? <button className="ib back" aria-label="Back" onClick={() => meet.ui.openActivity(null)}><I.Back /></button> : null}
      <h2>{title}</h2>
      <button className="ib" aria-label="Close" onClick={() => meet.ui.openPanel(null)}><I.Close /></button>
    </div>
  );
}

function People() {
  const { meet, openMenu, openDialog } = useUI();
  const { state, me, people } = meet;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const q = query.trim().toLowerCase();
  const all = [me, ...state.inCall].filter((p) => !q || people[p]?.name.toLowerCase().includes(q));
  const hands = state.hands.filter((p) => all.includes(p));
  const host = meet.seed.meeting.host ?? me;

  const row = (p: string, handNo?: number) => {
    const muted = p === me ? !state.mic : state.muted.includes(p);
    const speaking = meet.speakers.includes(p);
    return (
      <div key={p} className={`prow${speaking ? " speaking" : ""}`}>
        <Avatar id={p} size={32} />
        <span className="who">
          <b>{people[p]?.name}{p === me ? " (You)" : ""}</b>
          {p === host ? <small>Meeting host</small> : null}
        </span>
        {handNo ? <span className="hand-no" title={`Hand ${handNo}`}>{handNo}</span> : null}
        {muted ? (
          <span className="p-audio" aria-label="Muted"><I.MicOff /></span>
        ) : speaking ? (
          <span className="p-audio live"><I.Bars /></span>
        ) : (
          <span className="p-audio idle"><I.Bars /></span>
        )}
        <button
          className="ib sm"
          aria-label={`More actions for ${people[p]?.name}`}
          onClick={(e) => {
            const self = p === me;
            const pinned = state.pinned === p;
            openMenu({
              anchor: e.currentTarget,
              align: "right",
              items: [
                { icon: <I.Pin />, label: pinned ? "Unpin" : "Pin to the main screen", run: () => meet.ui.pin(p, false) },
                ...(!self && !state.muted.includes(p) ? [{ icon: <I.MicOff />, label: `Mute ${people[p]?.first}`, run: () => meet.ui.mute(p) }] : []),
                ...(!self && state.hands.includes(p) ? [{ icon: <I.Hand />, label: "Lower hand", run: () => meet.ui.lowerHand(p) }] : []),
                ...(self ? [{ icon: <I.Sparkle />, label: "Apply visual effects", run: () => meet.ui.openPanel("effects") }] : []),
                ...(!self ? ["-" as const, { icon: <I.RemoveCircle />, label: "Remove from the call", run: () => meet.ui.remove(p) }] : []),
              ],
            });
          }}
        >
          <I.More />
        </button>
      </div>
    );
  };

  return (
    <>
      <Head title="People" />
      <div className="p-body">
        <button className="btn tonal pp-add" onClick={() => openDialog("add")}><I.PersonAdd />Add people</button>
        <label className="field">
          <I.Search />
          <input placeholder="Search for people" aria-label="Search for people" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="p-sec">In the meeting</div>
        {hands.length ? (
          <div className="pgroup">
            <div className="pg-head">
              <I.Hand style={{ color: "#0b57d0" }} />Raised hands<span className="n">{hands.length}</span>
              <button className="btn text" onClick={() => meet.ui.lowerAll()}>Lower all</button>
            </div>
            <div className="prows">{hands.map((p) => row(p, state.hands.indexOf(p) + 1))}</div>
          </div>
        ) : null}
        <div className={`pgroup${open ? "" : " collapsed"}`}>
          <button className="pg-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            Contributors<span className="n">{all.length}</span><I.ExpandMore className="chev" />
          </button>
          <div className="prows">{all.length ? all.map((p) => row(p)) : <div className="empty-note">No one matches &quot;{q}&quot;</div>}</div>
        </div>
      </div>
    </>
  );
}

function Chat() {
  const { meet, phone } = useUI();
  const { state, me, people } = meet;
  const [draft, setDraft] = useState("");
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [state.chat.length]);
  useEffect(() => {
    if (!phone) setTimeout(() => input.current?.focus(), 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    meet.ui.sendChat(text);
    setDraft("");
  };
  return (
    <>
      <Head title="In-call messages" />
      <div className="p-body" ref={body}>
        <div className="switch-row">
          <span className="lbl"><b>Let everyone send messages</b></span>
          <Switch on={state.host.chat} label="Let everyone send messages" onChange={() => meet.ui.setHost("chat", !state.host.chat)} />
        </div>
        <div className="infobox">Unless they&apos;re pinned, messages can only be seen by people in the call when the message is sent. All messages are deleted when the call ends.</div>
        <div className="msgs">
          {state.chat.map((m) => (
            <div className="msg" key={m.id}>
              <div className="h"><b>{m.from === me ? "You" : (people[m.from]?.name ?? m.from)}</b><small>{clock(m.at)}</small></div>
              <div className="t">{m.text}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="compose">
        <div className="pill">
          <input
            ref={input}
            placeholder="Send a message"
            aria-label="Send a message"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="ib sm" aria-label="Send message" disabled={!draft.trim()} onClick={send}><I.Send /></button>
        </div>
      </div>
    </>
  );
}

function Info() {
  const { meet } = useUI();
  const m = meet.seed.meeting;
  const host = m.host ?? meet.me;
  return (
    <>
      <Head title="Meeting details" />
      <div className="p-body info-p">
        <h4>Joining info</h4>
        <div className="lnk">meet.google.com/{m.code}</div>
        <button className="btn text" onClick={() => copyLink(meet)}><I.Copy />Copy joining info</button>
        {m.dialIn ? <div className="dial" style={{ marginTop: 12 }}>Dial-in: {m.dialIn.number}<br />PIN: {m.dialIn.pin}</div> : null}
        {m.doc ? (
          <>
            <div className="div" />
            <h4>Google Calendar attachments</h4>
            <a className="attach" href="#" onClick={(e) => {
              e.preventDefault();
              meet.ui.snack(`Opening "${m.doc}" in Google Docs`);
              meet.ui.emit({ type: "action", kind: "open-doc", label: m.doc! });
            }}>
              <I.DocsLogo /><span>{m.doc}</span>
            </a>
          </>
        ) : null}
        <div className="div" />
        <h4>{m.title}</h4>
        <div className="dial">{host === meet.me ? "You are the host" : `Hosted by ${meet.people[host]?.name ?? host}`} · {meet.people[meet.me].email}</div>
      </div>
    </>
  );
}

export function copyLink(meet: ReturnType<typeof useUI>["meet"]) {
  const url = `https://meet.google.com/${meet.seed.meeting.code}`;
  try {
    void navigator.clipboard?.writeText(url).catch(() => {});
  } catch {
    // The clipboard is optional.
  }
  meet.ui.snack("Copied meeting link");
  meet.ui.emit({ type: "action", kind: "copy-link", label: url });
}

function Polls() {
  const { meet } = useUI();
  const poll = meet.state.poll;
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  if (!poll) {
    const ready = q.trim() && opts.filter((o) => o.trim()).length >= 2;
    return (
      <>
        <Head title="Polls" back />
        <div className="p-body poll-form">
          <p style={{ color: "var(--text-2)", marginBottom: 12 }}>Ask everyone in the call a question. Results are shown live.</p>
          <label className="field"><input autoFocus placeholder="Ask a question" aria-label="Question" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          {opts.map((o, i) => (
            <label className="field" key={i}>
              <input placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} value={o} onChange={(e) => setOpts((list) => list.map((x, j) => (j === i ? e.target.value : x)))} />
            </label>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
            <button className="btn filled" disabled={!ready} onClick={() => meet.ui.launchPoll(q.trim(), opts.map((o) => o.trim()).filter(Boolean))}>Launch</button>
          </div>
        </div>
      </>
    );
  }
  const votes = poll.options.reduce((a, o) => a + o.votes, 0);
  const total = votes || 1;
  return (
    <>
      <Head title="Polls" back />
      <div className="p-body">
        <div className="p-sec">Live poll</div>
        <div className="poll-q">{poll.question}</div>
        {poll.options.map((o, i) => (
          <button key={i} className={`poll-opt${poll.mine === i ? " mine" : ""}`} onClick={() => meet.ui.votePoll(i)}>
            <span className="fill" style={{ width: `${Math.round((o.votes / total) * 100)}%` }} />
            <span>{o.text}</span>
            <span className="pct">{Math.round((o.votes / total) * 100)}%</span>
          </button>
        ))}
        <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 4 }}>{votes} vote(s)</div>
        <button className="btn text" style={{ margin: "12px 0 0 -12px" }} onClick={() => meet.ui.endPoll()}>End poll</button>
      </div>
    </>
  );
}

function QA() {
  const { meet } = useUI();
  const { questions } = meet.state;
  const [draft, setDraft] = useState("");
  return (
    <>
      <Head title="Q&A" back />
      <div className="p-body">
        <label className="field">
          <I.Qa />
          <input
            placeholder="Ask a question"
            aria-label="Ask a question"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !draft.trim()) return;
              meet.ui.askQuestion(draft.trim());
              setDraft("");
            }}
          />
        </label>
        <div className="p-sec">{questions.length} question{questions.length === 1 ? "" : "s"}</div>
        {[...questions].sort((a, b) => b.votes - a.votes).map((q) => (
          <div className="qa" key={q.id}>
            <Avatar id={q.from} size={28} />
            <div className="body"><b>{q.from === meet.me ? "You" : meet.people[q.from]?.name}</b><p>{q.text}</p></div>
            <button className={`vote${q.mine ? " on" : ""}`} aria-label="Upvote" onClick={() => meet.ui.upvoteQuestion(q.id)}><I.ThumbUp />{q.votes}</button>
          </div>
        ))}
      </div>
    </>
  );
}

function Activities() {
  const { meet } = useUI();
  const { state } = meet;
  if (state.activity === "polls") return <Polls />;
  if (state.activity === "qa") return <QA />;
  const host = meet.seed.meeting.host ?? meet.me;
  const row = (color: string, icon: ReactNode, title: string, sub: string, status: string, run: () => void) => (
    <button className="act-row" onClick={run}>
      <span className="ic" style={{ background: color }}>{icon}</span>
      <span><b>{title}</b><small>{sub}</small></span>
      {status ? <span className="state">{status}</span> : null}
    </button>
  );
  return (
    <>
      <Head title="Activities" />
      <div className="p-body">
        {row("#f9ab00", <I.Draw />, "Whiteboarding", "Open a whiteboard everyone can draw on", state.sharing === "whiteboard" ? "Open" : "", () => meet.ui.present("whiteboard"))}
        {row("#d93025", <I.Record />, "Recording", "Record this call to Google Drive", state.recording ? "On" : "", () => meet.ui.toggleRecording())}
        {row("#1a73e8", <I.Transcript />, "Transcripts", "Save a transcript to Google Docs", state.transcript ? "On" : "", () => meet.ui.toggleTranscript())}
        {row("#188038", <I.Breakout />, "Breakout rooms", "Split into smaller groups", "", () => {
          const label = host === meet.me ? "Breakout rooms are set up by the host: you" : `Breakout rooms are set up by the host: ${meet.people[host]?.name ?? host}`;
          meet.ui.snack(label);
          meet.ui.emit({ type: "action", kind: "breakout", label });
        })}
        {row("#a142f4", <I.Poll />, "Polls", "Ask everyone a question", state.poll ? "Live" : "", () => meet.ui.openActivity("polls"))}
        {row("#12a4af", <I.Qa />, "Q&A", "Ask the presenter questions", "", () => meet.ui.openActivity("qa"))}
      </div>
    </>
  );
}

function Host() {
  const { meet } = useUI();
  const h = meet.state.host;
  const org = meet.seed.meeting.org;
  const t = (k: Exclude<keyof MeetHostControls, "access">, b: string, s?: string) => (
    <div className="switch-row">
      <span className="lbl"><b>{b}</b>{s ? <small>{s}</small> : null}</span>
      <Switch on={h[k]} label={b} onChange={() => meet.ui.setHost(k, !h[k])} />
    </div>
  );
  const r = (v: MeetHostControls["access"], b: string, s: string) => (
    <div className="radio-row" role="radio" aria-checked={h.access === v} tabIndex={0} onClick={() => meet.ui.setHost("access", v)} onKeyDown={(e) => e.key === "Enter" && meet.ui.setHost("access", v)}>
      <span className={`radio${h.access === v ? " on" : ""}`} />
      <span className="lbl"><b>{b}</b><small>{s}</small></span>
    </div>
  );
  return (
    <>
      <Head title="Host controls" />
      <div className="p-body">
        <p style={{ color: "var(--text-2)", fontSize: 13 }}>Use these host settings to keep control of your meeting. Only hosts have access to these controls.</p>
        {t("mgmt", "Host management", "Lets you restrict what participants can do in the meeting")}
        <div className="p-sec">Let everyone</div>
        {t("share", "Share their screen")}
        {t("chat", "Send chat messages")}
        {t("react", "Send reactions")}
        {t("mic", "Turn on their microphone")}
        {t("video", "Turn on their video")}
        <div className="p-sec">Meeting access</div>
        {r("open", "Open", "No one has to ask to join. Anyone can dial in.")}
        {r("trusted", "Trusted", `People in ${org ?? "your organization"} can join without asking. Anyone invited by a host can also join.`)}
        {r("restricted", "Restricted", "Only people invited by a host can join without asking.")}
      </div>
    </>
  );
}

function Effects() {
  const { meet } = useUI();
  const { state, me, people } = meet;
  const [tab, setTab] = useState<"bg" | "filters">("bg");
  const tile = (key: string, sel: boolean, title: string, run: () => void, inner: ReactNode, background?: string) => (
    <button key={key} className={`fx-t${sel ? " sel" : ""}`} title={title} aria-label={title} aria-pressed={sel} style={background ? { background } : undefined} onClick={run}>
      {inner}
    </button>
  );
  const bg = (id: string) => () => meet.ui.setEffect("background", id);
  return (
    <>
      <Head title="Effects" />
      <div className="fx">
        <div className="fx-prev">{state.camera && people[me].photo ? <Feed id={me} /> : <div className="cam-off">Camera is off</div>}</div>
        <div className="fx-tabs" role="tablist">
          <button className={tab === "bg" ? "on" : ""} role="tab" onClick={() => setTab("bg")}>Backgrounds</button>
          <button className={tab === "filters" ? "on" : ""} role="tab" onClick={() => setTab("filters")}>Filters</button>
        </div>
        <div className="fx-body">
          {tab === "bg" ? (
            <>
              <div className="fx-sec">No effect &amp; blur</div>
              <div className="fx-grid">
                {tile("none", state.background === "none", "No effect", bg("none"), <I.Block />)}
                {tile("slight", state.background === "slight", "Slightly blur your background", bg("slight"), <I.BlurSoft />)}
                {tile("blur", state.background === "blur", "Blur your background", bg("blur"), <I.BlurStrong />)}
              </div>
              <div className="fx-sec">Backgrounds</div>
              <div className="fx-grid">{SCENES.map((s) => tile(s.id, state.background === s.id, s.name, bg(s.id), null, s.css))}</div>
            </>
          ) : (
            <>
              <div className="fx-sec">Filters</div>
              <div className="fx-grid">
                {FILTERS.map((f) =>
                  tile(f.id, state.filter === f.id, f.name, () => meet.ui.setEffect("filter", f.id), (
                    <>
                      {people[me].photo ? <img src={people[me].photo} alt="" style={{ filter: f.css, transform: "scaleX(-1)" }} /> : null}
                      <span className="cap">{f.name}</span>
                    </>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function Panel() {
  const { meet } = useUI();
  const panel = meet.state.panel;
  if (!panel) return null;
  return (
    <aside className={`panel ${panel}-p`}>
      {panel === "people" ? <People /> : panel === "chat" ? <Chat /> : panel === "info" ? <Info /> : panel === "activities" ? <Activities /> : panel === "host" ? <Host /> : <Effects />}
    </aside>
  );
}
